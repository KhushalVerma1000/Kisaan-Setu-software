
// app/api/ledger-entries/transactions/payment-in/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPaymentInEntry, PaymentInData } from '@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const paymentData: PaymentInData = {
            customerLedgerAccountId: body.customerLedgerAccountId,
            amount: body.amount,
            date: new Date(body.date),
            receiptNumber: body.receiptNumber,
            description: body.description
        };

        const entry = await createPaymentInEntry(paymentData);
        return NextResponse.json({ entry }, { status: 201 });
    } catch (error) {
        console.error('Error creating payment in entry:', error);
        return NextResponse.json(
            { error: 'Failed to create payment in entry' },
            { status: 500 }
        );
    }
}