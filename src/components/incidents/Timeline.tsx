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
      <div className="py-6 text-center border border-dashed rounded-md" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
        <Clock className="w-6 h-6 mx-auto mb-1" style={{ color: 'var(--color-muted)' }} />
        <p className="text-xs font-mono">No timeline events associated with this incident.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2.5 before:bottom-2.5 before:w-px" style={{ color: 'var(--color-text)' }}>
      {events.map((evt, index) => {
        const isExpanded = !!expandedEvents[evt.event_id];
        const isAnomaly = ANOMALY_EVENT_TYPES.includes(evt.event_type);
        const { date, time } = formatTime(evt.timestamp);

        return (
          <div key={evt.event_id || index} className="relative group">
            {/* Timeline Circle Node */}
            <div
              className="absolute -left-5 top-2.5 -translate-x-1/2 w-3 h-3 rounded-full border-2"
              style={{
                background: isAnomaly ? '#F59E0B' : '#3B82F6',
                borderColor: '#0B0F14',
              }}
            />

            {/* Timeline Event Card */}
            <div
              className="border rounded-md transition-colors overflow-hidden"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              {/* Card Header / Summary */}
              <div
                onClick={() => toggleExpand(evt.event_id)}
                className="p-3 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors"
                style={{ background: 'var(--color-surface)' }}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold" style={{ color: '#60A5FA' }}>
                      {evt.event_id}
                    </span>
                    <span
                      className="font-mono text-[10px] px-1.5 py-0.2 rounded font-semibold border"
                      style={
                        isAnomaly
                          ? { background: 'rgba(245, 158, 11, 0.1)', color: '#FCD34D', borderColor: 'rgba(245, 158, 11, 0.25)' }
                          : { background: 'rgba(59, 130, 246, 0.1)', color: '#60A5FA', borderColor: 'rgba(59, 130, 246, 0.25)' }
                      }
                    >
                      {evt.event_type}
                    </span>
                    {evt.action && (
                      <span className="text-xs capitalize font-medium" style={{ color: 'var(--color-muted)' }}>
                        • {evt.action.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-sans" style={{ color: 'var(--color-text)' }}>
                    {evt.user_id && <span className="font-mono font-semibold" style={{ color: '#60A5FA' }}>{evt.user_id} </span>}
                    {evt.action ? `performed ${evt.action} ` : `triggered event ${evt.event_type} `}
                    {evt.resource && (
                      <span>
                        on resource <code className="px-1 py-0.2 rounded font-mono text-[11px] border" style={{ background: 'var(--color-void)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>{evt.resource}</code>
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                  <span className="text-[11px] font-mono flex items-center gap-1" style={{ color: 'var(--color-muted)' }}>
                    <Clock className="w-3 h-3" style={{ color: 'var(--color-muted)' }} />
                    {time} <span className="hidden md:inline" style={{ color: 'var(--color-muted)' }}>{date}</span>
                  </span>
                  <div className="p-0.5 rounded" style={{ color: 'var(--color-muted)' }}>
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
                <div className="p-3 border-t space-y-2.5" style={{ background: 'var(--color-surface-container)', borderColor: 'var(--color-border)' }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs font-mono">
                    {evt.user_id && (
                      <div className="flex items-center gap-2 p-2 rounded-md border" style={{ background: 'var(--color-void)', borderColor: 'var(--color-border)' }}>
                        <User className="w-3.5 h-3.5" style={{ color: 'var(--color-muted)' }} />
                        <div>
                          <span className="text-[10px] uppercase block" style={{ color: 'var(--color-muted)' }}>User ID</span>
                          <span style={{ color: 'var(--color-text)' }}>{evt.user_id}</span>
                        </div>
                      </div>
                    )}

                    {evt.device_id && (
                      <div className="flex items-center gap-2 p-2 rounded-md border" style={{ background: 'var(--color-void)', borderColor: 'var(--color-border)' }}>
                        <Monitor className="w-3.5 h-3.5" style={{ color: 'var(--color-muted)' }} />
                        <div>
                          <span className="text-[10px] uppercase block" style={{ color: 'var(--color-muted)' }}>Device ID</span>
                          <span style={{ color: 'var(--color-text)' }}>{evt.device_id}</span>
                        </div>
                      </div>
                    )}

                    {evt.ip_address && (
                      <div className="flex items-center gap-2 p-2 rounded-md border" style={{ background: 'var(--color-void)', borderColor: 'var(--color-border)' }}>
                        <Globe className="w-3.5 h-3.5" style={{ color: 'var(--color-muted)' }} />
                        <div>
                          <span className="text-[10px] uppercase block" style={{ color: 'var(--color-muted)' }}>IP Address</span>
                          <span style={{ color: 'var(--color-text)' }}>{evt.ip_address}</span>
                        </div>
                      </div>
                    )}

                    {evt.location && (
                      <div className="flex items-center gap-2 p-2 rounded-md border font-sans" style={{ background: 'var(--color-void)', borderColor: 'var(--color-border)' }}>
                        <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--color-muted)' }} />
                        <div>
                          <span className="text-[10px] uppercase block font-mono" style={{ color: 'var(--color-muted)' }}>Location</span>
                          <span style={{ color: 'var(--color-text)' }}>{evt.location}</span>
                        </div>
                      </div>
                    )}

                    {evt.resource && (
                      <div className="flex items-center gap-2 p-2 rounded-md border" style={{ background: 'var(--color-void)', borderColor: 'var(--color-border)' }}>
                        <Database className="w-3.5 h-3.5" style={{ color: 'var(--color-muted)' }} />
                        <div>
                          <span className="text-[10px] uppercase block" style={{ color: 'var(--color-muted)' }}>Resource</span>
                          <span className="truncate" style={{ color: 'var(--color-text)' }}>{evt.resource}</span>
                        </div>
                      </div>
                    )}

                    {evt.session_id && (
                      <div className="flex items-center gap-2 p-2 rounded-md border" style={{ background: 'var(--color-void)', borderColor: 'var(--color-border)' }}>
                        <Terminal className="w-3.5 h-3.5" style={{ color: 'var(--color-muted)' }} />
                        <div>
                          <span className="text-[10px] uppercase block" style={{ color: 'var(--color-muted)' }}>Session ID</span>
                          <span style={{ color: 'var(--color-text)' }}>{evt.session_id}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Event Metadata JSON */}
                  {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                    <div className="pt-1">
                      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider mb-1 font-mono" style={{ color: 'var(--color-muted)' }}>
                        <FileCode className="w-3 h-3" style={{ color: 'var(--color-muted)' }} />
                        Metadata Payload
                      </div>
                      <pre className="p-2.5 border rounded-md text-[11px] font-mono overflow-x-auto" style={{ background: 'var(--color-void)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
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
