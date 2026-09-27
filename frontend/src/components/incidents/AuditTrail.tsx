import React, { useEffect, useState } from 'react';
import { FileText, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { getIncidentAudit } from '../../services/incidents';
import type { AuditLogEntry } from '../../types/incident';

interface AuditTrailProps {
  incidentId?: string;
  entries?: AuditLogEntry[];
  title?: string;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export const AuditTrail: React.FC<AuditTrailProps> = ({
  incidentId,
  entries: propEntries,
  title = 'Audit Trail Log',
  loading: propLoading,
  error: propError,
  onRefresh,
}) => {
  const [fetchedLogs, setFetchedLogs] = useState<AuditLogEntry[]>([]);
  const [internalLoading, setInternalLoading] = useState<boolean>(!propEntries && !!incidentId);
  const [internalError, setInternalError] = useState<string | null>(null);

  const fetchAuditLogs = async () => {
    if (!incidentId) return;
    setInternalLoading(true);
    setInternalError(null);
    try {
      const res = await getIncidentAudit(incidentId);
      if (!res.success) {
        throw new Error(res.error?.message || 'Failed to load audit logs');
      }
      setFetchedLogs(res.data || []);
    } catch (err: unknown) {
      setInternalError(err instanceof Error ? err.message : 'Error fetching audit logs');
    } finally {
      setInternalLoading(false);
    }
  };

  useEffect(() => {
    if (propEntries || !incidentId) return;
    let isMounted = true;

    async function init() {
      try {
        const res = await getIncidentAudit(incidentId!);
        if (!isMounted) return;
        if (!res.success) {
          throw new Error(res.error?.message || 'Failed to load audit logs');
        }
        setFetchedLogs(res.data || []);
      } catch (err: unknown) {
        if (isMounted) {
          setInternalError(err instanceof Error ? err.message : 'Error fetching audit logs');
        }
      } finally {
        if (isMounted) {
          setInternalLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [incidentId, propEntries]);

  const auditLogs = propEntries ?? fetchedLogs;
  const isLoading = propLoading ?? internalLoading;
  const displayError = propError ?? internalError;

  const handleRefreshClick = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      fetchAuditLogs();
    }
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}`;
    } catch {
      return isoString;
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATED')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (action.includes('UPDATED')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (action.includes('STATUS')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    return 'bg-slate-800 text-slate-300 border-slate-700/60';
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800/60 rounded-md p-4 space-y-2.5 animate-pulse">
        <div className="h-4 w-32 bg-slate-800 rounded" />
        <div className="space-y-1.5">
          <div className="h-9 bg-slate-800/40 rounded-md" />
          <div className="h-9 bg-slate-800/40 rounded-md" />
        </div>
      </div>
    );
  }

  if (displayError) {
    return (
      <div className="bg-slate-900 border border-slate-800/60 rounded-md p-3 flex items-center justify-between text-xs text-red-400 font-mono">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Audit trail failed: {displayError}</span>
        </div>
        <button
          onClick={handleRefreshClick}
          className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 rounded-md font-medium cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800/60 rounded-md p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" />
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">{title}</h2>
          <span className="text-xs font-mono px-2 py-0.2 rounded-md bg-slate-950 text-slate-400 border border-slate-800">
            {auditLogs.length} Entries
          </span>
        </div>
        <button
          onClick={handleRefreshClick}
          className="text-xs font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* System Log Console view */}
      {auditLogs.length === 0 ? (
        <div className="p-4 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800/80 rounded-md bg-slate-950/40">
          No audit log entries recorded.
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800/80 rounded-md p-2.5 font-mono text-xs space-y-2 max-h-[440px] overflow-y-auto">
          {auditLogs.map((log, idx) => (
            <div
              key={idx}
              className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 p-2 rounded-md bg-slate-900/60 border border-slate-800/60 hover:border-slate-700/60 transition-colors"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-600" />
                    {formatTimestamp(log.timestamp)}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${getActionBadgeColor(
                      log.action
                    )}`}
                  >
                    {log.action}
                  </span>
                </div>
                <p className="text-slate-300 text-xs font-sans leading-normal">
                  {log.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditTrail;
