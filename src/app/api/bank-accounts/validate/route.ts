
// app/api/bank-accounts/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// POST /api/bank-accounts/validate - Validate bank account details
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { accountNumber, ifscCode } = body;

    if (!accountNumber || !ifscCode) {
      return NextResponse.json(
        { error: 'Account number and IFSC code are required' },
        { status: 400 }
      );
    }

    // Check if account number already exists for this user
    const { data: existingAccount, error } = await supabase
      .from('bank_details')
      .select('id')
      .eq('fpo_id', user.id)
      .eq('account_number', accountNumber)
      .single();

    const isDuplicate = !!existingAccount && !error;

    // Basic IFSC validation (11 characters, starts with 4 letters)
    const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    const isValidIfsc = ifscPattern.test(ifscCode.toUpperCase());

    // Basic account number validation (5-18 digits)
    const accountPattern = /^[0-9]{5,18}$/;
    const isValidAccount = accountPattern.test(accountNumber);

    return NextResponse.json({
      success: true,
      data: {
        isDuplicate,
        isValidIfsc,
        isValidAccount,
        isValid: !isDuplicate && isValidIfsc && isValidAccount,
      },
    });
  } catch (error) {
    console.error('Error validating bank account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}