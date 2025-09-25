
// app/api/payment-documents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPaymentDocumentById } from '@/server/features/Payment/infrastructure/persistence/paymentDocumentSupabase';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Payment document ID is required' },
        { status: 400 }
      );
    }

    const paymentDocument = await getPaymentDocumentById(id);

    if (!paymentDocument) {
      return NextResponse.json(
        { error: 'Payment document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: paymentDocument
    });

  } catch (error) {
    console.error('Error fetching payment document:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch payment document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
