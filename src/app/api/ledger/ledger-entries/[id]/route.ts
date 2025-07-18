
// app/api/ledger-entries/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
    getLedgerEntryById, 
    updateLedgerEntry, 
    deleteLedgerEntry 
} from '@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase';
import { LedgerEntryInterface } from '@/server/features/ledger/core/entities/Ledger';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const {id}= await params;
        const entry = await getLedgerEntryById(id);
        
        if (!entry) {
            return NextResponse.json(
                { error: 'Ledger entry not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ entry });
    } catch (error) {
        console.error('Error fetching ledger entry:', error);
        return NextResponse.json(
            { error: 'Failed to fetch ledger entry' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const {id} = await params;
        const body = await request.json();
        const entryData: LedgerEntryInterface = {
            ledgerAccountId: body.ledgerAccountId,
            date: new Date(body.date),
            amount: body.amount,
            type: body.type,
            description: body.description
        };

        const updatedEntry = await updateLedgerEntry(id, entryData);
        return NextResponse.json({ entry: updatedEntry });
    } catch (error) {
        console.error('Error updating ledger entry:', error);
        return NextResponse.json(
            { error: 'Failed to update ledger entry' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const {id} = await params ;
        await deleteLedgerEntry(id);
        return NextResponse.json({ message: 'Ledger entry deleted successfully' });
    } catch (error) {
        console.error('Error deleting ledger entry:', error);
        return NextResponse.json(
            { error: 'Failed to delete ledger entry' },
            { status: 500 }
        );
    }
}
