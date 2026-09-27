import React from 'react';
import { motion } from 'framer-motion';
import { Layers, Activity, AlertTriangle, GitFork, ShieldAlert, Zap, ChevronRight } from 'lucide-react';
import type { PipelineStage } from '../hooks/useSimulation';

interface PipelineStripProps {
  activeStage: PipelineStage;
  className?: string;
}

const STAGES: { id: PipelineStage; label: string; icon: React.ElementType }[] = [
  { id: 'Normalization', label: 'Normalization', icon: Layers },
  { id: 'Baseline',      label: 'Baseline',      icon: Activity },
  { id: 'Anomaly',       label: 'Anomaly',        icon: AlertTriangle },
  { id: 'Correlation',   label: 'Correlation',    icon: GitFork },
  { id: 'Incident',      label: 'Incident',       icon: ShieldAlert },
  { id: 'Priority',      label: 'Priority',       icon: Zap },
];

export const PipelineStrip: React.FC<PipelineStripProps> = ({ activeStage, className = '' }) => {
  const activeIndex = STAGES.findIndex((s) => s.id === activeStage);

  return (
    <div
      className={`rounded-xl p-3 font-mono ${className}`}
      style={{
        background: '#050505',
        border: '1px solid #1a1a1a',
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between text-[10px] uppercase tracking-wider mb-3"
        style={{ color: '#9AA4B2' }}
      >
        <span className="flex items-center gap-1.5 font-semibold" style={{ color: '#60A5FA' }}>
          <Layers className="w-3.5 h-3.5" />
          INTELLIGENCE PIPELINE STAGE
        </span>
        <span style={{ color: '#9AA4B2' }}>
          Active:{' '}
          <strong style={{ color: '#60A5FA' }}>{activeStage}</strong>
        </span>
      </div>

      {/* ── Stage Nodes ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isActive = stage.id === activeStage;
          const isPassed = idx <= (activeIndex === -1 ? STAGES.length - 1 : activeIndex);

          return (
            <div key={stage.id} className="relative flex items-center">
              <motion.div
                animate={{
                  scale: isActive ? 1.04 : 1,
                }}
                transition={{ duration: 0.2 }}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200"
                style={
                  isActive
                    ? {
                        background:  'rgba(59, 130, 246, 0.15)',
                        border:      '1px solid rgba(59, 130, 246, 0.5)',
                        color:       '#60A5FA',
                        boxShadow:   '0 0 16px -4px rgba(59, 130, 246, 0.35)',
                      }
                    : isPassed
                    ? {
                        background:  '#0a0a0a',
                        border:      '1px solid #1a1a1a',
                        color:       '#E6EAF2',
                      }
                    : {
                        background:  '#030303',
                        border:      '1px solid #121212',
                        color:       '#6B7785',
                      }
                }
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'animate-pulse' : ''}`}
                  style={{
                    color: isActive ? '#60A5FA' : isPassed ? '#93C5FD' : '#6B7785',
                  }}
                />
                <span className="truncate">{stage.label}</span>
              </motion.div>

              {idx < STAGES.length - 1 && (
                <ChevronRight
                  className="w-3.5 h-3.5 absolute -right-2 z-10 hidden md:block"
                  style={{ color: isPassed ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.12)' }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineStrip;
