import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  change?: string;
  colorScheme?: 'blue' | 'amber' | 'red' | 'emerald' | 'purple';
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  change,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800/60 rounded-md p-4 animate-pulse flex flex-col justify-between h-28">
        <div className="flex items-center justify-between">
          <div className="h-3 bg-slate-800 rounded w-20"></div>
          <div className="w-7 h-7 bg-slate-800 rounded-md"></div>
        </div>
        <div className="space-y-1.5 mt-2">
          <div className="h-7 bg-slate-800 rounded w-14"></div>
          <div className="h-3 bg-slate-800/60 rounded w-24"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800/60 rounded-md p-4 flex flex-col justify-between hover:border-slate-700/80 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className="p-1.5 rounded-md bg-slate-950 border border-slate-800 text-slate-400">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-100 font-mono">
            {value}
          </span>
          {change && (
            <span className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              {change}
            </span>
          )}
        </div>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
};

export default StatCard;
