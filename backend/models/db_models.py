from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class DbClassroom(Base):
    __tablename__ = "classrooms"
    classroom_id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    age_group: Mapped[str] = mapped_column(String, nullable=False)
    teacher_ids: Mapped[str] = mapped_column(String, default="")
    children: Mapped[list["DbChild"]] = relationship("DbChild", back_populates="classroom_rel")


class DbChild(Base):
    __tablename__ = "children"
    child_id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    classroom_id: Mapped[str] = mapped_column(String, ForeignKey("classrooms.classroom_id"))
    parent_email: Mapped[str] = mapped_column(String, nullable=False)
    allergies: Mapped[str] = mapped_column(String, default="")
    notes: Mapped[str] = mapped_column(String, default="")
    classroom_rel: Mapped["DbClassroom"] = relationship("DbClassroom", back_populates="children")
    messages: Mapped[list["DbMessage"]] = relationship("DbMessage", back_populates="child")


class DbTeacher(Base):
    __tablename__ = "teachers"
    teacher_id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    classroom_id: Mapped[str] = mapped_column(String, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False, default="")
    messages: Mapped[list["DbMessage"]] = relationship("DbMessage", back_populates="teacher")


class DbEventType(Base):
    __tablename__ = "event_types"
    event_type: Mapped[str] = mapped_column(String, primary_key=True)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    requires_injury_field: Mapped[bool] = mapped_column(Boolean, default=False)
    requires_action_field: Mapped[bool] = mapped_column(Boolean, default=False)


class DbMessage(Base):
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    child_id: Mapped[str] = mapped_column(String, ForeignKey("children.child_id"))
    teacher_id: Mapped[str] = mapped_column(String, ForeignKey("teachers.teacher_id"))
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    tone: Mapped[str] = mapped_column(String, nullable=False)
    generated_message: Mapped[str] = mapped_column(Text, nullable=False)
    parent_email: Mapped[str] = mapped_column(String, nullable=False)
    child_name: Mapped[str] = mapped_column(String, nullable=False)
    classroom: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="draft")
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    delivery_method: Mapped[str] = mapped_column(String, default="sendgrid")
    sendgrid_message_id: Mapped[str | None] = mapped_column(String, nullable=True)
    reply_token: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    child: Mapped["DbChild"] = relationship("DbChild", back_populates="messages")
    teacher: Mapped["DbTeacher"] = relationship("DbTeacher", back_populates="messages")
    replies: Mapped[list["DbParentReply"]] = relationship("DbParentReply", back_populates="message")


class DbParentReply(Base):
    __tablename__ = "parent_replies"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    message_id: Mapped[int] = mapped_column(Integer, ForeignKey("messages.id"))
    reply_token: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    parent_email: Mapped[str] = mapped_column(String, nullable=False)
    reply_text: Mapped[str] = mapped_column(Text, nullable=False)
    replied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    message: Mapped["DbMessage"] = relationship("DbMessage", back_populates="replies")
