import type { ApiResponse } from '../types/api';
import type { NormalizedEvent } from '../types/event';
import { getEvents as serviceGetEvents, submitEvent as serviceSubmitEvent, submitEventsBulk as serviceSubmitEventsBulk } from '../services/events';

export const fetchEvents = async (params?: {
  limit?: number;
  offset?: number;
  event_type?: string;
  user_id?: string;
  device_id?: string;
}): Promise<ApiResponse<NormalizedEvent[]>> => {
  return serviceGetEvents(params);
};

export const postEvent = async (event: NormalizedEvent): Promise<ApiResponse<{ event_id: string }>> => {
  return serviceSubmitEvent(event);
};

export const postEventsBulk = async (events: NormalizedEvent[]): Promise<ApiResponse<{ processed: number }>> => {
  return serviceSubmitEventsBulk(events);
};
