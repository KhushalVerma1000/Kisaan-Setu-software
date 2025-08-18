
// app/api/ledger-entries/balance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getLedgerBalance } from '@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const ledgerAccountId = searchParams.get('ledgerAccountId');

        if (!ledgerAccountId) {
            return NextResponse.json(
                { error: 'Ledger account ID is required' },
                { status: 400 }
            );
        }

        const balance = await getLedgerBalance(ledgerAccountId);
        return NextResponse.json({ balance });
    } catch (error) {
        console.error('Error calculating ledger balance:', error);
        return NextResponse.json(
            { error: 'Failed to calculate ledger balance' },
            { status: 500 }
        );
    }
}
