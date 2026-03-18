from fastapi import APIRouter, HTTPException

from data_loader import load_classrooms
from models.schemas import Classroom

router = APIRouter()


@router.get("/classrooms", response_model=list[Classroom])
def get_classrooms() -> list[Classroom]:
    classrooms = load_classrooms()
    if not classrooms:
        raise HTTPException(status_code=404, detail="No classrooms found")
    return classrooms
