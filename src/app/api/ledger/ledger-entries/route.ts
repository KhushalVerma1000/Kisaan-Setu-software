// app/api/ledger-entries/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
    getAllLedgerEntries, 
    createLedgerEntry, 
    getLedgerEntriesForDateRange 
} from '@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase';
import { LedgerEntryInterface } from '@/server/features/ledger/core/entities/Ledger';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const ledgerAccountId = searchParams.get('ledgerAccountId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        console.log('=== GET /api/ledger-entries Debug ===');
        console.log('Request URL:', request.url);
        console.log('Search params:', {
            ledgerAccountId,
            startDate,
            endDate
        });

        if (!ledgerAccountId) {
            console.log('ERROR: Missing ledgerAccountId parameter');
            return NextResponse.json(
                { error: 'Ledger account ID is required' },
                { status: 400 }
            );
        }

        let entries;
        if (startDate && endDate) {
            console.log('Fetching entries for date range:', { startDate, endDate });
            entries = await getLedgerEntriesForDateRange(
                ledgerAccountId,
                new Date(startDate),
                new Date(endDate)
            );
        } else {
            console.log('Fetching all entries for ledger account:', ledgerAccountId);
            entries = await getAllLedgerEntries(ledgerAccountId);
        }

        console.log('Entries fetched:', {
            count: entries ? entries.length : 0,
            sample: entries && entries.length > 0 ? entries[0] : null
        });

        const response = { entries };
        console.log('Response structure:', {
            hasEntries: !!response.entries,
            entriesType: typeof response.entries,
            entriesLength: response.entries ? response.entries.length : 'N/A'
        });

        return NextResponse.json(response);
    } catch (error) {
        console.error('=== ERROR in GET /api/ledger-entries ===');
        console.error('Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace',
            type: typeof error
        });
        
        return NextResponse.json(
            { 
                error: 'Failed to fetch ledger entries',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        console.log('=== POST /api/ledger/ledger-entries Debug ===');
        console.log('Request body:', body);

        const entryData: LedgerEntryInterface = {
            ledgerAccountId: body.ledgerAccountId,
            date: new Date(body.date),
            amount: body.amount,
            type: body.type,
            description: body.description
        };

        console.log('Processed entry data:', entryData);

        const newEntry = await createLedgerEntry(entryData);
        
        console.log('Created entry:', newEntry);
        
        return NextResponse.json({ entry: newEntry }, { status: 201 });
    } catch (error) {
        console.error('=== ERROR in POST /api/ledger-entries ===');
        console.error('Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace',
            type: typeof error
        });
        
        return NextResponse.json(
            { 
                error: 'Failed to create ledger entry',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}