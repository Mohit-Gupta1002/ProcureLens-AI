'use client';

import React, { useState } from 'react';
import { X, Sliders, RotateCcw, Check } from 'lucide-react';
import { ReconciliationConfig } from '@/types/procurement';
import { DEFAULT_RECONCILIATION_CONFIG } from '@/lib/reconciliation/engine';

interface ToleranceConfigModalProps {
  currentConfig: ReconciliationConfig;
  onSave: (config: ReconciliationConfig) => void;
  onClose: () => void;
}

export function ToleranceConfigModal({
  currentConfig,
  onSave,
  onClose,
}: ToleranceConfigModalProps) {
  const [config, setConfig] = useState<ReconciliationConfig>({ ...currentConfig });

  const handleResetToDefaults = () => {
    setConfig({ ...DEFAULT_RECONCILIATION_CONFIG });
  };

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Reconciliation Tolerance Rules</h3>
              <p className="text-xs text-slate-400">
                Configure explicit mathematical thresholds for automated exception triggers
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

        {/* Body */}
        <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          {/* Unit Price Absolute Tolerance */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-800">
                Unit Price Absolute Tolerance ($)
              </label>
              <span className="font-mono text-emerald-700 font-bold">
                ${config.priceToleranceAbsolute.toFixed(2)}
              </span>
            </div>
            <p className="text-slate-500 text-[11px]">
              Small differences under this threshold (e.g. penny rounding) will not trigger an unauthorized price inflation flag.
            </p>
            <input
              type="range"
              min="0.00"
              max="1.00"
              step="0.01"
              value={config.priceToleranceAbsolute}
              onChange={(e) =>
                setConfig({ ...config, priceToleranceAbsolute: parseFloat(e.target.value) })
              }
              className="w-full accent-emerald-600"
            />
          </div>

          {/* Unit Price Percentage Tolerance */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-800">
                Unit Price Percentage Tolerance (%)
              </label>
              <span className="font-mono text-emerald-700 font-bold">
                {config.priceTolerancePercent.toFixed(1)}%
              </span>
            </div>
            <p className="text-slate-500 text-[11px]">
              Maximum allowable rate increase before raising a CRITICAL contractual violation.
            </p>
            <input
              type="range"
              min="0.0"
              max="10.0"
              step="0.5"
              value={config.priceTolerancePercent}
              onChange={(e) =>
                setConfig({ ...config, priceTolerancePercent: parseFloat(e.target.value) })
              }
              className="w-full accent-emerald-600"
            />
          </div>

          {/* Tax Amount Tolerance */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-800">Tax Tolerance ($)</label>
              <span className="font-mono text-emerald-700 font-bold">
                ${config.taxToleranceAbsolute.toFixed(2)}
              </span>
            </div>
            <p className="text-slate-500 text-[11px]">
              Maximum rounding variance between calculated tax and invoiced sales/use tax.
            </p>
            <input
              type="range"
              min="0.00"
              max="2.00"
              step="0.05"
              value={config.taxToleranceAbsolute}
              onChange={(e) =>
                setConfig({ ...config, taxToleranceAbsolute: parseFloat(e.target.value) })
              }
              className="w-full accent-emerald-600"
            />
          </div>

          {/* Total Settlement Tolerance */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-800">Total Settlement Tolerance ($)</label>
              <span className="font-mono text-emerald-700 font-bold">
                ${config.totalToleranceAbsolute.toFixed(2)}
              </span>
            </div>
            <p className="text-slate-500 text-[11px]">
              Grand total variance threshold before marking overall settlement as mismatched.
            </p>
            <input
              type="range"
              min="0.00"
              max="5.00"
              step="0.10"
              value={config.totalToleranceAbsolute}
              onChange={(e) =>
                setConfig({ ...config, totalToleranceAbsolute: parseFloat(e.target.value) })
              }
              className="w-full accent-emerald-600"
            />
          </div>

          {/* Supplier Tax ID Strict Matching */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-800">
                Require Exact Supplier Tax ID
              </span>
              <p className="text-slate-500 text-[11px]">
                Treat any Tax Identification divergence as CRITICAL fraud risk.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.requireExactSupplierTaxId}
                onChange={(e) =>
                  setConfig({ ...config, requireExactSupplierTaxId: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={handleResetToDefaults}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 shadow-xs transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply & Reconcile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
