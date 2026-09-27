import json
from datetime import datetime
from pathlib import Path

from app.schemas.event import NormalizedEvent


SCENARIOS_DIR = Path(__file__).resolve().parent / "scenarios"


def _load_scenario_file(name: str) -> list[NormalizedEvent]:
    path = SCENARIOS_DIR / f"scenario_{name}.json"

    if not path.exists():
        raise ValueError(f"Scenario file not found: {path}")

    with path.open("r", encoding="utf-8") as f:
        scenario = json.load(f)

    events = scenario.get("events")

    if not isinstance(events, list):
        raise ValueError(
            f"Scenario '{name}' must contain an 'events' list"
        )

    normalized_events: list[NormalizedEvent] = []

    for raw_event in events:
        normalized_events.append(
            NormalizedEvent(
                event_id=raw_event["event_id"],
                timestamp=datetime.fromisoformat(
                    raw_event["timestamp"].replace("Z", "+00:00")
                ),
                event_type=raw_event["event_type"],
                user_id=raw_event["user_id"],
                device_id=raw_event.get("device_id"),
                ip_address=raw_event.get("ip_address"),
                location=raw_event.get("location"),
                session_id=raw_event.get("session_id"),
                resource=raw_event.get("resource"),
                action=raw_event.get("action"),
                metadata=raw_event.get("metadata", {}),
            )
        )

    return normalized_events


def suspicious_scenario() -> list[NormalizedEvent]:
    return _load_scenario_file("suspicious")


def benign_scenario() -> list[NormalizedEvent]:
    return _load_scenario_file("benign")


SCENARIOS = {
    "suspicious": suspicious_scenario,
    "benign": benign_scenario,
}


def get_scenario(name: str) -> list[NormalizedEvent]:
    if name not in SCENARIOS:
        raise ValueError(
            f"Unknown simulation scenario: {name}"
        )

    return SCENARIOS[name]()