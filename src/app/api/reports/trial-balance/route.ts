
import { NextRequest, NextResponse } from "next/server";
import { generateTrialBalance } from '@/server/features/ledger/infrastructure/persistence/ledgerReportsSupabase';

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

        // Generate trial balance
        const trialBalanceResult = await generateTrialBalance(fpoId, asOfDate);

        return NextResponse.json(trialBalanceResult, {
            status: trialBalanceResult.status ? 200 : 500
        });

    } catch (error) {
        console.error('Trial Balance API Error:', error);
        return NextResponse.json(
            {
                status: false,
                message: 'Internal server error while generating trial balance',
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
