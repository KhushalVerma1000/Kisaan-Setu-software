
// app/api/sales/invoices/status/[status]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getInvoicesByStatus } from '@/server/features/sales/invoice/infrastructure/persistence/invoiceQueries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ status: string }> }
) {
  try {
    
    const { searchParams } = new URL(request.url);
    const { status } = await params as { status: 'draft' | 'sent' | 'paid' | 'cancelled' };
    
    // Validate status
    if (!['draft', 'sent', 'paid', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Parse pagination options
    const options = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      sortBy: searchParams.get('sortBy') as 'invoice_date' | 'invoice_number' | 'created_at' | 'updated_at' || 'created_at',
      sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc',
    };

    const result = await getInvoicesByStatus(status, options)();
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching invoices by status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
