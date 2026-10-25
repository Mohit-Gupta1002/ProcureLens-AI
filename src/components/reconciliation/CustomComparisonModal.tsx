'use client';

import React, { useState } from 'react';
import { X, UploadCloud, Check, AlertCircle } from 'lucide-react';
import { PurchaseOrder, SupplierInvoice } from '@/types/procurement';
import { SYNTHETIC_SCENARIOS } from '@/data/scenarios';

interface CustomComparisonModalProps {
  onRunCustom: (po: PurchaseOrder, invoice: SupplierInvoice) => void;
  onClose: () => void;
}

export function CustomComparisonModal({
  onRunCustom,
  onClose,
}: CustomComparisonModalProps) {
  const sample = SYNTHETIC_SCENARIOS[1]; // Rate inflation scenario as default template

  const [poJson, setPoJson] = useState<string>(JSON.stringify(sample.po, null, 2));
  const [invoiceJson, setInvoiceJson] = useState<string>(
    JSON.stringify(sample.invoice, null, 2)
  );
  const [activeTab, setActiveTab] = useState<'po' | 'invoice'>('po');
  const [parseError, setParseError] = useState<string | null>(null);

  const handleValidateAndRun = () => {
    try {
      setParseError(null);
      const parsedPo = JSON.parse(poJson) as PurchaseOrder;
      const parsedInvoice = JSON.parse(invoiceJson) as SupplierInvoice;

      if (!parsedPo.poNumber || !Array.isArray(parsedPo.lineItems)) {
        throw new Error('Purchase Order must contain a poNumber and lineItems array.');
      }
      if (!parsedInvoice.invoiceNumber || !Array.isArray(parsedInvoice.lineItems)) {
        throw new Error('Supplier Invoice must contain an invoiceNumber and lineItems array.');
      }

      onRunCustom(parsedPo, parsedInvoice);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setParseError(`JSON validation failed: ${err.message}`);
      } else {
        setParseError('Failed to parse document JSON.');
      }
    }
  };

  const handleLoadCleanSample = () => {
    const cleanSample = SYNTHETIC_SCENARIOS[0];
    setPoJson(JSON.stringify(cleanSample.po, null, 2));
    setInvoiceJson(JSON.stringify(cleanSample.invoice, null, 2));
    setParseError(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Custom Document Comparison Input
              </h3>
              <p className="text-xs text-slate-400">
                Input or paste raw PO & Invoice JSON schemas to execute live reconciliation
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

        {/* Tab Selector */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium">
            <button
              onClick={() => setActiveTab('po')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === 'po'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Purchase Order Schema
            </button>
            <button
              onClick={() => setActiveTab('invoice')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === 'invoice'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Supplier Invoice Schema
            </button>
          </div>

          <button
            onClick={handleLoadCleanSample}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            Reset to Clean Template
          </button>
        </div>

        {/* Editor Area */}
        <div className="p-6 flex-1 flex flex-col overflow-hidden">
          {parseError && (
            <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          <div className="flex-1 flex flex-col">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>{activeTab === 'po' ? 'Purchase Order JSON Payload' : 'Supplier Invoice JSON Payload'}</span>
              <span className="text-slate-400 font-mono text-[11px]">JSON schema standard</span>
            </label>
            <textarea
              value={activeTab === 'po' ? poJson : invoiceJson}
              onChange={(e) => {
                if (activeTab === 'po') setPoJson(e.target.value);
                else setInvoiceJson(e.target.value);
              }}
              rows={14}
              className="w-full flex-1 p-3 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none shadow-inner"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Engine will deterministically analyze custom payload.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleValidateAndRun}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 shadow-xs transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Validate & Run Reconciliation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
