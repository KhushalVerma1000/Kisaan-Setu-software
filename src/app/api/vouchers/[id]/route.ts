
// @/app/api/vouchers/[id]/route.ts
import { NextRequest } from 'next/server';
import { 
    getVoucherById, 
    updateVoucher, 
    deleteVoucher 
} from '@/server/features/vouchers/infrastructure/persistence/voucherSupabase';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        
        if (!id) {
            return Response.json({ error: 'Voucher ID is required' }, { status: 400 });
        }

        const voucher = await getVoucherById(id);
        
        if (!voucher) {
            return Response.json({ error: 'Voucher not found' }, { status: 404 });
        }

        return Response.json({ data: voucher, success: true });

    } catch (error) {
        console.error('Error in GET /api/vouchers/[id]:', error);
        return Response.json(
            { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        
        if (!id) {
            return Response.json({ error: 'Voucher ID is required' }, { status: 400 });
        }

        if (!body.voucher) {
            return Response.json({ error: 'Voucher data is required' }, { status: 400 });
        }

        const updatedVoucher = await updateVoucher(id, body.voucher);
        
        return Response.json({ data: updatedVoucher, success: true });

    } catch (error) {
        console.error('Error in PUT /api/vouchers/[id]:', error);
        return Response.json(
            { error: 'Failed to update voucher', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        
        if (!id) {
            return Response.json({ error: 'Voucher ID is required' }, { status: 400 });
        }

        const success = await deleteVoucher(id);
        
        if (!success) {
            return Response.json({ error: 'Failed to delete voucher' }, { status: 500 });
        }

        return Response.json({ success: true, message: 'Voucher deleted successfully' });

    } catch (error) {
        console.error('Error in DELETE /api/vouchers/[id]:', error);
        return Response.json(
            { error: 'Failed to delete voucher', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
