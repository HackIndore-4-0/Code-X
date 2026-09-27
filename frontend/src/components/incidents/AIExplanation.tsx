import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Bot,
  AlertCircle,
  RefreshCw,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  ListOrdered,
  FileText,
} from 'lucide-react';
import { explainIncident, getIncidentEvidence } from '../../services/incidents';
import type { ExplainResponse } from '../../services/incidents';
import type { Evidence } from '../../types/evidence';

interface AIExplanationProps {
  incidentId: string;
}

export const AIExplanation: React.FC<AIExplanationProps> = ({ incidentId }) => {
  const [data, setData] = useState<ExplainResponse | null>(null);
  const [fallbackEvidence, setFallbackEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState<boolean>(false);

  const fetchAIExplanation = async () => {
    setLoading(true);
    setError(null);
    setIsFallbackMode(false);

    try {
      const res = await explainIncident(incidentId);

      if (res.success && res.data) {
        setData(res.data);
      } else {
        throw new Error(res.error?.message || 'AI service returned an invalid response');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'AI explanation service error';
      setError(errorMsg);
      setIsFallbackMode(true);

      try {
        const evRes = await getIncidentEvidence(incidentId);
        if (evRes.success && evRes.data) {
          setFallbackEvidence(evRes.data);
        }
      } catch {
        // Ignore secondary fallback error
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const res = await explainIncident(incidentId);

        if (!isMounted) return;

        if (res.success && res.data) {
          setData(res.data);
        } else {
          throw new Error(res.error?.message || 'AI service returned an invalid response');
        }
      } catch (err: unknown) {
        if (isMounted) {
          const errorMsg = err instanceof Error ? err.message : 'AI explanation service error';
          setError(errorMsg);
          setIsFallbackMode(true);

          getIncidentEvidence(incidentId).then((evRes) => {
            if (isMounted && evRes.success && evRes.data) {
              setFallbackEvidence(evRes.data);
            }
          });
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

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800/60 rounded-md p-4 space-y-3 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-slate-800 rounded-full" />
          <div className="h-4 w-40 bg-slate-800 rounded" />
        </div>
        <div className="h-14 bg-slate-800/40 rounded-md" />
        <div className="h-20 bg-slate-800/40 rounded-md" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800/60 rounded-md p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
            AI Incident Synthesis
          </h2>
        </div>
        <button
          onClick={fetchAIExplanation}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Regenerate
        </button>
      </div>

      {/* Fallback Warning Banner if AI call failed */}
      {isFallbackMode && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-2.5 flex items-center justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>AI explanation unavailable</strong> — showing evidence-based summary instead.
              {error && <span className="text-amber-400/80 ml-1">({error})</span>}
            </span>
          </div>
          <button
            onClick={fetchAIExplanation}
            className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-md font-semibold border border-amber-500/40 shrink-0 cursor-pointer text-xs"
          >
            Retry AI
          </button>
        </div>
      )}

      {/* Standard AI Explanation Content */}
      {!isFallbackMode && data ? (
        <div className="space-y-4">
          {/* Executive Summary Paragraph */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-md p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-slate-500">
              <Bot className="w-3.5 h-3.5 text-blue-400" />
              <span>Executive Synthesis</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              {data.summary}
            </p>
          </div>

          {/* Grid: Why Connected & Why Investigate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Why Connected */}
            {data.why_connected && data.why_connected.length > 0 && (
              <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-md space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 font-mono">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Why Connected?</span>
                </div>
                <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                  {data.why_connected.map((item, idx) => (
                    <li key={idx} className="leading-normal">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Why Investigate */}
            {data.why_investigate && (
              <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-md space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 font-mono">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Why Investigate?</span>
                </div>
                <p className="text-xs text-slate-300 leading-normal">
                  {data.why_investigate}
                </p>
              </div>
            )}
          </div>

          {/* Supporting & Mitigating Evidence lists from AI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.supporting_evidence && data.supporting_evidence.length > 0 && (
              <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-md space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400 font-mono">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Supporting Evidence</span>
                </div>
                <ul className="space-y-1 text-xs text-slate-300">
                  {data.supporting_evidence.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-red-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.mitigating_evidence && (
              <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-md space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Mitigating Evidence</span>
                </div>
                {data.mitigating_evidence.length > 0 ? (
                  <ul className="space-y-1 text-xs text-slate-300">
                    {data.mitigating_evidence.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 italic">None observed</p>
                )}
              </div>
            )}
          </div>

          {/* Recommended Actions */}
          {data.recommended_actions && data.recommended_actions.length > 0 && (
            <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-md space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 font-mono">
                <ListOrdered className="w-3.5 h-3.5 text-blue-400" />
                <span>Recommended Response Actions</span>
              </div>
              <ol className="space-y-1.5 text-xs text-slate-200">
                {data.recommended_actions.map((act, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 bg-slate-900 p-2 rounded-md border border-slate-800/60 font-mono">
                    <span className="w-4 h-4 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-[10px] shrink-0">
                      {idx + 1}
                    </span>
                    <span className="pt-0.5 leading-snug font-sans">{act}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      ) : (
        /* Fallback Evidence-Based View if AI Call fails */
        <div className="space-y-3">
          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-md space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 uppercase">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Evidence-Based Incident Summary (Fallback)</span>
            </div>
            <p className="text-xs text-slate-300 leading-normal">
              Automated deterministic analysis identified correlated events requiring investigation for incident <strong className="font-mono text-slate-100">{incidentId}</strong>.
            </p>
          </div>

          {fallbackEvidence.length > 0 ? (
            <div className="space-y-1.5">
              <span className="text-xs font-mono text-slate-500 uppercase">Observed Evidence Findings:</span>
              <ul className="space-y-1.5">
                {fallbackEvidence.map((ev) => (
                  <li
                    key={ev.evidence_id}
                    className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-md text-xs space-y-0.5"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-slate-200 font-semibold">{ev.evidence_id}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {ev.type}
                      </span>
                    </div>
                    <p className="text-slate-300 font-sans">{ev.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-3 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800/80 rounded-md">
              No evidence findings available to display in fallback mode.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIExplanation;
