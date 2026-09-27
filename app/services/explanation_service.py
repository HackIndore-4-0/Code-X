from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.services.correlation_service import get_incident_correlations
from app.services.evidence_service import get_incident_evidence
from app.services.incident_service import get_incident_timeline


def build_explanation_context(
    db: Session,
    incident: Incident,
) -> dict:
    """
    Build structured facts that can be used to explain an incident.

    This function does not make new security decisions.
    It only gathers information already stored by TraceX.
    """

    timeline = get_incident_timeline(
        db=db,
        incident_id=incident.incident_id,
    )

    evidence = get_incident_evidence(
        db=db,
        incident_id=incident.incident_id,
    )

    correlations = get_incident_correlations(
        db=db,
        incident_id=incident.incident_id,
    )

    supporting_evidence = []
    mitigating_evidence = []

    for item in evidence:
        evidence_data = {
            "evidence_id": item.evidence_id,
            "event_id": item.event_id,
            "type": item.type,
            "description": item.description,
            "impact": item.impact,
        }

        if item.type == "MITIGATING":
            mitigating_evidence.append(evidence_data)
        else:
            supporting_evidence.append(evidence_data)

    timeline_data = []

    for event in timeline:
        timeline_data.append(
            {
                "event_id": event.event_id,
                "timestamp": event.timestamp,
                "event_type": event.event_type,
                "user_id": event.user_id,
                "device_id": event.device_id,
                "ip_address": event.ip_address,
                "location": event.location,
                "session_id": event.session_id,
                "resource": event.resource,
                "action": event.action,
            }
        )

    correlation_data = []

    for correlation in correlations:
        correlation_data.append(
            {
                "correlation_id": correlation.correlation_id,
                "reason": correlation.reason,
                "strength": correlation.strength,
            }
        )

    return {
        "incident": {
            "incident_id": incident.incident_id,
            "title": incident.title,
            "status": incident.status,
            "priority": incident.priority_score,
            "priority_label": incident.priority_label,
            "created_at": incident.created_at,
            "updated_at": incident.updated_at,
        },
        "timeline": timeline_data,
        "supporting_evidence": supporting_evidence,
        "mitigating_evidence": mitigating_evidence,
        "correlations": correlation_data,
    }


def generate_deterministic_explanation(
    context: dict,
) -> dict:
    """
    Generate a deterministic explanation from TraceX facts.

    No LLM or external service is used here.
    """

    incident = context["incident"]
    timeline = context["timeline"]
    supporting_evidence = context["supporting_evidence"]
    mitigating_evidence = context["mitigating_evidence"]
    correlations = context["correlations"]

    if timeline:
        first_event = timeline[0]
        last_event = timeline[-1]

        summary = (
            f"TraceX identified an incident involving "
            f"{len(timeline)} related event(s). "
            f"The activity begins with {first_event['event_type']} "
            f"at {first_event['timestamp']} and progresses to "
            f"{last_event['event_type']} at {last_event['timestamp']}."
        )
    else:
        summary = (
            "TraceX identified an incident, but no timeline events "
            "are currently associated with it."
        )

    why_connected = []

    for correlation in correlations:
        why_connected.append(
            {
                "correlation_id": correlation["correlation_id"],
                "reason": correlation["reason"],
                "strength": correlation["strength"],
            }
        )

    if not why_connected and len(timeline) > 1:
        why_connected.append(
            {
                "correlation_id": None,
                "reason": (
                    "Multiple events are associated with the same "
                    "TraceX incident."
                ),
                "strength": None,
            }
        )

    if supporting_evidence:
        supporting_text = [
            item["description"]
            for item in supporting_evidence
        ]
    else:
        supporting_text = [
            "No explicit supporting evidence has been recorded."
        ]

    if mitigating_evidence:
        mitigating_text = [
            item["description"]
            for item in mitigating_evidence
        ]
    else:
        mitigating_text = [
            "No mitigating evidence has been recorded."
        ]

    if incident["priority"] is not None:
        why_investigate = (
            f"The incident currently has a TraceX investigation "
            f"priority of {incident['priority']}"
        )

        if incident["priority_label"]:
            why_investigate += (
                f" ({incident['priority_label']})"
            )

        why_investigate += "."
    else:
        why_investigate = (
            "No investigation priority has been calculated yet."
        )

    recommended_actions = []

    if incident["status"] == "INCIDENT_CANDIDATE":
        recommended_actions.append(
            "Investigate the incident and review the associated evidence."
        )

    elif incident["status"] == "HIGH_PRIORITY":
        recommended_actions.append(
            "Investigate the incident promptly and review the "
            "supporting evidence and event sequence."
        )

    elif incident["status"] == "CONFIRMED":
        recommended_actions.append(
            "Review the confirmed incident and determine appropriate "
            "response or containment actions."
        )

    elif incident["status"] == "DISMISSED":
        recommended_actions.append(
            "Review the dismissal reason and retain the audit trail "
            "for future reference."
        )

    elif incident["status"] == "RESOLVED":
        recommended_actions.append(
            "Review the resolution and retain the incident evidence "
            "and audit history."
        )

    else:
        recommended_actions.append(
            "Review the incident timeline and available evidence."
        )

    return {
        "summary": summary,
        "why_connected": why_connected,
        "supporting_evidence": supporting_text,
        "mitigating_evidence": mitigating_text,
        "why_investigate": why_investigate,
        "recommended_actions": recommended_actions,
    }