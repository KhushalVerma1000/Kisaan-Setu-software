
// app/api/bank-books/[bankBookId]/entries/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { BankBookEntry, createBankBookEntry } from '@/server/features/bankbookSystm/core/entities/BankBookSystem';
import { 
  getBankBookEntries, 
  createBankBookEntry as createEntry,
  createMultipleBankBookEntries 
} from '@/server/features/bankbookSystm/infrastructure/persistence/BankBookEntrySystem';

interface BankBookEntriesRouteParams {
  params: Promise<{
    bankBookId: string;
  }>;
}

// GET /api/bank-books/[bankBookId]/entries - Get bank book entries
export async function GET(request: NextRequest, { params }: BankBookEntriesRouteParams) {
  try {
    const { bankBookId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const getEntries = getBankBookEntries(bankBookId);
    const entries = await getEntries(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    return NextResponse.json({
      success: true,
      data: entries,
      message: 'Bank book entries retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching bank book entries:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch bank book entries',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/bank-books/[bankBookId]/entries - Create bank book entry or entries
export async function POST(request: NextRequest, { params }: BankBookEntriesRouteParams) {
  try {
    const { bankBookId } = await params;
    const body = await request.json();
    
    // Check if it's a bulk operation
    const isBulk = Array.isArray(body.entries);
    
    if (isBulk) {
      // Bulk create entries
      const entriesData = body.entries;
      
      const entries = entriesData.map((entryData: any) => 
        createBankBookEntry({
          bankBookId,
          amount: parseFloat(entryData.amount),
          type: entryData.type,
          date: new Date(entryData.date),
          transactionType: entryData.transactionType,
          paymentMethod: entryData.paymentMethod,
          partyName: entryData.partyName,
          documentNumber: entryData.documentNumber,
          additionalInfo: entryData.additionalInfo,
          relatedLedgerName: entryData.relatedLedgerName,
          chequeNumber: entryData.chequeNumber,
          referenceNumber: entryData.referenceNumber,
          documentId: entryData.documentId,
          documentType: entryData.documentType
        })
      );

      const createMultiple = createMultipleBankBookEntries(entries);
      const result = await createMultiple();

      return NextResponse.json({
        success: true,
        data: result,
        message: `${result.length} bank book entries created successfully`
      }, { status: 201 });
      
    } else {
      // Single entry create
      const { 
        amount, 
        type, 
        date, 
        transactionType, 
        paymentMethod,
        partyName,
        documentNumber,
        additionalInfo,
        relatedLedgerName,
        chequeNumber,
        referenceNumber,
        documentId,
        documentType
      } = body;

      // Validate required fields
      if (!amount || !type || !date || !transactionType) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Missing required fields',
            message: 'amount, type, date, and transactionType are required'
          },
          { status: 400 }
        );
      }

      const entry = createBankBookEntry({
        bankBookId,
        amount: parseFloat(amount),
        type,
        date: new Date(date),
        transactionType,
        paymentMethod,
        partyName,
        documentNumber,
        additionalInfo,
        relatedLedgerName,
        chequeNumber,
        referenceNumber,
        documentId,
        documentType
      });

      const createSingle = createEntry(entry);
      const result = await createSingle();

      if (!result) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to create bank book entry',
            message: 'Bank book entry creation failed'
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result,
        message: 'Bank book entry created successfully'
      }, { status: 201 });
    }

  } catch (error) {
    console.error('Error creating bank book entry:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create bank book entry',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
