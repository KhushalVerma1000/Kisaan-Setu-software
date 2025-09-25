import { createClient } from "@/utils/supabase/server";
import { Payment } from "../../core/entities/Payment";
import { PaymentDocument } from "../../core/entities/PaymentDocument";

// Get payments by date range
export async function getPaymentsByDateRange(
    fpoId: string, 
    startDate: Date, 
    endDate: Date
): Promise<Payment[]> {
    const supabase = await createClient();
    
    try {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('fpo_id', fpoId)
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', endDate.toISOString().split('T')[0])
            .order('date', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return data.map(Payment.fromDbFormat);
    } catch (error) {
        console.error('Error in getPaymentsByDateRange:', error);
        throw error;
    }
}

// Get payments by status
export async function getPaymentsByStatus(
    fpoId: string, 
    status: 'active' | 'reversed' | 'cancelled'
): Promise<Payment[]> {
    const supabase = await createClient();
    
    try {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('fpo_id', fpoId)
            .eq('payment_status', status)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return data.map(Payment.fromDbFormat);
    } catch (error) {
        console.error('Error in getPaymentsByStatus:', error);
        throw error;
    }
}

// Get payments by method (cash or bank_transfer)
export async function getPaymentsByMethod(
    fpoId: string, 
    method: 'cash' | 'bank_transfer',
    startDate?: Date,
    endDate?: Date
): Promise<Payment[]> {
    const supabase = await createClient();
    
    try {
        let query = supabase
            .from('payments')
            .select('*')
            .eq('fpo_id', fpoId)
            .eq('method', method);

        if (startDate) {
            query = query.gte('date', startDate.toISOString().split('T')[0]);
        }

        if (endDate) {
            query = query.lte('date', endDate.toISOString().split('T')[0]);
        }

        const { data, error } = await query.order('date', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return data.map(Payment.fromDbFormat);
    } catch (error) {
        console.error('Error in getPaymentsByMethod:', error);
        throw error;
    }
}

// Get payments by type (payment_in or payment_out)
export async function getPaymentsByType(
    fpoId: string, 
    type: 'payment_in' | 'payment_out',
    startDate?: Date,
    endDate?: Date
): Promise<Payment[]> {
    const supabase = await createClient();
    
    try {
        let query = supabase
            .from('payments')
            .select('*')
            .eq('fpo_id', fpoId)
            .eq('type', type)
            .eq('payment_status', 'active'); // Only active payments

        if (startDate) {
            query = query.gte('date', startDate.toISOString().split('T')[0]);
        }

        if (endDate) {
            query = query.lte('date', endDate.toISOString().split('T')[0]);
        }

        const { data, error } = await query.order('date', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return data.map(Payment.fromDbFormat);
    } catch (error) {
        console.error('Error in getPaymentsByType:', error);
        throw error;
    }
}

// Get payments by party ledger account
export async function getPaymentsByPartyLedger(
    fpoId: string, 
    partyLedgerAccountId: string,
    startDate?: Date,
    endDate?: Date
): Promise<Payment[]> {
    const supabase = await createClient();
    
    try {
        let query = supabase
            .from('payments')
            .select('*')
            .eq('fpo_id', fpoId)
            .eq('party_ledger_account_id', partyLedgerAccountId);

        if (startDate) {
            query = query.gte('date', startDate.toISOString().split('T')[0]);
        }

        if (endDate) {
            query = query.lte('date', endDate.toISOString().split('T')[0]);
        }

        const { data, error } = await query.order('date', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return data.map(Payment.fromDbFormat);
    } catch (error) {
        console.error('Error in getPaymentsByPartyLedger:', error);
        throw error;
    }
}

// Get payments by bank account
export async function getPaymentsByBankAccount(
    fpoId: string, 
    bankAccountId: string,
    startDate?: Date,
    endDate?: Date
): Promise<Payment[]> {
    const supabase = await createClient();
    
    try {
        let query = supabase
            .from('payments')
            .select('*')
            .eq('fpo_id', fpoId)
            .eq('bank_account_id', bankAccountId)
            .eq('method', 'bank_transfer'); // Only bank transfers

        if (startDate) {
            query = query.gte('date', startDate.toISOString().split('T')[0]);
        }

        if (endDate) {
            query = query.lte('date', endDate.toISOString().split('T')[0]);
        }

        const { data, error } = await query.order('date', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return data.map(Payment.fromDbFormat);
    } catch (error) {
        console.error('Error in getPaymentsByBankAccount:', error);
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

// Get payment summary for a document
export async function getPaymentSummaryForDocument(
    documentId: string, 
    documentType: string, 
    fpoId: string
): Promise<{
    paymentDocument: PaymentDocument | null;
    payments: Payment[];
    activePayments: Payment[];
    totalPayments: number;
    totalReversals: number;
    netPaidAmount: number;
} | null> {
    try {
        const paymentDocument = await getPaymentDocumentByDocument(documentId, documentType, fpoId);
        if (!paymentDocument) {
            return null;
        }

        const payments = await getPaymentsForDocument(documentId, documentType, fpoId);
        const activePayments = payments.filter(p => p.paymentStatus === 'active');
        
        const totalPayments = payments
            .filter(p => p.paymentStatus === 'active' && p.amount > 0)
            .reduce((sum, p) => sum + p.amount, 0);
            
        const totalReversals = Math.abs(payments
            .filter(p => p.paymentStatus === 'active' && p.amount < 0)
            .reduce((sum, p) => sum + p.amount, 0));
            
        const netPaidAmount = totalPayments - totalReversals;

        return {
            paymentDocument,
            payments,
            activePayments,
            totalPayments,
            totalReversals,
            netPaidAmount
        };
    } catch (error) {
        console.error('Error in getPaymentSummaryForDocument:', error);
        throw error;
    }
}

// Get payment statistics for an FPO
export async function getPaymentStatistics(
    fpoId: string,
    startDate?: Date,
    endDate?: Date
): Promise<{
    totalPaymentsIn: number;
    totalPaymentsOut: number;
    totalCashPayments: number;
    totalBankTransfers: number;
    totalActivePayments: number;
    totalReversedPayments: number;
    paymentCount: number;
    averagePaymentAmount: number;
}> {
    const supabase = await createClient();
    
    try {
        let query = supabase
            .from('payments')
            .select('type, method, amount, payment_status')
            .eq('fpo_id', fpoId);

        if (startDate) {
            query = query.gte('date', startDate.toISOString().split('T')[0]);
        }

        if (endDate) {
            query = query.lte('date', endDate.toISOString().split('T')[0]);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(error.message);
        }

        const stats = data.reduce((acc, payment) => {
            const amount = Math.abs(payment.amount);
            
            if (payment.payment_status === 'active') {
                if (payment.type === 'payment_in') {
                    acc.totalPaymentsIn += amount;
                } else {
                    acc.totalPaymentsOut += amount;
                }

                if (payment.method === 'cash') {
                    acc.totalCashPayments += amount;
                } else {
                    acc.totalBankTransfers += amount;
                }

                acc.totalActivePayments += amount;
                acc.paymentCount++;
                acc.totalAmount += amount;
            } else if (payment.payment_status === 'reversed') {
                acc.totalReversedPayments += amount;
            }

            return acc;
        }, {
            totalPaymentsIn: 0,
            totalPaymentsOut: 0,
            totalCashPayments: 0,
            totalBankTransfers: 0,
            totalActivePayments: 0,
            totalReversedPayments: 0,
            paymentCount: 0,
            totalAmount: 0
        });

        return {
            ...stats,
            averagePaymentAmount: stats.paymentCount > 0 ? stats.totalAmount / stats.paymentCount : 0
        };
    } catch (error) {
        console.error('Error in getPaymentStatistics:', error);
        throw error;
    }
}

// Utility function to recalculate payment document totals (for data integrity)
export async function recalculatePaymentDocumentTotals(paymentDocumentId: string): Promise<PaymentDocument> {
    const supabase = await createClient();
    
    try {
        // Import the function from core file to avoid circular dependency
        const { getPaymentDocumentById } = await import('./paymentDocumentSupabase');
        
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
        paymentDocument.updatePaidAmount(calculatedPaidAmount);

        const { data: updatedData, error: updateError } = await supabase
            .from('payment_documents')
            .update({
                total_paid_amount: paymentDocument.totalPaidAmount,
                payment_status: paymentDocument.paymentStatus,
                updated_at: new Date()
            })
            .eq('id', paymentDocumentId)
            .select()
            .single();

        if (updateError) {
            throw new Error(updateError.message);
        }

        console.log(`Recalculated totals for payment document ${paymentDocumentId}: ${calculatedPaidAmount}`);
        return PaymentDocument.fromDbFormat(updatedData);
    } catch (error) {
        console.error('Error in recalculatePaymentDocumentTotals:', error);
        throw error;
    }
}

// Delete payment document and all related payments (use with caution)
export async function deletePaymentDocument(paymentDocumentId: string): Promise<void> {
    const supabase = await createClient();
    
    try {
        // Import the function from core file to avoid circular dependency
        const { getPaymentDocumentById } = await import('./paymentDocumentSupabase');
        
        // First check if the payment document exists
        const paymentDocument = await getPaymentDocumentById(paymentDocumentId);
        if (!paymentDocument) {
            throw new Error('Payment document not found');
        }

        // Delete all related payments first (cascade should handle this, but being explicit)
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

// Get recent payments (last N payments)
export async function getRecentPayments(fpoId: string, limit: number = 10): Promise<Payment[]> {
    const supabase = await createClient();
    
    try {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('fpo_id', fpoId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            throw new Error(error.message);
        }

        return data.map(Payment.fromDbFormat);
    } catch (error) {
        console.error('Error in getRecentPayments:', error);
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

// Search payments by description or reference number
export async function searchPayments(
    fpoId: string, 
    searchTerm: string,
    limit: number = 50
): Promise<Payment[]> {
    const supabase = await createClient();
    
    try {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('fpo_id', fpoId)
            .or(`description.ilike.%${searchTerm}%,reference_number.ilike.%${searchTerm}%`)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            throw new Error(error.message);
        }

        return data.map(Payment.fromDbFormat);
    } catch (error) {
        console.error('Error in searchPayments:', error);
        throw error;
    }
}

// Get payment document statistics
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

// Import core functions to avoid duplication
import { 
    getPaymentsForDocument 
} from './paymentSupabase';
import { 
    getPaymentDocumentByDocument, 
} from './paymentDocumentSupabase';