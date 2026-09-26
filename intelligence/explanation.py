from typing import Any, Dict

from .schemas import IntelligenceResult


class IntelligenceExplainer:
    """
    Converts structured intelligence into an LLM-ready explanation payload.

    The explanation layer does NOT:
    - calculate anomaly scores
    - calculate priority
    - create incidents
    - modify incident state
    - determine attack probability
    """

    def build_prompt(
        self,
        result: IntelligenceResult,
    ) -> str:
        payload = self.build_payload(result)

        return (
            "You are explaining a security intelligence result "
            "to a security analyst.\n\n"
            "Use ONLY the supplied structured intelligence.\n"
            "Do not invent facts.\n"
            "Do not calculate or change scores.\n"
            "Do not claim that activity is definitely malicious.\n"
            "Clearly distinguish observed evidence from interpretation.\n\n"
            "Return:\n"
            "1. Summary\n"
            "2. Why this activity was flagged\n"
            "3. Related evidence\n"
            "4. Investigation priority\n"
            "5. Suggested analyst focus\n\n"
            f"Structured intelligence:\n{payload}"
        )

    def build_payload(
        self,
        result: IntelligenceResult,
    ) -> Dict[str, Any]:
        return {
            "anomalies": [
                anomaly.model_dump()
                for anomaly in result.anomalies
            ],
            "entities": [
                entity.model_dump()
                for entity in result.entities
            ],
            "correlations": [
                correlation.model_dump()
                for correlation in result.correlations
            ],
            "incident": (
                result.incident.model_dump()
                if result.incident
                else None
            ),
            "evidence": [
                evidence.model_dump()
                for evidence in result.evidence
            ],
            "priority": (
                result.priority.model_dump()
                if result.priority
                else None
            ),
        }


def build_explanation_prompt(
    result: IntelligenceResult,
) -> str:
    explainer = IntelligenceExplainer()
    return explainer.build_prompt(result)