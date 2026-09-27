import React from 'react';
import { History, UserCheck, Clock } from 'lucide-react';
import type { AuditLogEntry } from '../types/incident';
import { NumberTicker } from '@/registry/magicui/number-ticker';

interface AuditPanelProps {
  auditLogs?: AuditLogEntry[];
  loading?: boolean;
  className?: string;
}

export const AuditPanel: React.FC<AuditPanelProps> = ({ auditLogs = [], loading = false, className = '' }) => {
  const logs: AuditLogEntry[] = auditLogs.length > 0 ? auditLogs : [
    {
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      action: 'SYSTEM_NORMALIZATION',
      description: 'Telemetry events EVT-1021, EVT-1025 normalized and correlated into active cluster.',
    },
    {
      timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      action: 'PRIORITY_EVALUATION',
      description: 'Priority score recalculated: 73 → 86 following privilege change anomaly.',
    },
    {
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      action: 'STATE_TRANSITION',
      description: 'Incident status updated from INCIDENT_CANDIDATE to HIGH_PRIORITY.',
    },
    {
      timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      action: 'ANALYST_ACTION',
      description: 'Analyst SOC-Lead assigned for immediate investigation.',
    },
  ];

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className={`bg-surface-container border border-outline-variant rounded-md p-4 space-y-3 font-code-sm ${className}`}>
      <div className="flex items-center justify-between border-b border-outline-variant pb-2.5 font-code-sm">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <h3 className="font-label-md text-on-surface">
            SYSTEM &amp; ANALYST AUDIT TRAIL
          </h3>
        </div>
        <span className="font-code-sm text-on-surface-variant">
          <NumberTicker value={logs.length} /> Audit Entries
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-12 bg-surface-container-high rounded-md animate-pulse border border-outline-variant" />
          ))}
        </div>
      ) : (
        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 font-code-sm">
          {logs.map((log, idx) => (
            <div
              key={idx}
              className="p-3 bg-surface-container-lowest border border-outline-variant rounded-md hover:border-outline transition-colors space-y-1"
            >
              <div className="flex items-center justify-between font-code-sm">
                <span className="font-bold text-primary flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-primary" />
                  {log.action}
                </span>
                <span className="font-code-sm text-on-surface-variant flex items-center gap-1">
                  <Clock className="w-3 h-3 text-on-surface-variant" />
                  {formatTime(log.timestamp)}
                </span>
              </div>
              <p className="font-body-sm text-on-surface leading-relaxed">{log.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditPanel;
