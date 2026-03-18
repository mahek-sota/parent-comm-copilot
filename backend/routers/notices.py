"""
POST /notices/upload  — parse a CSV of notices and return a preview
POST /notices/send    — send (demo) the parsed notices
GET  /notices/sample  — download a sample CSV template
"""
import csv
import io
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_teacher
from database import get_db
from models.db_models import DbChild, DbClassroom, DbMessage, DbTeacher

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notices", tags=["notices"])

SAMPLE_CSV = """child_name,subject,message
Emma Johnson,Field Trip Friday,Hi! Just a reminder that we have a field trip to the nature center this Friday. Please pack a nut-free lunch and dress your child in comfortable shoes.
Toddler B,Weekly Newsletter,What a wonderful week in Toddler B! We explored water play and started our garden seeds. Thank you for your continued support.
All,School Closure Notice,Please note that the center will be closed on Monday for a staff development day. We look forward to seeing everyone on Tuesday!
"""


class NoticeRow(BaseModel):
    row_number: int
    raw_target: str
    subject: str
    message: str
    matched_children: list[dict]  # [{child_id, child_name, parent_email}]
    status: str  # 'matched' | 'unmatched' | 'error'
    error: Optional[str] = None


class UploadPreviewResponse(BaseModel):
    rows: list[NoticeRow]
    total_recipients: int
    unmatched_count: int


class SendNoticesRequest(BaseModel):
    rows: list[NoticeRow]


class SendNoticesResponse(BaseModel):
    sent: int
    skipped: int
    details: list[dict]


@router.get("/sample")
async def download_sample() -> StreamingResponse:
    """Return a sample CSV template for download."""
    return StreamingResponse(
        io.StringIO(SAMPLE_CSV),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=notices_template.csv"},
    )


@router.post("/upload", response_model=UploadPreviewResponse)
async def upload_notices(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_teacher: DbTeacher = Depends(get_current_teacher),
) -> UploadPreviewResponse:
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=422, detail="Please upload a .csv file")

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")  # handle BOM from Excel exports
    except UnicodeDecodeError:
        raise HTTPException(status_code=422, detail="File must be UTF-8 encoded")

    # Load all children and classrooms for matching
    children_result = await db.execute(select(DbChild))
    all_children = children_result.scalars().all()

    classrooms_result = await db.execute(select(DbClassroom))
    all_classrooms = classrooms_result.scalars().all()

    # Build lookup maps
    child_by_name = {c.name.lower(): c for c in all_children}
    classroom_by_name = {c.name.lower(): c for c in all_classrooms}
    classroom_children = {
        c.classroom_id: [ch for ch in all_children if ch.classroom_id == c.classroom_id]
        for c in all_classrooms
    }

    rows: list[NoticeRow] = []
    reader = csv.DictReader(io.StringIO(text))

    required_cols = {"child_name", "subject", "message"}
    if not reader.fieldnames or not required_cols.issubset(set(reader.fieldnames)):
        raise HTTPException(
            status_code=422,
            detail=f"CSV must have columns: {', '.join(required_cols)}. Got: {reader.fieldnames}",
        )

    for i, row in enumerate(reader, start=2):  # start=2 because row 1 is header
        target = (row.get("child_name") or "").strip()
        subject = (row.get("subject") or "").strip()
        message = (row.get("message") or "").strip()

        if not target or not message:
            rows.append(NoticeRow(
                row_number=i,
                raw_target=target or "(empty)",
                subject=subject,
                message=message,
                matched_children=[],
                status="error",
                error="child_name and message are required",
            ))
            continue

        matched: list[DbChild] = []

        if target.lower() == "all":
            matched = list(all_children)
        elif target.lower() in classroom_by_name:
            cr = classroom_by_name[target.lower()]
            matched = classroom_children.get(cr.classroom_id, [])
        elif target.lower() in child_by_name:
            matched = [child_by_name[target.lower()]]
        else:
            rows.append(NoticeRow(
                row_number=i,
                raw_target=target,
                subject=subject,
                message=message,
                matched_children=[],
                status="unmatched",
                error=f"No child or classroom found matching '{target}'",
            ))
            continue

        rows.append(NoticeRow(
            row_number=i,
            raw_target=target,
            subject=subject,
            message=message,
            matched_children=[
                {"child_id": c.child_id, "child_name": c.name, "parent_email": c.parent_email}
                for c in matched
            ],
            status="matched",
        ))

    total_recipients = sum(len(r.matched_children) for r in rows if r.status == "matched")
    unmatched_count = sum(1 for r in rows if r.status in ("unmatched", "error"))

    return UploadPreviewResponse(
        rows=rows,
        total_recipients=total_recipients,
        unmatched_count=unmatched_count,
    )


@router.post("/send", response_model=SendNoticesResponse)
async def send_notices(
    req: SendNoticesRequest,
    db: AsyncSession = Depends(get_db),
    current_teacher: DbTeacher = Depends(get_current_teacher),
) -> SendNoticesResponse:
    sent = 0
    skipped = 0
    details = []

    for row in req.rows:
        if row.status != "matched" or not row.matched_children:
            skipped += 1
            continue

        for recipient in row.matched_children:
            # Demo mode: log and save to DB, no real email
            logger.info(
                "[NOTICE DEMO] To=%s | Subject=%s | Child=%s | Preview: %.60s…",
                recipient["parent_email"],
                row.subject,
                recipient["child_name"],
                row.message,
            )

            db_msg = DbMessage(
                child_id=recipient["child_id"],
                teacher_id=current_teacher.teacher_id,
                event_type="notice",
                tone="informational",
                generated_message=f"Subject: {row.subject}\n\n{row.message}",
                parent_email=recipient["parent_email"],
                child_name=recipient["child_name"],
                classroom="",
                status="sent",
                sent_at=datetime.now(timezone.utc),
                delivery_method="demo",
                sendgrid_message_id=f"demo-{uuid.uuid4().hex[:10]}",
            )
            db.add(db_msg)
            sent += 1
            details.append({
                "child_name": recipient["child_name"],
                "parent_email": recipient["parent_email"],
                "subject": row.subject,
                "status": "sent",
            })

    await db.commit()
    return SendNoticesResponse(sent=sent, skipped=skipped, details=details)
