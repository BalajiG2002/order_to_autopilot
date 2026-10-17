import React, { useState } from 'react';
import { X, Sliders, CheckCircle } from 'lucide-react';
import { ProcurementPolicy } from '../types/index.ts';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy: ProcurementPolicy;
  onUpdatePolicy: (updated: Partial<ProcurementPolicy>) => Promise<void>;
  isLoading: boolean;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({
  isOpen,
  onClose,
  policy,
  onUpdatePolicy,
  isLoading,
}) => {
  const [maxValue, setMaxValue] = useState(policy.auto_approve_max_value);
  const [minScore, setMinScore] = useState(policy.min_supplier_score);
  const [chaseHours, setChaseHours] = useState(policy.chase_interval_hours);
  const [maxChases, setMaxChases] = useState(policy.max_chases_before_escalate);

  React.useEffect(() => {
    setMaxValue(policy.auto_approve_max_value);
    setMinScore(policy.min_supplier_score);
    setChaseHours(policy.chase_interval_hours);
    setMaxChases(policy.max_chases_before_escalate);
  }, [policy]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdatePolicy({
      auto_approve_max_value: Number(maxValue),
      min_supplier_score: Number(minScore),
      chase_interval_hours: Number(chaseHours),
      max_chases_before_escalate: Number(maxChases),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Procurement Rule Engine
              </h2>
              <p className="text-xs text-slate-500">
                Deterministic governance &amp; escalation thresholds
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Max Auto-Approval PO Value ($ USD)
            </label>
            <input
              type="number"
              step="500"
              value={maxValue}
              onChange={(e) => setMaxValue(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Orders equal to or below this threshold auto-dispatch if supplier meets minimum score.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Minimum Supplier Score Required (0 - 10)
            </label>
            <input
              type="number"
              step="0.1"
              min="1"
              max="10"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Suppliers scored lower than this benchmark require manager exception review.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Chase Interval (Hours)
              </label>
              <input
                type="number"
                value={chaseHours}
                onChange={(e) => setChaseHours(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Max Chases Pre-Escalate
              </label>
              <input
                type="number"
                value={maxChases}
                onChange={(e) => setMaxChases(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
            >
              <CheckCircle className="h-4 w-4" />
              <span>{isLoading ? 'Saving...' : 'Update Rules'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
