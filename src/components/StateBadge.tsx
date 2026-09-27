import React from 'react';
import { motion } from 'framer-motion';
import type { IncidentStatus } from '../types/incident';

interface StateBadgeProps {
  status: IncidentStatus | string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

type BadgeConfig = {
  bg: string;
  border: string;
  text: string;
  dot: string;
  glow?: string;
  label: string;
};

const getStyle = (st: string): BadgeConfig => {
  switch (st) {
    case 'ANOMALY':
      return {
        bg:     'rgba(139, 92, 246, 0.12)',
        border: 'rgba(139, 92, 246, 0.35)',
        text:   '#A78BFA',
        dot:    '#A78BFA',
        label:  'ANOMALY',
      };
    case 'SUSPICIOUS_PATTERN':
      return {
        bg:     'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.35)',
        text:   '#FCD34D',
        dot:    '#FCD34D',
        label:  'SUSPICIOUS PATTERN',
      };
    case 'INCIDENT_CANDIDATE':
      return {
        bg:     'rgba(234, 88, 12, 0.12)',
        border: 'rgba(234, 88, 12, 0.35)',
        text:   '#FB923C',
        dot:    '#FB923C',
        label:  'CANDIDATE',
      };
    case 'HIGH_PRIORITY':
      return {
        bg:     'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.4)',
        text:   '#F87171',
        dot:    '#F87171',
        glow:   '0 0 10px rgba(239, 68, 68, 0.3)',
        label:  'HIGH PRIORITY',
      };
    case 'INVESTIGATING':
      return {
        bg:     'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.35)',
        text:   '#FBBF24',
        dot:    '#FBBF24',
        label:  'INVESTIGATING',
      };
    case 'CONFIRMED':
      return {
        bg:     'rgba(59, 130, 246, 0.12)',
        border: 'rgba(59, 130, 246, 0.35)',
        text:   '#60A5FA',
        dot:    '#60A5FA',
        label:  'CONFIRMED',
      };
    case 'RESOLVED':
      return {
        bg:     'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.35)',
        text:   '#34D399',
        dot:    '#34D399',
        label:  'RESOLVED',
      };
    case 'DISMISSED':
    default:
      return {
        bg:     'rgba(100, 116, 139, 0.1)',
        border: 'rgba(100, 116, 139, 0.25)',
        text:   '#94A3B8',
        dot:    '#94A3B8',
        label:  st.replace(/_/g, ' '),
      };
  }
};

export const StateBadge: React.FC<StateBadgeProps> = ({
  status,
  showIcon = true,
  size = 'sm',
  className = '',
}) => {
  const sizePad =
    size === 'lg' ? 'px-3 py-1 text-xs' :
    size === 'md' ? 'px-2.5 py-0.5 text-xs' :
                    'px-2 py-0.5 text-[11px]';

  const config = getStyle(status);
  const isHighPriority = status === 'HIGH_PRIORITY';

  return (
    <motion.span
      key={status}
      initial={{ scale: 0.85, opacity: 0.5 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`inline-flex items-center gap-1.5 rounded-md font-mono font-semibold border ${sizePad} ${className}`}
      style={{
        background:   config.bg,
        borderColor:  config.border,
        color:        config.text,
        boxShadow:    config.glow,
      }}
    >
      {showIcon && (
        <span className="relative flex h-2 w-2 shrink-0">
          {isHighPriority && (
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
              style={{ background: config.dot }}
            />
          )}
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ background: config.dot }}
          />
        </span>
      )}
      {config.label}
    </motion.span>
  );
};

export default StateBadge;
