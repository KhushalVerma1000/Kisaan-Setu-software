
// @/app/api/vouchers/generate-number/route.ts
import { NextRequest } from 'next/server';
import { generateVoucherNumber } from '@/server/features/vouchers/infrastructure/persistence/voucherSupabase';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const fpoId = searchParams.get('fpoId');
        const voucherType = searchParams.get('voucherType') as 'payment' | 'receipt' | 'contra' | 'journal';
        const date = searchParams.get('date');

        if (!fpoId || !voucherType || !date) {
            return Response.json(
                { error: 'FPO ID, voucher type, and date are required' },
                { status: 400 }
            );
        }

        const voucherNumber = await generateVoucherNumber(
            fpoId,
            voucherType,
            new Date(date)
        );
        
        return Response.json({ data: { voucherNumber }, success: true });

    } catch (error) {
        console.error('Error in GET /api/vouchers/generate-number:', error);
        return Response.json(
            { error: 'Failed to generate voucher number', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}