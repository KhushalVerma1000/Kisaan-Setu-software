import { createClient } from "@/utils/supabase/server";
import { PaymentDocument, PaymentDocumentInterface } from "../../core/entities/PaymentDocument";


// Create a new payment document
export async function createPaymentDocument(
    paymentDocumentData: PaymentDocumentInterface
): Promise<PaymentDocument> {
    const supabase = await createClient();
    
    try {
        const newPaymentDoc = PaymentDocument.fromInterface(paymentDocumentData);
        
        const { data, error } = await supabase
            .from('payment_documents')
            .insert(newPaymentDoc.toDbFormat())
            .select()
            .single();

        if (error) {
            console.error("Error creating payment document:", error);
            throw new Error(`Failed to create payment document: ${error.message}`);
        }

        return PaymentDocument.fromDbFormat(data);
    } catch (error) {
        console.error('Error in createPaymentDocument:', error);
        throw error;
    }
}

// Get payment document by ID
export async function getPaymentDocumentById(paymentDocumentId: string, supabaseClient?: any): Promise<PaymentDocument | null> {
    const supabase = supabaseClient || await createClient();

    try {
        const { data, error } = await supabase
            .from('payment_documents')
            .select('*')
            .eq('id', paymentDocumentId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(error.message);
        }

        return PaymentDocument.fromDbFormat(data);
    } catch (error) {
        console.error('Error in getPaymentDocumentById:', error);
        throw error;
    }
}

// Get payment document by document reference (for checking if it exists before payment creation)
export async function getPaymentDocumentByDocument(
    documentId: string, 
    documentType: string, 
    fpoId: string
): Promise<PaymentDocument | null> {
    const supabase = await createClient();
    
    try {
        const { data, error } = await supabase
            .from('payment_documents')
            .select('*')
            .eq('document_id', documentId)
            .eq('document_type', documentType)
            .eq('fpo_id', fpoId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(error.message);
        }

        return PaymentDocument.fromDbFormat(data);
    } catch (error) {
        console.error('Error in getPaymentDocumentByDocument:', error);
        throw error;
    }
}

// Update payment document
export async function updatePaymentDocument(
    paymentDocumentId: string,
    updates: Partial<{
        documentNumber: string; // Added documentNumber to updates (for display purposes)
        totalDocumentAmount: number;
        totalPaidAmount: number;
        paymentStatus: 'pending' | 'partial' | 'completed';
    }>,
    supabaseClient?: any
): Promise<PaymentDocument> {
    const supabase = supabaseClient || await createClient();

    try {
        const updateData: any = {
            updated_at: new Date()
        };

        if (updates.documentNumber !== undefined) {
            updateData.document_number = updates.documentNumber;
        }
        if (updates.totalDocumentAmount !== undefined) {
            updateData.total_document_amount = updates.totalDocumentAmount;
        }
        if (updates.totalPaidAmount !== undefined) {
            updateData.total_paid_amount = updates.totalPaidAmount;
        }
        if (updates.paymentStatus !== undefined) {
            updateData.payment_status = updates.paymentStatus;
        }

        const { data, error } = await supabase
            .from('payment_documents')
            .update(updateData)
            .eq('id', paymentDocumentId)
            .select()
            .single();

        if (error) {
            throw new Error(error.message);
        }

        return PaymentDocument.fromDbFormat(data);
    } catch (error) {
        console.error('Error in updatePaymentDocument:', error);
        throw error;
    }
}

// Get all payment documents for an FPO
export async function getAllPaymentDocuments(fpoId: string): Promise<PaymentDocument[]> {
    const supabase = await createClient();
    
    try {
        const { data, error } = await supabase
            .from('payment_documents')
            .select('*')
            .eq('fpo_id', fpoId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return data.map(PaymentDocument.fromDbFormat);
    } catch (error) {
        console.error('Error in getAllPaymentDocuments:', error);
        throw error;
    }
}

// Get payment documents by status
export async function getPaymentDocumentsByStatus(
    fpoId: string, 
    status: 'pending' | 'partial' | 'completed'
): Promise<PaymentDocument[]> {
    const supabase = await createClient();
    
    try {
        const { data, error } = await supabase
            .from('payment_documents')
            .select('*')
            .eq('fpo_id', fpoId)
            .eq('payment_status', status)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return data.map(PaymentDocument.fromDbFormat);
    } catch (error) {
        console.error('Error in getPaymentDocumentsByStatus:', error);
        throw error;
    }
}

// Get payment documents by document type
export async function getPaymentDocumentsByType(
    fpoId: string, 
    documentType: string
): Promise<PaymentDocument[]> {
    const supabase = await createClient();
    
    try {
        const { data, error } = await supabase
            .from('payment_documents')
            .select('*')
            .eq('fpo_id', fpoId)
            .eq('document_type', documentType)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return data.map(PaymentDocument.fromDbFormat);
    } catch (error) {
        console.error('Error in getPaymentDocumentsByType:', error);
        throw error;
    }
}

// Get pending payment documents (not fully paid)
export async function getPendingPaymentDocuments(fpoId: string): Promise<PaymentDocument[]> {
    const supabase = await createClient();
    
    try {
        const { data, error } = await supabase
            .from('payment_documents')
            .select('*')
            .eq('fpo_id', fpoId)
            .in('payment_status', ['pending', 'partial'])
            .order('created_at', { ascending: true }); // Oldest first for pending payments

        if (error) {
            throw new Error(error.message);
        }

        return data.map(PaymentDocument.fromDbFormat);
    } catch (error) {
        console.error('Error in getPendingPaymentDocuments:', error);
        throw error;
    }
}

// Get overdue payment documents (based on custom logic)
export async function getOverduePaymentDocuments(
    fpoId: string, 
    daysOverdue: number = 30
): Promise<PaymentDocument[]> {
    const supabase = await createClient();
    
    try {
        const overdueDate = new Date();
        overdueDate.setDate(overdueDate.getDate() - daysOverdue);

        const { data, error } = await supabase
            .from('payment_documents')
            .select('*')
            .eq('fpo_id', fpoId)
            .in('payment_status', ['pending', 'partial'])
            .lt('created_at', overdueDate.toISOString())
            .order('created_at', { ascending: true });

        if (error) {
            throw new Error(error.message);
        }

        return data.map(PaymentDocument.fromDbFormat);
    } catch (error) {
        console.error('Error in getOverduePaymentDocuments:', error);
        throw error;
    }
}

// Get payment document statistics for an FPO
export async function getPaymentDocumentStatistics(fpoId: string): Promise<{
    totalDocuments: number;
    pendingDocuments: number;
    partialDocuments: number;
    completedDocuments: number;
    totalDocumentAmount: number;
    totalPaidAmount: number;
    totalOutstandingAmount: number;
    averageDocumentAmount: number;
    averageCompletionRate: number;
}> {
    const supabase = await createClient();
    
    try {
        const { data, error } = await supabase
            .from('payment_documents')
            .select('payment_status, total_document_amount, total_paid_amount')
            .eq('fpo_id', fpoId);

        if (error) {
            throw new Error(error.message);
        }

        const stats = data.reduce((acc, doc) => {
            acc.totalDocuments++;
            acc.totalDocumentAmount += doc.total_document_amount;
            acc.totalPaidAmount += doc.total_paid_amount;
            
            switch (doc.payment_status) {
                case 'pending':
                    acc.pendingDocuments++;
                    break;
                case 'partial':
                    acc.partialDocuments++;
                    break;
                case 'completed':
                    acc.completedDocuments++;
                    break;
            }
            
            return acc;
        }, {
            totalDocuments: 0,
            pendingDocuments: 0,
            partialDocuments: 0,
            completedDocuments: 0,
            totalDocumentAmount: 0,
            totalPaidAmount: 0
        });

        return {
            ...stats,
            totalOutstandingAmount: stats.totalDocumentAmount - stats.totalPaidAmount,
            averageDocumentAmount: stats.totalDocuments > 0 ? stats.totalDocumentAmount / stats.totalDocuments : 0,
            averageCompletionRate: stats.totalDocumentAmount > 0 ? (stats.totalPaidAmount / stats.totalDocumentAmount) * 100 : 0
        };
    } catch (error) {
        console.error('Error in getPaymentDocumentStatistics:', error);
        throw error;
    }
}

// Delete payment document (use with caution - should cascade delete payments)
export async function deletePaymentDocument(paymentDocumentId: string): Promise<void> {
    const supabase = await createClient();
    
    try {
        // First check if the payment document exists
        const paymentDocument = await getPaymentDocumentById(paymentDocumentId);
        if (!paymentDocument) {
            throw new Error('Payment document not found');
        }

        // Delete all related payments first (if cascade is not set up)
        const { error: paymentsDeleteError } = await supabase
            .from('payments')
            .delete()
            .eq('payment_document_id', paymentDocumentId);

        if (paymentsDeleteError) {
            console.error("Error deleting payments:", paymentsDeleteError);
            throw new Error(`Failed to delete payments: ${paymentsDeleteError.message}`);
        }

        // Delete the payment document
        const { error: deleteError } = await supabase
            .from('payment_documents')
            .delete()
            .eq('id', paymentDocumentId);

        if (deleteError) {
            console.error("Error deleting payment document:", deleteError);
            throw new Error(`Failed to delete payment document: ${deleteError.message}`);
        }

        console.log(`Payment document ${paymentDocumentId} and related payments deleted successfully`);
    } catch (error) {
        console.error('Error in deletePaymentDocument:', error);
        throw error;
    }
}

// Check if document can accept a payment amount (for validation before payment creation)
export async function validatePaymentAmount(
    documentId: string,
    documentType: string,
    fpoId: string,
    paymentAmount: number
): Promise<{
    canAcceptPayment: boolean;
    paymentDocument: PaymentDocument | null;
    remainingAmount: number;
    errorMessage?: string;
}> {
    try {
        const paymentDocument = await getPaymentDocumentByDocument(documentId, documentType, fpoId);
        
        if (!paymentDocument) {
            return {
                canAcceptPayment: false,
                paymentDocument: null,
                remainingAmount: 0,
                errorMessage: 'Payment document not found'
            };
        }

        const canAcceptPayment = paymentDocument.canAcceptPayment(Math.abs(paymentAmount));
        const remainingAmount = paymentDocument.calculateRemainingAmount();

        return {
            canAcceptPayment,
            paymentDocument,
            remainingAmount,
            errorMessage: canAcceptPayment ? undefined : `Payment amount exceeds remaining amount (₹${remainingAmount})`
        };
    } catch (error) {
        console.error('Error in validatePaymentAmount:', error);
        return {
            canAcceptPayment: false,
            paymentDocument: null,
            remainingAmount: 0,
            errorMessage: 'Error validating payment amount'
        };
    }
}

// Get payment document summary with progress information (useful for UI display)
export async function getPaymentDocumentSummary(
    documentId: string,
    documentType: string,
    fpoId: string
): Promise<{
    paymentDocument: PaymentDocument | null;
    progress: ReturnType<PaymentDocument['getPaymentProgress']> | null;
    canAcceptPayment: boolean;
}> {
    try {
        const paymentDocument = await getPaymentDocumentByDocument(documentId, documentType, fpoId);
        
        if (!paymentDocument) {
            return {
                paymentDocument: null,
                progress: null,
                canAcceptPayment: false
            };
        }

        const progress = paymentDocument.getPaymentProgress();

        return {
            paymentDocument,
            progress,
            canAcceptPayment: !paymentDocument.isFullyPaid()
        };
    } catch (error) {
        console.error('Error in getPaymentDocumentSummary:', error);
        throw error;
    }
}

// Search payment documents by document ID or type (document number included for display)
export async function searchPaymentDocuments(
    fpoId: string,
    searchTerm: string,
    limit: number = 50
): Promise<PaymentDocument[]> {
    const supabase = await createClient();
    
    try {
        const { data, error } = await supabase
            .from('payment_documents')
            .select('*')
            .eq('fpo_id', fpoId)
            .or(`document_id.ilike.%${searchTerm}%,document_type.ilike.%${searchTerm}%`)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            throw new Error(error.message);
        }

        return data.map(PaymentDocument.fromDbFormat);
    } catch (error) {
        console.error('Error in searchPaymentDocuments:', error);
        throw error;
    }
}

// Recalculate payment document totals (for data integrity)
export async function recalculatePaymentDocumentTotals(paymentDocumentId: string): Promise<PaymentDocument> {
    const supabase = await createClient();
    
    try {
        const paymentDocument = await getPaymentDocumentById(paymentDocumentId);
        if (!paymentDocument) {
            throw new Error('Payment document not found');
        }

        // Get all active payments for this document
        const { data: payments, error: paymentsError } = await supabase
            .from('payments')
            .select('amount')
            .eq('payment_document_id', paymentDocumentId)
            .eq('payment_status', 'active');

        if (paymentsError) {
            throw new Error(paymentsError.message);
        }

        // Calculate total paid amount (including negative amounts for reversals)
        const calculatedPaidAmount = Math.max(0, payments.reduce((sum, payment) => sum + payment.amount, 0));
        
        // Update payment document with calculated totals
        const updatedPaymentDocument = await updatePaymentDocument(paymentDocumentId, {
            totalPaidAmount: calculatedPaidAmount,
            paymentStatus: calculatedPaidAmount === 0 ? 'pending' : 
                          calculatedPaidAmount < paymentDocument.totalDocumentAmount ? 'partial' : 'completed'
        });

        console.log(`Recalculated totals for payment document ${paymentDocumentId}: ${calculatedPaidAmount}`);
        return updatedPaymentDocument;
    } catch (error) {
        console.error('Error in recalculatePaymentDocumentTotals:', error);
        throw error;
    }
}