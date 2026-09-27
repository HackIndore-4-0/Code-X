import React from 'react';
import StateBadge from '../StateBadge';
import type { IncidentStatus } from '../../types/incident';

interface StatusBadgeProps {
  status: IncidentStatus | string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = (props) => {
  return <StateBadge {...props} />;
};

export default StatusBadge;
