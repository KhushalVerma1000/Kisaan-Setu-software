
// /app/api/cashbook/entries/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  getCashBookEntries, 
  createCashBookEntry, 
  updateCashBookEntry,
  deleteCashBookEntry,
  deleteCashBookEntriesByDocument,
  getCashBookEntriesByDocument
} from '@/server/features/cashbookSystem/infrastructure/persistence/CashBookEntrySupabase';
import { CashBookEntry } from '@/server/features/cashbookSystem/core/entities/CashbookSystem';

// GET /api/cashbook/entries - Get cashbook entries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cashBookId = searchParams.get('cashBookId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!cashBookId) {
      return NextResponse.json(
        { error: 'cashBookId is required' },
        { status: 400 }
      );
    }

    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    const entries = await getCashBookEntries(cashBookId)(startDateObj, endDateObj);
    return NextResponse.json({ 
      success: true, 
      data: entries 
    });
  } catch (error) {
    console.error('Error in GET /api/cashbook/entries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/cashbook/entries - Create cashbook entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      cashBookId,
      date,
      amount,
      type,
      transactionType,
      primaryDescription,
      documentId,
      documentType,
      documentNumber,
      secondaryDescription,
      referenceDescription,
      ledgerReference,
      isOpeningBalance = false
    } = body;

    // Validation
    if (!cashBookId || !date || amount === undefined || !type || !transactionType || !primaryDescription) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['Dr', 'Cr'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be either "Dr" or "Cr"' },
        { status: 400 }
      );
    }

    if (Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Create CashBookEntry instance
    const entry = new CashBookEntry(
      cashBookId,
      new Date(date),
      Number(amount),
      type,
      transactionType,
      primaryDescription,
      undefined, // id will be generated
      documentId,
      documentType,
      documentNumber,
      secondaryDescription,
      referenceDescription,
      ledgerReference,
      isOpeningBalance
    );

    const createdEntry = await createCashBookEntry(entry)();
    
    if (!createdEntry) {
      return NextResponse.json(
        { error: 'Failed to create cashbook entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: createdEntry 
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/cashbook/entries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/cashbook/entries - Update cashbook entry
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      cashBookId,
      date,
      amount,
      type,
      transactionType,
      primaryDescription,
      documentId,
      documentType,
      documentNumber,
      secondaryDescription,
      referenceDescription,
      ledgerReference,
      isOpeningBalance = false
    } = body;

    // Validation
    if (!id) {
      return NextResponse.json(
        { error: 'Entry ID is required for update' },
        { status: 400 }
      );
    }

    if (!cashBookId || !date || amount === undefined || !type || !transactionType || !primaryDescription) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['Dr', 'Cr'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be either "Dr" or "Cr"' },
        { status: 400 }
      );
    }

    if (Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Create CashBookEntry instance
    const entry = new CashBookEntry(
      cashBookId,
      new Date(date),
      Number(amount),
      type,
      transactionType,
      primaryDescription,
      id,
      documentId,
      documentType,
      documentNumber,
      secondaryDescription,
      referenceDescription,
      ledgerReference,
      isOpeningBalance
    );

    const updatedEntry = await updateCashBookEntry(entry)();
    
    if (!updatedEntry) {
      return NextResponse.json(
        { error: 'Failed to update cashbook entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedEntry 
    });
  } catch (error) {
    console.error('Error in PUT /api/cashbook/entries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/cashbook/entries - Delete cashbook entry(s)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');
    const documentId = searchParams.get('documentId');
    const documentType = searchParams.get('documentType'); // Optional

    // Must provide either entryId or documentId
    if (!entryId && !documentId) {
      return NextResponse.json(
        { error: 'Either entryId or documentId is required' },
        { status: 400 }
      );
    }

    let success = false;
    let deletedCount = 0;

    if (entryId) {
      // Delete single entry by ID
      success = await deleteCashBookEntry(entryId)();
      deletedCount = success ? 1 : 0;
      
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to delete cashbook entry' },
          { status: 500 }
        );
      }
    } else if (documentId) {
      // Delete entries by document reference
      
      // First, get the entries to count them
      const existingEntries = await getCashBookEntriesByDocument(documentId, documentType || undefined)();
      deletedCount = existingEntries.length;
      
      if (deletedCount === 0) {
        return NextResponse.json({
          success: true,
          message: 'No entries found for the specified document',
          deletedCount: 0
        });
      }
      
      success = await deleteCashBookEntriesByDocument(documentId, documentType || undefined)();
      
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to delete cashbook entries by document' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ 
      success: true,
      message: entryId 
        ? 'Entry deleted successfully' 
        : `${deletedCount} entries deleted for document`,
      deletedCount
    });
  } catch (error) {
    console.error('Error in DELETE /api/cashbook/entries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
