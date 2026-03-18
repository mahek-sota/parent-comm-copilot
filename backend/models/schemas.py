from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, field_validator


class Child(BaseModel):
    child_id: str
    name: str
    classroom_id: str
    parent_email: str
    allergies: str
    notes: str


class Classroom(BaseModel):
    classroom_id: str
    name: str
    age_group: str
    teacher_ids: str


class Teacher(BaseModel):
    teacher_id: str
    name: str
    email: str
    classroom_id: str


class EventType(BaseModel):
    event_type: str
    display_name: str
    requires_injury_field: bool
    requires_action_field: bool


class GenerateMessageRequest(BaseModel):
    child_id: str
    event_type: str
    notes: str
    injury_description: Optional[str] = None
    action_taken: Optional[str] = None
    time_of_event: str
    tone: Literal["friendly", "professional", "brief"]

    @field_validator("notes", "time_of_event")
    @classmethod
    def must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Field must not be empty")
        return v.strip()


class GenerateMessageResponse(BaseModel):
    child_name: str
    parent_email: str
    event_type: str
    generated_message: str
    tone: str
    classroom: str
    message_id: Optional[int] = None
