from typing import Any

from sqlalchemy.orm import Session

from app.simulation.scenarios import get_scenario
from app.services.processing_service import process_incoming_event
from app.services.change_service import calculate_changes


_simulation_state: dict[str, Any] = {
    "scenario": None,
    "run_id": None,
    "events": [],
    "current_index": -1,
    "current_event": None,
    "processed_events": [],
    "processed_results": {},
    "incident": None,
    "priority": None,
    "state": "IDLE",
    "changes": {},
}


def get_simulation_state() -> dict[str, Any]:
    return _simulation_state.copy()


def reset_simulation_state() -> dict[str, Any]:
    _simulation_state.update(
        {
            "scenario": None,
            "run_id": None,
            "events": [],
            "current_index": -1,
            "current_event": None,
            "processed_events": [],
            "processed_results": {},
            "incident": None,
            "priority": None,
            "state": "IDLE",
            "changes": {},
        }
    )

    return get_simulation_state()


def start_simulation(scenario: str) -> dict[str, Any]:
    events = get_scenario(scenario)

    import uuid

    run_id = uuid.uuid4().hex[:8]

    _simulation_state.update(
        {
            "scenario": scenario,
            "run_id": run_id,
            "events": events,
            "current_index": -1,
            "current_event": None,
            "processed_events": [],
            "processed_results": {},
            "incident": None,
            "priority": None,
            "state": "READY",
            "changes": {},
        }
    )

    return get_simulation_state()


def process_next_event(db: Session) -> dict[str, Any]:
    if _simulation_state["scenario"] is None:
        raise ValueError("Simulation has not been started")

    next_index = _simulation_state["current_index"] + 1
    events = _simulation_state["events"]

    if next_index >= len(events):
        raise ValueError("Simulation has no more events")

    event = events[next_index]

    previous_result = {}

    if _simulation_state["current_index"] >= 0:
        previous_event = events[
            _simulation_state["current_index"]
        ]

        previous_result = _simulation_state[
            "processed_results"
        ].get(
            previous_event.event_id,
            {},
        )

    if event.event_id in _simulation_state["processed_results"]:
        result = _simulation_state["processed_results"][
            event.event_id
        ]

    else:
        result = process_incoming_event(
            db,
            event,
            allow_existing=True,
            simulation_run_id=_simulation_state["run_id"],
        )

        _simulation_state["processed_results"][
            event.event_id
        ] = result

        if event.event_id not in _simulation_state[
            "processed_events"
        ]:
            _simulation_state["processed_events"].append(
                event.event_id
            )

    changes = calculate_changes(
        previous_result,
        result,
    )

    _simulation_state["current_index"] = next_index
    _simulation_state["current_event"] = event
    _simulation_state["changes"] = changes
    _simulation_state["state"] = "PROCESSING"

    return {
        "simulation": get_simulation_state(),
        "processing_result": result,
    }


def process_previous_event() -> dict[str, Any]:
    if _simulation_state["scenario"] is None:
        raise ValueError("Simulation has not been started")

    current_index = _simulation_state["current_index"]

    if current_index <= -1:
        raise ValueError(
            "Simulation is already at the beginning"
        )

    previous_index = current_index - 1

    _simulation_state["current_index"] = previous_index

    if previous_index == -1:
        _simulation_state["current_event"] = None
        _simulation_state["changes"] = {}
        _simulation_state["state"] = "READY"

    else:
        events = _simulation_state["events"]

        current_event = events[previous_index]

        current_result = _simulation_state[
            "processed_results"
        ].get(
            current_event.event_id,
            {},
        )

        if previous_index > 0:
            previous_event = events[previous_index - 1]

            previous_result = _simulation_state[
                "processed_results"
            ].get(
                previous_event.event_id,
                {},
            )
        else:
            previous_result = {}

        changes = calculate_changes(
            previous_result,
            current_result,
        )

        _simulation_state["current_event"] = current_event
        _simulation_state["changes"] = changes
        _simulation_state["state"] = "PROCESSING"

    return {
        "simulation": get_simulation_state(),
    }