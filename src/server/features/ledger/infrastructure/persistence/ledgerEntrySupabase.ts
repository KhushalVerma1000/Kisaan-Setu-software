import { createClient } from "@/utils/supabase/server";
import { Ledger, LedgerAccount, LedgerAccountInterface, LedgerEntry, LedgerEntryInterface } from "../../core/entities/Ledger";
import { Voucher, PaymentVoucher, ReceiptVoucher, ContraVoucher, JournalVoucher } from "@/server/features/vouchers/core/entities/VoucherSystem";

// Basic CRUD Operations for Ledger Entries

export async function getAllLedgerEntries(ledgerAccountId: string): Promise<LedgerEntry[]> {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('ledger_entry')
            .select('*')
            .eq('ledger_account_id', ledgerAccountId)
            .order('date', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return data.map(LedgerEntry.fromDbFormat);
    } catch (error) {
        console.error('Error fetching ledger entries:', error);
        throw error;
    }
}

export async function getLedgerEntryById(entryId: string): Promise<LedgerEntry | null> {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('ledger_entry')
            .select('*')
            .eq('id', entryId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(error.message);
        }

        return LedgerEntry.fromDbFormat(data);
    } catch (error) {
        console.error('Error fetching ledger entry by ID:', error);
        throw error;
    }
}

export async function getLedgerEntriesByIds(entryIds: string[]): Promise<LedgerEntry[]> {
    if (!entryIds || entryIds.length === 0) {
        console.log("the params length for ledger entry ids is ",entryIds.length)
        return [];
    }

    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('ledger_entry')
        .select('*')
        .in('id', entryIds)
        .order('type', { ascending: true }); // Dr before Cr

    if (error) {
        throw new Error(`Failed to fetch ledger entries: ${error.message}`);
    }

    return data.map(LedgerEntry.fromDbFormat);
}
export async function getLedgerEntryByDocumentId(documentId: string): Promise<LedgerEntry | null> {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('ledger_entry')
            .select('*')
            .eq('document_id', documentId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null; // No entry found
            }
            throw new Error(error.message);
        }

        return LedgerEntry.fromDbFormat(data);
    } catch (error) {
        console.error('Error fetching ledger entry by document ID:', error);
        throw error;
    }
}

export async function getLedgerEntriesByDocumentId(documentId: string): Promise<LedgerEntry[]> {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('ledger_entry')
            .select('*')
            .eq('document_id', documentId)
            .order('date', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return data.map(LedgerEntry.fromDbFormat);
    } catch (error) {
        console.error('Error fetching ledger entries by document ID:', error);
        throw error;
    }
}

export async function getLedgerEntriesByDocumentType(
    documentType: string,
    limit?: number
): Promise<LedgerEntry[]> {
    const supabase = await createClient();
    try {
        let query = supabase
            .from('ledger_entry')
            .select('*')
            .eq('document_type', documentType)
            .order('date', { ascending: false });

        if (limit) {
            query = query.limit(limit);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(error.message);
        }

        return data.map(LedgerEntry.fromDbFormat);
    } catch (error) {
        console.error('Error fetching ledger entries by document type:', error);
        throw error;
    }
}

export async function createLedgerEntry(entryData: LedgerEntryInterface): Promise<LedgerEntry> {
    const supabase = await createClient();
    try {
        const newEntry = new LedgerEntry(
            entryData.ledgerAccountId,
            entryData.date,
            entryData.amount,
            entryData.type,
            entryData.primaryDescription,
            entryData.id,
            entryData.documentId,
            entryData.documentType,
            entryData.documentNumber,
            entryData.secondaryDescription,
            entryData.referenceDescription,
            entryData.ledgerReference,
            entryData.isOpeningBalance || false
        );

        const { data, error } = await supabase
            .from('ledger_entry')
            .insert(newEntry.toDbFormat())
            .select()
            .single();

        if (error) {
            console.error("Error creating ledger entry:", error);
            throw new Error(error.message);
        }

        return LedgerEntry.fromDbFormat(data);
    } catch (error) {
        console.error('Error in createLedgerEntry:', error);
        throw error;
    }
}

export async function updateLedgerEntry(entryId: string, entryData: LedgerEntryInterface): Promise<LedgerEntry> {
    const supabase = await createClient();
    try {
        const updatedEntry = new LedgerEntry(
            entryData.ledgerAccountId,
            entryData.date,
            entryData.amount,
            entryData.type,
            entryData.primaryDescription,
            entryId,
            entryData.documentId,
            entryData.documentType,
            entryData.documentNumber,
            entryData.secondaryDescription,
            entryData.referenceDescription,
            entryData.ledgerReference,
            entryData.isOpeningBalance || false
        );

        const updateData = updatedEntry.toDbFormat();
        const { id, ...updateFields } = updateData;

        const { data, error } = await supabase
            .from('ledger_entry')
            .update(updateFields)
            .eq('id', entryId)
            .select()
            .single();

        if (error) {
            console.error("Error updating ledger entry:", error);
            throw new Error(error.message);
        }

        return LedgerEntry.fromDbFormat(data);
    } catch (error) {
        console.error('Error in updateLedgerEntry:', error);
        throw error;
    }
}

export async function deleteLedgerEntry(entryId: string): Promise<void> {
    const supabase = await createClient();
    try {
        const { error } = await supabase
            .from('ledger_entry')
            .delete()
            .eq('id', entryId);

        if (error) {
            console.error("Error deleting ledger entry:", error);
            throw new Error(error.message);
        }

        console.log(`Ledger entry ${entryId} deleted successfully`);
    } catch (error) {
        console.error('Error in deleteLedgerEntry:', error);
        throw error;
    }
}

// Simple Transaction Functions using createUniversalLedgerEntry

import { createUniversalLedgerEntry, UniversalTransactionData } from "../../core/entities/Ledger";

// Updated transaction functions to properly use relatedLedgerName and notes parameters
export async function createSalesInvoiceEntry(
    customerLedgerAccountId: string,
    amount: number,
    date: Date,
    invoiceId: string,
    invoiceNumber: string,
    customerName: string,
    notes?: string  // Added notes parameter
): Promise<LedgerEntry> {
    const supabase = await createClient();
    try {
        // Customer Account - Debit (Amount Receivable from customer)
        const transactionData: UniversalTransactionData = {
            ledgerAccountId: customerLedgerAccountId,
            amount: amount,
            type: 'Dr',
            date: date,
            transactionType: 'Invoice',
            relatedLedgerName: customerName,    // Changed from partyName to relatedLedgerName
            documentNumber: `Invoice #${invoiceNumber}`,
            notes: notes,                       // Added notes parameter
            documentId: invoiceId,
            documentType: 'invoice'
        };

        const entry = createUniversalLedgerEntry(transactionData);

        const { data, error } = await supabase
            .from('ledger_entry')
            .insert(entry.toDbFormat())
            .select()
            .single();

        if (error) {
            console.error("Error creating sales invoice entry:", error);
            throw new Error(error.message);
        }

        return LedgerEntry.fromDbFormat(data);
    } catch (error) {
        console.error('Error in createSalesInvoiceEntry:', error);
        throw error;
    }
}

export async function createPurchaseVoucherEntry(
    supplierLedgerAccountId: string,
    amount: number,
    date: Date,
    voucherId: string,
    voucherNumber: string,
    supplierName: string,
    notes?: string  // Added notes parameter
): Promise<LedgerEntry> {
    const supabase = await createClient();
    try {
        // Supplier Account - Credit (Amount Payable to supplier)
        const transactionData: UniversalTransactionData = {
            ledgerAccountId: supplierLedgerAccountId,
            amount: amount,
            type: 'Cr',
            date: date,
            transactionType: 'Purchase Voucher',
            relatedLedgerName: supplierName,    // Changed from partyName to relatedLedgerName
            documentNumber: `Voucher #${voucherNumber}`,
            notes: notes,                       // Added notes parameter
            documentId: voucherId,
            documentType: 'voucher'
        };

        const entry = createUniversalLedgerEntry(transactionData);

        const { data, error } = await supabase
            .from('ledger_entry')
            .insert(entry.toDbFormat())
            .select()
            .single();

        if (error) {
            console.error("Error creating purchase voucher entry:", error);
            throw new Error(error.message);
        }

        return LedgerEntry.fromDbFormat(data);
    } catch (error) {
        console.error('Error in createPurchaseVoucherEntry:', error);
        throw error;
    }
}

// functions for payments
import { PaymentDocument } from "@/server/features/Payment/core/entities/PaymentDocument";
import { PaymentOperationResult } from "@/server/features/Payment/infrastructure/persistence/paymentSupabase";
import { getLedgerNameById } from "./ledgerAccountSupabase";


// Function to create ledger entry from PaymentOperationResult

// Function to create ledger entry from PaymentOperationResult
// Designed to be called from a separate service after payment operations
// Enhanced function to create ledger entry from PaymentOperationResult
export async function createLedgerEntryFromPaymentOperation(
    paymentResult: PaymentOperationResult,
): Promise<LedgerEntry> {
    const supabase = await createClient();
    
    try {
        const { payment, paymentDocument, newPaidAmount, remainingAmount, statusChanged } = paymentResult;
        
        // Get party ledger name
        const partyLedgerName = await getLedgerNameById(payment.partyLedgerAccountId);
        if (!partyLedgerName) {
            throw new Error(`Ledger name not found for ID: ${payment.partyLedgerAccountId}`);
        }

        // Determine transaction type and entry direction based on payment type and reversal status
        let transactionType: string;
        let entryType: 'Dr' | 'Cr';
        let primaryDescription: string;
        
        if (payment.isReversalPayment()) {
            // For reversals, we need to reverse the normal accounting direction
            transactionType = payment.type === 'payment_in' ? 'Payment In Reversal' : 'Payment Out Reversal';
            entryType = payment.type === 'payment_in' ? 'Dr' : 'Cr'; // Opposite of normal payment
            primaryDescription = `${transactionType} - ${paymentDocument.getDocumentDisplayName()}`;
        } else {
            // Normal payments
            transactionType = payment.type === 'payment_in' ? 'Payment In' : 'Payment Out';
            entryType = payment.type === 'payment_in' ? 'Cr' : 'Dr'; // Credit reduces receivable, Debit increases payable
            primaryDescription = `${transactionType} - ${paymentDocument.getDocumentDisplayName()}`;
        }

        // Build comprehensive document number reference
        let documentNumber = '';
        if (payment.referenceNumber) {
            documentNumber = paymentDocument.documentNumber;
        } else {
            // Create meaningful reference based on payment method and type
            const methodPrefix = payment.method === 'cash' ? 'Cash' : 'Bank';
            const typePrefix = payment.type === 'payment_in' ? 'Receipt' : 'Payment';
            const reversalSuffix = payment.isReversalPayment() ? ' (Rev)' : '';
            documentNumber = `${methodPrefix} ${typePrefix}${reversalSuffix}`;
        }

        // Create rich secondary description with payment method details
        const methodInfo = payment.method === 'cash' ? 'Cash Payment' : 'Bank Transfer';
        const bookReference = payment.getBookId() ? ` | Book: ${payment.getBookId()}` : '';
        const dateInfo = ` | Date: ${payment.date.toLocaleDateString()}`;
        const secondaryDescription = `${methodInfo}${bookReference}${dateInfo}`;

        // Create comprehensive reference description with document and payment context
        const documentContext = `Document: ${paymentDocument.documentNumber} (${paymentDocument.documentType})`;
        const amountContext = `Amount: ₹${Math.abs(payment.amount).toLocaleString()}`;
        const progressContext = `Progress: ₹${newPaidAmount.toLocaleString()} / ₹${paymentDocument.totalDocumentAmount.toLocaleString()}`;
        const statusContext = statusChanged ? ` | Status: ${paymentDocument.paymentStatus}` : '';
        const balanceContext = remainingAmount > 0 
            ? ` | Outstanding: ₹${remainingAmount.toLocaleString()}` 
            : ' | Fully Settled';
        
        const referenceDescription = `${documentContext} | ${amountContext} | ${progressContext}${statusContext}${balanceContext}`;

        // Create detailed notes combining payment notes with operation context
        let comprehensiveNotes = '';
        
        // Add user notes if provided
        if (payment.notes && payment.notes.trim()) {
            comprehensiveNotes += `Notes: ${payment.notes} | `;
        }
        
        // Add operational context
        const operationContext = payment.isReversalPayment() ? 'Reversal Operation' : 'Payment Operation';
        const methodDetails = payment.method === 'cash' ? 'Cash Transaction' : 'Bank Transfer';
        const paymentSummary = payment.getPaymentSummary();
        
        comprehensiveNotes += `${operationContext} | ${methodDetails}`;
        
        // Add reversal context if applicable
        if (payment.isReversalPayment() && payment.reversalPaymentId) {
            comprehensiveNotes += ` | Reverses Payment: ${payment.reversalPaymentId}`;
        }

        // Create universal transaction data with all enhanced information
        const transactionData: UniversalTransactionData = {
            ledgerAccountId: payment.partyLedgerAccountId,
            amount: Math.abs(payment.amount), // Always use absolute amount
            type: entryType,
            date: payment.date,
            transactionType: transactionType,
            relatedLedgerName: partyLedgerName,
            documentNumber: documentNumber,
            notes: comprehensiveNotes,
            documentId: payment.id,
            documentType: 'payment'
        };

        // Create ledger entry using the universal function
        const ledgerEntry = createUniversalLedgerEntry(transactionData);
        
        // Override the auto-generated descriptions with our enhanced versions
        const enhancedEntry = new LedgerEntry(
            ledgerEntry.ledgerAccountId,
            ledgerEntry.date,
            ledgerEntry.amount,
            ledgerEntry.type,
            primaryDescription, // Enhanced primary description
            ledgerEntry.id,
            ledgerEntry.documentId,
            ledgerEntry.documentType,
            documentNumber, // Enhanced document number
            secondaryDescription, // Enhanced secondary description
            referenceDescription, // Enhanced reference description
            ledgerEntry.ledgerReference,
            ledgerEntry.isOpeningBalance
        );

        // Insert the enhanced ledger entry
        const { data, error } = await supabase
            .from('ledger_entry')
            .insert(enhancedEntry.toDbFormat())
            .select()
            .single();

        if (error) {
            console.error("Error creating ledger entry from payment operation:", error);
            throw new Error(`Failed to create ledger entry: ${error.message}`);
        }

        console.log(`Created ledger entry for ${transactionType} - ${partyLedgerName}: ₹${Math.abs(payment.amount).toLocaleString()}`);
        return LedgerEntry.fromDbFormat(data);

    } catch (error) {
        console.error('Error in createLedgerEntryFromPaymentOperation:', error);
        throw error;
    }
}

// Enhanced batch function with improved descriptions
export async function createLedgerEntriesFromPaymentOperations(
    paymentResults: PaymentOperationResult[],
    partyLedgerNames?: Map<string, string>
): Promise<LedgerEntry[]> {
    const supabase = await createClient();
    
    try {
        const ledgerEntries: LedgerEntry[] = [];
        
        // Process each payment result with enhanced descriptions
        for (const paymentResult of paymentResults) {
            const { payment, paymentDocument, newPaidAmount, remainingAmount, statusChanged } = paymentResult;
            
            // Get party name from provided map or fetch it
            let partyName = partyLedgerNames?.get(payment.partyLedgerAccountId);
            if (!partyName) {
                partyName = await getLedgerNameById(payment.partyLedgerAccountId) || undefined;
                if (!partyName) {
                    throw new Error(`Ledger name not found for ID: ${payment.partyLedgerAccountId}`);
                }
            }
            
            // Determine transaction details with enhanced logic
            let transactionType: string;
            let entryType: 'Dr' | 'Cr';
            let primaryDescription: string;
            
            if (payment.isReversalPayment()) {
                transactionType = payment.type === 'payment_in' ? 'Payment In Reversal' : 'Payment Out Reversal';
                entryType = payment.type === 'payment_in' ? 'Dr' : 'Cr';
                primaryDescription = `${transactionType} - ${paymentDocument.getDocumentDisplayName()}`;
            } else {
                transactionType = payment.type === 'payment_in' ? 'Payment In' : 'Payment Out';
                entryType = payment.type === 'payment_in' ? 'Cr' : 'Dr';
                primaryDescription = `${transactionType} - ${paymentDocument.getDocumentDisplayName()}`;
            }

            // Build enhanced document reference
            const documentNumber = payment.referenceNumber || 
                `${payment.method === 'cash' ? 'Cash' : 'Bank'} ${payment.type === 'payment_in' ? 'Receipt' : 'Payment'}${payment.isReversalPayment() ? ' (Rev)' : ''}`;

            // Create enhanced descriptions
            const methodInfo = payment.method === 'cash' ? 'Cash Payment' : 'Bank Transfer';
            const bookReference = payment.getBookId() ? ` | Book: ${payment.getBookId()}` : '';
            const secondaryDescription = `${methodInfo}${bookReference} | Date: ${payment.date.toLocaleDateString()}`;

            const documentContext = `Document: ${paymentDocument.documentNumber} (${paymentDocument.documentType})`;
            const progressContext = `Progress: ₹${newPaidAmount.toLocaleString()} / ₹${paymentDocument.totalDocumentAmount.toLocaleString()}`;
            const statusContext = statusChanged ? ` | Status: ${paymentDocument.paymentStatus}` : '';
            const balanceContext = remainingAmount > 0 
                ? ` | Outstanding: ₹${remainingAmount.toLocaleString()}` 
                : ' | Fully Settled';
            const referenceDescription = `${documentContext} | ${progressContext}${statusContext}${balanceContext}`;

            // Create comprehensive notes
            let notes = '';
            if (payment.notes && payment.notes.trim()) {
                notes += `Notes: ${payment.notes} | `;
            }
            const operationContext = payment.isReversalPayment() ? 'Reversal Operation' : 'Payment Operation';
            notes += `${operationContext} | ${methodInfo}`;
            if (payment.isReversalPayment() && payment.reversalPaymentId) {
                notes += ` | Reverses Payment: ${payment.reversalPaymentId}`;
            }

            // Create the enhanced ledger entry
            const ledgerEntry = new LedgerEntry(
                payment.partyLedgerAccountId,
                payment.date,
                Math.abs(payment.amount),
                entryType,
                primaryDescription,
                undefined, // Let database generate ID
                payment.id,
                'payment',
                documentNumber,
                secondaryDescription,
                referenceDescription,
                partyName,
                false
            );

            ledgerEntries.push(ledgerEntry);
        }

        // Bulk insert all enhanced ledger entries
        const dbEntries = ledgerEntries.map(entry => entry.toDbFormat());
        
        const { data, error } = await supabase
            .from('ledger_entry')
            .insert(dbEntries)
            .select();

        if (error) {
            console.error("Error creating ledger entries from payment operations:", error);
            throw new Error(`Failed to create ledger entries: ${error.message}`);
        }

        console.log(`Created ${data.length} enhanced ledger entries from payment operation results`);
        return data.map(LedgerEntry.fromDbFormat);

    } catch (error) {
        console.error('Error in createLedgerEntriesFromPaymentOperations:', error);
        throw error;
    }
}

// Helper function to create payment ledger entry with full context
export async function createPaymentLedgerEntryWithFullContext(
    paymentResult: PaymentOperationResult,
    additionalContext?: {
        userNotes?: string;
        internalReference?: string;
        batchId?: string;
    }
): Promise<LedgerEntry> {
    const supabase = await createClient();
    
    try {
        const { payment, paymentDocument, newPaidAmount, remainingAmount, statusChanged } = paymentResult;
        
        // Get party ledger name
        const partyLedgerName = await getLedgerNameById(payment.partyLedgerAccountId);
        if (!partyLedgerName) {
            throw new Error(`Ledger name not found for ID: ${payment.partyLedgerAccountId}`);
        }

        // Get payment progress information
        const paymentProgress = paymentDocument.getPaymentProgress();
        const paymentSummary = payment.getPaymentSummary();

        // Create the most comprehensive descriptions possible
        const transactionType = payment.isReversalPayment() 
            ? `${payment.type === 'payment_in' ? 'Payment In' : 'Payment Out'} Reversal`
            : `${payment.type === 'payment_in' ? 'Payment In' : 'Payment Out'}`;

        const entryType: 'Dr' | 'Cr' = payment.isReversalPayment()
            ? (payment.type === 'payment_in' ? 'Dr' : 'Cr')
            : (payment.type === 'payment_in' ? 'Cr' : 'Dr');

        // Ultra-comprehensive primary description
        const primaryDescription = `${transactionType} - ${paymentDocument.getDocumentDisplayName()} | ${partyLedgerName}`;

        // Enhanced document number with context
        const documentNumber = payment.referenceNumber || 
            `${payment.method.toUpperCase().replace('_', ' ')} ${payment.type.replace('_', ' ').toUpperCase()}${payment.isReversalPayment() ? ' REV' : ''} #${payment.id?.substring(0, 8)}`;

        // Comprehensive secondary description
        const secondaryDescription = `${paymentSummary.method} | Book: ${payment.getBookId() || 'N/A'} | ${paymentSummary.date} | Status: ${paymentSummary.status.toUpperCase()}`;

        // Exhaustive reference description
        const referenceDescription = [
            `Doc: ${paymentDocument.documentNumber} (${paymentDocument.documentType})`,
            `Amount: ${paymentSummary.amount}`,
            `Progress: ${paymentProgress.progressPercentage.toFixed(1)}% (₹${paymentProgress.paidAmount.toLocaleString()} / ₹${paymentProgress.totalAmount.toLocaleString()})`,
            statusChanged ? `Status Changed: ${paymentProgress.status.toUpperCase()}` : null,
            remainingAmount > 0 ? `Outstanding: ₹${remainingAmount.toLocaleString()}` : 'FULLY SETTLED',
            payment.isReversalPayment() ? `REVERSAL of Payment ${payment.reversalPaymentId}` : null
        ].filter(Boolean).join(' | ');

        // Complete notes with all available context
        const notesArray = [];
        
        if (payment.notes && payment.notes.trim()) {
            notesArray.push(`Payment Notes: ${payment.notes}`);
        }
        
        if (additionalContext?.userNotes) {
            notesArray.push(`User Notes: ${additionalContext.userNotes}`);
        }
        
        notesArray.push(`Operation: ${payment.isReversalPayment() ? 'Payment Reversal' : 'Payment Processing'}`);
        notesArray.push(`Method: ${paymentSummary.method}`);
        
        if (payment.getBookId()) {
            notesArray.push(`Book ID: ${payment.getBookId()}`);
        }
        
        if (additionalContext?.internalReference) {
            notesArray.push(`Internal Ref: ${additionalContext.internalReference}`);
        }
        
        if (additionalContext?.batchId) {
            notesArray.push(`Batch ID: ${additionalContext.batchId}`);
        }

        const comprehensiveNotes = notesArray.join(' | ');

        // Create the ultimate ledger entry
        const ledgerEntry = new LedgerEntry(
            payment.partyLedgerAccountId,
            payment.date,
            Math.abs(payment.amount),
            entryType,
            primaryDescription,
            undefined,
            payment.id,
            'payment',
            documentNumber,
            secondaryDescription,
            referenceDescription,
            partyLedgerName,
            false
        );

        // Insert with comprehensive logging
        const { data, error } = await supabase
            .from('ledger_entry')
            .insert(ledgerEntry.toDbFormat())
            .select()
            .single();

        if (error) {
            console.error("Error creating comprehensive ledger entry:", error);
            throw new Error(`Failed to create ledger entry: ${error.message}`);
        }

        console.log(`✓ Created comprehensive ledger entry:
        - Type: ${transactionType}
        - Party: ${partyLedgerName}
        - Amount: ₹${Math.abs(payment.amount).toLocaleString()}
        - Document: ${paymentDocument.getDocumentDisplayName()}
        - Progress: ${paymentProgress.progressPercentage.toFixed(1)}%
        - Status: ${paymentProgress.status}`);

        return LedgerEntry.fromDbFormat(data);

    } catch (error) {
        console.error('Error in createPaymentLedgerEntryWithFullContext:', error);
        throw error;
    }
}


// Generic transaction entry function that fully utilizes all parameters
export async function createGenericTransactionEntry(
    ledgerAccountId: string,
    amount: number,
    type: 'Dr' | 'Cr',
    date: Date,
    transactionType: string,
    relatedLedgerName?: string,
    documentNumber?: string,
    notes?: string,
    documentId?: string,
    documentType?: string
): Promise<LedgerEntry> {
    const supabase = await createClient();
    try {
        const transactionData: UniversalTransactionData = {
            ledgerAccountId,
            amount,
            type,
            date,
            transactionType,
            relatedLedgerName,
            documentNumber,
            notes,
            documentId,
            documentType
        };

        const entry = createUniversalLedgerEntry(transactionData);

        const { data, error } = await supabase
            .from('ledger_entry')
            .insert(entry.toDbFormat())
            .select()
            .single();

        if (error) {
            console.error("Error creating generic transaction entry:", error);
            throw new Error(error.message);
        }

        return LedgerEntry.fromDbFormat(data);
    } catch (error) {
        console.error('Error in createGenericTransactionEntry:', error);
        throw error;
    }
}

// Simple Query Functions using Ledger class methods

export async function getLedgerWithStatement(
    ledgerAccountId: string,
    startDate?: Date,
    endDate?: Date
): Promise<{
    ledgerAccount: LedgerAccountInterface;
    statement: Array<{
        entry: LedgerEntry;
        runningBalance: number;
        runningBalanceType: 'Dr' | 'Cr';
    }>;
    currentBalance: { balance: number; balanceType: 'Dr' | 'Cr' };
}> {
    const supabase = await createClient();
    try {
        // Get ledger account
        const { data: accountData, error: accountError } = await supabase
            .from('ledger_account')
            .select('*')
            .eq('id', ledgerAccountId)
            .single();

        if (accountError) {
            throw new Error(accountError.message);
        }

        const ledgerAccount = LedgerAccount.fromDbFormat(accountData);

        // Get ledger entries
        let query = supabase
            .from('ledger_entry')
            .select('*')
            .eq('ledger_account_id', ledgerAccountId);

        if (startDate && endDate) {
            query = query.gte('date', startDate.toISOString())
                         .lte('date', endDate.toISOString());
        }

        const { data: entriesData, error: entriesError } = await query
            .order('date', { ascending: true });

        if (entriesError) {
            throw new Error(entriesError.message);
        }

        const ledgerEntries = entriesData.map(LedgerEntry.fromDbFormat);

        // Create Ledger instance and get statement
        const ledger = new Ledger(ledgerAccount, ledgerEntries);
        const statement = ledger.getStatementWithRunningBalance(startDate, endDate);
        const currentBalance = ledger.getCurrentBalance();

        return {
            ledgerAccount,
            statement,
            currentBalance
        };
    } catch (error) {
        console.error('Error getting ledger with statement:', error);
        throw error;
    }
}

export async function getLedgerBalance(ledgerAccountId: string): Promise<{ balance: number; balanceType: 'Dr' | 'Cr' }> {
    const supabase = await createClient();
    try {
        // Get ledger account
        const { data: accountData, error: accountError } = await supabase
            .from('ledger_account')
            .select('*')
            .eq('id', ledgerAccountId)
            .single();

        if (accountError) {
            throw new Error(accountError.message);
        }

        // Get ledger entries
        const { data: entriesData, error: entriesError } = await supabase
            .from('ledger_entry')
            .select('*')
            .eq('ledger_account_id', ledgerAccountId);

        if (entriesError) {
            throw new Error(entriesError.message);
        }

        const ledgerAccount = LedgerAccount.fromDbFormat(accountData);
        const ledgerEntries = entriesData.map(LedgerEntry.fromDbFormat);

        // Create Ledger instance and get current balance
        const ledger = new Ledger(ledgerAccount, ledgerEntries);
        return ledger.getCurrentBalance();
    } catch (error) {
        console.error('Error calculating ledger balance:', error);
        throw error;
    }
}

// Utility function to create opening balance entry
export async function createOpeningBalanceEntry(ledgerAccountId: string): Promise<LedgerEntry> {
    const supabase = await createClient();
    try {
        // Get ledger account
        const { data: accountData, error: accountError } = await supabase
            .from('ledger_account')
            .select('*')
            .eq('id', ledgerAccountId)
            .single();

        if (accountError) {
            throw new Error(accountError.message);
        }

        const ledgerAccount = LedgerAccount.fromDbFormat(accountData);
        
        // Create opening balance entry using utility function from Ledger.ts
        const { createOpeningBalanceEntry } = await import("../../core/entities/Ledger");
        const openingEntry = createOpeningBalanceEntry(ledgerAccount);

        const { data, error } = await supabase
            .from('ledger_entry')
            .insert(openingEntry.toDbFormat())
            .select()
            .single();

        if (error) {
            console.error("Error creating opening balance entry:", error);
            throw new Error(error.message);
        }

        return LedgerEntry.fromDbFormat(data);
    } catch (error) {
        console.error('Error in createOpeningBalanceEntry:', error);
        throw error;
    }
}

export async function bulkDeleteLedgerEntries(entryIds: string[]): Promise<void> {
    const supabase = await createClient();
    try {
        if (!entryIds || entryIds.length === 0) {
            throw new Error('No entry IDs provided for deletion');
        }

        const { error } = await supabase
            .from('ledger_entry')
            .delete()
            .in('id', entryIds);

        if (error) {
            console.error("Error bulk deleting ledger entries:", error);
            throw new Error(error.message);
        }

        console.log(`${entryIds.length} ledger entries deleted successfully`);
    } catch (error) {
        console.error('Error in bulkDeleteLedgerEntries:', error);
        throw error;
    }
}






// Function to create ledger entries from vouchers
export async function createLedgerEntriesFromVoucher(voucher: Voucher): Promise<LedgerEntry[]> {
    const supabase = await createClient();
    
    try {
        const ledgerEntries: LedgerEntry[] = [];
        
        // Process each voucher entry
        for (const voucherEntry of voucher.entries) {
            const transactionData: UniversalTransactionData = {
                ledgerAccountId: voucherEntry.ledgerAccountId,
                amount: voucherEntry.amount,
                type: voucherEntry.type,
                date: voucher.date,
                transactionType: `${voucher.voucherType.charAt(0).toUpperCase() + voucher.voucherType.slice(1)} Voucher`,
                documentNumber: `${voucher.voucherType.toUpperCase()} #${voucher.voucherNumber}`,
                notes: `${voucherEntry.description} | Voucher: ${voucher.description}`,
                documentId: voucher.id,
                documentType: `${voucher.voucherType}_voucher`
            };
            
            const ledgerEntry = createUniversalLedgerEntry(transactionData);
            ledgerEntries.push(ledgerEntry);
        }
        
        // Bulk insert all ledger entries
        if (ledgerEntries.length > 0) {
            const dbEntries = ledgerEntries.map(entry => entry.toDbFormat());
            
            const { data, error } = await supabase
                .from('ledger_entry')
                .insert(dbEntries)
                .select();

            if (error) {
                console.error("Error creating ledger entries from voucher:", error);
                throw new Error(`Failed to create ledger entries: ${error.message}`);
            }

            console.log(`Created ${data.length} ledger entries from ${voucher.voucherType} voucher #${voucher.voucherNumber}`);
            return data.map(LedgerEntry.fromDbFormat);
        }
        
        return [];
        
    } catch (error) {
        console.error('Error in createLedgerEntriesFromVoucher:', error);
        throw error;
    }
}

// Function to create complete voucher transaction (all ledger entries for a voucher)
export async function createVoucherTransaction(
    voucher: Voucher,
    voucherEntries: Array<{
        ledgerAccountId: string;
        amount: number;
        type: 'Dr' | 'Cr';
        description: string;
    }>
): Promise<LedgerEntry[]> {
    const supabase = await createClient();
    
    try {
        const ledgerEntries: LedgerEntry[] = [];
        
        // Create ledger entries for each voucher entry
        for (const entry of voucherEntries) {
            let transactionType = '';
            let documentPrefix = '';
            
            switch (voucher.voucherType) {
                case 'payment':
                    transactionType = 'Payment Voucher';
                    documentPrefix = 'PAYV';
                    break;
                case 'receipt':
                    transactionType = 'Receipt Voucher';
                    documentPrefix = 'RECV';
                    break;
                case 'contra':
                    transactionType = 'Contra Voucher';
                    documentPrefix = 'CONV';
                    break;
                case 'journal':
                    const journalVoucher = voucher as JournalVoucher;
                    transactionType = `Journal Voucher (${journalVoucher.journalType})`;
                    documentPrefix = 'JORV';
                    break;
                default:
                    transactionType = 'Unknown Voucher';
                    documentPrefix = 'UNKN';
            }

            const transactionData: UniversalTransactionData = {
                ledgerAccountId: entry.ledgerAccountId,
                amount: entry.amount,
                type: entry.type,
                date: voucher.date,
                transactionType,
                documentNumber: `${documentPrefix} #${voucher.voucherNumber}`,
                notes: `${entry.description} | Voucher: ${voucher.description}`,
                documentId: voucher.id,
                documentType: `${voucher.voucherType}_voucher`
            };
            
            const ledgerEntry = createUniversalLedgerEntry(transactionData);
            ledgerEntries.push(ledgerEntry);
        }
        
        // Validate that debits equal credits
        const totalDebits = ledgerEntries.filter(e => e.type === 'Dr').reduce((sum, e) => sum + e.amount, 0);
        const totalCredits = ledgerEntries.filter(e => e.type === 'Cr').reduce((sum, e) => sum + e.amount, 0);
        
        if (Math.abs(totalDebits - totalCredits) > 0.01) {
            throw new Error(`Voucher is not balanced. Debits: ₹${totalDebits}, Credits: ₹${totalCredits}`);
        }
        
        // Bulk insert all ledger entries
        const dbEntries = ledgerEntries.map(entry => entry.toDbFormat());
        
        const { data, error } = await supabase
            .from('ledger_entry')
            .insert(dbEntries)
            .select();

        if (error) {
            console.error("Error creating voucher transaction:", error);
            throw new Error(`Failed to create voucher transaction: ${error.message}`);
        }

        console.log(`Created balanced voucher transaction with ${data.length} entries for ${voucher.voucherType} voucher #${voucher.voucherNumber}`);
        return data.map(LedgerEntry.fromDbFormat);
        
    } catch (error) {
        console.error('Error in createVoucherTransaction:', error);
        throw error;
    }
}

// NEW: Function to create journal entry adjustments
export async function createJournalAdjustment(data: {
    fpoId: string;
    date: Date;
    description: string;
    adjustmentType: 'correction' | 'accrual' | 'provision' | 'depreciation' | 'other';
    referenceNumber?: string;
    entries: Array<{
        ledgerAccountId: string;
        amount: number;
        type: 'Dr' | 'Cr';
        description: string;
    }>;
    notes?: string;
}): Promise<LedgerEntry[]> {
    const supabase = await createClient();
    
    try {
        // Validate entries are balanced
        const totalDebits = data.entries.filter(e => e.type === 'Dr').reduce((sum, e) => sum + e.amount, 0);
        const totalCredits = data.entries.filter(e => e.type === 'Cr').reduce((sum, e) => sum + e.amount, 0);
        
        if (Math.abs(totalDebits - totalCredits) > 0.01) {
            throw new Error(`Journal adjustment entries are not balanced. Debits: ₹${totalDebits}, Credits: ₹${totalCredits}`);
        }

        // Generate a unique reference for the adjustment
        const adjustmentRef = `JE-${data.adjustmentType.toUpperCase()}-${Date.now()}`;
        
        const ledgerEntries: LedgerEntry[] = [];
        
        // Create ledger entries
        for (const entry of data.entries) {
            const transactionData: UniversalTransactionData = {
                ledgerAccountId: entry.ledgerAccountId,
                amount: entry.amount,
                type: entry.type,
                date: data.date,
                transactionType: `Journal Entry - ${data.adjustmentType.charAt(0).toUpperCase() + data.adjustmentType.slice(1)}`,
                documentNumber: adjustmentRef,
                notes: `${entry.description} | Adjustment: ${data.description}`,
                documentId: adjustmentRef, // Use adjustment reference as document ID
                documentType: 'journal_adjustment'
            };
            
            const ledgerEntry = createUniversalLedgerEntry(transactionData);
            ledgerEntries.push(ledgerEntry);
        }
        
        // Bulk insert all ledger entries
        const dbEntries = ledgerEntries.map(entry => entry.toDbFormat());
        
        const { data: insertedData, error } = await supabase
            .from('ledger_entry')
            .insert(dbEntries)
            .select();

        if (error) {
            console.error("Error creating journal adjustment:", error);
            throw new Error(`Failed to create journal adjustment: ${error.message}`);
        }

        console.log(`Created journal adjustment with ${insertedData.length} entries: ${adjustmentRef}`);
        return insertedData.map(LedgerEntry.fromDbFormat);
        
    } catch (error) {
        console.error('Error in createJournalAdjustment:', error);
        throw error;
    }
}

// NEW: Function to reverse a journal voucher by creating opposing entries
export async function reverseJournalVoucher(
    originalVoucherId: string,
    reversalDate: Date,
    reversalDescription?: string
): Promise<LedgerEntry[]> {
    const supabase = await createClient();
    
    try {
        // Get original ledger entries for the voucher
        const { data: originalEntries, error } = await supabase
            .from('ledger_entry')
            .select('*')
            .eq('document_id', originalVoucherId)
            .eq('document_type', 'journal_voucher');

        if (error) {
            throw new Error(`Failed to fetch original entries: ${error.message}`);
        }

        if (!originalEntries || originalEntries.length === 0) {
            throw new Error('No original entries found for the journal voucher');
        }

        const reversalRef = `REV-${originalVoucherId}-${Date.now()}`;
        const reversalEntries: LedgerEntry[] = [];

        // Create reverse entries (Dr becomes Cr, Cr becomes Dr)
        for (const originalEntry of originalEntries) {
            const transactionData: UniversalTransactionData = {
                ledgerAccountId: originalEntry.ledger_account_id,
                amount: originalEntry.amount,
                type: originalEntry.type === 'Dr' ? 'Cr' : 'Dr', // Reverse the type
                date: reversalDate,
                transactionType: 'Journal Reversal',
                documentNumber: reversalRef,
                notes: `Reversal: ${originalEntry.notes || ''} | ${reversalDescription || 'Journal voucher reversal'}`,
                documentId: reversalRef,
                documentType: 'journal_reversal'
            };
            
            const ledgerEntry = createUniversalLedgerEntry(transactionData);
            reversalEntries.push(ledgerEntry);
        }

        // Bulk insert reversal entries
        const dbEntries = reversalEntries.map(entry => entry.toDbFormat());
        
        const { data: insertedData, error: insertError } = await supabase
            .from('ledger_entry')
            .insert(dbEntries)
            .select();

        if (insertError) {
            console.error("Error creating reversal entries:", insertError);
            throw new Error(`Failed to create reversal entries: ${insertError.message}`);
        }

        console.log(`Created ${insertedData.length} reversal entries for journal voucher: ${originalVoucherId}`);
        return insertedData.map(LedgerEntry.fromDbFormat);
        
    } catch (error) {
        console.error('Error in reverseJournalVoucher:', error);
        throw error;
    }
}

// NEW: Function to get ledger entries by voucher type
export async function getLedgerEntriesByVoucherType(
    fpoId: string,
    voucherType: 'payment' | 'receipt' | 'contra' | 'journal',
    startDate: Date,
    endDate: Date
): Promise<LedgerEntry[]> {
    const supabase = await createClient();
    
    try {
        const { data, error } = await supabase
            .from('ledger_entry')
            .select(`
                *,
                ledger_account:ledger_account_id (
                    account_name,
                    account_code,
                    account_type
                )
            `)
            .eq('document_type', `${voucherType}_voucher`)
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', endDate.toISOString().split('T')[0])
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return (data || []).map(LedgerEntry.fromDbFormat);
        
    } catch (error) {
        console.error('Error in getLedgerEntriesByVoucherType:', error);
        throw error;
    }
}

// NEW: Function to validate voucher balance in ledger
export async function validateVoucherBalance(voucherId: string): Promise<{
    isBalanced: boolean;
    totalDebits: number;
    totalCredits: number;
    difference: number;
}> {
    const supabase = await createClient();
    
    try {
        const { data, error } = await supabase
            .from('ledger_entry')
            .select('amount, type')
            .eq('document_id', voucherId);

        if (error) {
            throw new Error(error.message);
        }

        if (!data || data.length === 0) {
            return {
                isBalanced: true,
                totalDebits: 0,
                totalCredits: 0,
                difference: 0
            };
        }

        const totalDebits = data
            .filter(entry => entry.type === 'Dr')
            .reduce((sum, entry) => sum + entry.amount, 0);
        
        const totalCredits = data
            .filter(entry => entry.type === 'Cr')
            .reduce((sum, entry) => sum + entry.amount, 0);
        
        const difference = Math.abs(totalDebits - totalCredits);
        const isBalanced = difference < 0.01;

        return {
            isBalanced,
            totalDebits,
            totalCredits,
            difference
        };
        
    } catch (error) {
        console.error('Error in validateVoucherBalance:', error);
        throw error;
    }
}