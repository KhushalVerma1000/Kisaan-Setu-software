
// app/api/ledger-entries/opening-balance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createOpeningBalanceEntry } from '@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { ledgerAccountId } = body;

        if (!ledgerAccountId) {
            return NextResponse.json(
                { error: 'Ledger account ID is required' },
                { status: 400 }
            );
        }
        
        const entry = await createOpeningBalanceEntry(ledgerAccountId);
        return NextResponse.json({ entry }, { status: 201 });
    } catch (error) {
        console.error('Error creating opening balance entry:', error);
        return NextResponse.json(
            { error: 'Failed to create opening balance entry' },
            { status: 500 }
        );
    }
}