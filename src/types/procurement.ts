export type DiscrepancySeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type DiscrepancyCategory =
  | 'SUPPLIER_MISMATCH'
  | 'LINE_QUANTITY'
  | 'LINE_UNIT_PRICE'
  | 'LINE_UNMATCHED'
  | 'TAX_VARIANCE'
  | 'TOTAL_MISMATCH'
  | 'SHIPPING_UNAUTHORIZED'
  | 'PAYMENT_TERMS_DISCREPANCY';

export type ReviewStatus = 'PENDING' | 'ACCEPTED' | 'DISMISSED';

export interface SupplierInfo {
  id?: string;
  name: string;
  taxId: string;
  address: string;
  paymentTerms?: string;
  contactEmail?: string;
  remitToAccount?: string;
}

export interface POLineItem {
  id: string;
  itemCode: string;
  description: string;
  category: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  totalPrice: number;
}

export interface PurchaseOrder {
  poNumber: string;
  poDate: string;
  currency: string;
  supplier: SupplierInfo;
  buyer: {
    name: string;
    department: string;
    contactEmail: string;
  };
  lineItems: POLineItem[];
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  totalAmount: number;
  paymentTerms: string;
  status: 'ISSUED' | 'APPROVED';
  notes?: string;
}

export interface InvoiceLineItem {
  id: string;
  itemCode?: string;
  description: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  totalPrice: number;
}

export interface SupplierInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  poReference: string;
  currency: string;
  supplier: SupplierInfo;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  totalAmount: number;
  paymentDueDate: string;
  paymentTerms: string;
  notes?: string;
  confidenceScore?: number;
}

export interface ReconciliationConfig {
  priceTolerancePercent: number; // e.g. 0.0 means exact, 1.0 means 1%
  priceToleranceAbsolute: number; // e.g. $0.05
  quantityTolerance: number; // e.g. 0
  taxToleranceAbsolute: number; // e.g. $0.10
  totalToleranceAbsolute: number; // e.g. $0.10
  requireExactSupplierTaxId: boolean;
  fuzzyNameSimilarityThreshold: number; // 0.0 - 1.0
  fuzzyItemSimilarityThreshold: number; // 0.0 - 1.0
}

export interface DiscrepancyEvidence {
  sourceDocument: 'PO' | 'INVOICE' | 'BOTH';
  poLineNumber?: number;
  invoiceLineNumber?: number;
  poExcerpt?: string;
  invoiceExcerpt?: string;
  calculationBreakdown?: string;
}

export interface Discrepancy {
  id: string;
  category: DiscrepancyCategory;
  severity: DiscrepancySeverity;
  field: string;
  poValue: string | number | null;
  invoiceValue: string | number | null;
  varianceDisplay: string;
  varianceAmount?: number;
  explanation: string;
  evidence: DiscrepancyEvidence;
  suggestedAction: string;
  reviewStatus: ReviewStatus;
  reviewNotes?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface LineItemMatch {
  poLine?: POLineItem;
  invoiceLine?: InvoiceLineItem;
  matchType: 'EXACT_SKU' | 'FUZZY_DESCRIPTION' | 'UNMATCHED_PO' | 'UNMATCHED_INVOICE';
  matchConfidence: number; // 0.0 to 1.0
  priceDiff: number;
  quantityDiff: number;
  subtotalDiff: number;
  hasDiscrepancy: boolean;
}

export interface ReconciliationSummary {
  overallStatus: 'MATCHED' | 'WARNINGS' | 'CRITICAL_DISCREPANCIES';
  reconciliationScore: number; // 0 to 100
  totalDiscrepancies: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  poTotal: number;
  invoiceTotal: number;
  totalVariance: number;
  currency: string;
}

export interface ReconciliationResult {
  id: string;
  poNumber: string;
  invoiceNumber: string;
  reconciledAt: string;
  summary: ReconciliationSummary;
  lineItemMatches: LineItemMatch[];
  discrepancies: Discrepancy[];
  config: ReconciliationConfig;
}

export interface SyntheticScenario {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  expectedOutcome: 'MATCHED' | 'WARNINGS' | 'CRITICAL_DISCREPANCIES';
  description: string;
  po: PurchaseOrder;
  invoice: SupplierInvoice;
  config?: Partial<ReconciliationConfig>;
}

export interface ExplanationResponse {
  discrepancyId: string;
  source: 'DETERMINISTIC_RULES' | 'LIVE_LLM';
  modelName?: string;
  summary: string;
  businessRiskAssessment: string;
  commercialImpact: string;
  recommendedResolution: string;
  supplierCommunicationDraft: string;
  keyCitations: string[];
}
