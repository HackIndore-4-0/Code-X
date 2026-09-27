import React from 'react';
import type { IncidentStatus } from '../../types/incident';

interface StatusBadgeProps {
  status: IncidentStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = true,
  size = 'sm',
  className = '',
}) => {
  const sizeClasses = size === 'md' ? 'px-2.5 py-0.5 text-xs' : 'px-2 py-0.5 text-[11px]';

  switch (status) {
    case 'HIGH_PRIORITY':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md font-mono font-semibold bg-red-500/10 text-red-400 border border-red-500/20 ${sizeClasses} ${className}`}
        >
          {showIcon && <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />}
          HIGH PRIORITY
        </span>
      );
    case 'INCIDENT_CANDIDATE':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 ${sizeClasses} ${className}`}
        >
          {showIcon && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
          CANDIDATE
        </span>
      );
    case 'CONFIRMED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 ${sizeClasses} ${className}`}
        >
          {showIcon && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />}
          CONFIRMED
        </span>
      );
    case 'RESOLVED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${sizeClasses} ${className}`}
        >
          {showIcon && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
          RESOLVED
        </span>
      );
    case 'DISMISSED':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md font-mono font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20 ${sizeClasses} ${className}`}
        >
          {showIcon && <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />}
          DISMISSED
        </span>
      );
  }
};

export default StatusBadge;
