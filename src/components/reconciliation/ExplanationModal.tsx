'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  Mail,
  Copy,
  Check,
  Scale,
  Loader2,
} from 'lucide-react';
import { Discrepancy, ExplanationResponse } from '@/types/procurement';

interface ExplanationModalProps {
  discrepancy: Discrepancy | null;
  poNumber: string;
  invoiceNumber: string;
  supplierName: string;
  currency: string;
  onClose: () => void;
}

export function ExplanationModal({
  discrepancy,
  poNumber,
  invoiceNumber,
  supplierName,
  currency,
  onClose,
}: ExplanationModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<ExplanationResponse | null>(null);
  const [copiedDraft, setCopiedDraft] = useState<boolean>(false);

  useEffect(() => {
    if (!discrepancy) return;

    let isMounted = true;

    async function loadExplanation() {
      try {
        const res = await fetch('/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            discrepancy,
            poNumber,
            invoiceNumber,
            supplierName,
            currency,
          }),
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = (await res.json()) as ExplanationResponse;
        if (isMounted) {
          setExplanation(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Explanation request failed:', err);
        if (isMounted) {
          setError('Failed to fetch explanation. Deterministic rule baseline shown.');
          setLoading(false);
        }
      }
    }

    void loadExplanation();

    return () => {
      isMounted = false;
    };
  }, [discrepancy, poNumber, invoiceNumber, supplierName, currency]);

  if (!discrepancy) return null;

  const handleCopyDraft = () => {
    if (!explanation?.supplierCommunicationDraft) return;
    navigator.clipboard.writeText(explanation.supplierCommunicationDraft);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">ProcureLens AI Advisory</h3>
                {explanation && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      explanation.source === 'LIVE_LLM'
                        ? 'bg-purple-900/60 text-purple-300 border-purple-500/30'
                        : 'bg-emerald-900/60 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {explanation.source === 'LIVE_LLM'
                      ? `Live LLM (${explanation.modelName || 'Active'})`
                      : 'Deterministic Audit Rules'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Objective risk assessment & dispute resolution guidance
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
          {loading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-800">
                Synthesizing Procurement Assessment...
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Evaluating contractual clauses and calculating exposure boundaries.
              </p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {error}
            </div>
          ) : explanation ? (
            <>
              {/* Focus Discrepancy Meta Banner */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4 text-xs">
                <div>
                  <span className="text-slate-500">Violated Parameter:</span>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {discrepancy.field}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Contract vs Invoiced:</span>
                  <div className="font-mono text-slate-800 mt-0.5">
                    {String(discrepancy.poValue)} ➔ {String(discrepancy.invoiceValue)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Variance:</span>
                  <div className="font-mono font-bold text-rose-600 mt-0.5">
                    {discrepancy.varianceDisplay}
                  </div>
                </div>
              </div>

              {/* Executive Summary */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Executive Finding</span>
                </h4>
                <p className="text-slate-800 leading-relaxed font-medium bg-emerald-50/40 p-3 rounded-lg border border-emerald-100 text-xs">
                  {explanation.summary}
                </p>
              </div>

              {/* Risk Assessment & Commercial Impact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Contract & Compliance Risk
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed mt-1">
                    {explanation.businessRiskAssessment}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Financial & Margin Impact
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed mt-1">
                    {explanation.commercialImpact}
                  </p>
                </div>
              </div>

              {/* Recommended Resolution */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Recommended Procedural Action</span>
                </h4>
                <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-200 text-xs text-blue-900 leading-relaxed">
                  {explanation.recommendedResolution}
                </div>
              </div>

              {/* Supplier Dispute Communication Draft */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>Vendor Accounts Receivable Notice Draft</span>
                  </h4>
                  <button
                    onClick={handleCopyDraft}
                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
                  >
                    {copiedDraft ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied to Clipboard</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy Dispute Draft</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] leading-relaxed whitespace-pre-line border border-slate-800 shadow-inner">
                  {explanation.supplierCommunicationDraft}
                </div>
              </div>

              {/* Citations */}
              {explanation.keyCitations && explanation.keyCitations.length > 0 && (
                <div className="pt-2 border-t border-slate-200 flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="font-semibold">Governing Citations:</span>
                  {explanation.keyCitations.map((cite, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]"
                    >
                      {cite}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Deterministic engine holds mathematical authority.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg text-xs hover:bg-slate-800 transition-colors"
          >
            Close Advisory
          </button>
        </div>
      </div>
    </div>
  );
}
