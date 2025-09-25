
// app/api/payments/reversal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PaymentApplicationService } from '@/server/services/ApplicationServices/paymentService/paymentApplicationService';

const paymentService = new PaymentApplicationService();

export async function POST(request: NextRequest) {
  try {
    const { paymentId, reason } = await request.json();

    if (!paymentId || !reason) {
      return NextResponse.json(
        { success: false, error: 'Payment ID and reason are required' },
        { status: 400 }
      );
    }

    const result = await paymentService.processPaymentReversal(paymentId, reason);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Payment reversal API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}
