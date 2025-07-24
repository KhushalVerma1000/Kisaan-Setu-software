
// app/api/sales/invoices/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getInvoiceById, updateInvoice } from '@/server/features/sales/invoice/infrastructure/persistence/inviceSupabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const {id} = await params
    const body = await request.json();
    const { status } = body;
    
    // Validate status
    if (!['draft', 'sent', 'paid', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Get current invoice
    const currentInvoice = await getInvoiceById(id)();
    
    if (!currentInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Update status
    currentInvoice.status = status;
    currentInvoice.updatedAt = new Date();

    // Update in database
    const updatedInvoice = await updateInvoice(currentInvoice)();
    
    if (!updatedInvoice) {
      return NextResponse.json(
        { error: 'Failed to update invoice status' },
        { status: 500 }
      );
    }

   return NextResponse.json({
  success: true,
  data: updatedInvoice,
  message: 'Invoice status updated successfully'
});;
  } catch (error) {
    console.error('Error updating invoice status:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice status' },
      { status: 500 }
    );
  }
}
