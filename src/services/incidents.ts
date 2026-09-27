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

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
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

export const getIncidents = async (): Promise<ApiResponse<Incident[]>> => {
  if (USE_MOCK) {
    await delay();
    return { success: true, data: [mockIncident], error: null };
  }
  try {
    const res = await fetch(`${BASE_URL}/incidents`);
    if (!res.ok) return createErrorResponse('HTTP_ERROR', `Request failed with status ${res.status}`);
    return await res.json();
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
    return await res.json();
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
