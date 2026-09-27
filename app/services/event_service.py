from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.event import Event
from app.schemas.event import NormalizedEvent


def create_event(
    db: Session,
    event: NormalizedEvent,
) -> Event:

    db_event = Event(
        event_id=event.event_id,
        timestamp=event.timestamp,
        event_type=event.event_type.value,
        user_id=event.user_id,
        device_id=event.device_id,
        ip_address=event.ip_address,
        location=event.location,
        session_id=event.session_id,
        resource=event.resource,
        action=event.action,
        event_metadata=event.metadata,
    )

    db.add(db_event)
    db.commit()
    db.refresh(db_event)

    return db_event


def get_events(
    db: Session,
    user_id: str | None = None,
    device_id: str | None = None,
    event_type: str | None = None,
    start_time: datetime | None = None,
    end_time: datetime | None = None,
    limit: int | None = None,
    offset: int | None = None,
) -> list[Event]:

    statement = select(Event)

    if user_id:
        statement = statement.where(Event.user_id == user_id)

    if device_id:
        statement = statement.where(Event.device_id == device_id)

    if event_type:
        statement = statement.where(Event.event_type == event_type)

    if start_time:
        statement = statement.where(Event.timestamp >= start_time)

    if end_time:
        statement = statement.where(Event.timestamp <= end_time)

    statement = statement.order_by(Event.timestamp.desc())

    if offset is not None:
        statement = statement.offset(offset)

    if limit is not None:
        statement = statement.limit(limit)

    return list(db.scalars(statement).all())


def get_event(
    db: Session,
    event_id: str,
) -> Event | None:

    return db.get(Event, event_id)


def event_exists(
    db: Session,
    event_id: str,
) -> bool:

    return db.get(Event, event_id) is not None