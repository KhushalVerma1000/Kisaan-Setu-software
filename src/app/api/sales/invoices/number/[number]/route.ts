
// app/api/sales/invoices/number/[number]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getInvoiceByNumber } from '@/server/features/sales/invoice/infrastructure/persistence/inviceSupabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const {number } = await params;
    const { searchParams } = new URL(request.url);
    const fpoId = searchParams.get('fpoId') || undefined;
    
    const invoice = await getInvoiceByNumber(number, fpoId)();
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice by number:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}
