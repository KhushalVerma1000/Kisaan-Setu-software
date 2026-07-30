
import { NextRequest, NextResponse } from "next/server";
import { getPurchaseVouchersBySupplier } from '@/server/features/purchase/infrastructure/persistence/purchaseVoucherSupabase';

// GET /api/purchase-vouchers/supplier/[supplierId]
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ supplierId: string }> }
) {
    try {
        const { supplierId } = await params;
        const { searchParams } = new URL(request.url);
        const fpoId = searchParams.get('fpoId');
        
        if (!supplierId) {
            return NextResponse.json(
                { error: 'Supplier ID is required' },
                { status: 400 }
            );
        }

        if (!fpoId) {
            return NextResponse.json(
                { error: 'FPO ID is required' },
                { status: 400 }
            );
        }

        const vouchers = await getPurchaseVouchersBySupplier(fpoId, supplierId);
        return NextResponse.json({ data: vouchers });

    } catch (error) {
        console.error('Error in GET /api/purchase-vouchers/supplier/[supplierId]:', error);
        return NextResponse.json(
            { error: 'Failed to fetch purchase vouchers by supplier' },
            { status: 500 }
        );
    }
}
