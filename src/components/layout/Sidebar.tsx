'use client';

import React from 'react';
import {
  ShieldAlert,
  Sliders,
  FileCheck2,
  FileText,
  Building2,
  History,
  Layers,
  Scale,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  currentTab: 'dashboard' | 'comparison' | 'exceptions' | 'tolerances' | 'history';
  onSelectTab: (tab: 'dashboard' | 'comparison' | 'exceptions' | 'tolerances' | 'history') => void;
  exceptionCount: number;
  criticalCount: number;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  exceptionCount,
  criticalCount,
}: SidebarProps) {
  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'Overview & Metrics',
      icon: Layers,
      badge: null,
    },
    {
      id: 'exceptions' as const,
      label: 'Exception Center',
      icon: ShieldAlert,
      badge: exceptionCount > 0 ? (
        <span
          className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
            criticalCount > 0
              ? 'bg-rose-100 text-rose-700 font-mono'
              : 'bg-amber-100 text-amber-700 font-mono'
          }`}
        >
          {exceptionCount}
        </span>
      ) : null,
    },
    {
      id: 'comparison' as const,
      label: 'Document Compare',
      icon: FileCheck2,
      badge: null,
    },
    {
      id: 'tolerances' as const,
      label: 'Tolerance Rules',
      icon: Sliders,
      badge: null,
    },
    {
      id: 'history' as const,
      label: 'Audit History',
      icon: History,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 text-slate-300 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-semibold text-white tracking-tight">ProcureLens</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Reconciliation Engine</p>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <div className="p-3 space-y-1 flex-1">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-slate-800 text-white shadow-sm font-semibold border-l-2 border-emerald-500 pl-[10px]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge}
            </button>
          );
        })}

        <div className="pt-6 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Reconciliation Scope
        </div>
        <div className="px-3 py-2 text-xs text-slate-400 space-y-2">
          <div className="flex items-center gap-2 text-slate-300">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>3-Way PO Matching</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Vendor Fraud Protection</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI Narrative Layer</span>
          </div>
        </div>
      </div>

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px]">Engine Status</span>
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Deterministic v1.2
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          Strict math authority active. LLM advisory fallback ready.
        </div>
      </div>
    </aside>
  );
}
