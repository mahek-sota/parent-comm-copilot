from fastapi import APIRouter, HTTPException

from data_loader import load_children
from models.schemas import Child

router = APIRouter()


@router.get("/children", response_model=list[Child])
def get_children() -> list[Child]:
    children = load_children()
    if not children:
        raise HTTPException(status_code=404, detail="No children found")
    return children
