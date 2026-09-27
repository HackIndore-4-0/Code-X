from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.incident import Incident
from app.schemas.analyst_action import AnalystActionRequest
from app.services.analyst_action_service import apply_analyst_action


router = APIRouter(
    prefix="/api/incidents",
    tags=["Analyst Actions"],
)


@router.post("/{incident_id}/action")
def perform_analyst_action(
    incident_id: str,
    request: AnalystActionRequest,
    db: Session = Depends(get_db),
):
    incident = db.get(Incident, incident_id)

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "data": None,
                "error": {
                    "code": "INCIDENT_NOT_FOUND",
                    "message": f"Incident '{incident_id}' not found",
                },
            },
        )

    try:
        analyst_action = apply_analyst_action(
            db=db,
            incident=incident,
            action=request.action.value,
            reason=request.reason.value if request.reason else None,
            analyst_id=request.analyst_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "data": None,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": str(exc),
                },
            },
        )

    return {
        "success": True,
        "data": {
            "action_id": analyst_action.action_id,
            "incident_id": analyst_action.incident_id,
            "action": analyst_action.action,
            "reason": analyst_action.reason,
            "analyst_id": analyst_action.analyst_id,
            "created_at": analyst_action.created_at,
            "incident": {
                "incident_id": incident.incident_id,
                "title": incident.title,
                "status": incident.status,
                "priority": incident.priority_score,
                "updated_at": incident.updated_at,
                "resolved_at": incident.resolved_at,
            },
        },
        "error": None,
    }