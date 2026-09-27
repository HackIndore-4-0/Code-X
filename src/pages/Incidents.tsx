import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  AlertCircle,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  Clock,
  X,
  Filter,
} from 'lucide-react';
import { getIncidents } from '../services/incidents';
import type { Incident } from '../types/incident';
import StatusBadge from '../components/incidents/StatusBadge';
import { NumberTicker } from '@/registry/magicui/number-ticker';


type FilterTab = 'All' | 'High' | 'Investigating' | 'Unresolved';
type SortField = 'priority' | 'updated_at';
type SortDirection = 'asc' | 'desc';

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    if (isNaN(diffMs) || diffMs < 0) {
      return date.toLocaleDateString();
    }

    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return 'just now';
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  } catch {
    return dateString;
  }
}

function extractEntity(incident: Incident): string {
  const match = incident.title.match(/USR-\d+/i);
  if (match) return match[0].toUpperCase();
  return 'USR-101';
}

export const Incidents: React.FC = () => {
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const fetchIncidentsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getIncidents();
      if (!res.success) {
        throw new Error(res.error?.message || 'Failed to fetch incidents list');
      }
      setIncidents(res.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while loading incidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const res = await getIncidents();
        if (!isMounted) return;
        if (!res.success) {
          throw new Error(res.error?.message || 'Failed to fetch incidents list');
        }
        setIncidents(res.data || []);
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'An error occurred while loading incidents');
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

  const tabCounts = useMemo(() => {
    return {
      All: incidents.length,
      High: incidents.filter((i) => i.status === 'HIGH_PRIORITY' || i.priority >= 70).length,
      Investigating: incidents.filter(
        (i) => i.status === 'INCIDENT_CANDIDATE' || i.status === 'CONFIRMED'
      ).length,
      Unresolved: incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'DISMISSED').length,
    };
  }, [incidents]);

  const filteredIncidents = useMemo(() => {
    return incidents
      .filter((inc) => {
        if (activeTab === 'High' && !(inc.status === 'HIGH_PRIORITY' || inc.priority >= 70)) {
          return false;
        }
        if (
          activeTab === 'Investigating' &&
          !(inc.status === 'INCIDENT_CANDIDATE' || inc.status === 'CONFIRMED')
        ) {
          return false;
        }
        if (
          activeTab === 'Unresolved' &&
          (inc.status === 'RESOLVED' || inc.status === 'DISMISSED')
        ) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesId = inc.incident_id.toLowerCase().includes(q);
          const matchesTitle = inc.title.toLowerCase().includes(q);
          const matchesStatus = inc.status.toLowerCase().includes(q);
          if (!matchesId && !matchesTitle && !matchesStatus) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortField === 'priority') {
          comp = a.priority - b.priority;
        } else if (sortField === 'updated_at') {
          comp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        }
        return sortDirection === 'asc' ? comp : -comp;
      });
  }, [incidents, activeTab, searchQuery, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getPriorityPill = (score: number) => {
    const isCritical = score >= 70;
    const isWarning = score >= 40;

    return (
      <div className="flex items-center gap-2">
        <span
          className={`px-1.5 py-0.5 rounded-sm font-code-sm font-bold border ${
            isCritical
              ? 'bg-error-container/20 text-error border-error/40'
              : isWarning
              ? 'bg-secondary-container/20 text-secondary border-secondary/40'
              : 'bg-primary-container/20 text-primary border-primary/40'
          }`}
        >
          <NumberTicker value={score} />
        </span>
        <div className="w-12 h-1 rounded-sm bg-surface-container-highest overflow-hidden hidden sm:block">
          <div
            className={`h-full rounded-sm ${
              isCritical ? 'bg-error' : isWarning ? 'bg-secondary' : 'bg-primary'
            }`}
            style={{ width: `${Math.min(100, score)}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="p-5 space-y-5 max-w-7xl mx-auto font-body-md text-on-surface">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-headline-lg text-on-surface">Incidents</h1>
            <span className="font-label-sm px-2 py-0.5 rounded-sm bg-primary-container/20 text-primary border border-primary/40">
              <NumberTicker value={incidents.length} /> Total
            </span>
          </div>
          <p className="font-body-sm text-on-surface-variant mt-1">
            Security incident queue, threat triage, and active response management.
          </p>
        </div>

        <button
          onClick={fetchIncidentsData}
          disabled={loading}
          className="btn-ghost flex items-center gap-1.5 font-code-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="rounded-md p-3 flex items-center justify-between gap-4 font-code-sm bg-error-container/20 border border-error/40 text-error">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <div>
              <p className="font-semibold">Unable to fetch incidents queue</p>
              <p className="text-[11px] mt-0.5 text-error/80">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchIncidentsData}
            className="px-2.5 py-1 rounded-sm font-code-sm bg-error-container text-on-error-container border border-error cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Control Bar: Tabs + Search ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl font-code-sm bg-surface-container-lowest border border-outline-variant/70 shadow-lg shadow-black/40">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {(['All', 'High', 'Investigating', 'Unresolved'] as FilterTab[]).map((tab) => {
            const count = tabCounts[tab];
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-surface-container-high border border-primary text-primary'
                    : 'bg-transparent border border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    isActive
                      ? 'bg-primary-container/30 text-primary'
                      : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant'
                  }`}
                >
                  <NumberTicker value={count} />
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by ID, title, status..."
            className="w-full pl-8 pr-7 py-1.5 font-code-sm rounded-lg bg-surface-container-low border border-outline-variant text-on-surface focus:border-primary focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Table Panel ── */}
      <div className="rounded-xl overflow-hidden font-code-sm bg-surface-container-lowest border border-outline-variant/70 shadow-lg shadow-black/40">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="h-10 rounded-sm bg-surface-container-high animate-pulse"
              />
            ))}
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="py-12 text-center space-y-2 px-4 font-code-sm">
            <Filter className="w-10 h-10 mx-auto text-on-surface-variant" />
            <div>
              <h3 className="font-headline-sm text-on-surface">No incidents match active filters</h3>
              <p className="font-body-sm text-on-surface-variant mt-0.5 max-w-sm mx-auto">
                Reset search query or filter tab.
              </p>
            </div>
            {(searchQuery || activeTab !== 'All') && (
              <button
                onClick={() => { setSearchQuery(''); setActiveTab('All'); }}
                className="btn-ghost mt-2"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="font-label-sm bg-surface-container-lowest border-b border-outline-variant text-on-surface-variant">
                  <th className="py-2.5 px-3.5 font-semibold">Incident ID</th>
                  <th className="py-2.5 px-3.5 font-semibold">Title</th>
                  <th className="py-2.5 px-3.5 font-semibold">Status</th>
                  <th
                    className="py-2.5 px-3.5 font-semibold cursor-pointer select-none hover:text-primary transition-colors"
                    onClick={() => toggleSort('priority')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Priority</span>
                      {sortField === 'priority' ? (
                        sortDirection === 'desc'
                          ? <ArrowDown className="w-3 h-3 text-primary" />
                          : <ArrowUp className="w-3 h-3 text-primary" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-on-surface-variant" />
                      )}
                    </div>
                  </th>
                  <th className="py-2.5 px-3.5 font-semibold">Entity</th>
                  <th className="py-2.5 px-3.5 font-semibold text-center">Events</th>
                  <th
                    className="py-2.5 px-3.5 font-semibold cursor-pointer select-none hover:text-primary transition-colors text-right"
                    onClick={() => toggleSort('updated_at')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Updated</span>
                      {sortField === 'updated_at' ? (
                        sortDirection === 'desc'
                          ? <ArrowDown className="w-3 h-3 text-primary" />
                          : <ArrowUp className="w-3 h-3 text-primary" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-on-surface-variant" />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map((inc) => {
                  const entity = extractEntity(inc);
                  return (
                    <tr
                      key={inc.incident_id}
                      onClick={() => navigate(`/incidents/${inc.incident_id}`)}
                      className="cursor-pointer group hover:bg-surface-container-high/60 transition-colors border-b border-outline-variant/40"
                    >
                      <td className="py-2.5 px-3.5 font-code-sm font-semibold text-primary group-hover:underline">
                        {inc.incident_id}
                      </td>
                      <td className="py-2.5 px-3.5 font-body-sm font-medium text-on-surface max-w-sm truncate">
                        {inc.title}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <StatusBadge status={inc.status} />
                      </td>
                      <td className="py-2.5 px-3.5">{getPriorityPill(inc.priority)}</td>
                      <td className="py-2.5 px-3.5">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm font-code-sm bg-surface-container-low border border-outline-variant text-on-surface">
                          <User className="w-3 h-3 text-on-surface-variant" />
                          {entity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-code-sm bg-surface-container-low border border-outline-variant text-on-surface">
                          <Layers className="w-3 h-3 text-on-surface-variant" />
                          <NumberTicker value={inc.event_ids.length} />
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-code-sm text-on-surface-variant">
                        <span className="inline-flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3 text-on-surface-variant" />
                          {formatRelativeTime(inc.updated_at)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Incidents;
