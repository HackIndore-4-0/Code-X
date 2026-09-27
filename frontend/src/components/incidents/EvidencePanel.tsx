import React, { useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck, AlertCircle, RefreshCw, Layers, ChevronRight } from 'lucide-react';
import { getIncidentEvidence } from '../../services/incidents';
import type { Evidence } from '../../types/evidence';

interface EvidencePanelProps {
  incidentId: string;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ incidentId }) => {
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);

  const fetchEvidence = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getIncidentEvidence(incidentId);
      if (!res.success) {
        throw new Error(res.error?.message || 'Failed to fetch evidence data');
      }
      setEvidenceList(res.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading evidence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const res = await getIncidentEvidence(incidentId);
        if (!isMounted) return;
        if (!res.success) {
          throw new Error(res.error?.message || 'Failed to fetch evidence data');
        }
        setEvidenceList(res.data || []);
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error loading evidence');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [incidentId]);

  const supportingItems = evidenceList.filter((ev) => ev.type !== 'MITIGATING');
  const mitigatingItems = evidenceList.filter((ev) => ev.type === 'MITIGATING');

  const formatImpactLabel = (impact: string) => {
    return impact.replace(/_/g, ' ').toUpperCase();
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800/60 rounded-md p-4 space-y-3 animate-pulse">
        <div className="h-4 w-36 bg-slate-800 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="h-32 bg-slate-800/50 rounded-md" />
          <div className="h-32 bg-slate-800/50 rounded-md" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 border border-slate-800/60 rounded-md p-3 flex items-center justify-between text-xs text-red-400 font-mono">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Evidence loading failed: {error}</span>
        </div>
        <button
          onClick={fetchEvidence}
          className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 rounded-md font-medium cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800/60 rounded-md p-4 space-y-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-400" />
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Evidence Panel
          </h2>
          <span className="text-xs font-mono px-2 py-0.2 rounded-md bg-slate-950 text-slate-400 border border-slate-800">
            {evidenceList.length} Items
          </span>
        </div>
        <button
          onClick={fetchEvidence}
          className="text-xs font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* Two Column Layout: Supporting (Left) vs Mitigating (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Supporting Evidence Column */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-red-400 font-mono uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Supporting Evidence ({supportingItems.length})</span>
          </div>

          {supportingItems.length === 0 ? (
            <div className="p-3 border border-dashed border-slate-800/80 rounded-md text-center text-xs font-mono text-slate-500">
              No supporting risk evidence recorded.
            </div>
          ) : (
            <div className="space-y-2">
              {supportingItems.map((item) => {
                const isSelected = selectedEvidence?.evidence_id === item.evidence_id;
                return (
                  <div
                    key={item.evidence_id}
                    onClick={() => setSelectedEvidence(isSelected ? null : item)}
                    className={`p-2.5 bg-slate-950 border rounded-md hover:border-slate-700 transition-colors cursor-pointer space-y-1 ${
                      isSelected ? 'border-amber-500/50 bg-slate-900' : 'border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-red-400 font-bold text-sm">+</span>
                        <span className="text-xs font-semibold text-slate-200">
                          {item.evidence_id}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                          {item.type}
                        </span>
                      </div>
                      <ChevronRight
                        className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                          isSelected ? 'rotate-90 text-amber-400' : ''
                        }`}
                      />
                    </div>

                    <p className="text-xs text-slate-300 font-sans leading-normal">
                      {item.description}
                    </p>

                    {/* Expandable Details */}
                    {isSelected && (
                      <div className="pt-2 border-t border-slate-800/60 space-y-1 text-[11px] text-slate-400 font-mono">
                        {item.event_id && (
                          <div className="flex items-center justify-between">
                            <span>Linked Event:</span>
                            <span className="text-blue-400 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                              {item.event_id}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span>Impact Assessment:</span>
                          <span className="text-red-400 bg-red-500/10 px-1.5 py-0.2 rounded border border-red-500/20 font-bold">
                            {formatImpactLabel(item.impact)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Mitigating Evidence Column */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 font-mono uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Mitigating Evidence ({mitigatingItems.length})</span>
          </div>

          {mitigatingItems.length === 0 ? (
            <div className="p-3 border border-dashed border-slate-800/80 rounded-md text-center text-xs font-mono text-slate-500">
              No mitigating evidence recorded for this incident.
            </div>
          ) : (
            <div className="space-y-2">
              {mitigatingItems.map((item) => {
                const isSelected = selectedEvidence?.evidence_id === item.evidence_id;
                return (
                  <div
                    key={item.evidence_id}
                    onClick={() => setSelectedEvidence(isSelected ? null : item)}
                    className={`p-2.5 bg-slate-950 border rounded-md hover:border-slate-700 transition-colors cursor-pointer space-y-1 ${
                      isSelected ? 'border-emerald-500/50 bg-slate-900' : 'border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold text-sm">−</span>
                        <span className="text-xs font-semibold text-slate-200">
                          {item.evidence_id}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                          {item.type}
                        </span>
                      </div>
                      <ChevronRight
                        className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                          isSelected ? 'rotate-90 text-emerald-400' : ''
                        }`}
                      />
                    </div>

                    <p className="text-xs text-slate-300 font-sans leading-normal">
                      {item.description}
                    </p>

                    {/* Expandable Details */}
                    {isSelected && (
                      <div className="pt-2 border-t border-slate-800/60 space-y-1 text-[11px] text-slate-400 font-mono">
                        {item.event_id && (
                          <div className="flex items-center justify-between">
                            <span>Linked Event:</span>
                            <span className="text-blue-400 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                              {item.event_id}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span>Impact Assessment:</span>
                          <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 font-bold">
                            {formatImpactLabel(item.impact)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvidencePanel;
