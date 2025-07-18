
// app/api/purchase-vouchers/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PurchaseVoucher } from '@/server/features/purchase/core/entities/PurchaseVoucher';

// POST /api/purchase-vouchers/validate
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        if (!body) {
            return NextResponse.json(
                { error: 'Request body is required' },
                { status: 400 }
            );
        }

        const voucher = PurchaseVoucher.fromInterface(body);
        const validation = voucher.validate();

        return NextResponse.json({ 
            data: validation,
            message: validation.isValid ? 'Validation successful' : 'Validation failed'
        });

    } catch (error) {
        console.error('Error in POST /api/purchase-vouchers/validate:', error);
        return NextResponse.json(
            { error: 'Failed to validate purchase voucher' },
            { status: 500 }
        );
    }
}
