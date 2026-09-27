from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.incident import Incident
from app.models.incident_event import IncidentEvent
from app.schemas.event import NormalizedEvent
from app.services.event_service import get_events


def event_to_dict(event: Event) -> dict:
    return {
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
        "metadata": event.event_metadata,
    }


def find_existing_incident(
    db: Session,
    event: NormalizedEvent,
) -> Incident | None:
    conditions = []

    if event.user_id:
        conditions.append(Event.user_id == event.user_id)

    if event.device_id:
        conditions.append(Event.device_id == event.device_id)

    if event.session_id:
        conditions.append(Event.session_id == event.session_id)

    if event.ip_address:
        conditions.append(Event.ip_address == event.ip_address)

    if event.resource:
        conditions.append(Event.resource == event.resource)

    if not conditions:
        return None

    statement = (
        select(Incident)
        .join(
            IncidentEvent,
            IncidentEvent.incident_id == Incident.incident_id,
        )
        .join(
            Event,
            Event.event_id == IncidentEvent.event_id,
        )
        .where(
            Event.event_id != event.event_id,
            *conditions,
        )
        .order_by(
            Incident.updated_at.desc()
        )
    )

    return db.scalars(statement).first()


def get_historical_context(
    db: Session,
    event: NormalizedEvent,
    simulation: bool = False,
    simulation_event_ids: list[str] | None = None,
    simulation_incident_id: str | None = None,
) -> dict:
    """
    Build historical context for intelligence processing.

    Normal processing uses stored historical context.

    Simulation processing is isolated from unrelated database history.
    It may only use events explicitly belonging to the current
    simulation run.
    """

    if simulation:
        simulation_event_ids = simulation_event_ids or []

        if simulation_event_ids:
            statement = (
                select(Event)
                .where(
                    Event.event_id.in_(simulation_event_ids)
                )
                .order_by(Event.timestamp.asc())
            )

            simulation_events = list(
                db.scalars(statement).all()
            )
        else:
            simulation_events = []

        historical_events = [
            event_to_dict(item)
            for item in simulation_events
            if item.event_id != event.event_id
        ]

        existing_incident = None

        if simulation_incident_id:
            incident = db.get(
                Incident,
                simulation_incident_id,
            )

            if incident is not None:
                existing_incident = {
                    "incident_id": incident.incident_id,
                    "status": incident.status,
                }

        return {
            "user_events": historical_events,
            "device_events": historical_events,
            "related_events": historical_events,
            "existing_incident": existing_incident,
        }

    user_events = []
    device_events = []
    related_events = []

    if event.user_id:
        user_events = get_events(
            db,
            user_id=event.user_id,
        )

    if event.device_id:
        device_events = get_events(
            db,
            device_id=event.device_id,
        )

    existing_incident = find_existing_incident(
        db,
        event,
    )

    return {
        "user_events": [
            event_to_dict(item)
            for item in user_events
            if item.event_id != event.event_id
        ],
        "device_events": [
            event_to_dict(item)
            for item in device_events
            if item.event_id != event.event_id
        ],
        "related_events": [
            event_to_dict(item)
            for item in related_events
            if item.event_id != event.event_id
        ],
        "existing_incident": (
            {
                "incident_id": existing_incident.incident_id,
                "status": existing_incident.status,
            }
            if existing_incident
            else None
        ),
    }