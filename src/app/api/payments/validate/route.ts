// app/api/payments/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PaymentApplicationService } from '@/server/services/ApplicationServices/paymentService/paymentApplicationService';
import { PaymentType, PaymentMethod } from '@/server/features/Payment/core/entities/Payment';


interface ValidatePaymentRequest {
    documentId: string;
    documentType: string;
    fpoId: string;
    paymentAmount: number;
}

export async function POST(request: NextRequest) {
    try {
        const body: ValidatePaymentRequest = await request.json();

        if (!body.documentId || !body.documentType || !body.fpoId || body.paymentAmount === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields: documentId, documentType, fpoId, paymentAmount' },
                { status: 400 }
            );
        }

        if (body.paymentAmount === 0) {
            return NextResponse.json(
                { error: 'Payment amount cannot be zero' },
                { status: 400 }
            );
        }

        const paymentService = new PaymentApplicationService();
        const validation = await paymentService.validatePaymentDocument(
            body.documentId,
            body.documentType,
            body.fpoId,
            body.paymentAmount
        );

        return NextResponse.json({
            success: true,
            data: {
                isValid: validation.isValid,
                remainingAmount: validation.remainingAmount,
                errorMessage: validation.errorMessage,
                paymentDocument: validation.paymentDocument ? {
                    id: validation.paymentDocument.id,
                    documentNumber: validation.paymentDocument.documentNumber,
                    totalDocumentAmount: validation.paymentDocument.totalDocumentAmount,
                    totalPaidAmount: validation.paymentDocument.totalPaidAmount,
                    paymentStatus: validation.paymentDocument.paymentStatus,
                    isFullyPaid: validation.paymentDocument.isFullyPaid()
                } : null
            }
        });

    } catch (error) {
        console.error('Payment validation error:', error);
        return NextResponse.json(
            { error: 'Internal server error while validating payment' },
            { status: 500 }
        );
    }
}