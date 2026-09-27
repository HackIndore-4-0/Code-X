from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.simulation_service import (
    get_simulation_state,
    process_next_event,
    process_previous_event,
    reset_simulation_state,
    start_simulation,
)


router = APIRouter(
    prefix="/api/simulation",
    tags=["Simulation"],
)


class SimulationStartRequest(BaseModel):
    scenario: str


@router.post("/start")
def start_simulation_endpoint(
    request: SimulationStartRequest,
):
    try:
        state = start_simulation(request.scenario)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "data": None,
                "error": {
                    "code": "INVALID_SCENARIO",
                    "message": str(exc),
                },
            },
        )

    return {
        "success": True,
        "data": state,
        "error": None,
    }


@router.post("/next")
def next_simulation_event(
    db: Session = Depends(get_db),
):
    try:
        result = process_next_event(db)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "data": None,
                "error": {
                    "code": "SIMULATION_ERROR",
                    "message": str(exc),
                },
            },
        )

    return {
        "success": True,
        "data": result,
        "error": None,
    }


@router.post("/previous")
def previous_simulation_event():
    try:
        result = process_previous_event()
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "data": None,
                "error": {
                    "code": "SIMULATION_ERROR",
                    "message": str(exc),
                },
            },
        )

    return {
        "success": True,
        "data": result,
        "error": None,
    }


@router.post("/reset")
def reset_simulation_endpoint():
    state = reset_simulation_state()

    return {
        "success": True,
        "data": state,
        "error": None,
    }


@router.get("/state")
def simulation_state_endpoint():
    state = get_simulation_state()

    return {
        "success": True,
        "data": state,
        "error": None,
    }