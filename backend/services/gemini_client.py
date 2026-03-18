import os

import google.generativeai as genai

from .llm_client import LLMClient


class GeminiClient(LLMClient):
    def __init__(self) -> None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel("gemini-2.5-flash")

    def generate_message(self, context: dict) -> str:
        prompt = self._build_prompt(context)
        response = self.model.generate_content(prompt)
        return response.text.strip()

    def _build_prompt(self, context: dict) -> str:
        tone_descriptions = {
            "friendly": "warm, caring, and reassuring — like a message from a trusted teacher who genuinely cares",
            "professional": "formal, clear, and factual — concise and objective like a professional care report",
            "brief": "very concise, 2–3 sentences max, just the essential facts",
        }
        tone_desc = tone_descriptions.get(context.get("tone", "friendly"), tone_descriptions["friendly"])

        injury_line = ""
        if context.get("injury_description"):
            injury_line = f"Injury Description: {context['injury_description']}\n"

        action_line = ""
        if context.get("action_taken"):
            action_line = f"Action Taken: {context['action_taken']}\n"

        classroom_name = context.get("classroom_name", "our classroom")

        return f"""You are a childcare teacher at Sunrise Learning Center writing a message to a parent.

Child: {context.get("child_name", "your child")}
Classroom: {classroom_name}
Event Type: {context.get("event_type_display", context.get("event_type", "event"))}
Time: {context.get("time_of_event", "today")}
Notes: {context.get("notes", "")}
{injury_line}{action_line}
Write a {tone_desc} message to the parent about this event.

The message must:
- Open with a warm greeting addressed to the parent (e.g., "Hi Emma's family," or "Dear Noah's parents,")
- Clearly and calmly explain what happened
- Reassure them their child is doing well (unless context indicates otherwise)
- End with exactly this closing line: "Please let us know if you have any questions. – {classroom_name} Team"

Write only the message body. No subject line. No extra commentary. No markdown formatting."""
