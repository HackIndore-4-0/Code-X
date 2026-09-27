from typing import Any


def calculate_changes(
    previous_result: dict[str, Any] | None,
    current_result: dict[str, Any] | None,
) -> dict[str, Any]:
    """
    Compare two structured TraceX processing results.

    This service only reports state differences.
    It does not perform intelligence or make security decisions.
    """

    previous_result = previous_result or {}
    current_result = current_result or {}

    changes: dict[str, Any] = {
        "event_processed": False,
        "incident_changed": False,
        "priority_changed": False,
        "status_changed": False,
        "new_evidence": [],
        "new_correlations": [],
    }

    # Event processing
    if current_result:
        changes["event_processed"] = True

    # Incident change
    previous_incident = previous_result.get("incident")
    current_incident = current_result.get("incident")

    if previous_incident != current_incident:
        changes["incident_changed"] = True

    # Priority change
    previous_priority = previous_result.get("priority")
    current_priority = current_result.get("priority")

    if previous_priority != current_priority:
        changes["priority_changed"] = True

        if previous_priority is not None:
            changes["previous_priority"] = previous_priority

        if current_priority is not None:
            changes["current_priority"] = current_priority

    # Status change
    previous_status = None
    current_status = None

    if isinstance(previous_incident, dict):
        previous_status = previous_incident.get("status")

    if isinstance(current_incident, dict):
        current_status = current_incident.get("status")

    if previous_status != current_status:
        if previous_status is not None or current_status is not None:
            changes["status_changed"] = True
            changes["previous_status"] = previous_status
            changes["current_status"] = current_status

    # New evidence
    previous_evidence = previous_result.get("evidence") or []
    current_evidence = current_result.get("evidence") or []

    previous_evidence_ids = {
        item.get("evidence_id")
        for item in previous_evidence
        if isinstance(item, dict) and item.get("evidence_id")
    }

    changes["new_evidence"] = [
        item
        for item in current_evidence
        if isinstance(item, dict)
        and item.get("evidence_id") not in previous_evidence_ids
    ]

    # New correlations
    previous_correlations = previous_result.get("correlations") or []
    current_correlations = current_result.get("correlations") or []

    previous_correlation_ids = {
        item.get("correlation_id")
        for item in previous_correlations
        if isinstance(item, dict) and item.get("correlation_id")
    }

    changes["new_correlations"] = [
        item
        for item in current_correlations
        if isinstance(item, dict)
        and item.get("correlation_id") not in previous_correlation_ids
    ]

    return changes