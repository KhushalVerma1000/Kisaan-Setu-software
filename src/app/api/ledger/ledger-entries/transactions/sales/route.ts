
// app/api/ledger-entries/transactions/sales/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSalesInvoiceEntry } from '@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        const entry = await createSalesInvoiceEntry(
            body.customerLedgerAccountId,
            body.amount,
            new Date(body.date),
            body.invoiceId,
            body.invoiceNumber,
            body.customerName
        );
        
        return NextResponse.json({ entry }, { status: 201 });
    } catch (error) {
        console.error('Error creating sales invoice entry:', error);
        return NextResponse.json(
            { error: 'Failed to create sales invoice entry' },
            { status: 500 }
        );
    }
}
