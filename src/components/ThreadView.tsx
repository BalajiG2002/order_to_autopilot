import React from 'react';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Send,
  Package,
  Truck,
  RotateCw,
  FileText,
  Star,
  ShieldAlert,
  Zap,
  Check,
  X,
  FileCheck,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  History,
  Building2,
  Calendar,
  DollarSign,
  User,
} from 'lucide-react';
import {
  EmailMessage,
  OrderDocument,
  OrderOutcome,
  OrderStep,
  PurchaseOrder,
  StepLog,
  Supplier,
  UserProfile,
} from '../types/index.ts';

interface ThreadViewProps {
  currentUser: UserProfile;
  order: PurchaseOrder;
  thread: EmailMessage[];
  documents: OrderDocument[];
  stepLogs: StepLog[];
  outcome?: OrderOutcome;
  supplier?: Supplier;
  onOpenApproveModal: () => void;
  onOpenRejectModal: () => void;
  onOpenSupplierModal: (defaultAction?: 'confirm' | 'ship' | 'invoice' | 'reply') => void;
  onOpenReceiptModal: () => void;
  onCloseOrder: () => void;
  onSendChaser: () => void;
  isActionLoading: boolean;
}

const LIFECYCLE_STEPS: { step: OrderStep; label: string }[] = [
  { step: 'REQUESTED', label: '1. Requisition' },
  { step: 'APPROVED', label: '2. Approved' },
  { step: 'ORDERED', label: '3. Dispatched' },
  { step: 'CONFIRMED', label: '4. Confirmed' },
  { step: 'SHIPPED', label: '5. In Transit' },
  { step: 'RECEIVED', label: '6. Delivered' },
  { step: 'DOCS_COMPLETE', label: '7. Docs Ready' },
  { step: 'CLOSED', label: '8. Reconciled' },
];

export const ThreadView: React.FC<ThreadViewProps> = ({
  currentUser,
  order,
  thread,
  documents,
  stepLogs,
  outcome,
  supplier,
  onOpenApproveModal,
  onOpenRejectModal,
  onOpenSupplierModal,
  onOpenReceiptModal,
  onCloseOrder,
  onSendChaser,
  isActionLoading,
}) => {
  const [activeTab, setActiveTab] = React.useState<'thread' | 'audit' | 'scorecard'>('thread');

  const getStepIndex = (s: OrderStep) => {
    const map: Record<OrderStep, number> = {
      REQUESTED: 0,
      APPROVED: 1,
      REJECTED: 0,
      ORDERED: 2,
      CONFIRMED: 3,
      SHIPPED: 4,
      RECEIVED: 5,
      DOCS_COMPLETE: 6,
      CLOSED: 7,
    };
    return map[s] ?? 0;
  };

  const currentStepIdx = getStepIndex(order.step);
  const isManager = currentUser.role === 'MANAGER';
  const isHandler = currentUser.role === 'HANDLER';
  const isSupplier = currentUser.role === 'SUPPLIER';

  const hasReceipt = documents.some((d) => d.type === 'RECEIPT');
  const hasInvoice = documents.some((d) => d.type === 'INVOICE');
  const canBeClosed = hasReceipt && hasInvoice && order.step !== 'CLOSED';

  const getEmailTypeBadge = (type: string) => {
    switch (type) {
      case 'PO_DISPATCH':
        return { label: 'Official PO', bg: 'bg-blue-100 text-blue-700' };
      case 'SUPPLIER_CONFIRMATION':
        return { label: 'Vendor Acknowledgment', bg: 'bg-emerald-100 text-emerald-700' };
      case 'CHASER':
        return { label: 'Automated Chaser', bg: 'bg-amber-100 text-amber-800' };
      case 'SHIPPING_NOTICE':
        return { label: 'Dispatch Notice', bg: 'bg-purple-100 text-purple-700' };
      case 'DELIVERY_RECEIPT':
        return { label: 'Goods Receipt', bg: 'bg-teal-100 text-teal-800' };
      case 'INVOICE_SUBMISSION':
        return { label: 'Commercial Invoice', bg: 'bg-sky-100 text-sky-800' };
      case 'INTERNAL_REQUEST':
        return { label: 'Internal Exception', bg: 'bg-rose-100 text-rose-800' };
      case 'ORDER_CLOSED':
        return { label: 'Order Reconciled', bg: 'bg-emerald-100 text-emerald-800' };
      default:
        return { label: 'Message', bg: 'bg-slate-100 text-slate-700' };
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden h-[calc(100vh-4rem)]">
      {/* 1. Header: Order Title & Key Metadata */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                {order.po_number}
              </span>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                {order.item}
              </h1>
              {order.approval_status === 'PENDING_MANAGER' && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="h-3 w-3" />
                  Manager Approval Required
                </span>
              )}
              {order.step === 'CLOSED' && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Fulfilled &amp; Reconciled
                </span>
              )}
            </div>

            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                <strong className="text-slate-900 font-bold">${order.total_value.toLocaleString()}</strong>
                <span className="text-slate-400">({order.qty} {order.unit} @ ${order.unit_price}/unit)</span>
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Supplier:</span>
                <strong className="text-slate-900">{order.supplier_name}</strong>
                {supplier && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px]">
                    <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                    {supplier.score.toFixed(1)}/10
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Needed By:</span>
                <strong className="text-slate-800">{order.needed_by}</strong>
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>Requester:</span>
                <span className="text-slate-800">{order.handler_name}</span>
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center flex-wrap gap-2 shrink-0">
            {/* Manager Actions */}
            {order.approval_status === 'PENDING_MANAGER' && (
              <>
                <button
                  onClick={onOpenApproveModal}
                  disabled={isActionLoading}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Approve Exception</span>
                </button>
                <button
                  onClick={onOpenRejectModal}
                  disabled={isActionLoading}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-200 text-rose-700 hover:bg-rose-50 transition active:scale-95 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Reject</span>
                </button>
              </>
            )}

            {/* Supplier Actions */}
            {(isSupplier || currentUser.role === 'MANAGER' || currentUser.role === 'HANDLER') && (
              <>
                {order.step === 'ORDERED' && (
                  <button
                    onClick={() => onOpenSupplierModal('confirm')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Confirm Order (Commit Date)</span>
                  </button>
                )}
                {order.step === 'CONFIRMED' && (
                  <button
                    onClick={() => onOpenSupplierModal('ship')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    <span>Dispatch &amp; Ship (Tracking)</span>
                  </button>
                )}
                {!hasInvoice && order.step !== 'REQUESTED' && order.step !== 'CLOSED' && (
                  <button
                    onClick={() => onOpenSupplierModal('invoice')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition active:scale-95 cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5 text-blue-600" />
                    <span>Submit Invoice</span>
                  </button>
                )}
                {order.step !== 'CLOSED' && order.step !== 'REQUESTED' && (
                  <button
                    onClick={() => onOpenSupplierModal('reply')}
                    title="Simulate supplier natural language reply"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition active:scale-95 cursor-pointer"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Reply As Vendor</span>
                  </button>
                )}
              </>
            )}

            {/* Handler Actions */}
            {order.step === 'SHIPPED' && (
              <button
                onClick={onOpenReceiptModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Verify Goods Delivery (Feedback Loop)</span>
              </button>
            )}

            {/* Close & Reconcile Button */}
            {canBeClosed && (
              <button
                onClick={onCloseOrder}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/25 transition active:scale-95 cursor-pointer"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Close &amp; Reconcile Order</span>
              </button>
            )}

            {/* Chaser Trigger Button */}
            {(order.step === 'ORDERED' || order.step === 'CONFIRMED') && (
              <button
                onClick={onSendChaser}
                title="Send automated chaser email to supplier"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition active:scale-95 cursor-pointer"
              >
                <Zap className="h-3.5 w-3.5 text-amber-600" />
                <span>Send Chaser</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Lifecycle Stepper Progress Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
            {LIFECYCLE_STEPS.map((s, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <div key={s.step} className="flex flex-col items-center text-center">
                  <div
                    className={`h-1.5 w-full rounded-full transition-all ${
                      isPast
                        ? 'bg-blue-600'
                        : isCurrent
                        ? 'bg-blue-500 animate-pulse ring-2 ring-blue-300'
                        : 'bg-slate-200'
                    }`}
                  />
                  <span
                    className={`mt-1 text-[10px] font-medium truncate w-full ${
                      isCurrent
                        ? 'text-blue-700 font-bold'
                        : isPast
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs: Thread / Audit Trail / Scorecard */}
      <div className="px-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('thread')}
            className={`py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'thread'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Email Thread ({thread.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Audit Steps Log ({stepLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('scorecard')}
            className={`py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'scorecard'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Star className="h-3.5 w-3.5 text-amber-500" />
            <span>Supplier Feedback &amp; Score</span>
          </button>
        </div>

        {/* Documents Match Summary Indicator */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 hidden sm:inline">2-Way Match:</span>
          <span
            className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-medium border ${
              hasReceipt
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            <FileCheck className="h-3 w-3" />
            Receipt: {hasReceipt ? 'Verified' : 'Pending'}
          </span>
          <span
            className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-medium border ${
              hasInvoice
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            <FileText className="h-3 w-3" />
            Invoice: {hasInvoice ? 'Verified' : 'Pending'}
          </span>
        </div>
      </div>

      {/* 4. Tab Body Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
        {activeTab === 'thread' && (
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Thread emails in chronological order */}
            {thread.map((email) => {
              const typeBadge = getEmailTypeBadge(email.email_type);
              const isOutbound = email.direction === 'OUTBOUND';

              return (
                <div
                  key={email.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition"
                >
                  {/* Email Header */}
                  <div className="p-3 sm:p-4 bg-slate-50/70 border-b border-slate-100 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isOutbound
                            ? 'bg-blue-600 text-white'
                            : 'bg-indigo-600 text-white'
                        }`}
                      >
                        {email.from_name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">
                            {email.from_name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            &lt;{email.from_email}&gt;
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${typeBadge.bg}`}>
                            {typeBadge.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          To: <strong className="text-slate-700">{email.to_name}</strong> &lt;{email.to_email}&gt;
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono shrink-0">
                      {new Date(email.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Email Subject & Body */}
                  <div className="p-4 sm:p-5">
                    <h3 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">
                      {email.subject}
                    </h3>
                    <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans font-normal">
                      {email.body}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="max-w-4xl mx-auto bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <History className="h-4 w-4 text-slate-500" />
              Autonomous Audit Trail &amp; Step Logs
            </h3>
            <div className="space-y-4 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200">
              {stepLogs.map((log) => (
                <div key={log.id} className="relative flex items-start gap-3 pl-6">
                  <div className="absolute left-2 top-1.5 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                  <div className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-900">
                        {log.actor} ({log.actor_role})
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{log.notes}</p>
                    <span className="mt-1.5 inline-block text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                      STEP: {log.step}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'scorecard' && (
          <div className="max-w-4xl mx-auto space-y-5">
            {supplier ? (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{supplier.name}</h2>
                    <p className="text-xs text-slate-500">
                      Category: {supplier.category} • {supplier.address}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-slate-900 flex items-center justify-end gap-1">
                      <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
                      <span>{supplier.score.toFixed(1)}</span>
                      <span className="text-sm text-slate-400 font-normal">/ 10</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Score formula: 10 × (0.6 × on_time + 0.4 × (1 − damage))
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-xs text-slate-500 font-medium">On-Time Rate</div>
                    <div className="text-lg font-bold text-emerald-600">
                      {(supplier.on_time_rate * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-xs text-slate-500 font-medium">Damage Rate</div>
                    <div className="text-lg font-bold text-rose-600">
                      {(supplier.damage_rate * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-xs text-slate-500 font-medium">Total Orders</div>
                    <div className="text-lg font-bold text-slate-900">
                      {supplier.total_orders}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-xs text-slate-500 font-medium">Auto-Approve Eligible</div>
                    <div className="text-lg font-bold text-indigo-600">
                      {supplier.score >= 7.5 ? 'YES (>= 7.5)' : 'NO (< 7.5)'}
                    </div>
                  </div>
                </div>

                {outcome && (
                  <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="text-xs font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-amber-600" />
                      Outcome Logged for This PO:
                    </div>
                    <div className="text-xs text-amber-800">
                      Result: <strong>{outcome.result}</strong> • Damaged Units: <strong>{outcome.damaged_qty}</strong> • Notes: {outcome.notes}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">Supplier information not found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
