// app/api/bank-books/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { BankBook } from '@/server/features/bankbookSystm/core/entities/BankBookSystem';
import { 
  createBankBook, 
  getBankBooksByFpo, 
  upsertBankBook 
} from '@/server/features/bankbookSystm/infrastructure/persistence/BankBookSupabase';

// GET /api/bank-books - Get all bank books for FPO
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fpoId = searchParams.get('fpoId');

    const getBankBooks = getBankBooksByFpo();
    const bankBooks = await getBankBooks(fpoId || undefined);

    return NextResponse.json({
      success: true,
      data: bankBooks,
      message: 'Bank books retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching bank books:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch bank books',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/bank-books - Create or upsert bank book
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      bankAccountId, 
      fpoId, 
      openingBalance, 
      openingDate,
      upsert = false 
    } = body;

    // Validate required fields
    if (!bankAccountId || !fpoId || openingBalance === undefined || !openingDate) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          message: 'bankAccountId, fpoId, openingBalance, and openingDate are required'
        },
        { status: 400 }
      );
    }

    // Create BankBook instance
    const bankBook = new BankBook(
   undefined,
      bankAccountId,
      fpoId,
      parseFloat(openingBalance),
      new Date(openingDate)
    );

    // Use upsert if requested, otherwise create
    const operation = upsert ? upsertBankBook(bankBook) : createBankBook(bankBook);
    const result = await operation();

    if (!result) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to save bank book',
          message: 'Bank book creation/update failed'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: upsert ? 'Bank book saved successfully' : 'Bank book created successfully'
    }, { status: upsert ? 200 : 201 });

  } catch (error) {
    console.error('Error creating/upserting bank book:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save bank book',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
