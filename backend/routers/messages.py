import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_teacher
from database import get_db
from models.db_models import DbMessage, DbTeacher

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/messages", tags=["messages"])


class MessageRecord(BaseModel):
    id: int
    child_name: str
    child_id: str
    parent_email: str
    classroom: str
    event_type: str
    tone: str
    generated_message: str
    status: str
    created_at: str
    sent_at: Optional[str] = None
    scheduled_for: Optional[str] = None
    delivery_method: str
    reply_token: Optional[str] = None
    unread_replies: int = 0


def _to_record(m: DbMessage) -> MessageRecord:
    unread = sum(1 for r in m.replies if not r.is_read)
    return MessageRecord(
        id=m.id,
        child_name=m.child_name,
        child_id=m.child_id,
        parent_email=m.parent_email,
        classroom=m.classroom,
        event_type=m.event_type,
        tone=m.tone,
        generated_message=m.generated_message,
        status=m.status,
        created_at=m.created_at.isoformat() if m.created_at else "",
        sent_at=m.sent_at.isoformat() if m.sent_at else None,
        scheduled_for=m.scheduled_for.isoformat() if m.scheduled_for else None,
        delivery_method=m.delivery_method,
        reply_token=m.reply_token,
        unread_replies=unread,
    )


@router.get("", response_model=list[MessageRecord])
async def list_messages(
    child_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_teacher: DbTeacher = Depends(get_current_teacher),
) -> list[MessageRecord]:
    from sqlalchemy.orm import selectinload
    q = select(DbMessage).options(selectinload(DbMessage.replies)).order_by(DbMessage.created_at.desc())
    if child_id:
        q = q.where(DbMessage.child_id == child_id)
    result = await db.execute(q)
    return [_to_record(m) for m in result.scalars().all()]


@router.get("/{message_id}", response_model=MessageRecord)
async def get_message(
    message_id: int,
    db: AsyncSession = Depends(get_db),
    current_teacher: DbTeacher = Depends(get_current_teacher),
) -> MessageRecord:
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(DbMessage).options(selectinload(DbMessage.replies)).where(DbMessage.id == message_id)
    )
    msg = result.scalars().first()
    if msg is None:
        raise HTTPException(status_code=404, detail="Message not found")
    return _to_record(msg)


@router.delete("/{message_id}")
async def cancel_message(
    message_id: int,
    db: AsyncSession = Depends(get_db),
    current_teacher: DbTeacher = Depends(get_current_teacher),
) -> dict:
    result = await db.execute(select(DbMessage).where(DbMessage.id == message_id))
    msg = result.scalars().first()
    if msg is None:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.status == "scheduled":
        from scheduler import scheduler
        scheduler.remove_job(f"msg_{message_id}", ignore_nonexistent=True)
    msg.status = "cancelled"
    await db.commit()
    return {"success": True}
