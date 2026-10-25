'use client';

import React, { useState } from 'react';
import {
  FileText,
  Receipt,
  Building,
  CreditCard,
  Split,
  Calendar,
} from 'lucide-react';
import { PurchaseOrder, SupplierInvoice, ReconciliationResult } from '@/types/procurement';

interface DocumentComparisonViewProps {
  po: PurchaseOrder;
  invoice: SupplierInvoice;
  reconciliationResult: ReconciliationResult;
}

export function DocumentComparisonView({
  po,
  invoice,
  reconciliationResult,
}: DocumentComparisonViewProps) {
  const [activeTab, setActiveTab] = useState<'side-by-side' | 'po' | 'invoice'>('side-by-side');

  const formatCurrency = (val: number, cur: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
    }).format(val);
  };

  const isFieldDiscrepant = (fieldName: string) => {
    return reconciliationResult.discrepancies.some(
      (d) => d.field.toLowerCase().includes(fieldName.toLowerCase())
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* View Switcher Header */}
      <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Split className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">
            Side-by-Side Document Inspection
          </h3>
          <span className="text-xs text-slate-400">
            ({po.lineItems.length} PO lines vs {invoice.lineItems.length} Invoice lines)
          </span>
        </div>

        {/* View Mode Buttons */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium">
          <button
            onClick={() => setActiveTab('side-by-side')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'side-by-side'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Side-by-Side
          </button>
          <button
            onClick={() => setActiveTab('po')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'po'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            PO View
          </button>
          <button
            onClick={() => setActiveTab('invoice')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'invoice'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Invoice View
          </button>
        </div>
      </div>

      {/* Main Document Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-x-auto">
        {/* Left: Purchase Order Document */}
        {(activeTab === 'side-by-side' || activeTab === 'po') && (
          <div className="p-6 bg-white flex flex-col">
            {/* Document Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                    <FileText className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                    Authorized Purchase Order
                  </span>
                </div>
                <h4 className="text-lg font-bold text-slate-900 mt-1">{po.poNumber}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Issued Date: {po.poDate}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {po.status}
                </span>
                <p className="text-xs text-slate-400 mt-1">Terms: {po.paymentTerms}</p>
              </div>
            </div>

            {/* Vendor & Buyer Meta */}
            <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-100 text-xs">
              <div
                className={`p-2.5 rounded-lg border transition-colors ${
                  isFieldDiscrepant('supplier')
                    ? 'bg-rose-50/50 border-rose-200'
                    : 'bg-slate-50/70 border-slate-200/70'
                }`}
              >
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  <span>Approved Vendor</span>
                </div>
                <div className="font-semibold text-slate-800">{po.supplier.name}</div>
                <div className="text-slate-500 font-mono mt-0.5">
                  Tax ID: {po.supplier.taxId}
                </div>
                <div className="text-slate-400 text-[11px] mt-1 truncate">
                  {po.supplier.address}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-200/70">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Authorized Buyer
                </div>
                <div className="font-semibold text-slate-800">{po.buyer.name}</div>
                <div className="text-slate-500">{po.buyer.department}</div>
                <div className="text-slate-400 text-[11px] mt-1 truncate">
                  {po.buyer.contactEmail}
                </div>
              </div>
            </div>

            {/* PO Line Items Table */}
            <div className="py-4 flex-1">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Authorized Line Items
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 font-semibold">SKU / Item</th>
                      <th className="py-2 px-2 font-semibold text-center">Qty</th>
                      <th className="py-2 px-3 font-semibold text-right">Unit Price</th>
                      <th className="py-2 px-3 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {po.lineItems.map((item) => {
                      const hasPriceDiscrepancy = reconciliationResult.discrepancies.some(
                        (d) =>
                          d.category === 'LINE_UNIT_PRICE' &&
                          d.field.includes(item.itemCode)
                      );
                      const hasQtyDiscrepancy = reconciliationResult.discrepancies.some(
                        (d) =>
                          d.category === 'LINE_QUANTITY' &&
                          d.field.includes(item.itemCode)
                      );

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            hasPriceDiscrepancy || hasQtyDiscrepancy
                              ? 'bg-rose-50/30 font-medium'
                              : ''
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-semibold text-slate-800 text-[11px]">
                              {item.itemCode}
                            </span>
                            <div className="text-slate-500 text-[11px] truncate max-w-[200px]">
                              {item.description}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center text-slate-700 font-mono">
                            {item.quantity} {item.unitOfMeasure}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700 font-mono">
                            {formatCurrency(item.unitPrice, po.currency)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-900 font-mono">
                            {formatCurrency(item.totalPrice, po.currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PO Financial Totals */}
            <div className="pt-3 border-t border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-mono">{formatCurrency(po.subtotal, po.currency)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Sales Tax:</span>
                <span className="font-mono">{formatCurrency(po.taxAmount, po.currency)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Shipping / Freight:</span>
                <span className="font-mono">{formatCurrency(po.shippingAmount, po.currency)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-100">
                <span>Authorized Total:</span>
                <span className="font-mono text-emerald-800">
                  {formatCurrency(po.totalAmount, po.currency)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Right: Supplier Invoice Document */}
        {(activeTab === 'side-by-side' || activeTab === 'invoice') && (
          <div className="p-6 bg-white flex flex-col">
            {/* Document Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                    <Receipt className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                    Supplier Invoice Billed
                  </span>
                </div>
                <h4 className="text-lg font-bold text-slate-900 mt-1">
                  {invoice.invoiceNumber}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Date: {invoice.invoiceDate} (Due: {invoice.paymentDueDate})</span>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  Ref: {invoice.poReference}
                </span>
                <p className="text-xs text-slate-400 mt-1">Terms: {invoice.paymentTerms}</p>
              </div>
            </div>

            {/* Invoiced Vendor & Remit Meta */}
            <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-100 text-xs">
              <div
                className={`p-2.5 rounded-lg border transition-colors ${
                  isFieldDiscrepant('supplier.taxId') || isFieldDiscrepant('supplier.name')
                    ? 'bg-rose-50 border-rose-300'
                    : 'bg-slate-50/70 border-slate-200/70'
                }`}
              >
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    <span>Invoiced Entity</span>
                  </span>
                  {isFieldDiscrepant('supplier.taxId') && (
                    <span className="text-[10px] text-rose-600 font-bold">Tax ID Flag</span>
                  )}
                </div>
                <div className="font-semibold text-slate-800">{invoice.supplier.name}</div>
                <div
                  className={`font-mono mt-0.5 ${
                    isFieldDiscrepant('supplier.taxId') ? 'text-rose-700 font-bold' : 'text-slate-500'
                  }`}
                >
                  Tax ID: {invoice.supplier.taxId}
                </div>
                <div className="text-slate-400 text-[11px] mt-1 truncate">
                  {invoice.supplier.address}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50/70 border border-slate-200/70">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <CreditCard className="w-3 h-3" />
                  <span>Remit Instructions</span>
                </div>
                <div className="font-medium text-slate-800">
                  {invoice.supplier.remitToAccount || 'Standard Wire / ACH'}
                </div>
                <div className="text-slate-500 text-[11px] mt-1">
                  {invoice.notes || 'Automated OCR extraction verified'}
                </div>
              </div>
            </div>

            {/* Invoice Line Items Table */}
            <div className="py-4 flex-1">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Invoiced Line Items
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Billed Item / SKU</th>
                      <th className="py-2 px-2 font-semibold text-center">Qty</th>
                      <th className="py-2 px-3 font-semibold text-right">Unit Price</th>
                      <th className="py-2 px-3 font-semibold text-right">Billed Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.lineItems.map((invItem) => {
                      const isUnmatched = reconciliationResult.discrepancies.some(
                        (d) =>
                          d.category === 'LINE_UNMATCHED' &&
                          d.invoiceValue &&
                          d.invoiceValue.toString().includes(invItem.description)
                      );
                      const priceDisc = reconciliationResult.discrepancies.find(
                        (d) =>
                          d.category === 'LINE_UNIT_PRICE' &&
                          d.field.includes(invItem.itemCode || '')
                      );
                      const qtyDisc = reconciliationResult.discrepancies.find(
                        (d) =>
                          d.category === 'LINE_QUANTITY' &&
                          d.field.includes(invItem.itemCode || '')
                      );

                      return (
                        <tr
                          key={invItem.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isUnmatched
                              ? 'bg-rose-100/60 font-semibold'
                              : priceDisc || qtyDisc
                              ? 'bg-amber-50/70'
                              : ''
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-semibold text-slate-800 text-[11px]">
                                {invItem.itemCode || 'NO-SKU'}
                              </span>
                              {isUnmatched && (
                                <span className="px-1.5 py-0.2 bg-rose-200 text-rose-800 rounded text-[9px] font-bold">
                                  UNAUTHORIZED
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 text-[11px] truncate max-w-[200px]">
                              {invItem.description}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-slate-800">
                            <span className={qtyDisc ? 'text-rose-700 font-bold' : ''}>
                              {invItem.quantity} {invItem.unitOfMeasure}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                            <span className={priceDisc ? 'text-rose-700 font-bold' : ''}>
                              {formatCurrency(invItem.unitPrice, invoice.currency)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-900 font-mono">
                            {formatCurrency(invItem.totalPrice, invoice.currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invoice Financial Totals */}
            <div className="pt-3 border-t border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-mono">
                  {formatCurrency(invoice.subtotal, invoice.currency)}
                </span>
              </div>
              <div
                className={`flex justify-between ${
                  isFieldDiscrepant('taxAmount')
                    ? 'text-rose-600 font-semibold'
                    : 'text-slate-500'
                }`}
              >
                <span>Invoiced Tax:</span>
                <span className="font-mono">
                  {formatCurrency(invoice.taxAmount, invoice.currency)}
                </span>
              </div>
              <div
                className={`flex justify-between ${
                  isFieldDiscrepant('shippingAmount')
                    ? 'text-rose-600 font-semibold'
                    : 'text-slate-500'
                }`}
              >
                <span>Invoiced Shipping:</span>
                <span className="font-mono">
                  {formatCurrency(invoice.shippingAmount, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-100">
                <span>Invoiced Total:</span>
                <span
                  className={`font-mono ${
                    isFieldDiscrepant('totalAmount')
                      ? 'text-rose-600'
                      : 'text-emerald-800'
                  }`}
                >
                  {formatCurrency(invoice.totalAmount, invoice.currency)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
