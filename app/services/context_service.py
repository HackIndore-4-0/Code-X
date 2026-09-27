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
    """
    Find the most recent incident related to the current event.

    The relationship is established through previously stored events
    linked to incidents. Matching considers user, device, session,
    IP address, or resource when available.

    The current event itself is excluded because it has only just
    entered the event store.
    """

    previous_event = None

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
) -> dict:
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