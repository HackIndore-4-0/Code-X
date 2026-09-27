import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Clock,
  Layers,
  CheckCircle2,
  Zap,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import {
  getIncident,
  getIncidentTimeline,
  performAnalystAction,
} from '../services/incidents';
import type { Incident, AnalystActionType, IncidentStatus } from '../types/incident';
import type { NormalizedEvent } from '../types/event';
import StatusBadge from '../components/incidents/StatusBadge';
import Timeline from '../components/incidents/Timeline';
import PriorityBreakdown from '../components/incidents/PriorityBreakdown';
import EvidencePanel from '../components/incidents/EvidencePanel';
import CorrelationGraph from '../components/incidents/CorrelationGraph';
import AIExplanation from '../components/incidents/AIExplanation';
import AuditTrail from '../components/incidents/AuditTrail';

interface ActionToast {
  message: string;
  type: 'success' | 'error';
}

const PROGRESSION_STEPS = [
  { id: 'ANOMALY', label: 'Anomaly' },
  { id: 'SUSPICIOUS_PATTERN', label: 'Suspicious Pattern' },
  { id: 'INCIDENT_CANDIDATE', label: 'Incident Candidate' },
  { id: 'HIGH_PRIORITY', label: 'High Priority' },
];

export const IncidentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [timeline, setTimeline] = useState<NormalizedEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pending action state for spinner
  const [pendingAction, setPendingAction] = useState<AnalystActionType | null>(null);
  const [toast, setToast] = useState<ActionToast | null>(null);

  const fetchDetailData = async () => {
    if (!id) return;
    const targetId = id;
    setLoading(true);
    setError(null);

    try {
      const [incRes, timeRes] = await Promise.all([
        getIncident(targetId),
        getIncidentTimeline(targetId),
      ]);

      if (!incRes.success || !incRes.data) {
        throw new Error(incRes.error?.message || 'Incident not found');
      }

      setIncident(incRes.data);
      if (timeRes.success && timeRes.data) {
        setTimeline(timeRes.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load incident details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    const targetId = id;
    let isMounted = true;

    async function init() {
      try {
        const [incRes, timeRes] = await Promise.all([
          getIncident(targetId),
          getIncidentTimeline(targetId),
        ]);

        if (!isMounted) return;

        if (!incRes.success || !incRes.data) {
          throw new Error(incRes.error?.message || 'Incident not found');
        }

        setIncident(incRes.data);
        if (timeRes.success && timeRes.data) {
          setTimeline(timeRes.data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load incident details');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleAction = async (actionType: AnalystActionType) => {
    if (!id || !incident) return;
    const targetId = id;
    setPendingAction(actionType);
    setToast(null);

    try {
      const res = await performAnalystAction(targetId, { action: actionType });

      if (res.success && res.data) {
        let updatedStatus: IncidentStatus = incident.status;
        if (actionType === 'CONFIRM') updatedStatus = 'CONFIRMED';
        else if (actionType === 'DISMISS') updatedStatus = 'DISMISSED';
        else if (actionType === 'RESOLVE') updatedStatus = 'RESOLVED';
        else if (actionType === 'ESCALATE') updatedStatus = 'HIGH_PRIORITY';
        else if (actionType === 'INVESTIGATE') updatedStatus = 'INCIDENT_CANDIDATE';

        setIncident((prev) => (prev ? { ...prev, status: updatedStatus } : prev));
        setToast({
          message: `Analyst action '${actionType}' completed successfully.`,
          type: 'success',
        });
      } else {
        throw new Error(res.error?.message || 'Failed to execute analyst action');
      }
    } catch (err: unknown) {
      setToast({
        message: err instanceof Error ? err.message : 'Action failed',
        type: 'error',
      });
    } finally {
      setPendingAction(null);
    }
  };

  const getActiveStepIndex = (status?: IncidentStatus) => {
    switch (status) {
      case 'HIGH_PRIORITY':
        return 3;
      case 'INCIDENT_CANDIDATE':
      case 'CONFIRMED':
        return 2;
      case 'RESOLVED':
      case 'DISMISSED':
        return 3;
      default:
        return 1;
    }
  };

  const activeStepIndex = getActiveStepIndex(incident?.status);

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

  if (loading) {
    return (
      <div className="p-5 space-y-4 max-w-7xl mx-auto animate-pulse">
        <div className="h-5 w-32 bg-slate-800 rounded" />
        <div className="h-20 bg-slate-800/60 rounded-md" />
        <div className="h-14 bg-slate-800/40 rounded-md" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 h-80 bg-slate-800/50 rounded-md" />
          <div className="h-80 bg-slate-800/50 rounded-md" />
        </div>
      </div>
    );
  }

  if (error || !incident || !id) {
    return (
      <div className="p-5 max-w-2xl mx-auto space-y-5">
        <Link
          to="/incidents"
          className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Incidents Queue
        </Link>

        <div className="bg-slate-900 border border-slate-800/60 rounded-md p-6 text-center space-y-3 font-mono">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <div>
            <h2 className="text-base font-bold text-slate-100">Incident Not Found</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {error || `No incident found matching identifier '${id}'`}
            </p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <button
              onClick={fetchDetailData}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/incidents')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              Return to Queue
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentIncidentId = id;

  return (
    <div className="p-5 space-y-5 max-w-7xl mx-auto">
      {/* Back Link Header */}
      <div className="flex items-center justify-between font-mono text-xs">
        <Link
          to="/incidents"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Incidents Queue
        </Link>
        <span className="text-slate-500">
          Created: {new Date(incident.created_at).toLocaleString()}
        </span>
      </div>

      {/* Action Toast Feedback */}
      {toast && (
        <div
          className={`p-3 rounded-md border flex items-center justify-between text-xs font-mono transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-red-500/10 text-red-300 border-red-500/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-200 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace Header Card */}
      <div className="bg-slate-900 border border-slate-800/60 rounded-md p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap font-mono">
              <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                {incident.incident_id}
              </span>
              <StatusBadge status={incident.status} size="md" />
            </div>

            <h1 className="text-lg font-bold tracking-tight text-slate-100">
              {incident.title}
            </h1>
          </div>

          {/* Prominent Priority Score + Action Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            {/* Score Card */}
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-md bg-slate-950 border border-slate-800 font-mono">
              <div className="text-center">
                <span className="text-xl font-bold text-red-400 leading-none block">
                  {incident.priority}
                </span>
                <span className="text-[9px] uppercase text-slate-500 block mt-0.5">
                  Score
                </span>
              </div>
              <div className="w-1 h-6 bg-red-500 rounded-full" />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap font-mono">
              <button
                onClick={() => handleAction('INVESTIGATE')}
                disabled={pendingAction !== null}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {pendingAction === 'INVESTIGATE' ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Search className="w-3 h-3 text-blue-400" />
                )}
                Investigate
              </button>

              <button
                onClick={() => handleAction('CONFIRM')}
                disabled={pendingAction !== null}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50 cursor-pointer"
              >
                {pendingAction === 'CONFIRM' ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3 h-3" />
                )}
                Confirm
              </button>

              <button
                onClick={() => handleAction('ESCALATE')}
                disabled={pendingAction !== null}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs font-medium rounded-md border border-red-500/30 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {pendingAction === 'ESCALATE' ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <ShieldAlert className="w-3 h-3 text-red-400" />
                )}
                Escalate
              </button>

              <button
                onClick={() => handleAction('DISMISS')}
                disabled={pendingAction !== null}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-md border border-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {pendingAction === 'DISMISS' ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <XCircle className="w-3 h-3 text-slate-500" />
                )}
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* State Progression Indicator Stepper */}
      <div className="bg-slate-900 border border-slate-800/60 rounded-md p-4 space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono uppercase tracking-wider">
          <span className="flex items-center gap-1.5 font-semibold">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            AUTOMATED STATE PROGRESSION
          </span>
          <span className="text-slate-300">
            Stage {activeStepIndex + 1} of {PROGRESSION_STEPS.length}
          </span>
        </div>

        <div className="relative flex items-center justify-between pt-1">
          {/* Background Bar */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-slate-800 w-full rounded-full z-0" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-500 rounded-full transition-all duration-300 z-0"
            style={{
              width: `${(activeStepIndex / (PROGRESSION_STEPS.length - 1)) * 100}%`,
            }}
          />

          {PROGRESSION_STEPS.map((step, idx) => {
            const isCompleted = idx <= activeStepIndex;
            const isCurrent = idx === activeStepIndex;

            return (
              <div
                key={step.id}
                className="relative z-10 flex flex-col items-center group cursor-default"
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[11px] font-bold border-2 transition-colors ${
                    isCurrent
                      ? 'bg-blue-600 border-slate-950 text-white'
                      : isCompleted
                      ? 'bg-slate-900 border-blue-500 text-blue-400'
                      : 'bg-slate-950 border-slate-800 text-slate-600'
                  }`}
                >
                  {idx + 1}
                </div>
                <span
                  className={`text-[11px] font-mono mt-1.5 transition-colors ${
                    isCurrent
                      ? 'text-blue-400 font-semibold'
                      : isCompleted
                      ? 'text-slate-300'
                      : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Incident Summary Card */}
      <div className="bg-slate-900 border border-slate-800/60 rounded-md p-4 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>INCIDENT OVERVIEW & SCOPE</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          Incident <strong className="text-slate-100 font-mono">{incident.incident_id}</strong> represents a cluster of{' '}
          <strong className="text-slate-100 font-mono">{incident.event_ids.length} telemetry events</strong> recorded within the time window{' '}
          <span className="font-mono text-slate-200">{getTimeWindow()}</span>. Initial detection identified multi-stage suspicious activity including authentication anomalies and access shifts.
        </p>
        <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500 pt-0.5">
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-500" />
            Events: <strong className="text-slate-300">{incident.event_ids.length}</strong>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            Time window: <strong className="text-slate-300">{getTimeWindow()}</strong>
          </span>
        </div>
      </div>

      {/* Two-Column Main Layout: Timeline (Left) & Priority Breakdown (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Vertical Event Timeline (2 Columns) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800/60 rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                TELEMETRY TIMELINE
              </h2>
              <span className="text-xs font-mono px-2 py-0.2 rounded-md bg-slate-950 text-slate-400 border border-slate-800">
                {timeline.length} events
              </span>
            </div>
            <span className="text-xs text-slate-500 font-mono">Click item to inspect details</span>
          </div>

          <Timeline events={timeline} />
        </div>

        {/* Investigation Priority Breakdown (1 Column) */}
        <div className="space-y-5">
          <PriorityBreakdown score={incident.priority} />
        </div>
      </div>

      {/* Ordered Sections: Evidence Panel → Correlation Graph → AI Explanation → Audit Trail */}
      <div className="space-y-5 pt-3 border-t border-slate-800/60">
        {/* 1. Evidence Panel */}
        <EvidencePanel incidentId={currentIncidentId} />

        {/* 2. Correlation Graph */}
        <CorrelationGraph incidentId={currentIncidentId} />

        {/* 3. AI Explanation */}
        <AIExplanation incidentId={currentIncidentId} />

        {/* 4. Audit Trail */}
        <AuditTrail incidentId={currentIncidentId} />
      </div>
    </div>
  );
};

export default IncidentDetail;
