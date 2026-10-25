import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDeterministicExplanation } from '../service';
import { Discrepancy } from '@/types/procurement';

test('Explanation Service - Generates deterministic explanation without API key', () => {
  const dummyDiscrepancy: Discrepancy = {
    id: 'test-disc-1',
    category: 'LINE_UNIT_PRICE',
    severity: 'CRITICAL',
    field: 'lineItem[PKG-WRAP-80GA].unitPrice',
    poValue: '$45.00',
    invoiceValue: '$53.10',
    varianceDisplay: '+$8.10/unit (+18.0%)',
    varianceAmount: 810.0,
    explanation: 'Unit price inflated by 18%',
    evidence: {
      sourceDocument: 'BOTH',
      poExcerpt: 'PO: $45.00',
      invoiceExcerpt: 'Invoice: $53.10',
    },
    suggestedAction: 'Request credit memo',
    reviewStatus: 'PENDING',
  };

  const response = generateDeterministicExplanation({
    discrepancy: dummyDiscrepancy,
    poNumber: 'PO-100',
    invoiceNumber: 'INV-200',
    supplierName: 'Apex Logistics',
    currency: 'USD',
  });

  assert.equal(response.discrepancyId, 'test-disc-1');
  assert.equal(response.source, 'DETERMINISTIC_RULES');
  assert.ok(response.summary.includes('Contractual Price Breach'));
  assert.ok(response.businessRiskAssessment.length > 20);
  assert.ok(response.supplierCommunicationDraft.includes('Invoice #INV-200'));
  assert.ok(response.keyCitations.length > 0);
});
