
import { NextRequest, NextResponse } from "next/server";
import { validatePaymentAmount } from '@/server/features/Payment/infrastructure/persistence/paymentDocumentSupabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const documentType = searchParams.get('documentType');
    const fpoId = searchParams.get('fpoId');
    const paymentAmount = parseFloat(searchParams.get('paymentAmount') || '0');

    if (!documentId || !documentType || !fpoId) {
      return NextResponse.json(
        { error: 'Document ID, document type, and FPO ID are required' },
        { status: 400 }
      );
    }

    if (paymentAmount <= 0) {
      return NextResponse.json(
        { error: 'Payment amount must be greater than 0' },
        { status: 400 }
      );
    }

    const validation = await validatePaymentAmount(documentId, documentType, fpoId, paymentAmount);
    
    return NextResponse.json({
      success: true,
      data: validation
    });

  } catch (error) {
    console.error('Error validating payment amount:', error);
    return NextResponse.json(
      { 
        error: 'Failed to validate payment amount',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}