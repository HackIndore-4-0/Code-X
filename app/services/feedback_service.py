from typing import Any
from datetime import datetime
from uuid import uuid4
import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.analyst_feedback import AnalystFeedback
from app.models.feedback_adaptation import FeedbackAdaptation
from app.models.incident import Incident
from app.models.incident_event import IncidentEvent
from app.models.event import Event
from app.services.audit_service import create_audit_log


def get_pattern_keys_for_incident(db: Session, incident_id: str) -> list[str]:
    """
    Extract pattern keys for an incident based on its linked events.
    Returns deterministic pattern keys representing the event chain and event pairs.
    """
    stmt = (
        select(Event)
        .join(IncidentEvent, IncidentEvent.event_id == Event.event_id)
        .where(IncidentEvent.incident_id == incident_id)
        .order_by(Event.timestamp.asc())
    )
    events = list(db.scalars(stmt).all())

    if not events:
        return [f"incident:{incident_id}"]

    event_types = [e.event_type for e in events]
    sorted_unique_types = sorted(set(event_types))

    pattern_keys = []

    # Combo chain key
    chain_key = f"chain:{':'.join(sorted_unique_types)}"
    pattern_keys.append(chain_key)

    # Event pair keys
    for i in range(len(event_types) - 1):
        pair_key = f"pair:{event_types[i]}:{event_types[i+1]}"
        if pair_key not in pattern_keys:
            pattern_keys.append(pair_key)

    # Specific event type keys
    for et in sorted_unique_types:
        type_key = f"event_type:{et}"
        if type_key not in pattern_keys:
            pattern_keys.append(type_key)

    return pattern_keys


def get_pattern_suppression_factor(db: Session, pattern_keys: list[str]) -> float:
    """
    Query active feedback adaptations for matching pattern keys.
    Returns the minimum suppression factor (bounded >= 0.20), or 1.0 if none match.
    """
    if not pattern_keys:
        return 1.0

    stmt = select(FeedbackAdaptation).where(
        FeedbackAdaptation.pattern_key.in_(pattern_keys)
    )
    adaptations = list(db.scalars(stmt).all())

    if not adaptations:
        return 1.0

    min_factor = min(a.suppression_factor for a in adaptations)
    return max(0.20, min_factor)


def process_analyst_feedback(
    db: Session,
    incident_id: str,
    feedback_type: str,
    reason: str | None = None,
    analyst_id: str = "analyst",
) -> dict:
    """
    Process analyst feedback for an incident.
    Analyst feedback must be FALSE_POSITIVE.
    Uses Pandas to compute derived suppression factors and persists adaptations to SQLite.
    """
    incident = db.get(Incident, incident_id)
    if incident is None:
        raise ValueError(f"Incident '{incident_id}' not found")

    if feedback_type != "FALSE_POSITIVE":
        raise ValueError(f"Unsupported feedback type: '{feedback_type}'. Must be 'FALSE_POSITIVE'")

    feedback_id = f"FBK-{uuid4().hex[:8].upper()}"

    # 1. Persist AnalystFeedback in SQLite
    feedback_record = AnalystFeedback(
        id=feedback_id,
        incident_id=incident_id,
        feedback_type=feedback_type,
        reason=reason,
        analyst_id=analyst_id,
        timestamp=datetime.utcnow(),
    )
    db.add(feedback_record)
    db.commit()

    # 2. Extract pattern keys for this incident
    pattern_keys = get_pattern_keys_for_incident(db, incident_id)

    # 3. PANDAS MEANINGFUL COMPUTATION:
    # Fetch all historical AnalystFeedback records from SQLite
    all_feedbacks = list(db.scalars(select(AnalystFeedback)).all())

    records_data = []
    for fb in all_feedbacks:
        keys = get_pattern_keys_for_incident(db, fb.incident_id)
        for pk in keys:
            records_data.append({
                "feedback_id": fb.id,
                "incident_id": fb.incident_id,
                "feedback_type": fb.feedback_type,
                "pattern_key": pk,
            })

    suppression_changes = []

    if records_data:
        # Load into Pandas DataFrame
        df = pd.DataFrame(records_data)

        # Use Pandas groupby & agg to aggregate feedback counts per pattern_key
        grouped = df.groupby("pattern_key").agg(
            total_feedback_count=("feedback_id", "count"),
            false_positive_count=("feedback_type", lambda x: (x == "FALSE_POSITIVE").sum()),
        ).reset_index()

        # Vectorized Pandas calculation for false_positive_rate & suppression_factor
        grouped["false_positive_rate"] = (
            grouped["false_positive_count"] / grouped["total_feedback_count"]
        )
        # Bounded suppression factor: 1.0 - (fp_rate * 0.50), clamped between 0.20 and 1.0
        grouped["suppression_factor"] = (
            1.0 - (grouped["false_positive_rate"] * 0.50)
        ).clip(lower=0.20, upper=1.0)

        # Filter for pattern keys belonging to current incident
        target_df = grouped[grouped["pattern_key"].isin(pattern_keys)]

        for _, row in target_df.iterrows():
            pk = str(row["pattern_key"])
            fp_count = int(row["false_positive_count"])
            total_count = int(row["total_feedback_count"])
            supp_factor = float(row["suppression_factor"])

            # Check existing adaptation in SQLite
            stmt = select(FeedbackAdaptation).where(FeedbackAdaptation.pattern_key == pk)
            adaptation = db.scalars(stmt).first()

            if adaptation:
                adaptation.false_positive_count = fp_count
                adaptation.total_feedback_count = total_count
                adaptation.suppression_factor = supp_factor
                adaptation.updated_at = datetime.utcnow()
            else:
                adaptation = FeedbackAdaptation(
                    id=f"ADP-{uuid4().hex[:8].upper()}",
                    pattern_key=pk,
                    false_positive_count=fp_count,
                    total_feedback_count=total_count,
                    suppression_factor=supp_factor,
                    updated_at=datetime.utcnow(),
                )
                db.add(adaptation)

            suppression_changes.append({
                "pattern_key": pk,
                "suppression_factor": round(supp_factor, 3),
            })

        db.commit()

    # 4. Update incident status to FALSE_POSITIVE
    incident.status = "FALSE_POSITIVE"
    db.commit()

    # 5. Audit Trail entry
    create_audit_log(
        db=db,
        audit_id=f"AUD-FBK-{feedback_id}",
        incident_id=incident_id,
        action="FALSE_POSITIVE_FEEDBACK_APPLIED",
        actor=analyst_id,
        details={
            "feedback_id": feedback_id,
            "feedback_type": feedback_type,
            "reason": reason,
            "updated_patterns": pattern_keys,
            "suppression_changes": suppression_changes,
        },
    )

    return {
        "incident_id": incident_id,
        "feedback": feedback_type,
        "reason": reason,
        "updated_patterns": pattern_keys,
        "suppression_changes": suppression_changes,
        "message": "Feedback applied to future scoring",
    }


def get_pattern_keys_for_event(event: Any, historical_context: dict) -> list[str]:
    """
    Extract pattern keys for an incoming event and historical context.
    """
    hist_events = (
        (historical_context or {}).get("user_events", [])
        + (historical_context or {}).get("device_events", [])
        + (historical_context or {}).get("related_events", [])
    )
    all_events = list(hist_events)
    if event:
        ev_type = getattr(event, "event_type", None)
        if hasattr(ev_type, "value"):
            ev_type = ev_type.value
        all_events.append({"event_type": str(ev_type)})

    types = [
        item.get("event_type") if isinstance(item, dict) else getattr(item, "event_type", None)
        for item in all_events
        if item
    ]
    clean_types = [t.value if hasattr(t, "value") else str(t) for t in types if t]
    sorted_unique = sorted(set(clean_types))

    pattern_keys = []
    if sorted_unique:
        pattern_keys.append(f"chain:{':'.join(sorted_unique)}")
        for et in sorted_unique:
            pattern_keys.append(f"event_type:{et}")

    for i in range(len(clean_types) - 1):
        pk = f"pair:{clean_types[i]}:{clean_types[i+1]}"
        if pk not in pattern_keys:
            pattern_keys.append(pk)

    return pattern_keys


def apply_feedback_suppression(
    db: Session,
    event: Any,
    historical_context: dict,
    intelligence_result: dict,
) -> dict:
    """
    Apply active feedback suppression factors to intelligence result.
    Scales anomaly scores, correlation strengths, and priority scores dynamically for matching patterns.
    """
    pattern_keys = get_pattern_keys_for_event(event, historical_context)
    suppression_factor = get_pattern_suppression_factor(db, pattern_keys)

    if suppression_factor >= 1.0:
        return intelligence_result

    # Scale anomaly scores
    anomalies = intelligence_result.get("anomalies") or []
    for a in anomalies:
        if isinstance(a, dict) and "score" in a:
            a["score"] = round(float(a["score"]) * suppression_factor, 3)

    # Scale correlation strengths
    correlations = intelligence_result.get("correlations") or []
    for c in correlations:
        if isinstance(c, dict) and "strength" in c:
            c["strength"] = round(float(c["strength"]) * suppression_factor, 3)

    # Scale priority score
    priority = intelligence_result.get("priority")
    if priority and isinstance(priority, dict) and "score" in priority:
        orig_score = float(priority["score"])
        new_score = round(orig_score * suppression_factor, 2)
        priority["score"] = new_score
        if new_score < 30:
            priority["label"] = "LOW"
        elif new_score < 60:
            priority["label"] = "MEDIUM"
        elif new_score < 80:
            priority["label"] = "HIGH"
        else:
            priority["label"] = "CRITICAL"

    return intelligence_result
