import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_teacher
from database import get_db
from models.db_models import DbMessage, DbTeacher
from models.schemas import GenerateMessageResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/bulk", tags=["bulk"])


class BulkGenerateRequest(BaseModel):
    child_ids: list[str]
    event_type: str
    notes: str
    tone: str
    time_of_event: str
    injury_description: str | None = None
    action_taken: str | None = None


class BulkGenerateResponse(BaseModel):
    results: list[GenerateMessageResponse]
    message_ids: list[int]
    failed: list[str]


class BulkSendRequest(BaseModel):
    message_ids: list[int]


class BulkSendResponse(BaseModel):
    sent: int
    failed: int
    details: list[dict]


@router.post("/generate", response_model=BulkGenerateResponse)
async def bulk_generate(
    payload: BulkGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_teacher: DbTeacher = Depends(get_current_teacher),
) -> BulkGenerateResponse:
    from data_loader import load_children, load_classrooms, load_event_types
    from services import GeminiClient
    from routers.generate import get_llm_client

    children = load_children()
    classrooms = load_classrooms()
    event_types = load_event_types()

    event_type_obj = next((e for e in event_types if e.event_type == payload.event_type), None)
    if event_type_obj is None:
        raise HTTPException(status_code=422, detail=f"Invalid event type: {payload.event_type}")

    llm = get_llm_client()
    results = []
    message_ids = []
    failed = []

    for child_id in payload.child_ids:
        child = next((c for c in children if c.child_id == child_id), None)
        if child is None:
            failed.append(child_id)
            continue

        classroom = next((r for r in classrooms if r.classroom_id == child.classroom_id), None)
        classroom_name = classroom.name if classroom else child.classroom_id

        context = {
            "child_name": child.name,
            "classroom_name": classroom_name,
            "event_type": payload.event_type,
            "event_type_display": event_type_obj.display_name,
            "time_of_event": payload.time_of_event,
            "notes": payload.notes,
            "injury_description": payload.injury_description,
            "action_taken": payload.action_taken,
            "tone": payload.tone,
            "parent_email": child.parent_email,
        }

        try:
            generated_message = llm.generate_message(context)
        except Exception as exc:
            logger.warning("LLM failed for child %s: %s", child_id, exc)
            generated_message = (
                f"We wanted to let you know that {child.name} had a "
                f"{event_type_obj.display_name.lower()} today at {payload.time_of_event}. "
                f"Please contact us for more details. – {classroom_name} Team"
            )

        db_msg = DbMessage(
            child_id=child.child_id,
            teacher_id=current_teacher.teacher_id,
            event_type=payload.event_type,
            tone=payload.tone,
            generated_message=generated_message,
            parent_email=child.parent_email,
            child_name=child.name,
            classroom=classroom_name,
            status="draft",
        )
        db.add(db_msg)
        await db.flush()
        message_ids.append(db_msg.id)

        results.append(GenerateMessageResponse(
            child_name=child.name,
            parent_email=child.parent_email,
            event_type=payload.event_type,
            generated_message=generated_message,
            tone=payload.tone,
            classroom=classroom_name,
            message_id=db_msg.id,
        ))

    await db.commit()
    return BulkGenerateResponse(results=results, message_ids=message_ids, failed=failed)


@router.post("/send", response_model=BulkSendResponse)
async def bulk_send(
    payload: BulkSendRequest,
    db: AsyncSession = Depends(get_db),
    current_teacher: DbTeacher = Depends(get_current_teacher),
) -> BulkSendResponse:
    from sqlalchemy import select
    from routers.send import _deliver_email
    import uuid

    sent = 0
    failed = 0
    details = []

    for message_id in payload.message_ids:
        result = await db.execute(select(DbMessage).where(DbMessage.id == message_id))
        msg = result.scalars().first()
        if msg is None:
            failed += 1
            details.append({"message_id": message_id, "status": "not_found"})
            continue

        reply_token = str(uuid.uuid4())
        msg.reply_token = reply_token

        try:
            sendgrid_id = _deliver_email(
                parent_email=msg.parent_email,
                child_name=msg.child_name,
                generated_message=msg.generated_message,
                reply_token=reply_token,
            )
            msg.status = "sent"
            msg.sent_at = datetime.now(timezone.utc)
            msg.sendgrid_message_id = sendgrid_id
            msg.delivery_method = "resend"
            sent += 1
            details.append({"message_id": message_id, "status": "sent", "recipient": msg.parent_email})
        except Exception as exc:
            logger.error("Bulk send failed for message %d: %s", message_id, exc)
            msg.status = "failed"
            failed += 1
            details.append({"message_id": message_id, "status": "failed", "error": str(exc)})

    await db.commit()
    return BulkSendResponse(sent=sent, failed=failed, details=details)
