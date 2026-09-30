import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, User, FileText, Zap, History, Bot, AlertCircle, ShieldAlert } from 'lucide-react';
import {
  useIncident,
  useIncidentTimeline,
  useIncidentGraph,
  useIncidentEvidence,
  useIncidentAudit,
  useIncidentExplanation,
  useIncidentMitigation,
  usePerformAction,
  useSubmitFeedback,
} from '../hooks/useIncident';
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
import MitigationPanel from '../components/incidents/MitigationPanel';
import FalsePositiveModal from '../components/incidents/FalsePositiveModal';
import type { AnalystActionType, DismissalReason } from '../types/incident';
import { NumberTicker } from '@/registry/magicui/number-ticker';


export const IncidentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'evidence' | 'priority' | 'mitigation' | 'audit' | 'ai'>('evidence');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [showFalsePositiveModal, setShowFalsePositiveModal] = useState<boolean>(false);

  const { data: incident, isLoading: isIncidentLoading, error: incidentError, refetch } = useIncident(id);
  const { data: timeline = [] } = useIncidentTimeline(id);
  const { data: graphData, isLoading: isGraphLoading } = useIncidentGraph(id);
  const { data: evidenceList = [], isLoading: isEvidenceLoading } = useIncidentEvidence(id);
  const { data: auditLogs = [], isLoading: isAuditLoading } = useIncidentAudit(id);
  const { data: aiExplanation, isLoading: isAiLoading } = useIncidentExplanation(id);
  const { data: mitigationData, isLoading: isMitigationLoading } = useIncidentMitigation(id);
  const { mutateAsync: performAction, isPending: isActionPending } = usePerformAction(id);
  const { mutateAsync: submitFeedback, isPending: isFeedbackPending } = useSubmitFeedback(id);
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

  const handleFalsePositiveSubmit = async (reason: string, notes?: string) => {
    try {
      setActionFeedback(null);
      await submitFeedback({ feedback: 'FALSE_POSITIVE', reason: notes ? `${reason}: ${notes}` : reason });
      setShowFalsePositiveModal(false);
      setActionFeedback(`Incident marked as FALSE_POSITIVE. Adaptive suppression factor updated.`);
      refetch();
    } catch (err: unknown) {
      setActionFeedback(err instanceof Error ? err.message : 'Failed to submit false positive feedback');
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
  const threatWeight = mitigationData?.threat_weight ?? incident.priority;
  const threatThreshold = mitigationData?.threshold ?? 80;
  const isMitigationTriggered = mitigationData?.triggered === true;

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

        {/* Card 2: Deterministic Threat Weight */}
        <div className="p-4.5 rounded-xl bg-surface-container-lowest border border-outline-variant/70 shadow-lg shadow-black/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="font-label-md text-on-surface-variant font-bold tracking-wider">
                THREAT WEIGHT
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-primary-container/20 text-primary border border-primary/40">
                LIVE PIPELINE
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                isMitigationTriggered
                  ? 'bg-error-container/30 text-error border-error/50'
                  : threatWeight >= 70
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-primary-container/20 text-primary border-primary/40'
              }`}
            >
              {isMitigationTriggered ? 'MITIGATION TRIGGERED' : threatWeight >= 70 ? 'HIGH RISK' : 'NORMAL MONITORING'}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-3xl sm:text-4xl font-black text-on-surface leading-none">
                <NumberTicker value={threatWeight} decimalPlaces={1} />
              </span>
              <span className="text-xs text-on-surface-variant font-medium">/100</span>
            </div>
            <span className="text-xs font-mono text-on-surface-variant">
              Threshold: {threatThreshold}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                threatWeight >= threatThreshold
                  ? 'bg-error'
                  : threatWeight >= 40
                  ? 'bg-amber-400'
                  : 'bg-primary'
              }`}
              style={{ width: `${Math.min(100, threatWeight)}%` }}
            />
          </div>
          <p className="text-[11px] font-mono text-on-surface-variant/90 leading-tight">
            {isMitigationTriggered
              ? `Automated viaSocket mitigation triggered: Entity ${mitigationData?.flagged_ip || 'ISOLATED'}.`
              : `Threat weight evaluated below threshold (${threatWeight.toFixed(1)} < ${threatThreshold}). Continuous telemetry monitoring.`}
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
          {/* Tab Selection Bar (5 tabs) */}
          <div className="grid grid-cols-5 gap-1 p-1 rounded-md bg-surface-container-lowest border border-outline-variant font-code-sm">
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
              onClick={() => setActiveTab('mitigation')}
              className={`py-1.5 rounded-sm transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'mitigation'
                  ? 'bg-surface-container-high text-primary border border-primary/40'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              Mitigate
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

            {activeTab === 'mitigation' && (
              <MitigationPanel mitigation={mitigationData} isLoading={isMitigationLoading} />
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
        onFalsePositive={() => setShowFalsePositiveModal(true)}
        isPending={isActionPending || isFeedbackPending}
      />

      {/* False Positive Feedback Modal */}
      <FalsePositiveModal
        incidentId={incident.incident_id}
        isOpen={showFalsePositiveModal}
        onClose={() => setShowFalsePositiveModal(false)}
        onSubmit={handleFalsePositiveSubmit}
        isSubmitting={isFeedbackPending}
      />
    </div>
  );
};

export default IncidentDetail;
