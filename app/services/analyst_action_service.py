from datetime import datetime

from sqlalchemy.orm import Session

from app.models.analyst_action import AnalystAction
from app.models.incident import Incident
from app.services.audit_service import create_audit_log


def apply_analyst_action(
    db: Session,
    incident: Incident,
    action: str,
    reason: str | None = None,
    analyst_id: str | None = None,
) -> AnalystAction:
    """
    Apply an analyst action to an incident.

    The action:
    1. Validates the requested action.
    2. Updates the incident status when required.
    3. Creates an analyst action record.
    4. Creates an audit log entry.
    """

    allowed_actions = {
        "INVESTIGATE",
        "CONFIRM",
        "DISMISS",
        "ESCALATE",
        "RESOLVE",
    }

    if action not in allowed_actions:
        raise ValueError(f"Unsupported analyst action: {action}")

    if action == "DISMISS" and not reason:
        raise ValueError("A reason is required when dismissing an incident")

    previous_status = incident.status

    if action == "CONFIRM":
        incident.status = "CONFIRMED"

    elif action == "DISMISS":
        incident.status = "DISMISSED"

    elif action == "ESCALATE":
        incident.status = "HIGH_PRIORITY"

    elif action == "RESOLVE":
        incident.status = "RESOLVED"
        incident.resolved_at = datetime.utcnow()

    elif action == "INVESTIGATE":
        pass

    incident.updated_at = datetime.utcnow()

    action_id = (
        f"ACT-{incident.incident_id}-"
        f"{int(datetime.utcnow().timestamp() * 1000000)}"
    )

    analyst_action = AnalystAction(
        action_id=action_id,
        incident_id=incident.incident_id,
        action=action,
        reason=reason,
        analyst_id=analyst_id,
    )

    db.add(analyst_action)
    db.flush()

    create_audit_log(
        db=db,
        audit_id=f"AUD-{action_id}",
        incident_id=incident.incident_id,
        action=f"ANALYST_ACTION_{action}",
        actor=analyst_id or "analyst",
        details={
            "action_id": action_id,
            "action": action,
            "reason": reason,
            "previous_status": previous_status,
            "new_status": incident.status,
        },
    )

    db.commit()
    db.refresh(analyst_action)

    return analyst_action
