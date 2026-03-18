from abc import ABC, abstractmethod


class LLMClient(ABC):
    @abstractmethod
    def generate_message(self, context: dict) -> str:
        """Generate a parent-friendly message from event context."""
        ...
