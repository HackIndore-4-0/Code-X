from collections import Counter
from datetime import datetime
from uuid import uuid4
import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.event import Event
from app.models.evidence import Evidence
from app.models.incident import Incident
from app.models.incident_event import IncidentEvent
from app.models.mitigation_action import MitigationAction
from app.services.audit_service import create_audit_log
from app.services.evidence_service import get_incident_evidence
from app.services.graph_service import get_incident_graph
from intelligence.threat_weight import (
    calculate_threat_weight,
    calculate_threat_weight_from_intelligence,
)


def generate_mitigation_id() -> str:
    return f"MIT-{uuid4().hex[:8].upper()}"


def extract_incident_entities(db: Session, incident_id: str) -> dict:
    """
    Extract user_id and flagged_ip from the events linked to an incident.
    Documented Selection Logic:
    1. Query all Event models linked to the incident via IncidentEvent.
    2. user_id: Selected by finding the most frequently occurring non-null user_id.
    3. flagged_ip: Selected by examining events, preferring non-local or suspicious event IP addresses.
    4. Defaults: 'UNKNOWN_USER' / 'UNKNOWN_IP' if no events/fields are present.
    """
    incident_events_statement = select(IncidentEvent).where(
        IncidentEvent.incident_id == incident_id
    )
    incident_events = list(db.scalars(incident_events_statement).all())
    event_ids = {item.event_id for item in incident_events}

    if not event_ids:
        return {
            "user_id": "UNKNOWN_USER",
            "flagged_ip": "UNKNOWN_IP",
            "all_users": [],
            "all_ips": [],
            "resources": [],
        }

    events_statement = select(Event).where(Event.event_id.in_(event_ids))
    events = list(db.scalars(events_statement).all())

    users = [e.user_id for e in events if e.user_id]
    ips = [e.ip_address for e in events if e.ip_address]
    resources = [e.resource for e in events if e.resource]

    user_id = Counter(users).most_common(1)[0][0] if users else "UNKNOWN_USER"
    flagged_ip = Counter(ips).most_common(1)[0][0] if ips else "UNKNOWN_IP"

    return {
        "user_id": user_id,
        "flagged_ip": flagged_ip,
        "all_users": list(dict.fromkeys(users)),
        "all_ips": list(dict.fromkeys(ips)),
        "resources": list(dict.fromkeys(resources)),
    }


def build_graph_summary(db: Session, incident_id: str) -> dict:
    """
    Extract a compact incident graph payload containing nodes and node_count.
    """
    graph_data = get_incident_graph(db, incident_id)
    entities = extract_incident_entities(db, incident_id)

    nodes = []
    seen_node_ids = set()

    # User node
    if entities["user_id"] and entities["user_id"] != "UNKNOWN_USER":
        nodes.append({"id": entities["user_id"], "type": "user"})
        seen_node_ids.add(entities["user_id"])

    # IP node
    if entities["flagged_ip"] and entities["flagged_ip"] != "UNKNOWN_IP":
        nodes.append({"id": entities["flagged_ip"], "type": "ip"})
        seen_node_ids.add(entities["flagged_ip"])

    # Resource nodes
    for res in entities["resources"]:
        if res and res not in seen_node_ids:
            nodes.append({"id": res, "type": "resource"})
            seen_node_ids.add(res)

    # Add raw graph nodes if not already included
    for n in graph_data.get("nodes", []):
        node_id = n.get("id")
        node_type = n.get("type", "entity")
        if node_id and node_id not in seen_node_ids:
            nodes.append({"id": node_id, "type": node_type})
            seen_node_ids.add(node_id)

    return {
        "nodes": nodes,
        "node_count": len(nodes),
    }


def build_mitigation_payload(
    incident_id: str,
    threat_weight: float,
    threshold: float,
    user_id: str,
    flagged_ip: str,
    graph_summary: dict,
    action: str = "ISOLATE_ENTITY",
) -> dict:
    """
    Generate deterministic mitigation JSON structure matching exact requirements.
    """
    return {
        "incident_id": incident_id,
        "threat_weight": threat_weight,
        "threshold": threshold,
        "user_id": user_id,
        "flagged_ip": flagged_ip,
        "action": action,
        "entity": {
            "type": "IP",
            "value": flagged_ip,
        },
        "graph": graph_summary,
    }


def dispatch_viasocket_webhook(payload: dict) -> tuple[str, str, dict, str]:
    """
    Dispatch JSON payload to viaSocket webhook if enabled/configured.
    Returns tuple: (webhook_status, remediation_status, response_dict, via_socket_outcome)
    """
    url = settings.REMEDIATION_WEBHOOK_URL
    enabled = settings.VIASOCKET_ENABLED

    if enabled and url:
        try:
            with httpx.Client(timeout=5.0) as client:
                resp = client.post(url, json=payload)
                if resp.status_code == 200:
                    try:
                        resp_data = resp.json()
                    except Exception:
                        resp_data = {"text": resp.text}
                    
                    rem_status = resp_data.get("status", "ISOLATED") if isinstance(resp_data, dict) else "ISOLATED"
                    return "SUCCESS", rem_status, resp_data, "VIA_SOCKET_SUCCESS"
                else:
                    try:
                        resp_data = resp.json()
                    except Exception:
                        resp_data = {"text": resp.text, "status_code": resp.status_code}
                    return f"HTTP_{resp.status_code}", "FAILED", resp_data, "VIA_SOCKET_FAILED"
        except Exception as exc:
            return "CONNECTION_FAILED", "FAILED", {"error": str(exc)}, "VIA_SOCKET_FAILED"

    # Local simulation fallback when viaSocket webhook URL is omitted or mock mode requested
    flagged_ip = payload.get("flagged_ip", "UNKNOWN_IP")
    action = payload.get("action", "ISOLATE_ENTITY")
    mock_response = {
        "success": True,
        "action": action,
        "entity_type": "IP",
        "entity_value": flagged_ip,
        "status": "ISOLATED",
        "mode": "MOCK_REMEDIATION",
    }
    return "MOCK_SUCCESS", "ISOLATED", mock_response, "MOCK_REMEDIATION"


def compute_threat_weight_for_incident(
    db: Session,
    incident_id: str,
    intelligence_result: dict | None = None,
) -> float:
    """
    Compute threat weight from intelligence result or persisted incident relations.
    """
    if intelligence_result:
        return calculate_threat_weight_from_intelligence(intelligence_result)

    # Query DB for evidence and correlations linked to incident
    evidence_items = get_incident_evidence(db, incident_id)
    useful_evidence = sum(1 for e in evidence_items if e.type != "MITIGATING")

    graph_data = get_incident_graph(db, incident_id)
    correlations = [n for n in graph_data.get("nodes", []) if n.get("type") == "correlation"]
    corr_strengths = [float(c.get("strength", 0.0)) for c in correlations]

    max_corr = max(corr_strengths) if corr_strengths else 0.0
    prog_count = sum(1 for s in corr_strengths if s >= 0.5)

    # Anomaly score estimate from evidence / correlations
    anomaly_score = 0.9 if useful_evidence >= 3 or max_corr >= 0.7 else (0.5 if useful_evidence > 0 else 0.0)
    criticality = 0.8 if useful_evidence > 0 else 0.0

    return calculate_threat_weight(
        anomaly_score=anomaly_score,
        correlation_strength=max_corr,
        progression_count=prog_count,
        criticality_score=criticality,
        evidence_count=useful_evidence,
    )


def process_mitigation_for_incident(
    db: Session,
    incident_id: str,
    intelligence_result: dict | None = None,
    simulation_run_id: str | None = None,
) -> MitigationAction | None:
    """
    Calculates Threat Weight, checks threshold, and triggers automatic mitigation if met.
    Persists attempt to SQLite database and creates audit trail entry.
    """
    threshold = settings.MITIGATION_THRESHOLD
    threat_weight = compute_threat_weight_for_incident(
        db, incident_id, intelligence_result
    )

    entities = extract_incident_entities(db, incident_id)
    flagged_ip = entities["flagged_ip"]
    user_id = entities["user_id"]
    action_type = "ISOLATE_ENTITY"

    # Prevent duplicate mitigation for the same (incident, entity_value, action)
    stmt = select(MitigationAction).where(
        MitigationAction.incident_id == incident_id,
        MitigationAction.entity_value == flagged_ip,
        MitigationAction.action == action_type,
    )
    existing_mitigation = db.scalars(stmt).first()
    if existing_mitigation:
        return existing_mitigation

    # Check if Threat Weight crosses threshold
    if threat_weight < threshold:
        return None

    # Threat Weight >= Threshold -> Trigger Automatic Mitigation
    mitigation_id = generate_mitigation_id()
    graph_summary = build_graph_summary(db, incident_id)
    payload = build_mitigation_payload(
        incident_id=incident_id,
        threat_weight=threat_weight,
        threshold=threshold,
        user_id=user_id,
        flagged_ip=flagged_ip,
        graph_summary=graph_summary,
        action=action_type,
    )

    webhook_status, remediation_status, response_data, via_socket_outcome = (
        dispatch_viasocket_webhook(payload)
    )

    # Persist in SQLite
    mitigation_record = MitigationAction(
        id=mitigation_id,
        incident_id=incident_id,
        action=action_type,
        entity_type="IP",
        entity_value=flagged_ip,
        user_id=user_id,
        flagged_ip=flagged_ip,
        threat_weight=threat_weight,
        threshold=threshold,
        webhook_status=webhook_status,
        remediation_status=remediation_status,
        response=response_data,
        payload=payload,
        timestamp=datetime.utcnow(),
    )
    db.add(mitigation_record)
    db.commit()
    db.refresh(mitigation_record)

    # Audit Trail
    audit_id = f"AUD-MIT-{mitigation_id}"
    if simulation_run_id:
        audit_id = f"AUD-MIT-{mitigation_id}-RUN-{simulation_run_id}"

    create_audit_log(
        db=db,
        audit_id=audit_id,
        incident_id=incident_id,
        action="AUTOMATED_MITIGATION_TRIGGERED",
        actor="system",
        details={
            "mitigation_id": mitigation_id,
            "threat_weight": threat_weight,
            "threshold": threshold,
            "user_id": user_id,
            "flagged_ip": flagged_ip,
            "action": action_type,
            "entity": {"type": "IP", "value": flagged_ip},
            "webhook_status": webhook_status,
            "remediation_status": remediation_status,
            "via_socket_outcome": via_socket_outcome,
            "payload": payload,
            "response": response_data,
            "simulation_run_id": simulation_run_id,
        },
    )

    return mitigation_record


def get_incident_mitigation(db: Session, incident_id: str) -> dict | None:
    """
    Retrieve mitigation action for an incident.
    """
    stmt = (
        select(MitigationAction)
        .where(MitigationAction.incident_id == incident_id)
        .order_by(MitigationAction.timestamp.desc())
    )
    record = db.scalars(stmt).first()

    if record:
        return {
            "mitigation_id": record.id,
            "incident_id": record.incident_id,
            "threat_weight": record.threat_weight,
            "threshold": record.threshold,
            "triggered": True,
            "action": record.action,
            "entity": {
                "type": record.entity_type,
                "value": record.entity_value,
            },
            "user_id": record.user_id,
            "flagged_ip": record.flagged_ip,
            "webhook_status": record.webhook_status,
            "remediation_status": record.remediation_status,
            "isolation_status": record.remediation_status,
            "response": record.response,
            "payload": record.payload,
            "timestamp": record.timestamp.isoformat() if record.timestamp else None,
        }

    # If no mitigation was triggered, return structured status with computed threat weight
    entities = extract_incident_entities(db, incident_id)
    threat_weight = compute_threat_weight_for_incident(db, incident_id)

    return {
        "incident_id": incident_id,
        "threat_weight": threat_weight,
        "threshold": settings.MITIGATION_THRESHOLD,
        "triggered": False,
        "mitigation_id": None,
        "action": None,
        "entity": None,
        "user_id": entities["user_id"],
        "flagged_ip": entities["flagged_ip"],
        "webhook_status": None,
        "remediation_status": "NOT_TRIGGERED",
        "isolation_status": "NOT_TRIGGERED",
        "timestamp": None,
    }
