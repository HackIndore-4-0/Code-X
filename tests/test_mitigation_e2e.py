import uuid
import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.simulation.scenarios import get_scenario
from app.services.processing_service import process_incoming_event
from app.services.audit_service import get_incident_audit_logs
from app.services.mitigation_service import get_incident_mitigation
from app.models.mitigation_action import MitigationAction


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


def test_e2e_suspicious_scenario_triggers_automatic_mitigation(db_session, monkeypatch):
    monkeypatch.setenv("TRACEX_MITIGATION_THRESHOLD", "80")

    events = get_scenario("suspicious")
    incident_id = None
    run_id = uuid.uuid4().hex[:8]

    for event in events:
        res = process_incoming_event(
            db_session,
            event,
            allow_existing=True,
            simulation_run_id=run_id,
        )
        if res.get("incident_id"):
            incident_id = res["incident_id"]

    assert incident_id is not None, "Suspicious scenario must produce an incident"

    # Verify mitigation record in SQLite
    stmt = select(MitigationAction).where(MitigationAction.incident_id == incident_id)
    mit_record = db_session.scalars(stmt).first()

    assert mit_record is not None, "Automatic mitigation must be persisted in SQLite"
    assert mit_record.threat_weight >= 80.0
    assert mit_record.action == "ISOLATE_ENTITY"
    assert mit_record.user_id == "USR-101"
    assert mit_record.flagged_ip in ["198.51.100.42", "10.0.0.15"]
    assert mit_record.remediation_status == "ISOLATED"
    assert mit_record.payload["incident_id"] == incident_id
    assert mit_record.payload["action"] == "ISOLATE_ENTITY"
    assert mit_record.payload["graph"]["node_count"] >= 1

    # Verify Audit Trail
    audit_logs = get_incident_audit_logs(db_session, incident_id)
    mit_audit = [a for a in audit_logs if a.action == "AUTOMATED_MITIGATION_TRIGGERED"]
    assert len(mit_audit) >= 1, "Audit log must contain AUTOMATED_MITIGATION_TRIGGERED entry"
    audit_detail = mit_audit[0].details
    assert audit_detail["action"] == "ISOLATE_ENTITY"
    assert audit_detail["threat_weight"] >= 80.0
    assert audit_detail["user_id"] == "USR-101"
    assert audit_detail["flagged_ip"] in ["198.51.100.42", "10.0.0.15"]

    # Verify Mitigation API response
    api_data = get_incident_mitigation(db_session, incident_id)
    assert api_data["triggered"] is True
    assert api_data["mitigation_id"] == mit_record.id
    assert api_data["threat_weight"] == mit_record.threat_weight
    assert api_data["remediation_status"] == "ISOLATED"


def test_e2e_benign_scenario_does_not_trigger_mitigation(db_session, monkeypatch):
    monkeypatch.setenv("TRACEX_MITIGATION_THRESHOLD", "80")

    events = get_scenario("benign")
    incident_id = None
    run_id = uuid.uuid4().hex[:8]

    for event in events:
        res = process_incoming_event(
            db_session,
            event,
            allow_existing=True,
            simulation_run_id=run_id,
        )
        if res.get("incident_id"):
            incident_id = res["incident_id"]

    if incident_id:
        stmt = select(MitigationAction).where(MitigationAction.incident_id == incident_id)
        mit_record = db_session.scalars(stmt).first()
        assert mit_record is None, "Benign scenario must NOT trigger automatic mitigation"

        api_data = get_incident_mitigation(db_session, incident_id)
        assert api_data["triggered"] is False
        assert api_data["isolation_status"] == "NOT_TRIGGERED"
