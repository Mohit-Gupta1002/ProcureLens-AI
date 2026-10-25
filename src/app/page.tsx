'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Sliders,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { DocumentComparisonView } from '@/components/reconciliation/DocumentComparisonView';
import { ExceptionReport } from '@/components/reconciliation/ExceptionReport';
import { ExplanationModal } from '@/components/reconciliation/ExplanationModal';
import { ToleranceConfigModal } from '@/components/reconciliation/ToleranceConfigModal';
import { CustomComparisonModal } from '@/components/reconciliation/CustomComparisonModal';

import { SYNTHETIC_SCENARIOS } from '@/data/scenarios';
import {
  PurchaseOrder,
  SupplierInvoice,
  ReconciliationConfig,
  ReconciliationResult,
  Discrepancy,
  ReviewStatus,
} from '@/types/procurement';
import {
  reconcileDocuments,
  DEFAULT_RECONCILIATION_CONFIG,
} from '@/lib/reconciliation/engine';

interface SessionReviewRecord {
  status: ReviewStatus;
  notes?: string;
  timestamp: string;
}

export default function ProcureLensDashboard() {
  // Navigation State
  const [currentTab, setCurrentTab] = useState<
    'dashboard' | 'comparison' | 'exceptions' | 'tolerances' | 'history'
  >('dashboard');

  // Scenario & Custom Document State
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('pricing-quantity-variance');
  const [customPo, setCustomPo] = useState<PurchaseOrder | null>(null);
  const [customInvoice, setCustomInvoice] = useState<SupplierInvoice | null>(null);

  // Reconciliation Config State
  const [config, setConfig] = useState<ReconciliationConfig>(DEFAULT_RECONCILIATION_CONFIG);

  // In-Memory Session Review Tracking (Explicitly indicated as session-only)
  const [sessionReviews, setSessionReviews] = useState<{ [discrepancyId: string]: SessionReviewRecord }>({});

  // Modals
  const [explanationDiscrepancy, setExplanationDiscrepancy] = useState<Discrepancy | null>(null);
  const [isTolerancesModalOpen, setIsTolerancesModalOpen] = useState<boolean>(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);

  // Active documents
  const activeScenario = useMemo(() => {
    return SYNTHETIC_SCENARIOS.find((s) => s.id === selectedScenarioId) || SYNTHETIC_SCENARIOS[0];
  }, [selectedScenarioId]);

  const currentPo = customPo || activeScenario.po;
  const currentInvoice = customInvoice || activeScenario.invoice;

  // Run deterministic reconciliation
  const rawReconciliationResult = useMemo(() => {
    return reconcileDocuments(currentPo, currentInvoice, config);
  }, [currentPo, currentInvoice, config]);

  // Merge session review overrides into discrepancies
  const reconciliationResult = useMemo<ReconciliationResult>(() => {
    const updatedDiscrepancies = rawReconciliationResult.discrepancies.map((disc) => {
      const sessionReview = sessionReviews[disc.id];
      if (sessionReview) {
        return {
          ...disc,
          reviewStatus: sessionReview.status,
          reviewNotes: sessionReview.notes,
          reviewedAt: sessionReview.timestamp,
        };
      }
      return disc;
    });

    return {
      ...rawReconciliationResult,
      discrepancies: updatedDiscrepancies,
    };
  }, [rawReconciliationResult, sessionReviews]);

  // Handler for reviewing an individual discrepancy
  const handleReviewDiscrepancy = (id: string, status: ReviewStatus, notes?: string) => {
    setSessionReviews((prev) => ({
      ...prev,
      [id]: {
        status,
        notes,
        timestamp: new Date().toISOString(),
      },
    }));
  };

  // Handler for selecting scenario
  const handleSelectScenario = (id: string) => {
    setCustomPo(null);
    setCustomInvoice(null);
    setSelectedScenarioId(id);
  };

  // Handler for custom documents
  const handleRunCustom = (po: PurchaseOrder, invoice: SupplierInvoice) => {
    setCustomPo(po);
    setCustomInvoice(invoice);
    setCurrentTab('dashboard');
  };

  // Reset in-memory session review state
  const handleResetSession = () => {
    setSessionReviews({});
    setConfig(DEFAULT_RECONCILIATION_CONFIG);
  };

  const criticalExceptions = reconciliationResult.discrepancies.filter(
    (d) => d.severity === 'CRITICAL'
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        exceptionCount={reconciliationResult.discrepancies.length}
        criticalCount={reconciliationResult.summary.criticalCount}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          scenarios={SYNTHETIC_SCENARIOS}
          selectedScenarioId={customPo ? 'custom' : selectedScenarioId}
          onSelectScenario={handleSelectScenario}
          onOpenCustomModal={() => setIsCustomModalOpen(true)}
          onOpenTolerancesModal={() => setIsTolerancesModalOpen(true)}
          onResetSession={handleResetSession}
          overallStatus={reconciliationResult.summary.overallStatus}
        />

        {/* Scrollable Main Canvas */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active Target Banner */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {customPo ? 'Custom Upload Payload' : activeScenario.badge}
                  </span>
                  <span className="text-xs text-slate-400">
                    PO: {currentPo.poNumber} • Invoice: {currentInvoice.invoiceNumber}
                  </span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  {customPo ? 'Custom Reconciliation Session' : activeScenario.title}
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {customPo
                    ? 'Reconciliation executed against user-supplied purchase order and supplier invoice JSON payload.'
                    : activeScenario.description}
                </p>
              </div>

              {/* Quick Scenario Pills */}
              <div className="flex flex-wrap lg:flex-col items-start lg:items-end gap-2 shrink-0">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Test Scenarios
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SYNTHETIC_SCENARIOS.slice(0, 3).map((sc) => (
                    <button
                      key={sc.id}
                      onClick={() => handleSelectScenario(sc.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        selectedScenarioId === sc.id && !customPo
                          ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {sc.id === 'clean-match'
                        ? '1. Match'
                        : sc.id === 'pricing-quantity-variance'
                        ? '2. Price/Qty'
                        : '3. Tax/Identity'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Session Alert Note */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Deterministic reconciliation verified. Live review actions saved to local session.</span>
              </div>
              <button
                onClick={() => setCurrentTab('comparison')}
                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                <span>Inspect Line Items Side-by-Side</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tab Content: Dashboard */}
          {currentTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Top Summary Metric Cards */}
              <SummaryCards
                summary={reconciliationResult.summary}
                discrepancies={reconciliationResult.discrepancies}
              />

              {/* Priority Review Action Queue */}
              {criticalExceptions.length > 0 && (
                <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <span>Action Required: {criticalExceptions.length} Critical Discrepancies</span>
                    </div>
                    <button
                      onClick={() => setCurrentTab('exceptions')}
                      className="text-xs font-semibold text-rose-700 hover:text-rose-900 hover:underline flex items-center gap-1"
                    >
                      <span>Open Exception Center</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {criticalExceptions.slice(0, 4).map((disc) => (
                      <div
                        key={disc.id}
                        className="p-3.5 bg-white rounded-lg border border-rose-200/80 shadow-xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-semibold text-slate-900 truncate max-w-[200px]">
                              {disc.field}
                            </span>
                            <span className="font-mono font-bold text-rose-600">
                              {disc.varianceDisplay}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                            {disc.explanation}
                          </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <button
                            onClick={() => setExplanationDiscrepancy(disc)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
                          >
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>Explain with Lens</span>
                          </button>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleReviewDiscrepancy(disc.id, 'DISMISSED')}
                              className="px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 rounded"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={() => handleReviewDiscrepancy(disc.id, 'ACCEPTED', 'Approved by reviewer')}
                              className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-500"
                            >
                              Accept Variance
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Document Comparison Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Direct Document Comparison
                  </h3>
                  <button
                    onClick={() => setCurrentTab('comparison')}
                    className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <span>Full Screen Comparison</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <DocumentComparisonView
                  po={currentPo}
                  invoice={currentInvoice}
                  reconciliationResult={reconciliationResult}
                />
              </div>

              {/* Exception Center Section */}
              <div className="pt-2">
                <ExceptionReport
                  discrepancies={reconciliationResult.discrepancies}
                  onReviewDiscrepancy={handleReviewDiscrepancy}
                  onRequestExplanation={(disc) => setExplanationDiscrepancy(disc)}
                />
              </div>

              {/* Benchmark Scenarios Matrix */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Preset Procurement Scenarios Benchmark
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Select any synthetic scenario to test automated engine matching and conservative error detection.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {SYNTHETIC_SCENARIOS.slice(0, 3).map((sc) => {
                    const isCurrent = sc.id === selectedScenarioId && !customPo;
                    return (
                      <div
                        key={sc.id}
                        onClick={() => handleSelectScenario(sc.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isCurrent
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-500/50'
                            : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCurrent
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : sc.expectedOutcome === 'MATCHED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {sc.expectedOutcome}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold text-emerald-400">ACTIVE</span>
                          )}
                        </div>
                        <h4 className={`text-xs font-bold ${isCurrent ? 'text-white' : 'text-slate-800'}`}>
                          {sc.title}
                        </h4>
                        <p
                          className={`text-[11px] mt-1 line-clamp-2 ${
                            isCurrent ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {sc.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Document Comparison */}
          {currentTab === 'comparison' && (
            <div className="space-y-4">
              <DocumentComparisonView
                po={currentPo}
                invoice={currentInvoice}
                reconciliationResult={reconciliationResult}
              />
            </div>
          )}

          {/* Tab Content: Exception Center */}
          {currentTab === 'exceptions' && (
            <div className="space-y-4">
              <ExceptionReport
                discrepancies={reconciliationResult.discrepancies}
                onReviewDiscrepancy={handleReviewDiscrepancy}
                onRequestExplanation={(disc) => setExplanationDiscrepancy(disc)}
              />
            </div>
          )}

          {/* Tab Content: Tolerance Rules */}
          {currentTab === 'tolerances' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs max-w-3xl space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Deterministic Tolerance Parameters
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ProcureLens AI executes mathematical checks using explicit numerical tolerances.
                </p>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Parameter</th>
                      <th className="py-2.5 px-4">Current Value</th>
                      <th className="py-2.5 px-4">Rule Logic</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        Price Tolerance (Absolute)
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-700 font-bold">
                        ${config.priceToleranceAbsolute.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        Penny rounding on line items below this delta does not trigger an exception.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        Price Tolerance (Percentage)
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-700 font-bold">
                        {config.priceTolerancePercent.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        Allowed percentage increase over authorized PO contracted rate.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800">Quantity Tolerance</td>
                      <td className="py-3 px-4 font-mono text-emerald-700 font-bold">
                        {config.quantityTolerance} units
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        Zero tolerance: any over-billing units are flagged as CRITICAL.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800">Tax Tolerance</td>
                      <td className="py-3 px-4 font-mono text-emerald-700 font-bold">
                        ${config.taxToleranceAbsolute.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        Permissible discrepancy between calculated sales tax and billed tax.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        Total Settlement Tolerance
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-700 font-bold">
                        ${config.totalToleranceAbsolute.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        Threshold before marking grand total as mismatched.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        Require Exact Supplier Tax ID
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-700 font-bold">
                        {config.requireExactSupplierTaxId ? 'TRUE (Active)' : 'FALSE'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        Strict anti-fraud matching: mismatched Tax IDs raise a CRITICAL payment hold.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <button
                onClick={() => setIsTolerancesModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span>Adjust Tolerance Thresholds</span>
              </button>
            </div>
          )}

          {/* Tab Content: Audit History */}
          {currentTab === 'history' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs max-w-4xl space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Reconciliation Session Audit Trail
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chronological record of exception evaluations and reviewer decisions in this session.
                </p>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Discrepancy Field</th>
                      <th className="py-2.5 px-4">Variance</th>
                      <th className="py-2.5 px-4">Review Decision</th>
                      <th className="py-2.5 px-4">Justification Notes</th>
                      <th className="py-2.5 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reconciliationResult.discrepancies.map((disc) => (
                      <tr key={disc.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">
                          {disc.field}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-rose-600">
                          {disc.varianceDisplay}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              disc.reviewStatus === 'ACCEPTED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : disc.reviewStatus === 'DISMISSED'
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {disc.reviewStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 italic">
                          {disc.reviewNotes || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {disc.reviewedAt
                            ? new Date(disc.reviewedAt).toLocaleTimeString()
                            : 'Pending'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-2">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Audit logs reflect in-memory human reviews for the active session.
                </span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {explanationDiscrepancy && (
        <ExplanationModal
          discrepancy={explanationDiscrepancy}
          poNumber={currentPo.poNumber}
          invoiceNumber={currentInvoice.invoiceNumber}
          supplierName={currentPo.supplier.name}
          currency={currentPo.currency}
          onClose={() => setExplanationDiscrepancy(null)}
        />
      )}

      {isTolerancesModalOpen && (
        <ToleranceConfigModal
          currentConfig={config}
          onSave={(newCfg) => setConfig(newCfg)}
          onClose={() => setIsTolerancesModalOpen(false)}
        />
      )}

      {isCustomModalOpen && (
        <CustomComparisonModal
          onRunCustom={handleRunCustom}
          onClose={() => setIsCustomModalOpen(false)}
        />
      )}
    </div>
  );
}
