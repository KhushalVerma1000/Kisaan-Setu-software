// app/api/reports/balance-sheet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import  {generateBalanceSheet}  from '@/server/features/ledger/infrastructure/persistence/ledgerReportsSupabase';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const fpoId = searchParams.get('fpoId');
        const asOfDateParam = searchParams.get('asOfDate');

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

        // Parse optional asOfDate
        let asOfDate: Date | undefined;
        if (asOfDateParam) {
            asOfDate = new Date(asOfDateParam);
            if (isNaN(asOfDate.getTime())) {
                return NextResponse.json(
                    { 
                        status: false, 
                        message: 'Invalid asOfDate format. Use YYYY-MM-DD or ISO format' 
                    },
                    { status: 400 }
                );
            }
        }

        // Generate balance sheet
        const balanceSheetResult = await generateBalanceSheet(fpoId, asOfDate);

        return NextResponse.json(balanceSheetResult, {
            status: balanceSheetResult.status ? 200 : 500
        });

    } catch (error) {
        console.error('Balance Sheet API Error:', error);
        return NextResponse.json(
            {
                status: false,
                message: 'Internal server error while generating balance sheet',
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}



