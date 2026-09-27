import React from 'react';
import { Activity, AlertTriangle, ShieldAlert, Zap, RefreshCw } from 'lucide-react';
import { useIncidents } from '../hooks/useIncident';
import { useEvents } from '../hooks/useEvents';
import { useSimulation } from '../hooks/useSimulation';
import StatCard from '../components/StatCard';
import PipelineStrip from '../components/PipelineStrip';
import WhatChangedBanner from '../components/WhatChangedBanner';
import TelemetryFeed from '../components/TelemetryFeed';
import IncidentList from '../components/IncidentList';

export const Dashboard: React.FC = () => {
  const { data: incidents = [], isLoading: isIncidentsLoading, refetch: refetchIncidents } = useIncidents();
  const { data: events = [], isLoading: isEventsLoading, refetch: refetchEvents } = useEvents();
  const { diffs, activeStage } = useSimulation();

  const handleManualRefresh = () => {
    refetchIncidents();
    refetchEvents();
  };

  const totalEventsCount = events.length;
  const anomaliesCount = events.filter(
    (e) =>
      ['mfa_failure', 'new_device', 'new_location', 'privilege_change', 'large_transfer', 'admin_action'].includes(
        e.event_type
      ) || e.metadata?.anomaly === true
  ).length;

  // Active Incidents: all non-resolved and non-dismissed incidents (including HIGH_PRIORITY, INCIDENT_CANDIDATE, CONFIRMED, etc.)
  const activeIncidentsCount = incidents.filter(
    (inc) => inc.status !== 'RESOLVED' && inc.status !== 'DISMISSED'
  ).length;

  const highPriorityCount = incidents.filter(
    (inc) => inc.status === 'HIGH_PRIORITY' || inc.priority >= 70
  ).length;

  const isLoading = isIncidentsLoading || isEventsLoading;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto font-body-md text-on-surface">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-headline-lg text-on-surface">
              SOC Incident Intelligence
            </h1>
            {/* Live badge */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm font-label-sm bg-secondary-container/20 text-secondary border border-secondary/40">
              <span className="inline-flex rounded-full h-1.5 w-1.5 bg-secondary animate-pulse" />
              REAL-TIME PIPELINE
            </div>
          </div>
          <p className="font-body-sm text-on-surface-variant mt-1">
            Automated entity resolution, behavioral anomaly clustering, and dynamic investigation priority.
          </p>
        </div>

        {/* Refetch button */}
        <button
          onClick={handleManualRefresh}
          disabled={isLoading}
          className="btn-ghost flex items-center gap-1.5 font-code-sm"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`}
          />
          Refetch Data
        </button>
      </div>

      {/* ── Pipeline Strip ── */}
      <PipelineStrip activeStage={activeStage} />

      {/* ── What Changed Banner ── */}
      <WhatChangedBanner diffs={diffs} />

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="Total Events"
          value={totalEventsCount}
          subtitle="Processed in pipeline"
          icon={Activity}
          colorScheme="blue"
          loading={isLoading}
        />
        <StatCard
          title="Anomalies"
          value={anomaliesCount}
          subtitle="Suspicious behavior flags"
          icon={AlertTriangle}
          colorScheme="amber"
          loading={isLoading}
        />
        <StatCard
          title="Active Incidents"
          value={activeIncidentsCount}
          subtitle="Active threat queue"
          icon={ShieldAlert}
          colorScheme="purple"
          loading={isLoading}
        />
        <StatCard
          title="High Priority"
          value={highPriorityCount}
          subtitle="Requires analyst triage"
          icon={Zap}
          colorScheme="red"
          loading={isLoading}
        />
      </div>

      {/* ── Main Grid: Incident List + Telemetry ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <IncidentList incidents={incidents} loading={isLoading} />
        </div>
        <div>
          <TelemetryFeed events={events} loading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
