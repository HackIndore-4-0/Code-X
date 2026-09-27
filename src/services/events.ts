import type { ApiResponse } from '../types/api';
import type { NormalizedEvent } from '../types/event';
import { mockSuspiciousEvents } from './mockData';

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

export const submitEvent = async (event: NormalizedEvent): Promise<ApiResponse<{ event_id: string }>> => {
  if (USE_MOCK) {
    await delay();
    return {
      success: true,
      data: { event_id: event.event_id || `EVT-${Date.now()}` },
      error: null,
    };
  }

  try {
    const res = await fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!res.ok) {
      return createErrorResponse('HTTP_ERROR', `Request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return createErrorResponse('NETWORK_ERROR', msg);
  }
};

export const submitEventsBulk = async (events: NormalizedEvent[]): Promise<ApiResponse<{ processed: number }>> => {
  if (USE_MOCK) {
    await delay();
    return {
      success: true,
      data: { processed: events.length },
      error: null,
    };
  }

  try {
    const res = await fetch(`${BASE_URL}/events/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    });
    if (!res.ok) {
      return createErrorResponse('HTTP_ERROR', `Request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return createErrorResponse('NETWORK_ERROR', msg);
  }
};

export const getEvents = async (params?: {
  limit?: number;
  offset?: number;
  event_type?: string;
  user_id?: string;
  device_id?: string;
}): Promise<ApiResponse<NormalizedEvent[]>> => {
  if (USE_MOCK) {
    await delay();
    let filtered = [...mockSuspiciousEvents];
    if (params?.event_type) {
      filtered = filtered.filter((e) => e.event_type === params.event_type);
    }
    if (params?.user_id) {
      filtered = filtered.filter((e) => e.user_id === params.user_id);
    }
    if (params?.device_id) {
      filtered = filtered.filter((e) => e.device_id === params.device_id);
    }
    return {
      success: true,
      data: filtered,
      error: null,
    };
  }

  try {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    if (params?.event_type) query.append('event_type', params.event_type);
    if (params?.user_id) query.append('user_id', params.user_id);
    if (params?.device_id) query.append('device_id', params.device_id);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${BASE_URL}/events${queryString}`);
    if (!res.ok) {
      return createErrorResponse('HTTP_ERROR', `Request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return createErrorResponse('NETWORK_ERROR', msg);
  }
};
