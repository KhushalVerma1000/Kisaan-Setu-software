
// app/api/ledger-entries/transactions/purchase/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPurchaseVoucherEntry, PurchaseVoucherData } from '@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const purchaseData: PurchaseVoucherData = {
            supplierLedgerAccountId: body.supplierLedgerAccountId,
            amount: body.amount,
            date: new Date(body.date),
            voucherNumber: body.voucherNumber,
            description: body.description
        };

        const entry = await createPurchaseVoucherEntry(purchaseData);
        return NextResponse.json({ entry }, { status: 201 });
    } catch (error) {
        console.error('Error creating purchase voucher entry:', error);
        return NextResponse.json(
            { error: 'Failed to create purchase voucher entry' },
            { status: 500 }
        );
    }
}

