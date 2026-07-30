
import { NextRequest, NextResponse } from "next/server";
import { getInvoiceById, updateInvoice, deleteInvoice } from '@/server/features/sales/invoice/infrastructure/persistence/inviceSupabase';
import { Invoice } from '@/server/features/sales/invoice/core/entities/invoice';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const {id} = await params;
     const invoice = await getInvoiceById(id)();
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const {id} = await params;
    const body = await request.json();
    
    // Ensure the ID matches
    
    body.id =  id;
    
    // Create invoice instance
    const invoice = Invoice.fromInterface(body);
    
    // Validate invoice
    const validation = invoice.validate();
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Update invoice in database
    const updatedInvoice = await updateInvoice(invoice)();
    
    if (!updatedInvoice) {
      return NextResponse.json(
        { error: 'Failed to update invoice' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedInvoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const {id} = await params;
    const success = await deleteInvoice(id)();
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete invoice' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Invoice deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}