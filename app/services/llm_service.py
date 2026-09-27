import os
from typing import Any

import httpx
from dotenv import load_dotenv


load_dotenv()


class LLMService:
    """
    Optional OpenRouter-based explanation service.

    This service only explains structured TraceX results.
    It does not detect incidents, calculate priority,
    generate evidence, or modify TraceX state.
    """

    OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

    def __init__(self) -> None:
        self.enabled = (
            os.getenv("TRACEX_LLM_ENABLED", "false").lower()
            == "true"
        )

        self.api_key = os.getenv("OPENROUTER_API_KEY")

        self.model = os.getenv(
            "TRACEX_LLM_MODEL",
            "openrouter/free",
        )

    def is_available(self) -> bool:
        """
        Return whether the OpenRouter provider is configured.
        """

        return (
            self.enabled
            and bool(self.api_key)
        )

    def generate_explanation(
        self,
        context: dict[str, Any],
    ) -> str:
        """
        Generate a human-readable explanation from
        structured TraceX facts.

        The LLM is strictly limited to explaining
        information already present in the TraceX context.
        """

        if not self.is_available():
            raise RuntimeError(
                "OpenRouter LLM is not configured"
            )

        prompt = self._build_prompt(context)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a strictly grounded explanation "
                        "layer for TraceX. "
                        "Your only job is to restate and explain "
                        "structured TraceX facts. "
                        "You are not a threat detector, incident "
                        "classifier, investigator, or decision maker. "
                        "Never add facts, causes, motives, actors, "
                        "attack claims, or security conclusions that "
                        "are not explicitly present in the supplied "
                        "TraceX context."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            "temperature": 0.1,
        }

        try:
            response = httpx.post(
                self.OPENROUTER_URL,
                headers=headers,
                json=payload,
                timeout=10.0,
            )

            response.raise_for_status()

        except httpx.HTTPStatusError as exc:
            raise RuntimeError(
                f"OpenRouter API request failed: "
                f"{exc.response.status_code} "
                f"{exc.response.text}"
            ) from exc

        except httpx.HTTPError as exc:
            raise RuntimeError(
                f"OpenRouter API request failed: {exc}"
            ) from exc

        response_data = response.json()

        choices = response_data.get("choices", [])

        if not choices:
            raise RuntimeError(
                "OpenRouter returned no choices"
            )

        message = choices[0].get("message", {})

        content = message.get("content")

        if not content:
            raise RuntimeError(
                "OpenRouter returned an empty response"
            )

        return content.strip()

    def _build_prompt(
        self,
        context: dict[str, Any],
    ) -> str:
        """
        Build a strictly grounded explanation prompt.

        The model may summarize and organize supplied TraceX facts,
        but may not infer new security conclusions.
        """

        return f"""
You are the explanation layer for TraceX,
an incident-intelligence system.

TraceX has already performed the detection, correlation,
evidence generation, incident decision, and priority calculation.

Your ONLY task is to explain those existing results clearly.

The supplied context is the complete source of truth.

STRICT GROUNDING RULES:

1. Use only facts explicitly present in the supplied TraceX context.

2. Do not invent events, evidence, users, devices, attackers,
   causes, motives, actions, or outcomes.

3. Do not infer malicious intent.

4. Do not say that a compromise, attack, breach, unauthorized access,
   credential theft, or attacker activity occurred unless the
   supplied context explicitly states that fact.

5. Do not infer causation.
   A sequence of events does not prove that one event caused another.

6. Do not reinterpret event types.
   For example:
   - "privilege_change" means a privilege-change event was recorded.
   - It does NOT automatically mean "privilege escalation".
   - "large_transfer" means a large-transfer event was recorded.
   - It does NOT automatically mean data exfiltration.

7. Do not reinterpret correlations.
   A correlation means TraceX found a relationship according to
   its correlation logic.
   Correlation strength is NOT proof of malicious activity,
   causation, or a single attack.

8. Do not reinterpret priority.
   TraceX priority represents investigation attention.
   A HIGH or CRITICAL priority does NOT mean that an attack,
   compromise, or breach has been established.

9. Do not reinterpret incident status.
   "RESOLVED" means the TraceX incident status is RESOLVED.
   It does NOT prove containment, remediation, recovery,
   or that a threat has been eliminated.

10. Do not treat missing evidence as evidence.
    If mitigating evidence is empty, say that no mitigating
    evidence was recorded by TraceX rather than claiming that
    there were no mitigating circumstances.

11. Do not add external cybersecurity knowledge to the incident.
    Explain the supplied data rather than completing missing facts
    from general security assumptions.

12. Preserve the distinction between:
    - observed events
    - anomalies
    - correlations
    - evidence
    - incident state
    - investigation priority

13. When describing a correlation, use factual wording such as:
    "TraceX correlated these events based on the supplied
    relationship fields and temporal context."

14. When describing an anomaly, use factual wording such as:
    "TraceX identified this event as anomalous because of
    the supplied anomaly indicators."

15. When describing priority, use factual wording such as:
    "TraceX assigned a priority of X based on the supplied
    priority factors."

16. Recommended actions must remain analyst-oriented and
    evidence-focused. They may suggest reviewing, validating,
    or examining information already present in the TraceX context.
    Do not invent remediation requirements or claim that a
    particular security control has been compromised.

17. If the supplied context does not contain enough information
    to make a stronger statement, explicitly remain at the
    narrower factual statement.

IMPORTANT TERMINOLOGY:

Never turn:

    anomaly → compromise

    correlation → attack

    privilege_change → privilege escalation

    large_transfer → exfiltration

    critical priority → critical attack

    resolved status → containment

    temporal sequence → causation

    missing mitigating evidence → proof of maliciousness

TRACE X STRUCTURED CONTEXT:

{context}

Produce a concise analyst-facing explanation using exactly
these sections:

SUMMARY:
Describe what TraceX identified using only the supplied facts.

WHY CONNECTED:
Explain how the supplied events are connected according to
the supplied TraceX correlations.

SUPPORTING EVIDENCE:
Summarize only the supplied supporting evidence.

MITIGATING EVIDENCE:
Summarize only the supplied mitigating evidence.
If none exists, explicitly say that no mitigating evidence
was recorded by TraceX.

WHY INVESTIGATE:
Explain the assigned TraceX investigation priority and
current incident status without interpreting them as proof
of malicious activity.

RECOMMENDED ACTIONS:
Give conservative analyst-oriented next steps that involve
reviewing or validating the supplied TraceX evidence and state.
Do not invent new facts or remediation requirements.

Before producing the answer, check every sentence:
"Can this sentence be directly supported by the supplied
TraceX context?"

If not, remove or rewrite the sentence.
""".strip()