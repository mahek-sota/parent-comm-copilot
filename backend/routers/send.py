"""
POST /send-message

Placeholder delivery endpoint. Currently logs the send and returns a
success receipt. To wire up real email, replace the body of
`_deliver_message` with a SendGrid / Mailgun / SES call — the request
and response shapes stay the same.
"""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()


class SendMessageRequest(BaseModel):
    child_name: str
    parent_email: str
    classroom: str
    event_type: str
    generated_message: str
    tone: str


class SendMessageResponse(BaseModel):
    success: bool
    recipient: str
    delivered_at: str
    delivery_method: str
    note: str


def _deliver_message(req: SendMessageRequest) -> None:
    """
    Placeholder — swap this body for a real provider call.

    Example (SendGrid):
        import sendgrid
        sg = sendgrid.SendGridAPIClient(api_key=os.environ["SENDGRID_API_KEY"])
        msg = Mail(from_email="noreply@sunrisecenter.edu",
                   to_emails=req.parent_email,
                   subject=f"Update about {req.child_name}",
                   plain_text_content=req.generated_message)
        sg.client.mail.send.post(request_body=msg.get())
    """
    logger.info(
        "[PLACEHOLDER SEND] To=%s | Child=%s | Classroom=%s | Event=%s | Tone=%s\nMessage:\n%s",
        req.parent_email,
        req.child_name,
        req.classroom,
        req.event_type,
        req.tone,
        req.generated_message,
    )


@router.post("/send-message", response_model=SendMessageResponse)
def send_message(req: SendMessageRequest) -> SendMessageResponse:
    _deliver_message(req)
    return SendMessageResponse(
        success=True,
        recipient=req.parent_email,
        delivered_at=datetime.now(timezone.utc).isoformat(),
        delivery_method="placeholder",
        note="Email delivery not yet configured. Connect SendGrid or Mailgun to send real messages.",
    )
