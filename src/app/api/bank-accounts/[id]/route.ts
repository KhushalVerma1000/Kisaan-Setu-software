import { NextRequest, NextResponse } from "next/server";
import { updateSecondaryBankAccount, deleteSecondaryBankAccount } from '@/server/features/fpo/infrastructure/persistence/BankDetailSupabase';
import { BankDetail } from '@/server/features/fpo/core/entities/BankDetail';
import { createClient } from '@/utils/supabase/server';

// PUT /api/bank-accounts/[id] - Update a secondary bank account
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;

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

    // Create BankDetail entity for update
    const bankDetail = new BankDetail({
      id,
      fpoId: user.id,
      accountHolderName: body.accountHolderName,
      accountNumber: body.accountNumber,
      bankName: body.bankName,
      ifscCode: body.ifscCode,
      upiId: body.upiId,
      isPrimary: false, // This will be validated in the service
      printBankDetails: body.printBankDetails ?? true,
      printUpiQr: body.printUpiQr ?? true,
    });

    const updatedAccount = await updateSecondaryBankAccount(bankDetail)();
    
    if (!updatedAccount) {
      return NextResponse.json(
        { error: 'Failed to update bank account or account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedAccount,
    });
  } catch (error) {
    console.error('Error updating bank account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/bank-accounts/[id] - Delete a secondary bank account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const success = await deleteSecondaryBankAccount(id)();
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete bank account or account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Bank account deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting bank account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/bank-accounts/[id] - Get a specific bank account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    // Fetch the specific bank account
    const { data, error } = await supabase
      .from('bank_details')
      .select('*')
      .eq('id', id)
      .eq('fpo_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Bank account not found' },
        { status: 404 }
      );
    }

    const bankDetail = new BankDetail({
      id: data.id,
      fpoId: data.fpo_id,
      accountHolderName: data.account_holder_name,
      accountNumber: data.account_number,
      bankName: data.bank_name,
      ifscCode: data.ifsc_code,
      isPrimary: data.is_primary,
      upiId: data.upi_id,
      printBankDetails: data.print_bank_details,
      printUpiQr: data.print_upi_qr,
    });

    return NextResponse.json({
      success: true,
      data: bankDetail,
    });
  } catch (error) {
    console.error('Error fetching bank account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}