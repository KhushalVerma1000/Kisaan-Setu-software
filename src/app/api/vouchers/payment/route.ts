
// @/app/api/vouchers/payment/route.ts
import { NextRequest } from 'next/server';
import { createPaymentVoucherWithEntries } from '@/server/features/vouchers/infrastructure/persistence/voucherSupabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        const requiredFields = ['date', 'fpoId', 'description', 'paymentMode', 'entries'];
        for (const field of requiredFields) {
            if (!body[field]) {
                return Response.json(
                    { error: `${field} is required` },
                    { status: 400 }
                );
            }
        }

        if (body.paymentMode === 'cash' && !body.cashBookId) {
            return Response.json(
                { error: 'Cash book ID is required for cash payments' },
                { status: 400 }
            );
        }

        if (body.paymentMode === 'bank' && !body.bankBookId) {
            return Response.json(
                { error: 'Bank book ID is required for bank payments' },
                { status: 400 }
            );
        }

        const result = await createPaymentVoucherWithEntries({
            voucherNumber: body.voucherNumber,
            date: new Date(body.date),
            fpoId: body.fpoId,
            description: body.description,
            paymentMode: body.paymentMode,
            cashBookId: body.cashBookId,
            bankBookId: body.bankBookId,
            chequeNumber: body.chequeNumber,
            chequeDate: body.chequeDate ? new Date(body.chequeDate) : undefined,
            notes: body.notes,
            entries: body.entries
        });
        
        return Response.json({ data: result, success: true }, { status: 201 });

    } catch (error) {
        console.error('Error in POST /api/vouchers/payment:', error);
        return Response.json(
            { error: 'Failed to create payment voucher', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
