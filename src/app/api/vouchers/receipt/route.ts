
// @/app/api/vouchers/receipt/route.ts
import { NextRequest } from 'next/server';
import { createReceiptVoucherWithEntries } from '@/server/features/vouchers/infrastructure/persistence/voucherSupabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        const requiredFields = ['date', 'fpoId', 'description', 'receiptMode', 'entries'];
        for (const field of requiredFields) {
            if (!body[field]) {
                return Response.json(
                    { error: `${field} is required` },
                    { status: 400 }
                );
            }
        }

        if (body.receiptMode === 'cash' && !body.cashBookId) {
            return Response.json(
                { error: 'Cash book ID is required for cash receipts' },
                { status: 400 }
            );
        }

        if (body.receiptMode === 'bank' && !body.bankBookId) {
            return Response.json(
                { error: 'Bank book ID is required for bank receipts' },
                { status: 400 }
            );
        }

        const result = await createReceiptVoucherWithEntries({
            voucherNumber: body.voucherNumber,
            date: new Date(body.date),
            fpoId: body.fpoId,
            description: body.description,
            receiptMode: body.receiptMode,
            cashBookId: body.cashBookId,
            bankBookId: body.bankBookId,
            chequeNumber: body.chequeNumber,
            chequeDate: body.chequeDate ? new Date(body.chequeDate) : undefined,
            notes: body.notes,
            entries: body.entries
        });
        
        return Response.json({ data: result, success: true }, { status: 201 });

    } catch (error) {
        console.error('Error in POST /api/vouchers/receipt:', error);
        return Response.json(
            { error: 'Failed to create receipt voucher', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
