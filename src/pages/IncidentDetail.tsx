import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, User, FileText, Zap, History, Bot, AlertCircle, Flame } from 'lucide-react';
import { useIncident, useIncidentTimeline, useIncidentGraph, useIncidentEvidence, useIncidentAudit, useIncidentExplanation, usePerformAction } from '../hooks/useIncident';
import { useSimulation } from '../hooks/useSimulation';
import StateBadge from '../components/StateBadge';
import WhatChangedBanner from '../components/WhatChangedBanner';
import Timeline from '../components/Timeline';
import IncidentGraph from '../components/IncidentGraph';
import EvidencePanel from '../components/EvidencePanel';
import PriorityBreakdown from '../components/PriorityBreakdown';
import AuditTrail from '../components/incidents/AuditTrail';
import AIExplanation from '../components/AIExplanation';
import ActionBar from '../components/ActionBar';
import { getThreatScoreForIncident } from '../services/threatScore';
import type { AnalystActionType, DismissalReason } from '../types/incident';
import { NumberTicker } from '@/registry/magicui/number-ticker';


export const IncidentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'evidence' | 'priority' | 'audit' | 'ai'>('evidence');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const { data: incident, isLoading: isIncidentLoading, error: incidentError, refetch } = useIncident(id);
  const { data: timeline = [] } = useIncidentTimeline(id);
  const { data: graphData, isLoading: isGraphLoading } = useIncidentGraph(id);
  const { data: evidenceList = [], isLoading: isEvidenceLoading } = useIncidentEvidence(id);
  const { data: auditLogs = [], isLoading: isAuditLoading } = useIncidentAudit(id);
  const { data: aiExplanation, isLoading: isAiLoading } = useIncidentExplanation(id);
  const { mutateAsync: performAction, isPending: isActionPending } = usePerformAction(id);
  const { diffs } = useSimulation();

  const handleAnalystAction = async (action: AnalystActionType, reason?: DismissalReason) => {
    try {
      setActionFeedback(null);
      await performAction({ action, reason });
      setActionFeedback(`Analyst action '${action}' recorded successfully.`);
    } catch (err: unknown) {
      setActionFeedback(err instanceof Error ? err.message : 'Action execution failed');
    }
  };

  const getTimeWindow = () => {
    if (!timeline.length) return 'N/A';
    try {
      const first = new Date(timeline[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const last = new Date(timeline[timeline.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${first} — ${last}`;
    } catch {
      return 'N/A';
    }
  };

  if (isIncidentLoading) {
    return (
      <div className="p-5 max-w-7xl mx-auto space-y-4 font-code-sm animate-pulse">
        <div className="h-6 w-36 rounded-md bg-surface-container-high" />
        <div className="h-20 rounded-md border border-outline-variant bg-surface-container" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="h-96 rounded-md bg-surface-container" />
          <div className="lg:col-span-2 h-96 rounded-md bg-surface-container" />
        </div>
      </div>
    );
  }

  if (incidentError || !incident) {
    return (
      <div className="p-6 max-w-xl mx-auto font-code-sm space-y-4 text-center">
        <Link to="/" className="inline-flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <div className="p-6 rounded-md space-y-3 bg-surface-container border border-error/40 text-error">
          <AlertCircle className="w-10 h-10 text-error mx-auto" />
          <h2 className="font-headline-sm text-on-surface">Incident Not Found</h2>
          <p className="font-body-sm text-on-surface-variant">{incidentError?.message || `No incident details for ID ${id}`}</p>
          <button onClick={() => refetch()} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const primaryUser = incident.primary_user || incident.user_id || 'USR-007';
  const threatData = getThreatScoreForIncident(incident.incident_id);
  const threatScore = Math.min(79, Math.max(0, threatData.threat_score));
  const threatSeverity = threatData.severity;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto font-body-md text-on-surface">
      {/* Top Breadcrumb & Status */}
      <div className="flex items-center justify-between font-code-sm text-on-surface-variant">
        <Link to="/" className="inline-flex items-center gap-1.5 hover:text-primary transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <span>Incident ID: <strong className="text-primary">{incident.incident_id}</strong></span>
      </div>

      {/* Header Banner */}
      <div className="rounded-xl p-5 space-y-3 font-code-sm bg-surface-container-lowest border border-outline-variant/70 shadow-lg shadow-black/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-headline-md text-primary">{incident.incident_id}</span>
              <StateBadge status={incident.status} size="md" />
              <span className="font-code-sm flex items-center gap-1 px-2 py-0.5 rounded-sm border bg-surface-container-low border-outline-variant text-on-surface">
                <User className="w-3.5 h-3.5 text-on-surface-variant" />
                Primary User: <strong className="text-on-surface">{primaryUser}</strong>
              </span>
              <span className="font-code-sm flex items-center gap-1 px-2 py-0.5 rounded-sm border bg-surface-container-low border-outline-variant text-on-surface-variant">
                <Clock className="w-3.5 h-3.5 text-on-surface-variant" />
                Time Window: <strong className="text-on-surface">{getTimeWindow()}</strong>
              </span>
            </div>
            <h1 className="font-headline-lg text-on-surface">{incident.title}</h1>
          </div>
        </div>
      </div>

      {/* ── Prominent Score Cards: Priority Score & Threat Score ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-code-sm">
        {/* Card 1: Priority Score */}
        <div className="p-4.5 rounded-xl bg-surface-container-lowest border border-outline-variant/70 shadow-lg shadow-black/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-error" />
              <span className="font-label-md text-on-surface-variant font-bold tracking-wider">
                PRIORITY SCORE
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                incident.priority >= 70
                  ? 'bg-error-container/30 text-error border-error/50'
                  : incident.priority >= 40
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-primary-container/20 text-primary border-primary/40'
              }`}
            >
              {incident.priority >= 70 ? 'SEV-1 CRITICAL' : incident.priority >= 40 ? 'SEV-2 ELEVATED' : 'MONITORING'}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-3xl sm:text-4xl font-black text-on-surface leading-none">
                <NumberTicker value={incident.priority} />
              </span>
              <span className="text-xs text-on-surface-variant font-medium">/100</span>
            </div>
            <span className="text-xs font-mono text-on-surface-variant">
              Dynamic Operational Urgency
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                incident.priority >= 70 ? 'bg-error' : incident.priority >= 40 ? 'bg-amber-400' : 'bg-primary'
              }`}
              style={{ width: `${Math.min(100, incident.priority)}%` }}
            />
          </div>
          <p className="text-[11px] font-mono text-on-surface-variant/80">
            Calculated from asset criticality, kill-chain progression, and evidence strength.
          </p>
        </div>

        {/* Card 2: Threat Score */}
        <div className="p-4.5 rounded-xl bg-surface-container-lowest border border-outline-variant/70 shadow-lg shadow-black/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="font-label-md text-on-surface-variant font-bold tracking-wider">
                THREAT SCORE
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-surface-container-high text-on-surface-variant/80 border border-outline-variant/60">
                MOCK DATA
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                threatScore >= 60
                  ? 'bg-error-container/30 text-error border-error/50'
                  : threatScore >= 40
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : threatScore >= 20
                  ? 'bg-primary-container/20 text-primary border-primary/40'
                  : 'bg-surface-container-high text-on-surface-variant border-outline-variant'
              }`}
            >
              {threatSeverity.toUpperCase()} SEVERITY
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-3xl sm:text-4xl font-black text-on-surface leading-none">
                <NumberTicker value={threatScore} />
              </span>
              <span className="text-xs text-on-surface-variant font-medium">/100</span>
            </div>
            <span className="text-xs font-mono text-on-surface-variant">
              Suspicious Behavior Severity
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                threatScore >= 60
                  ? 'bg-error'
                  : threatScore >= 40
                  ? 'bg-amber-400'
                  : threatScore >= 20
                  ? 'bg-primary'
                  : 'bg-secondary'
              }`}
              style={{ width: `${Math.min(79, threatScore)}%` }}
            />
          </div>
          <p className="text-[11px] font-mono text-on-surface-variant/90 leading-tight">
            {threatData.explanation}
          </p>
        </div>
      </div>

      {/* "WHAT CHANGED?" Banner */}
      <WhatChangedBanner diffs={diffs} />

      {/* Action Feedback Toast */}
      {actionFeedback && (
        <div className="p-3 rounded-md font-code-sm flex justify-between items-center bg-secondary-container/20 border border-secondary/40 text-secondary">
          <span>{actionFeedback}</span>
          <button onClick={() => setActionFeedback(null)} className="text-on-surface-variant hover:text-on-surface cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* Three-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Vertical Timeline (3 cols) */}
        <div className="lg:col-span-3 rounded-md p-4 space-y-3 bg-surface-container border border-outline-variant">
          <div className="flex items-center justify-between pb-2.5 font-code-sm border-b border-outline-variant">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-on-surface">
              <Clock className="w-3.5 h-3.5 text-primary" />
              EVENT TIMELINE
            </div>
            <span className="font-code-sm text-on-surface-variant">
              <NumberTicker value={timeline.length} /> events
            </span>
          </div>
          <Timeline events={timeline} />
        </div>

        {/* Center Column: React Flow Graph (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <IncidentGraph graphData={graphData} loading={isGraphLoading} />
        </div>

        {/* Right Column: Tabbed Panels (4 cols) */}
        <div className="lg:col-span-4 space-y-3 font-code-sm">
          {/* Tab Selection Bar */}
          <div className="grid grid-cols-4 gap-1 p-1 rounded-md bg-surface-container-lowest border border-outline-variant font-code-sm">
            <button
              onClick={() => setActiveTab('evidence')}
              className={`py-1.5 rounded-sm transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'evidence'
                  ? 'bg-surface-container-high text-primary border border-primary/40'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <FileText className="w-3 h-3" />
              Evidence
            </button>

            <button
              onClick={() => setActiveTab('priority')}
              className={`py-1.5 rounded-sm transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'priority'
                  ? 'bg-surface-container-high text-primary border border-primary/40'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Zap className="w-3 h-3" />
              Priority
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`py-1.5 rounded-sm transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'audit'
                  ? 'bg-surface-container-high text-primary border border-primary/40'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <History className="w-3 h-3" />
              Audit
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`py-1.5 rounded-sm transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'ai'
                  ? 'bg-surface-container-high text-primary border border-primary/40'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Bot className="w-3 h-3" />
              AI
            </button>
          </div>

          {/* Active Tab Panel Content */}
          <div>
            {activeTab === 'evidence' && (
              <EvidencePanel evidenceList={evidenceList} loading={isEvidenceLoading} />
            )}

            {activeTab === 'priority' && (
              <div className="space-y-4">
                <PriorityBreakdown score={incident.priority} />
              </div>
            )}

            {activeTab === 'audit' && (
              <AuditTrail entries={auditLogs} loading={isAuditLoading} incidentId={id} />
            )}

            {activeTab === 'ai' && (
              <AIExplanation explanation={aiExplanation} loading={isAiLoading} />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <ActionBar
        onAction={handleAnalystAction}
        isPending={isActionPending}
      />
    </div>
  );
};

export default IncidentDetail;
