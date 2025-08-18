import { BankBookEntry } from "../../core/entities/BankBookSystem";
import { createClient } from "@/utils/supabase/server";

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