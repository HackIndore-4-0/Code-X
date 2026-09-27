from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.explanation import ExplanationResponse
from app.services.explanation_service import (
    build_explanation_context,
    generate_deterministic_explanation,
)
from app.services.incident_service import get_incident
from app.services.llm_service import LLMService


router = APIRouter(
    prefix="/api/incidents",
    tags=["AI Explanation"],
)


@router.post(
    "/{incident_id}/explain",
    response_model=dict,
)
def explain_incident(
    incident_id: str,
    db: Session = Depends(get_db),
):
    incident = get_incident(
        db=db,
        incident_id=incident_id,
    )

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "data": None,
                "error": {
                    "code": "INCIDENT_NOT_FOUND",
                    "message": f"Incident '{incident_id}' not found",
                },
            },
        )

    try:
        context = build_explanation_context(
            db=db,
            incident=incident,
        )

        llm_service = LLMService()

        if llm_service.is_available():
            try:
                llm_explanation = llm_service.generate_explanation(
                    context=context,
                )

                explanation = {
                    "summary": llm_explanation,
                    "why_connected": context["correlations"],
                    "supporting_evidence": [
                        item["description"]
                        for item in context["supporting_evidence"]
                    ],
                    "mitigating_evidence": [
                        item["description"]
                        for item in context["mitigating_evidence"]
                    ],
                    "why_investigate": (
                        f"TraceX investigation priority is "
                        f"{context['incident']['priority']} "
                        f"({context['incident']['priority_label']}). "
                        f"Current status is "
                        f"{context['incident']['status']}."
                    ),
                    "recommended_actions": [
                        "Review the generated explanation "
                        "against the underlying TraceX evidence.",
                    ],
                }

            except Exception:
                explanation = generate_deterministic_explanation(
                    context=context,
                )

        else:
            explanation = generate_deterministic_explanation(
                context=context,
            )

        validated_explanation = ExplanationResponse(
            **explanation
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "data": None,
                "error": {
                    "code": "EXPLANATION_ERROR",
                    "message": str(exc),
                },
            },
        )

    return {
        "success": True,
        "data": validated_explanation.model_dump(),
        "error": None,
    }