from datetime import datetime, timezone
from typing import Any

from intelligence.pipeline import process_event as intelligence_process_event
from intelligence.schemas import (
    HistoricalContext as IntelligenceHistoricalContext,
    NormalizedEvent as IntelligenceNormalizedEvent,
)


def _normalize_timestamp(timestamp: Any) -> datetime:
    """
    Convert timestamps into timezone-aware UTC datetimes.

    SQLite/SQLAlchemy may return historical timestamps without timezone
    information, while incoming API timestamps can be timezone-aware.
    The intelligence layer must receive one consistent representation.
    """
    if isinstance(timestamp, str):
        timestamp = datetime.fromisoformat(
            timestamp.replace("Z", "+00:00")
        )

    if not isinstance(timestamp, datetime):
        raise TypeError(
            f"Unsupported timestamp type: {type(timestamp).__name__}"
        )

    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)

    return timestamp.astimezone(timezone.utc)


def _convert_event(event: Any) -> IntelligenceNormalizedEvent:
    return IntelligenceNormalizedEvent(
        event_id=event.event_id,
        timestamp=_normalize_timestamp(event.timestamp),
        event_type=event.event_type.value,
        user_id=event.user_id,
        device_id=event.device_id,
        ip_address=event.ip_address,
        location=event.location,
        session_id=event.session_id,
        resource=event.resource,
        action=event.action,
        metadata=event.metadata,
    )


def _convert_event_from_dict(
    event: dict[str, Any],
) -> IntelligenceNormalizedEvent:
    return IntelligenceNormalizedEvent(
        event_id=event["event_id"],
        timestamp=_normalize_timestamp(event["timestamp"]),
        event_type=event["event_type"],
        user_id=event.get("user_id"),
        device_id=event.get("device_id"),
        ip_address=event.get("ip_address"),
        location=event.get("location"),
        session_id=event.get("session_id"),
        resource=event.get("resource"),
        action=event.get("action"),
        metadata=event.get("metadata") or {},
    )


def _convert_historical_context(
    context: dict[str, Any],
) -> IntelligenceHistoricalContext:
    user_events = [
        _convert_event_from_dict(item)
        for item in context.get("user_events", [])
    ]

    device_events = [
        _convert_event_from_dict(item)
        for item in context.get("device_events", [])
    ]

    related_events = [
        _convert_event_from_dict(item)
        for item in context.get("related_events", [])
    ]

    return IntelligenceHistoricalContext(
        user_events=user_events,
        device_events=device_events,
        related_events=related_events,
        existing_incident=context.get("existing_incident"),
    )


def _normalize_incident_action(action: str | None) -> str | None:
    mapping = {
        "CREATE": "CREATED",
        "UPDATE": "UPDATED",
        "NO_INCIDENT": "NONE",
        "NO_CHANGE": "NONE",
    }

    return mapping.get(action, action)


def _convert_result(result: Any) -> dict[str, Any]:
    if hasattr(result, "model_dump"):
        data = result.model_dump()
    else:
        data = dict(result)

    incident = data.get("incident")

    if incident:
        incident["action"] = _normalize_incident_action(
            incident.get("action")
        )

    return {
        "anomalies": data.get("anomalies") or [],
        "entities": data.get("entities") or [],
        "correlations": data.get("correlations") or [],
        "incident": incident,
        "evidence": data.get("evidence") or [],
        "priority": data.get("priority"),
    }


def process_event(
    event: Any,
    historical_context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    intelligence_event = _convert_event(event)

    intelligence_context = _convert_historical_context(
        historical_context or {}
    )

    result = intelligence_process_event(
        normalized_event=intelligence_event,
        historical_context=intelligence_context,
    )

    return _convert_result(result)