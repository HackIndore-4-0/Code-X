import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  fetchSimulationState,
  postSimulationNext,
  postSimulationReset,
  postSimulationStart,
} from '../api/simulation';
import type { SimulationState, SimulationScenario, IncidentStatus } from '../types/incident';

export interface StateDiff {
  id: string;
  label: string;
  from?: string | number;
  to?: string | number;
  type: 'priority' | 'state' | 'evidence' | 'event';
}

export type PipelineStage = 'Normalization' | 'Baseline' | 'Anomaly' | 'Correlation' | 'Incident' | 'Priority';

export const PIPELINE_STAGES: PipelineStage[] = [
  'Normalization',
  'Baseline',
  'Anomaly',
  'Correlation',
  'Incident',
  'Priority',
];

export function useSimulation() {
  const queryClient = useQueryClient();
  const [diffs, setDiffs] = useState<StateDiff[]>([]);
  const [activeStage, setActiveStage] = useState<PipelineStage>('Priority');
  const [lastState, setLastState] = useState<SimulationState | null>(null);

  const stateQuery = useQuery({
    queryKey: ['simulationState'],
    queryFn: async () => {
      const res = await fetchSimulationState();
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to fetch simulation state');
      return res.data;
    },
  });

  const computeDiffs = (oldState: SimulationState | null, newState: SimulationState) => {
    const initScore = (newState.priority as { score?: number })?.score ?? (newState.incident as { priority?: number })?.priority ?? 0;
    if (!oldState) {
      setDiffs([
        { id: '1', label: `State initialized: ${newState.state}`, to: newState.state, type: 'state' },
        { id: '2', label: `Priority: ${initScore}`, to: initScore, type: 'priority' },
      ]);
      return;
    }

    const newDiffs: StateDiff[] = [];
    const oldScore = (oldState.priority as { score?: number })?.score ?? (oldState.incident as { priority?: number })?.priority ?? 0;
    const newScore = (newState.priority as { score?: number })?.score ?? (newState.incident as { priority?: number })?.priority ?? 0;

    if (oldScore !== newScore) {
      newDiffs.push({
        id: `priority-${Date.now()}`,
        label: `Priority ${oldScore} → ${newScore}`,
        from: oldScore,
        to: newScore,
        type: 'priority',
      });
    }

    if (oldState.state !== newState.state) {
      newDiffs.push({
        id: `state-${Date.now()}`,
        label: `State ${oldState.state} → ${newState.state}`,
        from: oldState.state,
        to: newState.state,
        type: 'state',
      });
    }

    const oldEvCount = oldState.processed_events?.length ?? 0;
    const newEvCount = newState.processed_events?.length ?? 0;
    if (oldEvCount !== newEvCount) {
      newDiffs.push({
        id: `ev-${Date.now()}`,
        label: `Telemetry Events: ${oldEvCount} → ${newEvCount}`,
        from: oldEvCount,
        to: newEvCount,
        type: 'event',
      });
    }

    const currentEvId = (newState.current_event as { event_id?: string })?.event_id;
    if (currentEvId) {
      newDiffs.push({
        id: `event-id-${Date.now()}`,
        label: `Ingested ${currentEvId}`,
        to: currentEvId,
        type: 'event',
      });
    }

    setDiffs(newDiffs);
  };

  const stageForStatus = (status: IncidentStatus): PipelineStage => {
    switch (status) {
      case 'ANOMALY':
        return 'Anomaly';
      case 'SUSPICIOUS_PATTERN':
        return 'Correlation';
      case 'INCIDENT_CANDIDATE':
        return 'Incident';
      case 'HIGH_PRIORITY':
        return 'Priority';
      default:
        return 'Priority';
    }
  };

  const nextMutation = useMutation({
    mutationFn: async () => {
      const res = await postSimulationNext();
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Simulation next failed');
      return res.data;
    },
    onSuccess: (data) => {
      computeDiffs(lastState || stateQuery.data || null, data);
      setLastState(data);
      setActiveStage(stageForStatus(data.state));
      queryClient.invalidateQueries({ queryKey: ['simulationState'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      queryClient.invalidateQueries({ queryKey: ['incidentTimeline'] });
      queryClient.invalidateQueries({ queryKey: ['incidentGraph'] });
      queryClient.invalidateQueries({ queryKey: ['incidentEvidence'] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await postSimulationReset();
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Simulation reset failed');
      return res.data;
    },
    onSuccess: (data) => {
      setDiffs([{ id: 'reset', label: 'Simulation Reset to Baseline', type: 'state' }]);
      setLastState(data);
      setActiveStage('Normalization');
      queryClient.invalidateQueries();
    },
  });

  const startMutation = useMutation({
    mutationFn: async (scenario: SimulationScenario) => {
      const res = await postSimulationStart(scenario);
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Simulation start failed');
      return res.data;
    },
    onSuccess: (data) => {
      setDiffs([{ id: 'start', label: `Scenario ${data.scenario} started`, type: 'state' }]);
      setLastState(data);
      setActiveStage('Normalization');
      queryClient.invalidateQueries();
    },
  });

  return {
    state: stateQuery.data,
    isLoading: stateQuery.isLoading,
    isNextLoading: nextMutation.isPending,
    isResetLoading: resetMutation.isPending,
    diffs,
    activeStage,
    nextEvent: () => nextMutation.mutate(),
    resetSimulation: () => resetMutation.mutate(),
    startSimulation: (scenario: SimulationScenario) => startMutation.mutate(scenario),
  };
}
