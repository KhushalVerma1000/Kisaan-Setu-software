import { PaymentOperationResult } from "@/server/features/Payment/infrastructure/persistence/paymentSupabase";
import { BankBookEntry } from "../../core/entities/BankBookSystem";
import { createClient } from "@/utils/supabase/server";
import { Voucher, PaymentVoucher, ReceiptVoucher, ContraVoucher } from "@/server/features/vouchers/core/entities/VoucherSystem";
import { LedgerEntry } from "@/server/features/ledger/core/entities/Ledger";
import { createLedgerEntry } from "@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase";

export function getBankBookEntries(bankBookId: string) {
  return async (startDate?: Date, endDate?: Date): Promise<BankBookEntry[]> => {
    try {
      const supabase = await createClient();

      // Build query
      let query = supabase
        .from('bank_book_entries')
        .select('*')
        .eq('bank_book_id', bankBookId)
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
        console.error("Error fetching bank book entries:", error);
        return [];
      }

      if (!data) {
        return [];
      }

      return data.map(entry => BankBookEntry.fromDbFormat(entry));
    } catch (error) {
      console.error("Unexpected error fetching bank book entries:", error);
      return [];
    }
  };
}

export function getBankBookEntry(entryId: string) {
  return async (): Promise<BankBookEntry | null> => {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('bank_book_entries')
        .select('*')
        .eq('id', entryId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log("Bank book entry not found:", entryId);
          return null;
        }
        console.error("Error fetching bank book entry:", error);
        return null;
      }

      if (!data) {
        return null;
      }

      return BankBookEntry.fromDbFormat(data);
    } catch (error) {
      console.error("Unexpected error fetching bank book entry:", error);
      return null;
    }
  };
}

export function createBankBookEntry(entry: BankBookEntry) {
  return async (): Promise<BankBookEntry | null> => {
    try {
      const supabase = await createClient();

      // Prepare entry data
      const entryData = {
        ...entry.toDbFormat(),
        date: entry.date.toISOString().split('T')[0], // Ensure proper date format
      };

      // Insert new entry
      const { data, error } = await supabase
        .from('bank_book_entries')
        .insert(entryData)
        .select('*')
        .single();

      if (error) {
        console.error("Error creating bank book entry:", error);
        return null;
      }

      return BankBookEntry.fromDbFormat(data);
    } catch (error) {
      console.error("Unexpected error creating bank book entry:", error);
      return null;
    }
  };
}

export function createMultipleBankBookEntries(entries: BankBookEntry[]) {
  return async (): Promise<BankBookEntry[]> => {
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
        .from('bank_book_entries')
        .insert(entriesData)
        .select('*');

      if (error) {
        console.error("Error creating multiple bank book entries:", error);
        return [];
      }

      if (!data) {
        return [];
      }

      return data.map(entry => BankBookEntry.fromDbFormat(entry));
    } catch (error) {
      console.error("Unexpected error creating multiple bank book entries:", error);
      return [];
    }
  };
}

export function updateBankBookEntry(entry: BankBookEntry) {
  return async (): Promise<BankBookEntry | null> => {
    try {
      const supabase = await createClient();

      if (!entry.id) {
        console.error("Bank book entry ID is required for update");
        return null;
      }

      // Prepare update data
      const updateData = {
        date: entry.date.toISOString().split('T')[0],
        amount: entry.amount,
        type: entry.type,
        transaction_type: entry.transactionType,
        payment_method: entry.paymentMethod,
        document_id: entry.documentId,
        document_type: entry.documentType,
        document_number: entry.documentNumber,
        primary_description: entry.primaryDescription,
        secondary_description: entry.secondaryDescription,
        reference_description: entry.referenceDescription,
        ledger_reference: entry.ledgerReference,
        cheque_number: entry.chequeNumber,
        reference_number: entry.referenceNumber,
        is_opening_balance: entry.isOpeningBalance,
        updated_at: new Date().toISOString(),
      };

      // Update entry
      const { data, error } = await supabase
        .from('bank_book_entries')
        .update(updateData)
        .eq('id', entry.id)
        .select('*')
        .single();

      if (error) {
        console.error("Error updating bank book entry:", error);
        return null;
      }

      return BankBookEntry.fromDbFormat(data);
    } catch (error) {
      console.error("Unexpected error updating bank book entry:", error);
      return null;
    }
  };
}

export function deleteBankBookEntry(entryId: string) {
  return async (): Promise<boolean> => {
    try {
      const supabase = await createClient();

      const { error } = await supabase
        .from('bank_book_entries')
        .delete()
        .eq('id', entryId);

      if (error) {
        console.error("Error deleting bank book entry:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Unexpected error deleting bank book entry:", error);
      return false;
    }
  };
}

export function deleteMultipleBankBookEntries(entryIds: string[]) {
  return async (): Promise<boolean> => {
    try {
      const supabase = await createClient();

      if (entryIds.length === 0) {
        return true;
      }

      const { error } = await supabase
        .from('bank_book_entries')
        .delete()
        .in('id', entryIds);

      if (error) {
        console.error("Error deleting multiple bank book entries:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Unexpected error deleting multiple bank book entries:", error);
      return false;
    }
  };
}

// Get entries by document reference
export function getBankBookEntriesByDocument(documentId: string, documentType?: string) {
  return async (): Promise<BankBookEntry[]> => {
    try {
      const supabase = await createClient();

      let query = supabase
        .from('bank_book_entries')
        .select('*')
        .eq('document_id', documentId)
        .order('date', { ascending: true });

      if (documentType) {
        query = query.eq('document_type', documentType);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching bank book entries by document:", error);
        return [];
      }

      if (!data) {
        return [];
      }

      return data.map(entry => BankBookEntry.fromDbFormat(entry));
    } catch (error) {
      console.error("Unexpected error fetching bank book entries by document:", error);
      return [];
    }
  };
}

// Get entries by transaction type
export function getBankBookEntriesByTransactionType(bankBookId: string, transactionType: string) {
  return async (startDate?: Date, endDate?: Date): Promise<BankBookEntry[]> => {
    try {
      const supabase = await createClient();

      let query = supabase
        .from('bank_book_entries')
        .select('*')
        .eq('bank_book_id', bankBookId)
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
        console.error("Error fetching bank book entries by transaction type:", error);
        return [];
      }

      if (!data) {
        return [];
      }

      return data.map(entry => BankBookEntry.fromDbFormat(entry));
    } catch (error) {
      console.error("Unexpected error fetching bank book entries by transaction type:", error);
      return [];
    }
  };
}

// Get entries by payment method
export function getBankBookEntriesByPaymentMethod(bankBookId: string, paymentMethod: string) {
  return async (startDate?: Date, endDate?: Date): Promise<BankBookEntry[]> => {
    try {
      const supabase = await createClient();

      let query = supabase
        .from('bank_book_entries')
        .select('*')
        .eq('bank_book_id', bankBookId)
        .eq('payment_method', paymentMethod)
        .order('date', { ascending: true });

      // Add date range filter if provided
      if (startDate && endDate) {
        query = query
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching bank book entries by payment method:", error);
        return [];
      }

      if (!data) {
        return [];
      }

      return data.map(entry => BankBookEntry.fromDbFormat(entry));
    } catch (error) {
      console.error("Unexpected error fetching bank book entries by payment method:", error);
      return [];
    }
  };
}

// Get entries by cheque number
export function getBankBookEntriesByChequeNumber(bankBookId: string, chequeNumber: string) {
  return async (): Promise<BankBookEntry[]> => {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('bank_book_entries')
        .select('*')
        .eq('bank_book_id', bankBookId)
        .eq('cheque_number', chequeNumber)
        .order('date', { ascending: true });

      if (error) {
        console.error("Error fetching bank book entries by cheque number:", error);
        return [];
      }

      if (!data) {
        return [];
      }

      return data.map(entry => BankBookEntry.fromDbFormat(entry));
    } catch (error) {
      console.error("Unexpected error fetching bank book entries by cheque number:", error);
      return [];
    }
  };
}

// Get opening balance entry
export function getOpeningBalanceEntry(bankBookId: string) {
  return async (): Promise<BankBookEntry | null> => {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('bank_book_entries')
        .select('*')
        .eq('bank_book_id', bankBookId)
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

      return BankBookEntry.fromDbFormat(data);
    } catch (error) {
      console.error("Unexpected error fetching opening balance entry:", error);
      return null;
    }
  };
}

// Delete entries by document reference (useful for document deletion)
export function deleteBankBookEntriesByDocument(documentId: string, documentType?: string) {
  return async (): Promise<boolean> => {
    try {
      const supabase = await createClient();

      let query = supabase
        .from('bank_book_entries')
        .delete()
        .eq('document_id', documentId);

      if (documentType) {
        query = query.eq('document_type', documentType);
      }

      const { error } = await query;

      if (error) {
        console.error("Error deleting bank book entries by document:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Unexpected error deleting bank book entries by document:", error);
      return false;
    }
  };
}

// Get bank flow summary for a date range (similar to cash flow summary)
export async function getBankFlowSummary(
  bankBookId: string, 
  startDate: Date, 
  endDate: Date
): Promise<{
  totalMoneyIn: number;
  totalMoneyOut: number;
  netBankFlow: number;
  entryCount: number;
} | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('bank_book_entries')
      .select('amount, type')
      .eq('bank_book_id', bankBookId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .neq('is_opening_balance', true); // Exclude opening balance

    if (error) {
      console.error("Error fetching bank flow summary:", error);
      return null;
    }

    if (!data) {
      return {
        totalMoneyIn: 0,
        totalMoneyOut: 0,
        netBankFlow: 0,
        entryCount: 0,
      };
    }

    let totalMoneyIn = 0;
    let totalMoneyOut = 0;

    data.forEach(entry => {
      if (entry.type === 'Dr') {
        totalMoneyIn += Number(entry.amount);
      } else {
        totalMoneyOut += Number(entry.amount);
      }
    });

    return {
      totalMoneyIn,
      totalMoneyOut,
      netBankFlow: totalMoneyIn - totalMoneyOut,
      entryCount: data.length,
    };
  } catch (error) {
    console.error("Unexpected error fetching bank flow summary:", error);
    return null;
  }
}

// Get all bank book entries across multiple bank books for consolidated reporting
export function getAllBankBookEntriesForFpo(fpoId: string) {
  return async (startDate?: Date, endDate?: Date): Promise<BankBookEntry[]> => {
    try {
      const supabase = await createClient();

      // Build query with join to get entries from all bank books of the FPO
      let query = supabase
        .from('bank_book_entries')
        .select(`
          *,
          bank_books!inner(fpo_id)
        `)
        .eq('bank_books.fpo_id', fpoId)
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
        console.error("Error fetching all bank book entries for FPO:", error);
        return [];
      }

      if (!data) {
        return [];
      }

      return data.map(entry => BankBookEntry.fromDbFormat(entry));
    } catch (error) {
      console.error("Unexpected error fetching all bank book entries for FPO:", error);
      return [];
    }
  };
}






// Continuing from where we left off in BankBookEntrySystem.ts

/**
 * Creates Bank Book Entry with corresponding Ledger Entry
 */
export async function createBankBookEntryWithLedger(
    bankBookEntry: BankBookEntry,
    bankLedgerAccountId: string
): Promise<{ 
    bankEntry: BankBookEntry; 
    ledgerEntry: LedgerEntry;
}> {
    try {
        const createdBankEntry = await createBankBookEntry(bankBookEntry)();
        
        if (!createdBankEntry) {
            throw new Error('Failed to create bank book entry');
        }

        const ledgerEntry = await createLedgerEntry({
            ledgerAccountId: bankLedgerAccountId,
            date: bankBookEntry.date,
            amount: bankBookEntry.amount,
            type: bankBookEntry.type,
            primaryDescription: bankBookEntry.primaryDescription,
            documentId: bankBookEntry.documentId,
            documentType: bankBookEntry.documentType,
            documentNumber: bankBookEntry.documentNumber,
            secondaryDescription: bankBookEntry.secondaryDescription,
            referenceDescription: bankBookEntry.referenceDescription,
            ledgerReference: bankBookEntry.ledgerReference,
            isOpeningBalance: bankBookEntry.isOpeningBalance
        });

        console.log(`Created synchronized Bank Book and Ledger entry: ₹${bankBookEntry.amount} (${bankBookEntry.type})`);

        return { 
            bankEntry: createdBankEntry, 
            ledgerEntry 
        };
    } catch (error) {
        console.error('Error in createBankBookEntryWithLedger:', error);
        throw error;
    }
}

// REPLACE the existing createBankBookEntryFromPaymentOperation function:
export async function createBankBookEntryFromPaymentOperation(
    paymentResult: PaymentOperationResult,
    partyName?: string,
    bankLedgerAccountId?: string // NEW PARAMETER
): Promise<{
    bankEntry: BankBookEntry;
    ledgerEntry?: LedgerEntry; // NEW RETURN
}> {
    const supabase = await createClient();
    
    try {
        const { payment, paymentDocument, newPaidAmount, remainingAmount, statusChanged } = paymentResult;

        if (payment.method !== 'bank_transfer') {
            throw new Error('Payment method must be bank_transfer for bank book entries');
        }

        if (!payment.bankbookId) {
            throw new Error('Bank book ID is required for bank transfers');
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

        const bankBookEntry = new BankBookEntry(
            undefined, // id
            payment.bankbookId, // bankBookId
            payment.date, // date
            Math.abs(payment.amount), // amount
            entryType, // type
            transactionType, // transactionType
            primaryDescription, // primaryDescription
            'bank_transfer', // paymentMethod
            payment.id, // documentId
            'payment', // documentType
            paymentDocument.documentNumber, // documentNumber
            secondaryDescription, // secondaryDescription
            referenceDescription, // referenceDescription
            `Payment-${payment.id}`, // ledgerReference
            undefined, // chequeNumber
            payment.referenceNumber, // referenceNumber
            false // isOpeningBalance
        );

        // Create bank book entry
        const { data, error } = await supabase
            .from('bank_book_entries')
            .insert(bankBookEntry.toDbFormat())
            .select('*')
            .single();

        if (error) {
            console.error("Error creating bank book entry from payment operation:", error);
            throw new Error(`Failed to create bank book entry: ${error.message}`);
        }

        const createdBankEntry = BankBookEntry.fromDbFormat(data);

        // Create corresponding ledger entry if bankLedgerAccountId provided
        let ledgerEntry: LedgerEntry | undefined;
        if (bankLedgerAccountId) {
            ledgerEntry = await createLedgerEntry({
                ledgerAccountId: bankLedgerAccountId,
                date: bankBookEntry.date,
                amount: bankBookEntry.amount,
                type: bankBookEntry.type,
                primaryDescription: bankBookEntry.primaryDescription,
                documentId: bankBookEntry.documentId,
                documentType: bankBookEntry.documentType,
                documentNumber: bankBookEntry.documentNumber,
                secondaryDescription: bankBookEntry.secondaryDescription,
                referenceDescription: bankBookEntry.referenceDescription,
                ledgerReference: bankBookEntry.ledgerReference,
                isOpeningBalance: false
            });
            console.log(`Created Bank Ledger entry for payment ${payment.id}`);
        }

        console.log(`Created bank book entry for payment ${payment.id} in bank book ${payment.bankbookId}`);
        return { bankEntry: createdBankEntry, ledgerEntry };

    } catch (error) {
        console.error('Error in createBankBookEntryFromPaymentOperation:', error);
        throw error;
    }
}

// REPLACE the existing createBankBookEntriesFromPaymentOperations function:
export async function createBankBookEntriesFromPaymentOperations(
    paymentResults: PaymentOperationResult[],
    partyNames?: Map<string, string>,
    bankLedgerAccountId?: string // NEW PARAMETER
): Promise<{
    bankEntries: BankBookEntry[];
    ledgerEntries: LedgerEntry[]; // NEW RETURN
}> {
    const supabase = await createClient();
    
    try {
        const bankBookEntries: BankBookEntry[] = [];
        const ledgerEntries: LedgerEntry[] = [];
        
        const bankPaymentResults = paymentResults.filter(result => 
            result.payment.method === 'bank_transfer' && result.payment.bankbookId
        );

        if (bankPaymentResults.length === 0) {
            console.log('No bank transfer payments found in the results');
            return { bankEntries: [], ledgerEntries: [] };
        }
 
        for (const paymentResult of bankPaymentResults) {
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

            const bankBookEntry = new BankBookEntry(
                undefined, // id
                payment.bankbookId!, // bankBookId
                payment.date, // date
                Math.abs(payment.amount), // amount
                entryType, // type
                transactionType, // transactionType
                primaryDescription, // primaryDescription
                'bank_transfer', // paymentMethod
                payment.id, // documentId
                'payment', // documentType
                paymentDocument.documentNumber, // documentNumber
                secondaryDescription, // secondaryDescription
                referenceDescription, // referenceDescription
                `Payment-${payment.id}`, // ledgerReference
                undefined, // chequeNumber
                payment.referenceNumber, // referenceNumber
                false // isOpeningBalance
            );

            bankBookEntries.push(bankBookEntry);
        }

        // Bulk insert bank book entries
        if (bankBookEntries.length > 0) {
            const dbEntries = bankBookEntries.map(entry => entry.toDbFormat());
            
            const { data, error } = await supabase
                .from('bank_book_entries')
                .insert(dbEntries)
                .select();

            if (error) {
                console.error("Error creating bank book entries from payment operations:", error);
                throw new Error(`Failed to create bank book entries: ${error.message}`);
            }

            const createdBankEntries = data.map(BankBookEntry.fromDbFormat);

            // Create corresponding ledger entries if bankLedgerAccountId provided
            if (bankLedgerAccountId) {
                for (const bankEntry of createdBankEntries) {
                    const ledgerEntry = await createLedgerEntry({
                        ledgerAccountId: bankLedgerAccountId,
                        date: bankEntry.date,
                        amount: bankEntry.amount,
                        type: bankEntry.type,
                        primaryDescription: bankEntry.primaryDescription,
                        documentId: bankEntry.documentId,
                        documentType: bankEntry.documentType,
                        documentNumber: bankEntry.documentNumber,
                        secondaryDescription: bankEntry.secondaryDescription,
                        referenceDescription: bankEntry.referenceDescription,
                        ledgerReference: bankEntry.ledgerReference,
                        isOpeningBalance: false
                    });
                    ledgerEntries.push(ledgerEntry);
                }
                console.log(`Created ${ledgerEntries.length} Bank Ledger entries`);
            }

            console.log(`Created ${data.length} bank book entries from payment operation results`);
            return { bankEntries: createdBankEntries, ledgerEntries };
        }

        return { bankEntries: [], ledgerEntries: [] };

    } catch (error) {
        console.error('Error in createBankBookEntriesFromPaymentOperations:', error);
        throw error;
    }
}

// REPLACE the existing createBankBookEntriesFromVoucher function:
export async function createBankBookEntriesFromVoucher(
    voucher: Voucher,
    bankLedgerAccountId?: string // NEW PARAMETER
): Promise<{
    bankEntries: BankBookEntry[];
    ledgerEntries: LedgerEntry[]; // NEW RETURN
}> {
    const supabase = await createClient();
    
    try {
        const bankBookEntries: BankBookEntry[] = [];
        const ledgerEntries: LedgerEntry[] = [];
        
        if (voucher.voucherType === 'payment' && voucher.paymentMode === 'bank') {
            const paymentVoucher = voucher as PaymentVoucher;
            if (!paymentVoucher.bankBookId) {
                throw new Error('Bank book ID is required for bank payment vouchers');
            }
            
            const bankEntry = new BankBookEntry(
                undefined, // id
                paymentVoucher.bankBookId,
                paymentVoucher.date,
                paymentVoucher.getTotalAmount(),
                'Cr', // Bank balance decreasing
                'Payment Out',
                `Payment Voucher #${paymentVoucher.voucherNumber}`,
                paymentVoucher.chequeNumber ? 'Cheque' : 'Bank Transfer',
                paymentVoucher.id,
                'payment_voucher',
                paymentVoucher.voucherNumber,
                paymentVoucher.description,
                `Total Amount: ₹${paymentVoucher.getTotalAmount().toLocaleString()}`,
                `Voucher-${paymentVoucher.id}`,
                paymentVoucher.chequeNumber,
                undefined, // referenceNumber
                false
            );
            bankBookEntries.push(bankEntry);
        }
        
        if (voucher.voucherType === 'receipt' && voucher.receiptMode === 'bank') {
            const receiptVoucher = voucher as ReceiptVoucher;
            if (!receiptVoucher.bankBookId) {
                throw new Error('Bank book ID is required for bank receipt vouchers');
            }
            
            const bankEntry = new BankBookEntry(
                undefined, // id
                receiptVoucher.bankBookId,
                receiptVoucher.date,
                receiptVoucher.getTotalAmount(),
                'Dr', // Bank balance increasing
                'Payment In',
                `Receipt Voucher #${receiptVoucher.voucherNumber}`,
                receiptVoucher.chequeNumber ? 'Cheque' : 'Bank Transfer',
                receiptVoucher.id,
                'receipt_voucher',
                receiptVoucher.voucherNumber,
                receiptVoucher.description,
                `Total Amount: ₹${receiptVoucher.getTotalAmount().toLocaleString()}`,
                `Voucher-${receiptVoucher.id}`,
                receiptVoucher.chequeNumber,
                undefined, // referenceNumber
                false
            );
            bankBookEntries.push(bankEntry);
        }
        
        if (voucher.voucherType === 'contra') {
            const contraVoucher = voucher as ContraVoucher;
            const transferAmount = contraVoucher.getTotalAmount();
            
            // From bank account
            if (contraVoucher.fromAccount === 'bank' && contraVoucher.fromBankBookId) {
                const fromEntry = new BankBookEntry(
                    undefined, // id
                    contraVoucher.fromBankBookId,
                    contraVoucher.date,
                    transferAmount,
                    'Cr', // Bank balance decreasing
                    'Bank Transfer Out',
                    `Contra Voucher #${contraVoucher.voucherNumber} - Transfer Out`,
                    'Internal Transfer',
                    contraVoucher.id,
                    'contra_voucher',
                    contraVoucher.voucherNumber,
                    `Transfer to ${contraVoucher.toAccount}: ${contraVoucher.description}`,
                    `Transfer Amount: ₹${transferAmount.toLocaleString()}`,
                    `Voucher-${contraVoucher.id}`,
                    undefined, // chequeNumber
                    undefined, // referenceNumber
                    false
                );
                bankBookEntries.push(fromEntry);
            }
            
            // To bank account
            if (contraVoucher.toAccount === 'bank' && contraVoucher.toBankBookId) {
                const toEntry = new BankBookEntry(
                    undefined, // id
                    contraVoucher.toBankBookId,
                    contraVoucher.date,
                    transferAmount,
                    'Dr', // Bank balance increasing
                    'Bank Transfer In',
                    `Contra Voucher #${contraVoucher.voucherNumber} - Transfer In`,
                    'Internal Transfer',
                    contraVoucher.id,
                    'contra_voucher',
                    contraVoucher.voucherNumber,
                    `Transfer from ${contraVoucher.fromAccount}: ${contraVoucher.description}`,
                    `Transfer Amount: ₹${transferAmount.toLocaleString()}`,
                    `Voucher-${contraVoucher.id}`,
                    undefined, // chequeNumber
                    undefined, // referenceNumber
                    false
                );
                bankBookEntries.push(toEntry);
            }
        }
        
        // Bulk insert bank book entries
        if (bankBookEntries.length > 0) {
            const createdBankEntries = await createMultipleBankBookEntries(bankBookEntries)();
            
            // Create corresponding ledger entries if bankLedgerAccountId provided
            if (bankLedgerAccountId) {
                for (const bankEntry of createdBankEntries) {
                    const ledgerEntry = await createLedgerEntry({
                        ledgerAccountId: bankLedgerAccountId,
                        date: bankEntry.date,
                        amount: bankEntry.amount,
                        type: bankEntry.type,
                        primaryDescription: bankEntry.primaryDescription,
                        documentId: bankEntry.documentId,
                        documentType: bankEntry.documentType,
                        documentNumber: bankEntry.documentNumber,
                        secondaryDescription: bankEntry.secondaryDescription,
                        referenceDescription: bankEntry.referenceDescription,
                        ledgerReference: bankEntry.ledgerReference,
                        isOpeningBalance: false
                    });
                    ledgerEntries.push(ledgerEntry);
                }
                console.log(`Created ${ledgerEntries.length} Bank Ledger entries from voucher`);
            }
            
            return { bankEntries: createdBankEntries, ledgerEntries };
        }
        
        return { bankEntries: [], ledgerEntries: [] };
        
    } catch (error) {
        console.error('Error creating bank book entries from voucher:', error);
        throw error;
    }
}