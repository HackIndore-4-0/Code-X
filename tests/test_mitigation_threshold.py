from datetime import datetime
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.services.mitigation_service import process_mitigation_for_incident
from app.models.incident import Incident
from app.models.event import Event
from app.models.incident_event import IncidentEvent
from app.core.database import Base


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


def test_mitigation_below_threshold(db_session, monkeypatch):
    monkeypatch.setenv("TRACEX_MITIGATION_THRESHOLD", "80")

    now = datetime.utcnow()
    incident = Incident(
        incident_id="INC-BELOW-01",
        title="Minor event",
        status="INVESTIGATING",
        created_at=now,
        updated_at=now,
    )
    db_session.add(incident)

    event = Event(
        event_id="EVT-BELOW-01",
        timestamp=now,
        event_type="login",
        user_id="USR-202",
        ip_address="10.0.0.20",
    )
    db_session.add(event)
    db_session.commit()

    inc_event = IncidentEvent(
        incident_id=incident.incident_id,
        event_id=event.event_id,
        relationship="CURRENT_EVENT",
    )
    db_session.add(inc_event)
    db_session.commit()

    low_intel = {
        "anomalies": [],
        "correlations": [],
        "evidence": [],
    }

    result = process_mitigation_for_incident(
        db=db_session,
        incident_id=incident.incident_id,
        intelligence_result=low_intel,
    )

    assert result is None  # Below threshold -> no mitigation


def test_mitigation_above_threshold(db_session, monkeypatch):
    monkeypatch.setenv("TRACEX_MITIGATION_THRESHOLD", "80")

    now = datetime.utcnow()
    incident = Incident(
        incident_id="INC-ABOVE-01",
        title="Critical Breach",
        status="CRITICAL",
        created_at=now,
        updated_at=now,
    )
    db_session.add(incident)

    event = Event(
        event_id="EVT-ABOVE-01",
        timestamp=now,
        event_type="privilege_change",
        user_id="USR-101",
        ip_address="198.51.100.42",
        resource="finance_db",
    )
    db_session.add(event)
    db_session.commit()

    inc_event = IncidentEvent(
        incident_id=incident.incident_id,
        event_id=event.event_id,
        relationship="CURRENT_EVENT",
    )
    db_session.add(inc_event)
    db_session.commit()

    high_intel = {
        "anomalies": [{"is_anomaly": True, "score": 0.95}],
        "correlations": [{"strength": 0.9}, {"strength": 0.85}, {"strength": 0.8}],
        "evidence": [
            {"type": "UNUSUAL_LOGIN", "description": "Unusual login", "impact": "HIGH"},
            {"type": "PRIV_CHANGE", "description": "Privilege escalation", "impact": "CRITICAL"},
            {"type": "LARGE_TRANSFER", "description": "Data exfiltration", "impact": "CRITICAL"},
            {"type": "ANOMALOUS_ACCESS", "description": "Resource access", "impact": "HIGH"},
        ],
    }

    result = process_mitigation_for_incident(
        db=db_session,
        incident_id=incident.incident_id,
        intelligence_result=high_intel,
    )

    assert result is not None
    assert result.incident_id == incident.incident_id
    assert result.threat_weight >= 80.0
    assert result.action == "ISOLATE_ENTITY"
    assert result.entity_value == "198.51.100.42"
