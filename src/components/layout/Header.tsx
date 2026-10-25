'use client';

import React from 'react';
import {
  ChevronDown,
  RefreshCw,
  UploadCloud,
  SlidersHorizontal,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { SyntheticScenario } from '@/types/procurement';

interface HeaderProps {
  scenarios: SyntheticScenario[];
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
  onOpenCustomModal: () => void;
  onOpenTolerancesModal: () => void;
  onResetSession: () => void;
  overallStatus: 'MATCHED' | 'WARNINGS' | 'CRITICAL_DISCREPANCIES';
}

export function Header({
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  onOpenCustomModal,
  onOpenTolerancesModal,
  onResetSession,
  overallStatus,
}: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-xs z-10">
      {/* Left: Scenario Selector */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <label htmlFor="scenario-select" className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Reconciliation Target
          </label>
          <div className="relative inline-block">
            <select
              id="scenario-select"
              value={selectedScenarioId}
              onChange={(e) => onSelectScenario(e.target.value)}
              className="appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-300 text-slate-800 text-sm font-semibold rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer transition-colors"
            >
              {scenarios.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.title} — {sc.subtitle}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Status Indicator */}
        <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-200">
          {overallStatus === 'MATCHED' && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Full Reconciliation Match</span>
            </div>
          )}
          {overallStatus === 'WARNINGS' && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Warnings Flagged</span>
            </div>
          )}
          {overallStatus === 'CRITICAL_DISCREPANCIES' && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <XCircle className="w-3.5 h-3.5" />
              <span>Action Required (Critical)</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Session Indicator Badge */}
        <div
          className="hidden xl:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100/80 border border-slate-200 px-2.5 py-1 rounded-md"
          title="Reviews and decisions are kept in memory for this session"
        >
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>Local Session State</span>
        </div>

        <button
          onClick={onOpenTolerancesModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors"
          title="Configure tolerance thresholds"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
          <span>Tolerances</span>
        </button>

        <button
          onClick={onResetSession}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors"
          title="Reset reviews to initial scenario state"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Reset</span>
        </button>

        <button
          onClick={onOpenCustomModal}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all"
        >
          <UploadCloud className="w-4 h-4 text-emerald-400" />
          <span>Custom Documents</span>
        </button>
      </div>
    </header>
  );
}
