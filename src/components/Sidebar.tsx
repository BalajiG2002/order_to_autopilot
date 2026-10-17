import React from 'react';
import {
  Inbox,
  Send,
  FileEdit,
  AlertTriangle,
  BarChart3,
  Sliders,
  PlusCircle,
  Tag,
  CheckCircle2,
  Package,
  Truck,
  RotateCw,
  Archive,
} from 'lucide-react';
import { OrderStep, UserProfile } from '../types/index.ts';

interface SidebarProps {
  currentUser: UserProfile;
  activeFolder: string;
  onSelectFolder: (folder: string) => void;
  activeStepFilter: string;
  onSelectStepFilter: (step: string) => void;
  onOpenNewRequest: () => void;
  onOpenPolicy: () => void;
  onOpenAnalytics: () => void;
  folderCounts: {
    all: number;
    inbox: number;
    exceptions: number;
    drafts: number;
    sent: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeFolder,
  onSelectFolder,
  activeStepFilter,
  onSelectStepFilter,
  onOpenNewRequest,
  onOpenPolicy,
  onOpenAnalytics,
  folderCounts,
}) => {
  const isHandler = currentUser.role === 'HANDLER';
  const isManager = currentUser.role === 'MANAGER';
  const isSupplier = currentUser.role === 'SUPPLIER';

  const folders = [
    {
      id: 'inbox',
      name: 'Inbox',
      icon: Inbox,
      count: folderCounts.inbox,
      badgeColor: 'bg-blue-100 text-blue-700',
      description: isManager
        ? 'Exceptions needing sign-off'
        : isSupplier
        ? 'New POs & chaser requests'
        : 'Deliveries to inspect & sign',
    },
    {
      id: 'sent',
      name: 'Sent',
      icon: Send,
      count: folderCounts.sent,
      description: 'Dispatched POs & replies',
    },
    {
      id: 'drafts',
      name: 'Drafts',
      icon: FileEdit,
      count: folderCounts.drafts,
      description: 'Pending approvals & chasers',
    },
    {
      id: 'exceptions',
      name: 'Exception Queue',
      icon: AlertTriangle,
      count: folderCounts.exceptions,
      badgeColor: folderCounts.exceptions > 0 ? 'bg-amber-100 text-amber-800 animate-pulse' : '',
      description: 'Violations > $5,000 or low score',
    },
    {
      id: 'all',
      name: 'All Orders',
      icon: Archive,
      count: folderCounts.all,
      description: 'Complete audit mailbox',
    },
  ];

  const stateFilters: { step: OrderStep | 'ALL'; label: string; icon: any }[] = [
    { step: 'ALL', label: 'All Stages', icon: Tag },
    { step: 'REQUESTED', label: 'Requested', icon: FileEdit },
    { step: 'ORDERED', label: 'Ordered', icon: Package },
    { step: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle2 },
    { step: 'SHIPPED', label: 'Shipped', icon: Truck },
    { step: 'RECEIVED', label: 'Received', icon: RotateCw },
    { step: 'CLOSED', label: 'Closed', icon: CheckCircle2 },
  ];

  return (
    <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 select-none h-[calc(100vh-4rem)]">
      {/* Primary Action Button: Compose Request */}
      <div className="p-4 border-b border-slate-200">
        <button
          onClick={onOpenNewRequest}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/25 transition active:scale-95 cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Procurement Requisition</span>
        </button>
      </div>

      {/* Main Mail Folders */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Mail Folders
        </div>
        {folders.map((f) => {
          const Icon = f.icon;
          const isActive = activeFolder === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onSelectFolder(f.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer text-left ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-blue-600' : 'text-slate-500'
                  }`}
                />
                <span className="truncate">{f.name}</span>
              </div>
              {f.count !== undefined && f.count > 0 && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    f.badgeColor || 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {f.count}
                </span>
              )}
            </button>
          );
        })}

        {/* State Machine Status Filter */}
        <div className="pt-4">
          <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Lifecycle Stage
          </div>
          <div className="space-y-0.5 mt-1">
            {stateFilters.map((s) => {
              const Icon = s.icon;
              const isSelected = activeStepFilter === s.step;
              return (
                <button
                  key={s.step}
                  onClick={() => onSelectStepFilter(s.step)}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs transition cursor-pointer text-left ${
                    isSelected
                      ? 'bg-slate-200 text-slate-900 font-bold'
                      : 'text-slate-600 hover:bg-slate-200/50'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Navigation: Analytics & Policy */}
      <div className="p-3 border-t border-slate-200 space-y-1 bg-white">
        <button
          onClick={onOpenAnalytics}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer text-left"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            <span>Analytics &amp; Scorecard</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
            Feedback
          </span>
        </button>

        <button
          onClick={onOpenPolicy}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer text-left"
        >
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-indigo-600" />
            <span>Procurement Rules</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">$5k limit</span>
        </button>

        {/* Current Active User Info */}
        <div className="mt-2 pt-2 border-t border-slate-100 px-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[11px] text-slate-500 truncate">
            Viewing as: <strong className="text-slate-800">{currentUser.name}</strong>
          </span>
        </div>
      </div>
    </aside>
  );
};
