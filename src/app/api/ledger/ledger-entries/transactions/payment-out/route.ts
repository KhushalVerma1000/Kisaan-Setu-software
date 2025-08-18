
// app/api/ledger-entries/transactions/payment-out/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPaymentOutEntry } from '@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        const entry = await createPaymentOutEntry(
            body.supplierLedgerAccountId,
            body.amount,
            new Date(body.date),
            body.paymentId,
            body.paymentNumber,
            body.supplierName
        );
        
        return NextResponse.json({ entry }, { status: 201 });
    } catch (error) {
        console.error('Error creating payment out entry:', error);
        return NextResponse.json(
            { error: 'Failed to create payment out entry' },
            { status: 500 }
        );
    }
}
