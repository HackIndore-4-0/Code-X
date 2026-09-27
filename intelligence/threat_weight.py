"""
Threat Weight calculation module for TraceX.

Threat Weight is a deterministic normalized score (0–100) indicating
whether an incident meets the threshold for automated mitigation.

It is SEPARATE from priority_score (which indicates analyst attention priority).
"""

from typing import Any, Dict, List, Union


class ThreatWeightCalculator:
    """
    Calculates deterministic Threat Weight (0 to 100) for automated mitigation decisions.

    Formula:
    Threat Weight =
          (Anomaly Score * 0.25)
        + (Correlation Strength * 0.25)
        + (Progression Score * 0.20)
        + (Resource Criticality * 0.15)
        + (Evidence Strength * 0.15)

    Clamped to 0.0 <= threat_weight <= 100.0.
    """

    MAX_SCORE = 100.0

    ANOMALY_WEIGHT = 0.25
    CORRELATION_WEIGHT = 0.25
    PROGRESSION_WEIGHT = 0.20
    CRITICALITY_WEIGHT = 0.15
    EVIDENCE_WEIGHT = 0.15

    def calculate(
        self,
        anomaly_score: float,
        correlation_strength: float,
        progression_count: int,
        criticality_score: float,
        evidence_count: int,
    ) -> Dict[str, Any]:
        """
        Calculate threat weight given individual intelligence signals.
        anomaly_score, correlation_strength, criticality_score expected in 0.0 - 1.0 (or 0-100).
        """
        # Normalize inputs to 0-100 scale if passed as 0-1
        norm_anomaly = anomaly_score * 100.0 if anomaly_score <= 1.0 else anomaly_score
        norm_correlation = correlation_strength * 100.0 if correlation_strength <= 1.0 else correlation_strength
        norm_criticality = criticality_score * 100.0 if criticality_score <= 1.0 else criticality_score

        norm_anomaly = self._clamp(norm_anomaly)
        norm_correlation = self._clamp(norm_correlation)
        norm_criticality = self._clamp(norm_criticality)

        # Progression score calculation based on correlated event chain length
        if progression_count >= 3:
            norm_progression = 100.0
        elif progression_count == 2:
            norm_progression = 75.0
        elif progression_count == 1:
            norm_progression = 50.0
        else:
            norm_progression = 0.0

        # Evidence strength: 5 items = 100%
        norm_evidence = self._clamp((evidence_count / 5.0) * 100.0)

        factors = {
            "behavioral_anomaly": round(norm_anomaly * self.ANOMALY_WEIGHT, 2),
            "correlation_strength": round(norm_correlation * self.CORRELATION_WEIGHT, 2),
            "behavioral_progression": round(norm_progression * self.PROGRESSION_WEIGHT, 2),
            "resource_criticality": round(norm_criticality * self.CRITICALITY_WEIGHT, 2),
            "evidence_strength": round(norm_evidence * self.EVIDENCE_WEIGHT, 2),
        }

        total_score = min(sum(factors.values()), self.MAX_SCORE)
        threat_weight = round(total_score, 2)

        return {
            "threat_weight": threat_weight,
            "factors": factors,
        }

    def _clamp(self, value: float) -> float:
        return max(0.0, min(value, 100.0))


def calculate_threat_weight(
    anomaly_score: float = 0.0,
    correlation_strength: float = 0.0,
    progression_count: int = 0,
    criticality_score: float = 0.0,
    evidence_count: int = 0,
) -> float:
    """
    Convenience function for calculating Threat Weight.
    """
    calculator = ThreatWeightCalculator()
    result = calculator.calculate(
        anomaly_score=anomaly_score,
        correlation_strength=correlation_strength,
        progression_count=progression_count,
        criticality_score=criticality_score,
        evidence_count=evidence_count,
    )
    return result["threat_weight"]


def calculate_threat_weight_from_intelligence(intelligence_result: Any) -> float:
    """
    Extract signals from IntelligenceResult dict/object and calculate Threat Weight.
    """
    if isinstance(intelligence_result, dict):
        anomalies = intelligence_result.get("anomalies") or []
        correlations = intelligence_result.get("correlations") or []
        evidence = intelligence_result.get("evidence") or []
    else:
        anomalies = getattr(intelligence_result, "anomalies", []) or []
        correlations = getattr(intelligence_result, "correlations", []) or []
        evidence = getattr(intelligence_result, "evidence", []) or []

    # Anomaly score
    anomaly_scores = []
    for a in anomalies:
        if isinstance(a, dict):
            if a.get("is_anomaly"):
                anomaly_scores.append(float(a.get("score", 0.0)))
        else:
            if getattr(a, "is_anomaly", False):
                anomaly_scores.append(float(getattr(a, "score", 0.0)))
    max_anomaly = max(anomaly_scores) if anomaly_scores else 0.0

    # Correlation strength
    corr_strengths = []
    for c in correlations:
        if isinstance(c, dict):
            corr_strengths.append(float(c.get("strength", 0.0)))
        else:
            corr_strengths.append(float(getattr(c, "strength", 0.0)))
    max_corr = max(corr_strengths) if corr_strengths else 0.0

    # Progression count: count of correlations with strength >= 0.5
    prog_count = sum(1 for s in corr_strengths if s >= 0.5)

    # Useful evidence count
    useful_evidence = 0
    for e in evidence:
        e_type = e.get("type") if isinstance(e, dict) else getattr(e, "type", None)
        if e_type != "MITIGATING":
            useful_evidence += 1

    # Resource criticality calculation (default 0.75 if critical evidence/resource present)
    criticality = 0.0
    if max_anomaly > 0 or max_corr > 0 or useful_evidence > 0:
        criticality = 0.8  # Default baseline for anomalous/correlated activity

    return calculate_threat_weight(
        anomaly_score=max_anomaly,
        correlation_strength=max_corr,
        progression_count=prog_count,
        criticality_score=criticality,
        evidence_count=useful_evidence,
    )
