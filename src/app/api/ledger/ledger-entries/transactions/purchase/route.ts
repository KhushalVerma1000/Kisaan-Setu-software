
import { NextRequest, NextResponse } from "next/server";
import { createPurchaseVoucherEntry } from '@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        const entry = await createPurchaseVoucherEntry(
            body.supplierLedgerAccountId,
            body.amount,
            new Date(body.date),
            body.voucherId,
            body.voucherNumber,
            body.supplierName
        );
        
        return NextResponse.json({ entry }, { status: 201 });
    } catch (error) {
        console.error('Error creating purchase voucher entry:', error);
        return NextResponse.json(
            { error: 'Failed to create purchase voucher entry' },
            { status: 500 }
        );
    }
}
