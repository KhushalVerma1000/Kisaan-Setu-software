
import { NextRequest, NextResponse } from "next/server";
import { 
    getPurchaseVoucherById,
    updatePurchaseVoucher,
    deletePurchaseVoucher,
    updatePurchaseVoucherStatus
} from '@/server/features/purchase/infrastructure/persistence/purchaseVoucherSupabase';

// GET /api/purchase-vouchers/[id]
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        
        if (!id) {
            return NextResponse.json(
                { error: 'Voucher ID is required' },
                { status: 400 }
            );
        }

        const voucher = await getPurchaseVoucherById(id);
        
        if (!voucher) {
            return NextResponse.json(
                { error: 'Purchase voucher not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: voucher });

    } catch (error) {
        console.error('Error in GET /api/purchase-vouchers/[id]:', error);
        return NextResponse.json(
            { error: 'Failed to fetch purchase voucher' },
            { status: 500 }
        );
    }
}

// PUT /api/purchase-vouchers/[id]
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        
        if (!id) {
            return NextResponse.json(
                { error: 'Voucher ID is required' },
                { status: 400 }
            );
        }

        if (!body) {
            return NextResponse.json(
                { error: 'Request body is required' },
                { status: 400 }
            );
        }

        const voucher = await updatePurchaseVoucher(id, body);
        return NextResponse.json({ 
            data: voucher,
            message: 'Purchase voucher updated successfully'
        });

    } catch (error) {
        console.error('Error in PUT /api/purchase-vouchers/[id]:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update purchase voucher' },
            { status: 500 }
        );
    }
}

// DELETE /api/purchase-vouchers/[id]
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        
        if (!id) {
            return NextResponse.json(
                { error: 'Voucher ID is required' },
                { status: 400 }
            );
        }

        await deletePurchaseVoucher(id);
        return NextResponse.json({ 
            message: 'Purchase voucher deleted successfully'
        });

    } catch (error) {
        console.error('Error in DELETE /api/purchase-vouchers/[id]:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete purchase voucher' },
            { status: 500 }
        );
    }
}

// PATCH /api/purchase-vouchers/[id] (status update)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        
        if (!id) {
            return NextResponse.json(
                { error: 'Voucher ID is required' },
                { status: 400 }
            );
        }

        if (!body.status) {
            return NextResponse.json(
                { error: 'Status is required' },
                { status: 400 }
            );
        }

        const validStatuses = ['draft', 'approved', 'rejected'];
        if (!validStatuses.includes(body.status)) {
            return NextResponse.json(
                { error: 'Invalid status. Must be one of: draft, approved, rejected' },
                { status: 400 }
            );
        }

        const voucher = await updatePurchaseVoucherStatus(id, body.status);
        return NextResponse.json({ 
            data: voucher,
            message: `Purchase voucher status updated to ${body.status}`
        });

    } catch (error) {
        console.error('Error in PATCH /api/purchase-vouchers/[id]:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update purchase voucher status' },
            { status: 500 }
        );
    }
}
