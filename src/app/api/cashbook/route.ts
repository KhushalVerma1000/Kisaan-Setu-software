import { NextRequest, NextResponse } from "next/server";
import { createNewLedgerAccount, getAllUserAssociatedLedgerAccount, updateLedgerAccount } from '@/server/features/ledger/infrastructure/persistence/ledgerAccountSupabase';
import { LedgerAccountInterface } from '@/server/features/ledger/core/entities/Ledger';

// GET /api/cashbook - Get cash-in-hand ledger account for current user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fpoId = searchParams.get('fpoId');

    if (!fpoId) {
      return NextResponse.json(
        { error: 'FPO ID is required' },
        { status: 400 }
      );
    }

    // Get Cash-in-Hand ledger accounts
    const ledgerAccounts = await getAllUserAssociatedLedgerAccount(fpoId, 'Cash-in-Hand');
    
    if (!ledgerAccounts || ledgerAccounts.length === 0) {
      return NextResponse.json(
        { error: 'Cash-in-Hand ledger account not found' },
        { status: 404 }
      );
    }

    // Return the first Cash-in-Hand account (or you can return all)
    return NextResponse.json({ 
      success: true, 
      data: ledgerAccounts[0] 
    });
  } catch (error) {
    console.error('Error in GET /api/cashbook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/cashbook - Create new cash-in-hand ledger account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fpoId, openingBalance, openingDate, state, name } = body;

    // Validation
    if (!fpoId || openingBalance === undefined || !openingDate) {
      return NextResponse.json(
        { error: 'Missing required fields: fpoId, openingBalance, openingDate' },
        { status: 400 }
      );
    }

    // Validate opening date format
    const parsedOpeningDate = new Date(openingDate);
    if (isNaN(parsedOpeningDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid opening date format' },
        { status: 400 }
      );
    }

    // Create Cash-in-Hand ledger account
    const ledgerAccountData: LedgerAccountInterface = {
      name: name || 'Cash', // Default name is 'Cash', but allow customization
      groupName: 'Cash-in-Hand',
      openingBalance: Number(openingBalance),
      balanceType: 'Dr', // Cash is an asset, always debit balance
      fpoId: fpoId,
      openingDate: parsedOpeningDate,
      state: state || '' // State can be optional
    };

    const createdLedgerAccount = await createNewLedgerAccount(ledgerAccountData);
    
    return NextResponse.json({ 
      success: true, 
      data: createdLedgerAccount,
      message: 'Cash-in-Hand ledger account created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/cashbook:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create cash-in-hand ledger account',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/cashbook - Update cash-in-hand ledger account
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { fpoId, openingBalance, openingDate, id, state, name } = body;

    // Validation
    if (!fpoId || openingBalance === undefined || !openingDate) {
      return NextResponse.json(
        { error: 'Missing required fields: fpoId, openingBalance, openingDate' },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Ledger account ID is required for update' },
        { status: 400 }
      );
    }

    // Validate opening date format
    const parsedOpeningDate = new Date(openingDate);
    if (isNaN(parsedOpeningDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid opening date format' },
        { status: 400 }
      );
    }

    // Note: You'll need to implement an update function in ledgerAccountSupabase
    // This is a placeholder - implement updateLedgerAccount function
    return NextResponse.json(
      { error: 'Update functionality not yet implemented. Please implement updateLedgerAccount in ledgerAccountSupabase.' },
      { status: 501 }
    );

    /* 
    // Uncomment when updateLedgerAccount is implemented:
    const ledgerAccountData: LedgerAccountInterface = {
      id: id,
      name: name || 'Cash',
      groupName: 'Cash-in-Hand',
      openingBalance: Number(openingBalance),
      balanceType: 'Dr',
      fpoId: fpoId,
      openingDate: parsedOpeningDate,
      state: state || ''
    };

    const updatedLedgerAccount = await updateLedgerAccount(ledgerAccountData);
    
    return NextResponse.json({ 
      success: true, 
      data: updatedLedgerAccount 
    });
    */
  } catch (error) {
    console.error('Error in PUT /api/cashbook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}