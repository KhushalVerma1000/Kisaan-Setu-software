
// app/api/ledger-entries/transactions/payment-out/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPaymentOutEntry, PaymentOutData } from '@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const paymentData: PaymentOutData = {
            supplierLedgerAccountId: body.supplierLedgerAccountId,
            amount: body.amount,
            date: new Date(body.date),
            paymentNumber: body.paymentNumber,
            description: body.description
        };

        const entry = await createPaymentOutEntry(paymentData);
        return NextResponse.json({ entry }, { status: 201 });
    } catch (error) {
        console.error('Error creating payment out entry:', error);
        return NextResponse.json(
            { error: 'Failed to create payment out entry' },
            { status: 500 }
        );
    }
}