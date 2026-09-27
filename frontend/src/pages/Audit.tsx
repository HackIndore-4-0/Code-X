import React, { useEffect, useState, useMemo } from 'react';
import { Search, RefreshCw, AlertCircle, X, FileText } from 'lucide-react';
import { getAuditLog } from '../services/audit';
import type { AuditLogEntry } from '../types/incident';
import AuditTrail from '../components/incidents/AuditTrail';

export const Audit: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchAuditData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAuditLog();
      if (!res.success || !res.data) {
        throw new Error(res.error?.message || 'Failed to fetch system audit logs');
      }
      setLogs(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const res = await getAuditLog();
        if (!isMounted) return;
        if (!res.success || !res.data) {
          throw new Error(res.error?.message || 'Failed to fetch system audit logs');
        }
        setLogs(res.data);
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error loading audit logs');
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
  }, []);

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase().trim();
    return logs.filter(
      (log) =>
        log.action.toLowerCase().includes(q) ||
        log.description.toLowerCase().includes(q) ||
        log.timestamp.toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  return (
    <div className="p-5 space-y-5 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-100">Audit Logs</h1>
            <span className="text-[11px] font-mono px-2 py-0.2 rounded-md bg-slate-900 text-slate-400 border border-slate-800">
              {logs.length} System Records
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            System-wide audit trail recording analyst actions, automated state changes, and pipeline triggers.
          </p>
        </div>

        <button
          onClick={fetchAuditData}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 rounded-md transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-auto font-mono"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3 flex items-center justify-between gap-4 text-red-400 text-xs font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <div>
              <p className="font-semibold">Unable to fetch system audit logs</p>
              <p className="text-[11px] text-red-400/80 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchAuditData}
            className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 rounded-md text-xs font-semibold transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Control Bar: Search Input */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-2.5 rounded-md border border-slate-800/60 font-mono">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          <span>Showing {filteredLogs.length} of {logs.length} audit entries</span>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, description..."
            className="w-full pl-8 pr-7 py-1 text-xs bg-slate-950 border border-slate-800 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700 transition-colors font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Audit Trail Component */}
      <AuditTrail
        title="SYSTEM AUDIT CONSOLE LOG"
        entries={filteredLogs}
        loading={loading}
        error={error}
        onRefresh={fetchAuditData}
      />
    </div>
  );
};

export default Audit;
