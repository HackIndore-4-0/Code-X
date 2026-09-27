from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.correlation import Correlation
from app.models.correlation_event import CorrelationEvent


def create_correlation(
    db: Session,
    correlation_id: str,
    reason: str,
    strength: float,
) -> Correlation:
    correlation = Correlation(
        correlation_id=correlation_id,
        reason=reason,
        strength=strength,
    )

    db.add(correlation)
    db.commit()
    db.refresh(correlation)

    return correlation


def link_event_to_correlation(
    db: Session,
    correlation_id: str,
    event_id: str,
    relationship: str,
) -> CorrelationEvent:
    correlation_event = CorrelationEvent(
        correlation_id=correlation_id,
        event_id=event_id,
        relationship=relationship,
    )

    db.add(correlation_event)
    db.commit()
    db.refresh(correlation_event)

    return correlation_event


def get_correlation(
    db: Session,
    correlation_id: str,
) -> Correlation | None:
    return db.get(Correlation, correlation_id)


def get_correlation_events(
    db: Session,
    correlation_id: str,
) -> list[CorrelationEvent]:
    statement = (
        select(CorrelationEvent)
        .where(
            CorrelationEvent.correlation_id == correlation_id
        )
    )

    return list(db.scalars(statement).all())


def get_incident_correlations(
    db: Session,
    incident_id: str,
):
    statement = (
        select(Correlation)
        .join(
            CorrelationEvent,
            CorrelationEvent.correlation_id
            == Correlation.correlation_id,
        )
    )

    # Incident → events → correlations
    from app.models.incident_event import IncidentEvent

    statement = (
        select(Correlation)
        .join(
            CorrelationEvent,
            CorrelationEvent.correlation_id
            == Correlation.correlation_id,
        )
        .join(
            IncidentEvent,
            IncidentEvent.event_id
            == CorrelationEvent.event_id,
        )
        .where(
            IncidentEvent.incident_id == incident_id
        )
        .distinct()
    )

    return list(db.scalars(statement).all())