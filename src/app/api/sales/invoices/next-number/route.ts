
import { NextRequest, NextResponse } from "next/server";
import { getNextInvoiceNumber } from '@/server/features/sales/invoice/infrastructure/persistence/inviceSupabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fpoId = searchParams.get('fpoId');
    const prefix = searchParams.get('prefix') || 'INV';
    
    if (!fpoId) {
      return NextResponse.json(
        { error: 'FPO ID is required' },
        { status: 400 }
      );
    }

    const nextNumber = await getNextInvoiceNumber(fpoId, prefix)();
    
    return NextResponse.json({ nextNumber });
  } catch (error) {
    console.error('Error getting next invoice number:', error);
    return NextResponse.json(
      { error: 'Failed to get next invoice number' },
      { status: 500 }
    );
  }
}