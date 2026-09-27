from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.models.audit_log import AuditLog
from app.models.correlation import Correlation
from app.models.correlation_event import CorrelationEvent
from app.models.evidence import Evidence
from app.models.event import Event
from app.models.incident import Incident
from app.models.incident_event import IncidentEvent
from app.services.simulation_service import (
    process_next_event,
    process_previous_event,
    reset_simulation_state,
    start_simulation,
)


def create_test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    Base.metadata.create_all(engine)

    SessionLocal = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
    )

    return SessionLocal()


def test_start_suspicious_simulation():
    reset_simulation_state()

    state = start_simulation("suspicious")

    assert state["scenario"] == "suspicious"
    assert len(state["events"]) == 6
    assert state["current_index"] == -1
    assert state["current_event"] is None
    assert state["processed_events"] == []
    assert state["state"] == "READY"


def test_start_benign_simulation():
    reset_simulation_state()

    state = start_simulation("benign")

    assert state["scenario"] == "benign"
    assert len(state["events"]) == 6
    assert state["state"] == "READY"


def test_invalid_simulation_scenario():
    reset_simulation_state()

    try:
        start_simulation("invalid")
        assert False
    except ValueError:
        assert True


def test_next_event_generates_changes():
    db = create_test_db()

    try:
        reset_simulation_state()
        start_simulation("suspicious")

        result = process_next_event(db)

        simulation = result["simulation"]
        changes = simulation["changes"]

        assert simulation["current_index"] == 0
        assert simulation["current_event"] is not None
        assert simulation["state"] == "PROCESSING"

        assert "event_processed" in changes
        assert "incident_changed" in changes
        assert "priority_changed" in changes
        assert "status_changed" in changes
        assert "new_evidence" in changes
        assert "new_correlations" in changes

    finally:
        db.close()


def test_previous_event_generates_changes():
    db = create_test_db()

    try:
        reset_simulation_state()
        start_simulation("suspicious")

        process_next_event(db)
        process_next_event(db)

        result = process_previous_event()

        simulation = result["simulation"]
        changes = simulation["changes"]

        assert simulation["current_index"] == 0
        assert simulation["current_event"] is not None
        assert simulation["current_event"].event_id == "EVT-S-001"
        assert simulation["state"] == "PROCESSING"

        assert "event_processed" in changes
        assert "incident_changed" in changes
        assert "priority_changed" in changes
        assert "status_changed" in changes
        assert "new_evidence" in changes
        assert "new_correlations" in changes

    finally:
        db.close() 