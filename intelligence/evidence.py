from typing import List

from .schemas import (
    AnomalyResult,
    CorrelationResult,
    EvidenceResult,
    IncidentResult,
    NormalizedEvent,
)


class EvidenceGenerator:
    """
    Generates structured evidence explaining why an
    incident was created or updated.

    This module does NOT:
    - calculate incident priority
    - determine attack probability
    - write to the database
    - modify incident state
    """

    def generate(
        self,
        event: NormalizedEvent,
        anomaly: AnomalyResult,
        correlations: List[CorrelationResult],
        incident: IncidentResult,
    ) -> List[EvidenceResult]:
        """
        Generate evidence for an incident decision.
        """

        # Evidence is only generated when the intelligence
        # layer decides to create or update an incident.
        if incident.action not in {"CREATE", "UPDATE"}:
            return []

        evidence: List[EvidenceResult] = []

        # Phase 8: anomaly evidence
        evidence.extend(
            self._generate_anomaly_evidence(
                event=event,
                anomaly=anomaly,
            )
        )

        # Phase 8: correlation evidence
        evidence.extend(
            self._generate_correlation_evidence(
                correlations=correlations,
            )
        )

        # Phase 8: progression evidence
        evidence.extend(
            self._generate_progression_evidence(
                event=event,
                correlations=correlations,
            )
        )

        return evidence

    def _generate_anomaly_evidence(
        self,
        event: NormalizedEvent,
        anomaly: AnomalyResult,
    ) -> List[EvidenceResult]:
        """
        Convert anomaly reasons into structured evidence.
        """

        if not anomaly.is_anomaly:
            return []

        evidence: List[EvidenceResult] = []

        for index, reason in enumerate(
            anomaly.reasons,
            start=1,
        ):
            evidence.append(
                EvidenceResult(
                    evidence_id=(
                        f"EVD-{event.event_id}-ANOM-{index}"
                    ),
                    event_id=event.event_id,
                    type="ANOMALY",
                    description=reason,
                    impact="increases_priority",
                )
            )

        return evidence

    def _generate_correlation_evidence(
        self,
        correlations: List[CorrelationResult],
    ) -> List[EvidenceResult]:
        """
        Convert event correlations into structured evidence.
        """

        evidence: List[EvidenceResult] = []

        for correlation in correlations:
            if not correlation.event_ids:
                continue

            evidence.append(
                EvidenceResult(
                    evidence_id=(
                        f"EVD-{correlation.correlation_id}"
                    ),
                    event_id=correlation.event_ids[-1],
                    type="CORRELATION",
                    description=correlation.reason,
                    impact="increases_confidence",
                )
            )

        return evidence

    def _generate_progression_evidence(
        self,
        event: NormalizedEvent,
        correlations: List[CorrelationResult],
    ) -> List[EvidenceResult]:
        """
        Generate progression evidence when multiple
        related events form a sequence.
        """

        progression_events = [
            correlation
            for correlation in correlations
            if len(correlation.event_ids) >= 2
        ]

        if not progression_events:
            return []

        evidence: List[EvidenceResult] = []

        for index, correlation in enumerate(
            progression_events,
            start=1,
        ):
            evidence.append(
                EvidenceResult(
                    evidence_id=(
                        f"EVD-{event.event_id}-PROG-{index}"
                    ),
                    event_id=event.event_id,
                    type="PROGRESSION",
                    description=(
                        "Related security activity occurred "
                        "across multiple correlated events."
                    ),
                    impact="increases_priority",
                )
            )

        return evidence


def generate_evidence(
    event: NormalizedEvent,
    anomaly: AnomalyResult,
    correlations: List[CorrelationResult],
    incident: IncidentResult,
) -> List[EvidenceResult]:
    """
    Convenience function for evidence generation.
    """

    generator = EvidenceGenerator()

    return generator.generate(
        event=event,
        anomaly=anomaly,
        correlations=correlations,
        incident=incident,
    )