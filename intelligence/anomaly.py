from dataclasses import dataclass
from typing import List

from .baseline import BehavioralBaseline
from .features import EventFeatures
from .schemas import AnomalyResult, NormalizedEvent


@dataclass
class AnomalySignal:
    name: str
    weight: float
    reason: str
    triggered: bool
    baseline_dependent: bool = False


class AnomalyDetector:
    """
    Deterministic anomaly detector for TraceX.

    Produces an anomaly score between 0 and 1.
    The score represents behavioral anomaly strength,
    not attack probability.
    """

    MAX_SCORE = 1.0

    def detect(
        self,
        event: NormalizedEvent,
        features: EventFeatures,
        baseline: BehavioralBaseline,
    ) -> AnomalyResult:

        signals = self._build_signals(
            event=event,
            features=features,
            baseline=baseline,
        )

        score = self._calculate_score(
            signals=signals,
            baseline=baseline,
        )

        reasons = [
            signal.reason
            for signal in signals
            if signal.triggered
        ]

        is_anomaly = score >= 0.40

        return AnomalyResult(
            event_id=event.event_id,
            is_anomaly=is_anomaly,
            score=round(score, 3),
            reasons=reasons,
        )

    def _build_signals(
        self,
        event: NormalizedEvent,
        features: EventFeatures,
        baseline: BehavioralBaseline,
    ) -> List[AnomalySignal]:

        signals = []

        # New device
        signals.append(
            AnomalySignal(
                name="new_device",
                weight=0.20,
                reason="Event uses a device not observed in historical context.",
                triggered=(
                    features.has_device
                    and event.device_id not in baseline.known_devices
                    and baseline.history_count > 0
                ),
                baseline_dependent=True,
            )
        )

        # New location
        signals.append(
            AnomalySignal(
                name="new_location",
                weight=0.15,
                reason="Event originates from a location not observed in historical context.",
                triggered=(
                    features.has_location
                    and event.location not in baseline.known_locations
                    and baseline.history_count > 0
                ),
                baseline_dependent=True,
            )
        )

        # Unusual login hour
        unusual_login_hour = (
            event.event_type == "login"
            and baseline.history_count > 0
            and bool(baseline.common_login_hours)
            and event.timestamp.hour not in baseline.common_login_hours
        )

        signals.append(
            AnomalySignal(
                name="unusual_login_hour",
                weight=0.15,
                reason="Login occurred outside the user's commonly observed login hours.",
                triggered=unusual_login_hour,
                baseline_dependent=True,
            )
        )

        # MFA failure
        signals.append(
            AnomalySignal(
                name="mfa_failure",
                weight=0.15,
                reason="MFA failure activity was observed.",
                triggered=features.mfa_failure,
            )
        )

        # New location event
        signals.append(
            AnomalySignal(
                name="new_location_event",
                weight=0.10,
                reason="A new-location security event was observed.",
                triggered=features.new_location,
            )
        )

        # New device event
        signals.append(
            AnomalySignal(
                name="new_device_event",
                weight=0.10,
                reason="A new-device security event was observed.",
                triggered=features.new_device,
            )
        )

        # Sensitive resource
        signals.append(
            AnomalySignal(
                name="sensitive_resource",
                weight=0.10,
                reason="Event accessed a potentially sensitive resource.",
                triggered=features.is_sensitive_resource,
            )
        )

        # Privilege change
        signals.append(
            AnomalySignal(
                name="privilege_change",
                weight=0.20,
                reason="A privilege-change event was observed.",
                triggered=features.privilege_change,
            )
        )

        # Large transfer
        signals.append(
            AnomalySignal(
                name="large_transfer",
                weight=0.20,
                reason="Event contains a large data-transfer amount.",
                triggered=self._is_large_transfer(features),
            )
        )

        return signals

    def _is_large_transfer(
        self,
        features: EventFeatures,
    ) -> bool:
        # 100 MB threshold for the initial deterministic detector.
        LARGE_TRANSFER_BYTES = 100 * 1024 * 1024

        return (
            features.transfer_size_bytes >= LARGE_TRANSFER_BYTES
        )

    def _calculate_score(
        self,
        signals: List[AnomalySignal],
        baseline: BehavioralBaseline,
    ) -> float:

        score = 0.0

        for signal in signals:
            if not signal.triggered:
                continue

            contribution = signal.weight

            # Baseline-dependent signals should have less influence
            # when historical context is weak.
            if signal.baseline_dependent:
                contribution *= baseline.confidence

            score += contribution

        return min(score, self.MAX_SCORE)


def detect_anomaly(
    event: NormalizedEvent,
    features: EventFeatures,
    baseline: BehavioralBaseline,
) -> AnomalyResult:

    detector = AnomalyDetector()

    return detector.detect(
        event=event,
        features=features,
        baseline=baseline,
    )