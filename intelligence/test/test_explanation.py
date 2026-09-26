from datetime import datetime, timezone

from intelligence.explanation import build_explanation_prompt
from intelligence.pipeline import process_event
from intelligence.schemas import NormalizedEvent


def test_explanation_prompt_contains_structured_intelligence():
    event = NormalizedEvent(
        event_id="EVT-LLM-001",
        timestamp=datetime.now(timezone.utc),
        event_type="privilege_change",
        user_id="USR-101",
        device_id="DEV-882",
        resource="finance-db",
        action="grant_privilege",
    )

    result = process_event(event)

    prompt = build_explanation_prompt(result)

    assert "Structured intelligence:" in prompt
    assert "anomalies" in prompt
    assert "incident" in prompt
    assert "priority" in prompt
    assert "Do not invent facts." in prompt