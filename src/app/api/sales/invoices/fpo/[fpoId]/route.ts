
// app/api/sales/invoices/fpo/[fpoId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getInvoicesByFpoId } from '@/server/features/sales/invoice/infrastructure/persistence/invoiceQueries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fpoId: string }> }
) {
  try {
    const {fpoId} = await params;
    const { searchParams } = new URL(request.url);
    
    // Parse pagination options
    const options = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      sortBy: searchParams.get('sortBy') as 'invoice_date' | 'invoice_number' | 'created_at' | 'updated_at' || 'created_at',
      sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc',
    };

    const result = await getInvoicesByFpoId(fpoId, options)();
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching invoices by FPO ID:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
