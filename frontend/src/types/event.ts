/**
 * Allowed event types union.
 * Reference: CONTRACTS.md (Section 2 - Allowed event types)
 */
export type EventType =
  | 'login'
  | 'logout'
  | 'mfa_failure'
  | 'mfa_success'
  | 'new_device'
  | 'new_location'
  | 'resource_access'
  | 'privilege_change'
  | 'password_change'
  | 'api_access'
  | 'large_transfer'
  | 'file_download'
  | 'admin_action'
  | 'session_start'
  | 'session_end';

/**
 * Telemetry event data contract.
 * Reference: CONTRACTS.md (Section 2 - NormalizedEvent) & INTELLIGENCE_CONTRACT.md (Section 3 - Normalized Event)
 */
export interface NormalizedEvent {
  event_id: string;
  timestamp: string; // ISO 8601
  event_type: EventType;
  user_id?: string;
  device_id?: string;
  ip_address?: string;
  location?: string;
  session_id?: string;
  resource?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}
