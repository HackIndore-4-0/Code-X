import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchIncidents,
  fetchIncidentDetail,
  fetchIncidentTimeline,
  fetchIncidentEvidence,
  fetchIncidentGraph,
  fetchIncidentAudit,
  postAnalystAction,
  postExplainIncident,
} from '../api/incidents';
import type { AnalystAction } from '../types/incident';

export function useIncidents() {
  return useQuery({
    queryKey: ['incidents'],
    queryFn: async () => {
      const res = await fetchIncidents();
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to fetch incidents');
      return res.data;
    },
    refetchInterval: 5000,
  });
}

export function useIncident(incidentId: string | undefined) {
  return useQuery({
    queryKey: ['incident', incidentId],
    queryFn: async () => {
      if (!incidentId) throw new Error('Missing incident ID');
      const res = await fetchIncidentDetail(incidentId);
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to fetch incident details');
      return res.data;
    },
    enabled: Boolean(incidentId),
  });
}

export function useIncidentTimeline(incidentId: string | undefined) {
  return useQuery({
    queryKey: ['incidentTimeline', incidentId],
    queryFn: async () => {
      if (!incidentId) return [];
      const res = await fetchIncidentTimeline(incidentId);
      if (!res.success || !res.data) return [];
      return res.data;
    },
    enabled: Boolean(incidentId),
  });
}

export function useIncidentEvidence(incidentId: string | undefined) {
  return useQuery({
    queryKey: ['incidentEvidence', incidentId],
    queryFn: async () => {
      if (!incidentId) return [];
      const res = await fetchIncidentEvidence(incidentId);
      if (!res.success || !res.data) return [];
      return res.data;
    },
    enabled: Boolean(incidentId),
  });
}

export function useIncidentGraph(incidentId: string | undefined) {
  return useQuery({
    queryKey: ['incidentGraph', incidentId],
    queryFn: async () => {
      if (!incidentId) return { nodes: [], edges: [] };
      const res = await fetchIncidentGraph(incidentId);
      if (!res.success || !res.data) return { nodes: [], edges: [] };
      return res.data;
    },
    enabled: Boolean(incidentId),
  });
}

export function useIncidentAudit(incidentId: string | undefined) {
  return useQuery({
    queryKey: ['incidentAudit', incidentId],
    queryFn: async () => {
      if (!incidentId) return [];
      const res = await fetchIncidentAudit(incidentId);
      if (!res.success || !res.data) return [];
      return res.data;
    },
    enabled: Boolean(incidentId),
  });
}

export function useIncidentExplanation(incidentId: string | undefined) {
  return useQuery({
    queryKey: ['incidentExplanation', incidentId],
    queryFn: async () => {
      if (!incidentId) return null;
      const res = await postExplainIncident(incidentId);
      if (!res.success || !res.data) return null;
      return res.data;
    },
    enabled: Boolean(incidentId),
  });
}

export function usePerformAction(incidentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (action: AnalystAction) => {
      if (!incidentId) throw new Error('Missing incident ID');
      const res = await postAnalystAction(incidentId, action);
      if (!res.success) throw new Error(res.error?.message || 'Failed to perform analyst action');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incidentAudit', incidentId] });
    },
  });
}
