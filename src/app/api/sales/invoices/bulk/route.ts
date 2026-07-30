
import { NextRequest, NextResponse } from "next/server";
import { updateInvoice, deleteInvoice, getInvoiceById } from '@/server/features/sales/invoice/infrastructure/persistence/inviceSupabase';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, status } = body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invoice IDs array is required' },
        { status: 400 }
      );
    }

    // Validate status
    if (!['draft', 'sent', 'paid', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const results = [];
    
    for (const id of ids) {
      try {
        // Get current invoice
        const currentInvoice = await getInvoiceById(id)();
        
        if (currentInvoice) {
          currentInvoice.status = status;
          currentInvoice.updatedAt = new Date();
          
          const updatedInvoice = await updateInvoice(currentInvoice)();
          results.push({ id, success: !!updatedInvoice });
        } else {
          results.push({ id, success: false, error: 'Invoice not found' });
        }
      } catch (error) {
        results.push({ id, success: false, error: 'Update failed' });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error bulk updating invoices:', error);
    return NextResponse.json(
      { error: 'Failed to bulk update invoices' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invoice IDs array is required' },
        { status: 400 }
      );
    }

    const results = [];
    
    for (const id of ids) {
      try {
        const success = await deleteInvoice(id)();
        results.push({ id, success });
      } catch (error) {
        results.push({ id, success: false, error: 'Delete failed' });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error bulk deleting invoices:', error);
    return NextResponse.json(
      { error: 'Failed to bulk delete invoices' },
      { status: 500 }
    );
  }
}