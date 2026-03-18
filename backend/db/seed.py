import logging

from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from data_loader import load_children, load_classrooms, load_event_types, load_teachers
from models.db_models import DbChild, DbClassroom, DbEventType, DbTeacher

logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _default_password(teacher_name: str) -> str:
    last_name = teacher_name.split()[-1].lower()
    return f"{last_name}2025"


async def seed_database(session: AsyncSession) -> None:
    result = await session.execute(select(DbTeacher))
    if result.scalars().first() is not None:
        logger.info("Database already seeded, skipping.")
        return

    logger.info("Seeding database from CSV files...")

    for c in load_classrooms():
        session.add(DbClassroom(
            classroom_id=c.classroom_id,
            name=c.name,
            age_group=c.age_group,
            teacher_ids=c.teacher_ids,
        ))

    for c in load_children():
        session.add(DbChild(
            child_id=c.child_id,
            name=c.name,
            classroom_id=c.classroom_id,
            parent_email=c.parent_email,
            allergies=c.allergies,
            notes=c.notes,
        ))

    for t in load_teachers():
        default_pw = _default_password(t.name)
        hashed = pwd_context.hash(default_pw)
        logger.info("Teacher login created: %s / password: %s", t.email, default_pw)
        session.add(DbTeacher(
            teacher_id=t.teacher_id,
            name=t.name,
            email=t.email,
            classroom_id=t.classroom_id,
            hashed_password=hashed,
        ))

    for e in load_event_types():
        session.add(DbEventType(
            event_type=e.event_type,
            display_name=e.display_name,
            requires_injury_field=e.requires_injury_field,
            requires_action_field=e.requires_action_field,
        ))

    await session.commit()
    logger.info("Database seeded successfully.")
