import type { NormalizedEvent } from './event';
import type { Priority } from './graph';

/**
 * Allowed incident status values.
 * Reference: CONTRACTS.md (Section 3 - Allowed status values)
 */
export type IncidentStatus =
  | 'INCIDENT_CANDIDATE'
  | 'HIGH_PRIORITY'
  | 'CONFIRMED'
  | 'DISMISSED'
  | 'RESOLVED';

/**
 * Incident data contract.
 * Reference: CONTRACTS.md (Section 3 - Incident) & API_CONTRACT.md (Section 5 - Incidents)
 */
export interface Incident {
  incident_id: string;
  title: string;
  status: IncidentStatus;
  priority: number;
  created_at: string;
  updated_at: string;
  event_ids: string[];
}

/**
 * Allowed analyst action types.
 * Reference: CONTRACTS.md (Section 6 - AnalystAction) & API_CONTRACT.md (Section 6 - Analyst Actions)
 */
export type AnalystActionType =
  | 'INVESTIGATE'
  | 'CONFIRM'
  | 'DISMISS'
  | 'ESCALATE'
  | 'RESOLVE';

/**
 * Allowed dismissal reasons.
 * Reference: CONTRACTS.md (Section 6 - Optional dismissal reasons)
 */
export type DismissalReason =
  | 'false_positive'
  | 'approved_activity'
  | 'known_admin'
  | 'maintenance'
  | 'other';

/**
 * Analyst action payload.
 * Reference: CONTRACTS.md (Section 6 - AnalystAction) & API_CONTRACT.md (Section 6 - Analyst Actions)
 */
export interface AnalystAction {
  action: AnalystActionType;
  reason?: DismissalReason | string | null;
}

/**
 * Audit log entry structure.
 * Reference: API_CONTRACT.md (Section 5 - GET /api/incidents/{incident_id}/audit)
 */
export interface AuditLogEntry {
  timestamp: string;
  action: string;
  description: string;
}

/**
 * Simulation scenario types.
 * Reference: API_CONTRACT.md (Section 7 - Simulation)
 */
export type SimulationScenario = 'suspicious' | 'benign';

/**
 * Current simulation state payload.
 * Reference: API_CONTRACT.md (Section 7 - GET /api/simulation/state)
 */
export interface SimulationState {
  scenario: SimulationScenario;
  current_event: NormalizedEvent | Record<string, unknown>;
  processed_events: NormalizedEvent[];
  incident: Incident | Record<string, unknown>;
  priority: Priority | Record<string, unknown>;
  state: IncidentStatus;
  changes: Record<string, unknown>;
}
