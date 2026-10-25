import { NextRequest, NextResponse } from 'next/server';
import { explainDiscrepancy, ExplanationContext } from '@/lib/explanation/service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || !body.discrepancy) {
      return NextResponse.json(
        { error: 'Missing discrepancy in request payload' },
        { status: 400 }
      );
    }

    const ctx: ExplanationContext = {
      discrepancy: body.discrepancy,
      poNumber: body.poNumber || 'PO-RECORD',
      invoiceNumber: body.invoiceNumber || 'INV-RECORD',
      supplierName: body.supplierName || 'Supplier',
      currency: body.currency || 'USD',
    };

    const explanation = await explainDiscrepancy(ctx);

    return NextResponse.json(explanation, { status: 200 });
  } catch (error) {
    console.error('Failed to generate explanation:', error);
    return NextResponse.json(
      { error: 'Internal error generating explanation' },
      { status: 500 }
    );
  }
}
