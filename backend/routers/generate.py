import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_teacher
from database import get_db
from data_loader import load_children, load_classrooms, load_event_types
from models.db_models import DbMessage, DbTeacher
from models.schemas import GenerateMessageRequest, GenerateMessageResponse
from services import GeminiClient
from services.llm_client import LLMClient

logger = logging.getLogger(__name__)
router = APIRouter()

_llm_client: LLMClient | None = None


def get_llm_client() -> LLMClient:
    global _llm_client
    if _llm_client is None:
        _llm_client = GeminiClient()
    return _llm_client


async def _generate_for_child(
    child_id: str,
    payload: GenerateMessageRequest,
    db: AsyncSession,
    llm: LLMClient,
    teacher_id: str,
) -> tuple[GenerateMessageResponse, int]:
    children = load_children()
    child = next((c for c in children if c.child_id == child_id), None)
    if child is None:
        raise HTTPException(status_code=404, detail=f"Child not found: {child_id}")

    classrooms = load_classrooms()
    classroom = next((r for r in classrooms if r.classroom_id == child.classroom_id), None)
    classroom_name = classroom.name if classroom else child.classroom_id

    event_types = load_event_types()
    event_type_obj = next((e for e in event_types if e.event_type == payload.event_type), None)
    if event_type_obj is None:
        raise HTTPException(status_code=422, detail=f"Invalid event type: {payload.event_type}")

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
        logger.warning("LLM call failed, using fallback message: %s", exc)
        generated_message = (
            f"We wanted to let you know that {child.name} had a "
            f"{event_type_obj.display_name.lower()} today at {payload.time_of_event}. "
            f"Please contact us for more details. – {classroom_name} Team"
        )

    db_msg = DbMessage(
        child_id=child.child_id,
        teacher_id=teacher_id,
        event_type=payload.event_type,
        tone=payload.tone,
        generated_message=generated_message,
        parent_email=child.parent_email,
        child_name=child.name,
        classroom=classroom_name,
        status="draft",
        created_at=datetime.now(timezone.utc),
    )
    db.add(db_msg)
    await db.flush()
    message_id = db_msg.id
    await db.commit()

    return GenerateMessageResponse(
        child_name=child.name,
        parent_email=child.parent_email,
        event_type=payload.event_type,
        generated_message=generated_message,
        tone=payload.tone,
        classroom=classroom_name,
        message_id=message_id,
    ), message_id


@router.post("/generate-message", response_model=GenerateMessageResponse)
async def generate_message(
    payload: GenerateMessageRequest,
    llm: LLMClient = Depends(get_llm_client),
    db: AsyncSession = Depends(get_db),
    current_teacher: DbTeacher = Depends(get_current_teacher),
) -> GenerateMessageResponse:
    response, _ = await _generate_for_child(payload.child_id, payload, db, llm, current_teacher.teacher_id)
    return response
