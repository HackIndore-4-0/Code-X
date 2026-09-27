from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def create_audit_log(
    db: Session,
    audit_id: str,
    incident_id: str | None,
    action: str,
    actor: str | None,
    details: dict[str, Any],
) -> AuditLog:
    audit_log = AuditLog(
        audit_id=audit_id,
        incident_id=incident_id,
        action=action,
        actor=actor,
        details=details,
    )

    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)

    return audit_log


def get_incident_audit_logs(
    db: Session,
    incident_id: str,
) -> list[AuditLog]:
    statement = (
        select(AuditLog)
        .where(AuditLog.incident_id == incident_id)
        .order_by(AuditLog.timestamp.asc())
    )

    return list(db.scalars(statement).all())