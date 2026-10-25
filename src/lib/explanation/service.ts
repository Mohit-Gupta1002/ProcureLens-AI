import { Discrepancy, ExplanationResponse } from '@/types/procurement';

export interface ExplanationContext {
  discrepancy: Discrepancy;
  poNumber: string;
  invoiceNumber: string;
  supplierName: string;
  currency: string;
}

/**
 * Deterministic Audit Rule Explainer (Default & Fallback)
 * Provides audit-grade B2B rationale, risk exposure analysis, and vendor communication
 * without requiring external network calls or LLM API keys.
 */
export function generateDeterministicExplanation(ctx: ExplanationContext): ExplanationResponse {
  const { discrepancy, poNumber, invoiceNumber, supplierName, currency } = ctx;

  switch (discrepancy.category) {
    case 'LINE_UNIT_PRICE':
      return {
        discrepancyId: discrepancy.id,
        source: 'DETERMINISTIC_RULES',
        summary: `Contractual Price Breach: Unit price on invoice exceeds the legally binding rate established in ${poNumber}.`,
        businessRiskAssessment:
          'Allowing unauthorized price increases creates negative margin leakage and sets an adverse commercial precedent under UCC Section 2-207. Cumulative margin erosion across purchase volume can become substantial if unflagged.',
        commercialImpact: discrepancy.varianceAmount
          ? `Direct cash leakage of ${formatMoney(discrepancy.varianceAmount, currency)} on this transaction line item.`
          : 'Direct unapproved variance on billed line extension.',
        recommendedResolution:
          'Withhold payment on the unit price delta. Instruct Accounts Payable to short-pay the invoice to match the approved PO rate, or request a revised invoice and credit memo from the supplier.',
        supplierCommunicationDraft: `Dear ${supplierName} Accounts Receivable Team,\n\nWe are reviewing Invoice #${invoiceNumber} referencing Purchase Order #${poNumber}. We noted a unit price discrepancy on ${discrepancy.field}:\n- Contracted PO Rate: ${discrepancy.poValue}\n- Invoiced Rate: ${discrepancy.invoiceValue}\n- Variance: ${discrepancy.varianceDisplay}\n\nPlease issue a credit memo for the variance or provide an amended invoice reflecting the agreed purchase order pricing so we may release payment promptly.\n\nBest regards,\nProcurement Operations`,
        keyCitations: [
          `PO #${poNumber} Master Terms`,
          `UCC § 2-207 (Contractual Terms Alignment)`,
          `Invoice #${invoiceNumber} Line Extraction`,
        ],
      };

    case 'LINE_QUANTITY': {
      const isOver = (discrepancy.varianceAmount || 0) > 0;
      return {
        discrepancyId: discrepancy.id,
        source: 'DETERMINISTIC_RULES',
        summary: isOver
          ? `Quantity Over-Billing: Invoiced quantity exceeds the maximum units authorized under Purchase Order ${poNumber}.`
          : `Partial Fulfillment: Invoiced quantity reflects partial delivery against total PO quantity.`,
        businessRiskAssessment: isOver
          ? 'Risk of paying for unreceived inventory, warehouse over-stocking, or supplier shipping errors that fail physical dock verification.'
          : 'Operational tracking risk: open order balance must remain active for subsequent delivery reconciliation.',
        commercialImpact: discrepancy.varianceAmount
          ? `Unapproved billing exposure of ${formatMoney(Math.abs(discrepancy.varianceAmount), currency)}.`
          : 'Inventory balance adjustment required.',
        recommendedResolution: isOver
          ? 'Check three-way match dock receiving logs. If excess items were not physically accepted and signed for, dispute the over-billed quantity.'
          : 'Approve invoice for delivered quantity. Confirm with vendor that remaining balance will be fulfilled under the same PO.',
        supplierCommunicationDraft: `Dear ${supplierName} Billing Department,\n\nRegarding Invoice #${invoiceNumber} against PO #${poNumber}, our automated reconciliation flagged a quantity variance:\n- Authorized PO Quantity: ${discrepancy.poValue}\n- Billed Invoice Quantity: ${discrepancy.invoiceValue}\n- Net Discrepancy: ${discrepancy.varianceDisplay}\n\n${isOver ? 'Our warehouse receiving records confirm only the PO authorized quantity was received. Please adjust the invoice accordingly.' : 'We have approved this partial billing and look forward to receiving the remaining balance.'}\n\nSincerely,\nProcurement & Inventory Operations`,
        keyCitations: [
          `Three-Way Match Verification Standard`,
          `PO #${poNumber} Authorized Quantities`,
          `Warehouse Receiving Dock Log Record`,
        ],
      };
    }

    case 'SUPPLIER_MISMATCH':
      return {
        discrepancyId: discrepancy.id,
        source: 'DETERMINISTIC_RULES',
        summary:
          'Critical Vendor Identity / Tax ID Divergence: High-severity compliance flag indicating a mismatch between the registered vendor master file and the invoicing entity.',
        businessRiskAssessment:
          'Presents severe business email compromise (BEC), payment diversion, or unvetted third-party remittance risks. Processing payment to an unverified tax ID can trigger IRS 1099/W-9 non-compliance penalties or unrecoverable wire loss.',
        commercialImpact:
          'Complete payment amount is at risk of fraudulent redirection or regulatory tax misclassification.',
        recommendedResolution:
          'Immediate payment hold. Do not use phone numbers or emails listed on the invoice. Use out-of-band verified contact details from your ERP vendor master to confirm authentic bank and entity details.',
        supplierCommunicationDraft: `Dear Accounts Payable Compliance Team,\n\nInvoice #${invoiceNumber} submitted for PO #${poNumber} indicates a Tax Identification or Corporate Entity divergence:\n- PO Entity/Tax ID: ${discrepancy.poValue}\n- Invoiced Entity/Tax ID: ${discrepancy.invoiceValue}\n\nIn accordance with enterprise anti-fraud compliance controls, this invoice has been placed on hold pending updated W-9/W-8BEN verification and authorized sign-off.\n\nCompliance & AP Controls`,
        keyCitations: [
          `Corporate Master Vendor File Records`,
          `IRS Form W-9 / Tax ID Validation Protocol`,
          `SOX Section 404 Internal Controls on Disbursements`,
        ],
      };

    case 'LINE_UNMATCHED': {
      const isPhantom = discrepancy.poValue === 'NOT ON PO';
      return {
        discrepancyId: discrepancy.id,
        source: 'DETERMINISTIC_RULES',
        summary: isPhantom
          ? `Unauthorized Line Item: Invoice includes a line item totaling ${discrepancy.varianceDisplay} with no corresponding line in Purchase Order ${poNumber}.`
          : `Omitted PO Line Item: Approved PO line was not billed on this voucher.`,
        businessRiskAssessment: isPhantom
          ? 'Scope creep or unauthorized fee additions (e.g. handling, storage, unagreed premium services) violating procurement approval limits.'
          : 'Delayed operational fulfillment or split-shipment accounting delay.',
        commercialImpact: discrepancy.varianceAmount
          ? `Direct unauthorized addition of ${formatMoney(Math.abs(discrepancy.varianceAmount), currency)}.`
          : 'Zero immediate cash leakage.',
        recommendedResolution: isPhantom
          ? 'Reject unauthorized line item. If service was genuinely rendered and necessary, a Change Order or PO Revision must be approved by the budget owner.'
          : 'Track remaining line item on backorder status.',
        supplierCommunicationDraft: `Dear ${supplierName},\n\nWe reviewed Invoice #${invoiceNumber} and identified an unrecognized line item (${discrepancy.field}):\n- Billed Item: ${discrepancy.invoiceValue}\n- Variance: ${discrepancy.varianceDisplay}\n\nOur Purchase Order #${poNumber} contains no authorization for this line item. Please remove this charge or submit a revised invoice matching approved PO scope.\n\nThank you,\nProcurement Operations`,
        keyCitations: [
          `PO #${poNumber} Line Item Schedule`,
          `Corporate Procurement Delegated Authority Limits`,
        ],
      };
    }

    case 'SHIPPING_UNAUTHORIZED':
      return {
        discrepancyId: discrepancy.id,
        source: 'DETERMINISTIC_RULES',
        summary: `Unapproved Shipping/Freight Charges: Invoiced shipping of ${discrepancy.invoiceValue} conflicts with PO shipping terms (${discrepancy.poValue}).`,
        businessRiskAssessment:
          'Freight leakage: Purchase orders specified FOB Destination where freight is supplier-absorbed. Unilateral freight surcharges violate standard terms.',
        commercialImpact: discrepancy.varianceAmount
          ? `Disputed freight charge of ${formatMoney(discrepancy.varianceAmount, currency)}.`
          : 'Disputed shipping extension.',
        recommendedResolution:
          'Dispute freight charge based on PO Incoterms. Request freight waiver or revised invoice.',
        supplierCommunicationDraft: `Hello ${supplierName} Accounts Receivable,\n\nInvoice #${invoiceNumber} includes freight charges of ${discrepancy.invoiceValue}. However, Purchase Order #${poNumber} was issued under FOB Destination terms with freight included.\n\nPlease provide an updated invoice with freight removed.\n\nRegards,\nProcurement Logistics`,
        keyCitations: [
          `Incoterms 2020 (FOB Destination)`,
          `PO #${poNumber} Freight Conditions`,
        ],
      };

    case 'TAX_VARIANCE':
      return {
        discrepancyId: discrepancy.id,
        source: 'DETERMINISTIC_RULES',
        summary: `Tax Amount Variance: Billed tax of ${discrepancy.invoiceValue} does not reconcile with PO calculation of ${discrepancy.poValue}.`,
        businessRiskAssessment:
          'Overpaying sales/use tax results in unrecoverable tax leakage or incorrect state tax reporting. Risk of ignoring valid resale or non-profit exemption certificates.',
        commercialImpact: discrepancy.varianceAmount
          ? `Tax variance of ${formatMoney(Math.abs(discrepancy.varianceAmount), currency)}.`
          : 'Tax rate divergence.',
        recommendedResolution:
          'Cross-verify tax rate against state/local jurisdiction tables and supply tax exemption certificate if applicable.',
        supplierCommunicationDraft: `Dear ${supplierName} Tax & Invoicing Team,\n\nWe noted a tax divergence on Invoice #${invoiceNumber} against PO #${poNumber}:\n- Expected Tax: ${discrepancy.poValue}\n- Invoiced Tax: ${discrepancy.invoiceValue}\n- Variance: ${discrepancy.varianceDisplay}\n\nPlease verify your applied jurisdiction tax schedule or apply our tax exemption certificate on file.\n\nBest regards,\nCorporate Tax & AP`,
        keyCitations: [
          `Jurisdiction Sales & Use Tax Code`,
          `PO #${poNumber} Tax Calculation Schedule`,
        ],
      };

    case 'TOTAL_MISMATCH':
    default:
      return {
        discrepancyId: discrepancy.id,
        source: 'DETERMINISTIC_RULES',
        summary: `Financial Settlement Mismatch: Invoice gross amount differs from authorized PO allocation by ${discrepancy.varianceDisplay}.`,
        businessRiskAssessment:
          'Payment of an unreconciled invoice total will fail automated ERP general ledger posting and break three-way match controls.',
        commercialImpact: discrepancy.varianceAmount
          ? `Total settlement variance of ${formatMoney(discrepancy.varianceAmount, currency)}.`
          : 'Reconciliation failure.',
        recommendedResolution:
          'Hold final disbursement until individual line item and tax variances are resolved and credit memo is posted.',
        supplierCommunicationDraft: `Dear ${supplierName},\n\nWe cannot approve Invoice #${invoiceNumber} for payment due to an aggregate variance of ${discrepancy.varianceDisplay} against PO #${poNumber}. Please work with our team to resolve underlying line discrepancies so settlement can occur.\n\nThank you,\nFinance & Procurement`,
        keyCitations: [
          `PO #${poNumber} Financial Summary`,
          `Invoice #${invoiceNumber} Stated Total`,
          `Three-Way Match Accounting Standard`,
        ],
      };
  }
}

/**
 * Server-side explanation entry point.
 * Checks for live LLM API keys (Gemini, Anthropic, OpenAI).
 * If no key is set or if the LLM request fails, smoothly defaults to the
 * deterministic audit engine.
 */
export async function explainDiscrepancy(ctx: ExplanationContext): Promise<ExplanationResponse> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // If no LLM API key is configured, return the deterministic explanation immediately
  if (!geminiKey && !anthropicKey && !openaiKey) {
    return generateDeterministicExplanation(ctx);
  }

  // Attempt live LLM enhancement via available provider
  try {
    if (geminiKey) {
      return await callGeminiLLM(ctx, geminiKey);
    } else if (openaiKey) {
      return await callOpenAILLM(ctx, openaiKey);
    } else if (anthropicKey) {
      return await callAnthropicLLM(ctx, anthropicKey);
    }
  } catch (error) {
    console.warn('Live LLM explanation call failed; falling back to deterministic rules:', error);
  }

  return generateDeterministicExplanation(ctx);
}

async function callGeminiLLM(ctx: ExplanationContext, apiKey: string): Promise<ExplanationResponse> {
  const prompt = buildPrompt(ctx);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API HTTP error ${response.status}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Empty response from Gemini');

  const parsed = JSON.parse(rawText);
  return {
    discrepancyId: ctx.discrepancy.id,
    source: 'LIVE_LLM',
    modelName: 'Gemini 2.5 Flash',
    summary: parsed.summary || ctx.discrepancy.explanation,
    businessRiskAssessment: parsed.businessRiskAssessment,
    commercialImpact: parsed.commercialImpact,
    recommendedResolution: parsed.recommendedResolution,
    supplierCommunicationDraft: parsed.supplierCommunicationDraft,
    keyCitations: parsed.keyCitations || [],
  };
}

async function callOpenAILLM(ctx: ExplanationContext, apiKey: string): Promise<ExplanationResponse> {
  const prompt = buildPrompt(ctx);
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });

  if (!response.ok) throw new Error(`OpenAI HTTP error ${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');

  const parsed = JSON.parse(content);
  return {
    discrepancyId: ctx.discrepancy.id,
    source: 'LIVE_LLM',
    modelName: 'GPT-4o mini',
    summary: parsed.summary || ctx.discrepancy.explanation,
    businessRiskAssessment: parsed.businessRiskAssessment,
    commercialImpact: parsed.commercialImpact,
    recommendedResolution: parsed.recommendedResolution,
    supplierCommunicationDraft: parsed.supplierCommunicationDraft,
    keyCitations: parsed.keyCitations || [],
  };
}

async function callAnthropicLLM(ctx: ExplanationContext, apiKey: string): Promise<ExplanationResponse> {
  const prompt = buildPrompt(ctx);
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`Anthropic HTTP error ${response.status}`);
  const data = await response.json();
  const content = data.content?.[0]?.text;
  if (!content) throw new Error('Empty response from Anthropic');

  const parsed = JSON.parse(content);
  return {
    discrepancyId: ctx.discrepancy.id,
    source: 'LIVE_LLM',
    modelName: 'Claude 3.5 Haiku',
    summary: parsed.summary || ctx.discrepancy.explanation,
    businessRiskAssessment: parsed.businessRiskAssessment,
    commercialImpact: parsed.commercialImpact,
    recommendedResolution: parsed.recommendedResolution,
    supplierCommunicationDraft: parsed.supplierCommunicationDraft,
    keyCitations: parsed.keyCitations || [],
  };
}

function buildPrompt(ctx: ExplanationContext): string {
  const { discrepancy, poNumber, invoiceNumber, supplierName, currency } = ctx;
  return `
You are an expert Enterprise Procurement Auditor and Corporate Counsel.
The deterministic reconciliation engine has already calculated and verified the following discrepancy.
CRITICAL CONSTRAINT: You MUST NOT alter, recalculate, or dispute any numbers or calculations. The deterministic engine is the sole mathematical authority.

Discrepancy Details:
- Category: ${discrepancy.category}
- Severity: ${discrepancy.severity}
- Field: ${discrepancy.field}
- PO Authorized Value: ${discrepancy.poValue}
- Invoiced Value: ${discrepancy.invoiceValue}
- Variance: ${discrepancy.varianceDisplay}
- Engine Explanation: ${discrepancy.explanation}
- PO Number: ${poNumber}
- Invoice Number: ${invoiceNumber}
- Supplier: ${supplierName}
- Currency: ${currency}

Return a valid JSON object with EXACTLY these keys:
{
  "summary": "Crisp 1-2 sentence executive briefing on the violation",
  "businessRiskAssessment": "Detailed analysis of operational, commercial, or compliance risk",
  "commercialImpact": "Financial exposure analysis",
  "recommendedResolution": "Clear procedural action for AP or Procurement reviewer",
  "supplierCommunicationDraft": "Professional, firm, copyable email to vendor accounts receivable referencing the PO and invoice",
  "keyCitations": ["Array of 2-3 specific policy or contract terms referenced"]
}
`;
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
