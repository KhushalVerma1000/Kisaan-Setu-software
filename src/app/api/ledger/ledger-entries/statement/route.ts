
// app/api/ledger-entries/statement/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getLedgerWithStatement } from '@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const ledgerAccountId = searchParams.get('ledgerAccountId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        console.log('=== GET /api/ledger-entries/statement Debug ===');
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

        console.log('Calling getLedgerWithStatement with:', {
            ledgerAccountId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined
        });

        const ledgerWithStatement = await getLedgerWithStatement(
            ledgerAccountId,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined
        );

        console.log("=================STATEMENT DEBUG=================", ledgerWithStatement, ledgerWithStatement.statement);

        return NextResponse.json(ledgerWithStatement);
    } catch (error) {
        console.error('=== ERROR in GET /api/ledger-entries/statement ===');
        console.error('Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace',
            type: typeof error,
            fullError: error
        });
        
        return NextResponse.json(
            { 
                error: 'Failed to generate ledger statement',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
