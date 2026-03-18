import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from data_loader import validate_all_csvs
from routers import children, classrooms, events, generate, send

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Validate CSV data on startup before accepting requests."""
    try:
        validate_all_csvs()
        logger.info("All CSV data files validated successfully.")
    except ValueError as exc:
        # Surface as a clear startup error — don't silently swallow it
        raise RuntimeError(f"Startup failed — CSV validation error: {exc}") from exc
    yield


app = FastAPI(
    title="Parent Communication Copilot",
    description="AI-powered parent messaging for childcare centers",
    version="1.0.0",
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


@app.get("/", tags=["health"])
def health_check() -> dict:
    return {"status": "ok", "service": "parent-comm-copilot"}
