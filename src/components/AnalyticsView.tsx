import React from 'react';
import {
  X,
  BarChart3,
  Bot,
  Star,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Award,
  ArrowRight,
} from 'lucide-react';
import { AnalyticsSummary } from '../types/index.ts';

interface AnalyticsViewProps {
  isOpen: boolean;
  onClose: () => void;
  data: AnalyticsSummary | null;
  isLoading: boolean;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  isOpen,
  onClose,
  data,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Procurement Analytics &amp; Continuous Feedback
              </h2>
              <p className="text-xs text-slate-500">
                Autonomous cycle times, close rates, and dynamic supplier scorecards
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading || !data ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading analytics &amp; AI insights...</div>
          ) : (
            <>
              {/* Executive AI Briefing */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 border border-blue-200 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 mb-2">
                  <Bot className="h-4 w-4 text-indigo-600" />
                  <span>Gemini Autonomous Operational Briefing</span>
                </div>
                <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {data.ai_insight_summary}
                </div>
              </div>

              {/* 4 KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-medium text-slate-500">Close Rate</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {(data.close_rate * 100).toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {data.closed_orders} of {data.total_orders} POs closed
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-medium text-slate-500">Avg Cycle Time</div>
                  <div className="text-2xl font-black text-blue-600 mt-1">
                    {data.avg_cycle_days.toFixed(1)} <span className="text-sm font-normal text-slate-500">days</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Intake to 2-way match</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-medium text-slate-500">On-Time Rate</div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    {data.on_time_percentage}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Across tier-1 suppliers</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-medium text-slate-500">Damage Rate</div>
                  <div className="text-2xl font-black text-rose-600 mt-1">
                    {data.damage_percentage}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Transit defect frequency</div>
                </div>
              </div>

              {/* Cycle Time by Stage */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span>Cycle Time Breakdown by Stage</span>
                </h3>
                <div className="space-y-3">
                  {data.cycle_times_by_stage.map((s) => (
                    <div key={s.stage} className="text-xs">
                      <div className="flex justify-between font-medium text-slate-700 mb-1">
                        <span>{s.stage}</span>
                        <span className="font-bold font-mono text-slate-900">{s.days} days</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${Math.min(100, (s.days / 3) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supplier Rankings Leaderboard */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    <span>Dynamic Supplier Leaderboard (Feedback Loop)</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Updated continuously upon delivery
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Rank</th>
                        <th className="py-2.5 px-4">Supplier</th>
                        <th className="py-2.5 px-4">Category</th>
                        <th className="py-2.5 px-4">Score (0-10)</th>
                        <th className="py-2.5 px-4">On-Time</th>
                        <th className="py-2.5 px-4">Damage</th>
                        <th className="py-2.5 px-4">Auto-Approve</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.supplier_rankings.map((sup, idx) => (
                        <tr key={sup.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-bold text-slate-500">#{idx + 1}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{sup.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{sup.email}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{sup.category}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                              {sup.score.toFixed(1)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-emerald-600 font-bold">
                            {(sup.on_time_rate * 100).toFixed(0)}%
                          </td>
                          <td className="py-3 px-4 text-rose-600 font-bold">
                            {(sup.damage_rate * 100).toFixed(1)}%
                          </td>
                          <td className="py-3 px-4">
                            {sup.score >= 7.5 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Eligible (Score &gt;= 7.5)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                Restricted (&lt; 7.5)
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
