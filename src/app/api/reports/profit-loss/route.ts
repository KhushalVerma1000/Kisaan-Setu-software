import { NextRequest, NextResponse } from "next/server";
import { generateProfitLossStatement } from '@/server/features/ledger/infrastructure/persistence/ledgerReportsSupabase';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const fpoId = searchParams.get('fpoId');
        const fromDateParam = searchParams.get('fromDate');
        const toDateParam = searchParams.get('toDate');

        // Validation
        if (!fpoId) {
            return NextResponse.json(
                { 
                    status: false, 
                    message: 'FPO ID is required' 
                },
                { status: 400 }
            );
        }

        if (!fromDateParam || !toDateParam) {
            return NextResponse.json(
                { 
                    status: false, 
                    message: 'Both fromDate and toDate are required for P&L statement' 
                },
                { status: 400 }
            );
        }

        // Parse dates
        const fromDate = new Date(fromDateParam);
        const toDate = new Date(toDateParam);

        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
            return NextResponse.json(
                { 
                    status: false, 
                    message: 'Invalid date format. Use YYYY-MM-DD or ISO format' 
                },
                { status: 400 }
            );
        }

        if (fromDate >= toDate) {
            return NextResponse.json(
                { 
                    status: false, 
                    message: 'fromDate must be earlier than toDate' 
                },
                { status: 400 }
            );
        }

        // Generate P&L statement
        const profitLossResult = await generateProfitLossStatement(fpoId, fromDate, toDate);

        return NextResponse.json(profitLossResult, {
            status: profitLossResult.status ? 200 : 500
        });

    } catch (error) {
        console.error('Profit & Loss API Error:', error);
        return NextResponse.json(
            {
                status: false,
                message: 'Internal server error while generating P&L statement',
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}