
// app/api/reports/comprehensive/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
    generateBalanceSheet, 
    generateTrialBalance, 
    generateProfitLossStatement 
} from '@/server/features/ledger/infrastructure/persistence/ledgerReportsSupabase';

interface ComprehensiveReportsResponse {
    status: boolean;
    message: string;
    data: {
        balanceSheet: any;
        trialBalance: any;
        profitLoss: any;
    };
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const fpoId = searchParams.get('fpoId');
        const asOfDateParam = searchParams.get('asOfDate');
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

        // Parse dates
        let asOfDate: Date | undefined;
        let fromDate: Date | undefined;
        let toDate: Date | undefined;

        if (asOfDateParam) {
            asOfDate = new Date(asOfDateParam);
            if (isNaN(asOfDate.getTime())) {
                return NextResponse.json(
                    { 
                        status: false, 
                        message: 'Invalid asOfDate format' 
                    },
                    { status: 400 }
                );
            }
        }

        if (fromDateParam && toDateParam) {
            fromDate = new Date(fromDateParam);
            toDate = new Date(toDateParam);
            
            if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
                return NextResponse.json(
                    { 
                        status: false, 
                        message: 'Invalid date format for P&L period' 
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
        }

        // Generate all reports concurrently
        const [balanceSheetResult, trialBalanceResult, profitLossResult] = await Promise.all([
            generateBalanceSheet(fpoId, asOfDate),
            generateTrialBalance(fpoId, asOfDate),
            fromDate && toDate 
                ? generateProfitLossStatement(fpoId, fromDate, toDate)
                : Promise.resolve({ 
                    status: false, 
                    message: 'P&L dates not provided',
                    data: null 
                })
        ]);

        const response: ComprehensiveReportsResponse = {
            status: true,
            message: 'Comprehensive reports generated successfully',
            data: {
                balanceSheet: balanceSheetResult,
                trialBalance: trialBalanceResult,
                profitLoss: profitLossResult
            }
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Comprehensive Reports API Error:', error);
        return NextResponse.json(
            {
                status: false,
                message: 'Internal server error while generating comprehensive reports',
                error: error instanceof Error ? error.message : 'Unknown error',
                data: {
                    balanceSheet: null,
                    trialBalance: null,
                    profitLoss: null
                }
            },
            { status: 500 }
        );
    }
}