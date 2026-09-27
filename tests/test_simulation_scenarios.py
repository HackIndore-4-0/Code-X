from app.services.simulation_service import (
    get_simulation_state,
    reset_simulation_state,
)
from app.simulation.scenarios import get_scenario


def test_initial_simulation_state():
    reset_simulation_state()

    state = get_simulation_state()

    assert state["scenario"] is None
    assert state["current_index"] == -1
    assert state["current_event"] is None
    assert state["processed_events"] == []
    assert state["state"] == "IDLE"


def test_suspicious_scenario():
    reset_simulation_state()

    events = get_scenario("suspicious")

    assert len(events) == 6
    assert events[0].event_type == "login"
    assert events[1].event_type == "mfa_failure"
    assert events[2].event_type == "new_device"
    assert events[3].event_type == "resource_access"
    assert events[4].event_type == "privilege_change"
    assert events[5].event_type == "large_transfer"


def test_benign_scenario():
    reset_simulation_state()

    events = get_scenario("benign")

    assert len(events) == 6
    assert events[0].event_type == "login"
    assert events[-1].event_type == "approved_transfer"