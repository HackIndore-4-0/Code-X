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
import { NumberTicker } from '@/registry/magicui/number-ticker';


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

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
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
    <div className="p-5 space-y-5 max-w-7xl mx-auto relative font-body-md text-on-surface">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-headline-lg text-on-surface">Telemetry Events</h1>
            <span className="font-label-sm px-2 py-0.5 rounded-sm bg-primary-container/20 text-primary border border-primary/40">
              <NumberTicker value={events.length} /> Streamed
            </span>
          </div>
          <p className="font-body-sm text-on-surface-variant mt-1">
            Normalized security log stream, user activity logs, and raw event parameters.
          </p>
        </div>

        <button
          onClick={fetchEventsData}
          disabled={loading}
          className="btn-ghost flex items-center gap-1.5 font-code-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Global Error Banner ── */}
      {error && (
        <div className="rounded-md p-3 flex items-center justify-between gap-4 font-code-sm bg-error-container/20 border border-error/40 text-error">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <div>
              <p className="font-semibold">Unable to fetch telemetry events</p>
              <p className="text-[11px] text-error/80 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchEventsData}
            className="px-2.5 py-1 rounded-sm font-code-sm bg-error-container text-on-error-container border border-error cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Control Bar: Search Input ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl font-code-sm bg-surface-container-lowest border border-outline-variant/70 shadow-lg shadow-black/40">
        <div className="flex items-center gap-2 text-on-surface-variant font-code-sm">
          <Activity className="w-3.5 h-3.5 text-primary" />
          <span>
            Showing <NumberTicker value={paginatedEvents.length} /> of <NumberTicker value={filteredEvents.length} /> filtered events
          </span>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search user, device, type..."
            className="w-full pl-8 pr-7 py-1.5 font-code-sm rounded-lg bg-surface-container-low border border-outline-variant text-on-surface focus:border-primary focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── Events Table Container ── */}
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
        ) : filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant font-code-sm space-y-1.5">
            <Activity className="w-8 h-8 mx-auto text-on-surface-variant" />
            <p className="font-headline-sm text-on-surface">No telemetry events match query</p>
            <p className="font-body-sm">Clear search filter to inspect log entries.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="font-label-sm bg-surface-container-lowest border-b border-outline-variant text-on-surface-variant">
                  <th className="py-2.5 px-3.5 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-3.5 font-semibold">Event Type</th>
                  <th className="py-2.5 px-3.5 font-semibold">User ID</th>
                  <th className="py-2.5 px-3.5 font-semibold">Device ID</th>
                  <th className="py-2.5 px-3.5 font-semibold">Resource</th>
                  <th className="py-2.5 px-3.5 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEvents.map((evt) => {
                  const isAnomaly =
                    ANOMALY_EVENT_TYPES.includes(evt.event_type) || evt.metadata?.anomaly === true;

                  return (
                    <tr
                      key={evt.event_id}
                      onClick={() => setSelectedEvent(evt)}
                      className="cursor-pointer group hover:bg-surface-container-high/60 transition-colors border-b border-outline-variant/40"
                    >
                      <td className="py-2.5 px-3.5 flex items-center gap-1.5 text-on-surface-variant font-code-sm">
                        <Clock className="w-3 h-3 text-on-surface-variant" />
                        {formatTimestamp(evt.timestamp)}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded-sm font-code-sm font-semibold border ${
                            isAnomaly
                              ? 'bg-secondary-container/20 text-secondary border-secondary/40'
                              : 'bg-surface-container-high text-on-surface border-outline-variant'
                          }`}
                        >
                          {evt.event_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-on-surface font-code-sm">
                        {evt.user_id ? (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-on-surface-variant" />
                            <span className="text-primary">{evt.user_id}</span>
                          </span>
                        ) : (
                          <span className="text-on-surface-variant">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-on-surface font-code-sm">
                        {evt.device_id ? (
                          <span className="flex items-center gap-1">
                            <Monitor className="w-3 h-3 text-on-surface-variant" />
                            {evt.device_id}
                          </span>
                        ) : (
                          <span className="text-on-surface-variant">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 max-w-xs truncate text-on-surface-variant font-code-sm">
                        {evt.resource ? (
                          <span className="px-1.5 py-0.5 rounded-sm border bg-surface-container-lowest border-outline-variant text-on-surface">
                            {evt.resource}
                          </span>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-code-sm">
                        {isAnomaly ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm font-label-sm bg-error-container/20 text-error border border-error/40">
                            <AlertTriangle className="w-3 h-3" />
                            ANOMALY
                          </span>
                        ) : (
                          <span className="font-label-sm text-on-surface-variant">
                            NORMAL
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination Bar ── */}
        {filteredEvents.length > PAGE_SIZE && (
          <div className="p-2.5 flex items-center justify-between font-code-sm bg-surface-container-lowest border-t border-outline-variant text-on-surface-variant">
            <span>
              Page <strong className="text-on-surface">{currentPage}</strong> of <strong className="text-on-surface">{totalPages}</strong>
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn-ghost p-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn-ghost p-1"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Slide-in Event Details Panel / Drawer ── */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex justify-end font-code-sm bg-surface-container-lowest/80 backdrop-blur-xs"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-full max-w-lg h-full p-5 space-y-5 overflow-y-auto bg-surface-container border-l border-outline-variant shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <div className="space-y-1">
                <span className="font-label-sm px-2 py-0.5 rounded-sm bg-primary-container/20 text-primary border border-primary/40">
                  {selectedEvent.event_id}
                </span>
                <h2 className="font-headline-sm text-on-surface uppercase">
                  {selectedEvent.event_type}
                </h2>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="btn-ghost p-1.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Event Field Details Grid */}
            <div className="space-y-3 font-code-sm">
              <div className="p-2.5 rounded-md space-y-0.5 bg-surface-container-lowest border border-outline-variant">
                <span className="font-label-sm text-on-surface-variant block">Timestamp</span>
                <p className="flex items-center gap-1.5 text-on-surface font-code-sm">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  {selectedEvent.timestamp}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-md space-y-0.5 bg-surface-container-lowest border border-outline-variant">
                  <span className="font-label-sm text-on-surface-variant block">User ID</span>
                  <p className="flex items-center gap-1.5 text-on-surface font-code-sm">
                    <User className="w-3.5 h-3.5 text-on-surface-variant" />
                    {selectedEvent.user_id || '-'}
                  </p>
                </div>

                <div className="p-2.5 rounded-md space-y-0.5 bg-surface-container-lowest border border-outline-variant">
                  <span className="font-label-sm text-on-surface-variant block">Device ID</span>
                  <p className="flex items-center gap-1.5 text-on-surface font-code-sm">
                    <Monitor className="w-3.5 h-3.5 text-on-surface-variant" />
                    {selectedEvent.device_id || '-'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-md space-y-0.5 bg-surface-container-lowest border border-outline-variant">
                  <span className="font-label-sm text-on-surface-variant block">IP Address</span>
                  <p className="flex items-center gap-1.5 text-on-surface font-code-sm">
                    <Globe className="w-3.5 h-3.5 text-on-surface-variant" />
                    {selectedEvent.ip_address || '-'}
                  </p>
                </div>

                <div className="p-2.5 rounded-md space-y-0.5 bg-surface-container-lowest border border-outline-variant">
                  <span className="font-label-sm text-on-surface-variant block">Location</span>
                  <p className="flex items-center gap-1.5 text-on-surface font-code-sm">
                    <MapPin className="w-3.5 h-3.5 text-on-surface-variant" />
                    {selectedEvent.location || '-'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-md space-y-0.5 bg-surface-container-lowest border border-outline-variant">
                  <span className="font-label-sm text-on-surface-variant block">Session ID</span>
                  <p className="flex items-center gap-1.5 text-on-surface font-code-sm">
                    <Terminal className="w-3.5 h-3.5 text-on-surface-variant" />
                    {selectedEvent.session_id || '-'}
                  </p>
                </div>

                <div className="p-2.5 rounded-md space-y-0.5 bg-surface-container-lowest border border-outline-variant">
                  <span className="font-label-sm text-on-surface-variant block">Action</span>
                  <p className="capitalize text-on-surface font-code-sm">
                    {selectedEvent.action || '-'}
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-md space-y-0.5 bg-surface-container-lowest border border-outline-variant">
                <span className="font-label-sm text-on-surface-variant block">Target Resource</span>
                <p className="flex items-center gap-1.5 text-on-surface font-code-sm">
                  <Database className="w-3.5 h-3.5 text-primary" />
                  {selectedEvent.resource || '-'}
                </p>
              </div>

              {/* Event Metadata */}
              {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                <div className="space-y-1 pt-1 font-code-sm">
                  <div className="flex items-center gap-1.5 font-label-sm text-on-surface-variant">
                    <FileCode className="w-3.5 h-3.5 text-primary" />
                    <span>Raw Event Metadata Payload</span>
                  </div>
                  <pre className="p-3 rounded-md font-code-sm overflow-x-auto bg-surface-container-lowest border border-outline-variant text-on-surface">
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
