'use client';

import React from 'react';
import {
  DollarSign,
  ShieldCheck,
  AlertOctagon,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { ReconciliationSummary, Discrepancy } from '@/types/procurement';

interface SummaryCardsProps {
  summary: ReconciliationSummary;
  discrepancies: Discrepancy[];
}

export function SummaryCards({ summary, discrepancies }: SummaryCardsProps) {
  const pendingCount = discrepancies.filter((d) => d.reviewStatus === 'PENDING').length;
  const acceptedCount = discrepancies.filter((d) => d.reviewStatus === 'ACCEPTED').length;
  const dismissedCount = discrepancies.filter((d) => d.reviewStatus === 'DISMISSED').length;
  const reviewedCount = acceptedCount + dismissedCount;
  const reviewProgress =
    discrepancies.length > 0 ? Math.round((reviewedCount / discrepancies.length) * 100) : 100;

  const isOverbilled = summary.totalVariance > 0.05;
  const isUnderbilled = summary.totalVariance < -0.05;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: summary.currency || 'USD',
      minimumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Financial Settlement Variance */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <span>Settlement Variance</span>
            <div
              className={`p-1.5 rounded-lg ${
                isOverbilled
                  ? 'bg-rose-50 text-rose-600'
                  : isUnderbilled
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tracking-tight ${
                isOverbilled
                  ? 'text-rose-600'
                  : isUnderbilled
                  ? 'text-blue-600'
                  : 'text-emerald-700'
              }`}
            >
              {isOverbilled ? `+${formatCurrency(summary.totalVariance)}` : formatCurrency(summary.totalVariance)}
            </span>
            <span className="text-xs text-slate-500 font-medium">net delta</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            PO: <span className="font-semibold text-slate-800">{formatCurrency(summary.poTotal)}</span>
          </div>
          <div>
            Inv: <span className="font-semibold text-slate-800">{formatCurrency(summary.invoiceTotal)}</span>
          </div>
        </div>
      </div>

      {/* Card 2: Deterministic Reconciliation Score */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <span>Reconciliation Score</span>
            <div
              className={`p-1.5 rounded-lg ${
                summary.reconciliationScore >= 90
                  ? 'bg-emerald-50 text-emerald-600'
                  : summary.reconciliationScore >= 70
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-rose-50 text-rose-600'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tracking-tight ${
                summary.reconciliationScore >= 90
                  ? 'text-emerald-700'
                  : summary.reconciliationScore >= 70
                  ? 'text-amber-600'
                  : 'text-rose-600'
              }`}
            >
              {summary.reconciliationScore}
            </span>
            <span className="text-xs text-slate-400 font-medium">/ 100</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
          <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                summary.reconciliationScore >= 90
                  ? 'bg-emerald-500'
                  : summary.reconciliationScore >= 70
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${summary.reconciliationScore}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold text-slate-600">
            {summary.overallStatus === 'MATCHED'
              ? 'Compliant'
              : summary.overallStatus === 'WARNINGS'
              ? 'Minor Flags'
              : 'Audit Disputed'}
          </span>
        </div>
      </div>

      {/* Card 3: Discrepancy Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <span>Detected Exceptions</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {summary.totalDiscrepancies}
            </span>
            <span className="text-xs text-slate-500 font-medium">issues flagged</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            {summary.criticalCount} Critical
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            {summary.warningCount} Warning
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            {summary.infoCount} Info
          </span>
        </div>
      </div>

      {/* Card 4: Review Workflow Progress */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <span>Human Review Status</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {reviewProgress}%
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({reviewedCount} / {discrepancies.length || 0} resolved)
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>{pendingCount} Pending</span>
          </span>
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
            {acceptedCount} Accepted • {dismissedCount} Dismissed
          </span>
        </div>
      </div>
    </div>
  );
}
