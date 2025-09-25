
// app/api/payments/batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PaymentApplicationService } from '@/server/services/ApplicationServices/paymentService/paymentApplicationService';

const paymentService = new PaymentApplicationService();

export async function POST(request: NextRequest) {
  try {
    const { payments } = await request.json();

    if (!Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Payments array is required and cannot be empty' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < payments.length; i++) {
      try {
        const { paymentInput, documentInput } = payments[i];
        const result = await paymentService.processPayment(paymentInput, documentInput);
        results.push({ index: i, success: true, data: result });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ index: i, success: false, error: errorMessage });
        results.push({ index: i, success: false, error: errorMessage });
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: { results, summary: { total: payments.length, successful: results.filter(r => r.success).length, failed: errors.length } }
    });
  } catch (error) {
    console.error('Batch payment API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}
