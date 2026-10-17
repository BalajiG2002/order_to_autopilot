import React from 'react';
import {
  Sparkles,
  Bot,
  Play,
  RotateCcw,
  Clock,
  ShieldCheck,
  ChevronDown,
  UserCheck,
  Layers,
} from 'lucide-react';
import { UserProfile } from '../types/index.ts';

interface HeaderProps {
  currentUser: UserProfile;
  users: UserProfile[];
  onSelectUser: (user: UserProfile) => void;
  onOpenDemoTour: () => void;
  onRunScheduler: () => void;
  onResetDemo: () => void;
  isSchedulerRunning: boolean;
  schedulerMessage?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  users,
  onSelectUser,
  onOpenDemoTour,
  onRunScheduler,
  onResetDemo,
  isSchedulerRunning,
  schedulerMessage,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'HANDLER':
        return { label: 'Requester / Handler', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'MANAGER':
        return { label: 'Procurement Manager', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'SUPPLIER':
        return { label: 'External Vendor', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { label: role, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const badge = getRoleBadge(currentUser.role);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Status */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 tracking-tight text-base">
                Order-to-Delivery Autopilot
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                Email-First
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Autonomous intake, rule governance, supplier dispatch &amp; feedback loops
            </p>
          </div>
        </div>

        {/* Center / Right: Interactive Simulator Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Demo Tour Button */}
          <button
            onClick={onOpenDemoTour}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm hover:from-violet-700 hover:to-indigo-700 transition active:scale-95 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Demo Script &amp; Story</span>
            <span className="md:hidden">Demo Story</span>
          </button>

          {/* Run Scheduler Button */}
          <button
            onClick={onRunScheduler}
            disabled={isSchedulerRunning}
            title="Scan POs for idle SLA thresholds and send chaser reminders"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Clock className={`h-3.5 w-3.5 text-blue-600 ${isSchedulerRunning ? 'animate-spin' : ''}`} />
            <span className="hidden lg:inline">Run Scheduler Tick</span>
            <span className="lg:hidden">Chaser Check</span>
          </button>

          {/* Reset Demo State */}
          <button
            onClick={onResetDemo}
            title="Reset database to initial Ravi, Meena & Sunrise seed data"
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition active:scale-95 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 inline sm:mr-1" />
            <span className="hidden sm:inline">Reset Seed</span>
          </button>

          {/* Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 transition cursor-pointer text-left"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-300"
              />
              <div className="hidden sm:block leading-tight">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  {currentUser.name}
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </div>
                <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                  {currentUser.title}
                </div>
              </div>
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Switch Perspective (Demo Roles)
                  </div>
                  {users.map((user) => {
                    const isSelected = user.id === currentUser.id;
                    const userBadge = getRoleBadge(user.role);
                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          onSelectUser(user);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center gap-3 transition cursor-pointer hover:bg-slate-50 ${
                          isSelected ? 'bg-blue-50/70 border-l-4 border-blue-600' : ''
                        }`}
                      >
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                            <span>{user.name}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${userBadge.bg}`}
                            >
                              {user.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">{user.title}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{user.email}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Scheduler feedback banner if recently fired */}
      {schedulerMessage && (
        <div className="bg-indigo-50 border-t border-indigo-100 px-4 py-1.5 text-xs text-indigo-700 flex items-center justify-center gap-2 font-medium">
          <Clock className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <span>{schedulerMessage}</span>
        </div>
      )}
    </header>
  );
};
