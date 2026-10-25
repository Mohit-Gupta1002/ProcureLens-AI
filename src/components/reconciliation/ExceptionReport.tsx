'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  XCircle,
  Info,
  CheckCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Check,
  X,
  MessageSquare,
  Shield,
  Calculator,
} from 'lucide-react';
import { Discrepancy, DiscrepancySeverity, ReviewStatus } from '@/types/procurement';

interface ExceptionReportProps {
  discrepancies: Discrepancy[];
  onReviewDiscrepancy: (
    id: string,
    status: ReviewStatus,
    notes?: string
  ) => void;
  onRequestExplanation: (discrepancy: Discrepancy) => void;
}

export function ExceptionReport({
  discrepancies,
  onReviewDiscrepancy,
  onRequestExplanation,
}: ExceptionReportProps) {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(
    discrepancies.length > 0 ? discrepancies[0].id : null
  );

  const filteredDiscrepancies = discrepancies.filter((d) => {
    if (severityFilter !== 'ALL' && d.severity !== severityFilter) return false;
    if (statusFilter !== 'ALL' && d.reviewStatus !== statusFilter) return false;
    return true;
  });

  const getSeverityBadge = (severity: DiscrepancySeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            CRITICAL
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            WARNING
          </span>
        );
      case 'INFO':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            INFO
          </span>
        );
    }
  };

  const getStatusBadge = (status: ReviewStatus) => {
    switch (status) {
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-3 h-3" />
            Accepted Variance
          </span>
        );
      case 'DISMISSED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <X className="w-3 h-3" />
            Dismissed
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* Header & Filter Bar */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              Reconciliation Exception Center
            </h3>
            <span className="text-xs text-slate-500 font-normal">
              ({filteredDiscrepancies.length} of {discrepancies.length} items shown)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic rule violations requiring human procurement assessment.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 text-xs">
          {/* Severity Filter */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
            {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  severityFilter === sev
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sev === 'ALL' ? 'All Severities' : sev}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
            {['ALL', 'PENDING', 'ACCEPTED', 'DISMISSED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'All Status' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Exception List or Empty State */}
      {filteredDiscrepancies.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800">No Exceptions Found</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {discrepancies.length === 0
              ? 'This document pair matches perfectly with zero variance across all verified tolerances.'
              : 'No discrepancies match the active severity or status filters.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {filteredDiscrepancies.map((disc) => {
            const isExpanded = expandedId === disc.id;
            return (
              <div
                key={disc.id}
                className={`transition-colors ${
                  isExpanded ? 'bg-slate-50/40' : 'hover:bg-slate-50/20'
                }`}
              >
                {/* Summary Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : disc.id)}
                  className="px-6 py-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="mt-0.5">{getSeverityBadge(disc.severity)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-800">
                          {disc.field}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-medium text-slate-600">
                          {disc.category.replace(/_/g, ' ')}
                        </span>
                        <span className="text-slate-300">•</span>
                        {getStatusBadge(disc.reviewStatus)}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                        {disc.explanation}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900 font-mono">
                        {disc.varianceDisplay}
                      </div>
                      <div className="text-[11px] text-slate-400">calculated variance</div>
                    </div>
                    <div className="text-slate-400">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Detail Panel */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-1 border-t border-slate-100 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      {/* Values Comparison Card */}
                      <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Document Value Comparison
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                            <span className="text-slate-500">Authorized PO Value:</span>
                            <span className="font-mono font-semibold text-slate-900">
                              {String(disc.poValue ?? 'N/A')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                            <span className="text-slate-500">Invoiced Billed Value:</span>
                            <span className="font-mono font-semibold text-slate-900">
                              {String(disc.invoiceValue ?? 'N/A')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-0.5">
                            <span className="font-semibold text-slate-700">Calculated Variance:</span>
                            <span className="font-mono font-bold text-rose-600">
                              {disc.varianceDisplay}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Evidence & Math Breakdown */}
                      <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs flex flex-col justify-between">
                        <div>
                          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Calculator className="w-3.5 h-3.5 text-slate-500" />
                            <span>Audit Evidence & Computation</span>
                          </div>
                          {disc.evidence.calculationBreakdown && (
                            <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200 text-slate-700 mb-2">
                              {disc.evidence.calculationBreakdown}
                            </div>
                          )}
                          <div className="text-slate-500 text-[11px]">
                            {disc.evidence.poExcerpt && (
                              <p className="truncate">PO Ref: {disc.evidence.poExcerpt}</p>
                            )}
                            {disc.evidence.invoiceExcerpt && (
                              <p className="truncate">Inv Ref: {disc.evidence.invoiceExcerpt}</p>
                            )}
                          </div>
                        </div>

                        {/* Suggested Action */}
                        <div className="mt-3 pt-2 border-t border-slate-200/60">
                          <span className="text-[11px] font-semibold text-slate-600">
                            Suggested Next Step:
                          </span>
                          <p className="text-slate-700 text-xs mt-0.5">{disc.suggestedAction}</p>
                        </div>
                      </div>
                    </div>

                    {/* Review Notes Display if already reviewed */}
                    {disc.reviewNotes && (
                      <div className="mt-3 p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs">
                        <div className="flex items-center justify-between font-semibold text-emerald-800">
                          <span className="flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Review Justification Recorded ({disc.reviewStatus})</span>
                          </span>
                          <span className="text-[11px] text-emerald-600 font-mono">
                            {disc.reviewedAt ? disc.reviewedAt.replace('T', ' ').slice(11, 19) : 'Local'}
                          </span>
                        </div>
                        <p className="text-emerald-900 mt-1 italic">&ldquo;{disc.reviewNotes}&rdquo;</p>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      {/* Left: AI / Rule Explainer Button */}
                      <button
                        onClick={() => onRequestExplanation(disc)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Explain with Lens AI</span>
                      </button>

                      {/* Right: Human Review Controls */}
                      <div className="flex items-center gap-2">
                        {disc.reviewStatus !== 'PENDING' && (
                          <button
                            onClick={() => onReviewDiscrepancy(disc.id, 'PENDING')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            title="Reset to pending review"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset Review</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            const note = prompt('Optional review notes for dismissing this exception:');
                            if (note !== null) {
                              onReviewDiscrepancy(disc.id, 'DISMISSED', note || 'Dismissed by reviewer');
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            disc.reviewStatus === 'DISMISSED'
                              ? 'bg-slate-800 text-white font-semibold'
                              : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <X className="w-3.5 h-3.5 text-slate-500" />
                          <span>Dismiss Exception</span>
                        </button>

                        <button
                          onClick={() => {
                            const note = prompt(
                              'Enter justification for accepting this variance (e.g. Authorized by VP, change order pending):',
                              'Authorized business variance approved'
                            );
                            if (note !== null) {
                              onReviewDiscrepancy(disc.id, 'ACCEPTED', note);
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-colors ${
                            disc.reviewStatus === 'ACCEPTED'
                              ? 'bg-emerald-700 text-white'
                              : 'bg-emerald-600 text-white hover:bg-emerald-500'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept as Valid Variance</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
