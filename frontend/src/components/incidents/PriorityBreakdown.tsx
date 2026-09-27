import React from 'react';
import { ShieldAlert, Zap } from 'lucide-react';
import type { Priority, PriorityFactors } from '../../types/graph';

interface PriorityBreakdownProps {
  priority?: Priority;
  score?: number;
}

const DEFAULT_FACTORS: PriorityFactors = {
  behavioral_anomaly: 24,
  correlation_strength: 18,
  asset_criticality: 17,
  incident_progression: 14,
  evidence_strength: 13,
};

const FACTOR_LABELS: Record<keyof PriorityFactors, { name: string; max: number; desc: string }> = {
  behavioral_anomaly: {
    name: 'Behavioral Anomaly',
    max: 30,
    desc: 'Deviations from user baseline & location anomalies',
  },
  correlation_strength: {
    name: 'Correlation Strength',
    max: 25,
    desc: 'Temporal and session alignment across events',
  },
  asset_criticality: {
    name: 'Asset Criticality',
    max: 20,
    desc: 'Sensitivity of target databases or vaults',
  },
  incident_progression: {
    name: 'Incident Progression',
    max: 15,
    desc: 'Sequence length & privilege escalation chain',
  },
  evidence_strength: {
    name: 'Evidence Strength',
    max: 10,
    desc: 'Multi-source verification & telemetry confidence',
  },
};

export const PriorityBreakdown: React.FC<PriorityBreakdownProps> = ({ priority, score: propScore }) => {
  const score = priority?.score ?? propScore ?? 86;
  const factors = priority?.factors ?? DEFAULT_FACTORS;

  let scoreColorClass = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  let barColorClass = 'bg-blue-500';
  let labelText = priority?.label ?? 'HIGH';

  if (score >= 70) {
    scoreColorClass = 'text-red-400 bg-red-500/10 border-red-500/20';
    barColorClass = 'bg-red-500';
    labelText = 'HIGH';
  } else if (score >= 40) {
    scoreColorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    barColorClass = 'bg-amber-500';
    labelText = 'MEDIUM';
  }

  return (
    <div className="bg-slate-900 border border-slate-800/60 rounded-md p-4 space-y-4">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <div>
            <h2 className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              INVESTIGATION PRIORITY
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-950 border border-slate-800 text-slate-300">
          <Zap className="w-3 h-3 text-amber-400" />
          <span>{labelText}</span>
        </div>
      </div>

      {/* Main Overall Score Display */}
      <div className="flex items-center gap-4 p-3 rounded-md bg-slate-950 border border-slate-800/80">
        <div className={`p-3 rounded-md border text-center shrink-0 ${scoreColorClass}`}>
          <span className="text-2xl font-bold font-mono tracking-tight">{score}</span>
          <span className="text-[10px] block font-mono text-slate-500 uppercase mt-0.5">/ 100</span>
        </div>

        <div className="space-y-0.5 text-xs">
          <span className="text-slate-200 font-medium block">Analyst Triage Priority</span>
          <p className="text-slate-400 text-xs leading-normal">
            Calculated investigation score based on weighted risk factors. Priority represents analyst review order, not attack probability.
          </p>
        </div>
      </div>

      {/* Factor Breakdown Bars */}
      <div className="space-y-2.5">
        <h3 className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
          Contributing Risk Factors
        </h3>

        <div className="space-y-2.5">
          {(Object.keys(FACTOR_LABELS) as (keyof PriorityFactors)[]).map((key) => {
            const factorInfo = FACTOR_LABELS[key];
            const points = factors[key] ?? 0;
            const percentage = Math.min(100, Math.round((points / factorInfo.max) * 100));

            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">{factorInfo.name}</span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    <strong className="text-slate-200 font-bold font-mono">{points}</strong> / {factorInfo.max} pts
                  </span>
                </div>

                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                  <div
                    className={`h-full ${barColorClass} rounded-full`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500">{factorInfo.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PriorityBreakdown;
