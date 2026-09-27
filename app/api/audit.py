from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.audit_service import get_all_audit_logs

router = APIRouter(
    prefix="/api/audit",
    tags=["Audit"],
)


def audit_to_dict(audit):
    return {
        "audit_id": audit.audit_id,
        "incident_id": audit.incident_id,
        "action": audit.action,
        "actor": audit.actor,
        "details": audit.details,
        "timestamp": audit.timestamp.isoformat() if audit.timestamp else None,
    }


@router.get("")
def list_audit_logs(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    audit_logs = get_all_audit_logs(db, limit=limit, offset=offset)

    return {
        "success": True,
        "data": [
            audit_to_dict(item)
            for item in audit_logs
        ],
        "error": None,
    }
