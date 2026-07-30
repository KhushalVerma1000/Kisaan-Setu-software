import { NextRequest, NextResponse } from "next/server";
import { getAllUserAssociatedLedgerAccount } from '@/server/features/ledger/infrastructure/persistence/ledgerAccountSupabase';
import { getLedgerWithStatement } from '@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase';

// GET /api/cashbook/report - Get cash-in-hand ledger report with running balance
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fpoId = searchParams.get('fpoId');
    const ledgerAccountId = searchParams.get('ledgerAccountId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const reportType = searchParams.get('type') || 'statement'; // 'statement' or 'summary'

    // Need either ledgerAccountId or fpoId
    if (!ledgerAccountId && !fpoId) {
      return NextResponse.json(
        { error: 'Either ledgerAccountId or fpoId is required' },
        { status: 400 }
      );
    }

    let targetLedgerAccountId: string | null = ledgerAccountId;

    // If only fpoId provided, get the Cash-in-Hand ledger account
    if (!targetLedgerAccountId && fpoId) {
      const cashAccounts = await getAllUserAssociatedLedgerAccount(fpoId, 'Cash-in-Hand');
      
      if (!cashAccounts || cashAccounts.length === 0) {
        return NextResponse.json(
          { error: 'Cash-in-Hand ledger account not found for FPO' },
          { status: 404 }
        );
      }
      
      // Get the first Cash-in-Hand account
      targetLedgerAccountId = cashAccounts[0].id!;
    }

    if (!targetLedgerAccountId) {
      return NextResponse.json(
        { error: 'Cash ledger account not found' },
        { status: 404 }
      );
    }

    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    // Get ledger with statement using the persistence function
    const ledgerData = await getLedgerWithStatement(
      targetLedgerAccountId,
      startDateObj,
      endDateObj
    );

    if (reportType === 'summary') {
      // Return summary report
      if (!startDateObj || !endDateObj) {
        return NextResponse.json(
          { error: 'Start date and end date are required for summary report' },
          { status: 400 }
        );
      }

      // Calculate summary metrics
      const cashIn = ledgerData.statement
        .filter(s => s.entry.type === 'Dr' && !s.entry.isOpeningBalance)
        .reduce((sum, s) => sum + s.entry.amount, 0);

      const cashOut = ledgerData.statement
        .filter(s => s.entry.type === 'Cr' && !s.entry.isOpeningBalance)
        .reduce((sum, s) => sum + s.entry.amount, 0);

      const summary = {
        openingBalance: {
          amount: ledgerData.ledgerAccount.openingBalance,
          type: ledgerData.ledgerAccount.balanceType
        },
        closingBalance: {
          amount: ledgerData.currentBalance.balance,
          type: ledgerData.currentBalance.balanceType
        },
        totalCashIn: cashIn,
        totalCashOut: cashOut,
        netCashFlow: cashIn - cashOut,
        entryCount: ledgerData.statement.filter(s => !s.entry.isOpeningBalance).length
      };

      return NextResponse.json({ 
        success: true, 
        data: {
          reportType: 'summary',
          period: {
            startDate: startDateObj,
            endDate: endDateObj
          },
          ledgerAccount: {
            id: ledgerData.ledgerAccount.id,
            name: ledgerData.ledgerAccount.name,
            groupName: ledgerData.ledgerAccount.groupName
          },
          ...summary
        }
      });
    } else {
      // Return detailed statement with running balance
      const totalCashIn = ledgerData.statement
        .filter(s => s.entry.type === 'Dr' && !s.entry.isOpeningBalance)
        .reduce((sum, s) => sum + s.entry.amount, 0);

      const totalCashOut = ledgerData.statement
        .filter(s => s.entry.type === 'Cr' && !s.entry.isOpeningBalance)
        .reduce((sum, s) => sum + s.entry.amount, 0);

      return NextResponse.json({ 
        success: true, 
        data: {
          reportType: 'statement',
          period: {
            startDate: startDateObj,
            endDate: endDateObj
          },
          ledgerAccount: {
            id: ledgerData.ledgerAccount.id,
            name: ledgerData.ledgerAccount.name,
            groupName: ledgerData.ledgerAccount.groupName
          },
          openingBalance: {
            amount: ledgerData.ledgerAccount.openingBalance,
            type: ledgerData.ledgerAccount.balanceType
          },
          currentBalance: {
            amount: ledgerData.currentBalance.balance,
            type: ledgerData.currentBalance.balanceType
          },
          totalCashIn,
          totalCashOut,
          netCashFlow: totalCashIn - totalCashOut,
          entryCount: ledgerData.statement.filter(s => !s.entry.isOpeningBalance).length,
          statement: ledgerData.statement.map(s => ({
            entry: {
              id: s.entry.id,
              date: s.entry.date,
              amount: s.entry.amount,
              type: s.entry.type,
              primaryDescription: s.entry.primaryDescription,
              secondaryDescription: s.entry.secondaryDescription,
              referenceDescription: s.entry.referenceDescription,
              ledgerReference: s.entry.ledgerReference,
              documentNumber: s.entry.documentNumber,
              documentType: s.entry.documentType,
              documentId: s.entry.documentId,
              isOpeningBalance: s.entry.isOpeningBalance
            },
            runningBalance: s.runningBalance,
            runningBalanceType: s.runningBalanceType
          }))
        }
      });
    }
  } catch (error) {
    console.error('Error in GET /api/cashbook/report:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}