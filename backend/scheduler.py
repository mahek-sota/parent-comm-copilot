import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def deliver_scheduled_message(message_id: int) -> None:
    from database import AsyncSessionLocal
    from models.db_models import DbMessage
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(DbMessage).options(selectinload(DbMessage.replies)).where(DbMessage.id == message_id)
        )
        msg = result.scalars().first()
        if msg is None or msg.status != "scheduled":
            return
        try:
            from routers.send import _deliver_email
            sendgrid_id = _deliver_email(
                parent_email=msg.parent_email,
                child_name=msg.child_name,
                generated_message=msg.generated_message,
                reply_token=msg.reply_token,
            )
            msg.status = "sent"
            msg.sent_at = datetime.now(timezone.utc)
            msg.sendgrid_message_id = sendgrid_id
            msg.delivery_method = "sendgrid"
        except Exception as exc:
            logger.error("Scheduled send failed for message %d: %s", message_id, exc)
            msg.status = "failed"
        await db.commit()
