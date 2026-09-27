import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, CheckCircle2, Info, ChevronRight, X, Database, Lightbulb } from 'lucide-react';
import type { Evidence } from '../types/evidence';
import { NumberTicker } from '@/registry/magicui/number-ticker';

interface EvidencePanelProps {
  evidenceList?: Evidence[];
  loading?: boolean;
  className?: string;
}

export function getEpistemicStatus(item: Evidence): {
  type: 'FACT' | 'INFERENCE';
  label: string;
  badgeStyle: string;
  icon: React.ElementType;
} {
  if (item.event_id && item.event_id.trim() !== '') {
    return {
      type: 'FACT',
      label: '◆ FACT (Log Data)',
      badgeStyle: 'bg-secondary-container/20 text-secondary border-secondary/40',
      icon: Database,
    };
  }
  return {
    type: 'INFERENCE',
    label: '◇ INFERENCE (Hypothesis)',
    badgeStyle: 'bg-tertiary-container/20 text-tertiary border-tertiary/40 border-dashed',
    icon: Lightbulb,
  };
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  evidenceList = [],
  loading = false,
  className = '',
}) => {
  const [selectedItem, setSelectedItem] = useState<Evidence | null>(null);

  const items: Evidence[] = evidenceList.length > 0 ? evidenceList : [
    {
      evidence_id: 'EVD-101',
      incident_id: 'INC-042',
      event_id: 'EVT-1021',
      type: 'SUPPORTING',
      description: 'MFA failure followed by immediate session creation from unrecognized geolocation (Bucharest, Romania).',
      impact: 'increases_priority (+24)',
    },
    {
      evidence_id: 'EVD-102',
      incident_id: 'INC-042',
      event_id: 'EVT-1025',
      type: 'SUPPORTING',
      description: 'Unauthorized privilege change to db_admin granted outside change window.',
      impact: 'increases_priority (+18)',
    },
    {
      evidence_id: 'EVD-103',
      incident_id: 'INC-042',
      event_id: 'EVT-1028',
      type: 'SUPPORTING',
      description: 'Large file transfer (650 MB) initiated directly from sensitive finance vault DB.',
      impact: 'increases_priority (+30)',
    },
    {
      evidence_id: 'EVD-104',
      incident_id: 'INC-042',
      type: 'SUPPORTING',
      description: 'Temporal sequence alignment suggests potential automated session takeover attack chain.',
      impact: 'increases_priority (+15)',
    },
    {
      evidence_id: 'EVD-201',
      incident_id: 'INC-042',
      event_id: 'EVT-1010',
      type: 'MITIGATING',
      description: 'User USR-007 completed hardware security key MFA verification 2 hours prior.',
      impact: 'reduces_priority (-12)',
    },
    {
      evidence_id: 'EVD-202',
      incident_id: 'INC-042',
      event_id: 'EVT-1012',
      type: 'MITIGATING',
      description: 'Device DEV-882 is enrolled in enterprise Mobile Device Management (MDM) with active endpoint agent.',
      impact: 'reduces_priority (-8)',
    },
  ];

  const supportingItems = items.filter((e) => e.type === 'SUPPORTING' || e.type === 'ANOMALY' || e.type === 'PROGRESSION');
  const mitigatingItems = items.filter((e) => e.type === 'MITIGATING');

  return (
    <div className={`space-y-4 font-code-sm ${className}`}>
      <div className="flex items-center justify-between border-b border-outline-variant pb-2">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          <h3 className="font-label-md text-on-surface">
            STRUCTURED EVIDENCE FINDINGS
          </h3>
        </div>
        <span className="font-body-sm text-on-surface-variant">Distinguishes Observed Facts from Inferred Reasoning</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-28 bg-surface-container-high rounded-md animate-pulse border border-outline-variant" />
          <div className="h-28 bg-surface-container-high rounded-md animate-pulse border border-outline-variant" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Supporting Evidence */}
          <div className="bg-surface-container border border-error/40 rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-error/20 pb-2 font-code-sm">
              <div className="flex items-center gap-2 text-error font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>SUPPORTING EVIDENCE (<NumberTicker value={supportingItems.length} />)</span>
              </div>
              <span className="font-label-sm px-1.5 py-0.5 rounded-sm bg-error-container/20 text-error border border-error/40">
                INCREASES PRIORITY
              </span>
            </div>

            <div className="space-y-2">
              {supportingItems.map((item) => {
                const epistemic = getEpistemicStatus(item);
                const IconComp = epistemic.icon;

                return (
                  <div
                    key={item.evidence_id}
                    onClick={() => setSelectedItem(item)}
                    className="p-3 bg-surface-container-lowest border border-error/30 hover:border-error rounded-md transition-colors cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-code-sm">
                      <span className="font-bold text-error">{item.evidence_id}</span>
                      
                      <span className={`font-label-sm px-2 py-0.5 rounded-sm border font-semibold flex items-center gap-1 ${epistemic.badgeStyle}`}>
                        <IconComp className="w-3 h-3 shrink-0" />
                        {epistemic.label}
                      </span>
                    </div>

                    <p className="font-body-sm text-on-surface leading-relaxed">
                      {item.description}
                    </p>

                    <div className="flex items-center justify-between pt-1 font-code-sm text-error font-semibold border-t border-outline-variant/40">
                      <span className="text-on-surface-variant">
                        Source: <strong className="text-on-surface">{item.event_id || 'Derived Correlation'}</strong>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-error" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mitigating Evidence */}
          <div className="bg-surface-container border border-secondary/40 rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-secondary/20 pb-2 font-code-sm">
              <div className="flex items-center gap-2 text-secondary font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>MITIGATING EVIDENCE (<NumberTicker value={mitigatingItems.length} />)</span>
              </div>
              <span className="font-label-sm px-1.5 py-0.5 rounded-sm bg-secondary-container/20 text-secondary border border-secondary/40">
                REDUCES PRIORITY
              </span>
            </div>

            <div className="space-y-2">
              {mitigatingItems.map((item) => {
                const epistemic = getEpistemicStatus(item);
                const IconComp = epistemic.icon;

                return (
                  <div
                    key={item.evidence_id}
                    onClick={() => setSelectedItem(item)}
                    className="p-3 bg-surface-container-lowest border border-secondary/30 hover:border-secondary rounded-md transition-colors cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-code-sm">
                      <span className="font-bold text-secondary">{item.evidence_id}</span>
                      
                      <span className={`font-label-sm px-2 py-0.5 rounded-sm border font-semibold flex items-center gap-1 ${epistemic.badgeStyle}`}>
                        <IconComp className="w-3 h-3 shrink-0" />
                        {epistemic.label}
                      </span>
                    </div>

                    <p className="font-body-sm text-on-surface leading-relaxed">
                      {item.description}
                    </p>

                    <div className="flex items-center justify-between pt-1 font-code-sm text-secondary font-semibold border-t border-outline-variant/40">
                      <span className="text-on-surface-variant">
                        Source: <strong className="text-on-surface">{item.event_id || 'Derived Correlation'}</strong>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-secondary" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Item Inspection Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-surface-container-lowest/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container border border-primary/40 rounded-md max-w-lg w-full p-5 space-y-4 shadow-2xl font-code-sm">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <h4 className="font-headline-sm text-on-surface">EVIDENCE DETAIL — {selectedItem.evidence_id}</h4>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="btn-ghost p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 font-code-sm">
              <div className="flex justify-between items-center text-on-surface-variant">
                <span>Epistemic Status:</span>
                <span className={`px-2 py-0.5 rounded-sm border font-bold font-label-sm ${getEpistemicStatus(selectedItem).badgeStyle}`}>
                  {getEpistemicStatus(selectedItem).type === 'FACT' ? 'FACT — Directly Observed Log Data' : 'INFERENCE — System Derived Hypothesis'}
                </span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Evidence Impact:</span>
                <span className="text-primary font-bold">{selectedItem.type} ({selectedItem.impact})</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Source Event ID:</span>
                <span className="text-on-surface font-bold">{selectedItem.event_id || 'N/A (Derived Correlation)'}</span>
              </div>
              <div className="pt-2 text-on-surface font-body-md bg-surface-container-lowest p-3 rounded-md border border-outline-variant leading-relaxed">
                {selectedItem.description}
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedItem(null)}
                className="btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidencePanel;
