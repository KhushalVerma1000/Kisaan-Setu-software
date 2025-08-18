
// app/api/bank-books/entries/[entryId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  getBankBookEntry, 
  updateBankBookEntry, 
  deleteBankBookEntry 
} from '@/server/features/bankbookSystm/infrastructure/persistence/BankBookEntrySystem';

interface EntryRouteParams {
  params: Promise<{
    entryId: string;
  }>;
}

// GET /api/bank-books/entries/[entryId] - Get specific entry
export async function GET(request: NextRequest, { params }: EntryRouteParams) {
  try {
    const { entryId } = await params;

    const getEntry = getBankBookEntry(entryId);
    const entry = await getEntry();

    if (!entry) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Bank book entry not found',
          message: `Entry with ID ${entryId} not found`
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: entry,
      message: 'Bank book entry retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching bank book entry:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch bank book entry',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/bank-books/entries/[entryId] - Update entry
export async function PUT(request: NextRequest, { params }: EntryRouteParams) {
  try {
    const { entryId } = await params;
    const body = await request.json();

    // Get existing entry first
    const getEntry = getBankBookEntry(entryId);
    const existingEntry = await getEntry();

    if (!existingEntry) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Bank book entry not found',
          message: `Entry with ID ${entryId} not found`
        },
        { status: 404 }
      );
    }

    // Update entry fields
    if (body.amount !== undefined) existingEntry.amount = parseFloat(body.amount);
    if (body.type) existingEntry.type = body.type;
    if (body.date) existingEntry.date = new Date(body.date);
    if (body.transactionType) existingEntry.transactionType = body.transactionType;
    if (body.paymentMethod !== undefined) existingEntry.paymentMethod = body.paymentMethod;
    if (body.primaryDescription) existingEntry.primaryDescription = body.primaryDescription;
    if (body.secondaryDescription !== undefined) existingEntry.secondaryDescription = body.secondaryDescription;
    if (body.referenceDescription !== undefined) existingEntry.referenceDescription = body.referenceDescription;
    if (body.ledgerReference !== undefined) existingEntry.ledgerReference = body.ledgerReference;
    if (body.chequeNumber !== undefined) existingEntry.chequeNumber = body.chequeNumber;
    if (body.referenceNumber !== undefined) existingEntry.referenceNumber = body.referenceNumber;
    if (body.documentId !== undefined) existingEntry.documentId = body.documentId;
    if (body.documentType !== undefined) existingEntry.documentType = body.documentType;
    if (body.documentNumber !== undefined) existingEntry.documentNumber = body.documentNumber;

    const updateOperation = updateBankBookEntry(existingEntry);
    const result = await updateOperation();

    if (!result) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to update bank book entry',
          message: 'Bank book entry update failed'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Bank book entry updated successfully'
    });

  } catch (error) {
    console.error('Error updating bank book entry:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update bank book entry',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/bank-books/entries/[entryId] - Delete entry
export async function DELETE(request: NextRequest, { params }: EntryRouteParams) {
  try {
    const { entryId } = await params;

    const deleteOperation = deleteBankBookEntry(entryId);
    const success = await deleteOperation();

    if (!success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to delete bank book entry',
          message: 'Bank book entry deletion failed'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Bank book entry deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting bank book entry:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete bank book entry',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
