
// app/api/bank-books/[bankBookId]/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getBankFlowSummary } from '@/server/features/bankbookSystm/infrastructure/persistence/BankBookEntrySystem';
import { getBankBookById } from '@/server/features/bankbookSystm/infrastructure/persistence/BankBookSupabase';

interface ReportsRouteParams {
  params: Promise<{
    bankBookId: string;
  }>;
}

// GET /api/bank-books/[bankBookId]/reports - Get bank book reports
export async function GET(request: NextRequest, { params }: ReportsRouteParams) {
  try {
    const { bankBookId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Validate bank book exists
    const getBankBook = getBankBookById(bankBookId);
    const bankBook = await getBankBook();

    if (!bankBook) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Bank book not found',
          message: `Bank book with ID ${bankBookId} not found`
        },
        { status: 404 }
      );
    }

    switch (reportType) {
      case 'flow-summary':
        if (!startDate || !endDate) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Missing date range',
              message: 'startDate and endDate are required for flow summary'
            },
            { status: 400 }
          );
        }

        const flowSummary = await getBankFlowSummary(
          bankBookId,
          new Date(startDate),
          new Date(endDate)
        );

        return NextResponse.json({
          success: true,
          data: flowSummary,
          message: 'Bank flow summary retrieved successfully'
        });

      case 'balance':
        // Get current balance from bank book
        const currentBalance = bankBook.getCurrentBalance();
        const balanceWithSign = bankBook.getCurrentBalanceWithSign();

        return NextResponse.json({
          success: true,
          data: {
            currentBalance,
            ...balanceWithSign,
            openingBalance: bankBook.openingBalance,
            openingDate: bankBook.openingDate
          },
          message: 'Bank balance retrieved successfully'
        });

      default:
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid report type',
            message: 'Supported report types: flow-summary, balance'
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error generating bank book report:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate report',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}