
// app/api/ledger-entries/transactions/payment-in/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPaymentInEntry } from '@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const entry = await createPaymentInEntry(
            body.customerLedgerAccountId,
            body.amount,
            new Date(body.date),
            body.paymentId,
            body.receiptNumber,
            body.customerName
        );

        return NextResponse.json({ entry }, { status: 201 });
    } catch (error) {
        console.error('Error creating payment in entry:', error);
        return NextResponse.json(
            { error: 'Failed to create payment in entry' },
            { status: 500 }
        );
    }
}
