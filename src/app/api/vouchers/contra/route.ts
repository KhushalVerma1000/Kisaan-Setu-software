
// @/app/api/vouchers/contra/route.ts
import { NextRequest } from 'next/server';
import { createContraVoucherWithEntries } from '@/server/features/vouchers/infrastructure/persistence/voucherSupabase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        const requiredFields = ['date', 'fpoId', 'description', 'fromAccount', 'toAccount', 'amount'];
        for (const field of requiredFields) {
            if (!body[field]) {
                return Response.json(
                    { error: `${field} is required` },
                    { status: 400 }
                );
            }
        }

        if (body.fromAccount === body.toAccount) {
            return Response.json(
                { error: 'From and To accounts cannot be the same' },
                { status: 400 }
            );
        }

        const result = await createContraVoucherWithEntries({
            voucherNumber: body.voucherNumber,
            date: new Date(body.date),
            fpoId: body.fpoId,
            description: body.description,
            fromAccount: body.fromAccount,
            toAccount: body.toAccount,
            amount: body.amount,
            fromCashBookId: body.fromCashBookId,
            fromBankBookId: body.fromBankBookId,
            toCashBookId: body.toCashBookId,
            toBankBookId: body.toBankBookId,
            notes: body.notes
        });
        
        return Response.json({ data: result, success: true }, { status: 201 });

    } catch (error) {
        console.error('Error in POST /api/vouchers/contra:', error);
        return Response.json(
            { error: 'Failed to create contra voucher', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
