import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import create_access_token, verify_password
from database import get_db
from models.db_models import DbTeacher

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    teacher_id: str
    name: str


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)) -> LoginResponse:
    result = await db.execute(select(DbTeacher).where(DbTeacher.email == req.email))
    teacher = result.scalars().first()
    if teacher is None or not verify_password(req.password, teacher.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token({"sub": teacher.teacher_id})
    logger.info("Teacher logged in: %s", teacher.email)
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        teacher_id=teacher.teacher_id,
        name=teacher.name,
    )
