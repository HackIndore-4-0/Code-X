from typing import Dict, List

from .criticality import ResourceCriticality
from .schemas import (
    AnomalyResult,
    CorrelationResult,
    EvidenceResult,
    IncidentResult,
    PriorityResult,
)


class PriorityCalculator:
    """
    Calculates investigation priority.

    Priority is NOT attack probability.

    The calculation is deterministic and explainable.
    """

    MAX_SCORE = 100.0

    BEHAVIORAL_ANOMALY_WEIGHT = 0.30
    CORRELATION_WEIGHT = 0.20
    ASSET_CRITICALITY_WEIGHT = 0.20
    PROGRESSION_WEIGHT = 0.15
    EVIDENCE_WEIGHT = 0.15

    def calculate(
        self,
        anomaly: AnomalyResult,
        correlations: List[CorrelationResult],
        incident: IncidentResult,
        evidence: List[EvidenceResult],
        criticality: ResourceCriticality,
    ) -> PriorityResult:

        # No active incident candidate means there is no
        # investigation priority to calculate.
        if incident.action in {
            "NO_INCIDENT",
            "NO_CHANGE",
        }:
            return PriorityResult(
                score=0.0,
                label="LOW",
                factors={
                    "behavioral_anomaly": 0.0,
                    "correlation_strength": 0.0,
                    "asset_criticality": 0.0,
                    "incident_progression": 0.0,
                    "evidence_strength": 0.0,
                },
            )

        behavioral_anomaly = (
            self._behavioral_anomaly_score(anomaly)
        )

        correlation_strength = (
            self._correlation_score(correlations)
        )

        asset_criticality = (
            self._clamp(
                criticality.score * 100
            )
        )

        incident_progression = (
            self._progression_score(correlations)
        )

        evidence_strength = (
            self._evidence_score(evidence)
        )

        factors: Dict[str, float] = {
            "behavioral_anomaly": round(
                behavioral_anomaly
                * self.BEHAVIORAL_ANOMALY_WEIGHT,
                2,
            ),
            "correlation_strength": round(
                correlation_strength
                * self.CORRELATION_WEIGHT,
                2,
            ),
            "asset_criticality": round(
                asset_criticality
                * self.ASSET_CRITICALITY_WEIGHT,
                2,
            ),
            "incident_progression": round(
                incident_progression
                * self.PROGRESSION_WEIGHT,
                2,
            ),
            "evidence_strength": round(
                evidence_strength
                * self.EVIDENCE_WEIGHT,
                2,
            ),
        }

        score = min(
            sum(factors.values()),
            self.MAX_SCORE,
        )

        return PriorityResult(
            score=round(score, 2),
            label=self._label(score),
            factors=factors,
        )

    def _behavioral_anomaly_score(
        self,
        anomaly: AnomalyResult,
    ) -> float:
        return self._clamp(
            anomaly.score * 100
        )

    def _correlation_score(
        self,
        correlations: List[CorrelationResult],
    ) -> float:

        if not correlations:
            return 0.0

        strongest = max(
            correlation.strength
            for correlation in correlations
        )

        return self._clamp(
            strongest * 100
        )

    def _progression_score(
        self,
        correlations: List[CorrelationResult],
    ) -> float:

        if not correlations:
            return 0.0

        strong_correlations = [
            correlation
            for correlation in correlations
            if correlation.strength >= 0.50
        ]

        if not strong_correlations:
            return 0.0

        count = len(strong_correlations)

        if count == 1:
            return 50.0

        if count == 2:
            return 75.0

        return 100.0

    def _evidence_score(
        self,
        evidence: List[EvidenceResult],
    ) -> float:

        if not evidence:
            return 0.0

        useful_evidence = sum(
            1
            for item in evidence
            if item.type != "MITIGATING"
        )

        if useful_evidence == 0:
            return 0.0

        return self._clamp(
            useful_evidence / 5 * 100
        )

    def _label(
        self,
        score: float,
    ) -> str:

        if score >= 80:
            return "CRITICAL"

        if score >= 60:
            return "HIGH"

        if score >= 30:
            return "MEDIUM"

        return "LOW"

    def _clamp(
        self,
        value: float,
    ) -> float:
        return max(
            0.0,
            min(value, 100.0),
        )


def calculate_priority(
    anomaly: AnomalyResult,
    correlations: List[CorrelationResult],
    incident: IncidentResult,
    evidence: List[EvidenceResult],
    criticality: ResourceCriticality,
) -> PriorityResult:

    calculator = PriorityCalculator()

    return calculator.calculate(
        anomaly=anomaly,
        correlations=correlations,
        incident=incident,
        evidence=evidence,
        criticality=criticality,
    )