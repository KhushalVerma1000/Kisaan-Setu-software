// app/api/bank-books/[bankBookId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  getBankBookById, 
  updateBankBook, 
  deleteBankBook 
} from '@/server/features/bankbookSystm/infrastructure/persistence/BankBookSupabase';

interface RouteParams {
  params: Promise<{
    bankBookId: string;
  }>;
}

// GET /api/bank-books/[bankBookId] - Get specific bank book
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { bankBookId } = await params;

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

    return NextResponse.json({
      success: true,
      data: bankBook,
      message: 'Bank book retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching bank book:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch bank book',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/bank-books/[bankBookId] - Update bank book
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { bankBookId } = await params;
    const body = await request.json();
    const { openingBalance, openingDate } = body;

    // Validate required fields
    if (openingBalance === undefined || !openingDate) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          message: 'openingBalance and openingDate are required'
        },
        { status: 400 }
      );
    }

    // Get existing bank book first
    const getBankBook = getBankBookById(bankBookId);
    const existingBankBook = await getBankBook();

    if (!existingBankBook) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Bank book not found',
          message: `Bank book with ID ${bankBookId} not found`
        },
        { status: 404 }
      );
    }

    // Update the bank book
    existingBankBook.openingBalance = parseFloat(openingBalance);
    existingBankBook.openingDate = new Date(openingDate);

    const updateOperation = updateBankBook(existingBankBook);
    const result = await updateOperation();

    if (!result) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to update bank book',
          message: 'Bank book update failed'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Bank book updated successfully'
    });

  } catch (error) {
    console.error('Error updating bank book:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update bank book',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/bank-books/[bankBookId] - Delete bank book
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { bankBookId } = await params;

    const deleteOperation = deleteBankBook(bankBookId);
    const success = await deleteOperation();

    if (!success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to delete bank book',
          message: 'Bank book deletion failed'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Bank book deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting bank book:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete bank book',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}