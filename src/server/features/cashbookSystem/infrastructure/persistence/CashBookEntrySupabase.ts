import { PaymentOperationResult } from "@/server/features/Payment/infrastructure/persistence/paymentSupabase";
import { CashBookEntry } from "../../core/entities/CashbookSystem";
import { createClient } from "@/utils/supabase/server";
import { Voucher, PaymentVoucher, ReceiptVoucher, ContraVoucher } from "@/server/features/vouchers/core/entities/VoucherSystem";


export function getCashBookEntries(cashBookId: string) {
  return async (startDate?: Date, endDate?: Date): Promise<CashBookEntry[]> => {
    try {
      const supabase = await createClient();

      // Build query
      let query = supabase
        .from('cash_book_entries')
        .select('*')
        .eq('cash_book_id', cashBookId)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });

      // Add date range filter if provided
      if (startDate && endDate) {
        query = query
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching cash book entries:", error);
        return [];
      }

      if (!data) {
        return [];
      }

      return data.map(entry => CashBookEntry.fromDbFormat(entry));
    } catch (error) {
      console.error("Unexpected error fetching cash book entries:", error);
      return [];
    }
  };
}

export function getCashBookEntry(entryId: string) {
  return async (): Promise<CashBookEntry | null> => {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('cash_book_entries')
        .select('*')
        .eq('id', entryId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log("Cash book entry not found:", entryId);
          return null;
        }
        console.error("Error fetching cash book entry:", error);
        return null;
      }

      if (!data) {
        return null;
      }

      return CashBookEntry.fromDbFormat(data);
    } catch (error) {
      console.error("Unexpected error fetching cash book entry:", error);
      return null;
    }
  };
}

export function createCashBookEntry(entry: CashBookEntry) {
  return async (): Promise<CashBookEntry | null> => {
    try {
      const supabase = await createClient();

      // Prepare entry data
      const entryData = {
        ...entry.toDbFormat(),
        date: entry.date.toISOString().split('T')[0], // Ensure proper date format
      };

      // Insert new entry
      const { data, error } = await supabase
        .from('cash_book_entries')
        .insert(entryData)
        .select('*')
        .single();

      if (error) {
        console.error("Error creating cash book entry:", error);
        return null;
      }

      return CashBookEntry.fromDbFormat(data);
    } catch (error) {
      console.error("Unexpected error creating cash book entry:", error);
      return null;
    }
  };
}

export function createMultipleCashBookEntries(entries: CashBookEntry[]) {
  return async (): Promise<CashBookEntry[]> => {
    try {
      const supabase = await createClient();

      if (entries.length === 0) {
        return [];
      }

      // Prepare entries data
      const entriesData = entries.map(entry => ({
        ...entry.toDbFormat(),
        date: entry.date.toISOString().split('T')[0], // Ensure proper date format
      }));

      // Insert multiple entries
      const { data, error } = await supabase
        .from('cash_book_entries')
        .insert(entriesData)
        .select('*');

      if (error) {
        console.error("Error creating multiple cash book entries:", error);
        return [];
      }

      if (!data) {
        return [];
      }

      return data.map(entry => CashBookEntry.fromDbFormat(entry));
    } catch (error) {
      console.error("Unexpected error creating multiple cash book entries:", error);
      return [];
    }
  };
}

export function updateCashBookEntry(entry: CashBookEntry) {
  return async (): Promise<CashBookEntry | null> => {
    try {
      const supabase = await createClient();

      if (!entry.id) {
        console.error("Cash book entry ID is required for update");
        return null;
      }

      // Prepare update data
      const updateData = {
        date: entry.date.toISOString().split('T')[0],
        amount: entry.amount,
        type: entry.type,
        transaction_type: entry.transactionType,
        document_id: entry.documentId,
        document_type: entry.documentType,
        document_number: entry.documentNumber,
        primary_description: entry.primaryDescription,
        secondary_description: entry.secondaryDescription,
        reference_description: entry.referenceDescription,
        ledger_reference: entry.ledgerReference,
        is_opening_balance: entry.isOpeningBalance,
        updated_at: new Date().toISOString(),
      };

      // Update entry
      const { data, error } = await supabase
        .from('cash_book_entries')
        .update(updateData)
        .eq('id', entry.id)
        .select('*')
        .single();

      if (error) {
        console.error("Error updating cash book entry:", error);
        return null;
      }

      return CashBookEntry.fromDbFormat(data);
    } catch (error) {
      console.error("Unexpected error updating cash book entry:", error);
      return null;
    }
  };
}

export function deleteCashBookEntry(entryId: string) {
  return async (): Promise<boolean> => {
    try {
      const supabase = await createClient();

      const { error } = await supabase
        .from('cash_book_entries')
        .delete()
        .eq('id', entryId);

      if (error) {
        console.error("Error deleting cash book entry:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Unexpected error deleting cash book entry:", error);
      return false;
    }
  };
}

export function deleteMultipleCashBookEntries(entryIds: string[]) {
  return async (): Promise<boolean> => {
    try {
      const supabase = await createClient();

      if (entryIds.length === 0) {
        return true;
      }

      const { error } = await supabase
        .from('cash_book_entries')
        .delete()
        .in('id', entryIds);

      if (error) {
        console.error("Error deleting multiple cash book entries:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Unexpected error deleting multiple cash book entries:", error);
      return false;
    }
  };
}

// Get entries by document reference
export function getCashBookEntriesByDocument(documentId: string, documentType?: string) {
  return async (): Promise<CashBookEntry[]> => {
    try {
      const supabase = await createClient();

      let query = supabase
        .from('cash_book_entries')
        .select('*')
        .eq('document_id', documentId)
        .order('date', { ascending: true });

      if (documentType) {
        query = query.eq('document_type', documentType);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching entries by document:", error);
        return [];
      }

      if (!data) {
        return [];
      }

      return data.map(entry => CashBookEntry.fromDbFormat(entry));
    } catch (error) {
      console.error("Unexpected error fetching entries by document:", error);
      return [];
    }
  };
}

// Get entries by transaction type
export function getCashBookEntriesByTransactionType(cashBookId: string, transactionType: string) {
  return async (startDate?: Date, endDate?: Date): Promise<CashBookEntry[]> => {
    try {
      const supabase = await createClient();

      let query = supabase
        .from('cash_book_entries')
        .select('*')
        .eq('cash_book_id', cashBookId)
        .eq('transaction_type', transactionType)
        .order('date', { ascending: true });

      // Add date range filter if provided
      if (startDate && endDate) {
        query = query
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching entries by transaction type:", error);
        return [];
      }

      if (!data) {
        return [];
      }

      return data.map(entry => CashBookEntry.fromDbFormat(entry));
    } catch (error) {
      console.error("Unexpected error fetching entries by transaction type:", error);
      return [];
    }
  };
}

// Get opening balance entry
export function getOpeningBalanceEntry(cashBookId: string) {
  return async (): Promise<CashBookEntry | null> => {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('cash_book_entries')
        .select('*')
        .eq('cash_book_id', cashBookId)
        .eq('is_opening_balance', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No opening balance entry found
        }
        console.error("Error fetching opening balance entry:", error);
        return null;
      }

      if (!data) {
        return null;
      }

      return CashBookEntry.fromDbFormat(data);
    } catch (error) {
      console.error("Unexpected error fetching opening balance entry:", error);
      return null;
    }
  };
}

// Delete entries by document reference (useful for document deletion)
export function deleteCashBookEntriesByDocument(documentId: string, documentType?: string) {
  return async (): Promise<boolean> => {
    try {
      const supabase = await createClient();

      let query = supabase
        .from('cash_book_entries')
        .delete()
        .eq('document_id', documentId);

      if (documentType) {
        query = query.eq('document_type', documentType);
      }

      const { error } = await query;

      if (error) {
        console.error("Error deleting entries by document:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Unexpected error deleting entries by document:", error);
      return false;
    }
  };
}

// Get cash flow summary for a date range
export async function getCashFlowSummary(
  cashBookId: string, 
  startDate: Date, 
  endDate: Date
): Promise<{
  totalCashIn: number;
  totalCashOut: number;
  netCashFlow: number;
  entryCount: number;
} | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('cash_book_entries')
      .select('amount, type')
      .eq('cash_book_id', cashBookId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .neq('is_opening_balance', true); // Exclude opening balance

    if (error) {
      console.error("Error fetching cash flow summary:", error);
      return null;
    }

    if (!data) {
      return {
        totalCashIn: 0,
        totalCashOut: 0,
        netCashFlow: 0,
        entryCount: 0,
      };
    }

    let totalCashIn = 0;
    let totalCashOut = 0;

    data.forEach(entry => {
      if (entry.type === 'Dr') {
        totalCashIn += Number(entry.amount);
      } else {
        totalCashOut += Number(entry.amount);
      }
    });

    return {
      totalCashIn,
      totalCashOut,
      netCashFlow: totalCashIn - totalCashOut,
      entryCount: data.length,
    };
  } catch (error) {
    console.error("Unexpected error fetching cash flow summary:", error);
    return null;
  }
}











import { createLedgerEntry } from "@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase";
import { LedgerEntry } from "@/server/features/ledger/core/entities/Ledger";

/**
 * Creates Cash Book Entry with corresponding Ledger Entry
 */
export async function createCashBookEntryWithLedger(
    cashBookEntry: CashBookEntry,
    cashLedgerAccountId: string
): Promise<{ 
    cashEntry: CashBookEntry; 
    ledgerEntry: LedgerEntry;
}> {
    try {
        // Step 1: Create cash book entry
        const createdCashEntry = await createCashBookEntry(cashBookEntry)();
        
        if (!createdCashEntry) {
            throw new Error('Failed to create cash book entry');
        }

        // Step 2: Create corresponding ledger entry
        const ledgerEntry = await createLedgerEntry({
            ledgerAccountId: cashLedgerAccountId,
            date: cashBookEntry.date,
            amount: cashBookEntry.amount,
            type: cashBookEntry.type,
            primaryDescription: cashBookEntry.primaryDescription,
            documentId: cashBookEntry.documentId,
            documentType: cashBookEntry.documentType,
            documentNumber: cashBookEntry.documentNumber,
            secondaryDescription: cashBookEntry.secondaryDescription,
            referenceDescription: cashBookEntry.referenceDescription,
            ledgerReference: cashBookEntry.ledgerReference,
            isOpeningBalance: cashBookEntry.isOpeningBalance
        });

        console.log(`Created synchronized Cash Book and Ledger entry: ₹${cashBookEntry.amount} (${cashBookEntry.type})`);

        return { 
            cashEntry: createdCashEntry, 
            ledgerEntry 
        };
    } catch (error) {
        console.error('Error in createCashBookEntryWithLedger:', error);
        throw error;
    }
}

// Function to create cash book entry from PaymentOperationResult
export async function createCashBookEntryFromPaymentOperation(
    paymentResult: PaymentOperationResult,
    partyName?: string,
    cashLedgerAccountId?: string // NEW PARAMETER
): Promise<{
    cashEntry: CashBookEntry;
    ledgerEntry?: LedgerEntry; // NEW RETURN
}> {
    const supabase = await createClient();
    
    try {
        const { payment, paymentDocument, newPaidAmount, remainingAmount, statusChanged } = paymentResult;

        if (payment.method !== 'cash') {
            throw new Error('Payment method must be cash for cash book entries');
        }

        if (!payment.cashbookId) {
            throw new Error('Cash book ID is required for cash payments');
        }

        let transactionType: string;
        let entryType: 'Dr' | 'Cr';
        
        if (payment.isReversalPayment()) {
            transactionType = `Payment Reversal`;
            entryType = payment.type === 'payment_in' ? 'Cr' : 'Dr';
        } else {
            transactionType = payment.type === 'payment_in' ? 'Payment In' : 'Payment Out';
            entryType = payment.type === 'payment_in' ? 'Dr' : 'Cr';
        }

        const partyInfo = partyName ? ` - ${partyName}` : '';
        const documentInfo = ` (${paymentDocument.documentType} #${paymentDocument.documentNumber})`;
        const primaryDescription = `${transactionType}${partyInfo}${documentInfo}`;
        
        const operationContext = payment.isReversalPayment() ? 'Reversal of payment' : 'Payment processing';
        const statusContext = statusChanged ? ` | Status: ${paymentDocument.paymentStatus}` : '';
        const secondaryDescription = `${operationContext}${statusContext}`;
        
        const balanceInfo = `Paid: ₹${newPaidAmount.toLocaleString()} / ₹${paymentDocument.totalDocumentAmount.toLocaleString()}`;
        const remainingInfo = remainingAmount > 0 
            ? ` | Outstanding: ₹${remainingAmount.toLocaleString()}` 
            : ' | Fully Settled';
        const referenceDescription = `${balanceInfo}${remainingInfo}`;

        const cashBookEntry = new CashBookEntry(
            payment.cashbookId,
            payment.date,
            Math.abs(payment.amount),
            entryType,
            transactionType,
            primaryDescription,
            undefined,
            payment.id,
            'payment',
            paymentDocument.documentNumber,
            secondaryDescription,
            referenceDescription,
            `Payment-${payment.id}`,
            false
        );

        // Create cash book entry
        const { data, error } = await supabase
            .from('cash_book_entries')
            .insert(cashBookEntry.toDbFormat())
            .select('*')
            .single();

        if (error) {
            console.error("Error creating cash book entry from payment operation:", error);
            throw new Error(`Failed to create cash book entry: ${error.message}`);
        }

        const createdCashEntry = CashBookEntry.fromDbFormat(data);

        // Create corresponding ledger entry if cashLedgerAccountId provided
        let ledgerEntry: LedgerEntry | undefined;
        if (cashLedgerAccountId) {
            ledgerEntry = await createLedgerEntry({
                ledgerAccountId: cashLedgerAccountId,
                date: cashBookEntry.date,
                amount: cashBookEntry.amount,
                type: cashBookEntry.type,
                primaryDescription: cashBookEntry.primaryDescription,
                documentId: cashBookEntry.documentId,
                documentType: cashBookEntry.documentType,
                documentNumber: cashBookEntry.documentNumber,
                secondaryDescription: cashBookEntry.secondaryDescription,
                referenceDescription: cashBookEntry.referenceDescription,
                ledgerReference: cashBookEntry.ledgerReference,
                isOpeningBalance: false
            });
            console.log(`Created Cash Ledger entry for payment ${payment.id}`);
        }

        console.log(`Created cash book entry for payment ${payment.id} in cash book ${payment.cashbookId}`);
        return { cashEntry: createdCashEntry, ledgerEntry };

    } catch (error) {
        console.error('Error in createCashBookEntryFromPaymentOperation:', error);
        throw error;
    }
}

// Batch function for processing multiple payment operation results
export async function createCashBookEntriesFromPaymentOperations(
    paymentResults: PaymentOperationResult[],
    partyNames?: Map<string, string>,
    cashLedgerAccountId?: string // NEW PARAMETER
): Promise<{
    cashEntries: CashBookEntry[];
    ledgerEntries: LedgerEntry[]; // NEW RETURN
}> {
    const supabase = await createClient();
    
    try {
        const cashBookEntries: CashBookEntry[] = [];
        const ledgerEntries: LedgerEntry[] = [];
        
        const cashPaymentResults = paymentResults.filter(result => 
            result.payment.method === 'cash' && result.payment.cashbookId
        );

        if (cashPaymentResults.length === 0) {
            console.log('No cash payments found in the results');
            return { cashEntries: [], ledgerEntries: [] };
        }
 
        for (const paymentResult of cashPaymentResults) {
            const { payment, paymentDocument, newPaidAmount, remainingAmount, statusChanged } = paymentResult;
            const partyName = partyNames?.get(payment.partyLedgerAccountId);
            
            let transactionType: string;
            let entryType: 'Dr' | 'Cr';
            
            if (payment.isReversalPayment()) {
                transactionType = `Payment Reversal`;
                entryType = payment.type === 'payment_in' ? 'Cr' : 'Dr';
            } else {
                transactionType = payment.type === 'payment_in' ? 'Payment In' : 'Payment Out';
                entryType = payment.type === 'payment_in' ? 'Dr' : 'Cr';
            }

            const partyInfo = partyName ? ` - ${partyName}` : '';
            const documentInfo = ` (${paymentDocument.documentType} #${paymentDocument.documentNumber})`;
            const primaryDescription = `${transactionType}${partyInfo}${documentInfo}`;
            
            const operationContext = payment.isReversalPayment() ? 'Reversal' : 'Payment';
            const statusContext = statusChanged ? ` | Status: ${paymentDocument.paymentStatus}` : '';
            const secondaryDescription = `${operationContext}${statusContext}`;
            
            const balanceInfo = `₹${newPaidAmount.toLocaleString()} / ₹${paymentDocument.totalDocumentAmount.toLocaleString()}`;
            const remainingInfo = remainingAmount > 0 ? ` | Due: ₹${remainingAmount.toLocaleString()}` : ' | Settled';
            const referenceDescription = `${balanceInfo}${remainingInfo}`;

            const cashBookEntry = new CashBookEntry(
                payment.cashbookId!,
                payment.date,
                Math.abs(payment.amount),
                entryType,
                transactionType,
                primaryDescription,
                undefined,
                payment.id,
                'payment',
                paymentDocument.documentNumber,
                secondaryDescription,
                referenceDescription,
                `Payment-${payment.id}`,
                false
            );

            cashBookEntries.push(cashBookEntry);
        }

        // Bulk insert cash book entries
        if (cashBookEntries.length > 0) {
            const dbEntries = cashBookEntries.map(entry => entry.toDbFormat());
            
            const { data, error } = await supabase
                .from('cash_book_entries')
                .insert(dbEntries)
                .select();

            if (error) {
                console.error("Error creating cash book entries from payment operations:", error);
                throw new Error(`Failed to create cash book entries: ${error.message}`);
            }

            const createdCashEntries = data.map(CashBookEntry.fromDbFormat);

            // Create corresponding ledger entries if cashLedgerAccountId provided
            if (cashLedgerAccountId) {
                for (const cashEntry of createdCashEntries) {
                    const ledgerEntry = await createLedgerEntry({
                        ledgerAccountId: cashLedgerAccountId,
                        date: cashEntry.date,
                        amount: cashEntry.amount,
                        type: cashEntry.type,
                        primaryDescription: cashEntry.primaryDescription,
                        documentId: cashEntry.documentId,
                        documentType: cashEntry.documentType,
                        documentNumber: cashEntry.documentNumber,
                        secondaryDescription: cashEntry.secondaryDescription,
                        referenceDescription: cashEntry.referenceDescription,
                        ledgerReference: cashEntry.ledgerReference,
                        isOpeningBalance: false
                    });
                    ledgerEntries.push(ledgerEntry);
                }
                console.log(`Created ${ledgerEntries.length} Cash Ledger entries`);
            }

            console.log(`Created ${data.length} cash book entries from payment operation results`);
            return { cashEntries: createdCashEntries, ledgerEntries };
        }

        return { cashEntries: [], ledgerEntries: [] };

    } catch (error) {
        console.error('Error in createCashBookEntriesFromPaymentOperations:', error);
        throw error;
    }
}
// Function to create cash book entries from vouchers

export async function createCashBookEntriesFromVoucher(
    voucher: Voucher,
    cashLedgerAccountId?: string // NEW PARAMETER
): Promise<{
    cashEntries: CashBookEntry[];
    ledgerEntries: LedgerEntry[]; // NEW RETURN
}> {
    const supabase = await createClient();
    
    try {
        const cashBookEntries: CashBookEntry[] = [];
        const ledgerEntries: LedgerEntry[] = [];
        
        if (voucher.voucherType === 'payment' && voucher.paymentMode === 'cash') {
            const paymentVoucher = voucher as PaymentVoucher;
            if (!paymentVoucher.cashBookId) {
                throw new Error('Cash book ID is required for cash payment vouchers');
            }
            
            const cashEntry = new CashBookEntry(
                paymentVoucher.cashBookId,
                paymentVoucher.date,
                paymentVoucher.getTotalAmount(),
                'Cr',
                'Payment Out',
                `Payment Voucher #${paymentVoucher.voucherNumber}`,
                undefined,
                paymentVoucher.id,
                'payment_voucher',
                paymentVoucher.voucherNumber,
                paymentVoucher.description,
                `Total Amount: ₹${paymentVoucher.getTotalAmount().toLocaleString()}`,
                `Voucher-${paymentVoucher.id}`,
                false
            );
            cashBookEntries.push(cashEntry);
        }
        
        if (voucher.voucherType === 'receipt' && voucher.receiptMode === 'cash') {
            const receiptVoucher = voucher as ReceiptVoucher;
            if (!receiptVoucher.cashBookId) {
                throw new Error('Cash book ID is required for cash receipt vouchers');
            }
            
            const cashEntry = new CashBookEntry(
                receiptVoucher.cashBookId,
                receiptVoucher.date,
                receiptVoucher.getTotalAmount(),
                'Dr',
                'Payment In',
                `Receipt Voucher #${receiptVoucher.voucherNumber}`,
                undefined,
                receiptVoucher.id,
                'receipt_voucher',
                receiptVoucher.voucherNumber,
                receiptVoucher.description,
                `Total Amount: ₹${receiptVoucher.getTotalAmount().toLocaleString()}`,
                `Voucher-${receiptVoucher.id}`,
                false
            );
            cashBookEntries.push(cashEntry);
        }
        
        if (voucher.voucherType === 'contra') {
            const contraVoucher = voucher as ContraVoucher;
            const transferAmount = contraVoucher.getTotalAmount();
            
            if (contraVoucher.fromAccount === 'cash' && contraVoucher.fromCashBookId) {
                const fromEntry = new CashBookEntry(
                    contraVoucher.fromCashBookId,
                    contraVoucher.date,
                    transferAmount,
                    'Cr',
                    'Cash Transfer Out',
                    `Contra Voucher #${contraVoucher.voucherNumber} - Transfer Out`,
                    undefined,
                    contraVoucher.id,
                    'contra_voucher',
                    contraVoucher.voucherNumber,
                    `Transfer to ${contraVoucher.toAccount}: ${contraVoucher.description}`,
                    `Transfer Amount: ₹${transferAmount.toLocaleString()}`,
                    `Voucher-${contraVoucher.id}`,
                    false
                );
                cashBookEntries.push(fromEntry);
            }
            
            if (contraVoucher.toAccount === 'cash' && contraVoucher.toCashBookId) {
                const toEntry = new CashBookEntry(
                    contraVoucher.toCashBookId,
                    contraVoucher.date,
                    transferAmount,
                    'Dr',
                    'Cash Transfer In',
                    `Contra Voucher #${contraVoucher.voucherNumber} - Transfer In`,
                    undefined,
                    contraVoucher.id,
                    'contra_voucher',
                    contraVoucher.voucherNumber,
                    `Transfer from ${contraVoucher.fromAccount}: ${contraVoucher.description}`,
                    `Transfer Amount: ₹${transferAmount.toLocaleString()}`,
                    `Voucher-${contraVoucher.id}`,
                    false
                );
                cashBookEntries.push(toEntry);
            }
        }
        
        // Bulk insert cash book entries
        if (cashBookEntries.length > 0) {
            const createdCashEntries = await createMultipleCashBookEntries(cashBookEntries)();
            
            // Create corresponding ledger entries if cashLedgerAccountId provided
            if (cashLedgerAccountId) {
                for (const cashEntry of createdCashEntries) {
                    const ledgerEntry = await createLedgerEntry({
                        ledgerAccountId: cashLedgerAccountId,
                        date: cashEntry.date,
                        amount: cashEntry.amount,
                        type: cashEntry.type,
                        primaryDescription: cashEntry.primaryDescription,
                        documentId: cashEntry.documentId,
                        documentType: cashEntry.documentType,
                        documentNumber: cashEntry.documentNumber,
                        secondaryDescription: cashEntry.secondaryDescription,
                        referenceDescription: cashEntry.referenceDescription,
                        ledgerReference: cashEntry.ledgerReference,
                        isOpeningBalance: false
                    });
                    ledgerEntries.push(ledgerEntry);
                }
                console.log(`Created ${ledgerEntries.length} Cash Ledger entries from voucher`);
            }
            
            return { cashEntries: createdCashEntries, ledgerEntries };
        }
        
        return { cashEntries: [], ledgerEntries: [] };
        
    } catch (error) {
        console.error('Error creating cash book entries from voucher:', error);
        throw error;
    }
}





