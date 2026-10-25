import {
  PurchaseOrder,
  SupplierInvoice,
  ReconciliationConfig,
  ReconciliationResult,
  Discrepancy,
  LineItemMatch,
  POLineItem,
  InvoiceLineItem,
} from '@/types/procurement';
import {
  normalizeSupplierName,
  normalizeItemCode,
  stringSimilarity,
} from './similarity';

export const DEFAULT_RECONCILIATION_CONFIG: ReconciliationConfig = {
  priceTolerancePercent: 0.0,
  priceToleranceAbsolute: 0.05,
  quantityTolerance: 0,
  taxToleranceAbsolute: 0.1,
  totalToleranceAbsolute: 0.1,
  requireExactSupplierTaxId: true,
  fuzzyNameSimilarityThreshold: 0.85,
  fuzzyItemSimilarityThreshold: 0.72,
};

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function roundTo2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Deterministic Reconciliation Engine for Purchase Orders and Supplier Invoices.
 * Pure TypeScript, strict calculations, and explicit tolerances.
 */
export function reconcileDocuments(
  po: PurchaseOrder,
  invoice: SupplierInvoice,
  configOverrides?: Partial<ReconciliationConfig>,
  reconciledAt: string = '2026-03-25T12:00:00Z'
): ReconciliationResult {
  const config: ReconciliationConfig = {
    ...DEFAULT_RECONCILIATION_CONFIG,
    ...configOverrides,
  };

  const discrepancies: Discrepancy[] = [];
  const lineItemMatches: LineItemMatch[] = [];

  // 1. Currency Validation
  if (po.currency.toUpperCase() !== invoice.currency.toUpperCase()) {
    discrepancies.push({
      id: `curr-${po.poNumber}-${invoice.invoiceNumber}`,
      category: 'TOTAL_MISMATCH',
      severity: 'CRITICAL',
      field: 'currency',
      poValue: po.currency.toUpperCase(),
      invoiceValue: invoice.currency.toUpperCase(),
      varianceDisplay: `Currency mismatch (${po.currency} vs ${invoice.currency})`,
      explanation: `Invoice is denominated in ${invoice.currency}, whereas authorized Purchase Order is denominated in ${po.currency}. Settlement cannot occur across unhedged currencies without contractual amendment.`,
      evidence: {
        sourceDocument: 'BOTH',
        poExcerpt: `PO Currency: ${po.currency}`,
        invoiceExcerpt: `Invoice Currency: ${invoice.currency}`,
        calculationBreakdown: 'Currency code ISO equality test failed.',
      },
      suggestedAction:
        'Reject invoice or request re-issue in authorized PO currency with agreed exchange rate parity.',
      reviewStatus: 'PENDING',
    });
  }

  // 2. Supplier Identity & Tax ID Verification
  const poTaxId = (po.supplier.taxId || '').trim();
  const invTaxId = (invoice.supplier.taxId || '').trim();

  if (config.requireExactSupplierTaxId && poTaxId !== invTaxId) {
    discrepancies.push({
      id: `taxid-${po.poNumber}-${invoice.invoiceNumber}`,
      category: 'SUPPLIER_MISMATCH',
      severity: 'CRITICAL',
      field: 'supplier.taxId',
      poValue: poTaxId,
      invoiceValue: invTaxId,
      varianceDisplay: `Tax ID mismatch: ${invTaxId || 'MISSING'} vs ${poTaxId}`,
      explanation: `Supplier Tax Identification Number on invoice (${invTaxId || 'NONE'}) does not match the approved PO supplier record (${poTaxId}). High vendor impersonation or erroneous remittance entity risk.`,
      evidence: {
        sourceDocument: 'BOTH',
        poExcerpt: `Approved Tax ID: ${poTaxId} (${po.supplier.name})`,
        invoiceExcerpt: `Invoiced Tax ID: ${invTaxId || 'NONE'} (${invoice.supplier.name})`,
        calculationBreakdown: 'Direct string identity comparison failed.',
      },
      suggestedAction:
        'Place an immediate payment freeze. Cross-check vendor master file and request current W-9 / VAT compliance certificate.',
      reviewStatus: 'PENDING',
    });
  }

  // Supplier Legal Name Match
  const normPoName = normalizeSupplierName(po.supplier.name);
  const normInvName = normalizeSupplierName(invoice.supplier.name);
  const nameSim = stringSimilarity(normPoName, normInvName);

  if (normPoName !== normInvName) {
    if (nameSim < config.fuzzyNameSimilarityThreshold) {
      discrepancies.push({
        id: `supp-name-${po.poNumber}-${invoice.invoiceNumber}`,
        category: 'SUPPLIER_MISMATCH',
        severity: 'CRITICAL',
        field: 'supplier.name',
        poValue: po.supplier.name,
        invoiceValue: invoice.supplier.name,
        varianceDisplay: `Supplier Name Divergence (${Math.round(nameSim * 100)}% match)`,
        explanation: `Invoicing entity '${invoice.supplier.name}' differs significantly from approved PO vendor '${po.supplier.name}'. Match confidence is ${Math.round(nameSim * 100)}%, below conservative threshold of ${Math.round(config.fuzzyNameSimilarityThreshold * 100)}%.`,
        evidence: {
          sourceDocument: 'BOTH',
          poExcerpt: `PO Supplier: "${po.supplier.name}" [Norm: "${normPoName}"]`,
          invoiceExcerpt: `Invoice Supplier: "${invoice.supplier.name}" [Norm: "${normInvName}"]`,
          calculationBreakdown: `Token & Levenshtein similarity = ${(nameSim * 100).toFixed(1)}% (Threshold: ${(config.fuzzyNameSimilarityThreshold * 100).toFixed(0)}%)`,
        },
        suggestedAction:
          'Verify corporate parent/subsidiary relationship or assignment of claims agreement before authorizing payment.',
        reviewStatus: 'PENDING',
      });
    } else {
      discrepancies.push({
        id: `supp-name-note-${po.poNumber}-${invoice.invoiceNumber}`,
        category: 'SUPPLIER_MISMATCH',
        severity: 'INFO',
        field: 'supplier.name',
        poValue: po.supplier.name,
        invoiceValue: invoice.supplier.name,
        varianceDisplay: `Minor legal name variation (${Math.round(nameSim * 100)}% match)`,
        explanation: `Minor legal entity suffix variation detected between '${po.supplier.name}' and '${invoice.supplier.name}'. Meets standard compliance criteria.`,
        evidence: {
          sourceDocument: 'BOTH',
          poExcerpt: po.supplier.name,
          invoiceExcerpt: invoice.supplier.name,
          calculationBreakdown: `Similarity ${(nameSim * 100).toFixed(1)}% meets acceptable threshold.`,
        },
        suggestedAction: 'No action required if corporate registration matches AP master file.',
        reviewStatus: 'PENDING',
      });
    }
  }

  // 3. Line Items Matching & Reconciliation
  const matchedInvoiceLineIds = new Set<string>();
  const matchedPoLineIds = new Set<string>();

  // Pass A: Exact SKU / Item Code match
  for (const poItem of po.lineItems) {
    const poCodeNorm = normalizeItemCode(poItem.itemCode);
    if (!poCodeNorm) continue;

    const exactMatch = invoice.lineItems.find(
      inv => !matchedInvoiceLineIds.has(inv.id) && normalizeItemCode(inv.itemCode) === poCodeNorm
    );

    if (exactMatch) {
      matchedPoLineIds.add(poItem.id);
      matchedInvoiceLineIds.add(exactMatch.id);

      evaluateLineMatch(poItem, exactMatch, 'EXACT_SKU', 1.0, config, po.currency, discrepancies, lineItemMatches);
    }
  }

  // Pass B: Conservative Fuzzy Description Match for remaining items
  for (const poItem of po.lineItems) {
    if (matchedPoLineIds.has(poItem.id)) continue;

    let bestInvoiceMatch: InvoiceLineItem | null = null;
    let highestSim = 0;

    for (const invItem of invoice.lineItems) {
      if (matchedInvoiceLineIds.has(invItem.id)) continue;

      const sim = stringSimilarity(poItem.description, invItem.description);
      if (sim > highestSim && sim >= config.fuzzyItemSimilarityThreshold) {
        highestSim = sim;
        bestInvoiceMatch = invItem;
      }
    }

    if (bestInvoiceMatch && highestSim >= config.fuzzyItemSimilarityThreshold) {
      matchedPoLineIds.add(poItem.id);
      matchedInvoiceLineIds.add(bestInvoiceMatch.id);

      evaluateLineMatch(
        poItem,
        bestInvoiceMatch,
        'FUZZY_DESCRIPTION',
        roundTo2(highestSim),
        config,
        po.currency,
        discrepancies,
        lineItemMatches
      );
    }
  }

  // Pass C: Unmatched PO Items (Items ordered that vendor did not invoice)
  for (const poItem of po.lineItems) {
    if (!matchedPoLineIds.has(poItem.id)) {
      lineItemMatches.push({
        poLine: poItem,
        invoiceLine: undefined,
        matchType: 'UNMATCHED_PO',
        matchConfidence: 0,
        priceDiff: 0,
        quantityDiff: -poItem.quantity,
        subtotalDiff: -poItem.totalPrice,
        hasDiscrepancy: true,
      });

      discrepancies.push({
        id: `unmatched-po-${poItem.id}`,
        category: 'LINE_UNMATCHED',
        severity: 'INFO',
        field: `lineItem[${poItem.itemCode || poItem.id}]`,
        poValue: `${poItem.quantity} x ${formatCurrency(poItem.unitPrice, po.currency)} (${poItem.description})`,
        invoiceValue: 'NOT INVOICED',
        varianceDisplay: `Omitted PO Line (-${formatCurrency(poItem.totalPrice, po.currency)})`,
        varianceAmount: -poItem.totalPrice,
        explanation: `Line item '${poItem.description}' (SKU: ${poItem.itemCode}) for ${poItem.quantity} units (${formatCurrency(poItem.totalPrice, po.currency)}) was ordered on PO but is not present on this invoice.`,
        evidence: {
          sourceDocument: 'PO',
          poExcerpt: `PO Line: ${poItem.itemCode} - ${poItem.description} | Qty: ${poItem.quantity} @ ${formatCurrency(poItem.unitPrice, po.currency)}`,
          invoiceExcerpt: 'Item completely missing from invoice line items.',
          calculationBreakdown: 'PO ordered quantity remained unbilled on this invoice voucher.',
        },
        suggestedAction:
          'Verify if this item is on backorder or will arrive in a subsequent split delivery.',
        reviewStatus: 'PENDING',
      });
    }
  }

  // Pass D: Unmatched Invoice Items (Phantom / unauthorized items billed by supplier)
  for (const invItem of invoice.lineItems) {
    if (!matchedInvoiceLineIds.has(invItem.id)) {
      lineItemMatches.push({
        poLine: undefined,
        invoiceLine: invItem,
        matchType: 'UNMATCHED_INVOICE',
        matchConfidence: 0,
        priceDiff: invItem.unitPrice,
        quantityDiff: invItem.quantity,
        subtotalDiff: invItem.totalPrice,
        hasDiscrepancy: true,
      });

      discrepancies.push({
        id: `unmatched-inv-${invItem.id}`,
        category: 'LINE_UNMATCHED',
        severity: 'CRITICAL',
        field: `lineItem[${invItem.itemCode || invItem.id}]`,
        poValue: 'NOT ON PO',
        invoiceValue: `${invItem.quantity} x ${formatCurrency(invItem.unitPrice, invoice.currency)} (${invItem.description})`,
        varianceDisplay: `Unauthorized Line Item (+${formatCurrency(invItem.totalPrice, invoice.currency)})`,
        varianceAmount: invItem.totalPrice,
        explanation: `Invoice includes unapproved line item '${invItem.description}' (SKU: ${invItem.itemCode || 'N/A'}) totaling ${formatCurrency(invItem.totalPrice, invoice.currency)} which has no corresponding purchase order authorization.`,
        evidence: {
          sourceDocument: 'INVOICE',
          invoiceExcerpt: `Invoice Line: ${invItem.itemCode || 'NO-SKU'} - ${invItem.description} | Qty: ${invItem.quantity} @ ${formatCurrency(invItem.unitPrice, invoice.currency)} = ${formatCurrency(invItem.totalPrice, invoice.currency)}`,
          poExcerpt: 'No matching line item or SKU exists in authorized PO line items table.',
          calculationBreakdown: `Unauthorized addition to invoice subtotal of ${formatCurrency(invItem.totalPrice, invoice.currency)}.`,
        },
        suggestedAction:
          'Dispute unauthorized line item with supplier. Request formal credit memo or PO revision authorization.',
        reviewStatus: 'PENDING',
      });
    }
  }

  // 4. Shipping & Freight Reconciliation
  const shippingDiff = roundTo2(invoice.shippingAmount - po.shippingAmount);
  if (shippingDiff > config.totalToleranceAbsolute) {
    const isUnapprovedFreight = po.shippingAmount === 0;
    discrepancies.push({
      id: `shipping-${po.poNumber}-${invoice.invoiceNumber}`,
      category: 'SHIPPING_UNAUTHORIZED',
      severity: isUnapprovedFreight ? 'WARNING' : 'INFO',
      field: 'shippingAmount',
      poValue: formatCurrency(po.shippingAmount, po.currency),
      invoiceValue: formatCurrency(invoice.shippingAmount, invoice.currency),
      varianceDisplay: `+${formatCurrency(shippingDiff, invoice.currency)} freight variance`,
      varianceAmount: shippingDiff,
      explanation: isUnapprovedFreight
        ? `Invoice includes unapproved freight/handling charges of ${formatCurrency(invoice.shippingAmount, invoice.currency)} when PO terms specified zero freight (FOB Destination).`
        : `Invoice shipping of ${formatCurrency(invoice.shippingAmount, invoice.currency)} exceeds authorized PO shipping of ${formatCurrency(po.shippingAmount, po.currency)} by ${formatCurrency(shippingDiff, invoice.currency)}.`,
      evidence: {
        sourceDocument: 'BOTH',
        poExcerpt: `PO Shipping: ${formatCurrency(po.shippingAmount, po.currency)}`,
        invoiceExcerpt: `Invoice Shipping: ${formatCurrency(invoice.shippingAmount, invoice.currency)}`,
        calculationBreakdown: `${formatCurrency(invoice.shippingAmount, invoice.currency)} - ${formatCurrency(po.shippingAmount, po.currency)} = +${formatCurrency(shippingDiff, invoice.currency)}`,
      },
      suggestedAction: isUnapprovedFreight
        ? 'Request removal of freight surcharge per agreed contractual Incoterms.'
        : 'Request freight bill of lading verification from supplier.',
      reviewStatus: 'PENDING',
    });
  }

  // 5. Tax Calculations & Variances
  const taxDiff = roundTo2(invoice.taxAmount - po.taxAmount);
  if (Math.abs(taxDiff) > config.taxToleranceAbsolute) {
    const isOverchargedTax = taxDiff > 0;
    discrepancies.push({
      id: `tax-${po.poNumber}-${invoice.invoiceNumber}`,
      category: 'TAX_VARIANCE',
      severity: isOverchargedTax ? 'WARNING' : 'INFO',
      field: 'taxAmount',
      poValue: formatCurrency(po.taxAmount, po.currency),
      invoiceValue: formatCurrency(invoice.taxAmount, invoice.currency),
      varianceDisplay: `${taxDiff > 0 ? '+' : ''}${formatCurrency(taxDiff, invoice.currency)} tax variance`,
      varianceAmount: taxDiff,
      explanation: `Tax amount on invoice (${formatCurrency(invoice.taxAmount, invoice.currency)}) diverges from authorized PO tax (${formatCurrency(po.taxAmount, po.currency)}) by ${formatCurrency(taxDiff, invoice.currency)}. Exceeds tolerance of ${formatCurrency(config.taxToleranceAbsolute, invoice.currency)}.`,
      evidence: {
        sourceDocument: 'BOTH',
        poExcerpt: `PO Calculated Tax: ${formatCurrency(po.taxAmount, po.currency)}`,
        invoiceExcerpt: `Invoice Billed Tax: ${formatCurrency(invoice.taxAmount, invoice.currency)}`,
        calculationBreakdown: `${formatCurrency(invoice.taxAmount, invoice.currency)} - ${formatCurrency(po.taxAmount, po.currency)} = ${formatCurrency(taxDiff, invoice.currency)} (Tolerance: ${formatCurrency(config.taxToleranceAbsolute, invoice.currency)})`,
      },
      suggestedAction:
        'Verify applicable jurisdiction sales tax exemptions or revised nexus tax calculation.',
      reviewStatus: 'PENDING',
    });
  }

  // 6. Subtotal & Grand Total Verification
  const subtotalDiff = roundTo2(invoice.subtotal - po.subtotal);
  const grandTotalDiff = roundTo2(invoice.totalAmount - po.totalAmount);

  if (Math.abs(grandTotalDiff) > config.totalToleranceAbsolute) {
    const isCriticalTotal = Math.abs(grandTotalDiff) > 25.0;
    discrepancies.push({
      id: `total-${po.poNumber}-${invoice.invoiceNumber}`,
      category: 'TOTAL_MISMATCH',
      severity: isCriticalTotal ? 'CRITICAL' : 'WARNING',
      field: 'totalAmount',
      poValue: formatCurrency(po.totalAmount, po.currency),
      invoiceValue: formatCurrency(invoice.totalAmount, invoice.currency),
      varianceDisplay: `${grandTotalDiff > 0 ? '+' : ''}${formatCurrency(grandTotalDiff, invoice.currency)} total variance`,
      varianceAmount: grandTotalDiff,
      explanation: `Invoice total of ${formatCurrency(invoice.totalAmount, invoice.currency)} differs from authorized PO total of ${formatCurrency(po.totalAmount, po.currency)} by ${formatCurrency(grandTotalDiff, invoice.currency)}. Exceeds strict absolute tolerance of ${formatCurrency(config.totalToleranceAbsolute, invoice.currency)}.`,
      evidence: {
        sourceDocument: 'BOTH',
        poExcerpt: `PO Total: ${formatCurrency(po.totalAmount, po.currency)} (Subtotal: ${formatCurrency(po.subtotal, po.currency)}, Tax: ${formatCurrency(po.taxAmount, po.currency)}, Ship: ${formatCurrency(po.shippingAmount, po.currency)})`,
        invoiceExcerpt: `Invoice Total: ${formatCurrency(invoice.totalAmount, invoice.currency)} (Subtotal: ${formatCurrency(invoice.subtotal, invoice.currency)}, Tax: ${formatCurrency(invoice.taxAmount, invoice.currency)}, Ship: ${formatCurrency(invoice.shippingAmount, invoice.currency)})`,
        calculationBreakdown: `${formatCurrency(invoice.totalAmount, invoice.currency)} - ${formatCurrency(po.totalAmount, po.currency)} = ${formatCurrency(grandTotalDiff, invoice.currency)} [Subtotal diff: ${formatCurrency(subtotalDiff, invoice.currency)}]`,
      },
      suggestedAction:
        'Withhold invoice settlement. Reconciliation must balance before passing to Accounts Payable ERP.',
      reviewStatus: 'PENDING',
    });
  }

  // 7. Calculate Reconciliation Metrics & Status
  const criticalCount = discrepancies.filter(d => d.severity === 'CRITICAL').length;
  const warningCount = discrepancies.filter(d => d.severity === 'WARNING').length;
  const infoCount = discrepancies.filter(d => d.severity === 'INFO').length;

  let overallStatus: 'MATCHED' | 'WARNINGS' | 'CRITICAL_DISCREPANCIES' = 'MATCHED';
  if (criticalCount > 0) {
    overallStatus = 'CRITICAL_DISCREPANCIES';
  } else if (warningCount > 0) {
    overallStatus = 'WARNINGS';
  }

  // Score calculation: 100 base, deductions for discrepancies
  let score = 100;
  score -= criticalCount * 30;
  score -= warningCount * 12;
  score -= infoCount * 2;
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    id: `rec-${po.poNumber}-${invoice.invoiceNumber}`,
    poNumber: po.poNumber,
    invoiceNumber: invoice.invoiceNumber,
    reconciledAt,
    summary: {
      overallStatus,
      reconciliationScore: score,
      totalDiscrepancies: discrepancies.length,
      criticalCount,
      warningCount,
      infoCount,
      poTotal: po.totalAmount,
      invoiceTotal: invoice.totalAmount,
      totalVariance: grandTotalDiff,
      currency: po.currency,
    },
    lineItemMatches,
    discrepancies,
    config,
  };
}

/**
 * Evaluates paired line items for quantity, unit price, and calculation integrity.
 */
function evaluateLineMatch(
  poItem: POLineItem,
  invItem: InvoiceLineItem,
  matchType: LineItemMatch['matchType'],
  matchConfidence: number,
  config: ReconciliationConfig,
  currency: string,
  discrepancies: Discrepancy[],
  lineItemMatches: LineItemMatch[]
): void {
  let hasDiscrepancy = false;

  const qtyDiff = invItem.quantity - poItem.quantity;
  const priceDiff = roundTo2(invItem.unitPrice - poItem.unitPrice);
  const subtotalDiff = roundTo2(invItem.totalPrice - poItem.totalPrice);

  // A. Check Fuzzy match warning
  if (matchType === 'FUZZY_DESCRIPTION' && matchConfidence < 0.9) {
    hasDiscrepancy = true;
    discrepancies.push({
      id: `match-confidence-${poItem.id}-${invItem.id}`,
      category: 'LINE_UNMATCHED',
      severity: 'WARNING',
      field: `lineItem[${poItem.itemCode || poItem.id}].match`,
      poValue: `${poItem.itemCode} - ${poItem.description}`,
      invoiceValue: `${invItem.itemCode || 'NO-SKU'} - ${invItem.description}`,
      varianceDisplay: `Fuzzy line match (${Math.round(matchConfidence * 100)}% match)`,
      explanation: `Line item matched based on text similarity of ${Math.round(matchConfidence * 100)}% rather than explicit SKU. Conservative review required to verify product equivalency.`,
      evidence: {
        sourceDocument: 'BOTH',
        poExcerpt: `PO: "${poItem.description}" (SKU: ${poItem.itemCode})`,
        invoiceExcerpt: `Invoice: "${invItem.description}" (SKU: ${invItem.itemCode || 'NONE'})`,
        calculationBreakdown: `Fuzzy similarity metric: ${(matchConfidence * 100).toFixed(1)}%`,
      },
      suggestedAction:
        'Verify line item specifications to ensure correct item substitution was fulfilled.',
      reviewStatus: 'PENDING',
    });
  }

  // B. Quantity Discrepancy Check
  if (qtyDiff > config.quantityTolerance) {
    hasDiscrepancy = true;
    const overbillAmount = roundTo2(qtyDiff * invItem.unitPrice);
    discrepancies.push({
      id: `qty-over-${poItem.id}-${invItem.id}`,
      category: 'LINE_QUANTITY',
      severity: 'CRITICAL',
      field: `lineItem[${poItem.itemCode}].quantity`,
      poValue: `${poItem.quantity} ${poItem.unitOfMeasure}`,
      invoiceValue: `${invItem.quantity} ${invItem.unitOfMeasure}`,
      varianceDisplay: `+${qtyDiff} ${invItem.unitOfMeasure} (+${formatCurrency(overbillAmount, currency)})`,
      varianceAmount: overbillAmount,
      explanation: `Quantity over-billing: Invoiced quantity of ${invItem.quantity} exceeds authorized PO quantity of ${poItem.quantity} by ${qtyDiff} units (exposure: ${formatCurrency(overbillAmount, currency)}).`,
      evidence: {
        sourceDocument: 'BOTH',
        poLineNumber: 1,
        poExcerpt: `Approved Quantity: ${poItem.quantity} ${poItem.unitOfMeasure}`,
        invoiceExcerpt: `Billed Quantity: ${invItem.quantity} ${invItem.unitOfMeasure}`,
        calculationBreakdown: `(${invItem.quantity} - ${poItem.quantity}) * ${formatCurrency(invItem.unitPrice, currency)} = +${formatCurrency(overbillAmount, currency)}`,
      },
      suggestedAction:
        'Withhold payment on excess units. Confirm receiving dock logs for actual physical quantity delivered.',
      reviewStatus: 'PENDING',
    });
  } else if (qtyDiff < -config.quantityTolerance) {
    hasDiscrepancy = true;
    const unfulfilledAmount = roundTo2(Math.abs(qtyDiff) * poItem.unitPrice);
    discrepancies.push({
      id: `qty-under-${poItem.id}-${invItem.id}`,
      category: 'LINE_QUANTITY',
      severity: 'INFO',
      field: `lineItem[${poItem.itemCode}].quantity`,
      poValue: `${poItem.quantity} ${poItem.unitOfMeasure}`,
      invoiceValue: `${invItem.quantity} ${invItem.unitOfMeasure}`,
      varianceDisplay: `${qtyDiff} ${invItem.unitOfMeasure} (Partial fulfillment)`,
      varianceAmount: -unfulfilledAmount,
      explanation: `Partial shipment: Invoiced quantity (${invItem.quantity}) is less than PO ordered quantity (${poItem.quantity}). Unbilled balance: ${Math.abs(qtyDiff)} units (${formatCurrency(unfulfilledAmount, currency)}).`,
      evidence: {
        sourceDocument: 'BOTH',
        poExcerpt: `PO Ordered: ${poItem.quantity} ${poItem.unitOfMeasure}`,
        invoiceExcerpt: `Invoiced: ${invItem.quantity} ${invItem.unitOfMeasure}`,
        calculationBreakdown: `Remaining unfulfilled PO balance: ${Math.abs(qtyDiff)} ${poItem.unitOfMeasure} @ ${formatCurrency(poItem.unitPrice, currency)}`,
      },
      suggestedAction:
        'Approve partial invoice if receiving records match. Ensure open PO balance remains active in ERP.',
      reviewStatus: 'PENDING',
    });
  }

  // C. Unit Price Discrepancy Check
  const pricePctDiff = poItem.unitPrice > 0 ? (priceDiff / poItem.unitPrice) * 100 : 0;
  const isPriceInflated =
    priceDiff > config.priceToleranceAbsolute && pricePctDiff > config.priceTolerancePercent;

  if (isPriceInflated) {
    hasDiscrepancy = true;
    const totalLinePriceImpact = roundTo2(priceDiff * invItem.quantity);
    discrepancies.push({
      id: `price-high-${poItem.id}-${invItem.id}`,
      category: 'LINE_UNIT_PRICE',
      severity: 'CRITICAL',
      field: `lineItem[${poItem.itemCode}].unitPrice`,
      poValue: formatCurrency(poItem.unitPrice, currency),
      invoiceValue: formatCurrency(invItem.unitPrice, currency),
      varianceDisplay: `+${formatCurrency(priceDiff, currency)}/unit (+${pricePctDiff.toFixed(1)}%)`,
      varianceAmount: totalLinePriceImpact,
      explanation: `Unauthorized price increase: Invoiced unit price of ${formatCurrency(invItem.unitPrice, currency)} exceeds contracted PO price of ${formatCurrency(poItem.unitPrice, currency)} by ${formatCurrency(priceDiff, currency)} (+${pricePctDiff.toFixed(1)}%). Line price exposure: ${formatCurrency(totalLinePriceImpact, currency)}.`,
      evidence: {
        sourceDocument: 'BOTH',
        poExcerpt: `Contracted Unit Price: ${formatCurrency(poItem.unitPrice, currency)} (Line Item: ${poItem.itemCode})`,
        invoiceExcerpt: `Invoiced Unit Price: ${formatCurrency(invItem.unitPrice, currency)}`,
        calculationBreakdown: `(${formatCurrency(invItem.unitPrice, currency)} - ${formatCurrency(poItem.unitPrice, currency)}) * ${invItem.quantity} units = +${formatCurrency(totalLinePriceImpact, currency)}`,
      },
      suggestedAction:
        'Reject unauthorized price hike. Demand credit memo or revised invoice at approved contracted PO price.',
      reviewStatus: 'PENDING',
    });
  } else if (priceDiff < -config.priceToleranceAbsolute) {
    hasDiscrepancy = true;
    discrepancies.push({
      id: `price-low-${poItem.id}-${invItem.id}`,
      category: 'LINE_UNIT_PRICE',
      severity: 'INFO',
      field: `lineItem[${poItem.itemCode}].unitPrice`,
      poValue: formatCurrency(poItem.unitPrice, currency),
      invoiceValue: formatCurrency(invItem.unitPrice, currency),
      varianceDisplay: `${formatCurrency(priceDiff, currency)}/unit (Favorable discount)`,
      varianceAmount: roundTo2(priceDiff * invItem.quantity),
      explanation: `Favorable unit price: Supplier invoiced at ${formatCurrency(invItem.unitPrice, currency)} vs contracted ${formatCurrency(poItem.unitPrice, currency)} (savings: ${formatCurrency(Math.abs(priceDiff * invItem.quantity), currency)}).`,
      evidence: {
        sourceDocument: 'BOTH',
        poExcerpt: `PO Unit Price: ${formatCurrency(poItem.unitPrice, currency)}`,
        invoiceExcerpt: `Invoice Unit Price: ${formatCurrency(invItem.unitPrice, currency)}`,
        calculationBreakdown: `Supplier applied a discount of ${formatCurrency(Math.abs(priceDiff), currency)} per unit.`,
      },
      suggestedAction:
        'Accept favorable price variance and record vendor discount in procurement analytics.',
      reviewStatus: 'PENDING',
    });
  }

  // D. Math Integrity Check on Invoiced Line Total
  const calculatedLineTotal = roundTo2(invItem.quantity * invItem.unitPrice);
  if (Math.abs(calculatedLineTotal - invItem.totalPrice) > 0.05) {
    hasDiscrepancy = true;
    discrepancies.push({
      id: `line-math-${invItem.id}`,
      category: 'TOTAL_MISMATCH',
      severity: 'WARNING',
      field: `lineItem[${invItem.itemCode || invItem.id}].totalPrice`,
      poValue: 'N/A',
      invoiceValue: formatCurrency(invItem.totalPrice, currency),
      varianceDisplay: `Invoice math error (${formatCurrency(invItem.totalPrice - calculatedLineTotal, currency)})`,
      varianceAmount: roundTo2(invItem.totalPrice - calculatedLineTotal),
      explanation: `Invoice internal line computation error: ${invItem.quantity} units @ ${formatCurrency(invItem.unitPrice, currency)} computes to ${formatCurrency(calculatedLineTotal, currency)}, but is stated on the invoice as ${formatCurrency(invItem.totalPrice, currency)}.`,
      evidence: {
        sourceDocument: 'INVOICE',
        invoiceExcerpt: `Invoice stated total: ${formatCurrency(invItem.totalPrice, currency)}`,
        calculationBreakdown: `${invItem.quantity} * ${formatCurrency(invItem.unitPrice, currency)} = ${formatCurrency(calculatedLineTotal, currency)} != ${formatCurrency(invItem.totalPrice, currency)}`,
      },
      suggestedAction: 'Request corrected invoice voucher with verified mathematical extensions.',
      reviewStatus: 'PENDING',
    });
  }

  lineItemMatches.push({
    poLine: poItem,
    invoiceLine: invItem,
    matchType,
    matchConfidence,
    priceDiff,
    quantityDiff: qtyDiff,
    subtotalDiff,
    hasDiscrepancy,
  });
}
