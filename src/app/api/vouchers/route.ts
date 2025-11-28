// @/app/api/vouchers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { VoucherService } from '@/server/features/vouchers/application/VoucherService';

/**
 * GET /api/vouchers
 * Query parameters:
 * - fpoId: string (required)
 * - startDate: string (ISO date, required)
 * - endDate: string (ISO date, required)
 * - voucherType: 'payment' | 'receipt' | 'contra' | 'journal' (optional)
 */
export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const fpoId = searchParams.get('fpoId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const voucherType = searchParams.get('voucherType') as 'payment' | 'receipt' | 'contra' | 'journal' | null;

    // Validate required parameters
    if (!fpoId) {
      return NextResponse.json(
        { success: false, error: 'fpoId is required' },
        { status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Get vouchers for period using VoucherService
    const vouchers = await VoucherService.getVouchersForPeriod({
      fpoId,
      startDate: start,
      endDate: end,
      voucherType: voucherType || undefined
    });
    return NextResponse.json({
      success: true,
      data: vouchers,
      count: vouchers.length
    });

  } catch (error) {
    console.error('Error fetching vouchers:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch vouchers' 
      },
      { status: 500 }
    );
  }
}


