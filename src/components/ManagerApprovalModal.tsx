import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { PurchaseOrder } from '../types/index.ts';

interface ManagerApprovalModalProps {
  isOpen: boolean;
  order: PurchaseOrder | null;
  onClose: () => void;
  onApprove: (notes: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  isLoading: boolean;
}

export const ManagerApprovalModal: React.FC<ManagerApprovalModalProps> = ({
  isOpen,
  order,
  onClose,
  onApprove,
  onReject,
  isLoading,
}) => {
  const [notes, setNotes] = useState('');
  const [mode, setMode] = useState<'approve' | 'reject'>('approve');

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'approve') {
      await onApprove(notes);
    } else {
      await onReject(notes);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Procurement Exception Review
              </h2>
              <p className="text-xs text-slate-500">
                Meena Sharma (Senior Procurement Manager)
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Order Snapshot */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between font-bold text-slate-900 text-sm">
              <span>{order.po_number}: {order.item}</span>
              <span className="text-indigo-600">${order.total_value.toLocaleString()}</span>
            </div>
            <div className="text-slate-600">
              Quantity: <strong>{order.qty} {order.unit}</strong> • Vendor: <strong>{order.supplier_name}</strong>
            </div>
            <div className="text-slate-600">
              Needed By: <strong>{order.needed_by}</strong> • Requester: <strong>{order.handler_name}</strong>
            </div>
          </div>

          {/* Exception Flags */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs">
            <div className="font-bold text-amber-900 mb-1 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>Policy Flag Reasons:</span>
            </div>
            <ul className="list-disc list-inside text-amber-800 space-y-0.5">
              {order.flags.map((f, i) => (
                <li key={i}>
                  {f === 'VALUE_THRESHOLD_EXCEEDED' && `Order value $${order.total_value.toLocaleString()} exceeds automatic limit of $5,000`}
                  {f === 'LOW_SUPPLIER_SCORE' && `Supplier score is below 7.5 minimum benchmark`}
                  {f !== 'VALUE_THRESHOLD_EXCEEDED' && f !== 'LOW_SUPPLIER_SCORE' && f}
                </li>
              ))}
            </ul>
          </div>

          {/* Notes input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Manager Decision Notes &amp; Governance Justification
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Approved for warehouse expansion. Vendor capacity confirmed."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setMode('reject');
                onReject(notes || 'Declined by procurement management');
              }}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
            >
              Reject Requisition
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={() => setMode('approve')}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
              >
                <CheckCircle className="h-4 w-4" />
                <span>{isLoading ? 'Approving...' : 'Authorize & Dispatch PO'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
