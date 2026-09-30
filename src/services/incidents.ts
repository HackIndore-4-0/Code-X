import type { ApiResponse } from '../types/api';
import type { NormalizedEvent } from '../types/event';
import type { Incident, AnalystAction, AuditLogEntry } from '../types/incident';
import type { Evidence } from '../types/evidence';
import type { GraphData } from '../types/graph';
import {
  mockIncident,
  mockSuspiciousEvents,
  mockEvidenceList,
  mockGraphData,
  mockAuditLogs,
} from './mockData';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

function createErrorResponse<T>(code: string, message: string): ApiResponse<T> {
  return {
    success: false,
    data: null,
    error: { code, message },
  };
}

export interface ExplainResponse {
  summary: string;
  why_connected: string[];
  supporting_evidence: string[];
  mitigating_evidence: string[];
  why_investigate: string;
  recommended_actions: string[];
}

export function normalizeIncident(raw: unknown): Incident {
  if (!raw || typeof raw !== 'object') {
    return {
      incident_id: '',
      title: 'Security Incident',
      status: 'INVESTIGATING',
      priority: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      event_ids: [],
    };
  }

  const item = raw as Record<string, unknown>;
  const rawPriority = item.priority ?? item.priority_score ?? 0;
  const numPriority = Number(rawPriority);

  return {
    incident_id: String(item.incident_id || ''),
    title: String(item.title || 'Security Incident'),
    status: (item.status as Incident['status']) || 'INVESTIGATING',
    priority: isNaN(numPriority) ? 0 : Math.round(numPriority),
    created_at: String(item.created_at || new Date().toISOString()),
    updated_at: String(item.updated_at || item.created_at || new Date().toISOString()),
    event_ids: Array.isArray(item.event_ids) ? (item.event_ids as string[]) : [],
    user_id: item.user_id ? String(item.user_id) : undefined,
    primary_user: item.primary_user ? String(item.primary_user) : item.user_id ? String(item.user_id) : undefined,
  };
}

export const getIncidents = async (): Promise<ApiResponse<Incident[]>> => {
  if (USE_MOCK) {
    await delay();
    return { success: true, data: [mockIncident], error: null };
  }
  try {
    const res = await fetch(`${BASE_URL}/incidents`);
    if (!res.ok) return createErrorResponse('HTTP_ERROR', `Request failed with status ${res.status}`);
    const json = await res.json();
    const list = Array.isArray(json.data) ? json.data.map(normalizeIncident) : [];
    return { success: true, data: list, error: null };
  } catch (err: unknown) {
    return createErrorResponse('NETWORK_ERROR', err instanceof Error ? err.message : 'Network error');
  }
};

export const getIncident = async (incidentId: string): Promise<ApiResponse<Incident>> => {
  if (USE_MOCK) {
    await delay();
    return { success: true, data: { ...mockIncident, incident_id: incidentId }, error: null };
  }
  try {
    const res = await fetch(`${BASE_URL}/incidents/${incidentId}`);
    if (!res.ok) return createErrorResponse('HTTP_ERROR', `Request failed with status ${res.status}`);
    const json = await res.json();
    return { success: true, data: json.data ? normalizeIncident(json.data) : null, error: null };
  } catch (err: unknown) {
    return createErrorResponse('NETWORK_ERROR', err instanceof Error ? err.message : 'Network error');
  }
};

export const getIncidentTimeline = async (incidentId: string): Promise<ApiResponse<NormalizedEvent[]>> => {
  if (USE_MOCK) {
    await delay();
    return { success: true, data: mockSuspiciousEvents, error: null };
  }
  try {
    const res = await fetch(`${BASE_URL}/incidents/${incidentId}/timeline`);
    if (!res.ok) return createErrorResponse('HTTP_ERROR', `Request failed with status ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    return createErrorResponse('NETWORK_ERROR', err instanceof Error ? err.message : 'Network error');
  }
};

export const getIncidentEvidence = async (incidentId: string): Promise<ApiResponse<Evidence[]>> => {
  if (USE_MOCK) {
    await delay();
    return { success: true, data: mockEvidenceList, error: null };
  }
  try {
    const res = await fetch(`${BASE_URL}/incidents/${incidentId}/evidence`);
    if (!res.ok) return createErrorResponse('HTTP_ERROR', `Request failed with status ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    return createErrorResponse('NETWORK_ERROR', err instanceof Error ? err.message : 'Network error');
  }
};

export const getIncidentGraph = async (incidentId: string): Promise<ApiResponse<GraphData>> => {
  if (USE_MOCK) {
    await delay();
    return { success: true, data: mockGraphData, error: null };
  }
  try {
    const res = await fetch(`${BASE_URL}/incidents/${incidentId}/graph`);
    if (!res.ok) return createErrorResponse('HTTP_ERROR', `Request failed with status ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    return createErrorResponse('NETWORK_ERROR', err instanceof Error ? err.message : 'Network error');
  }
};

export const getIncidentAudit = async (incidentId: string): Promise<ApiResponse<AuditLogEntry[]>> => {
  if (USE_MOCK) {
    await delay();
    return { success: true, data: mockAuditLogs, error: null };
  }
  try {
    const res = await fetch(`${BASE_URL}/incidents/${incidentId}/audit`);
    if (!res.ok) return createErrorResponse('HTTP_ERROR', `Request failed with status ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    return createErrorResponse('NETWORK_ERROR', err instanceof Error ? err.message : 'Network error');
  }
};

export const performAnalystAction = async (
  incidentId: string,
  action: AnalystAction
): Promise<ApiResponse<{ incident_id: string; status: string }>> => {
  if (USE_MOCK) {
    await delay();
    return {
      success: true,
      data: { incident_id: incidentId, status: action.action === 'RESOLVE' ? 'RESOLVED' : 'CONFIRMED' },
      error: null,
    };
  }
  try {
    const res = await fetch(`${BASE_URL}/incidents/${incidentId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    });
    if (!res.ok) return createErrorResponse('HTTP_ERROR', `Request failed with status ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    return createErrorResponse('NETWORK_ERROR', err instanceof Error ? err.message : 'Network error');
  }
};

export interface MitigationData {
  incident_id: string;
  threat_weight: number;
  threshold: number;
  triggered: boolean;
  mitigation_id: string | null;
  action: string | null;
  entity: { type: string; value: string } | null;
  user_id?: string;
  flagged_ip?: string;
  webhook_status?: string | null;
  remediation_status: string;
  isolation_status?: string;
  timestamp?: string | null;
}

export const getIncidentMitigation = async (incidentId: string): Promise<ApiResponse<MitigationData>> => {
  if (USE_MOCK) {
    await delay();
    return {
      success: true,
      data: {
        incident_id: incidentId,
        threat_weight: 86.0,
        threshold: 80.0,
        triggered: true,
        mitigation_id: 'MIT-MOCK-001',
        action: 'ISOLATE_ENTITY',
        entity: { type: 'IP', value: '198.51.100.42' },
        user_id: 'USR-101',
        flagged_ip: '198.51.100.42',
        webhook_status: 'SUCCESS',
        remediation_status: 'ISOLATED',
        isolation_status: 'ISOLATED',
        timestamp: new Date().toISOString(),
      },
      error: null,
    };
  }
  try {
    const res = await fetch(`${BASE_URL}/incidents/${incidentId}/mitigation`);
    if (!res.ok) return createErrorResponse('HTTP_ERROR', `Request failed with status ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    return createErrorResponse('NETWORK_ERROR', err instanceof Error ? err.message : 'Network error');
  }
};

export const submitIncidentFeedback = async (
  incidentId: string,
  feedback: 'FALSE_POSITIVE' | string,
  reason?: string
): Promise<ApiResponse<{ feedback_id: string; status: string }>> => {
  if (USE_MOCK) {
    await delay();
    return {
      success: true,
      data: { feedback_id: `FBK-${Date.now()}`, status: 'RECORDED' },
      error: null,
    };
  }
  try {
    const res = await fetch(`${BASE_URL}/incidents/${incidentId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback, reason }),
    });
    if (!res.ok) return createErrorResponse('HTTP_ERROR', `Request failed with status ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    return createErrorResponse('NETWORK_ERROR', err instanceof Error ? err.message : 'Network error');
  }
};

export const explainIncident = async (incidentId: string): Promise<ApiResponse<ExplainResponse>> => {
  if (USE_MOCK) {
    await delay();
    return {
      success: true,
      data: {
        summary: 'Incident involves suspicious sequence: MFA failure followed by new location login and DB privilege escalation.',
        why_connected: ['Shared USR-101 session ID', 'High temporal correlation between device registration and DB access'],
        supporting_evidence: ['Login from Bucharest IP', 'Role granted: db_admin'],
        mitigating_evidence: [],
        why_investigate: 'High risk of active data exfiltration from finance vault.',
        recommended_actions: ['Revoke db_admin role for USR-101', 'Isolate device DEV-990', 'Terminate session SES-002'],
      },
      error: null,
    };
  }
  try {
    const res = await fetch(`${BASE_URL}/incidents/${incidentId}/explain`, {
      method: 'POST',
    });
    if (!res.ok) return createErrorResponse('HTTP_ERROR', `Request failed with status ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    return createErrorResponse('NETWORK_ERROR', err instanceof Error ? err.message : 'Network error');
  }
};


