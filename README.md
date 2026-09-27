# TraceX — Automated Threat Mitigation Pipeline

TraceX is an incident-intelligence backend for autonomous AI cybersecurity systems.

## Automated Threat Mitigation Pipeline Architecture

```text
Telemetry
    ↓
TraceX Ingestion & Intelligence Pipeline
    ↓
Anomaly Detection & Behavioral Baseline
    ↓
Correlation & Entity Resolution
    ↓
Incident Construction & Evidence Generation
    ↓
Priority Calculation
    ↓
Threat Weight Calculation (Deterministic, 0–100)
    ↓
Configurable Mitigation Threshold Check (Default: 80)
    ↓
Threat Weight >= Threshold
    ↓
Automatic Mitigation Triggered (action: ISOLATE_ENTITY)
    ↓
Structured JSON Payload Construction
    ↓
viaSocket Webhook Dispatch & Workflow Orchestration
    ↓
Mock Security Remediation (IP / Entity ISOLATED)
    ↓
Persist Mitigation Record in SQLite (mitigation_actions table)
    ↓
Record Audit Entry (AUTOMATED_MITIGATION_TRIGGERED)
    ↓
Expose Mitigation Status via API (GET /api/incidents/{incident_id}/mitigation)
```

## Threat Weight Formula

Threat Weight is a normalized deterministic score ($0 - 100$) separate from analyst `priority_score`.

$$\text{Threat Weight} = (\text{Anomaly Score} \times 0.25) + (\text{Correlation Strength} \times 0.25) + (\text{Behavioral Progression} \times 0.20) + (\text{Resource Criticality} \times 0.15) + (\text{Evidence Strength} \times 0.15)$$

- **Anomaly Score**: Normalized anomaly score from feature detection ($0-100$).
- **Correlation Strength**: Maximum correlation strength among related events ($0-100$).
- **Behavioral Progression**: Stage count ($0$ for $0$, $50$ for $1$, $75$ for $2$, $100$ for $\ge 3$).
- **Resource Criticality**: Asset criticality score ($0-100$).
- **Evidence Strength**: Non-mitigating evidence count normalized ($\min(100, \text{count}/5 \times 100)$).

## Configuration

| Variable | Description | Default |
| --- | --- | --- |
| `TRACEX_MITIGATION_THRESHOLD` | Threshold above which automatic mitigation triggers | `80` |
| `TRACEX_VIASOCKET_ENABLED` | Toggle real viaSocket webhook dispatch | `true` |
| `TRACEX_REMEDIATION_WEBHOOK_URL` | viaSocket endpoint URL | `""` (runs safe mock fallback if unset) |

## Database Schema (`mitigation_actions`)

- `id`: String (Primary Key, e.g., `MIT-12345678`)
- `incident_id`: String (Foreign Key to `incidents.incident_id`)
- `action`: String (`ISOLATE_ENTITY`)
- `entity_type`: String (`IP`)
- `entity_value`: String (Flagged IP address)
- `user_id`: String (Flagged user ID)
- `flagged_ip`: String (Flagged IP address)
- `threat_weight`: Float
- `threshold`: Float
- `webhook_status`: String (`SUCCESS`, `FAILED`, `MOCK_SUCCESS`)
- `remediation_status`: String (`ISOLATED`, `FAILED`)
- `payload`: JSON
- `response`: JSON
- `timestamp`: DateTime

## Mitigation API

`GET /api/incidents/{incident_id}/mitigation`

### Example Response (Triggered)

```json
{
  "success": true,
  "data": {
    "mitigation_id": "MIT-A1B2C3D4",
    "incident_id": "INC-93341158",
    "threat_weight": 92.5,
    "threshold": 80.0,
    "triggered": true,
    "action": "ISOLATE_ENTITY",
    "entity": {
      "type": "IP",
      "value": "10.0.0.15"
    },
    "user_id": "USR-101",
    "flagged_ip": "10.0.0.15",
    "webhook_status": "MOCK_SUCCESS",
    "remediation_status": "ISOLATED",
    "isolation_status": "ISOLATED",
    "timestamp": "2026-09-25T09:35:00Z"
  },
  "error": null
}
```

## Running Tests

```bash
pytest
```