from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.incident_event import IncidentEvent
from app.models.event import Event


def create_incident(
    db: Session,
    incident_id: str,
    title: str,
    status: str,
    priority_score: float | None = None,
    priority_label: str | None = None,
) -> Incident:

    incident = Incident(
        incident_id=incident_id,
        title=title,
        status=status,
        priority_score=priority_score,
        priority_label=priority_label,
    )

    db.add(incident)
    db.commit()
    db.refresh(incident)

    return incident


def get_incident(
    db: Session,
    incident_id: str,
) -> Incident | None:

    return db.get(Incident, incident_id)


def get_incidents(
    db: Session,
) -> list[Incident]:

    statement = (
        select(Incident)
        .order_by(Incident.created_at.desc())
    )

    return list(db.scalars(statement).all())


def get_incident_timeline(
    db: Session,
    incident_id: str,
) -> list[Event]:

    statement = (
        select(Event)
        .join(
            IncidentEvent,
            IncidentEvent.event_id == Event.event_id,
        )
        .where(
            IncidentEvent.incident_id == incident_id
        )
        .order_by(Event.timestamp.asc())
    )

    return list(db.scalars(statement).all())