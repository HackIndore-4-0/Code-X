import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  startSimulation,
  nextEvent,
  previousEvent,
  resetSimulation,
  getSimulationState,
} from '../services/simulation';
import type { SimulationState, SimulationScenario } from '../types/incident';
import type { NormalizedEvent } from '../types/event';
import type { Priority } from '../types/graph';
import WhatChanged from '../components/simulation/WhatChanged';
import Terminal from '../components/simulation/Terminal';
import { getSimulationThreatScore, getThreatSeverity } from '../services/threatScore';
import { NumberTicker } from '@/registry/magicui/number-ticker';


// ─── Pitch Black SOC Palette (inline style constants) ─────────────────────────
const C = {
  surfaceContainerLowest:  '#030303',
  surfaceContainerLow:     '#050505',
  surfaceContainer:        '#080808',
  surfaceContainerHigh:    '#0d0d0d',
  surfaceContainerHighest: '#141414',
  surfaceBright:           '#1c1c1c',
  surfaceMd3:              '#000000',
  primaryMd3:              '#3B82F6',
  primaryContainerMd3:     '#1d4ed8',
  onPrimaryContainer:      '#ffffff',
  onPrimary:               '#ffffff',
  secondaryMd3:            '#10B981',
  secondaryContainerMd3:   '#047857',
  onSecondaryContainer:    '#ecfdf5',
  secondaryFixed:          '#34d399',
  tertiaryMd3:             '#A78BFA',
  tertiaryContainerMd3:    '#7c3aed',
  onTertiaryContainer:     '#f5f3ff',
  errorMd3:                '#EF4444',
  errorContainerMd3:       '#b91c1c',
  onErrorContainer:        '#fef2f2',
  onSurfaceMd3:            '#E6EAF2',
  onSurfaceVariantMd3:     '#9AA4B2',
  outlineMd3:              '#262626',
  outlineVariantMd3:       '#1a1a1a',
} as const;

// ─── Pipeline stage definitions ───────────────────────────────────────────────
interface PipelineStage {
  num: string;
  key: string;
  label: string;
  sublabel: string;
  note: string;
}

const SUSPICIOUS_PIPELINE: PipelineStage[] = [
  { num: '01', key: 'INGEST',     label: 'Normalization',    sublabel: 'Schema Applied',     note: 'ECS 8.11 strict mapped' },
  { num: '02', key: 'BASELINE',   label: 'User Profiling',   sublabel: 'Behavioral Baseline', note: 'Rolling 30d window' },
  { num: '03', key: 'DETECT',     label: 'Heuristics Engine',sublabel: '2 Triggers Fired',    note: 'Geo-Velocity + Device' },
  { num: '04', key: 'CORRELATE',  label: 'Graph Stitching',  sublabel: '3 Nodes Linked',      note: 'Entity graph update' },
  { num: '05', key: 'SYNTHESIZE', label: 'Story Builder',    sublabel: 'Narrative auto-graph', note: 'Kill-chain synthesis' },
  { num: '06', key: 'PRIORITIZE', label: 'Dynamic Priority', sublabel: 'Score Jump',          note: 'Calculated in real-time' },
  { num: '07', key: 'CONTAIN',    label: 'SOC Action',       sublabel: 'Awaiting Containment', note: 'Isolate & Revoke' },
];

const BENIGN_PIPELINE: PipelineStage[] = [
  { num: '01', key: 'INGEST',    label: 'Normalization',  sublabel: 'Schema Applied',   note: 'ECS 8.11 strict mapped' },
  { num: '02', key: 'BASELINE',  label: 'User Profiling', sublabel: 'Baseline Normal',  note: 'Within 30d range' },
  { num: '03', key: 'DETECT',    label: 'Heuristics',     sublabel: 'No Triggers Fired', note: 'All checks passed' },
];

// Kill-chain timeline data per scenario step
interface KillChainStep {
  label: string;
  time: string;
  projectedScore?: number;
  isActive?: boolean;
  isComplete?: boolean;
}

function buildKillChain(scenario: SimulationScenario, currentStep: number, scores: number[]): KillChainStep[] {
  if (scenario === 'benign') {
    const steps = [
      { label: 'Standard SSO Login', time: 'T=00:00' },
      { label: 'MFA Push Approved', time: 'T=+01:30' },
      { label: 'Wiki Internal Access', time: 'T=+04:00' },
    ];
    return steps.map((s, i) => ({
      ...s,
      isActive:   i === currentStep - 1,
      isComplete: i < currentStep - 1,
      projectedScore: scores[i] ?? 0,
    }));
  }
  const steps = [
    { label: 'Interactive Login (Bucharest)',           time: 'T=00:00'   },
    { label: 'MFA Push Spray Failure',                  time: 'T=+04:12'  },
    { label: 'New Unregistered Device Bound',           time: 'T=+09:30'  },
    { label: 'DB Schema Extraction & Escalation',       time: 'T=+14:38'  },
    { label: 'Cloud IAM Role Impersonation',            time: 'T=+21:05'  },
    { label: 'S3 Bulk Exfiltration via External Bucket', time: 'T=+29:52' },
  ];
  return steps.map((s, i) => ({
    ...s,
    isActive:   i === currentStep - 1,
    isComplete: i < currentStep - 1,
    projectedScore: scores[i] ?? 0,
  }));
}

// ─── Priority factors display config ─────────────────────────────────────────
interface FactorDisplay {
  key: keyof Priority['factors'];
  label: string;
  color: string;
}
const FACTOR_DISPLAY: FactorDisplay[] = [
  { key: 'asset_criticality',      label: 'Asset Criticality',        color: C.errorMd3        },
  { key: 'evidence_strength',      label: 'Corroborated Evidence',    color: C.primaryMd3      },
  { key: 'behavioral_anomaly',     label: 'Behavioral Outlier Index', color: C.tertiaryMd3     },
  { key: 'correlation_strength',   label: 'Graph Correlation Density',color: C.secondaryMd3    },
  { key: 'incident_progression',   label: 'Kill-Chain Progression',   color: C.primaryContainerMd3 },
];

// ─── Event JSON syntax renderer ───────────────────────────────────────────────
function renderJsonToken(key: string, value: unknown) {
  const strVal = typeof value === 'string' ? value : JSON.stringify(value);
  // Colour code by semantic meaning
  const isHighRisk = /finance|db|admin|privilege|escalat|exfiltrat|schema/i.test(strVal) ||
                     /resource|granted_role/i.test(key);
  const isEntityRef = /user_id|device_id|session_id/i.test(key);
  const color = isHighRisk ? C.errorMd3 : isEntityRef ? C.tertiaryMd3 : C.secondaryMd3;
  return { keyColor: C.primaryMd3, valColor: color };
}

// ─── Component ────────────────────────────────────────────────────────────────
export const Simulation: React.FC = () => {
  const [currentState,  setCurrentState]  = useState<SimulationState | null>(null);
  const [previousState, setPreviousState] = useState<SimulationState | null>(null);
  const [loading,        setLoading]       = useState<boolean>(true);
  const [actionPending,  setActionPending] = useState<boolean>(false);
  const [error,          setError]         = useState<string | null>(null);
  const [isPlaying,      setIsPlaying]     = useState<boolean>(false);
  const [playSpeed,      setPlaySpeed]     = useState<number>(1);

  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── API handlers ──────────────────────────────────────────────────────────
  const fetchState = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSimulationState();
      if (!res.success || !res.data) throw new Error(res.error?.message ?? 'Failed to fetch simulation state');
      setCurrentState(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error initializing simulation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getSimulationState();
        if (!mounted) return;
        if (!res.success || !res.data) throw new Error(res.error?.message ?? 'Failed to load simulation');
        setCurrentState(res.data);
      } catch (err: unknown) {
        if (mounted) setError(err instanceof Error ? err.message : 'Error initializing simulation');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleScenarioChange = async (scenario: SimulationScenario) => {
    setIsPlaying(false);
    setActionPending(true);
    setError(null);
    try {
      const res = await startSimulation(scenario);
      if (res.success && res.data) {
        setPreviousState(currentState);
        setCurrentState(res.data);
      } else {
        throw new Error(res.error?.message ?? 'Failed to start scenario');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error changing scenario');
    } finally {
      setActionPending(false);
    }
  };

  const handleNext = useCallback(async () => {
    if (actionPending) return;
    setActionPending(true);
    setError(null);
    try {
      const res = await nextEvent();
      if (res.success && res.data) {
        setPreviousState(currentState);
        setCurrentState(res.data);
      } else {
        throw new Error(res.error?.message ?? 'Unable to process next event');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error advancing simulation');
      setIsPlaying(false);
    } finally {
      setActionPending(false);
    }
  }, [actionPending, currentState]);

  const handlePrevious = async () => {
    if (actionPending) return;
    setIsPlaying(false);
    setActionPending(true);
    setError(null);
    try {
      const res = await previousEvent();
      if (res.success && res.data) {
        setPreviousState(currentState);
        setCurrentState(res.data);
      } else {
        throw new Error(res.error?.message ?? 'Unable to step backward');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error stepping backward');
    } finally {
      setActionPending(false);
    }
  };

  const handleReset = async () => {
    setIsPlaying(false);
    setActionPending(true);
    setError(null);
    try {
      const res = await resetSimulation();
      if (res.success && res.data) {
        setPreviousState(null);
        setCurrentState(res.data);
      } else {
        throw new Error(res.error?.message ?? 'Failed to reset simulation');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error resetting simulation');
    } finally {
      setActionPending(false);
    }
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const scenario       = currentState?.scenario ?? 'suspicious';
  const processedEvts  = currentState?.processed_events ?? [];
  const currentEvent   = currentState?.current_event as NormalizedEvent | undefined;
  const priorityObj    = currentState?.priority as Priority | undefined;
  const prevPriority   = previousState?.priority as Priority | undefined;
  const currentScore   = priorityObj?.score ?? 0;
  const prevScore      = prevPriority?.score ?? 0;
  const scoreDelta     = currentScore - prevScore;
  const currentStep    = processedEvts.length;
  const simThreatScore    = getSimulationThreatScore(currentStep, scenario);
  const simThreatSeverity = getThreatSeverity(simThreatScore);
  const pipeline       = scenario === 'suspicious' ? SUSPICIOUS_PIPELINE : BENIGN_PIPELINE;
  const totalSteps     = scenario === 'suspicious' ? 6 : 3;
  const isAtStart      = currentStep <= 0;
  const isAtEnd        = currentStep >= totalSteps;

  // active pipeline index: map 6 sim events to 7 pipeline stages for suspicious
  const pipelineActiveIdx = scenario === 'suspicious'
    ? Math.min(currentStep, pipeline.length - 1)  // steps 1-6 light up stages 1-6; 7th (CONTAIN) is always future
    : Math.min(currentStep, pipeline.length - 1);

  const SCORES_SUSPICIOUS = [15, 30, 50, 68, 78, 86];
  const SCORES_BENIGN     = [0, 0, 0];
  const killChain = buildKillChain(scenario, currentStep, scenario === 'suspicious' ? SCORES_SUSPICIOUS : SCORES_BENIGN);

  // Factors normalised to %
  const factorPct = (val: number) => Math.min(100, Math.round((val / Math.max(1, currentScore)) * 100));

  // ── Auto-play ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const delay = 2500 / playSpeed;
    if (isPlaying) {
      autoPlayRef.current = setInterval(() => {
        if (!isAtEnd) handleNext();
        else setIsPlaying(false);
      }, delay);
    } else if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
    }
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [isPlaying, isAtEnd, handleNext, playSpeed]);

  // ── Step jump (jump via kill-chain step numbers) ──────────────────────────
  const handleStepJump = async (targetStep: number) => {
    if (actionPending) return;
    if (targetStep === currentStep) return;
    setIsPlaying(false);
    // Reset then advance — simplest approach for deterministic state
    setActionPending(true);
    try {
      const resetRes = await resetSimulation();
      if (!resetRes.success || !resetRes.data) throw new Error('Reset failed');
      let state = resetRes.data;
      for (let i = 0; i < targetStep; i++) {
        const res = await nextEvent();
        if (!res.success || !res.data) break;
        state = res.data;
      }
      setPreviousState(null);
      setCurrentState(state);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Step jump failed');
    } finally {
      setActionPending(false);
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    } catch { return iso; }
  };

  const circleCircumference = 2 * Math.PI * 50; // r=50
  const strokeOffset = circleCircumference * (1 - currentScore / 100);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="flex flex-col gap-4 p-5 min-h-screen"
        style={{ background: C.surfaceMd3, color: C.onSurfaceMd3 }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl"
            style={{ background: C.surfaceContainerLow, height: i === 1 ? 80 : i === 2 ? 120 : 200 }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-4 p-4 sm:p-5 pb-8 min-h-screen"
      style={{ background: C.surfaceMd3, color: C.onSurfaceMd3, fontFamily: 'Inter, sans-serif' }}
    >
      {/* ══════════════════════════════════════════════════════════════════════
          Section 1 — Top Ribbon: Scenario Selector + Playback Transport
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 p-3 rounded-xl"
        style={{ background: C.surfaceContainerLowest, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
      >
        {/* Left: Title + Scenario tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: C.tertiaryMd3 }}>
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
            </svg>
            <div className="flex flex-col">
              <span
                className="text-[10px] font-mono uppercase tracking-widest"
                style={{ color: C.outlineMd3 }}
              >
                Engine Simulation Workspace
              </span>
              <span className="text-base font-semibold" style={{ color: C.onSurfaceMd3 }}>
                Telemetry Replay Lab
              </span>
            </div>
          </div>

          <div
            className="hidden sm:block w-px h-8"
            style={{ background: C.surfaceBright }}
          />

          {/* Scenario toggle */}
          <div
            className="inline-flex p-1 rounded-lg"
            style={{ background: C.surfaceContainer }}
          >
            <button
              onClick={() => handleScenarioChange('suspicious')}
              disabled={actionPending}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-mono font-semibold transition-all"
              style={
                scenario === 'suspicious'
                  ? { background: C.primaryMd3, color: C.onPrimary }
                  : { color: C.onSurfaceVariantMd3 }
              }
            >
              {scenario === 'suspicious' && (
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: C.onPrimary }}
                />
              )}
              Scenario A: Account Compromise & Exfiltration
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                style={
                  scenario === 'suspicious'
                    ? { background: 'rgba(0,46,106,0.25)', color: C.onPrimary }
                    : { background: C.surfaceContainerHigh, color: C.outlineMd3 }
                }
              >
                6 Steps
              </span>
            </button>

            <button
              onClick={() => handleScenarioChange('benign')}
              disabled={actionPending}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-mono font-semibold transition-all"
              style={
                scenario === 'benign'
                  ? { background: C.primaryMd3, color: C.onPrimary }
                  : { color: C.onSurfaceVariantMd3 }
              }
            >
              Scenario B: Benign Enterprise Baseline
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                style={
                  scenario === 'benign'
                    ? { background: 'rgba(0,46,106,0.25)', color: C.onPrimary }
                    : { background: C.surfaceContainerHigh, color: C.outlineMd3 }
                }
              >
                3 Steps
              </span>
            </button>
          </div>
        </div>

        {/* Right: Playback transport */}
        <div
          className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: C.surfaceContainerLow }}
        >
          {/* Transport controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleReset}
              disabled={actionPending}
              title="Reset Simulation"
              className="p-1.5 rounded flex items-center justify-center transition-all"
              style={{ background: C.surfaceContainer, color: C.onSurfaceMd3 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.surfaceBright; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.surfaceContainer; }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
              </svg>
            </button>

            <button
              onClick={handlePrevious}
              disabled={actionPending || isAtStart}
              title="Step Back"
              className="p-1.5 rounded flex items-center justify-center transition-all disabled:opacity-40"
              style={{ background: C.surfaceContainer, color: C.onSurfaceMd3 }}
              onMouseEnter={(e) => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.background = C.surfaceBright; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.surfaceContainer; }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
              </svg>
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={actionPending || isAtEnd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-mono font-semibold transition-all disabled:opacity-40"
              style={
                isPlaying
                  ? { background: C.errorContainerMd3, color: C.onErrorContainer }
                  : { background: C.primaryContainerMd3, color: C.onPrimaryContainer }
              }
            >
              {isPlaying ? (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  Pause Replay
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  Auto Replay
                </>
              )}
            </button>

            <button
              onClick={handleNext}
              disabled={actionPending || isAtEnd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-mono font-semibold transition-all disabled:opacity-40 animate-none"
              style={{ background: C.secondaryContainerMd3, color: C.onSecondaryContainer }}
              onMouseEnter={(e) => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.background = C.secondaryFixed; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.secondaryContainerMd3; }}
            >
              Next Event
              <svg className="w-4 h-4 animate-pulse" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-6 mx-1" style={{ background: C.surfaceBright }} />

          {/* Step jump buttons */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono mr-1" style={{ color: C.outlineMd3 }}>STEP:</span>
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => handleStepJump(n)}
                disabled={actionPending}
                className="w-6 h-6 rounded flex items-center justify-center text-[11px] font-mono font-semibold transition-all disabled:opacity-40"
                style={
                  n === currentStep
                    ? { background: C.primaryMd3, color: C.onPrimary, boxShadow: `0 0 10px rgba(173,198,255,0.35)` }
                    : { background: C.surfaceContainerHigh, color: C.onSurfaceVariantMd3 }
                }
              >
                {n}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-6 mx-1" style={{ background: C.surfaceBright }} />

          {/* Speed */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: C.surfaceContainer }}>
            <span className="text-[10px] font-mono" style={{ color: C.outlineMd3 }}>SPD:</span>
            {[1, 2, 5].map((s) => (
              <button
                key={s}
                onClick={() => setPlaySpeed(s)}
                className="px-1.5 py-0.5 rounded text-[11px] font-mono transition-all"
                style={
                  playSpeed === s
                    ? { background: C.surfaceBright, color: C.primaryMd3, fontWeight: 700 }
                    : { color: C.onSurfaceVariantMd3 }
                }
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div
          className="flex items-center justify-between gap-4 p-3 rounded-lg text-[11px] font-mono"
          style={{ background: 'rgba(255,180,171,0.08)', border: `1px solid rgba(255,180,171,0.25)`, color: C.errorMd3 }}
        >
          <span>⚠ {error}</span>
          <button
            onClick={fetchState}
            className="px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-colors"
            style={{ background: 'rgba(255,180,171,0.15)', color: C.onErrorContainer, border: `1px solid rgba(255,180,171,0.3)` }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Breadcrumb Step Status Bar ── */}
      <div
        className="flex items-center justify-between px-4 py-2 rounded-lg"
        style={{ background: C.surfaceContainer }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded whitespace-nowrap shrink-0"
            style={{ background: C.errorContainerMd3, color: C.onErrorContainer }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ background: C.errorMd3 }} />
            PHASE {currentStep} / {totalSteps}
          </span>
          <span className="text-[12px] font-mono font-semibold truncate" style={{ color: C.onSurfaceMd3 }}>
            {currentEvent
              ? `Step ${currentStep}: ${currentEvent.event_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} — ${currentEvent.event_id}`
              : 'Ready — click Next Event to begin'}
          </span>
          {currentEvent?.timestamp && (
            <span className="text-[10px] font-mono hidden md:inline" style={{ color: C.outlineMd3 }}>
              | {formatTimestamp(currentEvent.timestamp)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono shrink-0" style={{ color: C.secondaryMd3 }}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
          SYNTHETIC PRODUCER STREAM
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          Section 2 — 7-Step Detection Pipeline Visualizer
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="w-full p-4 rounded-xl"
        style={{ background: C.surfaceContainerLowest, boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: C.outlineMd3 }}>
              Detection & Correlation Pipeline Telemetry
            </span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold"
              style={{ background: C.primaryContainerMd3, color: C.onPrimaryContainer }}
            >
              LIVE RUNTIME EVALUATION
            </span>
          </div>
          <span className="text-[11px] font-mono" style={{ color: C.onSurfaceVariantMd3 }}>
            Pipeline Latency: <span className="font-semibold" style={{ color: C.secondaryMd3 }}>18.4ms</span> total
          </span>
        </div>

        <div className={`grid gap-2 ${pipeline.length <= 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-7'}`}>
          {pipeline.map((stage, idx) => {
            const isComplete = idx < pipelineActiveIdx;
            const isActive   = idx === pipelineActiveIdx && currentStep > 0;
            const isFuture   = !isComplete && !isActive;

            return (
              <div
                key={stage.key}
                className="flex flex-col p-2 rounded-lg transition-all relative overflow-hidden"
                style={{
                  background:  isActive ? C.surfaceContainerHigh : isComplete ? C.surfaceContainerLow : C.surfaceContainerLowest,
                  opacity:     isFuture ? (idx === pipeline.length - 1 ? 0.5 : 0.6) : 1,
                  boxShadow:   isActive ? '0 2px 12px rgba(0,0,0,0.4)' : 'none',
                }}
              >
                {isActive && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: `rgba(173,198,255,0.05)` }}
                  />
                )}
                <div className="flex items-center justify-between relative z-10">
                  <span
                    className="text-[10px] font-mono font-bold"
                    style={{ color: isActive ? C.primaryMd3 : C.outlineMd3 }}
                  >
                    {stage.num}. {stage.key}
                  </span>
                  {isComplete ? (
                    <span
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full"
                      style={{ background: C.secondaryContainerMd3, color: C.onSecondaryContainer }}
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </span>
                  ) : isActive ? (
                    <span className="relative flex w-5 h-5 items-center justify-center">
                      <span
                        className="animate-ping absolute inline-flex w-full h-full rounded-full opacity-75"
                        style={{ background: C.primaryMd3 }}
                      />
                      <span
                        className="relative inline-flex rounded-full w-3.5 h-3.5 items-center justify-center text-[9px] font-bold"
                        style={{ background: C.primaryMd3, color: C.onPrimary }}
                      >•</span>
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-mono font-bold"
                      style={
                        stage.key === 'PRIORITIZE' && currentScore > 0
                          ? { background: C.tertiaryContainerMd3, color: C.onTertiaryContainer }
                          : { background: C.surfaceContainer, color: C.outlineMd3 }
                      }
                    >
                      {stage.key === 'PRIORITIZE' && currentScore > 0 ? currentScore : '·'}
                    </span>
                  )}
                </div>

                <div
                  className="text-[13px] font-semibold mt-1 truncate relative z-10"
                  style={{
                    color: isActive   ? '#d8e2ff' /* primary-fixed */
                         : isComplete ? C.onSurfaceMd3
                         : C.onSurfaceVariantMd3,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {stage.label}
                </div>
                <div
                  className="text-[10px] font-mono mt-0.5 flex items-center gap-1 relative z-10"
                  style={{ color: isComplete ? C.secondaryMd3 : isActive ? C.secondaryMd3 : C.outlineMd3 }}
                >
                  {(isComplete || isActive) && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${isActive ? 'animate-pulse' : ''}`}
                      style={{ background: isComplete ? C.secondaryMd3 : C.secondaryMd3 }}
                    />
                  )}
                  {(isComplete || isActive) ? stage.sublabel : <span style={{ color: C.outlineMd3 }}>Pending</span>}
                </div>
                <div
                  className="mt-1.5 text-[10px] font-mono truncate relative z-10"
                  style={{ color: C.outlineMd3 }}
                >
                  {stage.note}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          Live Event Processing Console Terminal (Magic UI Animation)
      ══════════════════════════════════════════════════════════════════════ */}
      <Terminal
        currentState={currentState}
        currentStep={currentStep}
        scenario={scenario}
      />

      {/* ══════════════════════════════════════════════════════════════════════
          Section 3 — "What Changed?" Intelligence Delta Banner
      ══════════════════════════════════════════════════════════════════════ */}
      {currentState && (
        <WhatChanged previousState={previousState} currentState={currentState} />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Section 4 — Dual-Pane Workspace
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ── LEFT PANE: Event Inspector + Heuristics ── */}
        <div
          className="lg:col-span-6 flex flex-col rounded-xl overflow-hidden"
          style={{ background: C.surfaceContainerLowest, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
        >
          {/* Pane header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: C.surfaceContainerLow }}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: C.primaryMd3 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span className="text-[14px] font-semibold" style={{ color: C.onSurfaceMd3 }}>
                Normalized Telemetry & Heuristics
              </span>
            </div>
            <div className="flex items-center gap-2">
              {currentEvent && (
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold"
                  style={{ background: C.surfaceContainer, color: C.secondaryMd3 }}
                >
                  INGESTED: {currentEvent.event_id}
                </span>
              )}
              <span className="text-[10px] font-mono" style={{ color: C.outlineMd3 }}>
                {currentEvent?.event_type ?? 'Awaiting Event'}
              </span>
            </div>
          </div>

          {/* JSON Schema Viewer */}
          <div className="p-4">
            {/* Schema header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: C.outlineMd3 }}>
                  Event Payload Schema
                </span>
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{ background: C.surfaceContainer, color: C.onSurfaceVariantMd3 }}
                >
                  schema_version: 3.4.1
                </span>
              </div>
              <button
                className="flex items-center gap-1 text-[10px] font-mono transition-colors"
                style={{ color: C.outlineMd3 }}
                onClick={() => currentEvent && navigator.clipboard?.writeText(JSON.stringify(currentEvent, null, 2))}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.onSurfaceMd3; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.outlineMd3; }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copy JSON
              </button>
            </div>

            {/* Syntax-highlighted JSON */}
            <pre
              className="w-full p-4 rounded-lg text-[11px] font-mono overflow-x-auto leading-relaxed"
              style={{ background: C.surfaceMd3, color: C.onSurfaceMd3 }}
            >
              {currentEvent ? (
                <code>
                  <span style={{ color: C.outlineMd3 }}>{'{'}</span>{'\n'}
                  {Object.entries(currentEvent).map(([k, v]) => {
                    if (v === undefined || v === null || (typeof v === 'object' && Object.keys(v).length === 0 && k !== 'metadata')) return null;
                    const { keyColor, valColor } = renderJsonToken(k, v);
                    if (k === 'metadata' && typeof v === 'object') {
                      return (
                        <span key={k}>
                          {'  '}<span style={{ color: keyColor }}>&quot;{k}&quot;</span>
                          <span style={{ color: C.onSurfaceMd3 }}>: </span>
                          <span style={{ color: C.outlineMd3 }}>{'{'}</span>{'\n'}
                          {Object.entries(v as Record<string, unknown>).map(([mk, mv]) => {
                            const { valColor: mvc } = renderJsonToken(mk, mv);
                            return (
                              <span key={mk}>
                                {'    '}<span style={{ color: keyColor }}>&quot;{mk}&quot;</span>
                                <span style={{ color: C.onSurfaceMd3 }}>: </span>
                                <span style={{ color: mvc }}>
                                  {typeof mv === 'string' ? `"${mv}"` : JSON.stringify(mv)}
                                </span>{'\n'}
                              </span>
                            );
                          })}
                          {'  '}<span style={{ color: C.outlineMd3 }}>{'}'}</span>{'\n'}
                        </span>
                      );
                    }
                    return (
                      <span key={k}>
                        {'  '}<span style={{ color: keyColor }}>&quot;{k}&quot;</span>
                        <span style={{ color: C.onSurfaceMd3 }}>: </span>
                        <span style={{ color: valColor }}>
                          {typeof v === 'string' ? `"${v}"` : JSON.stringify(v)}
                        </span>{',\n'}
                      </span>
                    );
                  })}
                  <span style={{ color: C.outlineMd3 }}>{'}'}</span>
                </code>
              ) : (
                <code style={{ color: C.outlineMd3 }}>
                  {`// No event processed yet\n// Click "Next Event" to step through the simulation`}
                </code>
              )}
            </pre>

            {/* Anomaly Heuristics Card */}
            {currentEvent && currentScore > 0 && (
              <div
                className="mt-4 p-4 rounded-lg"
                style={{ background: C.surfaceContainer }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[14px] font-semibold" style={{ color: C.onSurfaceMd3 }}>
                    Statistical Anomaly Heuristics
                  </span>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold"
                    style={{
                      background: currentScore >= 60 ? C.errorContainerMd3 : C.surfaceContainerHigh,
                      color:      currentScore >= 60 ? C.onErrorContainer  : C.onSurfaceVariantMd3,
                    }}
                  >
                    {currentScore >= 60 ? 'HEURISTIC HIGH' : currentScore >= 30 ? 'HEURISTIC MEDIUM' : 'HEURISTIC LOW'}
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Geo-velocity — always show after step 2 */}
                  {processedEvts.some((e) => e.event_type === 'new_device' || e.event_type === 'resource_access') && (
                    <div>
                      <div className="flex items-center justify-between text-[12px] mb-1">
                        <span style={{ color: C.onSurfaceVariantMd3 }}>
                          Impossible Travel Velocity ({processedEvts.find((e) => e.location)?.location ?? '?'} → {currentEvent.location ?? '?'})
                        </span>
                        <span className="font-mono font-bold" style={{ color: C.errorMd3 }}>99.4% (1,480 km/h)</span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: C.surfaceContainerHighest }}>
                        <div className="h-full rounded-full" style={{ width: '99.4%', background: C.errorMd3 }} />
                      </div>
                    </div>
                  )}

                  {/* Baseline deviation — show from step 1 */}
                  {currentScore > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-[12px] mb-1">
                        <span style={{ color: C.onSurfaceVariantMd3 }}>Baseline Query Volume Deviation</span>
                        <span className="font-mono font-bold" style={{ color: C.errorMd3 }}>
                          {Math.min(99, Math.round(currentScore * 1.15))}% (+{(currentScore / 18).toFixed(1)}σ)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: C.surfaceContainerHighest }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(99, Math.round(currentScore * 1.15))}%`, background: C.errorMd3 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Device unfamiliarity — after new device */}
                  {processedEvts.some((e) => e.event_type === 'new_device') && (
                    <div>
                      <div className="flex items-center justify-between text-[12px] mb-1">
                        <span style={{ color: C.onSurfaceVariantMd3 }}>
                          Device Unfamiliarity Index ({currentEvent.device_id ?? 'DEV-???'})
                        </span>
                        <span className="font-mono font-bold" style={{ color: C.tertiaryMd3 }}>1.0 (Zero Historical Context)</span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: C.surfaceContainerHighest }}>
                        <div className="h-full rounded-full" style={{ width: '100%', background: C.tertiaryMd3 }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div
                  className="flex items-center justify-between mt-4 pt-2 px-2 py-1 rounded"
                  style={{ background: C.surfaceContainerLow }}
                >
                  <span className="text-[10px] font-mono" style={{ color: C.outlineMd3 }}>
                    EVALUATOR NODE: ANOMALY-CLUSTER-04
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: C.secondaryMd3 }}>
                    Zero false positive dampening override
                  </span>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!currentEvent && (
              <div
                className="mt-4 py-10 text-center rounded-lg border border-dashed"
                style={{ color: C.outlineMd3, borderColor: C.outlineVariantMd3 }}
              >
                <svg className="w-8 h-8 mx-auto mb-2 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
                <p className="text-[11px] font-mono">No event processed — click "Next Event" to begin</p>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANE: Priority Gauge + Narrative + Kill-Chain ── */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          {/* Priority Gauge Card */}
          <div
            className="p-4 rounded-xl"
            style={{ background: C.surfaceContainerLowest, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: C.errorMd3 }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                <span className="text-[14px] font-semibold" style={{ color: C.onSurfaceMd3 }}>
                  Dynamic Multi-Factor Prioritization
                </span>
              </div>
              <span
                className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold"
                style={{
                  background: currentScore >= 70 ? C.errorContainerMd3 : C.surfaceContainerHigh,
                  color:      currentScore >= 70 ? C.onErrorContainer  : C.onSurfaceVariantMd3,
                }}
              >
                {currentScore >= 70 ? 'SEV-1 ELEVATION' : currentScore >= 40 ? 'SEV-2 ELEVATED' : 'MONITORING'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* SVG Circular Gauge */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60" cy="60" r="50" fill="transparent"
                    stroke={C.surfaceBright} strokeWidth="10"
                  />
                  <circle
                    cx="60" cy="60" r="50" fill="transparent"
                    stroke={currentScore >= 70 ? C.errorMd3 : currentScore >= 40 ? C.tertiaryMd3 : C.secondaryMd3}
                    strokeWidth="10"
                    strokeDasharray={circleCircumference}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.5s' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black leading-none" style={{ color: C.onSurfaceMd3, fontFamily: 'Inter, sans-serif' }}>
                    <NumberTicker value={currentScore} />
                  </span>
                  <span className="text-[10px] font-mono uppercase mt-0.5" style={{ color: C.outlineMd3 }}>/ 100 Score</span>
                  {scoreDelta !== 0 && (
                    <span className="text-[11px] font-mono font-bold mt-0.5" style={{ color: C.errorMd3 }}>
                      <NumberTicker
                        value={scoreDelta}
                        format={(v) => (v > 0 ? `+${Math.round(v)}` : `${Math.round(v)}`)}
                      /> Shift
                    </span>
                  )}
                </div>
              </div>

              {/* Factor bars */}
              <div className="flex-1 w-full space-y-2">
                {priorityObj?.factors ? (
                  FACTOR_DISPLAY.map((fd) => {
                    const rawVal = priorityObj.factors[fd.key] ?? 0;
                    const pct    = factorPct(rawVal);
                    return (
                      <div key={fd.key}>
                        <div className="flex justify-between text-[11px] font-mono mb-0.5">
                          <span style={{ color: C.onSurfaceVariantMd3 }}>{fd.label}</span>
                          <span className="font-semibold" style={{ color: C.onSurfaceMd3 }}>
                            <NumberTicker value={pct} />%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: C.surfaceContainerHigh }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: fd.color, transition: 'width 0.8s ease-in-out' }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div
                    className="text-[11px] font-mono text-center py-4"
                    style={{ color: C.outlineMd3 }}
                  >
                    Awaiting first event
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Threat Score Card */}
          <div
            className="p-4 rounded-xl space-y-3"
            style={{ background: C.surfaceContainerLowest, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                </svg>
                <span className="text-[14px] font-semibold" style={{ color: C.onSurfaceMd3 }}>
                  Threat Score
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold" style={{ background: C.surfaceContainerHigh, color: C.outlineMd3, border: `1px solid ${C.outlineVariantMd3}` }}>
                  MOCK DATA
                </span>
              </div>
              <span
                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                style={{
                  background: simThreatScore >= 60 ? 'rgba(147,0,10,0.3)' : simThreatScore >= 40 ? 'rgba(245,158,11,0.2)' : simThreatScore >= 20 ? 'rgba(77,142,255,0.2)' : C.surfaceContainerHigh,
                  color:      simThreatScore >= 60 ? C.errorMd3 : simThreatScore >= 40 ? '#f59e0b' : simThreatScore >= 20 ? C.primaryMd3 : C.onSurfaceVariantMd3,
                  border:     `1px solid ${simThreatScore >= 60 ? 'rgba(255,180,171,0.4)' : simThreatScore >= 40 ? 'rgba(245,158,11,0.4)' : 'rgba(173,198,255,0.4)'}`,
                }}
              >
                {simThreatSeverity.toUpperCase()} SEVERITY
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className="text-3xl font-black leading-none" style={{ color: C.onSurfaceMd3, fontFamily: 'Inter, sans-serif' }}>
                  <NumberTicker value={simThreatScore} />
                </span>
                <span className="text-xs font-medium" style={{ color: C.outlineMd3 }}>/ 100</span>
              </div>
              <span className="text-xs font-mono" style={{ color: C.onSurfaceVariantMd3 }}>
                Suspicious Behavior Severity
              </span>
            </div>

            {/* Progress bar capped <= 79 */}
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: C.surfaceContainerHigh }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(79, simThreatScore)}%`,
                  background: simThreatScore >= 60 ? C.errorMd3 : simThreatScore >= 40 ? '#f59e0b' : simThreatScore >= 20 ? C.primaryMd3 : C.secondaryMd3,
                }}
              />
            </div>

            <p className="text-[11px] font-mono leading-tight" style={{ color: C.onSurfaceVariantMd3 }}>
              {scenario === 'benign'
                ? 'Normal user baseline activity. No threat signals detected.'
                : simThreatScore >= 70
                ? 'Correlated MFA bypass, privilege escalation, and exfiltration staging detected.'
                : simThreatScore >= 40
                ? 'Suspicious authentication anomalies and internal resource probing detected.'
                : simThreatScore > 0
                ? 'Initial geographic anomaly and authentication failure recorded.'
                : 'Awaiting event telemetry to calculate real-time threat score.'}
            </p>
          </div>

          {/* Synthesized Incident Narrative */}
          <div
            className="p-4 rounded-xl flex flex-col"
            style={{ background: C.surfaceContainerLowest, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: C.secondaryMd3 }}>
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                <span className="text-[14px] font-semibold" style={{ color: C.onSurfaceMd3 }}>
                  Synthesized Incident Narrative
                </span>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-mono" style={{ color: C.secondaryMd3 }}>
                <span className="w-2 h-2 rounded-full animate-ping" style={{ background: C.secondaryMd3 }} />
                Dynamic Generation
              </span>
            </div>

            <div
              className="p-4 rounded-lg space-y-3 text-[13px] leading-relaxed"
              style={{ background: C.surfaceContainerLow, color: C.onSurfaceVariantMd3, fontFamily: 'Inter, sans-serif' }}
            >
              {processedEvts.length === 0 ? (
                <p style={{ color: C.outlineMd3, fontStyle: 'italic' }}>
                  Narrative will appear as telemetry events are processed through the pipeline.
                </p>
              ) : (
                <>
                  {processedEvts[0] && (
                    <p>
                      At{' '}
                      <span className="font-mono font-semibold" style={{ color: C.onSurfaceMd3 }}>
                        {processedEvts[0].timestamp}
                      </span>
                      , identity{' '}
                      <span className="font-mono" style={{ color: C.primaryMd3 }}>
                        {processedEvts[0].user_id}
                      </span>{' '}
                      executed an interactive session
                      {processedEvts[0].location ? ` from ${processedEvts[0].location}` : ''}.
                    </p>
                  )}

                  {processedEvts.some((e) => e.event_type === 'mfa_failure') && (
                    <p>
                      Identity failed MFA verification, then authenticated with an unrecognized{' '}
                      <span className="font-mono" style={{ color: C.tertiaryMd3 }}>
                        {processedEvts.find((e) => e.event_type === 'new_device')?.device_id ?? 'device'}
                      </span>{' '}
                      via a new session.
                    </p>
                  )}

                  {processedEvts.some((e) => e.event_type === 'resource_access') && (
                    <div
                      className="p-3 rounded-lg"
                      style={{ background: C.surfaceContainer }}
                    >
                      <div
                        className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase mb-1"
                        style={{ color: C.errorMd3 }}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                        </svg>
                        Step {currentStep} Real-Time Update
                      </div>
                      <p style={{ color: C.onSurfaceMd3, fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
                        Session{' '}
                        <span className="font-mono" style={{ color: C.secondaryMd3 }}>
                          {processedEvts.find((e) => e.event_type === 'resource_access')?.session_id ?? 'SES-???'}
                        </span>{' '}
                        initiated direct access to{' '}
                        <span className="font-mono" style={{ color: C.errorMd3 }}>
                          {processedEvts.find((e) => e.event_type === 'resource_access')?.resource ?? 'finance-db'}
                        </span>
                        . Queried sensitive schema structures with active privilege escalation flags, indicating preparation for data staging.
                      </p>
                    </div>
                  )}

                  {processedEvts.some((e) => e.event_type === 'large_transfer') && (
                    <div
                      className="p-3 rounded-lg"
                      style={{ background: C.surfaceContainer }}
                    >
                      <div
                        className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase mb-1"
                        style={{ color: C.errorMd3 }}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                        </svg>
                        EXFILTRATION CONFIRMED
                      </div>
                      <p style={{ color: C.onSurfaceMd3, fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
                        Bulk transfer of{' '}
                        <span className="font-mono font-bold" style={{ color: C.errorMd3 }}>
                          {(processedEvts.find((e) => e.event_type === 'large_transfer')?.metadata as { transfer_size_mb?: number })?.transfer_size_mb ?? '??'} MB
                        </span>{' '}
                        initiated to external bucket{' '}
                        <span className="font-mono" style={{ color: C.errorMd3 }}>
                          {processedEvts.find((e) => e.event_type === 'large_transfer')?.resource ?? 's3://???'}
                        </span>
                        . Containment action required immediately.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Kill-Chain Timeline */}
          <div
            className="p-4 rounded-xl"
            style={{ background: C.surfaceContainerLowest, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[14px] font-semibold" style={{ color: C.onSurfaceMd3 }}>
                Incident Kill-Chain Timeline
              </span>
              <span className="text-[10px] font-mono" style={{ color: C.outlineMd3 }}>
                {scenario === 'suspicious' ? 'Scenario A Sequence' : 'Scenario B Sequence'}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {killChain.map((step, i) => {
                const stepNum = i + 1;
                const isPast    = step.isComplete;
                const isActive  = step.isActive;
                const isFuture  = !isPast && !isActive;

                return (
                  <div
                    key={i}
                    onClick={() => isFuture ? undefined : handleStepJump(stepNum)}
                    className={`flex items-center justify-between p-2 rounded transition-all ${isFuture ? 'opacity-60' : 'cursor-pointer'}`}
                    style={{
                      background: isActive ? C.surfaceContainerHigh : C.surfaceContainerLow,
                      boxShadow:  isActive ? '0 2px 12px rgba(0,0,0,0.4)' : 'none',
                    }}
                    onMouseEnter={(e) => { if (!isFuture && !isActive) (e.currentTarget as HTMLDivElement).style.background = C.surfaceContainer; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = isActive ? C.surfaceContainerHigh : C.surfaceContainerLow; }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono font-bold shrink-0 ${isActive ? 'animate-pulse' : ''}`}
                        style={
                          isActive  ? { background: C.primaryMd3,          color: C.onPrimary }
                        : isPast    ? { background: C.secondaryContainerMd3, color: C.onSecondaryContainer }
                        :              { background: C.surfaceContainer,      color: C.outlineMd3 }
                        }
                      >
                        {stepNum}
                      </span>
                      <div className="truncate">
                        <span
                          className="text-[12px] font-mono font-semibold"
                          style={{ color: isActive ? C.primaryMd3 : isPast ? C.onSurfaceMd3 : C.onSurfaceVariantMd3 }}
                        >
                          {step.label}
                        </span>
                        <span className="text-[10px] font-mono ml-2" style={{ color: C.outlineMd3 }}>
                          {step.time}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-mono ml-2 font-semibold" style={{ color: C.secondaryMd3 }}>
                            CURRENT
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0"
                      style={
                        isActive
                          ? { background: C.errorContainerMd3, color: C.onErrorContainer }
                          : { background: C.surfaceBright,      color: C.onSurfaceMd3 }
                      }
                    >
                      {isFuture ? `Proj: ${step.projectedScore}` : `Score: ${step.projectedScore}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          Bottom Action Bar — Simulation Sandbox Control
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="flex flex-col md:flex-row items-center justify-between gap-3 p-4 rounded-xl"
        style={{ background: C.surfaceContainerLowest, boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: C.surfaceContainer, color: C.primaryMd3 }}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
            </svg>
          </div>
          <div>
            <div className="text-[14px] font-semibold" style={{ color: C.onSurfaceMd3 }}>
              Simulation Sandbox Control
            </div>
            <div className="text-[10px] font-mono" style={{ color: C.outlineMd3 }}>
              Deterministic replay state active. Zero mutation to production SIEM indices.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              const data = JSON.stringify({ scenario, step: currentStep, state: currentState }, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url  = URL.createObjectURL(blob);
              const a    = document.createElement('a');
              a.href = url; a.download = `tracex-simulation-step${currentStep}.json`; a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-[11px] font-mono font-semibold transition-colors"
            style={{ background: C.surfaceContainerHigh, color: C.onSurfaceMd3 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.surfaceBright; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.surfaceContainerHigh; }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download Replay State
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-[11px] font-mono font-semibold transition-colors"
            style={{ background: C.surfaceContainerHigh, color: C.onSurfaceMd3 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.surfaceBright; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.surfaceContainerHigh; }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
            Inject Custom Telemetry Event
          </button>

          <button
            disabled={!currentState?.incident || Object.keys(currentState.incident ?? {}).length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-[11px] font-mono font-semibold transition-colors disabled:opacity-40"
            style={{ background: C.primaryMd3, color: C.onPrimary }}
            onMouseEnter={(e) => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.background = C.primaryContainerMd3; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.primaryMd3; }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
            Open in Threat Entity Graph
          </button>
        </div>
      </div>
    </div>
  );
};

export default Simulation;
