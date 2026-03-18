from fastapi import APIRouter

from data_loader import load_event_types
from models.schemas import EventType

router = APIRouter()


@router.get("/events", response_model=list[EventType])
def get_events() -> list[EventType]:
    return load_event_types()
