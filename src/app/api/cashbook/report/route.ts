
// /app/api/cashbook/report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCashBook } from '@/server/features/cashbookSystem/infrastructure/persistence/CashBookSupabase';
import { getCashBookEntries, getCashFlowSummary } from '@/server/features/cashbookSystem/infrastructure/persistence/CashBookEntrySupabase';

// GET /api/cashbook/report - Get cashbook report with running balance
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cashBookId = searchParams.get('cashBookId');
    const fpoId = searchParams.get('fpoId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const reportType = searchParams.get('type') || 'statement'; // 'statement' or 'summary'

    // Need either cashBookId or fpoId
    if (!cashBookId && !fpoId) {
      return NextResponse.json(
        { error: 'Either cashBookId or fpoId is required' },
        { status: 400 }
      );
    }

    let targetCashBookId = cashBookId;

    // If fpoId provided, get cashbook
    if (!targetCashBookId && fpoId) {
      const cashbook = await getCashBook()(fpoId);
      if (!cashbook) {
        return NextResponse.json(
          { error: 'Cashbook not found for FPO' },
          { status: 404 }
        );
      }
      targetCashBookId = cashbook.id!;
    }

    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    if (reportType === 'summary') {
      // Return summary report
      if (!startDateObj || !endDateObj) {
        return NextResponse.json(
          { error: 'Start date and end date are required for summary report' },
          { status: 400 }
        );
      }

      const summary = await getCashFlowSummary(targetCashBookId!, startDateObj, endDateObj);
      
      if (!summary) {
        return NextResponse.json(
          { error: 'Failed to generate summary report' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        data: {
          reportType: 'summary',
          period: {
            startDate: startDateObj,
            endDate: endDateObj
          },
          ...summary
        }
      });
    } else {
      if (!fpoId) {
        return NextResponse.json(
          { error: 'FPO ID is required for detailed statement' },
          { status: 400 }
        );
      }
      // Return detailed statement with running balance
      const cashbook = await getCashBook()(fpoId);
      if (!cashbook) {
        return NextResponse.json(
          { error: 'Cashbook not found' },
          { status: 404 }
        );
      }

      // Get entries and add them to cashbook
      const entries = await getCashBookEntries(targetCashBookId!)(startDateObj, endDateObj);
      cashbook.entries = entries;

      // Get statement with running balance
      const statement = cashbook.getStatementWithRunningBalance(startDateObj, endDateObj);
    // console.log("========this is cashbook entry format =======",statement)

      // Calculate summary metrics
      const totalCashIn = entries
        .filter(e => e.type === 'Dr' && !e.isOpeningBalance)
        .reduce((sum, e) => sum + e.amount, 0);

      const totalCashOut = entries
        .filter(e => e.type === 'Cr' && !e.isOpeningBalance)
        .reduce((sum, e) => sum + e.amount, 0);

      const currentBalance = cashbook.getCurrentBalanceWithSign();

      return NextResponse.json({ 
        success: true, 
        data: {
          reportType: 'statement',
          period: {
            startDate: startDateObj,
            endDate: endDateObj
          },
          openingBalance: cashbook.openingBalance,
          currentBalance: currentBalance.balance,
          isNegativeBalance: currentBalance.isNegative,
          totalCashIn,
          totalCashOut,
          netCashFlow: totalCashIn - totalCashOut,
          entryCount: entries.length,
          statement
        }
      });
    }
  } catch (error) {
    console.error('Error in GET /api/cashbook/report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}