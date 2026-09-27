import React, { useEffect, useState, useMemo } from 'react';
import {
  Activity,
  Search,
  RefreshCw,
  AlertCircle,
  Clock,
  User,
  Monitor,
  Globe,
  MapPin,
  Database,
  Terminal,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileCode,
} from 'lucide-react';
import { getEvents } from '../services/events';
import type { NormalizedEvent, EventType } from '../types/event';

const ANOMALY_EVENT_TYPES: EventType[] = [
  'mfa_failure',
  'new_device',
  'new_location',
  'privilege_change',
  'large_transfer',
  'admin_action',
];

const PAGE_SIZE = 10;

export const Events: React.FC = () => {
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Pagination state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Drawer state
  const [selectedEvent, setSelectedEvent] = useState<NormalizedEvent | null>(null);

  const fetchEventsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getEvents();
      if (!res.success || !res.data) {
        throw new Error(res.error?.message || 'Failed to fetch telemetry events');
      }
      setEvents(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const res = await getEvents();
        if (!isMounted) return;
        if (!res.success || !res.data) {
          throw new Error(res.error?.message || 'Failed to fetch telemetry events');
        }
        setEvents(res.data);
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error fetching events');
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

  // Filtered Events
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase().trim();
    return events.filter((evt) => {
      const matchType = evt.event_type.toLowerCase().includes(q);
      const matchUser = evt.user_id?.toLowerCase().includes(q);
      const matchDevice = evt.device_id?.toLowerCase().includes(q);
      const matchResource = evt.resource?.toLowerCase().includes(q);
      const matchAction = evt.action?.toLowerCase().includes(q);
      return matchType || matchUser || matchDevice || matchResource || matchAction;
    });
  }, [events, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEvents.slice(start, start + PAGE_SIZE);
  }, [filteredEvents, currentPage]);

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return `${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="p-5 space-y-5 max-w-7xl mx-auto relative">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-100">Telemetry Events</h1>
            <span className="text-[11px] font-mono px-2 py-0.2 rounded-md bg-slate-900 text-slate-400 border border-slate-800">
              {events.length} Streamed
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Normalized security log stream, user activity logs, and raw event parameters.
          </p>
        </div>

        <button
          onClick={fetchEventsData}
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
              <p className="font-semibold">Unable to fetch telemetry events</p>
              <p className="text-[11px] text-red-400/80 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchEventsData}
            className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 rounded-md text-xs font-semibold transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Control Bar: Search Input */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-2.5 rounded-md border border-slate-800/60 font-mono">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          <span>
            Showing {paginatedEvents.length} of {filteredEvents.length} filtered events
          </span>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search user, device, type..."
            className="w-full pl-8 pr-7 py-1 text-xs bg-slate-950 border border-slate-800 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700 transition-colors font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Events Table Container */}
      <div className="bg-slate-900 border border-slate-800/60 rounded-md overflow-hidden font-mono">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-9 bg-slate-800/40 rounded-md animate-pulse" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 space-y-1.5">
            <Activity className="w-8 h-8 text-slate-600 mx-auto mb-1" />
            <p className="text-slate-300 font-semibold">No telemetry events match query</p>
            <p className="text-[11px]">Clear search filter to inspect log entries.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800/80">
                <tr>
                  <th className="py-2.5 px-3.5 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-3.5 font-semibold">Event Type</th>
                  <th className="py-2.5 px-3.5 font-semibold">User ID</th>
                  <th className="py-2.5 px-3.5 font-semibold">Device ID</th>
                  <th className="py-2.5 px-3.5 font-semibold">Resource</th>
                  <th className="py-2.5 px-3.5 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {paginatedEvents.map((evt) => {
                  const isAnomaly =
                    ANOMALY_EVENT_TYPES.includes(evt.event_type) || evt.metadata?.anomaly === true;

                  return (
                    <tr
                      key={evt.event_id}
                      onClick={() => setSelectedEvent(evt)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-2 px-3.5 text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {formatTimestamp(evt.timestamp)}
                      </td>
                      <td className="py-2 px-3.5">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded text-[11px] font-semibold border ${
                            isAnomaly
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {evt.event_type}
                        </span>
                      </td>
                      <td className="py-2 px-3.5 text-slate-200">
                        {evt.user_id ? (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-500" />
                            {evt.user_id}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3.5 text-slate-300">
                        {evt.device_id ? (
                          <span className="flex items-center gap-1">
                            <Monitor className="w-3 h-3 text-slate-500" />
                            {evt.device_id}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3.5 text-slate-400 max-w-xs truncate">
                        {evt.resource ? (
                          <span className="bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                            {evt.resource}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3.5 text-right">
                        {isAnomaly ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            ANOMALY
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 uppercase">NORMAL</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredEvents.length > PAGE_SIZE && (
          <div className="p-2.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-md bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-md bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-in Event Details Panel / Drawer */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex justify-end font-mono">
          <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800/80 h-full p-5 space-y-5 overflow-y-auto">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <div className="space-y-1">
                <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 font-bold">
                  {selectedEvent.event_id}
                </span>
                <h2 className="text-base font-bold text-slate-100 uppercase">
                  {selectedEvent.event_type}
                </h2>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Event Field Details Grid */}
            <div className="space-y-3 text-xs">
              <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-md space-y-0.5">
                <span className="text-[9px] uppercase text-slate-500">Timestamp</span>
                <p className="text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {selectedEvent.timestamp}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-md space-y-0.5">
                  <span className="text-[9px] uppercase text-slate-500">User ID</span>
                  <p className="text-slate-200 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    {selectedEvent.user_id || '-'}
                  </p>
                </div>

                <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-md space-y-0.5">
                  <span className="text-[9px] uppercase text-slate-500">Device ID</span>
                  <p className="text-slate-200 flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-slate-500" />
                    {selectedEvent.device_id || '-'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-md space-y-0.5">
                  <span className="text-[9px] uppercase text-slate-500">IP Address</span>
                  <p className="text-slate-200 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-500" />
                    {selectedEvent.ip_address || '-'}
                  </p>
                </div>

                <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-md space-y-0.5 font-sans">
                  <span className="text-[9px] uppercase font-mono text-slate-500">Location</span>
                  <p className="text-slate-200 flex items-center gap-1.5 font-mono">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {selectedEvent.location || '-'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-md space-y-0.5">
                  <span className="text-[9px] uppercase text-slate-500">Session ID</span>
                  <p className="text-slate-200 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-slate-500" />
                    {selectedEvent.session_id || '-'}
                  </p>
                </div>

                <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-md space-y-0.5">
                  <span className="text-[9px] uppercase text-slate-500">Action</span>
                  <p className="text-slate-200 capitalize">
                    {selectedEvent.action || '-'}
                  </p>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-md space-y-0.5">
                <span className="text-[9px] uppercase text-slate-500">Target Resource</span>
                <p className="text-slate-200 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-500" />
                  {selectedEvent.resource || '-'}
                </p>
              </div>

              {/* Event Metadata */}
              {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-slate-500">
                    <FileCode className="w-3.5 h-3.5 text-slate-500" />
                    <span>Raw Event Metadata Payload</span>
                  </div>
                  <pre className="p-3 bg-slate-950 border border-slate-800/80 rounded-md text-xs font-mono text-slate-300 overflow-x-auto">
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
