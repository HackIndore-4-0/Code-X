# TraceX — API Contract

## 1. Purpose

This document defines the HTTP API exposed by the TraceX backend.

The frontend must use these APIs instead of implementing intelligence or incident logic locally.

Base path:

```text
/api
```

---

# 2. Common Response Format

Successful response:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

Error response:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid event data"
  }
}
```

---

# 3. Health

### GET `/api/health`

Response:

```json
{
  "success": true,
  "data": {
    "status": "healthy"
  },
  "error": null
}
```

---

# 4. Events

## POST `/api/events`

Submit one telemetry event.

Request:

```json
{
  "event_id": "EVT-001",
  "timestamp": "2026-09-24T09:12:00Z",
  "event_type": "login",
  "user_id": "USR-101",
  "device_id": "DEV-882",
  "ip_address": "10.0.0.15",
  "location": "Indore",
  "session_id": "SES-001",
  "resource": null,
  "action": "login",
  "metadata": {}
}
```

The backend:

```text
validate
→ normalize
→ deduplicate
→ store
→ run intelligence
→ update incident
→ store evidence
→ calculate/update priority
→ record audit
```

---

## POST `/api/events/bulk`

Submit multiple events.

Request:

```json
{
  "events": [
    {},
    {}
  ]
}
```

---

## GET `/api/events`

Returns stored events.

Optional query parameters may include:

```text
limit
offset
event_type
user_id
device_id
```

---

## POST `/api/events/upload`

Accept CSV or JSON telemetry.

Processing:

```text
Upload
→ Parse
→ Validate
→ Normalize
→ Deduplicate
→ Store
→ Process
```

---

# 5. Incidents

## GET `/api/incidents`

Returns incidents.

Example:

```json
{
  "success": true,
  "data": [
    {
      "incident_id": "INC-001",
      "title": "Suspicious account activity",
      "status": "HIGH_PRIORITY",
      "priority": 86,
      "created_at": "2026-09-24T09:12:00Z",
      "updated_at": "2026-09-24T09:35:00Z",
      "event_ids": [
        "EVT-001",
        "EVT-002"
      ]
    }
  ],
  "error": null
}
```

---

## GET `/api/incidents/{incident_id}`

Returns complete incident information.

Expected data:

```text
incident
priority
evidence
event references
status
```

---

## GET `/api/incidents/{incident_id}/timeline`

Returns chronological incident events.

Example:

```json
{
  "success": true,
  "data": [
    {
      "event_id": "EVT-001",
      "timestamp": "2026-09-24T09:12:00Z",
      "event_type": "login"
    },
    {
      "event_id": "EVT-005",
      "timestamp": "2026-09-24T09:31:00Z",
      "event_type": "privilege_change"
    }
  ],
  "error": null
}
```

---

## GET `/api/incidents/{incident_id}/evidence`

Returns supporting and mitigating evidence.

---

## GET `/api/incidents/{incident_id}/graph`

Returns graph data.

Response:

```json
{
  "nodes": [],
  "edges": []
}
```

---

## GET `/api/incidents/{incident_id}/mitigation`

Returns mitigation action details for an incident.

Response:

```json
{
  "success": true,
  "data": {
    "mitigation_id": "MIT-A1B2C3D4",
    "incident_id": "INC-001",
    "threat_weight": 91.4,
    "threshold": 80.0,
    "triggered": true,
    "action": "ISOLATE_ENTITY",
    "entity": {
      "type": "IP",
      "value": "198.51.100.42"
    },
    "user_id": "USR-101",
    "flagged_ip": "198.51.100.42",
    "webhook_status": "SUCCESS",
    "remediation_status": "ISOLATED",
    "isolation_status": "ISOLATED",
    "timestamp": "2026-09-25T09:35:00Z"
  },
  "error": null
}
```

  "success": true,
  "data": {
    "nodes": [],
    "edges": []
  },
  "error": null
}
```

Nodes and edges should be directly usable by the frontend graph component.

---

## GET `/api/incidents/{incident_id}/audit`

Returns the incident audit trail.

Example:

```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2026-09-24T09:31:02Z",
      "action": "INCIDENT_UPDATED",
      "description": "Privilege change increased investigation priority"
    }
  ],
  "error": null
}
```

---

# 6. Analyst Actions

## POST `/api/incidents/{incident_id}/action`

Request:

```json
{
  "action": "INVESTIGATE",
  "reason": null
}
```

Allowed actions:

```text
INVESTIGATE
CONFIRM
DISMISS
ESCALATE
RESOLVE
```

For dismissal:

```json
{
  "action": "DISMISS",
  "reason": "approved_activity"
}
```

The backend must record the action in the audit trail.

---

# 7. Simulation

## POST `/api/simulation/start`

Starts a scenario.

Request:

```json
{
  "scenario": "suspicious"
}
```

Allowed initial scenarios:

```text
suspicious
benign
```

---

## POST `/api/simulation/next`

Processes the next event in the active scenario.

The response should include the current simulation state and any changes caused by the event.

---

## POST `/api/simulation/previous`

Moves the simulation backwards where supported.

---

## POST `/api/simulation/reset`

Resets the active simulation.

---

## GET `/api/simulation/state`

Returns:

```json
{
  "scenario": "suspicious",
  "current_event": {},
  "processed_events": [],
  "incident": {},
  "priority": {},
  "state": "INCIDENT_CANDIDATE",
  "changes": {}
}
```

---

# 8. AI Explanation

## POST `/api/incidents/{incident_id}/explain`

Returns an explanation generated from the structured incident data.

Expected response:

```json
{
  "success": true,
  "data": {
    "summary": "...",
    "why_connected": [],
    "supporting_evidence": [],
    "mitigating_evidence": [],
    "why_investigate": "...",
    "recommended_actions": []
  },
  "error": null
}
```

The explanation must use only TraceX evidence.

If the LLM is unavailable, a deterministic fallback explanation should be returned.

---

# 9. API Principles

1. Backend is the source of truth.
2. Frontend does not calculate intelligence.
3. Frontend does not calculate priority.
4. Frontend does not create incidents independently.
5. Every event enters the same processing pipeline.
6. Simulation uses the same backend processing logic as normal events.
7. Analyst actions are persisted and audited.
8. API responses should remain structured and predictable.
9. Errors should use the common error format.
10. New fields should be added without unnecessarily breaking existing consumers.