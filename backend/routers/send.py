import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_teacher
from database import get_db
from models.db_models import DbMessage, DbTeacher

logger = logging.getLogger(__name__)
router = APIRouter()


class SendMessageRequest(BaseModel):
    message_id: int
    scheduled_for: Optional[str] = None


class SendMessageResponse(BaseModel):
    success: bool
    recipient: str
    delivered_at: Optional[str] = None
    scheduled_for: Optional[str] = None
    status: str
    delivery_method: str


def _deliver_email(
    parent_email: str,
    child_name: str,
    generated_message: str,
    reply_token: Optional[str] = None,
) -> str:
    """
    Demo stub — simulates email delivery without sending a real email.
    Future scope: replace this body with a Resend / SendGrid / SES call.
    """
    import time
    logger.info(
        "[DEMO SEND] To=%s | Child=%s | Message preview: %.80s…",
        parent_email,
        child_name,
        generated_message,
    )
    time.sleep(0.3)  # simulate slight network delay for realism
    return f"demo-msg-{uuid.uuid4().hex[:12]}"


@router.post("/send-message", response_model=SendMessageResponse)
async def send_message(
    req: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_teacher: DbTeacher = Depends(get_current_teacher),
) -> SendMessageResponse:
    result = await db.execute(select(DbMessage).where(DbMessage.id == req.message_id))
    msg = result.scalars().first()
    if msg is None:
        raise HTTPException(status_code=404, detail=f"Message not found: {req.message_id}")

    reply_token = str(uuid.uuid4())
    msg.reply_token = reply_token

    # Scheduled send
    if req.scheduled_for:
        try:
            scheduled_dt = datetime.fromisoformat(req.scheduled_for)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid scheduled_for datetime format")

        msg.status = "scheduled"
        msg.scheduled_for = scheduled_dt
        await db.commit()

        from scheduler import scheduler, deliver_scheduled_message
        scheduler.add_job(
            deliver_scheduled_message,
            "date",
            run_date=scheduled_dt,
            args=[msg.id],
            id=f"msg_{msg.id}",
            replace_existing=True,
        )

        logger.info("Message %d scheduled for %s to %s", msg.id, scheduled_dt, msg.parent_email)
        return SendMessageResponse(
            success=True,
            recipient=msg.parent_email,
            scheduled_for=scheduled_dt.isoformat(),
            status="scheduled",
            delivery_method="resend",
        )

    # Immediate send
    try:
        resend_id = _deliver_email(
            parent_email=msg.parent_email,
            child_name=msg.child_name,
            generated_message=msg.generated_message,
            reply_token=reply_token,
        )
        msg.status = "sent"
        msg.sent_at = datetime.now(timezone.utc)
        msg.sendgrid_message_id = resend_id
        msg.delivery_method = "resend"
        await db.commit()
        return SendMessageResponse(
            success=True,
            recipient=msg.parent_email,
            delivered_at=msg.sent_at.isoformat(),
            status="sent",
            delivery_method="sendgrid",
        )
    except Exception as exc:
        logger.error("SendGrid delivery failed: %s", exc)
        msg.status = "failed"
        await db.commit()
        raise HTTPException(status_code=502, detail=f"Email delivery failed: {exc}")

