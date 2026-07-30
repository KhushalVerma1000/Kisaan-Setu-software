import { NextRequest, NextResponse } from "next/server";
import { getAllPaymentDocuments } from '@/server/features/Payment/infrastructure/persistence/paymentDocumentSupabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fpoId = searchParams.get('fpoId');

    if (!fpoId) {
      return NextResponse.json(
        { error: 'FPO ID is required' },
        { status: 400 }
      );
    }

    const paymentDocuments = await getAllPaymentDocuments(fpoId);
    
    return NextResponse.json({
      success: true,
      data: paymentDocuments,
      count: paymentDocuments.length
    });

  } catch (error) {
    console.error('Error fetching payment documents:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch payment documents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


