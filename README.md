# ProcureLens AI — Enterprise Procurement Exception Detection

**ProcureLens AI** is a modern B2B SaaS web application designed for enterprise finance and procurement operations. It reconciles Purchase Orders (POs) against Supplier Invoices, deterministically detects discrepancies, calculates financial exposure, provides audit-grade evidence, and generates actionable dispute advisories for human review.

---

## 🏛️ System Architecture

ProcureLens AI is designed with a strict **Authority Boundary** separating mathematical calculations from generative narrative advisory:

```
┌────────────────────────────────────────────────────────┐
│                   ProcureLens Client                   │
│   (Next.js App Router • React 19 • Tailwind CSS v4)    │
└───────────────────────────┬────────────────────────────┘
                            │
               Deterministic Reconciliation
                            ▼
┌────────────────────────────────────────────────────────┐
│         TypeScript Deterministic Engine               │
│   (lib/reconciliation/engine.ts • Pure TypeScript)     │
│  - Tax ID & Legal Entity Verification                  │
│  - Exact SKU & Conservative Fuzzy Matching             │
│  - Unit Price, Quantity, & Math Extension Check        │
│  - Explicit Numerical Tolerances & Penny Rounding      │
│  - Financial Settlement & Grand Total Audit            │
└───────────────────────────┬────────────────────────────┘
                            │
              Authority Boundary (Sole Source of Truth)
                            ▼
┌────────────────────────────────────────────────────────┐
│             Advisory Explanation Service               │
│       (Server-Side API Route: /api/explain)            │
│  ┌─────────────────────────┐ ┌──────────────────────┐  │
│  │ Deterministic Rules     │ │ Live LLM Advisory    │  │
│  │ (Default / Offline)     │ │ (Gemini/OpenAI/Anth) │  │
│  └─────────────────────────┘ └──────────────────────┘  │
│  * LLM strictly prohibited from altering calculations  │
│  * Zero secrets or API keys exposed to browser client  │
└────────────────────────────────────────────────────────┘
```

---

## ✨ Core Capabilities

1. **Executive SaaS Dashboard**:
   - Live settlement variance tracking, PO authorized vs Invoiced totals.
   - Deterministic Reconciliation Score (0–100 audit health index).
   - Real-time exception breakdown (Critical, Warning, Info).
   - In-memory human review completion progress.

2. **Selectable Synthetic Benchmark Scenarios**:
   - **Scenario 1: Clean Match** — Hardware & Colocation order (`PO-2026-8801` / `INV-90214`). Perfect alignment across all line items, tax rates, and settlement terms (Score: 100).
   - **Scenario 2: Price Inflation & Quantity Over-Billing** — Industrial Logistics order (`PO-2026-4412` / `INV-88319`). Stretch film unit price inflated by +18.0%, and strapping coil over-billed by +25 units.
   - **Scenario 3: Vendor Identity & Tax Divergence** — Diagnostic Lab supplies (`PO-2026-7090` / `INV-55102`). Supplier Tax ID mismatch, company name variation, and unauthorized 9.25% tax charged on a tax-exempt entity.
   - **Scenario 4: Phantom Line Item & Freight Surcharge** — Office Systems (`PO-2026-3199` / `INV-72019`). Unapproved $680 installation fee not on PO, plus unauthorized $320 freight charge on FOB Destination terms.
   - **Scenario 5: Acceptable Rounding Tolerance** — Cloud Compute (`PO-2026-9055` / `INV-44912`). Multi-tiered billing with fractional cents resulting in a $0.03 delta, cleanly handled within tolerance.

3. **Deterministic Reconciliation Engine**:
   - Zero hallucinations for mathematical comparisons.
   - Explicit numerical tolerances: Absolute Price Delta ($0.05), Price Inflation (0.0%), Quantity (0 units), Sales Tax ($0.10), Grand Total ($0.10).
   - Conservative string similarity (Sørensen–Dice token overlap + Levenshtein distance) with confidence scores.

4. **Interactive Document Inspection**:
   - Side-by-side comparison of PO vs Invoice records.
   - Cross-highlighting of disputed line items and unapproved additions.

5. **Human Review Workflow**:
   - Actions to **Accept as Valid Variance** (with business justification tracking) or **Dismiss Exception**.
   - Clear indicators that reviews are preserved in local session state.
   - Full chronological audit history tab.

6. **Lens AI Advisory & Dispute Drafts**:
   - 1-click **Explain with Lens** generates executive risk briefs, contract clauses (e.g., UCC § 2-207, Incoterms 2020), and copyable vendor communication letters.
   - Works 100% offline via deterministic rule fallbacks if no API key is provided.

7. **Custom JSON Document Sandbox**:
   - Paste or upload custom Purchase Order and Supplier Invoice JSON payloads to run the engine dynamically.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** >= 20.0.0 (tested on Node v24.15.0)
- **npm** >= 10.0.0

### Installation
```bash
# Clone or navigate to the project directory
cd "procure lens"

# Install dependencies
npm install
```

### Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Unit Tests
```bash
npm test
```
Executes the deterministic reconciliation engine test suite using Node's native test runner via `tsx`.

### Production Build
```bash
npm run build
npm start
```

---

## 🔐 Environment Variables

ProcureLens AI **does not require any API keys** to run. The built-in deterministic audit engine provides complete rule-based explanations, risk analyses, and vendor dispute drafts out of the box.

If you wish to optionally enable live LLM narrative enhancements:

Create a `.env.local` file in the workspace root:

```bash
# Optional: Enable Google Gemini for live narrative advisories
GEMINI_API_KEY="your-gemini-api-key"

# OR Optional: Enable OpenAI
OPENAI_API_KEY="your-openai-api-key"

# OR Optional: Enable Anthropic Claude
ANTHROPIC_API_KEY="your-anthropic-api-key"
```

> **Security Note**: API keys are processed strictly on the server side in `src/app/api/explain/route.ts` and `src/lib/explanation/service.ts`. No secrets or API credentials are ever exposed to the client-side JavaScript bundle.

---

## 📁 Project Structure

```
procure lens/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── explain/route.ts      # Server-side LLM explanation route
│   │   ├── globals.css               # Design system & Tailwind v4 theme
│   │   ├── layout.tsx                # Enterprise layout & metadata
│   │   └── page.tsx                  # Main SaaS dashboard & state container
│   ├── components/
│   │   ├── dashboard/
│   │   │   └── SummaryCards.tsx      # KPI cards (Variance, Score, Exceptions)
│   │   ├── layout/
│   │   │   ├── Header.tsx            # Top bar, scenario switcher, actions
│   │   │   └── Sidebar.tsx           # Enterprise navigation sidebar
│   │   └── reconciliation/
│   │       ├── CustomComparisonModal.tsx # Raw JSON schema test runner
│   │       ├── DocumentComparisonView.tsx # Side-by-side PO/Invoice visualizer
│   │       ├── ExceptionReport.tsx   # Discrepancy table & review controls
│   │       ├── ExplanationModal.tsx  # Advisory brief & dispute email generator
│   │       └── ToleranceConfigModal.tsx # Dynamic tolerance rule tuner
│   ├── data/
│   │   └── scenarios.ts              # 5 comprehensive synthetic B2B scenarios
│   ├── lib/
│   │   ├── explanation/
│   │   │   ├── service.ts            # Explanation adapter with deterministic fallback
│   │   │   └── __tests__/service.test.ts
│   │   └── reconciliation/
│   │       ├── engine.ts             # Deterministic TypeScript reconciliation engine
│   │       ├── similarity.ts         # Levenshtein & Sørensen-Dice string similarity
│   │       └── __tests__/engine.test.ts # Unit tests for math & tolerances
│   └── types/
│       └── procurement.ts            # Complete TypeScript domain models
├── package.json
├── tsconfig.json
└── README.md
```

---

## ⚠️ Current Scope & Known Limitations

1. **Document Ingestion**: This MVP milestone operates on structured JSON data (synthetic scenarios + custom JSON input modal). Production deployment would integrate OCR / PDF document extractors (e.g. AWS Textract, Google Document AI, or Azure Form Recognizer) to convert raw PDF/scans into the typed `PurchaseOrder` and `SupplierInvoice` schemas.
2. **Session Persistence**: Review decisions and accepted variances are preserved in browser memory for the duration of the session. A production implementation would persist audit decisions to a relational database (PostgreSQL / Prisma) with multi-tenant row-level security.
3. **ERP Integrations**: Designed to integrate with downstream ERPs (SAP S/4HANA, NetSuite, Coupa, Workday) via webhooks to automate short-pay postings or credit memo requests.
