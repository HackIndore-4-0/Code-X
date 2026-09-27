import { useQuery } from '@tanstack/react-query';
import { fetchEvents } from '../api/events';

export function useEvents(params?: {
  limit?: number;
  offset?: number;
  event_type?: string;
  user_id?: string;
  device_id?: string;
}) {
  return useQuery({
    queryKey: ['events', params],
    queryFn: async () => {
      const res = await fetchEvents(params);
      if (!res.success || !res.data) return [];
      return res.data;
    },
    refetchInterval: 3000,
  });
}
