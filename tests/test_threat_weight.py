import pytest
from intelligence.threat_weight import (
    ThreatWeightCalculator,
    calculate_threat_weight,
    calculate_threat_weight_from_intelligence,
)


def test_threat_weight_range_and_deterministic():
    calculator = ThreatWeightCalculator()
    result = calculator.calculate(
        anomaly_score=0.8,
        correlation_strength=0.9,
        progression_count=3,
        criticality_score=1.0,
        evidence_count=4,
    )

    weight = result["threat_weight"]
    assert 0.0 <= weight <= 100.0
    # 20.0 (anomaly) + 22.5 (corr) + 20.0 (prog) + 15.0 (crit) + 12.0 (evd) = 89.5
    assert weight == 89.5

    # Re-run same inputs -> identical result (deterministic)
    result2 = calculator.calculate(
        anomaly_score=0.8,
        correlation_strength=0.9,
        progression_count=3,
        criticality_score=1.0,
        evidence_count=4,
    )
    assert result2["threat_weight"] == weight


def test_threat_weight_high_risk_combination():
    weight = calculate_threat_weight(
        anomaly_score=0.95,
        correlation_strength=0.9,
        progression_count=3,
        criticality_score=1.0,
        evidence_count=5,
    )
    # 23.75 + 22.5 + 20.0 + 15.0 + 15.0 = 96.25
    assert weight >= 80.0
    assert weight == 96.25


def test_threat_weight_benign_combination():
    weight = calculate_threat_weight(
        anomaly_score=0.0,
        correlation_strength=0.0,
        progression_count=0,
        criticality_score=0.25,
        evidence_count=0,
    )
    assert weight < 30.0


def test_threat_weight_from_intelligence():
    high_intel = {
        "anomalies": [{"is_anomaly": True, "score": 0.9}],
        "correlations": [{"strength": 0.85}, {"strength": 0.75}, {"strength": 0.70}],
        "evidence": [
            {"type": "SUSPICIOUS_LOGIN"},
            {"type": "PRIVILEGE_ESCALATION"},
            {"type": "UNUSUAL_DATA_TRANSFER"},
            {"type": "ANOMALOUS_ACCESS"},
        ],
    }
    high_weight = calculate_threat_weight_from_intelligence(high_intel)
    assert high_weight >= 80.0

    benign_intel = {
        "anomalies": [],
        "correlations": [],
        "evidence": [],
    }
    benign_weight = calculate_threat_weight_from_intelligence(benign_intel)
    assert benign_weight < 80.0
