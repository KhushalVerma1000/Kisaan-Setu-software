import { createClient } from "@/utils/supabase/server";
import { Ledger, LedgerAccount, LedgerAccountInterface, LedgerEntry, LedgerEntryInterface } from "../../core/entities/Ledger";

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
        // Fix: Use the correct constructor parameters
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
        // Fix: Use the correct constructor parameters
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
// Updated ledgerEntrySupabase.ts functions
export async function createSalesInvoiceEntry(
    customerLedgerAccountId: string,
    amount: number,
    date: Date,
    invoiceId: string,        // Changed from invoiceNumber to invoiceId
    invoiceNumber: string,    // Added separate parameter for display number
    customerName: string
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
            partyName: customerName,
            documentNumber: `Invoice #${invoiceNumber}`,
            documentId: invoiceId,        // Use actual invoice ID
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
    voucherId: string,        // Changed from voucherNumber to voucherId
    voucherNumber: string,    // Added separate parameter for display number
    supplierName: string
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
            partyName: supplierName,
            documentNumber: `Voucher #${voucherNumber}`,
            documentId: voucherId,        // Use actual voucher ID
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

export async function createPaymentInEntry(
    customerLedgerAccountId: string,
    amount: number,
    date: Date,
    paymentId: string,        // Changed from receiptNumber to paymentId
    receiptNumber: string,    // Added separate parameter for display number
    customerName: string
): Promise<LedgerEntry> {
    const supabase = await createClient();
    try {
        // Customer Account - Credit (Reduces amount receivable from customer)
        const transactionData: UniversalTransactionData = {
            ledgerAccountId: customerLedgerAccountId,
            amount: amount,
            type: 'Cr',
            date: date,
            transactionType: 'Payment In',
            partyName: customerName,
            documentNumber: `Receipt #${receiptNumber}`,
            documentId: paymentId,        // Use actual payment ID
            documentType: 'payment'
        };

        const entry = createUniversalLedgerEntry(transactionData);

        const { data, error } = await supabase
            .from('ledger_entry')
            .insert(entry.toDbFormat())
            .select()
            .single();

        if (error) {
            console.error("Error creating payment in entry:", error);
            throw new Error(error.message);
        }

        return LedgerEntry.fromDbFormat(data);
    } catch (error) {
        console.error('Error in createPaymentInEntry:', error);
        throw error;
    }
}

export async function createPaymentOutEntry(
    supplierLedgerAccountId: string,
    amount: number,
    date: Date,
    paymentId: string,        // Changed from paymentNumber to paymentId
    paymentNumber: string,    // Added separate parameter for display number
    supplierName: string
): Promise<LedgerEntry> {
    const supabase = await createClient();
    try {
        // Supplier Account - Debit (Reduces amount payable to supplier)
        const transactionData: UniversalTransactionData = {
            ledgerAccountId: supplierLedgerAccountId,
            amount: amount,
            type: 'Dr',
            date: date,
            transactionType: 'Payment Out',
            partyName: supplierName,
            documentNumber: `Payment #${paymentNumber}`,
            documentId: paymentId,        // Use actual payment ID
            documentType: 'payment'
        };

        const entry = createUniversalLedgerEntry(transactionData);

        const { data, error } = await supabase
            .from('ledger_entry')
            .insert(entry.toDbFormat())
            .select()
            .single();

        if (error) {
            console.error("Error creating payment out entry:", error);
            throw new Error(error.message);
        }

        return LedgerEntry.fromDbFormat(data);
    } catch (error) {
        console.error('Error in createPaymentOutEntry:', error);
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