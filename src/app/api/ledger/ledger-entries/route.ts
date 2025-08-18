// app/api/ledger-entries/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
    getAllLedgerEntries, 
    createLedgerEntry
} from '@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase';
import { LedgerEntryInterface } from '@/server/features/ledger/core/entities/Ledger';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const ledgerAccountId = searchParams.get('ledgerAccountId');

        console.log('=== GET /api/ledger-entries Debug ===');
        console.log('Request URL:', request.url);
        console.log('Search params:', { ledgerAccountId });

        if (!ledgerAccountId) {
            console.log('ERROR: Missing ledgerAccountId parameter');
            return NextResponse.json(
                { error: 'Ledger account ID is required' },
                { status: 400 }
            );
        }

        console.log('Fetching all entries for ledger account:', ledgerAccountId);
        const entries = await getAllLedgerEntries(ledgerAccountId);

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
        
        console.log('=== POST /api/ledger-entries Debug ===');
        console.log('Request body:', body);

        const entryData: LedgerEntryInterface = {
            ledgerAccountId: body.ledgerAccountId,
            date: new Date(body.date),
            amount: body.amount,
            type: body.type,
            primaryDescription: body.primaryDescription,
            id: body.id,
            documentId: body.documentId,
            documentType: body.documentType,
            documentNumber: body.documentNumber,
            secondaryDescription: body.secondaryDescription,
            referenceDescription: body.referenceDescription,
            ledgerReference: body.ledgerReference,
            isOpeningBalance: body.isOpeningBalance || false
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
