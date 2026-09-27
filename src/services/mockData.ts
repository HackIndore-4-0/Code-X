import type { NormalizedEvent } from '../types/event';
import type { Incident, AuditLogEntry, SimulationState } from '../types/incident';
import type { Evidence } from '../types/evidence';
import type { Priority, GraphData } from '../types/graph';

// Suspicious Scenario Mock Events (6 events: login → MFA failures → new device → finance access → privilege change → large transfer)
export const mockSuspiciousEvents: NormalizedEvent[] = [
  {
    event_id: 'EVT-001',
    timestamp: '2026-09-24T09:12:00Z',
    event_type: 'login',
    user_id: 'USR-101',
    device_id: 'DEV-882',
    ip_address: '10.0.0.15',
    location: 'Indore',
    session_id: 'SES-001',
    action: 'login',
    metadata: { authentication_method: 'password' },
  },
  {
    event_id: 'EVT-002',
    timestamp: '2026-09-24T09:14:22Z',
    event_type: 'mfa_failure',
    user_id: 'USR-101',
    device_id: 'DEV-882',
    ip_address: '10.0.0.15',
    location: 'Indore',
    session_id: 'SES-001',
    action: 'mfa_verify',
    metadata: { failure_reason: 'invalid_totp' },
  },
  {
    event_id: 'EVT-003',
    timestamp: '2026-09-24T09:18:05Z',
    event_type: 'new_device',
    user_id: 'USR-101',
    device_id: 'DEV-990',
    ip_address: '198.51.100.42',
    location: 'Bucharest',
    session_id: 'SES-002',
    action: 'register_device',
    metadata: { user_agent: 'Unrecognized Linux Workstation' },
  },
  {
    event_id: 'EVT-004',
    timestamp: '2026-09-24T09:25:30Z',
    event_type: 'resource_access',
    user_id: 'USR-101',
    device_id: 'DEV-990',
    ip_address: '198.51.100.42',
    location: 'Bucharest',
    session_id: 'SES-002',
    resource: 'finance-db',
    action: 'query_table',
    metadata: { target_table: 'payroll_records' },
  },
  {
    event_id: 'EVT-005',
    timestamp: '2026-09-24T09:31:00Z',
    event_type: 'privilege_change',
    user_id: 'USR-101',
    device_id: 'DEV-990',
    ip_address: '198.51.100.42',
    location: 'Bucharest',
    session_id: 'SES-002',
    resource: 'finance-db',
    action: 'grant_role',
    metadata: { granted_role: 'db_admin' },
  },
  {
    event_id: 'EVT-006',
    timestamp: '2026-09-24T09:35:45Z',
    event_type: 'large_transfer',
    user_id: 'USR-101',
    device_id: 'DEV-990',
    ip_address: '198.51.100.42',
    location: 'Bucharest',
    session_id: 'SES-002',
    resource: 's3://finance-vault-backup',
    action: 'exfiltrate_data',
    metadata: { transfer_size_mb: 4850 },
  },
];

// Benign Scenario Mock Events
export const mockBenignEvents: NormalizedEvent[] = [
  {
    event_id: 'EVT-101',
    timestamp: '2026-09-24T10:00:00Z',
    event_type: 'login',
    user_id: 'USR-202',
    device_id: 'DEV-105',
    ip_address: '10.0.0.50',
    location: 'Bangalore',
    session_id: 'SES-100',
    action: 'login',
    metadata: { authentication_method: 'sso' },
  },
  {
    event_id: 'EVT-102',
    timestamp: '2026-09-24T10:02:15Z',
    event_type: 'mfa_success',
    user_id: 'USR-202',
    device_id: 'DEV-105',
    ip_address: '10.0.0.50',
    location: 'Bangalore',
    session_id: 'SES-100',
    action: 'mfa_verify',
    metadata: { method: 'push_notification' },
  },
  {
    event_id: 'EVT-103',
    timestamp: '2026-09-24T10:05:00Z',
    event_type: 'resource_access',
    user_id: 'USR-202',
    device_id: 'DEV-105',
    ip_address: '10.0.0.50',
    location: 'Bangalore',
    session_id: 'SES-100',
    resource: 'wiki-internal',
    action: 'read_doc',
  },
];

// Mock Incident
export const mockIncident: Incident = {
  incident_id: 'INC-001',
  title: 'Suspicious account activity & privilege escalation',
  status: 'HIGH_PRIORITY',
  priority: 86,
  created_at: '2026-09-24T09:12:00Z',
  updated_at: '2026-09-24T09:35:45Z',
  event_ids: ['EVT-001', 'EVT-002', 'EVT-003', 'EVT-004', 'EVT-005', 'EVT-006'],
};

// Mock Priority
export const mockPriority: Priority = {
  score: 86,
  label: 'HIGH',
  factors: {
    behavioral_anomaly: 24,
    correlation_strength: 18,
    asset_criticality: 17,
    incident_progression: 14,
    evidence_strength: 13,
  },
};

// Mock Evidence
export const mockEvidenceList: Evidence[] = [
  {
    evidence_id: 'EVD-001',
    incident_id: 'INC-001',
    event_id: 'EVT-003',
    type: 'ANOMALY',
    description: 'Login from unusual location (Bucharest) on unrecognized device.',
    impact: 'increases_priority',
  },
  {
    evidence_id: 'EVD-002',
    incident_id: 'INC-001',
    event_id: 'EVT-004',
    type: 'SUPPORTING',
    description: 'Access to sensitive finance database following location shift.',
    impact: 'increases_priority',
  },
  {
    evidence_id: 'EVD-003',
    incident_id: 'INC-001',
    event_id: 'EVT-005',
    type: 'PROGRESSION',
    description: 'Unauthorized DB admin role grant during active anomaly chain.',
    impact: 'escalates_status',
  },
  {
    evidence_id: 'EVD-004',
    incident_id: 'INC-001',
    event_id: 'EVT-006',
    type: 'CORRELATION',
    description: '4.85 GB egress to cloud storage correlated with elevated privilege.',
    impact: 'critical_finding',
  },
];

// Mock Graph Data
export const mockGraphData: GraphData = {
  nodes: [
    { id: 'USR-101', type: 'user', data: { label: 'User: USR-101' }, position: { x: 250, y: 50 } },
    { id: 'DEV-882', type: 'device', data: { label: 'Device: DEV-882 (Indore)' }, position: { x: 100, y: 150 } },
    { id: 'DEV-990', type: 'device', data: { label: 'Device: DEV-990 (Bucharest)' }, position: { x: 400, y: 150 } },
    { id: 'finance-db', type: 'resource', data: { label: 'Resource: finance-db' }, position: { x: 250, y: 250 } },
    { id: 's3-vault', type: 'resource', data: { label: 'S3: finance-vault-backup' }, position: { x: 450, y: 350 } },
  ],
  edges: [
    { id: 'e1', source: 'USR-101', target: 'DEV-882', label: 'Initial Login' },
    { id: 'e2', source: 'USR-101', target: 'DEV-990', label: 'MFA Bypass / New Device' },
    { id: 'e3', source: 'DEV-990', target: 'finance-db', label: 'Privilege Change' },
    { id: 'e4', source: 'DEV-990', target: 's3-vault', label: 'Data Transfer' },
  ],
};

// Mock Audit Log
export const mockAuditLogs: AuditLogEntry[] = [
  {
    timestamp: '2026-09-24T09:12:00Z',
    action: 'INCIDENT_CREATED',
    description: 'System automatically flagged initial anomaly candidate EVT-001.',
  },
  {
    timestamp: '2026-09-24T09:31:02Z',
    action: 'INCIDENT_UPDATED',
    description: 'Privilege change increased investigation priority to 86.',
  },
  {
    timestamp: '2026-09-24T09:36:00Z',
    action: 'STATUS_CHANGED',
    description: 'Status updated to HIGH_PRIORITY after bulk correlation.',
  },
];

// Mock Simulation State
export const mockSimulationState: SimulationState = {
  scenario: 'suspicious',
  current_event: mockSuspiciousEvents[0],
  processed_events: [mockSuspiciousEvents[0]],
  incident: mockIncident,
  priority: mockPriority,
  state: 'HIGH_PRIORITY',
  changes: {
    added_event: 'EVT-001',
    priority_delta: '+15',
  },
};
