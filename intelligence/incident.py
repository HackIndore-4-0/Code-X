from typing import List

from .schemas import (
    AnomalyResult,
    CorrelationResult,
    HistoricalContext,
    IncidentResult,
    NormalizedEvent,
)


class IncidentDecisionEngine:
    """
    Determines whether suspicious activity should become
    an incident candidate.

    This module does NOT:
    - calculate investigation priority
    - determine attack probability
    - write to the database
    - modify backend incident state

    It only produces a structured intelligence decision.
    """

    ANOMALY_THRESHOLD = 0.40
    STRONG_ANOMALY_THRESHOLD = 0.70
    CORRELATION_THRESHOLD = 0.50

    def decide(
        self,
        event: NormalizedEvent,
        anomaly: AnomalyResult,
        correlations: List[CorrelationResult],
        context: HistoricalContext,
    ) -> IncidentResult:

        # Existing incidents are handled first.
        if context.existing_incident:
            return self._existing_incident_decision(
                event=event,
                anomaly=anomaly,
                correlations=correlations,
            )

        # No anomaly means no incident candidate.
        if not anomaly.is_anomaly:
            return IncidentResult(
                action="NO_INCIDENT",
                status=None,
                reason=(
                    "No significant behavioral anomaly detected."
                ),
                event_ids=[],
            )

        strong_correlations = [
            correlation
            for correlation in correlations
            if correlation.strength >= self.CORRELATION_THRESHOLD
        ]

        # A strong anomaly is independently sufficient to
        # create an incident candidate.
        if anomaly.score >= self.STRONG_ANOMALY_THRESHOLD:
            return IncidentResult(
                action="CREATE",
                status="INCIDENT_CANDIDATE",
                reason=(
                    "Strong behavioral anomaly detected."
                ),
                event_ids=self._collect_event_ids(
                    event=event,
                    correlations=strong_correlations,
                ),
            )

        # A moderate anomaly requires supporting correlation.
        if (
            anomaly.score >= self.ANOMALY_THRESHOLD
            and strong_correlations
        ):
            return IncidentResult(
                action="CREATE",
                status="INCIDENT_CANDIDATE",
                reason=(
                    "Behavioral anomaly is supported by "
                    "correlated activity."
                ),
                event_ids=self._collect_event_ids(
                    event=event,
                    correlations=strong_correlations,
                ),
            )

        # Anomaly exists, but evidence is not sufficient
        # for an incident candidate.
        return IncidentResult(
            action="NO_INCIDENT",
            status=None,
            reason=(
                "Anomaly was detected but did not meet "
                "incident decision criteria."
            ),
            event_ids=[],
        )

    def _existing_incident_decision(
        self,
        event: NormalizedEvent,
        anomaly: AnomalyResult,
        correlations: List[CorrelationResult],
    ) -> IncidentResult:

        strong_correlation = any(
            correlation.strength >= self.CORRELATION_THRESHOLD
            for correlation in correlations
        )

        if anomaly.is_anomaly or strong_correlation:
            return IncidentResult(
                action="UPDATE",
                status="INCIDENT_CANDIDATE",
                reason=(
                    "Suspicious activity is related to "
                    "an existing incident."
                ),
                event_ids=self._collect_event_ids(
                    event=event,
                    correlations=correlations,
                ),
            )

        return IncidentResult(
            action="NO_CHANGE",
            status=None,
            reason=(
                "Current activity does not provide "
                "sufficient evidence to update the incident."
            ),
            event_ids=[],
        )

    def _collect_event_ids(
        self,
        event: NormalizedEvent,
        correlations: List[CorrelationResult],
    ) -> List[str]:

        event_ids = {event.event_id}

        for correlation in correlations:
            event_ids.update(
                correlation.event_ids
            )

        return sorted(event_ids)


def decide_incident(
    event: NormalizedEvent,
    anomaly: AnomalyResult,
    correlations: List[CorrelationResult],
    context: HistoricalContext,
) -> IncidentResult:

    engine = IncidentDecisionEngine()

    return engine.decide(
        event=event,
        anomaly=anomaly,
        correlations=correlations,
        context=context,
    )
