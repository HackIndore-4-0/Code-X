from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class NormalizedEvent(BaseModel):
    """
    Canonical event structure entering the Intelligence pipeline.
    """

    event_id: str
    timestamp: datetime
    event_type: str

    user_id: Optional[str] = None
    device_id: Optional[str] = None
    ip_address: Optional[str] = None
    location: Optional[str] = None
    session_id: Optional[str] = None
    resource: Optional[str] = None
    action: Optional[str] = None

    metadata: Dict[str, Any] = Field(default_factory=dict)


class HistoricalContext(BaseModel):
    """
    Historical information supplied by Backend to Intelligence.
    """

    user_events: List[NormalizedEvent] = Field(
        default_factory=list
    )

    device_events: List[NormalizedEvent] = Field(
        default_factory=list
    )

    related_events: List[NormalizedEvent] = Field(
        default_factory=list
    )

    existing_incident: Optional[Dict[str, Any]] = None


class AnomalyResult(BaseModel):
    """
    Result of anomaly detection for an event.
    """

    event_id: str
    is_anomaly: bool
    score: float
    reasons: List[str] = Field(default_factory=list)


class EntityResult(BaseModel):
    """
    Important entity associated with an event.
    """

    entity_id: str
    entity_type: str
    value: str


class CorrelationResult(BaseModel):
    """
    Explainable relationship between related events.
    """

    correlation_id: str
    event_ids: List[str]
    reason: str
    strength: float


class IncidentResult(BaseModel):
    """
    Intelligence decision about incident creation/update.

    The intelligence layer produces this result.
    Backend remains the source of truth for actual incident state.
    """

    action: str
    status: Optional[str] = None
    reason: Optional[str] = None
    event_ids: List[str] = Field(default_factory=list)


class EvidenceResult(BaseModel):
    """
    Evidence produced from TraceX events and intelligence reasoning.
    """

    evidence_id: str
    event_id: Optional[str] = None
    type: str
    description: str
    impact: str


class PriorityResult(BaseModel):
    """
    Investigation priority.

    Priority is NOT attack probability.
    """

    score: float
    label: str
    factors: Dict[str, float] = Field(default_factory=dict)


class IntelligenceResult(BaseModel):
    """
    Complete output of the Intelligence pipeline.
    """

    anomalies: List[AnomalyResult] = Field(
        default_factory=list
    )

    entities: List[EntityResult] = Field(
        default_factory=list
    )

    correlations: List[CorrelationResult] = Field(
        default_factory=list
    )

    incident: Optional[IncidentResult] = None

    evidence: List[EvidenceResult] = Field(
        default_factory=list
    )

    priority: Optional[PriorityResult] = None