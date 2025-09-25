import { NextRequest, NextResponse } from 'next/server';
import { PaymentApplicationService } from '@/server/services/ApplicationServices/paymentService/paymentApplicationService';
import { PaymentType, PaymentMethod } from '@/server/features/Payment/core/entities/Payment';



// app/api/payments/[paymentId]/route.ts
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ paymentId: string }> }
) {
    try {
        const { paymentId } = await params;

        if (!paymentId) {
            return NextResponse.json(
                { error: 'Payment ID is required' },
                { status: 400 }
            );
        }

        const paymentService = new PaymentApplicationService();
        const paymentDetails = await paymentService.getPaymentDetails(paymentId);

        if (!paymentDetails) {
            return NextResponse.json(
                { error: 'Payment not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                payment: {
                    id: paymentDetails.payment.id,
                    amount: paymentDetails.payment.amount,
                    method: paymentDetails.payment.method,
                    type: paymentDetails.payment.type,
                    date: paymentDetails.payment.date,
                    paymentStatus: paymentDetails.payment.paymentStatus,
                    notes: paymentDetails.payment.notes,
                    referenceNumber: paymentDetails.payment.referenceNumber,
                    cashbookId: paymentDetails.payment.cashbookId,
                    bankbookId: paymentDetails.payment.bankbookId,
                    createdAt: paymentDetails.payment.createdAt,
                    updatedAt: paymentDetails.payment.updatedAt,
                    isReversalPayment: paymentDetails.payment.isReversalPayment(),
                    isReversed: paymentDetails.payment.isReversed(),
                    canBeReversed: paymentDetails.payment.canBeReversed()
                },
                paymentDocument: {
                    id: paymentDetails.paymentDocument.id,
                    documentId: paymentDetails.paymentDocument.documentId,
                    documentNumber: paymentDetails.paymentDocument.documentNumber,
                    documentType: paymentDetails.paymentDocument.documentType,
                    totalDocumentAmount: paymentDetails.paymentDocument.totalDocumentAmount,
                    totalPaidAmount: paymentDetails.paymentDocument.totalPaidAmount,
                    paymentStatus: paymentDetails.paymentDocument.paymentStatus,
                    remainingAmount: paymentDetails.paymentDocument.calculateRemainingAmount(),
                    isFullyPaid: paymentDetails.paymentDocument.isFullyPaid()
                },
                partyName: paymentDetails.partyName
            }
        });

    } catch (error) {
        console.error('Error fetching payment details:', error);
        return NextResponse.json(
            { error: 'Internal server error while fetching payment details' },
            { status: 500 }
        );
    }
}

// app/api/payments/[paymentId]/reverse/route.ts
interface ReversePaymentRequest {
    reason: string;
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ paymentId: string }> }
) {
    try {
        const { paymentId } = await params;
        const body: ReversePaymentRequest = await request.json();

        if (!paymentId) {
            return NextResponse.json(
                { error: 'Payment ID is required' },
                { status: 400 }
            );
        }

        if (!body.reason || body.reason.trim() === '') {
            return NextResponse.json(
                { error: 'Reversal reason is required' },
                { status: 400 }
            );
        }

        const paymentService = new PaymentApplicationService();
        const result = await paymentService.processPaymentReversal(paymentId, body.reason.trim());

        return NextResponse.json({
            success: true,
            data: {
                originalPaymentId: result.originalPayment.id,
                reversalPaymentId: result.reversalPayment.id,
                reversalAmount: result.reversalPayment.amount,
                reversalReason: result.reversalReason,
                documentStatus: result.paymentDocument.paymentStatus,
                previousPaidAmount: result.previousPaidAmount,
                newPaidAmount: result.newPaidAmount,
                remainingAmount: result.remainingAmount,
                statusChanged: result.statusChanged,
                partyName: result.partyName,
                reversalDate: result.reversalPayment.date,
                reversalLedgerEntryId: result.reversalLedgerEntry.id,
                reversalCashBookEntryId: result.reversalCashBookEntry?.id,
                reversalBankBookEntryId: result.reversalBankBookEntry?.id
            }
        });

    } catch (error) {
        console.error('Payment reversal error:', error);
        
        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return NextResponse.json(
                    { error: 'Payment not found' },
                    { status: 404 }
                );
            }
            
            if (error.message.includes('cannot be reversed')) {
                return NextResponse.json(
                    { error: error.message },
                    { status: 400 }
                );
            }
        }

        return NextResponse.json(
            { error: 'Internal server error while reversing payment' },
            { status: 500 }
        );
    }
}
