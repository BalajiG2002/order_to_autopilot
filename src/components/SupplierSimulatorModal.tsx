import React, { useState } from 'react';
import { X, CheckCircle, Truck, FileText, MessageSquare, Bot } from 'lucide-react';
import { PurchaseOrder } from '../types/index.ts';

interface SupplierSimulatorModalProps {
  isOpen: boolean;
  order: PurchaseOrder | null;
  defaultAction?: 'confirm' | 'ship' | 'invoice' | 'reply';
  onClose: () => void;
  onExecuteAction: (payload: {
    action: 'confirm' | 'ship' | 'invoice' | 'free_text_reply';
    promised_date?: string;
    tracking_number?: string;
    carrier?: string;
    invoice_amount?: number;
    free_text?: string;
  }) => Promise<void>;
  isLoading: boolean;
}

export const SupplierSimulatorModal: React.FC<SupplierSimulatorModalProps> = ({
  isOpen,
  order,
  defaultAction = 'confirm',
  onClose,
  onExecuteAction,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<'confirm' | 'ship' | 'invoice' | 'reply'>(defaultAction);
  const [promisedDate, setPromisedDate] = useState(() => order?.needed_by || '');
  const [carrier, setCarrier] = useState('BlueDart Logistics');
  const [trackingNumber, setTrackingNumber] = useState('TRK-SUN-' + Math.floor(10000 + Math.random() * 90000));
  const [invoiceAmount, setInvoiceAmount] = useState<number>(() => order?.total_value || 0);
  const [freeTextReply, setFreeTextReply] = useState(
    'We confirm order processing for PO-' + (order?.po_number?.split('-')?.[2] || '085') + '. Goods will be dispatched on Thursday via BlueDart with consignment note BD-88219.'
  );

  React.useEffect(() => {
    if (defaultAction) setActiveTab(defaultAction);
    if (order) {
      setPromisedDate(order.needed_by);
      setInvoiceAmount(order.total_value);
    }
  }, [defaultAction, order]);

  if (!isOpen || !order) return null;

  const handleAction = async () => {
    if (activeTab === 'confirm') {
      await onExecuteAction({ action: 'confirm', promised_date: promisedDate });
    } else if (activeTab === 'ship') {
      await onExecuteAction({ action: 'ship', carrier, tracking_number: trackingNumber });
    } else if (activeTab === 'invoice') {
      await onExecuteAction({ action: 'invoice', invoice_amount: invoiceAmount });
    } else if (activeTab === 'reply') {
      await onExecuteAction({ action: 'free_text_reply', free_text: freeTextReply });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Supplier Simulator Action Hub
            </h2>
            <p className="text-xs text-slate-500">
              Simulate actions from <strong>{order.supplier_name}</strong> for {order.po_number}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Tabs */}
        <div className="px-6 border-b border-slate-200 flex items-center gap-2 pt-2 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setActiveTab('confirm')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'confirm'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Confirm PO</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ship')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ship'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Truck className="h-3.5 w-3.5" />
            <span>Dispatch / Ship</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invoice')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'invoice'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Send Invoice</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reply')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'reply'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Free-Text Email</span>
          </button>
        </div>

        {/* Tab Forms */}
        <div className="p-6 space-y-4">
          {activeTab === 'confirm' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Acknowledge PO {order.po_number} and commit to the fulfillment delivery date:
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Committed Delivery Date
                </label>
                <input
                  type="date"
                  value={promisedDate}
                  onChange={(e) => setPromisedDate(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>
          )}

          {activeTab === 'ship' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Generate shipping notice and tracking credentials for carrier delivery:
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Freight Carrier
                </label>
                <input
                  type="text"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Consignment Tracking Number
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>
            </div>
          )}

          {activeTab === 'invoice' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Submit matching commercial invoice for accounts payable 2-way matching:
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Invoice Total Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(Number(e.target.value))}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>
            </div>
          )}

          {activeTab === 'reply' && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Bot className="h-4 w-4 text-emerald-600" />
                <span>Supplier Natural Language Email Reply</span>
              </div>
              <textarea
                rows={4}
                value={freeTextReply}
                onChange={(e) => setFreeTextReply(e.target.value)}
                placeholder="e.g. Consignment prepared. We will ship 250 bags on Friday via DHL tracking DHL-98124."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl leading-relaxed"
              />
              <p className="text-[11px] text-slate-500">
                Gemini will parse the supplier email to automatically extract status, date promises, and tracking codes.
              </p>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAction}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
            >
              {isLoading ? 'Processing...' : 'Send Vendor Action'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
