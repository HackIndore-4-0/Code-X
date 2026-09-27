import React, { useState } from 'react';
import { Search, ShieldCheck, ShieldAlert, XCircle, CheckCircle2, RefreshCw, ChevronDown } from 'lucide-react';
import type { AnalystActionType, DismissalReason } from '../types/incident';

interface ActionBarProps {
  onAction: (action: AnalystActionType, reason?: DismissalReason) => Promise<void> | void;
  isPending?: boolean;
  activeAction?: AnalystActionType | null;
  className?: string;
}

const DISMISSAL_REASONS: { id: DismissalReason; label: string }[] = [
  { id: 'expected_behavior',   label: 'Expected Behavior' },
  { id: 'approved_maintenance', label: 'Approved Maintenance' },
  { id: 'known_device',         label: 'Known Device / User' },
  { id: 'false_correlation',    label: 'False Correlation' },
  { id: 'other',                label: 'Other' },
];

export const ActionBar: React.FC<ActionBarProps> = ({
  onAction,
  isPending = false,
  activeAction = null,
  className = '',
}) => {
  const [showDismissPicker, setShowDismissPicker] = useState(false);

  const handleDismissSelect = (reason: DismissalReason) => {
    setShowDismissPicker(false);
    onAction('DISMISS', reason);
  };

  return (
    <div
      className={`rounded-xl p-3 font-mono ${className}`}
      style={{
        background:  'var(--color-surface)',
        border:      '1px solid rgba(30, 41, 59, 0.8)',
        boxShadow:   '0 4px 24px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* ── Label ── */}
        <div className="flex items-center gap-2">
          <span
            className="text-xs uppercase font-bold tracking-wider"
            style={{ color: 'var(--color-muted)' }}
          >
            ANALYST ACTIONS:
          </span>
          <span className="text-[11px]" style={{ color: 'rgba(148, 163, 184, 0.5)' }}>
            Actions trigger backend state updates &amp; audit logging.
          </span>
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex items-center gap-2 flex-wrap relative">

          {/* Investigate */}
          <button
            onClick={() => onAction('INVESTIGATE')}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 disabled:opacity-50 cursor-pointer"
            style={{
              background:   'rgba(59, 130, 246, 0.1)',
              borderColor:  'rgba(59, 130, 246, 0.3)',
              color:        '#60A5FA',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background    = 'rgba(59, 130, 246, 0.2)';
              (e.currentTarget as HTMLButtonElement).style.borderColor   = 'rgba(59, 130, 246, 0.5)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow     = '0 0 12px rgba(59, 130, 246, 0.25)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background    = 'rgba(59, 130, 246, 0.1)';
              (e.currentTarget as HTMLButtonElement).style.borderColor   = 'rgba(59, 130, 246, 0.3)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow     = '';
            }}
          >
            {isPending && activeAction === 'INVESTIGATE' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            Investigate
          </button>

          {/* Confirm */}
          <button
            onClick={() => onAction('CONFIRM')}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 cursor-pointer"
            style={{
              background:  'rgba(59, 130, 246, 0.2)',
              border:      '1px solid rgba(59, 130, 246, 0.45)',
              color:       '#93C5FD',
              boxShadow:   '0 0 12px rgba(59, 130, 246, 0.2)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background  = 'rgba(59, 130, 246, 0.3)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow   = '0 0 18px rgba(59, 130, 246, 0.35)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background  = 'rgba(59, 130, 246, 0.2)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow   = '0 0 12px rgba(59, 130, 246, 0.2)';
            }}
          >
            {isPending && activeAction === 'CONFIRM' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            Confirm
          </button>

          {/* Escalate */}
          <button
            onClick={() => onAction('ESCALATE')}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 disabled:opacity-50 cursor-pointer"
            style={{
              background:  'rgba(239, 68, 68, 0.1)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              color:       '#F87171',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background   = 'rgba(239, 68, 68, 0.2)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow    = '0 0 12px rgba(239, 68, 68, 0.2)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background   = 'rgba(239, 68, 68, 0.1)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow    = '';
            }}
          >
            {isPending && activeAction === 'ESCALATE' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5" />
            )}
            Escalate
          </button>

          {/* Resolve */}
          <button
            onClick={() => onAction('RESOLVE')}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 disabled:opacity-50 cursor-pointer"
            style={{
              background:  'rgba(16, 185, 129, 0.1)',
              borderColor: 'rgba(16, 185, 129, 0.3)',
              color:       '#34D399',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background   = 'rgba(16, 185, 129, 0.2)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow    = '0 0 12px rgba(16, 185, 129, 0.2)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background   = 'rgba(16, 185, 129, 0.1)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow    = '';
            }}
          >
            {isPending && activeAction === 'RESOLVE' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            Resolve
          </button>

          {/* Dismiss with Picker */}
          <div className="relative">
            <button
              onClick={() => setShowDismissPicker(!showDismissPicker)}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 disabled:opacity-50 cursor-pointer"
              style={{
                background:  'rgba(30, 41, 59, 0.4)',
                borderColor: 'rgba(30, 41, 59, 0.8)',
                color:       'var(--color-muted)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background   = 'rgba(30, 41, 59, 0.7)';
                (e.currentTarget as HTMLButtonElement).style.color        = '#CBD5E1';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background   = 'rgba(30, 41, 59, 0.4)';
                (e.currentTarget as HTMLButtonElement).style.color        = 'var(--color-muted)';
              }}
            >
              {isPending && activeAction === 'DISMISS' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              Dismiss
              <ChevronDown className="w-3 h-3" />
            </button>

            {showDismissPicker && (
              <div
                className="absolute right-0 bottom-full mb-2 w-52 rounded-xl shadow-2xl z-50 p-1 space-y-0.5"
                style={{
                  background:  'var(--color-surface)',
                  border:      '1px solid rgba(30, 41, 59, 0.8)',
                  boxShadow:   '0 8px 32px rgba(0, 0, 0, 0.6)',
                }}
              >
                <div
                  className="px-2 py-1.5 text-[10px] uppercase font-bold"
                  style={{
                    color:        'var(--color-muted)',
                    borderBottom: '1px solid rgba(30, 41, 59, 0.7)',
                  }}
                >
                  DISMISSAL REASON
                </div>
                {DISMISSAL_REASONS.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => handleDismissSelect(reason.id)}
                    className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-all duration-150"
                    style={{ color: '#CBD5E1' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59, 130, 246, 0.12)';
                      (e.currentTarget as HTMLButtonElement).style.color      = '#60A5FA';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      (e.currentTarget as HTMLButtonElement).style.color      = '#CBD5E1';
                    }}
                  >
                    {reason.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionBar;
