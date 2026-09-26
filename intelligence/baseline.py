from collections import Counter
from dataclasses import dataclass
from typing import List, Optional

from .features import EventFeatures
from .schemas import HistoricalContext, NormalizedEvent


@dataclass
class BehavioralBaseline:
    """
    Represents the observed behavioral baseline for an event context.

    The baseline describes what has historically been observed.
    It does NOT determine whether the current event is malicious.
    """

    status: str

    history_count: int

    known_event_types: List[str]

    common_login_hours: List[int]

    known_devices: List[str]

    known_locations: List[str]

    known_resources: List[str]

    event_type_frequency: dict

    expected_frequency: float

    confidence: float


class BaselineBuilder:
    """
    Builds a behavioral baseline from Backend-provided historical context.
    """

    MIN_HISTORY_EVENTS = 5
    LOW_HISTORY_EVENTS = 2

    def build(
        self,
        event: NormalizedEvent,
        features: EventFeatures,
        context: HistoricalContext,
    ) -> BehavioralBaseline:
        """
        Build a baseline using historical events.

        No fabricated baseline is created when history is insufficient.
        """

        historical_events = self._collect_relevant_events(
            event=event,
            context=context,
        )

        history_count = len(historical_events)

        if history_count == 0:
            return self._insufficient_history(
                history_count=0,
            )

        event_types = Counter(
            historical_event.event_type
            for historical_event in historical_events
        )

        login_hours = [
            historical_event.timestamp.hour
            for historical_event in historical_events
            if historical_event.event_type == "login"
        ]

        known_devices = self._unique_values(
            historical_events,
            "device_id",
        )

        known_locations = self._unique_values(
            historical_events,
            "location",
        )

        known_resources = self._unique_values(
            historical_events,
            "resource",
        )

        known_event_types = list(event_types.keys())

        expected_frequency = self._calculate_expected_frequency(
            event=event,
            historical_events=historical_events,
        )

        confidence = self._calculate_confidence(history_count)

        if history_count < self.MIN_HISTORY_EVENTS:
            status = "LIMITED_HISTORY"
        else:
            status = "ESTABLISHED"

        return BehavioralBaseline(
            status=status,
            history_count=history_count,
            known_event_types=known_event_types,
            common_login_hours=self._common_hours(login_hours),
            known_devices=known_devices,
            known_locations=known_locations,
            known_resources=known_resources,
            event_type_frequency=dict(event_types),
            expected_frequency=expected_frequency,
            confidence=confidence,
        )

    def _collect_relevant_events(
        self,
        event: NormalizedEvent,
        context: HistoricalContext,
    ) -> List[NormalizedEvent]:
        """
        Collect relevant historical events.

        Prefer user history and device history supplied by Backend.
        Related events are also considered.

        Duplicate event IDs are removed.
        """

        candidates = (
            context.user_events
            + context.device_events
            + context.related_events
        )

        unique_events = {}
        for historical_event in candidates:
            if historical_event.event_id == event.event_id:
                continue

            unique_events[historical_event.event_id] = historical_event

        return list(unique_events.values())

    def _unique_values(
        self,
        events: List[NormalizedEvent],
        field_name: str,
    ) -> List[str]:
        """
        Return unique non-empty values for a NormalizedEvent field.
        """

        values = set()

        for event in events:
            value = getattr(event, field_name, None)

            if value:
                values.add(value)

        return sorted(values)

    def _common_hours(
        self,
        hours: List[int],
    ) -> List[int]:
        """
        Return hours that appear more than once.

        We avoid declaring a single observation as 'normal'.
        """

        if not hours:
            return []

        counts = Counter(hours)

        return sorted(
            hour
            for hour, count in counts.items()
            if count >= 2
        )

    def _calculate_expected_frequency(
        self,
        event: NormalizedEvent,
        historical_events: List[NormalizedEvent],
    ) -> float:
        """
        Calculate the historical frequency of the current event type.

        This is an observed frequency, not an attack probability.
        """

        if not historical_events:
            return 0.0

        matching_events = sum(
            1
            for historical_event in historical_events
            if historical_event.event_type == event.event_type
        )

        return matching_events / len(historical_events)

    def _calculate_confidence(
        self,
        history_count: int,
    ) -> float:
        """
        Estimate baseline confidence from history volume.

        This is confidence in the baseline quality,
        not confidence that an event is malicious.
        """

        if history_count <= 0:
            return 0.0

        if history_count < self.LOW_HISTORY_EVENTS:
            return 0.2

        if history_count < self.MIN_HISTORY_EVENTS:
            return 0.5

        if history_count < 10:
            return 0.7

        if history_count < 20:
            return 0.85

        return 1.0

    def _insufficient_history(
        self,
        history_count: int,
    ) -> BehavioralBaseline:
        """
        Explicit cold-start result.

        We do not invent normal behavior when there is no history.
        """

        return BehavioralBaseline(
            status="INSUFFICIENT_HISTORY",
            history_count=history_count,
            known_event_types=[],
            common_login_hours=[],
            known_devices=[],
            known_locations=[],
            known_resources=[],
            event_type_frequency={},
            expected_frequency=0.0,
            confidence=0.0,
        )


def build_baseline(
    event: NormalizedEvent,
    features: EventFeatures,
    context: HistoricalContext,
) -> BehavioralBaseline:
    """
    Convenience function for baseline generation.
    """

    builder = BaselineBuilder()

    return builder.build(
        event=event,
        features=features,
        context=context,
    )