from typing import Any

from pydantic import BaseModel, Field


class LLMExplanationRequest(BaseModel):
    incident: dict[str, Any]
    timeline: list[dict[str, Any]] = Field(default_factory=list)
    supporting_evidence: list[dict[str, Any]] = Field(default_factory=list)
    mitigating_evidence: list[dict[str, Any]] = Field(default_factory=list)
    correlations: list[dict[str, Any]] = Field(default_factory=list)


class LLMExplanationResponse(BaseModel):
    summary: str
    why_connected: list[str] = Field(default_factory=list)
    supporting_evidence: list[str] = Field(default_factory=list)
    mitigating_evidence: list[str] = Field(default_factory=list)
    why_investigate: str
    recommended_actions: list[str] = Field(default_factory=list)