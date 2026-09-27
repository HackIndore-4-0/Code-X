from datetime import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.models.incident import Incident
from app.models.event import Event
from app.models.incident_event import IncidentEvent
from app.services.mitigation_service import process_mitigation_for_incident


@pytest.fixture
def test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()

    def override_get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield session
    finally:
        session.close()
        app.dependency_overrides.clear()


client = TestClient(app)


def test_get_mitigation_non_existent_incident(test_db):
    response = client.get("/api/incidents/INC-NONEXISTENT/mitigation")
    assert response.status_code == 404
    body = response.json()
    assert body["detail"] == "Incident not found"


def test_get_mitigation_not_triggered(test_db):
    now = datetime.utcnow()
    incident = Incident(
        incident_id="INC-NOT-TRIG",
        title="Low risk incident",
        status="OPEN",
        created_at=now,
        updated_at=now,
    )
    test_db.add(incident)
    test_db.commit()

    response = client.get(f"/api/incidents/{incident.incident_id}/mitigation")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["incident_id"] == incident.incident_id
    assert body["data"]["triggered"] is False
    assert body["data"]["isolation_status"] == "NOT_TRIGGERED"


def test_get_mitigation_triggered(test_db):
    now = datetime.utcnow()
    incident = Incident(
        incident_id="INC-TRIG-01",
        title="Critical threat incident",
        status="CRITICAL",
        created_at=now,
        updated_at=now,
    )
    test_db.add(incident)

    event = Event(
        event_id="EVT-TRIG-01",
        timestamp=now,
        event_type="large_transfer",
        user_id="USR-101",
        ip_address="198.51.100.42",
        resource="finance_db",
    )
    test_db.add(event)
    test_db.commit()

    inc_event = IncidentEvent(
        incident_id=incident.incident_id,
        event_id=event.event_id,
        relationship="CURRENT_EVENT",
    )
    test_db.add(inc_event)
    test_db.commit()

    high_intel = {
        "anomalies": [{"is_anomaly": True, "score": 0.95}],
        "correlations": [{"strength": 0.9}, {"strength": 0.85}, {"strength": 0.8}],
        "evidence": [
            {"type": "UNUSUAL_LOGIN", "description": "Unusual login", "impact": "HIGH"},
            {"type": "PRIV_CHANGE", "description": "Privilege escalation", "impact": "CRITICAL"},
            {"type": "LARGE_TRANSFER", "description": "Data exfiltration", "impact": "CRITICAL"},
        ],
    }

    mit_record = process_mitigation_for_incident(
        db=test_db,
        incident_id=incident.incident_id,
        intelligence_result=high_intel,
    )
    assert mit_record is not None

    response = client.get(f"/api/incidents/{incident.incident_id}/mitigation")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["incident_id"] == incident.incident_id
    assert body["data"]["triggered"] is True
    assert body["data"]["action"] == "ISOLATE_ENTITY"
    assert body["data"]["entity"]["value"] == "198.51.100.42"
    assert body["data"]["remediation_status"] == "ISOLATED"
    assert body["data"]["mitigation_id"] == mit_record.id
