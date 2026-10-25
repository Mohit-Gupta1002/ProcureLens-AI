import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileDocuments } from '../engine';
import { PurchaseOrder, SupplierInvoice } from '@/types/procurement';
import { normalizeSupplierName, stringSimilarity } from '../similarity';

const basePO: PurchaseOrder = {
  poNumber: 'PO-2026-8801',
  poDate: '2026-03-10',
  currency: 'USD',
  supplier: {
    id: 'SUP-401',
    name: 'Precision Systems Inc.',
    taxId: 'US-94-3829101',
    address: '100 Silicon Blvd, San Jose, CA 95134',
    paymentTerms: 'Net 30',
  },
  buyer: {
    name: 'Sarah Jenkins',
    department: 'Global Infrastructure Procurement',
    contactEmail: 'sjenkins@enterprise.com',
  },
  lineItems: [
    {
      id: 'po-line-1',
      itemCode: 'SRV-RACK-42U',
      description: 'Enterprise 42U Server Rack Enclosure',
      category: 'Data Center Hardware',
      quantity: 4,
      unitOfMeasure: 'EA',
      unitPrice: 1250.0,
      totalPrice: 5000.0,
    },
    {
      id: 'po-line-2',
      itemCode: 'PDU-SW-30A',
      description: 'Monitored 30A Rack PDU with Ethernet',
      category: 'Power Equipment',
      quantity: 8,
      unitOfMeasure: 'EA',
      unitPrice: 350.0,
      totalPrice: 2800.0,
    },
  ],
  subtotal: 7800.0,
  taxAmount: 624.0,
  shippingAmount: 0.0,
  totalAmount: 8424.0,
  paymentTerms: 'Net 30',
  status: 'APPROVED',
};

const matchingInvoice: SupplierInvoice = {
  invoiceNumber: 'INV-90214',
  invoiceDate: '2026-03-15',
  poReference: 'PO-2026-8801',
  currency: 'USD',
  supplier: {
    name: 'Precision Systems Inc.',
    taxId: 'US-94-3829101',
    address: '100 Silicon Blvd, San Jose, CA 95134',
  },
  lineItems: [
    {
      id: 'inv-line-1',
      itemCode: 'SRV-RACK-42U',
      description: 'Enterprise 42U Server Rack Enclosure',
      quantity: 4,
      unitOfMeasure: 'EA',
      unitPrice: 1250.0,
      totalPrice: 5000.0,
    },
    {
      id: 'inv-line-2',
      itemCode: 'PDU-SW-30A',
      description: 'Monitored 30A Rack PDU with Ethernet',
      quantity: 8,
      unitOfMeasure: 'EA',
      unitPrice: 350.0,
      totalPrice: 2800.0,
    },
  ],
  subtotal: 7800.0,
  taxAmount: 624.0,
  shippingAmount: 0.0,
  totalAmount: 8424.0,
  paymentDueDate: '2026-04-14',
  paymentTerms: 'Net 30',
};

test('Reconciliation Engine - Scenario 1: Exact Match PO and Invoice', () => {
  const result = reconcileDocuments(basePO, matchingInvoice);

  assert.equal(result.summary.overallStatus, 'MATCHED');
  assert.equal(result.summary.criticalCount, 0);
  assert.equal(result.summary.warningCount, 0);
  assert.equal(result.summary.totalDiscrepancies, 0);
  assert.equal(result.summary.reconciliationScore, 100);
  assert.equal(result.lineItemMatches.length, 2);
  assert.equal(result.lineItemMatches[0].matchType, 'EXACT_SKU');
});

test('Reconciliation Engine - Scenario 2: Unit Price and Quantity Over-billing Discrepancy', () => {
  const mismatchedInvoice: SupplierInvoice = {
    ...matchingInvoice,
    invoiceNumber: 'INV-90215-BAD',
    lineItems: [
      {
        id: 'inv-line-1',
        itemCode: 'SRV-RACK-42U',
        description: 'Enterprise 42U Server Rack Enclosure',
        quantity: 5, // Over-billed by 1 unit (PO has 4)
        unitOfMeasure: 'EA',
        unitPrice: 1450.0, // Unit price hiked from 1250 to 1450 (+200/unit)
        totalPrice: 7250.0,
      },
      {
        id: 'inv-line-2',
        itemCode: 'PDU-SW-30A',
        description: 'Monitored 30A Rack PDU with Ethernet',
        quantity: 8,
        unitOfMeasure: 'EA',
        unitPrice: 350.0,
        totalPrice: 2800.0,
      },
    ],
    subtotal: 10050.0,
    taxAmount: 804.0,
    totalAmount: 10854.0,
  };

  const result = reconcileDocuments(basePO, mismatchedInvoice);

  assert.equal(result.summary.overallStatus, 'CRITICAL_DISCREPANCIES');
  assert.ok(result.summary.criticalCount >= 2, 'Should flag at least 2 critical discrepancies');

  const priceDiscrepancy = result.discrepancies.find(d => d.category === 'LINE_UNIT_PRICE');
  assert.ok(priceDiscrepancy, 'Price discrepancy must be present');
  assert.equal(priceDiscrepancy.severity, 'CRITICAL');
  assert.ok(priceDiscrepancy.varianceDisplay.includes('+16.0%') || priceDiscrepancy.varianceDisplay.includes('$200.00'));

  const qtyDiscrepancy = result.discrepancies.find(d => d.category === 'LINE_QUANTITY');
  assert.ok(qtyDiscrepancy, 'Quantity discrepancy must be present');
  assert.equal(qtyDiscrepancy.severity, 'CRITICAL');

  // Score should be substantially penalized
  assert.ok(result.summary.reconciliationScore < 60);
});

test('Reconciliation Engine - Scenario 3: Supplier Identity & Tax ID Discrepancy', () => {
  const fraudulentSupplierInvoice: SupplierInvoice = {
    ...matchingInvoice,
    supplier: {
      name: 'Precision Systems Global LLC',
      taxId: 'US-99-9999999', // Mismatched Tax ID
      address: '99 Scamway Lane, Miami, FL 33101',
    },
  };

  const result = reconcileDocuments(basePO, fraudulentSupplierInvoice);

  assert.equal(result.summary.overallStatus, 'CRITICAL_DISCREPANCIES');
  const taxIdDiscrepancy = result.discrepancies.find(d => d.field === 'supplier.taxId');
  assert.ok(taxIdDiscrepancy, 'Tax ID discrepancy must be flagged');
  assert.equal(taxIdDiscrepancy.severity, 'CRITICAL');
  assert.equal(taxIdDiscrepancy.category, 'SUPPLIER_MISMATCH');
});

test('Reconciliation Engine - Scenario 4: Phantom Line Item (Unmatched Invoice Item)', () => {
  const phantomInvoice: SupplierInvoice = {
    ...matchingInvoice,
    lineItems: [
      ...matchingInvoice.lineItems,
      {
        id: 'inv-line-phantom',
        itemCode: 'FEE-EXPEDITE',
        description: 'Priority Air Freight & Handling Surcharge',
        quantity: 1,
        unitOfMeasure: 'EA',
        unitPrice: 650.0,
        totalPrice: 650.0,
      },
    ],
    subtotal: 8450.0,
    totalAmount: 9074.0,
  };

  const result = reconcileDocuments(basePO, phantomInvoice);

  assert.equal(result.summary.overallStatus, 'CRITICAL_DISCREPANCIES');
  const phantomDiscrepancy = result.discrepancies.find(
    d => d.category === 'LINE_UNMATCHED' && d.poValue === 'NOT ON PO'
  );
  assert.ok(phantomDiscrepancy, 'Phantom invoice line item must be caught');
  assert.equal(phantomDiscrepancy.severity, 'CRITICAL');
  assert.equal(phantomDiscrepancy.varianceAmount, 650.0);
});

test('Reconciliation Engine - Tolerances: Sub-threshold rounding does not trigger discrepancy', () => {
  const pennyRoundingInvoice: SupplierInvoice = {
    ...matchingInvoice,
    lineItems: [
      {
        ...matchingInvoice.lineItems[0],
        unitPrice: 1250.02, // $0.02 diff, within default $0.05 absolute tolerance
        totalPrice: 5000.08,
      },
      matchingInvoice.lineItems[1],
    ],
    subtotal: 7800.08,
    taxAmount: 624.01,
    totalAmount: 8424.09,
  };

  const result = reconcileDocuments(basePO, pennyRoundingInvoice);

  // Unit price diff of $0.02 is within the $0.05 absolute tolerance
  const priceErrors = result.discrepancies.filter(d => d.category === 'LINE_UNIT_PRICE' && d.severity === 'CRITICAL');
  assert.equal(priceErrors.length, 0);
});

test('Similarity Utilities - Name normalization and matching', () => {
  const norm1 = normalizeSupplierName('Acme Logistics Services, LLC');
  const norm2 = normalizeSupplierName('Acme Logistics Services Inc.');
  assert.equal(norm1, 'acme logistics services');
  assert.equal(norm2, 'acme logistics services');
  assert.equal(norm1, norm2);

  const sim = stringSimilarity('Cat6 Ethernet Cable 1000ft Reel', 'Cat6 Network Ethernet Cable Reel 1000ft');
  assert.ok(sim > 0.85);
});
