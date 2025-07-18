
// app/api/ledger-entries/transactions/sales/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSalesInvoiceEntry, SalesInvoiceData } from '@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const salesData: SalesInvoiceData = {
            customerLedgerAccountId: body.customerLedgerAccountId,
            amount: body.amount,
            date: new Date(body.date),
            invoiceNumber: body.invoiceNumber,
            description: body.description
        };

        const entry = await createSalesInvoiceEntry(salesData);
        return NextResponse.json({ entry }, { status: 201 });
    } catch (error) {
        console.error('Error creating sales invoice entry:', error);
        return NextResponse.json(
            { error: 'Failed to create sales invoice entry' },
            { status: 500 }
        );
    }
}
