import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app
from app.models.audit_log import AuditLog
from app.services.simulation_service import reset_simulation_state


@pytest.fixture
def test_database():
    """
    Create a fresh in-memory database for every test.
    """

    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    TestingSessionLocal = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
    )

    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()

        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    reset_simulation_state()

    client = TestClient(app)

    yield client, TestingSessionLocal

    app.dependency_overrides.clear()
    reset_simulation_state()
    engine.dispose()


def test_event_processing_creates_audit_log(test_database):
    client, TestingSessionLocal = test_database

    event = {
        "event_id": "E2E-AUDIT-001",
        "timestamp": "2026-09-25T09:12:00",
        "event_type": "login",
        "user_id": "USR-E2E",
        "device_id": "DEV-E2E",
        "ip_address": "10.0.0.50",
        "location": "Indore",
        "session_id": "SES-E2E",
        "resource": None,
        "action": "login",
        "metadata": {},
    }

    response = client.post(
        "/api/events",
        json=event,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["data"]["event"]["event_id"] == "E2E-AUDIT-001"

    db = TestingSessionLocal()

    try:
        logs = list(
            db.execute(
                select(AuditLog)
            ).scalars()
        )

        assert len(logs) == 1

        audit = logs[0]

        assert audit.audit_id == "AUD-E2E-AUDIT-001"
        assert audit.action == "EVENT_PROCESSED"
        assert audit.actor == "system"
        assert audit.incident_id is None

        assert audit.details["event_id"] == "E2E-AUDIT-001"
        assert audit.details["event_type"] == "login"

    finally:
        db.close()


def test_simulation_exposes_what_changed(test_database):
    client, _ = test_database

    response = client.post(
        "/api/simulation/start",
        json={"scenario": "suspicious"},
    )

    assert response.status_code == 200

    response = client.post(
        "/api/simulation/next",
    )

    if response.status_code != 200:
        print(response.json())

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True

    simulation = data["data"]["simulation"]
    changes = simulation["changes"]

    assert simulation["current_event"]["event_id"] == "EVT-S-001"

    assert changes["event_processed"] is True
    assert "incident_changed" in changes
    assert "priority_changed" in changes
    assert "status_changed" in changes
    assert "new_evidence" in changes
    assert "new_correlations" in changes