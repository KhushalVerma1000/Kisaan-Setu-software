
// app/api/bank-books/entries/bulk-delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { deleteMultipleBankBookEntries } from '@/server/features/bankbookSystm/infrastructure/persistence/BankBookEntrySystem';

// DELETE /api/bank-books/entries/bulk-delete - Bulk delete entries
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { entryIds } = body;

    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid entry IDs',
          message: 'entryIds array is required and must not be empty'
        },
        { status: 400 }
      );
    }

    const deleteOperation = deleteMultipleBankBookEntries(entryIds);
    const success = await deleteOperation();

    if (!success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to delete bank book entries',
          message: 'Bulk deletion failed'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${entryIds.length} bank book entries deleted successfully`
    });

  } catch (error) {
    console.error('Error bulk deleting bank book entries:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to bulk delete entries',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}