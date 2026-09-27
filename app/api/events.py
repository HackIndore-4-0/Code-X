from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.event import NormalizedEvent
from app.services.event_service import (
    get_event,
    get_events,
)
from app.services.processing_service import process_incoming_event


router = APIRouter(
    prefix="/api/events",
    tags=["Events"],
)


@router.post("")
def create_event_endpoint(
    event: NormalizedEvent,
    db: Session = Depends(get_db),
):
    try:
        result = process_incoming_event(
            db,
            event,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=409,
            detail={
                "success": False,
                "data": None,
                "error": {
                    "code": "DUPLICATE_EVENT",
                    "message": str(exc),
                },
            },
        )

    return {
        "success": True,
        "data": result,
        "error": None,
    }


@router.get("")
def list_events(
    user_id: str | None = None,
    device_id: str | None = None,
    event_type: str | None = None,
    db: Session = Depends(get_db),
):
    events = get_events(
        db,
        user_id=user_id,
        device_id=device_id,
        event_type=event_type,
    )

    return {
        "success": True,
        "data": [
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
                "metadata": event.event_metadata,
            }
            for event in events
        ],
        "error": None,
    }


@router.get("/{event_id}")
def retrieve_event(
    event_id: str,
    db: Session = Depends(get_db),
):
    event = get_event(db, event_id)

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found",
        )

    return {
        "success": True,
        "data": {
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
        },
        "error": None,
    }