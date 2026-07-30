import { createClient } from "@/utils/supabase/server";
import { Payment, PaymentInterface } from "../../core/entities/Payment";
import { PaymentDocument, PaymentDocumentInterface } from "../../core/entities/PaymentDocument";
import { 
    getPaymentDocumentByDocument, 
    getPaymentDocumentById,
    updatePaymentDocument
} from './paymentDocumentSupabase'; 


// Return type for payment operations - simplified without integration data
export interface PaymentOperationResult {
    payment: Payment;
    paymentDocument: PaymentDocument;
    previousPaidAmount: number;
    newPaidAmount: number;
    remainingAmount: number;
    statusChanged: boolean;
}

// Create a new payment with document tracking

// Return type for payment operations - simplified without integration data
export interface PaymentOperationResult {
    payment: Payment;
    paymentDocument: PaymentDocument;
    previousPaidAmount: number;
    newPaidAmount: number;
    remainingAmount: number;
    statusChanged: boolean;
}

// Create a new payment with document tracking
export async function createPayment( 
    paymentData: PaymentInterface,
    supabaseClient?: any // Optional client for transaction context
): Promise<PaymentOperationResult> {
    // Use provided client or create new one
    const supabase = supabaseClient || (await createClient());
    
    try {
        console.log(`Creating payment for payment document ${paymentData.paymentDocumentId}, amount: ${paymentData.amount}`);

        // Step 1: Get PaymentDocument record using the paymentDocumentId from PaymentInterface
        const paymentDocument = await getPaymentDocumentById(paymentData.paymentDocumentId, supabaseClient);
        
        if (!paymentDocument) {
            throw new Error(`Payment document not found: ${paymentData.paymentDocumentId}`);
        }

        console.log(`Found payment document for ${paymentDocument.documentType} ${paymentDocument.documentId}`);

        // Step 2: Validate payment amount
        if (!paymentDocument.canAcceptPayment(Math.abs(paymentData.amount))) {
            throw new Error(
                `Payment amount ${paymentData.amount} would cause overpayment. ` +
                `Remaining: ${paymentDocument.calculateRemainingAmount()}`
            );
        }

        // Step 3: Create payment record
        const newPayment = Payment.fromInterface(paymentData);

        const { data: paymentDbData, error: paymentError } = await supabase
            .from('payments')
            .insert(newPayment.toDbFormat())
            .select()
            .single();

        if (paymentError) {
            console.error("Error creating payment:", paymentError);
            throw new Error(`Failed to create payment: ${paymentError.message}`);
        }

        const createdPayment = Payment.fromDbFormat(paymentDbData);
        console.log(`Created payment: ${createdPayment.id}`);

        // Step 4: Update payment document totals
        const previousPaidAmount = paymentDocument.totalPaidAmount;
        const newPaidAmount = previousPaidAmount + Math.abs(paymentData.amount);
        
        const previousStatus = paymentDocument.paymentStatus;
        const newStatus = newPaidAmount === 0 ? 'pending' as const : 
                         newPaidAmount < paymentDocument.totalDocumentAmount ? 'partial' as const : 'completed' as const;
        
        const statusChanged = newStatus !== previousStatus;

        const updatedPaymentDocument = await updatePaymentDocument(
            paymentDocument.id!, 
            {
                totalPaidAmount: newPaidAmount,
                paymentStatus: newStatus
            },
            supabaseClient // Pass the client to maintain transaction context
        );

        console.log(`Updated payment document status to: ${updatedPaymentDocument.paymentStatus} for ${paymentDocument.documentType} ${paymentDocument.documentId}`);

        return {
            payment: createdPayment,
            paymentDocument: updatedPaymentDocument,
            previousPaidAmount,
            newPaidAmount,
            remainingAmount: updatedPaymentDocument.calculateRemainingAmount(),
            statusChanged
        };

    } catch (error) {
        console.error('Error in createPayment:', error);
        throw error;
    }
}

// Reverse an existing payment
export async function reversePayment(
    paymentId: string, 
    reason: string,
    supabaseClient?: any // Optional client for transaction context
): Promise<PaymentOperationResult> {
    // Use provided client or create new one
    const supabase = supabaseClient || (await createClient());
    
    try {
        console.log(`Reversing payment: ${paymentId}, reason: ${reason}`);

        // Step 1: Get original payment
        const originalPayment = await getPaymentById(paymentId, supabaseClient);
        if (!originalPayment) {
            throw new Error('Payment not found');
        }

        if (!originalPayment.canBeReversed()) {
            throw new Error('Payment cannot be reversed (either not active or too old)');
        }

        // Step 2: Mark original payment as reversed
        const { error: updateError } = await supabase
            .from('payments')
            .update({
                payment_status: 'reversed',
                updated_at: new Date()
            })
            .eq('id', paymentId);

        if (updateError) {
            console.error("Error marking payment as reversed:", updateError);
            throw new Error(`Failed to mark payment as reversed: ${updateError.message}`);
        }

        // Step 3: Create reversal payment record (negative amount)
        const reversalPaymentData: PaymentInterface = {
            paymentDocumentId: originalPayment.paymentDocumentId,
            type: originalPayment.type,
            method: originalPayment.method,
            amount: -Math.abs(originalPayment.amount), // Negative amount
            date: new Date(),
            partyLedgerAccountId: originalPayment.partyLedgerAccountId,
            cashbookId: originalPayment.cashbookId,
            bankbookId: originalPayment.bankbookId,
            notes: `Reversal: ${originalPayment.notes || 'Payment'} - ${reason}`,
            referenceNumber: originalPayment.referenceNumber,
            paymentStatus: 'active',
            reversalPaymentId: paymentId,
            fpoId: originalPayment.fpoId
        };

        const reversalPayment = Payment.fromInterface(reversalPaymentData);

        const { data: reversalDbData, error: reversalError } = await supabase
            .from('payments')
            .insert(reversalPayment.toDbFormat())
            .select()
            .single();

        if (reversalError) {
            console.error("Error creating reversal payment:", reversalError);
            throw new Error(`Failed to create reversal payment: ${reversalError.message}`);
        }

        const createdReversalPayment = Payment.fromDbFormat(reversalDbData);
        console.log(`Created reversal payment: ${createdReversalPayment.id}`);

        // Step 4: Update payment document totals
        const paymentDocument = await getPaymentDocumentById(originalPayment.paymentDocumentId, supabaseClient);
        if (!paymentDocument) {
            throw new Error('Payment document not found');
        }

        const previousPaidAmount = paymentDocument.totalPaidAmount;
        const newPaidAmount = Math.max(0, previousPaidAmount - Math.abs(originalPayment.amount));
        
        const previousStatus = paymentDocument.paymentStatus;
        const newStatus = newPaidAmount === 0 ? 'pending' as const : 
                         newPaidAmount < paymentDocument.totalDocumentAmount ? 'partial' as const : 'completed' as const;
        
        const statusChanged = newStatus !== previousStatus;

        const updatedPaymentDocument = await updatePaymentDocument(
            paymentDocument.id!, 
            {
                totalPaidAmount: newPaidAmount,
                paymentStatus: newStatus
            },
            supabaseClient // Pass the client to maintain transaction context
        );

        console.log(`Updated payment document status after reversal to: ${updatedPaymentDocument.paymentStatus}`);

        return {
            payment: createdReversalPayment,
            paymentDocument: updatedPaymentDocument,
            previousPaidAmount,
            newPaidAmount,
            remainingAmount: updatedPaymentDocument.calculateRemainingAmount(),
            statusChanged
        };

    } catch (error) {
        console.error('Error in reversePayment:', error);
        throw error;
    }
}

// Get payment by ID
export async function getPaymentById(paymentId: string, supabaseClient?: any): Promise<Payment | null> {
    const supabase = supabaseClient || (await createClient());
    
    try {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('id', paymentId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(error.message);
        }

        return Payment.fromDbFormat(data);
    } catch (error) {
        console.error('Error in getPaymentById:', error);
        throw error;
    }
}



// Get all payments for a document
export async function getPaymentsForDocument(
    documentId: string, 
    documentType: string, 
    fpoId: string
): Promise<Payment[]> {
    const supabase = await createClient();
    
    try {
        // First get the payment document
        const paymentDocument = await getPaymentDocumentByDocument(documentId, documentType, fpoId);
        if (!paymentDocument) {
            return [];
        }

        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('payment_document_id', paymentDocument.id)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return data.map(Payment.fromDbFormat);
    } catch (error) {
        console.error('Error in getPaymentsForDocument:', error);
        throw error;
    }
}

// Get only active payments for a document
export async function getActivePaymentsForDocument(
    documentId: string, 
    documentType: string, 
    fpoId: string
): Promise<Payment[]> {
    const supabase = await createClient();
    
    try {
        const paymentDocument = await getPaymentDocumentByDocument(documentId, documentType, fpoId);
        if (!paymentDocument) {
            return [];
        }

        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('payment_document_id', paymentDocument.id)
            .eq('payment_status', 'active')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return data.map(Payment.fromDbFormat);
    } catch (error) {
        console.error('Error in getActivePaymentsForDocument:', error);
        throw error;
    }
}

// Check if document is fully paid
export async function isDocumentFullyPaid(
    documentId: string, 
    documentType: string, 
    fpoId: string
): Promise<{
    isFullyPaid: boolean;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
}> {
    try {
        const paymentDocument = await getPaymentDocumentByDocument(documentId, documentType, fpoId);
        
        if (!paymentDocument) {
            return {
                isFullyPaid: false,
                totalAmount: 0,
                paidAmount: 0,
                remainingAmount: 0
            };
        }

        return {
            isFullyPaid: paymentDocument.isFullyPaid(),
            totalAmount: paymentDocument.totalDocumentAmount,
            paidAmount: paymentDocument.totalPaidAmount,
            remainingAmount: paymentDocument.calculateRemainingAmount()
        };
    } catch (error) {
        console.error('Error in isDocumentFullyPaid:', error);
        throw error;
    }
}
