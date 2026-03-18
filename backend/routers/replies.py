import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_teacher
from database import get_db
from models.db_models import DbMessage, DbParentReply, DbTeacher

logger = logging.getLogger(__name__)
router = APIRouter(tags=["replies"])


class ReplyRequest(BaseModel):
    reply_text: str


class ReplyContextResponse(BaseModel):
    child_name: str
    classroom: str
    event_type: str
    original_message: str
    parent_email: str


class ReplyRecord(BaseModel):
    id: int
    message_id: int
    child_name: str
    parent_email: str
    reply_text: str
    replied_at: str
    is_read: bool
    reply_token: str


@router.get("/reply/{token}", response_model=ReplyContextResponse)
async def get_reply_context(token: str, db: AsyncSession = Depends(get_db)) -> ReplyContextResponse:
    result = await db.execute(select(DbMessage).where(DbMessage.reply_token == token))
    msg = result.scalars().first()
    if msg is None:
        raise HTTPException(status_code=404, detail="Reply link not found or expired")
    return ReplyContextResponse(
        child_name=msg.child_name,
        classroom=msg.classroom,
        event_type=msg.event_type,
        original_message=msg.generated_message,
        parent_email=msg.parent_email,
    )


@router.post("/reply/{token}")
async def submit_reply(token: str, req: ReplyRequest, db: AsyncSession = Depends(get_db)) -> dict:
    import uuid
    result = await db.execute(select(DbMessage).where(DbMessage.reply_token == token))
    msg = result.scalars().first()
    if msg is None:
        raise HTTPException(status_code=404, detail="Reply link not found or expired")
    if not req.reply_text.strip():
        raise HTTPException(status_code=422, detail="Reply text cannot be empty")
    reply = DbParentReply(
        message_id=msg.id,
        reply_token=str(uuid.uuid4()),
        parent_email=msg.parent_email,
        reply_text=req.reply_text.strip(),
        replied_at=datetime.now(timezone.utc),
    )
    db.add(reply)
    await db.commit()
    logger.info("Parent reply received for message %d from %s", msg.id, msg.parent_email)
    return {"success": True, "message": "Your reply has been sent to the teacher."}


@router.get("/replies", response_model=list[ReplyRecord])
async def list_replies(
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_teacher: DbTeacher = Depends(get_current_teacher),
) -> list[ReplyRecord]:
    q = select(DbParentReply).options(selectinload(DbParentReply.message)).order_by(DbParentReply.replied_at.desc())
    if unread_only:
        q = q.where(DbParentReply.is_read == False)
    result = await db.execute(q)
    replies = result.scalars().all()
    return [
        ReplyRecord(
            id=r.id,
            message_id=r.message_id,
            child_name=r.message.child_name if r.message else "",
            parent_email=r.parent_email,
            reply_text=r.reply_text,
            replied_at=r.replied_at.isoformat(),
            is_read=r.is_read,
            reply_token=r.reply_token,
        )
        for r in replies
    ]


@router.put("/replies/{reply_id}/read")
async def mark_reply_read(
    reply_id: int,
    db: AsyncSession = Depends(get_db),
    current_teacher: DbTeacher = Depends(get_current_teacher),
) -> dict:
    result = await db.execute(select(DbParentReply).where(DbParentReply.id == reply_id))
    reply = result.scalars().first()
    if reply is None:
        raise HTTPException(status_code=404, detail="Reply not found")
    reply.is_read = True
    await db.commit()
    return {"success": True}
