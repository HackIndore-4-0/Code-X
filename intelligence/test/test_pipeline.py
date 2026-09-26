from datetime import datetime, timedelta, timezone

from intelligence.pipeline import process_event
from intelligence.schemas import HistoricalContext, NormalizedEvent


def make_event(
    event_id: str,
    event_type: str = "login",
    timestamp: datetime | None = None,
    **kwargs,
) -> NormalizedEvent:
    return NormalizedEvent(
        event_id=event_id,
        timestamp=timestamp or datetime.now(timezone.utc),
        event_type=event_type,
        **kwargs,
    )


def make_strong_correlation_context(
    timestamp: datetime,
) -> HistoricalContext:
    """
    Creates a historical event that strongly correlates with
    the current event through user/session/temporal similarity.
    """

    historical_event = NormalizedEvent(
        event_id="EVT-HIST-001",
        timestamp=timestamp - timedelta(minutes=5),
        event_type="login",
        user_id="USR-101",
        device_id="DEV-882",
        ip_address="10.0.0.15",
        session_id="SES-001",
        resource="application",
    )

    return HistoricalContext(
        related_events=[historical_event]
    )


def test_benign_event_does_not_create_incident():
    event = make_event(
        event_id="EVT-BENIGN-001",
        event_type="login",
        user_id="USR-001",
        device_id="DEV-001",
        ip_address="10.0.0.10",
        location="office",
        session_id="SES-001",
        resource="application",
    )

    result = process_event(event)

    assert result.incident is not None
    assert result.incident.action == "NO_INCIDENT"

    assert result.priority is not None
    assert result.priority.score == 0
    assert result.priority.label == "LOW"


def test_suspicious_privilege_change_with_correlation_creates_incident():
    now = datetime.now(timezone.utc)

    event = make_event(
        event_id="EVT-SUSPICIOUS-001",
        event_type="privilege_change",
        timestamp=now,
        user_id="USR-101",
        device_id="DEV-882",
        ip_address="10.0.0.15",
        location="unknown",
        session_id="SES-001",
        resource="finance-db",
        metadata={
            "mfa_failure": True,
            "new_device": True,
            "new_location": True,
        },
    )

    context = make_strong_correlation_context(now)

    result = process_event(event, context)

    # Anomaly detection
    assert result.anomalies
    assert result.anomalies[0].is_anomaly is True
    assert result.anomalies[0].score >= 0.40

    # Correlation should be strong enough to support incident creation.
    assert result.correlations
    assert any(
        correlation.strength >= 0.50
        for correlation in result.correlations
    )

    # Incident creation
    assert result.incident is not None
    assert result.incident.action == "CREATE"
    assert result.incident.status == "INCIDENT_CANDIDATE"

    # Evidence should be generated.
    assert result.evidence

    # Priority should now be calculated because an incident exists.
    assert result.priority is not None
    assert result.priority.score > 0


def test_critical_resource_is_detected():
    now = datetime.now(timezone.utc)

    event = make_event(
        event_id="EVT-CRITICAL-001",
        event_type="privilege_change",
        timestamp=now,
        user_id="USR-101",
        session_id="SES-001",
        resource="production-db",
        metadata={
            "mfa_failure": True,
        },
    )

    context = make_strong_correlation_context(now)

    result = process_event(event, context)

    assert result.incident is not None
    assert result.incident.action == "CREATE"

    assert result.priority is not None
    assert result.priority.factors["asset_criticality"] > 0


def test_existing_incident_is_updated_or_left_unchanged():
    event = make_event(
        event_id="EVT-UPDATE-001",
        event_type="login",
        user_id="USR-200",
        device_id="DEV-200",
        session_id="SES-200",
        resource="admin-console",
        metadata={
            "mfa_failure": True,
        },
    )

    context = HistoricalContext(
        existing_incident={
            "incident_id": "INC-200",
            "status": "INCIDENT_CANDIDATE",
            "event_ids": ["EVT-OLD-001"],
        }
    )

    result = process_event(event, context)

    assert result.incident is not None
    assert result.incident.action in {"UPDATE", "NO_CHANGE"}


def test_pipeline_returns_expected_structure():
    event = make_event(
        event_id="EVT-STRUCTURE-001",
        event_type="login",
        user_id="USR-300",
        device_id="DEV-300",
        ip_address="10.0.0.30",
        session_id="SES-300",
        resource="application",
    )

    result = process_event(event)

    assert result is not None

    assert isinstance(result.anomalies, list)
    assert isinstance(result.entities, list)
    assert isinstance(result.correlations, list)
    assert isinstance(result.evidence, list)

    assert result.incident is not None
    assert result.priority is not None