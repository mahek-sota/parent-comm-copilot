import logging
from typing import Callable

from fastapi import APIRouter, Depends, HTTPException

from data_loader import load_children, load_classrooms, load_event_types
from models.schemas import GenerateMessageRequest, GenerateMessageResponse
from services import GeminiClient
from services.llm_client import LLMClient

logger = logging.getLogger(__name__)

router = APIRouter()

# Module-level provider — swap this out in tests via dependency override
_llm_client: LLMClient | None = None


def get_llm_client() -> LLMClient:
    global _llm_client
    if _llm_client is None:
        _llm_client = GeminiClient()
    return _llm_client


@router.post("/generate-message", response_model=GenerateMessageResponse)
def generate_message(
    payload: GenerateMessageRequest,
    llm: LLMClient = Depends(get_llm_client),
) -> GenerateMessageResponse:
    # Resolve child
    children = load_children()
    child = next((c for c in children if c.child_id == payload.child_id), None)
    if child is None:
        raise HTTPException(status_code=404, detail=f"Child not found: {payload.child_id}")

    # Resolve classroom
    classrooms = load_classrooms()
    classroom = next((r for r in classrooms if r.classroom_id == child.classroom_id), None)
    classroom_name = classroom.name if classroom else child.classroom_id

    # Resolve event type
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

    return GenerateMessageResponse(
        child_name=child.name,
        parent_email=child.parent_email,
        event_type=payload.event_type,
        generated_message=generated_message,
        tone=payload.tone,
        classroom=classroom_name,
    )
