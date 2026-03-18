from .llm_client import LLMClient


class MockLLMClient(LLMClient):
    """Deterministic LLM client for use in tests. Never calls external APIs."""

    def generate_message(self, context: dict) -> str:
        child_name = context.get("child_name", "your child")
        event_type = context.get("event_type_display", context.get("event_type", "event"))
        classroom = context.get("classroom_name", "our classroom")
        time_of_event = context.get("time_of_event", "today")
        return (
            f"Hi {child_name}'s family, we wanted to let you know that {child_name} "
            f"had a {event_type} at {time_of_event}. Our staff responded appropriately "
            f"and everything is fine. Please let us know if you have any questions. "
            f"– {classroom} Team"
        )
