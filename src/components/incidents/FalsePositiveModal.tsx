import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, X, ShieldAlert, Sparkles, Check, RefreshCw } from 'lucide-react';

interface FalsePositiveModalProps {
  incidentId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, notes?: string) => Promise<void>;
  isSubmitting?: boolean;
}

const REASONS = [
  { id: 'expected_behavior', label: 'Expected User / Operational Behavior', desc: 'Legitimate business activity matching known user baseline.' },
  { id: 'approved_maintenance', label: 'Approved Scheduled Maintenance', desc: 'Authorized system, database, or network maintenance.' },
  { id: 'known_device', label: 'Known Authorized Workstation', desc: 'New device confirmed to belong to enterprise inventory.' },
  { id: 'false_correlation', label: 'False Entity Correlation', desc: 'Separate unrelated events coincidentally occurred in the same time window.' },
  { id: 'other', label: 'Other Administrative Override', desc: 'Custom security exception or analyst determination.' },
];

export const FalsePositiveModal: React.FC<FalsePositiveModalProps> = ({
  incidentId,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('expected_behavior');
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(selectedReason, notes.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-lg rounded-xl border border-amber-500/40 bg-surface-container-lowest p-6 shadow-2xl font-code-sm space-y-4"
        style={{
          boxShadow: '0 0 30px -10px rgba(245, 158, 11, 0.25)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-outline-variant/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-on-surface font-headline-sm">
                Mark as False Positive
              </h2>
              <p className="text-xs text-on-surface-variant font-mono">
                Incident: <span className="text-primary font-semibold">{incidentId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Intelligence Callout */}
        <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-200 text-xs flex items-start gap-2.5 font-body-sm">
          <Sparkles className="w-4 h-4 shrink-0 text-purple-400 mt-0.5 animate-pulse" />
          <div>
            <strong className="text-purple-300 font-semibold block font-headline-sm text-xs">
              Adaptive Feedback Loop
            </strong>
            Submitting this feedback triggers the Pandas Adaptive Suppression Engine. Future occurrences of this event chain will have their threat weights automatically suppressed.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reason Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant block font-label-sm">
              Dismissal Justification
            </label>
            <div className="space-y-1.5">
              {REASONS.map((r) => {
                const isSelected = selectedReason === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedReason(r.id)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'border-amber-500/60 bg-amber-500/10 text-on-surface'
                        : 'border-outline-variant/50 bg-surface-container/50 hover:bg-surface-container hover:border-outline-variant text-on-surface-variant'
                    }`}
                  >
                    <div>
                      <div className={`text-xs font-semibold ${isSelected ? 'text-amber-400' : 'text-on-surface'}`}>
                        {r.label}
                      </div>
                      <div className="text-[11px] text-on-surface-variant font-body-sm mt-0.5">
                        {r.desc}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant block font-label-sm">
              Analyst Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Verified with user Jane Doe that DB export was part of Q3 financial report."
              rows={2}
              className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-outline-variant/60">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-amber-600 to-purple-600 text-white shadow-lg shadow-amber-600/20 hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Adapting Pipeline...
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Confirm &amp; Adapt Pipeline
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default FalsePositiveModal;
