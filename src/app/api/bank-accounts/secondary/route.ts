
import { NextRequest, NextResponse } from "next/server";
import { getSecondaryBankAccounts } from '@/server/features/fpo/infrastructure/persistence/BankDetailSupabase';

// GET /api/bank-accounts/secondary - Get only secondary bank accounts
export async function GET() {
  try {
  
    const secondaryAccounts = await getSecondaryBankAccounts()();
    
    return NextResponse.json({
      success: true,
      data: secondaryAccounts,
    });
  } catch (error) {
    console.error('Error fetching secondary bank accounts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
