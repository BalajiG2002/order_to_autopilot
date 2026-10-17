import React, { useState } from 'react';
import { X, RotateCw, AlertTriangle, CheckCircle, Star, TrendingDown } from 'lucide-react';
import { PurchaseOrder, Supplier } from '../types/index.ts';

interface DeliveryReceiptModalProps {
  isOpen: boolean;
  order: PurchaseOrder | null;
  supplier?: Supplier;
  onClose: () => void;
  onConfirmDelivery: (payload: {
    result: 'PERFECT' | 'ON_TIME' | 'LATE' | 'DAMAGED' | 'SHORT';
    damaged_qty: number;
    short_qty: number;
    notes: string;
  }) => Promise<void>;
  isLoading: boolean;
}

export const DeliveryReceiptModal: React.FC<DeliveryReceiptModalProps> = ({
  isOpen,
  order,
  supplier,
  onClose,
  onConfirmDelivery,
  isLoading,
}) => {
  const [damagedQty, setDamagedQty] = useState<number>(0);
  const [shortQty, setShortQty] = useState<number>(0);
  const [isLate, setIsLate] = useState(false);
  const [notes, setNotes] = useState('');

  if (!isOpen || !order) return null;

  const totalOrdered = order.qty;
  const acceptedQty = Math.max(0, totalOrdered - damagedQty - shortQty);

  // Compute live simulated new score
  const currentOnTime = supplier?.on_time_rate || 0.9;
  const currentDamage = supplier?.damage_rate || 0.05;

  const newOnTimeSim = isLate ? currentOnTime * 0.75 : Math.min(1, currentOnTime * 0.75 + 0.25);
  const newDamageRatio = totalOrdered > 0 ? damagedQty / totalOrdered : 0;
  const newDamageSim = currentDamage * 0.75 + newDamageRatio * 0.25;

  const simulatedScore = Math.round(
    10 * (0.6 * newOnTimeSim + 0.4 * (1 - Math.min(1, newDamageSim))) * 10
  ) / 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let result: 'PERFECT' | 'ON_TIME' | 'LATE' | 'DAMAGED' | 'SHORT' = 'PERFECT';
    if (damagedQty > 0) result = 'DAMAGED';
    else if (shortQty > 0) result = 'SHORT';
    else if (isLate) result = 'LATE';
    else result = 'PERFECT';

    await onConfirmDelivery({
      result,
      damaged_qty: damagedQty,
      short_qty: shortQty,
      notes: notes || (damagedQty > 0 ? `${damagedQty} items damaged in transit` : 'Full quantity accepted in good order'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white">
              <RotateCw className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Goods Inspection &amp; Delivery Verification
              </h2>
              <p className="text-xs text-slate-500">
                Ravi Kumar (Operations Handler) • Feedback Loop Engine
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
          {/* Order Summary */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="font-bold text-slate-900 text-sm mb-1">
              {order.po_number}: {order.item}
            </div>
            <div className="text-slate-600 flex justify-between">
              <span>Expected Delivery: <strong>{totalOrdered} {order.unit}</strong></span>
              <span>Carrier: <strong>{order.carrier || 'Express Lines'}</strong></span>
            </div>
          </div>

          {/* Quick preset buttons to demonstrate feedback loop */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Quick Inspection Presets:</span>
              <span className="text-[10px] text-teal-600 font-medium">Demo Feedback Loop</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDamagedQty(0);
                  setShortQty(0);
                  setIsLate(false);
                  setNotes('Delivered in pristine condition with all seals intact.');
                }}
                className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-left hover:bg-emerald-100 transition cursor-pointer text-xs"
              >
                <div className="font-bold text-emerald-900 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  <span>100% Perfect</span>
                </div>
                <div className="text-[10px] text-emerald-700 mt-0.5">0 damaged, on-time</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDamagedQty(30);
                  setShortQty(0);
                  setIsLate(false);
                  setNotes('Pallet received with water damage; 30 bags ruptured and discarded.');
                }}
                className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-left hover:bg-rose-100 transition cursor-pointer text-xs group"
              >
                <div className="font-bold text-rose-900 flex items-center gap-1">
                  <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
                  <span>30 Units Damaged</span>
                </div>
                <div className="text-[10px] text-rose-700 mt-0.5">Penalizes vendor score</div>
              </button>
            </div>
          </div>

          {/* Quantities Form */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Damaged / Defective Units
              </label>
              <input
                type="number"
                min="0"
                max={totalOrdered}
                value={damagedQty}
                onChange={(e) => setDamagedQty(Math.max(0, Number(e.target.value)))}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shortage / Missing Units
              </label>
              <input
                type="number"
                min="0"
                max={totalOrdered}
                value={shortQty}
                onChange={(e) => setShortQty(Math.max(0, Number(e.target.value)))}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Handler Physical Inspection Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Inspected at Dock 4. 200 bags unloaded."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>

          {/* Feedback Loop Score Impact Preview */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                <span>Supplier Score Impact ({supplier?.name}):</span>
              </span>
              <span className="font-mono font-bold">
                {supplier?.score.toFixed(1)} →{' '}
                <span className={simulatedScore < (supplier?.score || 0) ? 'text-rose-600' : 'text-emerald-600'}>
                  {simulatedScore.toFixed(1)}/10
                </span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Formula: <code>score = 10 × (0.6 × on_time + 0.4 × (1 − damage))</code>
              {simulatedScore < 7.5 && (
                <span className="block text-rose-700 font-semibold mt-1">
                  ⚠️ Score will drop below 7.5: future orders will bypass this vendor!
                </span>
              )}
            </p>
          </div>

          {/* Action buttons */}
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
              disabled={isLoading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
            >
              <RotateCw className="h-4 w-4" />
              <span>{isLoading ? 'Updating...' : 'Log Delivery & Update Score'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
