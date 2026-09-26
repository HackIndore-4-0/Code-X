from .anomaly import detect_anomaly
from .baseline import build_baseline
from .correlation import correlate_events
from .criticality import evaluate_resource_criticality
from .entities import resolve_entities
from .evidence import generate_evidence
from .features import extract_features
from .incident import decide_incident
from .priority import calculate_priority
from .schemas import (
    HistoricalContext,
    IntelligenceResult,
    NormalizedEvent,
)


class IntelligencePipeline:
    """
    Main TraceX Intelligence entry point.

    Pipeline:
        1. Feature extraction
        2. Behavioral baseline
        3. Anomaly detection
        4. Entity resolution
        5. Event correlation
        6. Incident decision
        7. Evidence generation
        8. Resource criticality
        9. Priority calculation

    Intelligence is deterministic and produces structured data.

    This pipeline does NOT:
    - write to the database
    - mutate backend incident state
    - calculate attack probability
    """

    def process(
        self,
        normalized_event: NormalizedEvent,
        historical_context: HistoricalContext,
    ) -> IntelligenceResult:

        # Phase 2: Feature extraction
        features = extract_features(
            normalized_event
        )

        # Phase 3: Behavioral baseline
        baseline = build_baseline(
            event=normalized_event,
            features=features,
            context=historical_context,
        )

        # Phase 4: Anomaly detection
        anomaly = detect_anomaly(
            event=normalized_event,
            features=features,
            baseline=baseline,
        )

        # Phase 5: Entity resolution
        entities = resolve_entities(
            normalized_event
        )

        # Phase 6: Event correlation
        correlations = correlate_events(
            event=normalized_event,
            context=historical_context,
        )

        # Phase 7: Incident decision
        incident = decide_incident(
            event=normalized_event,
            anomaly=anomaly,
            correlations=correlations,
            context=historical_context,
        )

        # Phase 8: Evidence generation
        evidence = generate_evidence(
            event=normalized_event,
            anomaly=anomaly,
            correlations=correlations,
            incident=incident,
        )

        # Phase 9: Resource criticality
        criticality = evaluate_resource_criticality(
            normalized_event
        )

        # Phase 10: Investigation priority
        priority = calculate_priority(
            anomaly=anomaly,
            correlations=correlations,
            incident=incident,
            evidence=evidence,
            criticality=criticality,
        )

        return IntelligenceResult(
            anomalies=[anomaly],
            entities=entities,
            correlations=correlations,
            incident=incident,
            evidence=evidence,
            priority=priority,
        )


def process_event(
    normalized_event: NormalizedEvent,
    historical_context: HistoricalContext | None = None,
) -> IntelligenceResult:
    """
    Convenience entry point for backend integration.

    Historical context is optional. When omitted, the event
    is processed without historical behavioral context.
    """

    pipeline = IntelligencePipeline()

    return pipeline.process(
        normalized_event=normalized_event,
        historical_context=historical_context
        or HistoricalContext(),
    )