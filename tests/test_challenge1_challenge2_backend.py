import uuid
import pytest
import pandas as pd
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.simulation.scenarios import get_scenario
from app.services.processing_service import process_incoming_event
from app.services.audit_service import get_incident_audit_logs
from app.services.mitigation_service import (
    process_mitigation_for_incident,
    get_incident_mitigation,
)
from app.services.feedback_service import (
    process_analyst_feedback,
    get_pattern_suppression_factor,
    get_pattern_keys_for_incident,
)
from app.models.mitigation_action import MitigationAction
from app.models.analyst_feedback import AnalystFeedback
from app.models.feedback_adaptation import FeedbackAdaptation
from app.models.incident import Incident
from app.models.evidence import Evidence


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


# =====================================================================
# CHALLENGE 1 TESTS: AUTOMATED THREAT MITIGATION PIPELINE
# =====================================================================

def test_threat_weight_below_threshold_no_mitigation(db_session, monkeypatch):
    monkeypatch.setenv("TRACEX_MITIGATION_THRESHOLD", "95")  # High threshold
    events = get_scenario("suspicious")
    run_id = uuid.uuid4().hex[:8]
    incident_id = None

    for ev in events[:4]:  # Process early events
        res = process_incoming_event(db_session, ev, allow_existing=True, simulation_run_id=run_id)
        if res.get("incident_id"):
            incident_id = res["incident_id"]

    if incident_id:
        mit = get_incident_mitigation(db_session, incident_id)
        assert mit["triggered"] is False
        assert mit["mitigation_id"] is None


def test_threat_weight_at_or_above_threshold_triggers_mitigation(db_session, monkeypatch):
    monkeypatch.setenv("TRACEX_MITIGATION_THRESHOLD", "80")
    events = get_scenario("suspicious")
    run_id = uuid.uuid4().hex[:8]
    incident_id = None
    mitigation_id = None

    for ev in events:
        res = process_incoming_event(db_session, ev, allow_existing=True, simulation_run_id=run_id)
        if res.get("incident_id"):
            incident_id = res["incident_id"]
        if res.get("mitigation_id"):
            mitigation_id = res["mitigation_id"]

    assert incident_id is not None
    assert mitigation_id is not None

    stmt = select(MitigationAction).where(MitigationAction.id == mitigation_id)
    mit_record = db_session.scalars(stmt).first()
    assert mit_record is not None
    assert mit_record.threat_weight >= 80.0
    assert mit_record.remediation_status == "ISOLATED"


def test_mitigation_payload_structure_and_graph_nodes_edges(db_session, monkeypatch):
    monkeypatch.setenv("TRACEX_MITIGATION_THRESHOLD", "80")
    events = get_scenario("suspicious")
    run_id = uuid.uuid4().hex[:8]
    incident_id = None

    for ev in events:
        res = process_incoming_event(db_session, ev, allow_existing=True, simulation_run_id=run_id)
        if res.get("incident_id"):
            incident_id = res["incident_id"]

    stmt = select(MitigationAction).where(MitigationAction.incident_id == incident_id)
    mit_record = db_session.scalars(stmt).first()
    assert mit_record is not None

    payload = mit_record.payload
    assert payload["incident_id"] == incident_id
    assert "threat_weight" in payload
    assert "threshold" in payload
    assert "user_id" in payload
    assert "flagged_ip" in payload
    assert payload["action"] == "ISOLATE_ENTITY"
    assert "graph" in payload
    assert "nodes" in payload["graph"]
    assert "node_count" in payload["graph"]
    assert "edges" in payload["graph"]
    assert "edge_count" in payload["graph"]


def test_sqlite_mitigation_record_and_audit_log_created(db_session, monkeypatch):
    monkeypatch.setenv("TRACEX_MITIGATION_THRESHOLD", "80")
    events = get_scenario("suspicious")
    run_id = uuid.uuid4().hex[:8]
    incident_id = None

    for ev in events:
        res = process_incoming_event(db_session, ev, allow_existing=True, simulation_run_id=run_id)
        if res.get("incident_id"):
            incident_id = res["incident_id"]

    audit_logs = get_incident_audit_logs(db_session, incident_id)
    mit_logs = [a for a in audit_logs if a.action == "AUTOMATED_MITIGATION_TRIGGERED"]
    assert len(mit_logs) >= 1
    log = mit_logs[0]
    assert log.incident_id == incident_id
    assert log.details["action"] == "ISOLATE_ENTITY"
    assert log.details["threat_weight"] >= 80.0


def test_mitigation_idempotency_prevents_duplicate_records(db_session, monkeypatch):
    monkeypatch.setenv("TRACEX_MITIGATION_THRESHOLD", "80")
    events = get_scenario("suspicious")
    run_id = uuid.uuid4().hex[:8]
    incident_id = None

    for ev in events:
        res = process_incoming_event(db_session, ev, allow_existing=True, simulation_run_id=run_id)
        if res.get("incident_id"):
            incident_id = res["incident_id"]

    # Reprocess the last event again for the same incident
    res2 = process_mitigation_for_incident(db_session, incident_id, simulation_run_id=run_id)
    
    stmt = select(MitigationAction).where(MitigationAction.incident_id == incident_id)
    mit_records = list(db_session.scalars(stmt).all())
    assert len(mit_records) == 1  # Exactly 1 record, no duplicate created


# =====================================================================
# CHALLENGE 2 TESTS: ANALYST FEEDBACK LOOP & PANDAS ADAPTATION
# =====================================================================

def test_analyst_feedback_validation_and_persistence(db_session, monkeypatch):
    monkeypatch.setenv("TRACEX_MITIGATION_THRESHOLD", "80")
    events = get_scenario("suspicious")
    run_id = uuid.uuid4().hex[:8]
    incident_id = None

    for ev in events:
        res = process_incoming_event(db_session, ev, allow_existing=True, simulation_run_id=run_id)
        if res.get("incident_id"):
            incident_id = res["incident_id"]

    # 1. Invalid incident test
    with pytest.raises(ValueError, match="not found"):
        process_analyst_feedback(db_session, "INC-NONEXISTENT", "FALSE_POSITIVE")

    # 2. Invalid feedback type test
    with pytest.raises(ValueError, match="Unsupported feedback type"):
        process_analyst_feedback(db_session, incident_id, "TRUE_POSITIVE")

    # 3. Valid FALSE_POSITIVE feedback test
    res = process_analyst_feedback(db_session, incident_id, "FALSE_POSITIVE", reason="Approved security drill")
    assert res["incident_id"] == incident_id
    assert res["feedback"] == "FALSE_POSITIVE"
    assert len(res["updated_patterns"]) > 0

    # 4. Verify SQLite AnalystFeedback record
    stmt = select(AnalystFeedback).where(AnalystFeedback.incident_id == incident_id)
    fb = db_session.scalars(stmt).first()
    assert fb is not None
    assert fb.feedback_type == "FALSE_POSITIVE"
    assert fb.reason == "Approved security drill"

    # 5. Verify SQLite FeedbackAdaptation record calculated with Pandas
    stmt_adapt = select(FeedbackAdaptation)
    adaptations = list(db_session.scalars(stmt_adapt).all())
    assert len(adaptations) > 0
    for ad in adaptations:
        assert 0.20 <= ad.suppression_factor <= 1.0

    # 6. Verify audit log entry
    audit_logs = get_incident_audit_logs(db_session, incident_id)
    fb_logs = [a for a in audit_logs if a.action == "FALSE_POSITIVE_FEEDBACK_APPLIED"]
    assert len(fb_logs) == 1
    assert fb_logs[0].details["reason"] == "Approved security drill"

    # 7. Verify historical incident & evidence remain intact (preserves auditability)
    inc = db_session.get(Incident, incident_id)
    assert inc is not None
    stmt_ev = select(Evidence).where(Evidence.incident_id == incident_id)
    evidence_items = list(db_session.scalars(stmt_ev).all())
    assert len(evidence_items) > 0


def test_pandas_suppression_calculation_and_future_alert_downgrade(db_session, monkeypatch):
    monkeypatch.setenv("TRACEX_MITIGATION_THRESHOLD", "80")
    events = get_scenario("suspicious")

    # PHASE A — BEFORE FEEDBACK
    run_id_a = "RUN-PHASE-A"
    inc_a_id = None
    mit_a_id = None

    for ev in events:
        res = process_incoming_event(db_session, ev, allow_existing=True, simulation_run_id=run_id_a)
        if res.get("incident_id"):
            inc_a_id = res["incident_id"]
        if res.get("mitigation_id"):
            mit_a_id = res["mitigation_id"]

    assert inc_a_id is not None
    assert mit_a_id is not None  # Phase A triggered mitigation

    # APPLY FALSE_POSITIVE ANALYST FEEDBACK
    feedback_result = process_analyst_feedback(
        db_session,
        inc_a_id,
        "FALSE_POSITIVE",
        reason="Sanctioned penetration testing exercise",
    )
    assert feedback_result["feedback"] == "FALSE_POSITIVE"

    # Verify Pandas adaptation factor is bounded
    p_keys = get_pattern_keys_for_incident(db_session, inc_a_id)
    supp_factor = get_pattern_suppression_factor(db_session, p_keys)
    assert 0.20 <= supp_factor < 1.0  # Materially reduced suppression factor

    # PHASE B — AFTER FEEDBACK (Injecting the same event sequence again under a new run)
    run_id_b = "RUN-PHASE-B"
    inc_b_id = None
    mit_b_id = None
    final_res_b = None

    for ev in events:
        res = process_incoming_event(db_session, ev, allow_existing=True, simulation_run_id=run_id_b)
        if res.get("incident_id"):
            inc_b_id = res["incident_id"]
        if res.get("mitigation_id"):
            mit_b_id = res["mitigation_id"]
        final_res_b = res

    # Phase B verification:
    # 1. Mitigation is NOT triggered for the repeat false-positive pattern!
    assert mit_b_id is None, "Mitigation must be suppressed after false-positive analyst feedback"

    # 2. Priority & correlation strengths are scaled down by suppression factor
    intel_b = final_res_b.get("intelligence", {})
    priority_b = intel_b.get("priority", {})
    assert priority_b.get("score", 0.0) < 60.0  # Materially lower score


def test_unrelated_pattern_is_not_suppressed(db_session, monkeypatch):
    monkeypatch.setenv("TRACEX_MITIGATION_THRESHOLD", "80")

    # Mark suspicious scenario as false positive
    events = get_scenario("suspicious")
    run_id = uuid.uuid4().hex[:8]
    inc_id = None
    for ev in events:
        res = process_incoming_event(db_session, ev, allow_existing=True, simulation_run_id=run_id)
        if res.get("incident_id"):
            inc_id = res["incident_id"]

    process_analyst_feedback(db_session, inc_id, "FALSE_POSITIVE", reason="Test feedback")

    # Check an unrelated pattern key (e.g. unknown event sequence)
    unrelated_keys = ["chain:custom_type_x:custom_type_y", "pair:custom_type_x:custom_type_y"]
    factor = get_pattern_suppression_factor(db_session, unrelated_keys)
    assert factor == 1.0  # Unrelated pattern remains unsuppressed (1.0)
