import React from 'react';
import {
  X,
  Sparkles,
  CheckCircle,
  Play,
  ArrowRight,
  User,
  ShieldCheck,
  Building2,
  Clock,
  TrendingDown,
  BarChart3,
  Bot,
} from 'lucide-react';

interface DemoTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (roleId: string) => void;
  onOpenNewRequest: () => void;
  onOpenAnalytics: () => void;
  onRunScheduler: () => void;
}

export const DemoTourModal: React.FC<DemoTourModalProps> = ({
  isOpen,
  onClose,
  onSelectRole,
  onOpenNewRequest,
  onOpenAnalytics,
  onRunScheduler,
}) => {
  if (!isOpen) return null;

  const steps = [
    {
      num: 1,
      title: 'Fast Autonomous Approval Flow',
      actor: 'Ravi Kumar (Handler)',
      icon: User,
      iconColor: 'bg-emerald-100 text-emerald-700',
      description:
        'Ravi submits "500 bags of rice by Friday ($4,000)". Since $4,000 ≤ $5,000 threshold and Sunrise Trading score is 8.8 ≥ 7.5, it auto-approves instantly and dispatches official PO-2026-085 into the supplier outbox.',
      actionLabel: 'Switch to Ravi & Compose Requisition',
      onAction: () => {
        onSelectRole('user-ravi');
        onClose();
        setTimeout(onOpenNewRequest, 150);
      },
    },
    {
      num: 2,
      title: 'Manager Exception Queue',
      actor: 'Meena Sharma (Procurement Manager)',
      icon: ShieldCheck,
      iconColor: 'bg-indigo-100 text-indigo-700',
      description:
        'A high-value order (e.g., PO-2026-081 for 120 Industrial Pallet Racks @ $12,000) exceeds the $5,000 policy limit. The AI flags reasons and routes it directly to Meena\'s Exception Queue for human authorization.',
      actionLabel: 'Switch to Meena (Review Exception PO-081)',
      onAction: () => {
        onSelectRole('user-meena');
        onClose();
      },
    },
    {
      num: 3,
      title: 'Supplier Simulator & Autonomous Chasers',
      actor: 'Sunrise Trading & Tracker Scheduler',
      icon: Building2,
      iconColor: 'bg-amber-100 text-amber-700',
      description:
        'Sunrise receives POs in their portal. If an order sits idle for over 24 hours without confirmation, the autonomous scheduler tick fires an AI-drafted chaser email with escalating tone.',
      actionLabel: 'Run Scheduler Tick (Fire Chasers)',
      onAction: () => {
        onClose();
        onRunScheduler();
      },
    },
    {
      num: 4,
      title: 'Delivery Verification & Continuous Feedback Loop',
      actor: 'Ravi Kumar (Operations Handler)',
      icon: TrendingDown,
      iconColor: 'bg-rose-100 text-rose-700',
      description:
        'Open shipped order PO-2026-077 and click "Verify Goods Delivery". Log 30 damaged bags. The mathematical scoring formula immediately drops Sunrise Trading\'s score from 8.8 to ~7.4.',
      actionLabel: 'Switch to Ravi (Inspect PO-077)',
      onAction: () => {
        onSelectRole('user-ravi');
        onClose();
      },
    },
    {
      num: 5,
      title: 'Automated Routing Diverts to Better Supplier',
      actor: 'Autopilot Rule Engine',
      icon: Bot,
      iconColor: 'bg-blue-100 text-blue-700',
      description:
        'Once Sunrise\'s score drops below Nova Supplies (8.5), any subsequent rice or food requisition autonomously selects Nova Supplies instead of Sunrise—closing the feedback loop!',
      actionLabel: 'Test New Rice Requisition (Watch Vendor Switch)',
      onAction: () => {
        onSelectRole('user-ravi');
        onClose();
        setTimeout(onOpenNewRequest, 150);
      },
    },
    {
      num: 6,
      title: 'Analytics & Executive AI Briefing',
      actor: 'Meena & Leadership Dashboard',
      icon: BarChart3,
      iconColor: 'bg-violet-100 text-violet-700',
      description:
        'View the live analytics dashboard: fulfillment close rate, stage cycle times, dynamic vendor leaderboard, and an executive briefing written by Gemini.',
      actionLabel: 'Open Analytics & Scorecard',
      onAction: () => {
        onClose();
        onOpenAnalytics();
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5" />
            <div>
              <h2 className="text-base font-bold">Interactive Demo Walkthrough</h2>
              <p className="text-xs text-blue-100">
                End-to-End Story: Ravi (Handler), Meena (Manager), and Sunrise (Supplier)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Steps List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {steps.map((st) => {
            const Icon = st.icon;
            return (
              <div
                key={st.num}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${st.iconColor}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400 font-mono">
                        STEP 0{st.num}
                      </span>
                      <h3 className="text-xs font-bold text-slate-900">{st.title}</h3>
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 mb-1">
                      Actor: <strong>{st.actor}</strong>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                      {st.description}
                    </p>
                  </div>
                </div>

                <button
                  onClick={st.onAction}
                  className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <span>{st.actionLabel}</span>
                  <ArrowRight className="h-3 w-3 text-blue-600" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
