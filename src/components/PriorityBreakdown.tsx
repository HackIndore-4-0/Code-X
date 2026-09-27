import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Zap, ShieldAlert } from 'lucide-react';
import type { Priority, PriorityFactors } from '../types/graph';
import { NumberTicker } from '@/registry/magicui/number-ticker';

interface PriorityBreakdownProps {
  priority?: Priority;
  score?: number;
  className?: string;
}

const DEFAULT_FACTORS: PriorityFactors = {
  behavioral_anomaly:    24,
  correlation_strength:  18,
  asset_criticality:     17,
  incident_progression:  14,
  evidence_strength:     13,
};

const FACTOR_CONFIG: { key: keyof PriorityFactors; name: string; color: string; desc: string }[] = [
  { key: 'behavioral_anomaly',   name: 'Behavioral Anomaly',   color: '#ffb4ab', desc: 'Deviations from user baseline & location anomalies' },
  { key: 'correlation_strength', name: 'Correlation Strength', color: '#adc6ff', desc: 'Temporal and session alignment across telemetry' },
  { key: 'asset_criticality',    name: 'Asset Criticality',    color: '#d0bcff', desc: 'Sensitivity of target databases, vaults, or assets' },
  { key: 'incident_progression', name: 'Incident Progression', color: '#4edea3', desc: 'Multi-stage progression and privilege escalation' },
  { key: 'evidence_strength',    name: 'Evidence Strength',    color: '#8c909f', desc: 'Verification strength & multi-source evidence' },
];

export const PriorityBreakdown: React.FC<PriorityBreakdownProps> = ({ priority, score: propScore, className = '' }) => {
  const currentScore = priority?.score ?? propScore ?? 86;
  const factors = priority?.factors ?? DEFAULT_FACTORS;

  const chartData = FACTOR_CONFIG.map((f) => ({
    name:  f.name,
    score: factors[f.key] ?? 0,
    color: f.color,
  }));

  const labelText =
    currentScore >= 70 ? 'HIGH' :
    currentScore >= 40 ? 'MEDIUM' : 'LOW';

  const isCritical = currentScore >= 70;
  const isWarning = currentScore >= 40;

  return (
    <div className={`rounded-md p-4 space-y-4 font-code-sm bg-surface-container border border-outline-variant ${className}`}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-2.5 border-b border-outline-variant font-code-sm">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <h3 className="font-label-md text-on-surface">
            INVESTIGATION PRIORITY BREAKDOWN
          </h3>
        </div>
        <span
          className={`font-label-sm px-2 py-0.5 rounded-sm font-bold border ${
            isCritical
              ? 'bg-error-container/20 text-error border-error/40'
              : isWarning
              ? 'bg-secondary-container/20 text-secondary border-secondary/40'
              : 'bg-primary-container/20 text-primary border-primary/40'
          }`}
        >
          {labelText} PRIORITY (<NumberTicker value={currentScore} />/100)
        </span>
      </div>

      {/* ── Score Hero ── */}
      <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-md bg-surface-container-lowest border border-outline-variant">
        {/* Score Circle */}
        <div className="text-center p-3 rounded-md min-w-[90px] bg-surface-container border border-outline-variant">
          <div className={`text-3xl font-extrabold leading-none ${isCritical ? 'text-error' : 'text-primary'}`}>
            <NumberTicker value={currentScore} />
          </div>
          <div className="font-label-sm text-on-surface-variant mt-1">
            TOTAL SCORE
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1 font-body-sm text-on-surface-variant">
          <span className="font-code-sm text-on-surface font-semibold flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-primary" />
            Weighted Intelligence Score
          </span>
          <p className="font-body-sm text-on-surface-variant leading-relaxed">
            Priority represents human analyst triage order based on structured telemetry signals.
            It is NOT attack probability.
          </p>
        </div>
      </div>

      {/* ── Recharts Bar Chart ── */}
      <div className="space-y-1 font-code-sm">
        <div className="font-label-sm text-on-surface-variant mb-2">
          FACTOR CONTRIBUTION CHART
        </div>
        <div className="h-44 w-full p-2 rounded-md bg-surface-container-lowest border border-outline-variant">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
              <XAxis
                type="number"
                domain={[0, 30]}
                stroke="#424754"
                fontSize={10}
                tickLine={false}
                tick={{ fill: '#8c909f' }}
              />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#424754"
                fontSize={10}
                width={120}
                tickLine={false}
                tick={{ fill: '#c2c6d6' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1c2028',
                  borderColor:     '#8c909f',
                  color:           '#dfe2ee',
                  fontSize:        '11px',
                  fontFamily:      'JetBrains Mono, monospace',
                  borderRadius:    '4px',
                }}
                formatter={(val) => [`${val} points`, 'Contribution']}
                cursor={{ fill: 'rgba(173, 198, 255, 0.05)' }}
              />
              <Bar dataKey="score" radius={[0, 2, 2, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Factor List ── */}
      <div className="space-y-2 pt-2 border-t border-outline-variant font-code-sm">
        <div className="font-label-sm text-on-surface-variant flex items-center justify-between">
          <span>FACTOR DETAILS</span>
          <span>SCORE CONTRIBUTION</span>
        </div>

        <div className="space-y-2">
          {FACTOR_CONFIG.map((f) => {
            const pts = factors[f.key] ?? 0;
            return (
              <div
                key={f.key}
                className="p-2.5 rounded-md space-y-1 bg-surface-container-lowest border border-outline-variant hover:border-outline transition-colors"
              >
                <div className="flex items-center justify-between font-code-sm">
                  <span className="font-semibold text-on-surface flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: f.color }}
                    />
                    {f.name}
                  </span>
                  <span className="font-bold text-on-surface">
                    +<NumberTicker value={pts} /> pts
                  </span>
                </div>
                <p className="font-body-sm text-on-surface-variant">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PriorityBreakdown;
