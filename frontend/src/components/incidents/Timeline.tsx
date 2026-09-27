import React, { useState } from 'react';
import {
  Clock,
  ChevronDown,
  ChevronUp,
  User,
  Monitor,
  Globe,
  MapPin,
  Database,
  Terminal,
  FileCode,
} from 'lucide-react';
import type { NormalizedEvent, EventType } from '../../types/event';

interface TimelineProps {
  events: NormalizedEvent[];
}

const ANOMALY_EVENT_TYPES: EventType[] = [
  'mfa_failure',
  'new_device',
  'new_location',
  'privilege_change',
  'large_transfer',
  'admin_action',
];

export const Timeline: React.FC<TimelineProps> = ({ events }) => {
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});

  const toggleExpand = (eventId: string) => {
    setExpandedEvents((prev) => ({
      ...prev,
      [eventId]: !prev[eventId],
    }));
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
    } catch {
      return { date: '', time: isoString };
    }
  };

  if (!events || events.length === 0) {
    return (
      <div className="py-6 text-center text-slate-500 border border-dashed border-slate-800/80 rounded-md">
        <Clock className="w-6 h-6 mx-auto text-slate-600 mb-1" />
        <p className="text-xs font-mono">No timeline events associated with this incident.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2.5 before:bottom-2.5 before:w-px before:bg-slate-800">
      {events.map((evt, index) => {
        const isExpanded = !!expandedEvents[evt.event_id];
        const isAnomaly = ANOMALY_EVENT_TYPES.includes(evt.event_type);
        const { date, time } = formatTime(evt.timestamp);

        return (
          <div key={evt.event_id || index} className="relative group">
            {/* Timeline Circle Node */}
            <div
              className={`absolute -left-5 top-2.5 -translate-x-1/2 w-3 h-3 rounded-full border-2 ${
                isAnomaly
                  ? 'bg-amber-400 border-slate-950'
                  : 'bg-blue-500 border-slate-950'
              }`}
            />

            {/* Timeline Event Card */}
            <div className="bg-slate-900 border border-slate-800/60 rounded-md hover:border-slate-700/80 transition-colors overflow-hidden">
              {/* Card Header / Summary */}
              <div
                onClick={() => toggleExpand(evt.event_id)}
                className="p-3 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/60 hover:bg-slate-800/40 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-slate-200">
                      {evt.event_id}
                    </span>
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-semibold border ${
                        isAnomaly
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}
                    >
                      {evt.event_type}
                    </span>
                    {evt.action && (
                      <span className="text-xs text-slate-400 capitalize font-medium">
                        • {evt.action.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 font-sans">
                    {evt.user_id && <span className="font-mono text-slate-200">{evt.user_id} </span>}
                    {evt.action ? `performed ${evt.action} ` : `triggered event ${evt.event_type} `}
                    {evt.resource && (
                      <span>
                        on resource <code className="text-slate-200 bg-slate-950 px-1 py-0.2 rounded font-mono text-[11px] border border-slate-800">{evt.resource}</code>
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {time} <span className="text-slate-600 hidden md:inline">{date}</span>
                  </span>
                  <div className="p-0.5 rounded text-slate-400">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details Panel */}
              {isExpanded && (
                <div className="p-3 border-t border-slate-800/60 bg-slate-950/80 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs font-mono">
                    {evt.user_id && (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-slate-900 border border-slate-800/60">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <div>
                          <span className="text-[10px] uppercase text-slate-500 block">User ID</span>
                          <span className="text-slate-200">{evt.user_id}</span>
                        </div>
                      </div>
                    )}

                    {evt.device_id && (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-slate-900 border border-slate-800/60">
                        <Monitor className="w-3.5 h-3.5 text-slate-500" />
                        <div>
                          <span className="text-[10px] uppercase text-slate-500 block">Device ID</span>
                          <span className="text-slate-200">{evt.device_id}</span>
                        </div>
                      </div>
                    )}

                    {evt.ip_address && (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-slate-900 border border-slate-800/60">
                        <Globe className="w-3.5 h-3.5 text-slate-500" />
                        <div>
                          <span className="text-[10px] uppercase text-slate-500 block">IP Address</span>
                          <span className="text-slate-200">{evt.ip_address}</span>
                        </div>
                      </div>
                    )}

                    {evt.location && (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-slate-900 border border-slate-800/60 font-sans">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <div>
                          <span className="text-[10px] uppercase text-slate-500 block font-mono">Location</span>
                          <span className="text-slate-200">{evt.location}</span>
                        </div>
                      </div>
                    )}

                    {evt.resource && (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-slate-900 border border-slate-800/60">
                        <Database className="w-3.5 h-3.5 text-slate-500" />
                        <div>
                          <span className="text-[10px] uppercase text-slate-500 block">Resource</span>
                          <span className="text-slate-200 truncate">{evt.resource}</span>
                        </div>
                      </div>
                    )}

                    {evt.session_id && (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-slate-900 border border-slate-800/60">
                        <Terminal className="w-3.5 h-3.5 text-slate-500" />
                        <div>
                          <span className="text-[10px] uppercase text-slate-500 block">Session ID</span>
                          <span className="text-slate-200">{evt.session_id}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Event Metadata JSON */}
                  {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                    <div className="pt-1">
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-mono">
                        <FileCode className="w-3 h-3 text-slate-500" />
                        Metadata Payload
                      </div>
                      <pre className="p-2.5 bg-slate-900 border border-slate-800/80 rounded-md text-[11px] font-mono text-slate-300 overflow-x-auto">
                        {JSON.stringify(evt.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Timeline;
