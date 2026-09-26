from typing import List, Tuple

from .schemas import (
    CorrelationResult,
    HistoricalContext,
    NormalizedEvent,
)


class EventCorrelator:
    """
    Deterministic event correlation.

    Correlations are created only when events share meaningful
    context such as user, device, session, IP, or temporal proximity.
    """

    TIME_WINDOW_SECONDS = 30 * 60

    def correlate(
        self,
        event: NormalizedEvent,
        context: HistoricalContext,
    ) -> List[CorrelationResult]:

        historical_events = self._collect_events(
            event=event,
            context=context,
        )

        correlations: List[CorrelationResult] = []

        for historical_event in historical_events:

            matched_fields = self._matching_fields(
                event,
                historical_event,
            )

            time_close = self._within_time_window(
                event,
                historical_event,
            )

            if not matched_fields:
                continue

            if not time_close:
                continue

            strength = self._calculate_strength(
                matched_fields=matched_fields,
                event=event,
                historical_event=historical_event,
            )

            reason = self._build_reason(
                event=event,
                historical_event=historical_event,
                matched_fields=matched_fields,
            )

            correlation_id = (
                f"COR-{event.event_id}-{historical_event.event_id}"
            )

            correlations.append(
                CorrelationResult(
                    correlation_id=correlation_id,
                    event_ids=[
                        historical_event.event_id,
                        event.event_id,
                    ],
                    reason=reason,
                    strength=round(strength, 3),
                )
            )

        return correlations

    def _collect_events(
        self,
        event: NormalizedEvent,
        context: HistoricalContext,
    ) -> List[NormalizedEvent]:

        candidates = (
            context.user_events
            + context.device_events
            + context.related_events
        )

        unique_events = {}

        for candidate in candidates:

            if candidate.event_id == event.event_id:
                continue

            unique_events[candidate.event_id] = candidate

        return list(unique_events.values())

    def _matching_fields(
        self,
        event_a: NormalizedEvent,
        event_b: NormalizedEvent,
    ) -> List[str]:

        matches: List[str] = []

        if (
            event_a.user_id
            and event_b.user_id
            and event_a.user_id == event_b.user_id
        ):
            matches.append("user")

        if (
            event_a.device_id
            and event_b.device_id
            and event_a.device_id == event_b.device_id
        ):
            matches.append("device")

        if (
            event_a.ip_address
            and event_b.ip_address
            and event_a.ip_address == event_b.ip_address
        ):
            matches.append("IP")

        if (
            event_a.session_id
            and event_b.session_id
            and event_a.session_id == event_b.session_id
        ):
            matches.append("session")

        if (
            event_a.resource
            and event_b.resource
            and event_a.resource == event_b.resource
        ):
            matches.append("resource")

        return matches

    def _within_time_window(
        self,
        event_a: NormalizedEvent,
        event_b: NormalizedEvent,
    ) -> bool:

        difference = abs(
            (event_a.timestamp - event_b.timestamp).total_seconds()
        )

        return difference <= self.TIME_WINDOW_SECONDS

    def _calculate_strength(
        self,
        matched_fields: List[str],
        event: NormalizedEvent,
        historical_event: NormalizedEvent,
    ) -> float:

        strength = 0.0

        # Strong identity relationship
        if "user" in matched_fields:
            strength += 0.30

        if "session" in matched_fields:
            strength += 0.30

        if "device" in matched_fields:
            strength += 0.15

        if "IP" in matched_fields:
            strength += 0.10

        if "resource" in matched_fields:
            strength += 0.05

        # Temporal relationship
        strength += 0.10

        # Different event types provide more useful progression context.
        if event.event_type != historical_event.event_type:
            strength += 0.05

        return min(strength, 1.0)

    def _build_reason(
        self,
        event: NormalizedEvent,
        historical_event: NormalizedEvent,
        matched_fields: List[str],
    ) -> str:

        fields = ", ".join(matched_fields)

        return (
            f"Events {historical_event.event_id} and {event.event_id} "
            f"are related by {fields} and occurred within the "
            f"correlation time window."
        )


def correlate_events(
    event: NormalizedEvent,
    context: HistoricalContext,
) -> List[CorrelationResult]:

    correlator = EventCorrelator()

    return correlator.correlate(
        event=event,
        context=context,
    )