// app/api/payments/[paymentId]/reverse/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
    reverseAnyPayment,
    PaymentReversalRequest 
} from '@/server/services/ApplicationServices/paymentService/paymentApplicationService';

interface RouteParams {
    params: {
        paymentId: string;
    };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { paymentId } = params;
        const body = await request.json();

        // Validate required fields
        if (!paymentId) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'Payment ID is required' 
                },
                { status: 400 }
            );
        }

        if (!body.reason) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'Reversal reason is required' 
                },
                { status: 400 }
            );
        }

        const { reason, partyLedgerName } = body;

        // Reverse the payment
        const result = await reverseAnyPayment(
            paymentId,
            reason,
            partyLedgerName
        );

        if (!result.success) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'Payment reversal failed',
                    errors: result.errors 
                },
                { status: 422 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                payment: result.payment,
                paymentDocument: result.paymentDocument,
                ledgerEntry: result.ledgerEntry,
                cashbookEntry: result.cashbookEntry,
                bankbookEntry: result.bankbookEntry,
                operationDetails: result.operationDetails
            }
        });

    } catch (error) {
        console.error('Payment reversal API error:', error);
        
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : 'Internal server error' 
            },
            { status: 500 }
        );
    }
}