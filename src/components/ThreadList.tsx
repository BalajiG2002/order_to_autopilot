import React from 'react';
import {
  Search,
  AlertTriangle,
  Clock,
  CheckCircle,
  Package,
  Truck,
  RotateCw,
  Mail,
  Zap,
} from 'lucide-react';
import { OrderStep, PurchaseOrder } from '../types/index.ts';

interface ThreadListProps {
  orders: (PurchaseOrder & {
    message_count: number;
    latest_email_subject: string;
    latest_email_preview: string;
    latest_email_time: string;
    latest_email_sender: string;
    is_unread: boolean;
  })[];
  selectedOrderId: string | null;
  onSelectOrder: (orderId: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isLoading: boolean;
}

export const ThreadList: React.FC<ThreadListProps> = ({
  orders,
  selectedOrderId,
  onSelectOrder,
  searchQuery,
  onSearchChange,
  isLoading,
}) => {
  const getStepBadge = (step: OrderStep, approvalStatus: string) => {
    if (approvalStatus === 'PENDING_MANAGER') {
      return {
        label: 'Awaiting Approval',
        bg: 'bg-amber-100 text-amber-800 border-amber-300',
        icon: AlertTriangle,
      };
    }
    switch (step) {
      case 'REQUESTED':
        return { label: 'Requisition', bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: Mail };
      case 'APPROVED':
        return { label: 'Approved', bg: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle };
      case 'REJECTED':
        return { label: 'Rejected', bg: 'bg-rose-100 text-rose-700 border-rose-200', icon: AlertTriangle };
      case 'ORDERED':
        return { label: 'PO Dispatched', bg: 'bg-sky-100 text-sky-800 border-sky-300', icon: Package };
      case 'CONFIRMED':
        return { label: 'Confirmed', bg: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: CheckCircle };
      case 'SHIPPED':
        return { label: 'Shipped (In Transit)', bg: 'bg-purple-100 text-purple-800 border-purple-300', icon: Truck };
      case 'RECEIVED':
        return { label: 'Goods Received', bg: 'bg-teal-100 text-teal-800 border-teal-300', icon: RotateCw };
      case 'DOCS_COMPLETE':
        return { label: '2-Way Matched', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle };
      case 'CLOSED':
        return { label: 'Closed & Reconciled', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle };
      default:
        return { label: step, bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: Mail };
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-80 md:w-96 border-r border-slate-200 bg-white flex flex-col shrink-0 select-none h-[calc(100vh-4rem)]">
      {/* Search Bar */}
      <div className="p-3 border-b border-slate-200">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search PO, supplier, item..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>
      </div>

      {/* Thread List Header / Count */}
      <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
        <span>{orders.length} order threads</span>
        <span className="font-mono text-[11px]">Real-time state</span>
      </div>

      {/* Threads Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading order threads...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center">
            <Mail className="h-8 w-8 mx-auto text-slate-300 mb-2" />
            <div className="text-xs font-semibold text-slate-700">No matching threads</div>
            <div className="text-[11px] text-slate-400 mt-1">
              Check another folder or submit a new procurement requisition.
            </div>
          </div>
        ) : (
          orders.map((order) => {
            const isSelected = order.id === selectedOrderId;
            const badge = getStepBadge(order.step, order.approval_status);
            const BadgeIcon = badge.icon;

            return (
              <div
                key={order.id}
                onClick={() => onSelectOrder(order.id)}
                className={`p-3.5 cursor-pointer transition relative group ${
                  isSelected
                    ? 'bg-blue-50/80 border-l-4 border-blue-600'
                    : 'hover:bg-slate-50'
                }`}
              >
                {/* Header: Sender & Time */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {order.is_unread && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                    <span
                      className={`text-xs truncate ${
                        order.is_unread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                      }`}
                    >
                      {order.latest_email_sender || order.supplier_name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      ({order.message_count})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {formatTime(order.latest_email_time)}
                  </span>
                </div>

                {/* Subject / PO headline */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-semibold text-slate-900 truncate">
                    {order.po_number}: {order.item}
                  </span>
                  <span className="text-xs font-bold text-slate-900 shrink-0">
                    ${order.total_value.toLocaleString()}
                  </span>
                </div>

                {/* Preview Snippet */}
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-2">
                  {order.latest_email_preview || `PO for ${order.qty} ${order.unit}`}
                </p>

                {/* Badges footer */}
                <div className="flex items-center flex-wrap gap-1.5 pt-1">
                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-medium border ${badge.bg}`}
                  >
                    <BadgeIcon className="h-3 w-3" />
                    <span>{badge.label}</span>
                  </span>

                  {/* Chaser Badge if triggered */}
                  {order.chase_count > 0 && (
                    <span
                      className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        order.chase_count >= 2
                          ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      <Zap className="h-2.5 w-2.5" />
                      {order.chase_count >= 2 ? `Escalated (${order.chase_count}x)` : `Chased (${order.chase_count}x)`}
                    </span>
                  )}

                  {/* Flag indicators */}
                  {order.flags.includes('VALUE_THRESHOLD_EXCEEDED') && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                      &gt; $5,000 Limit
                    </span>
                  )}
                  {order.flags.includes('IDLE_RESPONSE_PENDING') && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" /> Idle &gt; 24h
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
