import React, { useEffect, useState, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  AlertCircle,
  X,
  FileText,
  Clock,
  UserCheck,
  ShieldAlert,
  Activity,
  CheckCircle2,
  Filter,
  User,
  Cpu,
  Terminal,
} from 'lucide-react';
import { getAuditLog } from '../services/audit';
import type { AuditLogEntry } from '../types/incident';
import { NumberTicker } from '@/registry/magicui/number-ticker';

type AuditFilterCategory = 'ALL' | 'ANALYST' | 'STATE' | 'PIPELINE';

export const Audit: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<AuditFilterCategory>('ALL');

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

  const getCategory = (log: AuditLogEntry): AuditFilterCategory => {
    const act = log.action.toUpperCase();
    if (
      act.includes('ANALYST') ||
      act.includes('RESOLV') ||
      act.includes('DISMISS') ||
      act.includes('INVESTIGAT') ||
      act.includes('CONFIRM') ||
      act.includes('ESCALAT')
    ) {
      return 'ANALYST';
    }
    if (
      act.includes('STATUS') ||
      act.includes('STATE') ||
      act.includes('PRIORITY') ||
      act.includes('CANDIDATE')
    ) {
      return 'STATE';
    }
    return 'PIPELINE';
  };

  const stats = useMemo(() => {
    const total = logs.length;
    let analyst = 0;
    let state = 0;
    let pipeline = 0;

    logs.forEach((l) => {
      const cat = getCategory(l);
      if (cat === 'ANALYST') analyst++;
      else if (cat === 'STATE') state++;
      else pipeline++;
    });

    return { total, analyst, state, pipeline };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedCategory !== 'ALL') {
        if (getCategory(log) !== selectedCategory) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchAction = log.action.toLowerCase().includes(q);
        const matchDesc = log.description.toLowerCase().includes(q);
        const matchTime = log.timestamp.toLowerCase().includes(q);
        const isAnalyst = getCategory(log) === 'ANALYST';
        const matchActor = isAnalyst ? 'analyst'.includes(q) : 'system engine'.includes(q);
        return matchAction || matchDesc || matchTime || matchActor;
      }

      return true;
    });
  }, [logs, selectedCategory, searchQuery]);

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

  const getActionBadgeStyle = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('RESOLV')) {
      return 'bg-secondary-container/20 text-secondary border-secondary/40';
    }
    if (act.includes('DISMISS')) {
      return 'bg-surface-container-high text-on-surface-variant border-outline-variant';
    }
    if (act.includes('STATUS') || act.includes('STATE') || act.includes('PRIORITY')) {
      return 'bg-tertiary-container/20 text-tertiary border-tertiary/40';
    }
    if (act.includes('ANALYST') || act.includes('INVESTIGAT') || act.includes('CONFIRM') || act.includes('ESCALAT')) {
      return 'bg-primary-container/20 text-primary border-primary/40';
    }
    return 'bg-primary-container/20 text-primary border-primary/40';
  };

  return (
    <div className="p-5 sm:p-6 space-y-6 max-w-7xl mx-auto min-h-screen font-body-md text-on-surface">
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-outline-variant">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="font-label-sm px-2 py-0.5 rounded-sm bg-primary-container/20 text-primary border border-primary/40">
              SOC AUDIT TRAIL
            </span>
            <div className="flex items-center gap-1.5 font-code-sm text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span>Audit Logging Active</span>
            </div>
          </div>
          <h1 className="font-headline-lg text-on-surface">
            System Audit Logs
          </h1>
          <p className="font-body-sm text-on-surface-variant max-w-3xl">
            Comprehensive activity and operations log capturing analyst triage verdicts, automated status transitions, anomaly correlations, and pipeline trigger telemetry.
          </p>
        </div>

        <button
          onClick={fetchAuditData}
          disabled={loading}
          className="btn-primary self-start md:self-center font-code-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Refreshing...' : 'Refresh Records'}</span>
        </button>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 font-code-sm">
        {/* Total Records */}
        <div className="p-4 rounded-xl space-y-2 bg-surface-container-lowest border border-outline-variant/70 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-on-surface-variant">
              Total Log Entries
            </span>
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-on-surface font-mono">
              <NumberTicker value={stats.total} />
            </span>
            <span className="font-code-sm text-on-surface-variant">RECORDS</span>
          </div>
        </div>

        {/* Analyst Actions */}
        <div className="p-4 rounded-xl space-y-2 bg-surface-container-lowest border border-outline-variant/70 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-on-surface-variant">
              Analyst Actions
            </span>
            <UserCheck className="w-4 h-4 text-secondary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-on-surface font-mono">
              <NumberTicker value={stats.analyst} />
            </span>
            <span className="font-code-sm text-secondary">TRIAGE EVENTS</span>
          </div>
        </div>

        {/* State Transitions */}
        <div className="p-4 rounded-xl space-y-2 bg-surface-container-lowest border border-outline-variant/70 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-on-surface-variant">
              State & Priority
            </span>
            <ShieldAlert className="w-4 h-4 text-tertiary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-on-surface font-mono">
              <NumberTicker value={stats.state} />
            </span>
            <span className="font-code-sm text-tertiary">MUTATIONS</span>
          </div>
        </div>

        {/* Pipeline & Telemetry */}
        <div className="p-4 rounded-xl space-y-2 bg-surface-container-lowest border border-outline-variant/70 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-on-surface-variant">
              Pipeline Telemetry
            </span>
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-on-surface font-mono">
              <NumberTicker value={stats.pipeline} />
            </span>
            <span className="font-code-sm text-primary">NORMALIZED</span>
          </div>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="rounded-xl p-4 flex items-center justify-between gap-4 font-code-sm bg-error-container/20 border border-error/40 text-error">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Failed to synchronize audit records</p>
              <p className="text-[11px] text-error/80 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchAuditData}
            className="px-3 py-1.5 rounded-lg font-code-sm bg-error-container text-on-error-container border border-error cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* ── Filter & Search Toolbar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 p-3 rounded-xl font-code-sm bg-surface-container-lowest border border-outline-variant/70 shadow-lg shadow-black/40">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(
            [
              { id: 'ALL', label: 'All Records', count: stats.total },
              { id: 'ANALYST', label: 'Analyst Actions', count: stats.analyst },
              { id: 'STATE', label: 'State & Priority', count: stats.state },
              { id: 'PIPELINE', label: 'Pipeline / Triggers', count: stats.pipeline },
            ] as const
          ).map((tab) => {
            const isActive = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-surface-container-high border border-primary text-primary'
                    : 'bg-transparent border border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                    isActive
                      ? 'bg-primary-container/30 text-primary'
                      : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant'
                  }`}
                >
                  <NumberTicker value={tab.count} />
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, entity ID, description..."
            className="w-full pl-9 pr-8 py-1.5 font-code-sm rounded-lg bg-surface-container-low border border-outline-variant text-on-surface focus:border-primary focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Audit Table Console ── */}
      <div className="rounded-xl overflow-hidden font-code-sm bg-surface-container-lowest border border-outline-variant/70 shadow-lg shadow-black/40">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-12 rounded-sm bg-surface-container-high animate-pulse"
              />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4 font-code-sm">
            <Filter className="w-12 h-12 mx-auto text-on-surface-variant" />
            <div>
              <h3 className="font-headline-sm text-on-surface">
                No matching audit log records
              </h3>
              <p className="font-body-sm text-on-surface-variant mt-1 max-w-sm mx-auto">
                No events match current filter category or query term "{searchQuery}".
              </p>
            </div>
            {(searchQuery || selectedCategory !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                }}
                className="btn-ghost mt-2"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="font-label-sm bg-surface-container-lowest border-b border-outline-variant text-on-surface-variant">
                  <th className="py-3 px-4 w-48 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 w-52 font-semibold">Action / Event</th>
                  <th className="py-3 px-4 w-40 font-semibold">Actor / Origin</th>
                  <th className="py-3 px-4 font-semibold">Log Description / Context</th>
                  <th className="py-3 px-4 w-28 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, idx) => {
                  const badgeStyle = getActionBadgeStyle(log.action);
                  const isAnalyst = getCategory(log) === 'ANALYST';

                  return (
                    <tr
                      key={idx}
                      className="hover:bg-surface-container-high/60 transition-colors border-b border-outline-variant/40 font-code-sm"
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap text-on-surface-variant">
                        <div className="flex items-center gap-1.5 font-code-sm">
                          <Clock className="w-3.5 h-3.5 text-on-surface-variant" />
                          <span>{formatTimestamp(log.timestamp)}</span>
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-sm font-code-sm font-bold border tracking-wide ${badgeStyle}`}>
                          {log.action}
                        </span>
                      </td>

                      {/* Actor / Origin */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isAnalyst ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm font-code-sm bg-secondary-container/20 text-secondary border border-secondary/40">
                            <User className="w-3 h-3 text-secondary" />
                            <span>ANALYST</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm font-code-sm bg-primary-container/20 text-primary border border-primary/40">
                            <Terminal className="w-3 h-3 text-primary" />
                            <span>SYSTEM ENGINE</span>
                          </span>
                        )}
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 font-body-sm text-on-surface leading-relaxed">
                        <span className="font-code-sm">{log.description}</span>
                      </td>

                      {/* Log Status */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-label-sm px-1.5 py-0.5 rounded-sm text-secondary bg-secondary-container/20 border border-secondary/40">
                          <CheckCircle2 className="w-3 h-3" />
                          RECORDED
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Summary */}
        <div className="p-3 flex items-center justify-between font-code-sm bg-surface-container-lowest border-t border-outline-variant text-on-surface-variant">
          <span>
            Showing <strong className="text-on-surface"><NumberTicker value={filteredLogs.length} /></strong> of{' '}
            <strong className="text-on-surface"><NumberTicker value={logs.length} /></strong> total records
          </span>
          <div className="flex items-center gap-2 font-code-sm text-on-surface-variant">
            <Cpu className="w-3.5 h-3.5 text-primary" />
            <span>TraceX Autonomous Security Correlation Engine v2.4</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Audit;
