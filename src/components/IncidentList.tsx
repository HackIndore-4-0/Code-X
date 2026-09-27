import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, User, Clock, ChevronRight } from 'lucide-react';
import type { Incident } from '../types/incident';
import StateBadge from './StateBadge';
import { NumberTicker } from '@/registry/magicui/number-ticker';

interface IncidentListProps {
  incidents: Incident[];
  loading?: boolean;
  className?: string;
}

export const IncidentList: React.FC<IncidentListProps> = ({ incidents, loading = false, className = '' }) => {
  const navigate = useNavigate();

  const formatTimeWindow = (createdAt: string, updatedAt: string) => {
    try {
      const c = new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const u = new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${c} — ${u}`;
    } catch {
      return createdAt;
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
    <div className={`rounded-xl p-4 space-y-3 bg-surface-container-lowest border border-outline-variant/70 shadow-lg shadow-black/40 ${className}`}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-2.5 border-b border-outline-variant font-code-sm">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-primary" />
          <h2 className="font-label-md text-on-surface">
            INCIDENT CLUSTERS &amp; QUEUE
          </h2>
          <span className="font-label-sm px-2 py-0.5 rounded-sm bg-primary-container/20 text-primary border border-primary/40">
            <NumberTicker value={incidents.length} />
          </span>
        </div>
        <span className="font-code-sm text-on-surface-variant">
          Click entry to open Incident Detail
        </span>
      </div>

      {/* ── Body ── */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-12 rounded-sm bg-surface-container-high animate-pulse border border-outline-variant"
            />
          ))}
        </div>
      ) : incidents.length === 0 ? (
        <div className="py-12 text-center space-y-2 rounded-sm font-code-sm border border-dashed border-outline-variant bg-surface-container-lowest">
          <ShieldAlert className="w-8 h-8 mx-auto text-on-surface-variant" />
          <p className="font-body-sm text-on-surface-variant">No active security incidents</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-body-md">
            {/* ── Table Header ── */}
            <thead>
              <tr className="font-label-sm bg-surface-container-lowest border-b border-outline-variant text-on-surface-variant">
                <th className="py-2.5 px-3 font-semibold">INCIDENT ID</th>
                <th className="py-2.5 px-3 font-semibold">PRIMARY USER</th>
                <th className="py-2.5 px-3 font-semibold">STATE</th>
                <th className="py-2.5 px-3 font-semibold">TIME WINDOW</th>
                <th className="py-2.5 px-3 font-semibold">PRIORITY</th>
                <th className="py-2.5 px-3 font-semibold text-right">ACTION</th>
              </tr>
            </thead>
            {/* ── Table Body ── */}
            <tbody>
              {incidents.map((inc) => (
                <tr
                  key={inc.incident_id}
                  onClick={() => navigate(`/incidents/${inc.incident_id}`)}
                  className="cursor-pointer group hover:bg-surface-container-high/60 transition-colors border-b border-outline-variant/40 font-code-sm"
                >
                  {/* Incident ID */}
                  <td className="py-3 px-3 font-bold text-primary group-hover:underline">
                    {inc.incident_id}
                  </td>
                  {/* Primary User */}
                  <td className="py-3 px-3 text-on-surface">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-on-surface-variant" />
                      {inc.primary_user || inc.user_id || 'USR-007'}
                    </span>
                  </td>
                  {/* State Badge */}
                  <td className="py-3 px-3">
                    <StateBadge status={inc.status} />
                  </td>
                  {/* Time Window */}
                  <td className="py-3 px-3 font-code-sm text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-on-surface-variant" />
                      {formatTimeWindow(inc.created_at, inc.updated_at)}
                    </span>
                  </td>
                  {/* Priority */}
                  <td className="py-3 px-3">{getPriorityPill(inc.priority)}</td>
                  {/* Action */}
                  <td className="py-3 px-3 text-right">
                    <span className="inline-flex items-center gap-1 font-semibold font-code-sm text-primary transition-transform group-hover:translate-x-1">
                      Inspect
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default IncidentList;
