// app/api/sales/invoices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createInvoice, getNextInvoiceNumber } from '@/server/features/sales/invoice/infrastructure/persistence/inviceSupabase';
import { getInvoices } from '@/server/features/sales/invoice/infrastructure/persistence/invoiceQueries';
import { Invoice } from '@/server/features/sales/invoice/core/entities/invoice';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filters
    const filters = {
      status: searchParams.get('status') as 'draft' | 'sent' | 'paid' | 'cancelled' | undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      customerName: searchParams.get('customerName') || undefined,
      invoiceNumber: searchParams.get('invoiceNumber') || undefined,
      fpoId: searchParams.get('fpoId') || undefined,
    };

    // Parse pagination options
    const options = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      sortBy: searchParams.get('sortBy') as 'invoice_date' | 'invoice_number' | 'created_at' | 'updated_at' || 'created_at',
      sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc',
    };

    const result = await getInvoices(filters, options)();
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
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

    // Create invoice in database
    const createdInvoice = await createInvoice(invoice)();
    
    if (!createdInvoice) {
      return NextResponse.json(
        { error: 'Failed to create invoice' },
        { status: 500 }
      );
    }

    return NextResponse.json(createdInvoice, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}