import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from data_loader import validate_all_csvs
from database import engine, AsyncSessionLocal
from models.db_models import Base
from routers import children, classrooms, events, generate, send
from routers import auth, messages, bulk, replies, notices
from scheduler import scheduler

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Validate CSVs
    try:
        validate_all_csvs()
        logger.info("All CSV data files validated successfully.")
    except ValueError as exc:
        raise RuntimeError(f"Startup failed — CSV validation error: {exc}") from exc

    # Create DB tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed from CSVs
    from db.seed import seed_database
    async with AsyncSessionLocal() as session:
        await seed_database(session)

    # Start scheduler
    scheduler.start()
    logger.info("Scheduler started.")

    yield

    scheduler.shutdown()
    logger.info("Scheduler stopped.")


app = FastAPI(
    title="Parent Communication Copilot",
    description="AI-powered parent messaging for childcare centers",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(children.router)
app.include_router(classrooms.router)
app.include_router(events.router)
app.include_router(generate.router)
app.include_router(send.router)
app.include_router(auth.router)
app.include_router(messages.router)
app.include_router(bulk.router)
app.include_router(replies.router)
app.include_router(notices.router)


@app.get("/", tags=["health"])
def health_check() -> dict:
    return {"status": "ok", "service": "parent-comm-copilot", "version": "2.0.0"}
