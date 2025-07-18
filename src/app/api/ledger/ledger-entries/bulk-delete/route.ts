
// app/api/ledger-entries/bulk-delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { bulkDeleteLedgerEntries } from '@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase';

export async function DELETE(request: NextRequest) {
    try {
        const { entryIds } = await request.json();

        if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
            return NextResponse.json(
                { error: 'Entry IDs array is required' },
                { status: 400 }
            );
        }

        await bulkDeleteLedgerEntries(entryIds);
        return NextResponse.json({ 
            message: `${entryIds.length} entries deleted successfully` 
        });
    } catch (error) {
        console.error('Error bulk deleting ledger entries:', error);
        return NextResponse.json(
            { error: 'Failed to delete ledger entries' },
            { status: 500 }
        );
    }
}
