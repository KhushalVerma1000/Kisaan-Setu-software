// app/api/payments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PaymentApplicationService } from '@/server/services/ApplicationServices/paymentService/paymentApplicationService';

const paymentService = new PaymentApplicationService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'processPayment':
        const { paymentInput, documentInput } = data;
        const result = await paymentService.processPayment(paymentInput, documentInput);
        return NextResponse.json({ success: true, data: result });

      case 'validatePaymentDocument':
        const { documentId, documentType, fpoId, paymentAmount } = data;
        const validation = await paymentService.validatePaymentDocument(
          documentId,
          documentType,
          fpoId,
          paymentAmount
        );
        return NextResponse.json({ success: true, data: validation });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Payment API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    const paymentDetails = await paymentService.getPaymentDetails(paymentId);
    
    if (!paymentDetails) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: paymentDetails });
  } catch (error) {
    console.error('Payment API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}