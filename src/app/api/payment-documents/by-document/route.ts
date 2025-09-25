// app/api/payment-documents/by-document/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPaymentDocumentByDocument } from '@/server/features/Payment/infrastructure/persistence/paymentDocumentSupabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const documentType = searchParams.get('documentType');
    const fpoId = searchParams.get('fpoId');

    if (!documentId || !documentType || !fpoId) {
      return NextResponse.json(
        { error: 'Document ID, document type, and FPO ID are required' },
        { status: 400 }
      );
    }

    const paymentDocument = await getPaymentDocumentByDocument(
      documentId, 
      documentType, 
      fpoId
    );

    if (!paymentDocument) {
      return NextResponse.json(
        { error: 'Payment document not found' },
        { status: 404 }
      );
    }
console.log(paymentDocument)
    return NextResponse.json({
      success: true,
      data: paymentDocument
    });

  } catch (error) {
    console.error('Error fetching payment document by document:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch payment document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}