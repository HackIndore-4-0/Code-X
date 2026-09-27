import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Clock, User, HardDrive, AlertTriangle } from 'lucide-react';
import type { NormalizedEvent } from '../types/event';

interface TelemetryFeedProps {
  events: NormalizedEvent[];
  loading?: boolean;
  className?: string;
}

export const TelemetryFeed: React.FC<TelemetryFeedProps> = ({ events, loading = false, className = '' }) => {
  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return iso;
    }
  };

  const getPriorityTagStyle = (eventType: string, metadata?: Record<string, unknown>) => {
    if (['large_transfer', 'privilege_change', 'admin_action', 'mfa_failure'].includes(eventType) || metadata?.anomaly) {
      return {
        label: 'HIGH',
        style: 'bg-error-container/20 text-error border-error/40',
      };
    }
    if (['new_device', 'new_location', 'resource_access'].includes(eventType)) {
      return {
        label: 'MED',
        style: 'bg-secondary-container/20 text-secondary border-secondary/40',
      };
    }
    return {
      label: 'INFO',
      style: 'bg-surface-container-high text-on-surface-variant border-outline-variant',
    };
  };

  const formatExtraDetails = (evt: NormalizedEvent) => {
    if (evt.metadata?.bytes_transferred) return `${evt.metadata.bytes_transferred}`;
    if (evt.metadata?.file_size)          return `${evt.metadata.file_size}`;
    if (evt.resource)                     return evt.resource;
    if (evt.ip_address)                   return evt.ip_address;
    return evt.location || 'system';
  };

  return (
    <div className={`rounded-xl p-4 space-y-3 bg-surface-container-lowest border border-outline-variant/70 shadow-lg shadow-black/40 ${className}`}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-2.5 border-b border-outline-variant font-code-sm">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-secondary" />
          <h2 className="font-label-md text-on-surface">
            LIVE TELEMETRY STREAM
          </h2>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-secondary" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
          </span>
        </div>
        <span className="font-code-sm text-on-surface-variant">
          Auto-refresh stream
        </span>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className="h-11 rounded-md bg-surface-container-high animate-pulse border border-outline-variant"
            />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="py-10 text-center space-y-2 rounded-md font-code-sm border border-dashed border-outline-variant bg-surface-container-lowest">
          <AlertTriangle className="w-8 h-8 mx-auto text-on-surface-variant" />
          <p className="font-body-sm text-on-surface-variant">No telemetry events recorded</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1 font-code-sm">
          <AnimatePresence initial={false}>
            {events.slice(0, 15).map((evt) => {
              const tag = getPriorityTagStyle(evt.event_type, evt.metadata);
              const detail = formatExtraDetails(evt);

              return (
                <motion.div
                  key={evt.event_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-2.5 rounded-md font-code-sm text-xs flex items-center justify-between gap-2 bg-surface-container-lowest border border-outline-variant/60 hover:border-outline transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-code-sm text-on-surface-variant flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3 text-on-surface-variant" />
                      {formatTime(evt.timestamp)}
                    </span>
                    <span className="text-on-surface font-semibold truncate">{evt.event_type}</span>
                    <span className="text-outline-variant">·</span>
                    <span className="flex items-center gap-1 shrink-0 text-primary font-code-sm">
                      <User className="w-3 h-3 text-on-surface-variant" />
                      {evt.user_id || 'SYSTEM'}
                    </span>
                    <span className="text-outline-variant">·</span>
                    <span className="font-code-sm truncate max-w-[130px] flex items-center gap-1 text-on-surface-variant">
                      <HardDrive className="w-3 h-3 text-on-surface-variant" />
                      {detail}
                    </span>
                  </div>

                  <span className={`px-1.5 py-0.5 rounded-sm font-label-sm border shrink-0 ${tag.style}`}>
                    {tag.label}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default TelemetryFeed;
