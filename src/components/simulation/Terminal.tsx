import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal as TerminalIcon, Copy, Check } from 'lucide-react';
import type { NormalizedEvent } from '../../types/event';
import type { SimulationState } from '../../types/incident';

// ─── Props interfaces ────────────────────────────────────────────────────────
export interface TerminalProps {
  currentState: SimulationState | null;
  currentStep: number;
  scenario: string;
}

export interface TerminalLine {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'primary' | 'muted';
  timestamp: string;
  prefix: string;
  text: string;
}

// ─── Helper: Generate realistic pipeline terminal lines based on real event data
export function generateTerminalLines(
  currentState: SimulationState | null,
  currentStep: number,
  scenario: string
): TerminalLine[] {
  if (!currentState || currentStep <= 0) {
    return [
      {
        id: 'init-1',
        type: 'primary',
        timestamp: new Date().toLocaleTimeString(),
        prefix: 'SYSTEM',
        text: 'TraceX Autonomous Security Correlation Engine Terminal Ready',
      },
      {
        id: 'init-2',
        type: 'info',
        timestamp: new Date().toLocaleTimeString(),
        prefix: 'CONFIG',
        text: `Scenario loaded: ${scenario === 'suspicious' ? 'Scenario A (Account Compromise & Exfiltration)' : 'Scenario B (Benign Baseline)'}`,
      },
      {
        id: 'init-3',
        type: 'muted',
        timestamp: new Date().toLocaleTimeString(),
        prefix: 'PROMPT',
        text: 'Awaiting event telemetry. Click "Next Event" or "Auto Replay" to initiate processing.',
      },
    ];
  }

  const currentEvt = currentState.current_event as NormalizedEvent | undefined;
  const evtId = currentEvt?.event_id ?? `EVT-00${currentStep}`;
  const evtType = currentEvt?.event_type ?? 'unknown_event';
  const userId = currentEvt?.user_id ?? 'USR-101';
  const deviceId = currentEvt?.device_id ?? 'DEV-UNKNOWN';
  const resource = currentEvt?.resource ?? 'internal-network';
  const location = currentEvt?.location ?? 'Unknown';
  const score = typeof currentState.priority?.score === 'number' ? currentState.priority.score : 0;
  const incident = currentState.incident;
  const isAnomaly =
    ['mfa_failure', 'new_device', 'new_location', 'privilege_change', 'large_transfer'].includes(evtType) ||
    currentEvt?.metadata?.anomaly === true;

  const timeStr = currentEvt?.timestamp
    ? new Date(currentEvt.timestamp).toLocaleTimeString()
    : new Date().toLocaleTimeString();

  const lines: TerminalLine[] = [
    {
      id: `${evtId}-1`,
      type: 'primary',
      timestamp: timeStr,
      prefix: 'INGEST',
      text: `Receiving raw security telemetry [${evtId}] from edge node`,
    },
    {
      id: `${evtId}-2`,
      type: 'info',
      timestamp: timeStr,
      prefix: 'NORMALIZE',
      text: `ECS 8.11 schema applied: type=${evtType}, user=${userId}, device=${deviceId}, resource=${resource}`,
    },
    {
      id: `${evtId}-3`,
      type: 'info',
      timestamp: timeStr,
      prefix: 'BASELINE',
      text: `Comparing activity against 30-day historical baseline for ${userId} (${location})`,
    },
  ];

  if (isAnomaly) {
    lines.push({
      id: `${evtId}-4`,
      type: 'warning',
      timestamp: timeStr,
      prefix: 'ANOMALY',
      text: `⚠ Behavioral anomaly detected: ${evtType.replace(/_/g, ' ').toUpperCase()} (Geo-velocity / device outlier)`,
    });
  } else {
    lines.push({
      id: `${evtId}-4`,
      type: 'success',
      timestamp: timeStr,
      prefix: 'BASELINE',
      text: `✓ Activity matches expected user behavioral parameters`,
    });
  }

  lines.push({
    id: `${evtId}-5`,
    type: 'info',
    timestamp: timeStr,
    prefix: 'CORRELATE',
    text: `Graph Stitching: Linked ${evtId} to entity node ${userId} & session ${currentEvt?.session_id ?? 'SES-001'}`,
  });

  if (score >= 70) {
    lines.push({
      id: `${evtId}-6`,
      type: 'error',
      timestamp: timeStr,
      prefix: 'PRIORITY',
      text: `CRITICAL ELEVATION: Dynamic Priority Score jumped to ${score}/100 (SEV-1 Critical)`,
    });
  } else if (score >= 40) {
    lines.push({
      id: `${evtId}-6`,
      type: 'warning',
      timestamp: timeStr,
      prefix: 'PRIORITY',
      text: `ELEVATION: Dynamic Priority Score updated to ${score}/100 (SEV-2 Elevated)`,
    });
  } else {
    lines.push({
      id: `${evtId}-6`,
      type: 'success',
      timestamp: timeStr,
      prefix: 'PRIORITY',
      text: `Dynamic Priority Score calculated: ${score}/100 (Normal Monitoring)`,
    });
  }

  if (incident) {
    lines.push({
      id: `${evtId}-7`,
      type: isAnomaly ? 'warning' : 'info',
      timestamp: timeStr,
      prefix: 'INCIDENT',
      text: `Incident ${incident.incident_id} updated: Status = ${incident.status}, Priority = ${incident.priority}`,
    });
  }

  lines.push({
    id: `${evtId}-8`,
    type: 'success',
    timestamp: timeStr,
    prefix: 'COMPLETE',
    text: `✓ Event pipeline cycle finished in 18.4ms. Replay state committed to memory.`,
  });

  return lines;
}

// ─── TypingAnimation Component ───────────────────────────────────────────────
export interface TypingAnimationProps {
  text: string;
  duration?: number;
  onComplete?: () => void;
  className?: string;
}

export const TypingAnimation: React.FC<TypingAnimationProps> = ({
  text,
  duration = 20,
  onComplete,
  className = '',
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
    let i = 0;

    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
        if (onComplete) onComplete();
      }
    }, duration);

    return () => clearInterval(timer);
  }, [text, duration, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {isTyping && (
        <span className="inline-block w-2 h-4 ml-0.5 align-middle bg-[#3B82F6] animate-pulse" />
      )}
    </span>
  );
};

// ─── AnimatedSpan Component ──────────────────────────────────────────────────
export interface AnimatedSpanProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const AnimatedSpan: React.FC<AnimatedSpanProps> = ({
  children,
  delay = 0,
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay, ease: 'easeOut' }}
      className={`flex items-start gap-2 font-mono text-xs leading-relaxed ${className}`}
    >
      {children}
    </motion.div>
  );
};

// ─── Main Terminal Component ─────────────────────────────────────────────────
export const Terminal: React.FC<TerminalProps> = ({
  currentState,
  currentStep,
  scenario,
}) => {
  const [copied, setCopied] = useState(false);
  const [headerTypingDone, setHeaderTypingDone] = useState(false);

  const lines = generateTerminalLines(currentState, currentStep, scenario);
  const currentEvt = currentState?.current_event as NormalizedEvent | undefined;

  const headerCommand = currentEvt
    ? `trcx-engine --stream=event --id=${currentEvt.event_id} --scenario=${scenario}`
    : `trcx-engine --init --mode=simulation --scenario=${scenario}`;

  useEffect(() => {
    setHeaderTypingDone(false);
  }, [currentStep, scenario, currentEvt?.event_id]);

  const handleCopy = () => {
    const textOutput = [
      `$ ${headerCommand}`,
      ...lines.map((l) => `[${l.timestamp}] [${l.prefix}] ${l.text}`),
    ].join('\n');

    navigator.clipboard?.writeText(textOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTypeStyle = (type: TerminalLine['type']) => {
    switch (type) {
      case 'success':
        return 'text-[#4edea3]';
      case 'warning':
        return 'text-amber-400';
      case 'error':
        return 'text-[#ffb4ab] font-bold';
      case 'primary':
        return 'text-[#3B82F6] font-semibold';
      case 'muted':
        return 'text-on-surface-variant/70';
      case 'info':
      default:
        return 'text-on-surface';
    }
  };

  const getPrefixBadge = (type: TerminalLine['type']) => {
    switch (type) {
      case 'error':
        return 'bg-error-container/40 text-error border-error/50';
      case 'warning':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'success':
        return 'bg-secondary-container/20 text-secondary border-secondary/40';
      case 'primary':
        return 'bg-primary-container/20 text-primary border-primary/40';
      case 'muted':
        return 'bg-surface-container-high text-on-surface-variant border-outline-variant';
      default:
        return 'bg-surface-container-high text-on-surface border-outline-variant';
    }
  };

  return (
    <div className="w-full rounded-xl overflow-hidden bg-surface-container-lowest border border-outline-variant/70 shadow-2xl shadow-black/50 font-code-sm">
      {/* ── Terminal Window Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-container-low border-b border-outline-variant/60">
        <div className="flex items-center gap-2">
          {/* macOS / SOC window dots */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56]/90 inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e]/90 inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f]/90 inline-block" />
          </div>

          {/* Title */}
          <div className="flex items-center gap-2 ml-3">
            <TerminalIcon className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span className="text-xs font-semibold text-on-surface font-mono">
              TraceX Event Processing Console
            </span>
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-mono bg-surface-container border border-outline-variant text-on-surface-variant">
              v2.4-REALTIME
            </span>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-secondary-container/20 text-secondary border border-secondary/40">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            STREAMING
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors border border-transparent hover:border-outline-variant cursor-pointer"
            title="Copy Terminal Logs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-secondary" />
                <span className="text-secondary">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Terminal Body ── */}
      <div className="p-4 space-y-3 bg-[#030303] min-h-[220px] max-h-[380px] overflow-y-auto custom-scrollbar font-mono text-xs">
        {/* Command Line Prompt */}
        <div className="flex items-center gap-2 text-on-surface border-b border-outline-variant/30 pb-2">
          <span className="text-[#3B82F6] font-bold">$</span>
          <TypingAnimation
            text={headerCommand}
            duration={15}
            onComplete={() => setHeaderTypingDone(true)}
            className="text-[#3B82F6] font-bold tracking-wide"
          />
        </div>

        {/* Animated Terminal Lines */}
        <AnimatePresence mode="wait">
          <div key={`${currentStep}-${scenario}`} className="space-y-2 pt-1">
            {lines.map((line, index) => {
              const delay = headerTypingDone ? index * 0.08 : 0.1 + index * 0.08;

              return (
                <AnimatedSpan key={line.id} delay={delay}>
                  <span className="text-on-surface-variant/50 shrink-0 text-[10px]">
                    [{line.timestamp}]
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold border shrink-0 ${getPrefixBadge(
                      line.type
                    )}`}
                  >
                    {line.prefix}
                  </span>
                  <span className={`break-words ${getTypeStyle(line.type)}`}>
                    {line.text}
                  </span>
                </AnimatedSpan>
              );
            })}
          </div>
        </AnimatePresence>

        {/* Terminal Cursor Indicator */}
        <div className="pt-2 flex items-center gap-2 text-on-surface-variant/60 text-[11px]">
          <span className="w-1.5 h-3 bg-[#3B82F6] animate-pulse inline-block" />
          <span>Listening for next simulation step...</span>
        </div>
      </div>
    </div>
  );
};

export default Terminal;
