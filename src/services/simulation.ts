import type { ApiResponse } from '../types/api';
import type { SimulationState, SimulationScenario, IncidentStatus } from '../types/incident';
import { mockSuspiciousEvents, mockBenignEvents, mockIncident } from './mockData';

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

// Stateful Mock Engine for local demo/preview
let mockScenario: SimulationScenario = 'suspicious';
let mockIndex = 0;

function buildMockState(scenario: SimulationScenario, index: number): SimulationState {
  const events = scenario === 'suspicious' ? mockSuspiciousEvents : mockBenignEvents;
  const safeIndex = Math.max(0, Math.min(index, events.length - 1));
  const currentEvent = events[safeIndex];
  const processedEvents = events.slice(0, safeIndex + 1);

  const priorities = scenario === 'suspicious' ? [15, 30, 50, 68, 78, 86] : [0, 0, 0];
  const currentPriorityScore = priorities[safeIndex] || 0;

  const currentStatus: IncidentStatus =
    scenario === 'suspicious'
      ? safeIndex >= 4
        ? 'HIGH_PRIORITY'
        : 'INCIDENT_CANDIDATE'
      : 'RESOLVED';

  const hasIncident = scenario === 'suspicious' && safeIndex >= 1;

  const prevPriority = safeIndex > 0 ? priorities[safeIndex - 1] : 0;
  const priorityDelta = currentPriorityScore - prevPriority;

  return {
    scenario,
    current_event: currentEvent,
    processed_events: processedEvents,
    incident: hasIncident
      ? {
          ...mockIncident,
          priority: currentPriorityScore,
          status: currentStatus,
          event_ids: processedEvents.map((e) => e.event_id),
        }
      : {},
    priority: {
      score: currentPriorityScore,
      label: currentPriorityScore >= 70 ? 'HIGH' : currentPriorityScore >= 40 ? 'MEDIUM' : 'LOW',
      factors: {
        behavioral_anomaly: Math.round(currentPriorityScore * 0.3),
        correlation_strength: Math.round(currentPriorityScore * 0.25),
        asset_criticality: Math.round(currentPriorityScore * 0.2),
        incident_progression: Math.round(currentPriorityScore * 0.15),
        evidence_strength: Math.round(currentPriorityScore * 0.1),
      },
    },
    state: currentStatus,
    changes: {
      added_event: currentEvent.event_id,
      priority_delta: priorityDelta >= 0 ? `+${priorityDelta}` : `${priorityDelta}`,
      events_count: processedEvents.length,
      total_scenario_events: events.length,
      current_step: safeIndex + 1,
    },
  };
}

export const startSimulation = async (scenario: SimulationScenario): Promise<ApiResponse<SimulationState>> => {
  if (USE_MOCK) {
    await delay();
    mockScenario = scenario;
    mockIndex = 0;
    return {
      success: true,
      data: buildMockState(mockScenario, mockIndex),
      error: null,
    };
  }

  try {
    const res = await fetch(`${BASE_URL}/simulation/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario }),
    });
    if (!res.ok) return createErrorResponse('HTTP_ERROR', `Request failed with status ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    return createErrorResponse('NETWORK_ERROR', err instanceof Error ? err.message : 'Network error');
  }
};

export const nextEvent = async (): Promise<ApiResponse<SimulationState>> => {
  if (USE_MOCK) {
    await delay();
    const events = mockScenario === 'suspicious' ? mockSuspiciousEvents : mockBenignEvents;
    if (mockIndex < events.length - 1) {
      mockIndex += 1;
    }
    return {
      success: true,
      data: buildMockState(mockScenario, mockIndex),
      error: null,
    };
  }

  try {
    const res = await fetch(`${BASE_URL}/simulation/next`, { method: 'POST' });
    if (!res.ok) return createErrorResponse('HTTP_ERROR', `Request failed with status ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    return createErrorResponse('NETWORK_ERROR', err instanceof Error ? err.message : 'Network error');
  }
};

export const previousEvent = async (): Promise<ApiResponse<SimulationState>> => {
  if (USE_MOCK) {
    await delay();
    if (mockIndex > 0) {
      mockIndex -= 1;
    }
    return {
      success: true,
      data: buildMockState(mockScenario, mockIndex),
      error: null,
    };
  }

  try {
    const res = await fetch(`${BASE_URL}/simulation/previous`, { method: 'POST' });
    if (!res.ok) return createErrorResponse('HTTP_ERROR', `Request failed with status ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    return createErrorResponse('NETWORK_ERROR', err instanceof Error ? err.message : 'Network error');
  }
};

export const resetSimulation = async (): Promise<ApiResponse<SimulationState>> => {
  if (USE_MOCK) {
    await delay();
    mockIndex = 0;
    return {
      success: true,
      data: buildMockState(mockScenario, mockIndex),
      error: null,
    };
  }

  try {
    const res = await fetch(`${BASE_URL}/simulation/reset`, { method: 'POST' });
    if (!res.ok) return createErrorResponse('HTTP_ERROR', `Request failed with status ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    return createErrorResponse('NETWORK_ERROR', err instanceof Error ? err.message : 'Network error');
  }
};

export const getSimulationState = async (): Promise<ApiResponse<SimulationState>> => {
  if (USE_MOCK) {
    await delay();
    return {
      success: true,
      data: buildMockState(mockScenario, mockIndex),
      error: null,
    };
  }

  try {
    const res = await fetch(`${BASE_URL}/simulation/state`);
    if (!res.ok) return createErrorResponse('HTTP_ERROR', `Request failed with status ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    return createErrorResponse('NETWORK_ERROR', err instanceof Error ? err.message : 'Network error');
  }
};
