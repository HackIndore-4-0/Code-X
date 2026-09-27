from uuid import uuid4

from sqlalchemy.orm import Session

from app.intelligence.pipeline import process_event
from app.schemas.event import NormalizedEvent
from app.services.audit_service import create_audit_log
from app.services.context_service import get_historical_context
from app.services.correlation_service import (
    create_correlation,
    link_event_to_correlation,
)
from app.services.evidence_service import create_evidence
from app.services.event_service import (
    create_event,
    event_exists,
    get_event,
)
from app.services.incident_event_service import link_event_to_incident
from app.services.incident_service import (
    create_incident,
    get_incident,
)
from app.services.mitigation_service import process_mitigation_for_incident


def generate_incident_id() -> str:
    return f"INC-{uuid4().hex[:8].upper()}"


def generate_persistence_id(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:8].upper()}"


def _get_incident_title(event: NormalizedEvent) -> str:
    event_name = event.event_type.value.replace("_", " ")
    return f"Suspicious {event_name} activity"


def _persist_incident_events(
    db: Session,
    incident_id: str,
    current_event_id: str,
    event_ids: list[str],
) -> None:
    """
    Link all events identified by the intelligence layer
    to the incident.

    The current event is marked as CURRENT_EVENT.
    Other events returned by intelligence are marked as
    CORRELATED_EVENT.
    """

    unique_event_ids = list(dict.fromkeys(event_ids))

    if current_event_id not in unique_event_ids:
        unique_event_ids.append(current_event_id)

    for event_id in unique_event_ids:
        relationship = (
            "CURRENT_EVENT"
            if event_id == current_event_id
            else "CORRELATED_EVENT"
        )

        link_event_to_incident(
            db=db,
            incident_id=incident_id,
            event_id=event_id,
            relationship=relationship,
        )


def _persist_correlations(
    db: Session,
    incident_id: str,
    current_event_id: str,
    correlations: list[dict],
) -> None:
    for correlation in correlations:
        correlation_id = correlation.get("correlation_id")

        if not correlation_id:
            correlation_id = generate_persistence_id("COR")

        reason = correlation.get("reason")

        if not reason:
            continue

        strength = correlation.get("strength")

        if strength is None:
            strength = 0.0

        create_correlation(
            db=db,
            correlation_id=correlation_id,
            reason=reason,
            strength=float(strength),
        )

        event_ids = list(correlation.get("event_ids") or [])

        if current_event_id not in event_ids:
            event_ids.append(current_event_id)

        for event_id in event_ids:
            relationship = (
                "CURRENT_EVENT"
                if event_id == current_event_id
                else "CORRELATED_EVENT"
            )

            link_event_to_correlation(
                db=db,
                correlation_id=correlation_id,
                event_id=event_id,
                relationship=relationship,
            )


def _persist_evidence(
    db: Session,
    incident_id: str,
    current_event_id: str,
    evidence_items: list[dict],
) -> None:
    for item in evidence_items:
        evidence_id = item.get("evidence_id")

        if not evidence_id:
            evidence_id = generate_persistence_id("EVD")

        event_id = item.get("event_id") or current_event_id
        evidence_type = item.get("type")

        if not evidence_type:
            continue

        description = item.get("description")

        if not description:
            continue

        create_evidence(
            db=db,
            evidence_id=evidence_id,
            incident_id=incident_id,
            event_id=event_id,
            evidence_type=evidence_type,
            description=description,
            impact=item.get("impact"),
        )


def _apply_incident_result(
    db: Session,
    event: NormalizedEvent,
    intelligence_result: dict,
    historical_context: dict,
) -> str | None:

    incident_result = intelligence_result.get("incident")

    if not incident_result:
        return None

    action = incident_result.get("action")

    if action == "NONE":
        return None

    if action not in {"CREATED", "UPDATED"}:
        raise ValueError(
            f"Unsupported intelligence incident action: {action}"
        )

    status = incident_result.get(
        "status",
        "INCIDENT_CANDIDATE",
    )

    priority = intelligence_result.get("priority")

    priority_score = None
    priority_label = None

    if priority:
        priority_score = priority.get("score")
        priority_label = priority.get("label")

    if action == "CREATED":
        incident_id = generate_incident_id()

        incident = create_incident(
            db=db,
            incident_id=incident_id,
            title=_get_incident_title(event),
            status=status,
            priority_score=priority_score,
            priority_label=priority_label,
        )

    else:
        existing_incident = historical_context.get(
            "existing_incident"
        )

        if not existing_incident:
            raise ValueError(
                "Intelligence returned UPDATED but no existing "
                "incident was provided in historical context"
            )

        incident_id = existing_incident.get("incident_id")

        if not incident_id:
            raise ValueError(
                "Existing incident context does not contain "
                "an incident_id"
            )

        incident = get_incident(
            db=db,
            incident_id=incident_id,
        )

        if incident is None:
            raise ValueError(
                f"Existing incident '{incident_id}' was not found"
            )

        incident.status = status

        if priority:
            incident.priority_score = priority_score
            incident.priority_label = priority_label

        db.commit()
        db.refresh(incident)

    incident_event_ids = (
        incident_result.get("event_ids") or []
    )

    _persist_incident_events(
        db=db,
        incident_id=incident.incident_id,
        current_event_id=event.event_id,
        event_ids=incident_event_ids,
    )

    correlations = intelligence_result.get("correlations") or []

    _persist_correlations(
        db=db,
        incident_id=incident.incident_id,
        current_event_id=event.event_id,
        correlations=correlations,
    )

    evidence = intelligence_result.get("evidence") or []

    _persist_evidence(
        db=db,
        incident_id=incident.incident_id,
        current_event_id=event.event_id,
        evidence_items=evidence,
    )

    return incident.incident_id


def process_incoming_event(
    db: Session,
    event: NormalizedEvent,
    *,
    allow_existing: bool = False,
    simulation_run_id: str | None = None,
    simulation_event_ids: list[str] | None = None,
    simulation_incident_id: str | None = None,
) -> dict:

    existing_event = None

    if event_exists(db, event.event_id):
        if not allow_existing:
            raise ValueError("Event already exists")

        existing_event = get_event(
            db,
            event.event_id,
        )

        if existing_event is None:
            raise ValueError(
                f"Event '{event.event_id}' exists but could not be loaded"
            )

        existing_event.timestamp = event.timestamp
        existing_event.event_type = event.event_type.value
        existing_event.user_id = event.user_id
        existing_event.device_id = event.device_id
        existing_event.ip_address = event.ip_address
        existing_event.location = event.location
        existing_event.session_id = event.session_id
        existing_event.resource = event.resource
        existing_event.action = event.action
        existing_event.event_metadata = event.metadata
        db.commit()
        db.refresh(existing_event)

        saved_event = existing_event

    else:
        saved_event = create_event(
            db,
            event,
        )

    historical_context = get_historical_context(
        db,
        event,
        simulation=simulation_run_id is not None,
        simulation_event_ids=simulation_event_ids,
        simulation_incident_id=simulation_incident_id,
    )

    try:
        intelligence_result = process_event(
            event,
            historical_context,
        )

    except Exception as exc:
        audit_id = f"AUD-{event.event_id}"

        if simulation_run_id:
            audit_id = (
                f"AUD-{event.event_id}-RUN-{simulation_run_id}"
            )

        create_audit_log(
            db=db,
            audit_id=audit_id,
            incident_id=None,
            action="INTELLIGENCE_PROCESSING_FAILED",
            actor="system",
            details={
                "event_id": event.event_id,
                "event_type": event.event_type.value,
                "timestamp": event.timestamp.isoformat(),
                "error": str(exc),
            },
        )

        raise

    incident_id = _apply_incident_result(
        db=db,
        event=event,
        intelligence_result=intelligence_result,
        historical_context=historical_context,
    )

    mitigation_action = None

    if incident_id:
        mitigation_action = process_mitigation_for_incident(
            db=db,
            incident_id=incident_id,
            intelligence_result=intelligence_result,
            simulation_run_id=simulation_run_id,
        )

    audit_action = "EVENT_PROCESSED"

    if incident_id:
        incident_result = (
            intelligence_result.get("incident") or {}
        )

        if incident_result.get("action") == "CREATED":
            audit_action = "INCIDENT_CREATED"

        elif incident_result.get("action") == "UPDATED":
            audit_action = "INCIDENT_UPDATED"

    audit_id = f"AUD-{event.event_id}"

    if simulation_run_id:
        audit_id = (
            f"AUD-{event.event_id}-RUN-{simulation_run_id}"
        )

    create_audit_log(
        db=db,
        audit_id=audit_id,
        incident_id=incident_id,
        action=audit_action,
        actor="system",
        details={
            "event_id": event.event_id,
            "event_type": event.event_type.value,
            "timestamp": event.timestamp.isoformat(),
            "incident_action": (
                intelligence_result.get("incident") or {}
            ).get("action"),
            "priority": intelligence_result.get("priority"),
            "evidence_count": len(
                intelligence_result.get("evidence") or []
            ),
            "correlation_count": len(
                intelligence_result.get("correlations") or []
            ),
            "simulation_run_id": simulation_run_id,
            "mitigation_triggered": mitigation_action is not None,
            "mitigation_id": (
                mitigation_action.id
                if mitigation_action
                else None
            ),
        },
    )

    return {
        "event": {
            "event_id": saved_event.event_id,
            "message": "Event processed successfully",
        },
        "intelligence": intelligence_result,
        "incident_id": incident_id,
        "mitigation_id": (
            mitigation_action.id
            if mitigation_action
            else None
        ),
    }