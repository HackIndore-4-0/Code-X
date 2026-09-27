from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.evidence import Evidence


def create_evidence(
    db: Session,
    evidence_id: str,
    incident_id: str,
    event_id: str | None,
    evidence_type: str,
    description: str,
    impact: str | None = None,
) -> Evidence:

    evidence = Evidence(
        evidence_id=evidence_id,
        incident_id=incident_id,
        event_id=event_id,
        type=evidence_type,
        description=description,
        impact=impact,
    )

    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    return evidence


def get_incident_evidence(
    db: Session,
    incident_id: str,
) -> list[Evidence]:

    statement = (
        select(Evidence)
        .where(
            Evidence.incident_id == incident_id
        )
        .order_by(Evidence.created_at.asc())
    )

    return list(db.scalars(statement).all())