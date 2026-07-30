import { NextRequest, NextResponse } from "next/server";
import { 
    getAllFpoPurchaseVouchers, 
    createPurchaseVoucher, 
    searchPurchaseVouchers,
    getPurchaseVoucherStats,
    getPurchaseVouchersByStatus,
    getPurchaseVouchersByDateRange,
    bulkDeletePurchaseVouchers
} from '@/server/features/purchase/infrastructure/persistence/purchaseVoucherSupabase';

// GET /api/purchase-vouchers
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const fpoId = searchParams.get('fpoId');
        const search = searchParams.get('search');
        const status = searchParams.get('status') as 'draft' | 'approved' | 'rejected';
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const stats = searchParams.get('stats');

        if (!fpoId) {
            return NextResponse.json(
                { error: 'FPO ID is required' },
                { status: 400 }
            );
        }

        // Get statistics
        if (stats === 'true') {
            const statistics = await getPurchaseVoucherStats(fpoId);
            return NextResponse.json({ data: statistics });
        }

        // Search vouchers
        if (search) {
            const vouchers = await searchPurchaseVouchers(fpoId, search);
            return NextResponse.json({ data: vouchers });
        }

        // Filter by status
        if (status) {
            const vouchers = await getPurchaseVouchersByStatus(fpoId, status);
            return NextResponse.json({ data: vouchers });
        }

        // Filter by date range
        if (startDate && endDate) {
            const vouchers = await getPurchaseVouchersByDateRange(
                fpoId, 
                new Date(startDate), 
                new Date(endDate)
            );
            return NextResponse.json({ data: vouchers });
        }

        // Get all vouchers for FPO
        const vouchers = await getAllFpoPurchaseVouchers(fpoId);
        // console.log(vouchers)
        return NextResponse.json({ data: vouchers });

    } catch (error) {
        console.error('Error in GET /api/purchase-vouchers:', error);
        return NextResponse.json(
            { error: 'Failed to fetch purchase vouchers' },
            { status: 500 }
        );
    }
}

// POST /api/purchase-vouchers
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        if (!body) {
            return NextResponse.json(
                { error: 'Request body is required' },
                { status: 400 }
            );
        }

        const voucher = await createPurchaseVoucher(body);
        console.log("vocuher created =========================================",voucher)
        return NextResponse.json({ 
             voucher,
            message: 'Purchase voucher created successfully'
        }, { status: 201 });

    } catch (error) {
        console.error('Error in POST /api/purchase-vouchers:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create purchase voucher' },
            { status: 500 }
        );
    }
}

// DELETE /api/purchase-vouchers (bulk delete)
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const idsParam = searchParams.get('ids');

        if (!idsParam) {
            return NextResponse.json(
                { error: 'Voucher IDs are required' },
                { status: 400 }
            );
        }

        const voucherIds = idsParam.split(',').map(id => id.trim());
        
        if (voucherIds.length === 0) {
            return NextResponse.json(
                { error: 'At least one voucher ID is required' },
                { status: 400 }
            );
        }

        await bulkDeletePurchaseVouchers(voucherIds);
        return NextResponse.json({ 
            message: `${voucherIds.length} purchase vouchers deleted successfully`
        });

    } catch (error) {
        console.error('Error in DELETE /api/purchase-vouchers:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete purchase vouchers' },
            { status: 500 }
        );
    }
}

