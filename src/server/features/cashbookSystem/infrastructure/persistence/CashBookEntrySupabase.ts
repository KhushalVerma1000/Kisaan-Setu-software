import { CashBookEntry } from "../../core/entities/CashbookSystem";
import { createClient } from "@/utils/supabase/server";

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