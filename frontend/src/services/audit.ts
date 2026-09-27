import type { ApiResponse } from '../types/api';
import type { AuditLogEntry } from '../types/incident';
import { mockAuditLogs } from './mockData';

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

export const getAuditLog = async (params?: {
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<AuditLogEntry[]>> => {
  if (USE_MOCK) {
    await delay();
    let data = [...mockAuditLogs];
    if (params?.offset) {
      data = data.slice(params.offset);
    }
    if (params?.limit) {
      data = data.slice(0, params.limit);
    }
    return {
      success: true,
      data,
      error: null,
    };
  }

  try {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${BASE_URL}/audit${queryString}`);
    if (!res.ok) {
      return createErrorResponse('HTTP_ERROR', `Request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (err: unknown) {
    return createErrorResponse('NETWORK_ERROR', err instanceof Error ? err.message : 'Network error');
  }
};
