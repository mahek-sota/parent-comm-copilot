from pathlib import Path

import pandas as pd

from models.schemas import Child, Classroom, EventType, Teacher

DATA_DIR = Path(__file__).parent / "data"

REQUIRED_FILES = [
    "children.csv",
    "classrooms.csv",
    "teachers.csv",
    "event_types.csv",
    "incident_templates.csv",
]


def validate_all_csvs() -> None:
    """Validate all required CSV files exist and are non-empty. Raises ValueError on failure."""
    for filename in REQUIRED_FILES:
        path = DATA_DIR / filename
        if not path.exists():
            raise ValueError(f"Missing CSV: data/{filename}")
        try:
            df = pd.read_csv(path)
        except Exception as exc:
            raise ValueError(f"Could not read CSV data/{filename}: {exc}") from exc
        if df.empty:
            raise ValueError(f"Empty CSV: data/{filename} — file must have at least one data row")


def _clean_str(value: object) -> str:
    """Convert pandas NaN and other nullish values to empty string."""
    if pd.isna(value):
        return ""
    return str(value).strip()


def load_children() -> list[Child]:
    df = pd.read_csv(DATA_DIR / "children.csv", dtype=str)
    return [
        Child(
            child_id=_clean_str(row["child_id"]),
            name=_clean_str(row["name"]),
            classroom_id=_clean_str(row["classroom_id"]),
            parent_email=_clean_str(row["parent_email"]),
            allergies=_clean_str(row["allergies"]),
            notes=_clean_str(row.get("notes", "")),
        )
        for _, row in df.iterrows()
    ]


def load_classrooms() -> list[Classroom]:
    df = pd.read_csv(DATA_DIR / "classrooms.csv", dtype=str)
    return [
        Classroom(
            classroom_id=_clean_str(row["classroom_id"]),
            name=_clean_str(row["name"]),
            age_group=_clean_str(row["age_group"]),
            teacher_ids=_clean_str(row["teacher_ids"]),
        )
        for _, row in df.iterrows()
    ]


def load_teachers() -> list[Teacher]:
    df = pd.read_csv(DATA_DIR / "teachers.csv", dtype=str)
    return [
        Teacher(
            teacher_id=_clean_str(row["teacher_id"]),
            name=_clean_str(row["name"]),
            email=_clean_str(row["email"]),
            classroom_id=_clean_str(row["classroom_id"]),
        )
        for _, row in df.iterrows()
    ]


def load_event_types() -> list[EventType]:
    df = pd.read_csv(DATA_DIR / "event_types.csv", dtype=str)
    return [
        EventType(
            event_type=_clean_str(row["event_type"]),
            display_name=_clean_str(row["display_name"]),
            requires_injury_field=_clean_str(row["requires_injury_field"]).lower() == "true",
            requires_action_field=_clean_str(row["requires_action_field"]).lower() == "true",
        )
        for _, row in df.iterrows()
    ]
