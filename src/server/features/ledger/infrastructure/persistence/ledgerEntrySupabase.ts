import { createClient } from "@/utils/supabase/server";
import { LedgerEntry, LedgerEntryInterface } from "../../core/entities/Ledger";

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

export async function createLedgerEntry(entryData: LedgerEntryInterface): Promise<LedgerEntry> {
    const supabase = await createClient();
    try {
        const newEntry = new LedgerEntry(
            entryData.ledgerAccountId,
            entryData.date,
            entryData.amount,
            entryData.type,
            entryData.id,
            entryData.description
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
            entryId,
            entryData.description
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

// Transaction-Specific Operations

export interface SalesInvoiceData {
    customerLedgerAccountId: string;
    amount: number;
    date: Date;
    invoiceNumber: string;
    description?: string;
}

export async function createSalesInvoiceEntry(salesData: SalesInvoiceData): Promise<LedgerEntry> {
    const supabase = await createClient();
    try {
        // Customer Account - Debit (Amount Receivable from customer)
        // This shows the customer owes money to the software user
        const entry = new LedgerEntry(
            salesData.customerLedgerAccountId,
            salesData.date,
            salesData.amount,
            'Dr',
            undefined,
            `Sales Invoice - ${salesData.description || 'Sales'}`
        );

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

export interface PurchaseVoucherData {
    supplierLedgerAccountId: string;
    amount: number;
    date: Date;
    voucherNumber: string;
    description?: string;
}

export async function createPurchaseVoucherEntry(purchaseData: PurchaseVoucherData): Promise<LedgerEntry> {
    const supabase = await createClient();
    try {
        // Supplier Account - Credit (Amount Payable to supplier)
        // This shows the software user owes money to the supplier
        const entry = new LedgerEntry(
            purchaseData.supplierLedgerAccountId,
            purchaseData.date,
            purchaseData.amount,
            'Cr',
            undefined,
            `Purchase Voucher - ${purchaseData.description || 'Purchase'}`
        );

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

export interface PaymentInData {
    customerLedgerAccountId: string;
    amount: number;
    date: Date;
    receiptNumber: string;
    description?: string;
}

export async function createPaymentInEntry(paymentData: PaymentInData): Promise<LedgerEntry> {
    const supabase = await createClient();
    try {
        // Customer Account - Credit (Reduces amount receivable from customer)
        // This shows customer has paid, reducing what they owe
        const entry = new LedgerEntry(
            paymentData.customerLedgerAccountId,
            paymentData.date,
            paymentData.amount,
            'Cr',
            undefined,
            `Payment Received ${paymentData.receiptNumber} - ${paymentData.description || 'Payment received'}`
        );

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

export interface PaymentOutData {
    supplierLedgerAccountId: string;
    amount: number;
    date: Date;
    paymentNumber: string;
    description?: string;
}

export async function createPaymentOutEntry(paymentData: PaymentOutData): Promise<LedgerEntry> {
    const supabase = await createClient();
    try {
        // Supplier Account - Debit (Reduces amount payable to supplier)
        // This shows software user has paid, reducing what they owe
        const entry = new LedgerEntry(
            paymentData.supplierLedgerAccountId,
            paymentData.date,
            paymentData.amount,
            'Dr',
            undefined,
            `Payment Made ${paymentData.paymentNumber} - ${paymentData.description || 'Payment made'}`
        );

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

export interface CreditNoteData {
    customerLedgerAccountId: string;
    amount: number;
    date: Date;
    creditNoteNumber: string;
    description?: string;
}

export async function createCreditNoteEntry(creditData: CreditNoteData): Promise<LedgerEntry> {
    const supabase = await createClient();
    try {
        // Customer Account - Credit (Reduces amount receivable from customer)
        // This shows a return/discount reducing what customer owes
        const entry = new LedgerEntry(
            creditData.customerLedgerAccountId,
            creditData.date,
            creditData.amount,
            'Cr',
            undefined,
            `Credit Note ${creditData.creditNoteNumber} - ${creditData.description || 'Credit note'}`
        );

        const { data, error } = await supabase
            .from('ledger_entry')
            .insert(entry.toDbFormat())
            .select()
            .single();

        if (error) {
            console.error("Error creating credit note entry:", error);
            throw new Error(error.message);
        }

        return LedgerEntry.fromDbFormat(data);
    } catch (error) {
        console.error('Error in createCreditNoteEntry:', error);
        throw error;
    }
}

export interface DebitNoteData {
    supplierLedgerAccountId: string;
    amount: number;
    date: Date;
    debitNoteNumber: string;
    description?: string;
}

export async function createDebitNoteEntry(debitData: DebitNoteData): Promise<LedgerEntry> {
    const supabase = await createClient();
    try {
        // Supplier Account - Debit (Reduces amount payable to supplier)
        // This shows a return/discount reducing what software user owes
        const entry = new LedgerEntry(
            debitData.supplierLedgerAccountId,
            debitData.date,
            debitData.amount,
            'Dr',
            undefined,
            `Debit Note ${debitData.debitNoteNumber} - ${debitData.description || 'Debit note'}`
        );

        const { data, error } = await supabase
            .from('ledger_entry')
            .insert(entry.toDbFormat())
            .select()
            .single();

        if (error) {
            console.error("Error creating debit note entry:", error);
            throw new Error(error.message);
        }

        return LedgerEntry.fromDbFormat(data);
    } catch (error) {
        console.error('Error in createDebitNoteEntry:', error);
        throw error;
    }
}

export interface AdjustmentEntryData {
    ledgerAccountId: string;
    amount: number;
    type: 'Dr' | 'Cr';
    date: Date;
    adjustmentNumber: string;
    description?: string;
}

export async function createAdjustmentEntry(adjustmentData: AdjustmentEntryData): Promise<LedgerEntry> {
    const supabase = await createClient();
    try {
        // Adjustment entry - can be either Dr or Cr based on requirement
        const entry = new LedgerEntry(
            adjustmentData.ledgerAccountId,
            adjustmentData.date,
            adjustmentData.amount,
            adjustmentData.type,
            undefined,
            `Adjustment ${adjustmentData.adjustmentNumber} - ${adjustmentData.description || 'Adjustment entry'}`
        );

        const { data, error } = await supabase
            .from('ledger_entry')
            .insert(entry.toDbFormat())
            .select()
            .single();

        if (error) {
            console.error("Error creating adjustment entry:", error);
            throw new Error(error.message);
        }

        return LedgerEntry.fromDbFormat(data);
    } catch (error) {
        console.error('Error in createAdjustmentEntry:', error);
        throw error;
    }
}

// Query Functions

export async function getLedgerEntriesForDateRange(
    ledgerAccountId: string,
    startDate: Date,
    endDate: Date
): Promise<LedgerEntry[]> {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('ledger_entry')
            .select('*')
            .eq('ledger_account_id', ledgerAccountId)
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString())
            .order('date', { ascending: true });

        if (error) {
            throw new Error(error.message);
        }

        return data.map(LedgerEntry.fromDbFormat);
    } catch (error) {
        console.error('Error fetching ledger entries for date range:', error);
        throw error;
    }
}

export async function getLedgerBalance(
    ledgerAccountId: string,
    upToDate?: Date
): Promise<{ balance: number; balanceType: 'Dr' | 'Cr' }> {
    const supabase = await createClient();
    try {
        let query = supabase
            .from('ledger_entry')
            .select('amount, type')
            .eq('ledger_account_id', ledgerAccountId);

        if (upToDate) {
            query = query.lte('date', upToDate.toISOString());
        }

        const { data: entries, error: entriesError } = await query;
        
        if (entriesError) {
            throw new Error(entriesError.message);
        }

        // Get opening balance from ledger account
        const { data: account, error: accountError } = await supabase
            .from('ledger_account')
            .select('opening_balance, balance_type')
            .eq('id', ledgerAccountId)
            .single();

        if (accountError) {
            throw new Error(accountError.message);
        }

        let balance = account.opening_balance;
        const originalBalanceType = account.balance_type;

        // Calculate balance based on entries
        entries.forEach(entry => {
            if (originalBalanceType === 'Dr') {
                balance += entry.type === 'Dr' ? entry.amount : -entry.amount;
            } else {
                balance += entry.type === 'Cr' ? entry.amount : -entry.amount;
            }
        });

        // Determine current balance type
        const balanceType = balance >= 0 ? originalBalanceType : 
                          (originalBalanceType === 'Dr' ? 'Cr' : 'Dr');

                     
        return {
            balance: Math.abs(balance),
            balanceType
        };
    } catch (error) {
        console.error('Error calculating ledger balance:', error);
        throw error;
    }
}

export async function getLedgerStatement(
    ledgerAccountId: string,
    startDate?: Date,
    endDate?: Date
): Promise<{
    openingBalance: { balance: number; balanceType: 'Dr' | 'Cr' };
    entries: LedgerEntry[];
    closingBalance: { balance: number; balanceType: 'Dr' | 'Cr' };
}> {
    const supabase = await createClient();
    try {
        // Get opening balance
        const openingBalance = startDate 
            ? await getLedgerBalance(ledgerAccountId, startDate)
            : { balance: 0, balanceType: 'Dr' as const };

        // Get entries for the period
        const entries = startDate && endDate
            ? await getLedgerEntriesForDateRange(ledgerAccountId, startDate, endDate)
            : await getAllLedgerEntries(ledgerAccountId);

        // Get closing balance
        const closingBalance = endDate
            ? await getLedgerBalance(ledgerAccountId, endDate)
            : await getLedgerBalance(ledgerAccountId);

        return {
            openingBalance,
            entries,
            closingBalance
        };
    } catch (error) {
        console.error('Error generating ledger statement:', error);
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