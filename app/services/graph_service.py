from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.correlation import Correlation
from app.models.correlation_event import CorrelationEvent
from app.models.event import Event
from app.models.incident_event import IncidentEvent


def get_incident_graph(
    db: Session,
    incident_id: str,
) -> dict:
    """
    Build a graph representation of an incident.

    The service only reads persisted relationships.
    It does not calculate correlations or intelligence.
    """

    incident_events_statement = (
        select(IncidentEvent)
        .where(
            IncidentEvent.incident_id == incident_id
        )
    )

    incident_events = list(
        db.scalars(incident_events_statement).all()
    )

    event_ids = {
        item.event_id
        for item in incident_events
    }

    if not event_ids:
        return {
            "nodes": [],
            "edges": [],
        }

    events_statement = (
        select(Event)
        .where(Event.event_id.in_(event_ids))
    )

    events = list(
        db.scalars(events_statement).all()
    )

    correlations_statement = (
        select(CorrelationEvent)
        .where(
            CorrelationEvent.event_id.in_(event_ids)
        )
    )

    correlation_links = list(
        db.scalars(correlations_statement).all()
    )

    correlation_ids = {
        item.correlation_id
        for item in correlation_links
    }

    correlations = []

    if correlation_ids:
        correlations_statement = (
            select(Correlation)
            .where(
                Correlation.correlation_id.in_(
                    correlation_ids
                )
            )
        )

        correlations = list(
            db.scalars(correlations_statement).all()
        )

    nodes = []
    edges = []

    # Event nodes
    for event in events:
        nodes.append(
            {
                "id": event.event_id,
                "type": "event",
                "label": event.event_type,
                "timestamp": event.timestamp,
            }
        )

    # Correlation nodes
    for correlation in correlations:
        nodes.append(
            {
                "id": correlation.correlation_id,
                "type": "correlation",
                "label": correlation.reason,
                "strength": correlation.strength,
            }
        )

    # Incident → Event edges
    for item in incident_events:
        edges.append(
            {
                "source": incident_id,
                "target": item.event_id,
                "relationship": item.relationship,
            }
        )

    # Correlation → Event edges
    for item in correlation_links:
        edges.append(
            {
                "source": item.correlation_id,
                "target": item.event_id,
                "relationship": item.relationship,
            }
        )

    return {
        "nodes": nodes,
        "edges": edges,
    }