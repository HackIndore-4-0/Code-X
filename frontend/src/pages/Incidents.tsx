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

// Extract entity / primary user ID from incident title or fallback
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

  // Filters & Sorting state
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

  // Compute tab counts
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

  // Filtered and Sorted Incidents
  const filteredIncidents = useMemo(() => {
    return incidents
      .filter((inc) => {
        // Tab Filtering
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

        // Search Query Filtering
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
    let colorClass = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    if (score >= 70) colorClass = 'text-red-400 bg-red-500/10 border-red-500/20';
    else if (score >= 40) colorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';

    return (
      <div className="flex items-center gap-2">
        <span className={`px-1.5 py-0.2 rounded text-[11px] font-mono font-bold border ${colorClass}`}>
          {score}
        </span>
        <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
          <div
            className={`h-full ${
              score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-amber-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(100, score)}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="p-5 space-y-5 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-100">Incidents</h1>
            <span className="text-[11px] font-mono px-2 py-0.2 rounded-md bg-slate-900 text-slate-400 border border-slate-800">
              {incidents.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Security incident queue, threat triage, and active response management.
          </p>
        </div>

        <button
          onClick={fetchIncidentsData}
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
              <p className="font-semibold">Unable to fetch incidents queue</p>
              <p className="text-[11px] text-red-400/80 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchIncidentsData}
            className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 rounded-md text-xs font-semibold transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Control Bar: Tabs + Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900 p-2.5 rounded-md border border-slate-800/60">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 font-mono">
          {(['All', 'High', 'Investigating', 'Unresolved'] as FilterTab[]).map((tab) => {
            const count = tabCounts[tab];
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white border border-blue-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`px-1 py-0.2 rounded text-[10px] ${
                    isActive
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-950 text-slate-500 border border-slate-800'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by ID, title, status..."
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

      {/* Main Incidents Table Panel */}
      <div className="bg-slate-900 border border-slate-800/60 rounded-md overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-10 bg-slate-800/40 rounded-md animate-pulse" />
            ))}
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="py-12 text-center space-y-2 px-4 font-mono">
            <Filter className="w-10 h-10 text-slate-600 mx-auto" />
            <div>
              <h3 className="text-sm font-medium text-slate-200">No incidents match active filters</h3>
              <p className="text-xs text-slate-500 mt-0.5 max-w-sm mx-auto">
                Reset search query or filter tab.
              </p>
            </div>
            {(searchQuery || activeTab !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveTab('All');
                }}
                className="mt-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md transition-colors cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[11px] tracking-wider border-b border-slate-800/80">
                <tr>
                  <th className="py-2.5 px-3.5 font-semibold">Incident ID</th>
                  <th className="py-2.5 px-3.5 font-semibold">Title</th>
                  <th className="py-2.5 px-3.5 font-semibold">Status</th>
                  <th
                    className="py-2.5 px-3.5 font-semibold cursor-pointer hover:text-slate-200 transition-colors select-none"
                    onClick={() => toggleSort('priority')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Priority</span>
                      {sortField === 'priority' ? (
                        sortDirection === 'desc' ? (
                          <ArrowDown className="w-3 h-3 text-blue-400" />
                        ) : (
                          <ArrowUp className="w-3 h-3 text-blue-400" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600" />
                      )}
                    </div>
                  </th>
                  <th className="py-2.5 px-3.5 font-semibold">Entity</th>
                  <th className="py-2.5 px-3.5 font-semibold text-center">Events</th>
                  <th
                    className="py-2.5 px-3.5 font-semibold cursor-pointer hover:text-slate-200 transition-colors select-none text-right"
                    onClick={() => toggleSort('updated_at')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Updated</span>
                      {sortField === 'updated_at' ? (
                        sortDirection === 'desc' ? (
                          <ArrowDown className="w-3 h-3 text-blue-400" />
                        ) : (
                          <ArrowUp className="w-3 h-3 text-blue-400" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-600" />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredIncidents.map((inc) => {
                  const entity = extractEntity(inc);
                  return (
                    <tr
                      key={inc.incident_id}
                      onClick={() => navigate(`/incidents/${inc.incident_id}`)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-2.5 px-3.5 font-mono font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                        {inc.incident_id}
                      </td>
                      <td className="py-2.5 px-3.5 font-medium text-slate-200 max-w-sm truncate">
                        {inc.title}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <StatusBadge status={inc.status} />
                      </td>
                      <td className="py-2.5 px-3.5">{getPriorityPill(inc.priority)}</td>
                      <td className="py-2.5 px-3.5 font-mono text-slate-300">
                        <span className="inline-flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300 text-xs">
                          <User className="w-3 h-3 text-slate-500" />
                          {entity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono">
                        <span className="inline-flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded text-slate-300 border border-slate-800 text-xs">
                          <Layers className="w-3 h-3 text-slate-500" />
                          {inc.event_ids.length}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-slate-400 text-xs">
                        <span className="inline-flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
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
