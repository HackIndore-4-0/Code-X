import React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Globe,
  CheckCircle2,
  Clock,
  Radio,
  Server,
} from 'lucide-react';
import type { MitigationData } from '../../services/incidents';
import { NumberTicker } from '@/registry/magicui/number-ticker';

interface MitigationPanelProps {
  mitigation: MitigationData | null | undefined;
  isLoading?: boolean;
  className?: string;
}

export const MitigationPanel: React.FC<MitigationPanelProps> = ({
  mitigation,
  isLoading = false,
  className = '',
}) => {
  if (isLoading) {
    return (
      <div className={`rounded-xl p-4 bg-surface-container border border-outline-variant animate-pulse space-y-3 ${className}`}>
        <div className="h-6 w-1/3 bg-surface-container-high rounded" />
        <div className="h-16 bg-surface-container-high rounded" />
      </div>
    );
  }

  const isTriggered = mitigation?.triggered === true;
  const threatWeight = mitigation?.threat_weight ?? 0;
  const threshold = mitigation?.threshold ?? 80;
  const isAboveThreshold = threatWeight >= threshold;

  return (
    <div
      className={`rounded-xl p-4 font-code-sm space-y-4 border transition-all ${
        isTriggered
          ? 'bg-surface-container-lowest border-error/40 shadow-lg shadow-error/10'
          : 'bg-surface-container-lowest border-outline-variant/70 shadow-lg shadow-black/40'
      } ${className}`}
    >
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-outline-variant/60">
        <div className="flex items-center gap-2">
          {isTriggered ? (
            <div className="p-1.5 rounded-lg bg-error-container/20 border border-error/40 text-error">
              <Zap className="w-4 h-4 animate-pulse" />
            </div>
          ) : (
            <div className="p-1.5 rounded-lg bg-primary-container/20 border border-primary/40 text-primary">
              <ShieldCheck className="w-4 h-4" />
            </div>
          )}
          <div>
            <h3 className="font-label-md text-on-surface flex items-center gap-2">
              AUTOMATED THREAT MITIGATION
              {isTriggered ? (
                <span className="font-label-sm px-2 py-0.5 rounded-sm bg-error-container/30 text-error border border-error/50 font-bold">
                  ACTION EXECUTED
                </span>
              ) : (
                <span className="font-label-sm px-2 py-0.5 rounded-sm bg-surface-container-high text-on-surface-variant border border-outline-variant">
                  BELOW THRESHOLD
                </span>
              )}
            </h3>
            <p className="text-[11px] text-on-surface-variant font-body-sm">
              Deterministic Threat Weight evaluation &amp; viaSocket orchestration engine.
            </p>
          </div>
        </div>

        {/* Live Status Chip */}
        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <span className={`w-2 h-2 rounded-full ${isTriggered ? 'bg-error animate-ping' : 'bg-secondary'}`} />
          <span className="font-label-sm font-semibold text-on-surface">
            {isTriggered ? 'CONTAINMENT ACTIVE' : 'MONITORING'}
          </span>
        </div>
      </div>

      {/* ── Metric Comparison: Threat Weight vs Threshold ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Threat Weight */}
        <div className="p-3 rounded-lg bg-surface-container/60 border border-outline-variant/50 space-y-1.5">
          <div className="flex justify-between items-center text-xs text-on-surface-variant">
            <span className="flex items-center gap-1.5 font-semibold">
              <Zap className="w-3.5 h-3.5 text-primary" />
              THREAT WEIGHT
            </span>
            <span className="text-[10px] text-on-surface-variant/80 font-mono">
              FORMULA DERIVED
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black font-headline-lg flex items-baseline gap-1">
              <span className={isAboveThreshold ? 'text-error' : 'text-primary'}>
                <NumberTicker value={threatWeight} decimalPlaces={1} />
              </span>
              <span className="text-xs text-on-surface-variant font-normal">/ 100</span>
            </div>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm border ${
                isAboveThreshold
                  ? 'bg-error-container/20 text-error border-error/40'
                  : 'bg-primary-container/20 text-primary border-primary/40'
              }`}
            >
              {isAboveThreshold ? '≥ THRESHOLD' : '< THRESHOLD'}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, threatWeight)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                isAboveThreshold ? 'bg-error' : 'bg-primary'
              }`}
            />
          </div>
        </div>

        {/* Threshold */}
        <div className="p-3 rounded-lg bg-surface-container/60 border border-outline-variant/50 space-y-1.5">
          <div className="flex justify-between items-center text-xs text-on-surface-variant">
            <span className="flex items-center gap-1.5 font-semibold">
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              MITIGATION THRESHOLD
            </span>
            <span className="text-[10px] text-on-surface-variant/80 font-mono">
              CONFIGURED (ENV)
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black font-headline-lg text-on-surface flex items-baseline gap-1">
              <span><NumberTicker value={threshold} decimalPlaces={1} /></span>
              <span className="text-xs text-on-surface-variant font-normal">/ 100</span>
            </div>
            <span className="text-[10px] font-mono text-on-surface-variant">
              Cutoff Limit
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant/80 font-body-sm">
            Automatic entity isolation triggers when Threat Weight &ge; {threshold}.
          </p>
        </div>
      </div>

      {/* ── Mitigation Execution Details (if triggered) ── */}
      {isTriggered ? (
        <div className="p-3.5 rounded-lg border border-error/30 bg-error/5 space-y-3 font-code-sm">
          <div className="flex items-center justify-between text-xs border-b border-error/20 pb-2">
            <span className="font-bold text-error flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-error" />
              ISOLATION ORCHESTRATION PAYLOAD
            </span>
            <span className="text-on-surface-variant font-mono">
              Action ID: <strong className="text-on-surface">{mitigation?.mitigation_id || 'MIT-AUTO'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            {/* Target Entity */}
            <div className="p-2 rounded bg-surface-container-lowest border border-outline-variant/40">
              <span className="text-[10px] text-on-surface-variant uppercase block font-label-sm">
                Target Entity
              </span>
              <div className="flex items-center gap-1.5 font-bold text-on-surface mt-1 truncate">
                <Globe className="w-3.5 h-3.5 text-error" />
                <span>{mitigation?.flagged_ip || mitigation?.entity?.value || '10.0.0.15'}</span>
              </div>
            </div>

            {/* Action Type */}
            <div className="p-2 rounded bg-surface-container-lowest border border-outline-variant/40">
              <span className="text-[10px] text-on-surface-variant uppercase block font-label-sm">
                Action Executed
              </span>
              <div className="flex items-center gap-1.5 font-bold text-error mt-1 truncate">
                <Server className="w-3.5 h-3.5 text-error" />
                <span>{mitigation?.action || 'ISOLATE_ENTITY'}</span>
              </div>
            </div>

            {/* Webhook Status */}
            <div className="p-2 rounded bg-surface-container-lowest border border-outline-variant/40">
              <span className="text-[10px] text-on-surface-variant uppercase block font-label-sm">
                viaSocket Webhook
              </span>
              <div className="flex items-center gap-1.5 font-bold text-secondary mt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
                <span>{mitigation?.webhook_status || 'MOCK_SUCCESS'}</span>
              </div>
            </div>
          </div>

          {/* Remediation Status Banner */}
          <div className="flex items-center justify-between p-2 rounded bg-error-container/20 border border-error/30 text-xs">
            <span className="text-on-surface flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-error" />
              Containment Status: <strong className="text-error">{mitigation?.remediation_status || 'ISOLATED'}</strong>
            </span>
            {mitigation?.timestamp && (
              <span className="text-[10px] text-on-surface-variant font-mono flex items-center gap-1">
                <Clock className="w-3 h-3 text-on-surface-variant" />
                {new Date(mitigation.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-lg border border-dashed border-outline-variant/60 text-xs text-on-surface-variant flex items-center justify-between font-body-sm">
          <span>Threat Weight has not breached the containment threshold ({threatWeight.toFixed(1)} &lt; {threshold.toFixed(1)}). Continuous telemetry evaluation in progress.</span>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-container border border-outline-variant shrink-0">
            AUTO-DISPATCH READY
          </span>
        </div>
      )}
    </div>
  );
};

export default MitigationPanel;
