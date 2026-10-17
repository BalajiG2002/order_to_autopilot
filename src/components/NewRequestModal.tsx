import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Bot,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Package,
} from 'lucide-react';
import { ProcurementPolicy, Supplier } from '../types/index.ts';

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  suppliers: Supplier[];
  policy: ProcurementPolicy;
  isSubmitting: boolean;
}

export const NewRequestModal: React.FC<NewRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  suppliers,
  policy,
  isSubmitting,
}) => {
  const [rawText, setRawText] = useState('');
  const [item, setItem] = useState('');
  const [qty, setQty] = useState<number>(200);
  const [unit, setUnit] = useState('bags');
  const [unitPrice, setUnitPrice] = useState<number>(18);
  const [neededBy, setNeededBy] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [urgency, setUrgency] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [category, setCategory] = useState('Food & Agriculture');
  const [preferredSupplierId, setPreferredSupplierId] = useState('');
  const [showManualFields, setShowManualFields] = useState(false);

  if (!isOpen) return null;

  const totalCalculated = (qty || 0) * (unitPrice || 0);
  const willAutoApprove = totalCalculated <= policy.auto_approve_max_value;

  const handleApplyPreset = (preset: {
    raw: string;
    item: string;
    qty: number;
    unit: string;
    price: number;
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    category: string;
  }) => {
    setRawText(preset.raw);
    setItem(preset.item);
    setQty(preset.qty);
    setUnit(preset.unit);
    setUnitPrice(preset.price);
    setUrgency(preset.urgency);
    setCategory(preset.category);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      raw_text: rawText,
      item,
      qty,
      unit,
      estimated_unit_price: unitPrice,
      needed_by: neededBy,
      urgency,
      category,
      preferred_supplier_id: preferredSupplierId || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                New Procurement Requisition
              </h2>
              <p className="text-xs text-slate-500">
                Natural language autonomous intake with deterministic rule governance
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Quick Preset Demo Prompts */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Quick Demo Scenarios (1-Click Fill)</span>
              <span className="text-[10px] text-blue-600 font-medium">Test Ravi Story</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleApplyPreset({
                    raw: 'Need 250 bags of Basmati Rice by next Friday, $16 per bag urgent for cafeteria',
                    item: 'Basmati Rice (50kg)',
                    qty: 250,
                    unit: 'bags',
                    price: 16,
                    urgency: 'HIGH',
                    category: 'Food & Agriculture',
                  })
                }
                className="text-left p-2.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer text-xs group"
              >
                <div className="font-bold text-blue-900 flex items-center justify-between">
                  <span>🍚 250 Bags Rice ($4,000)</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                    Auto-Approve
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  &lt; $5k limit → Instantly approved &amp; dispatched to Sunrise Trading
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleApplyPreset({
                    raw: 'Requisition 120 heavy-duty warehouse pallet storage racks, $100 per bay by end of month',
                    item: 'Industrial Heavy-Duty Pallet Racks',
                    qty: 120,
                    unit: 'bays',
                    price: 100,
                    urgency: 'HIGH',
                    category: 'Industrial Equipment',
                  })
                }
                className="text-left p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-300 transition cursor-pointer text-xs group"
              >
                <div className="font-bold text-amber-900 flex items-center justify-between">
                  <span>🏗️ 120 Pallet Racks ($12,000)</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                    Manager Exception
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  &gt; $5k threshold → Flags Meena's Exception Queue
                </div>
              </button>
            </div>
          </div>

          {/* AI Free-Text Intake Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Bot className="h-4 w-4 text-blue-600" />
              <span>Handler Free-Text Requisition (AI Intake)</span>
            </label>
            <textarea
              rows={3}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="e.g. Urgent request: Need 500 bags of basmati rice delivered to Dock 4 by Friday, estimated rate $16/bag."
              className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition leading-relaxed"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Gemini will extract items, quantities, price estimates, and delivery deadlines.
            </p>
          </div>

          {/* Manual Fallback Toggle */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowManualFields(!showManualFields)}
              className="flex items-center justify-between w-full text-xs font-semibold text-slate-700 py-1.5 border-t border-slate-200 hover:text-blue-600 transition cursor-pointer"
            >
              <span>{showManualFields ? 'Hide Manual Fallback Fields' : 'Show Manual Fallback Fields (Fine-Grained Edit)'}</span>
              {showManualFields ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showManualFields && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100 bg-slate-50/70 p-4 rounded-xl border">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Item Description</label>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => setItem(e.target.value)}
                    placeholder="e.g. Basmati Rice (50kg)"
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="Food & Agriculture">Food & Agriculture</option>
                    <option value="Industrial Equipment">Industrial Equipment</option>
                    <option value="General Supplies">General Supplies</option>
                    <option value="Office & Facility">Office & Facility</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={qty}
                      onChange={(e) => setQty(Number(e.target.value))}
                      className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">Unit</label>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="bags, units"
                      className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">Est. Unit Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(Number(e.target.value))}
                      className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">Urgency</label>
                    <select
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value as any)}
                      className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Needed By Date</label>
                  <input
                    type="date"
                    value={neededBy}
                    onChange={(e) => setNeededBy(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Preferred Supplier (Optional)</label>
                  <select
                    value={preferredSupplierId}
                    onChange={(e) => setPreferredSupplierId(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="">Autopilot Choice (Highest Score)</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Score: {s.score.toFixed(1)}/10)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Live Deterministic Policy Preview Card */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
              willAutoApprove
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                : 'bg-amber-50/70 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-3">
              {willAutoApprove ? (
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              )}
              <div>
                <div className="text-xs font-bold">
                  Calculated Value: ${totalCalculated.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-600">
                  {willAutoApprove
                    ? `Within automatic policy limit ($${policy.auto_approve_max_value.toLocaleString()}) → Instant PO dispatch`
                    : `Exceeds $${policy.auto_approve_max_value.toLocaleString()} limit → Routes to Manager Meena's Exception Queue`}
                </div>
              </div>
            </div>
            <span
              className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                willAutoApprove
                  ? 'bg-emerald-200 text-emerald-900'
                  : 'bg-amber-200 text-amber-900'
              }`}
            >
              {willAutoApprove ? 'Fast-Track' : 'Manual Sign-Off'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!rawText.trim() && !item.trim())}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/25 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Package className="h-4 w-4" />
              <span>{isSubmitting ? 'Processing Autopilot...' : 'Submit Requisition'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
