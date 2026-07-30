import { NextRequest, NextResponse } from "next/server";
import { addSecondaryBankAccount, getAllBankAccounts } from '@/server/features/fpo/infrastructure/persistence/BankDetailSupabase';
import { BankDetail } from '@/server/features/fpo/core/entities/BankDetail';

// GET /api/bank-accounts - Get all bank accounts
export async function GET() {
  try {
    const bankAccounts = await getAllBankAccounts()();
    
    return NextResponse.json({
      success: true,
      data: bankAccounts,
    });
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/bank-accounts - Add a new secondary bank account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['accountHolderName', 'accountNumber', 'bankName', 'ifscCode'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Create BankDetail entity
    const bankDetail = new BankDetail({
      id: crypto.randomUUID(),
      fpoId: '', // Will be set by the database function
      accountHolderName: body.accountHolderName,
      accountNumber: body.accountNumber,
      bankName: body.bankName,
      ifscCode: body.ifscCode,
      upiId: body.upiId,
      isPrimary: false, // Force non-primary for this endpoint
      printBankDetails: body.printBankDetails ?? true,
      printUpiQr: body.printUpiQr ?? true,
    });

    const addedAccount = await addSecondaryBankAccount(bankDetail)();
    
    if (!addedAccount) {
      return NextResponse.json(
        { error: 'Failed to add bank account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: addedAccount,
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding bank account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}