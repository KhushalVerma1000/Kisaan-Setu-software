// app/api/ledger-entries/statement/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getLedgerStatement } from '@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase';

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

        console.log('Calling getLedgerStatement with:', {
            ledgerAccountId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined
        });

        const statement = await getLedgerStatement(
            ledgerAccountId,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined
        );

        console.log('Statement received from database:', {
            statementExists: !!statement,
            statementType: typeof statement,
            statementKeys: statement ? Object.keys(statement) : [],
            statement: statement
        });

        if (statement) {
            console.log('Statement details:', {
                openingBalance: statement.openingBalance,
                openingBalanceType: typeof statement.openingBalance,
                closingBalance: statement.closingBalance,
                closingBalanceType: typeof statement.closingBalance,
                entries: statement.entries ? `${statement.entries.length} entries` : 'No entries',
                sampleEntry: statement.entries.length > 0 ? statement.entries[0] : 'No entries to sample'
            });
        }

        const response = { statement };
        console.log('Response being sent:', {
            hasStatement: !!response.statement,
            responseKeys: Object.keys(response)
        });

        return NextResponse.json(response);
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