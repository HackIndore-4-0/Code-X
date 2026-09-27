import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { SimulationState, Incident } from '../../types/incident';
import type { Priority } from '../../types/graph';
import type { NormalizedEvent } from '../../types/event';
import { NumberTicker } from '@/registry/magicui/number-ticker';


interface WhatChangedProps {
  previousState?: SimulationState | null;
  currentState: SimulationState;
}

// Pitch-black palette inline style values
const C = {
  surfaceContainer:        '#080808',
  surfaceContainerLow:     '#050505',
  surfaceContainerLowest:  '#030303',
  surfaceBright:           '#1c1c1c',
  errorContainer:          '#b91c1c',
  onErrorContainer:        '#fef2f2',
  errorMd3:                '#EF4444',
  primaryMd3:              '#3B82F6',
  primaryContainerMd3:     '#1d4ed8',
  onPrimaryContainer:      '#ffffff',
  secondaryMd3:            '#10B981',
  tertiaryMd3:             '#A78BFA',
  outlineMd3:              '#262626',
  onSurfaceMd3:            '#E6EAF2',
  onSurfaceVariantMd3:     '#9AA4B2',
} as const;

export const WhatChanged: React.FC<WhatChangedProps> = ({ previousState, currentState }) => {
  const navigate = useNavigate();

  const currentPriority = currentState.priority as Priority | undefined;
  const previousPriority = previousState?.priority as Priority | undefined;

  const currentScore  = currentPriority?.score  ?? 0;
  const previousScore = previousPriority?.score ?? 0;
  const scoreDelta    = currentScore - previousScore;

  const currentStep  = (currentState.changes as Record<string, number>)?.current_step  ?? currentState.processed_events?.length ?? 0;
  const prevStep     = currentStep - 1;

  const incidentObj = currentState.incident as Incident | undefined;
  const incidentId  = incidentObj?.incident_id;

  const currentEvent  = currentState.current_event as NormalizedEvent | undefined;
  const processedEvs  = currentState.processed_events ?? [];

  // Build the three edge descriptors from processed events
  const edgeNodes: Array<{ src: string; dst: string }> = [];
  if (processedEvs.length >= 2) {
    const last = processedEvs[processedEvs.length - 1];
    const prev = processedEvs[processedEvs.length - 2];
    if (prev && last) {
      edgeNodes.push({
        src: prev.device_id ?? prev.user_id ?? 'EVT',
        dst: last.resource ?? last.device_id ?? last.event_type,
      });
    }
  }
  if (processedEvs.length >= 1 && currentEvent?.session_id) {
    const last = processedEvs[processedEvs.length - 1];
    edgeNodes.push({
      src: last?.device_id ?? '',
      dst: `session:${currentEvent.session_id}`,
    });
  }

  // Derive MITRE ATT&CK tags from event types in current event
  const mitreMap: Record<string, { tag: string; label: string }[]> = {
    privilege_change: [
      { tag: 'T1078.004', label: 'Cloud Admin Identity Misuse' },
    ],
    resource_access: [
      { tag: 'T1005',     label: 'Data from Local System' },
    ],
    large_transfer: [
      { tag: 'T1048',     label: 'Exfiltration Over Alt Protocol' },
    ],
    new_device: [
      { tag: 'T1078',     label: 'Valid Accounts — Device Registrar' },
    ],
    mfa_failure: [
      { tag: 'T1110.004', label: 'MFA Push Spray' },
    ],
    login: [
      { tag: 'T1078.002', label: 'Domain Account Access' },
    ],
  };
  const mitreTags = currentEvent ? (mitreMap[currentEvent.event_type] ?? []) : [];

  // Fact & hypothesis per event
  const factMap: Record<string, string> = {
    privilege_change: `DB Role Grant Audit #${currentEvent?.event_id ?? ''} verified`,
    resource_access:  `DB Query Audit Log #${currentEvent?.event_id ?? ''} verified`,
    large_transfer:   `Transfer Log #${currentEvent?.event_id ?? ''} confirmed`,
    new_device:       `Device Registration Log #${currentEvent?.event_id ?? ''} recorded`,
    mfa_failure:      `Auth Failure Log #${currentEvent?.event_id ?? ''} verified`,
    login:            `Session Auth Log #${currentEvent?.event_id ?? ''} verified`,
  };
  const hypothesisMap: Record<string, string> = {
    privilege_change: 'Privilege Escalation for Data Staging',
    resource_access:  'Internal Recon & Schema Extraction',
    large_transfer:   'Bulk Exfiltration to External Bucket',
    new_device:       'Unmanaged Device Lateral Movement',
    mfa_failure:      'Credential Spray / Account Takeover',
    login:            'Anomalous Geographic Access',
  };
  const factText       = currentEvent ? (factMap[currentEvent.event_type]       ?? `Audit Log #${currentEvent.event_id} recorded`) : '';
  const hypothesisText = currentEvent ? (hypothesisMap[currentEvent.event_type] ?? 'Threat actor persistence') : '';

  const hasDelta = scoreDelta !== 0;

  return (
    <div
      className="w-full p-4 rounded-xl transition-all"
      style={{ background: C.surfaceContainer, boxShadow: '0 8px 32px rgba(0,0,0,0.45)' }}
    >
      {/* ── Header: title + context + action buttons ── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className="p-2.5 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: C.errorContainer, color: C.onErrorContainer }}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8v4M11 15h.01"/>
            </svg>
          </div>

          <div className="min-w-0">
            {/* Tag row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[10px] font-mono font-semibold uppercase tracking-widest px-2 py-0.5 rounded"
                style={{ background: C.surfaceBright, color: C.onSurfaceMd3 }}
              >
                Replay Delta
              </span>
              <span
                className="text-[11px] font-mono"
                style={{ color: C.outlineMd3 }}
              >
                Step {prevStep} → Step {currentStep} Shift
              </span>
              {hasDelta && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded"
                  style={{ background: 'rgba(255,180,171,0.18)', color: C.errorMd3 }}
                >
                  ▲ PRIORITY SURGE:{' '}
                  <NumberTicker
                    value={scoreDelta}
                    format={(v) => (v > 0 ? `+${Math.round(v)}` : `${Math.round(v)}`)}
                  />{' '}
                  PTS (<NumberTicker value={previousScore} /> → <NumberTicker value={currentScore} />)
                </span>
              )}
            </div>

            {/* Title */}
            <div
              className="text-base font-semibold mt-1 leading-snug"
              style={{ color: C.onSurfaceMd3, fontFamily: 'Inter, sans-serif' }}
            >
              {currentEvent?.event_type === 'resource_access'
                ? 'High-Privileged Database Access without Active Change Ticket on Tier-0 Finance Cluster'
                : currentEvent?.event_type === 'privilege_change'
                ? 'Unauthorized Privilege Escalation on Tier-0 Finance Database'
                : currentEvent?.event_type === 'large_transfer'
                ? 'Bulk S3 Exfiltration Detected — External Bucket Staging'
                : currentEvent?.event_type === 'new_device'
                ? 'Unrecognized Workstation Registered to Compromised Identity'
                : currentEvent?.event_type === 'mfa_failure'
                ? 'MFA Push Spray Attack on Active Enterprise Identity'
                : currentEvent?.event_type === 'login'
                ? 'Anomalous Interactive Login from Geo-Velocity Outlier Location'
                : `Event ${currentEvent?.event_id ?? ''}: ${currentEvent?.event_type ?? 'Processing'}`}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-mono font-semibold transition-colors"
            style={{ background: C.surfaceContainerLow, color: C.onSurfaceMd3 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.surfaceBright; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.surfaceContainerLow; }}
          >
            <svg className="w-3.5 h-3.5" style={{ color: C.primaryMd3 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            View Graph Pivot
          </button>

          {incidentId && (
            <button
              onClick={() => navigate(`/incidents/${incidentId}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-mono font-semibold transition-colors"
              style={{ background: C.primaryContainerMd3, color: C.onPrimaryContainer }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.primaryMd3; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.primaryContainerMd3; }}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              Inspect {incidentId}
            </button>
          )}
        </div>
      </div>

      {/* ── Delta Grid: 3 columns ── */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4 pt-4 p-3 rounded-lg"
        style={{ background: 'rgba(10,14,22,0.6)' }}
      >
        {/* Col 1: Graph Edges */}
        <div
          className="flex flex-col p-3 rounded"
          style={{ background: C.surfaceContainerLow }}
        >
          <div
            className="flex items-center gap-1 text-[10px] font-mono font-semibold uppercase mb-2"
            style={{ color: C.primaryMd3 }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.4 4.6 3.9 7 4 -.1-2.2.5-4.6 2-6.5 1.8-.3 4 .3 5 1.3z"/>
            </svg>
            New Graph Edges Forged ({edgeNodes.length || processedEvs.length})
          </div>
          <div className="text-[11px] font-mono break-all space-y-1" style={{ color: C.onSurfaceMd3 }}>
            {processedEvs.length > 0 ? (
              <>
                <div>
                  <span style={{ color: C.tertiaryMd3 }}>{currentEvent?.device_id ?? 'DEV-???'}</span>
                  {currentEvent?.ip_address ? <span style={{ color: C.outlineMd3 }}> ({currentEvent.ip_address})</span> : null}
                </div>
                <div>
                  <span style={{ color: C.outlineMd3 }}>—→ </span>
                  <span style={{ color: C.secondaryMd3 }}>
                    {currentEvent?.session_id ? `session:${currentEvent.session_id}` : `usr:${currentEvent?.user_id ?? '?'}`}
                  </span>
                </div>
                {currentEvent?.resource && (
                  <div>
                    <span style={{ color: C.outlineMd3 }}>—→ </span>
                    <span style={{ color: C.errorMd3 }}>{currentEvent.resource}</span>
                  </div>
                )}
              </>
            ) : (
              <span style={{ color: C.outlineMd3 }}>No edges yet</span>
            )}
          </div>
        </div>

        {/* Col 2: Epistemic Delta */}
        <div
          className="flex flex-col p-3 rounded"
          style={{ background: C.surfaceContainerLow }}
        >
          <div
            className="flex items-center gap-1 text-[10px] font-mono font-semibold uppercase mb-2"
            style={{ color: C.secondaryMd3 }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Epistemic Delta Registered
          </div>
          <div className="flex flex-col gap-1.5 text-[11px] font-mono">
            {factText ? (
              <div className="flex items-center gap-1.5" style={{ color: C.secondaryMd3 }}>
                <span className="text-[10px]">◆ FACT</span>
                <span className="truncate" style={{ color: C.onSurfaceMd3 }}>{factText}</span>
              </div>
            ) : null}
            {hypothesisText ? (
              <div className="flex items-center gap-1.5" style={{ color: C.tertiaryMd3 }}>
                <span className="text-[10px]">◇ HYPOTHESIS</span>
                <span className="truncate" style={{ color: C.onSurfaceMd3 }}>{hypothesisText}</span>
              </div>
            ) : null}
            {!factText && !hypothesisText && (
              <span style={{ color: C.outlineMd3 }}>Awaiting first event</span>
            )}
          </div>
        </div>

        {/* Col 3: Triggered Detection Rules */}
        <div
          className="flex flex-col p-3 rounded"
          style={{ background: C.surfaceContainerLow }}
        >
          <div
            className="flex items-center gap-1 text-[10px] font-mono font-semibold uppercase mb-2"
            style={{ color: C.errorMd3 }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            Triggered Detection Rules
          </div>
          <div className="text-[11px] font-mono space-y-1" style={{ color: C.onSurfaceVariantMd3 }}>
            {mitreTags.length > 0 ? (
              mitreTags.map((t) => (
                <div key={t.tag} className="truncate">
                  <span className="font-bold" style={{ color: C.errorMd3 }}>[{t.tag}]</span>
                  {' '}{t.label}
                </div>
              ))
            ) : (
              <span style={{ color: C.outlineMd3 }}>No rules triggered</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatChanged;
