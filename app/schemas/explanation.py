from typing import Any

from pydantic import BaseModel, Field


class ExplanationResponse(BaseModel):
    summary: str
    why_connected: list[dict[str, Any]] = Field(default_factory=list)
    supporting_evidence: list[str] = Field(default_factory=list)
    mitigating_evidence: list[str] = Field(default_factory=list)
    why_investigate: str
    recommended_actions: list[str] = Field(default_factory=list)