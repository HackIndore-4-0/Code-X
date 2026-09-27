import React from 'react';
import { Bot, Sparkles, AlertCircle, CheckCircle2, ShieldCheck, Info, Database, Lightbulb } from 'lucide-react';
import type { ExplainResponse } from '../services/incidents';

interface AIExplanationProps {
  explanation?: ExplainResponse | null;
  loading?: boolean;
  className?: string;
}

export const AIExplanation: React.FC<AIExplanationProps> = ({
  explanation,
  loading = false,
  className = '',
}) => {
  const fallbackData: ExplainResponse = {
    summary:
      'Observed telemetry is consistent with a potential multi-stage account escalation: An initial MFA authentication anomaly was followed by an observed privilege shift to db_admin and a 650 MB database export.',
    why_connected: [
      'Shared active session SES-001 observed across USR-007 and DEV-882.',
      'Temporal proximity: Privilege shift was recorded 4 minutes after initial database query.',
      'Statistical correlation score (0.92) across geographic origin shifts.',
    ],
    supporting_evidence: [
      'Observed login from unrecognized IP address in Bucharest, Romania (EVT-1021).',
      'Observed privilege grant of db_admin role to USR-007 (EVT-1025).',
      'Recorded 650 MB database egress initiated from finance vault (EVT-1028).',
    ],
    mitigating_evidence: [
      'Observed completed hardware security key MFA 2 hours prior to anomaly window.',
      'Device DEV-882 is recorded in enterprise MDM system.',
    ],
    why_investigate:
      'Identified risk pattern warrants investigation due to indicators consistent with credential compromise and potential data exfiltration.',
    recommended_actions: [
      'Revoke db_admin role for user USR-007 pending analyst review.',
      'Quarantine endpoint device DEV-882 from corporate network.',
      'Invalidate session SES-001 and request credential reset.',
    ],
  };

  const data = explanation || fallbackData;
  const isFallback = !explanation;

  return (
    <div className={`bg-surface-container border border-outline-variant rounded-md p-4 space-y-4 font-code-sm ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-outline-variant pb-2.5 font-code-sm">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <h3 className="font-label-md text-on-surface">
            AI NARRATIVE EXPLANATION &amp; TRIAGE ASSISTANT
          </h3>
        </div>
        {isFallback ? (
          <span className="font-label-sm px-2 py-0.5 rounded-sm bg-secondary-container/20 text-secondary border border-secondary/40 font-bold">
            DETERMINISTIC FALLBACK MODE
          </span>
        ) : (
          <span className="font-label-sm px-2 py-0.5 rounded-sm bg-primary-container/20 text-primary border border-primary/40 font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            AI EXPLANATION LIVE
          </span>
        )}
      </div>

      {/* Epistemic Status Disclaimer Banner */}
      <div className="p-3 bg-surface-container-lowest border border-outline-variant rounded-md font-body-sm text-on-surface-variant flex items-start gap-2.5">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <strong className="font-code-sm text-primary uppercase font-bold text-[10px] block mb-0.5">
            EPISTEMIC DISCLAIMER:
          </strong>
          This explanation distinguishes observed facts from the system's inferred reasoning. Verify inferred conclusions before acting on them.
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-20 bg-surface-container-high rounded animate-pulse border border-outline-variant" />
          <div className="h-20 bg-surface-container-high rounded animate-pulse border border-outline-variant" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Executive Summary */}
          <div className="p-3.5 bg-surface-container-lowest border border-primary/40 rounded-md space-y-1.5">
            <div className="flex items-center justify-between border-b border-primary/20 pb-1.5 font-code-sm">
              <div className="font-label-sm text-primary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                EXECUTIVE SUMMARY
              </div>
              <span className="font-label-sm px-1.5 py-0.2 rounded-sm bg-tertiary-container/20 text-tertiary border border-tertiary/40 border-dashed flex items-center gap-1">
                <Lightbulb className="w-3 h-3" />
                INFERENCE (HYPOTHESIS)
              </span>
            </div>
            <p className="font-body-sm text-on-surface leading-relaxed pt-1">{data.summary}</p>
          </div>

          {/* Why Connected */}
          <div className="p-3.5 bg-surface-container-lowest border border-outline-variant rounded-md space-y-2">
            <div className="flex items-center justify-between border-b border-outline-variant pb-1.5 font-code-sm">
              <div className="font-label-sm text-on-surface">
                WHY EVENTS ARE CONNECTED
              </div>
              <span className="font-label-sm px-1.5 py-0.2 rounded-sm bg-tertiary-container/20 text-tertiary border border-tertiary/40 border-dashed flex items-center gap-1">
                <Lightbulb className="w-3 h-3" />
                INFERRED REASONING
              </span>
            </div>
            <ul className="space-y-1 font-body-sm text-on-surface pt-1">
              {data.why_connected.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary font-code-sm font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Observed Telemetry Facts */}
          <div className="p-3.5 bg-surface-container-lowest border border-primary/20 rounded-md space-y-2">
            <div className="flex items-center justify-between border-b border-primary/20 pb-1.5 font-code-sm">
              <div className="font-label-sm text-primary">
                SUPPORTING TELEMETRY EVIDENCE
              </div>
              <span className="font-label-sm px-1.5 py-0.2 rounded-sm bg-secondary-container/20 text-secondary border border-secondary/40 flex items-center gap-1">
                <Database className="w-3 h-3" />
                FACT (LOG DATA)
              </span>
            </div>
            <ul className="space-y-1 font-body-sm text-on-surface pt-1">
              {data.supporting_evidence.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary font-code-sm font-bold">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Why Investigate */}
          <div className="p-3.5 bg-surface-container-lowest border border-error/40 rounded-md space-y-1.5">
            <div className="flex items-center justify-between border-b border-error/20 pb-1.5 font-code-sm">
              <div className="font-label-sm text-error flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                WHY INVESTIGATE THIS INCIDENT?
              </div>
              <span className="font-label-sm px-1.5 py-0.2 rounded-sm bg-tertiary-container/20 text-tertiary border border-tertiary/40 border-dashed flex items-center gap-1">
                <Lightbulb className="w-3 h-3" />
                RISK HYPOTHESIS
              </span>
            </div>
            <p className="font-body-sm text-on-surface leading-relaxed pt-1">{data.why_investigate}</p>
          </div>

          {/* Recommended Analyst Actions */}
          <div className="p-3.5 bg-surface-container-lowest border border-secondary/40 rounded-md space-y-2">
            <div className="font-label-sm text-secondary flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              RECOMMENDED REMEDIATION ACTIONS
            </div>
            <div className="space-y-1.5 pt-1">
              {data.recommended_actions.map((act, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-surface-container border border-secondary/30 rounded-sm font-body-sm text-on-surface flex items-center gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-secondary shrink-0 font-code-sm" />
                  <span>{act}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIExplanation;
