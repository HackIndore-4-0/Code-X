from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.event import Event
from app.services.simulation_service import (
    get_simulation_state,
    process_next_event,
    reset_simulation_state,
    start_simulation,
)


def create_test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )

    Base.metadata.create_all(engine)

    SessionLocal = sessionmaker(bind=engine)

    return SessionLocal()


def test_suspicious_simulation_end_to_end():
    reset_simulation_state()

    db = create_test_db()

    state = start_simulation("suspicious")

    assert state["scenario"] == "suspicious"
    assert state["current_index"] == -1

    expected_events = [
        "EVT-S-001",
        "EVT-S-002",
        "EVT-S-003",
        "EVT-S-004",
        "EVT-S-005",
        "EVT-S-006",
    ]

    for index, event_id in enumerate(expected_events):
        result = process_next_event(db)

        simulation = result["simulation"]

        assert simulation["current_index"] == index

        assert (
            simulation["current_event"].event_id
            == event_id
        )

        assert event_id in simulation["processed_events"]

        stored_event = db.get(
            Event,
            event_id,
        )

        assert stored_event is not None

    final_state = get_simulation_state()

    assert final_state["scenario"] == "suspicious"

    assert final_state["current_index"] == 5

    assert (
        final_state["current_event"].event_id
        == "EVT-S-006"
    )

    assert final_state["processed_events"] == expected_events

    stored_events = db.query(Event).all()

    assert len(stored_events) == 6

    db.close()


def test_simulation_cannot_process_beyond_last_event():
    reset_simulation_state()

    db = create_test_db()

    start_simulation("suspicious")

    for _ in range(6):
        process_next_event(db)

    try:
        process_next_event(db)
        assert False
    except ValueError as exc:
        assert str(exc) == "Simulation has no more events"

    db.close()