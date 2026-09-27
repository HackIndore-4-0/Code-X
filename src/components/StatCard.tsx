import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { NumberTicker } from '@/registry/magicui/number-ticker';


export interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  change?: string;
  colorScheme?: 'blue' | 'amber' | 'red' | 'emerald' | 'purple' | 'orange';
  loading?: boolean;
}

type ColorStyle = {
  iconBg: string;
  iconBorder: string;
  iconColor: string;
  hoverBorder: string;
  hoverGlow: string;
  changeBg: string;
  changeBorder: string;
  changeText: string;
};

const COLOR_MAP: Record<string, ColorStyle> = {
  red: {
    iconBg:      'rgba(255, 180, 171, 0.12)',
    iconBorder:  'rgba(255, 180, 171, 0.3)',
    iconColor:   '#ffb4ab',
    hoverBorder: 'rgba(255, 180, 171, 0.45)',
    hoverGlow:   '0 4px 20px rgba(255, 180, 171, 0.2)',
    changeBg:    'rgba(255, 180, 171, 0.12)',
    changeBorder:'rgba(255, 180, 171, 0.3)',
    changeText:  '#ffb4ab',
  },
  amber: {
    iconBg:      'rgba(245, 158, 11, 0.12)',
    iconBorder:  'rgba(245, 158, 11, 0.3)',
    iconColor:   '#f59e0b',
    hoverBorder: 'rgba(245, 158, 11, 0.45)',
    hoverGlow:   '0 4px 20px rgba(245, 158, 11, 0.2)',
    changeBg:    'rgba(245, 158, 11, 0.12)',
    changeBorder:'rgba(245, 158, 11, 0.3)',
    changeText:  '#f59e0b',
  },
  emerald: {
    iconBg:      'rgba(78, 222, 163, 0.12)',
    iconBorder:  'rgba(78, 222, 163, 0.3)',
    iconColor:   '#4edea3',
    hoverBorder: 'rgba(78, 222, 163, 0.45)',
    hoverGlow:   '0 4px 20px rgba(78, 222, 163, 0.2)',
    changeBg:    'rgba(78, 222, 163, 0.12)',
    changeBorder:'rgba(78, 222, 163, 0.3)',
    changeText:  '#4edea3',
  },
  purple: {
    iconBg:      'rgba(208, 188, 255, 0.12)',
    iconBorder:  'rgba(208, 188, 255, 0.3)',
    iconColor:   '#d0bcff',
    hoverBorder: 'rgba(208, 188, 255, 0.45)',
    hoverGlow:   '0 4px 20px rgba(208, 188, 255, 0.2)',
    changeBg:    'rgba(208, 188, 255, 0.12)',
    changeBorder:'rgba(208, 188, 255, 0.3)',
    changeText:  '#d0bcff',
  },
  orange: {
    iconBg:      'rgba(245, 158, 11, 0.12)',
    iconBorder:  'rgba(245, 158, 11, 0.3)',
    iconColor:   '#f59e0b',
    hoverBorder: 'rgba(245, 158, 11, 0.45)',
    hoverGlow:   '0 4px 20px rgba(245, 158, 11, 0.2)',
    changeBg:    'rgba(245, 158, 11, 0.12)',
    changeBorder:'rgba(245, 158, 11, 0.3)',
    changeText:  '#f59e0b',
  },
  blue: {
    iconBg:      'rgba(59, 130, 246, 0.12)',
    iconBorder:  'rgba(59, 130, 246, 0.3)',
    iconColor:   '#3B82F6',
    hoverBorder: 'rgba(59, 130, 246, 0.5)',
    hoverGlow:   '0 4px 20px rgba(59, 130, 246, 0.25)',
    changeBg:    'rgba(59, 130, 246, 0.12)',
    changeBorder:'rgba(59, 130, 246, 0.3)',
    changeText:  '#3B82F6',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  change,
  colorScheme = 'blue',
  loading = false,
}) => {
  const c = COLOR_MAP[colorScheme] ?? COLOR_MAP.blue;

  if (loading) {
    return (
      <div className="rounded-xl p-4 flex flex-col justify-between h-28 animate-pulse bg-surface-container border border-outline-variant/60">
        <div className="flex items-center justify-between">
          <div className="h-3 rounded w-20 bg-surface-container-high" />
          <div className="w-7 h-7 rounded-lg bg-surface-container-high" />
        </div>
        <div className="space-y-1.5 mt-2">
          <div className="h-7 rounded w-14 bg-surface-container-high" />
          <div className="h-3 rounded w-24 bg-surface-container-high/60" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-4 flex flex-col justify-between transition-all duration-300 group cursor-default bg-surface-container-lowest border border-outline-variant/70 shadow-lg shadow-black/40"
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = c.hoverBorder;
        el.style.boxShadow = c.hoverGlow;
        el.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = '';
        el.style.boxShadow = '';
        el.style.transform = '';
      }}
    >
      {/* ── Header row ── */}
      <div className="flex items-center justify-between">
        <span className="font-label-sm text-on-surface-variant font-semibold tracking-wider">
          {title}
        </span>
        <div
          className="p-1.5 rounded-lg transition-all duration-300"
          style={{
            background: c.iconBg,
            border: `1px solid ${c.iconBorder}`,
          }}
        >
          <Icon className="w-4 h-4" style={{ color: c.iconColor }} />
        </div>
      </div>

      {/* ── Value row ── */}
      <div className="mt-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tight text-on-surface font-mono">
            {typeof value === 'number' ? (
              <NumberTicker value={value} />
            ) : typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '' ? (
              <NumberTicker value={Number(value)} />
            ) : (
              value
            )}
          </span>
          {change && (
            <span
              className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border"
              style={{
                background: c.changeBg,
                border: `1px solid ${c.changeBorder}`,
                color: c.changeText,
              }}
            >
              {change}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs mt-1 font-body text-on-surface-variant/80">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
