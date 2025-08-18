import { BankBook } from "../../core/entities/BankBookSystem";
import { createClient } from "@/utils/supabase/server";

export function getBankBook(bankAccountId: string) {
  return async (fpoId?: string): Promise<BankBook | null> => {
    try {
      const supabase = await createClient();
      let targetFpoId = fpoId;

      // If no fpoId provided, get from current user
      if (!targetFpoId) {
        const user = await supabase.auth.getUser();
        targetFpoId = user.data.user?.id;
      }

      if (!targetFpoId) {
        console.error("No FPO ID available");
        return null;
      }

      // Fetch bank book for the specific bank account and FPO
      const { data, error } = await supabase
        .from('bank_books')
        .select('*')
        .eq('bank_account_id', bankAccountId)
        .eq('fpo_id', targetFpoId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No bank book found - this is expected for new bank accounts
          console.log("No bank book found for bank account:", bankAccountId);
          return null;
        }
        console.error("Error fetching bank book:", error);
        return null;
      }

      if (!data) {
        console.warn("No bank book data found for bank account:", bankAccountId);
        return null;
      }

      return BankBook.fromDbFormat(data);
    } catch (error) {
      console.error("Unexpected error fetching bank book:", error);
      return null;
    }
  };
}

export function getBankBookById(bankBookId: string) {
  return async (): Promise<BankBook | null> => {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('bank_books')
        .select('*')
        .eq('id', bankBookId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log("Bank book not found:", bankBookId);
          return null;
        }
        console.error("Error fetching bank book by ID:", error);
        return null;
      }

      if (!data) {
        return null;
      }

      return BankBook.fromDbFormat(data);
    } catch (error) {
      console.error("Unexpected error fetching bank book by ID:", error);
      return null;
    }
  };
}

export function getBankBooksByFpo() {
  return async (fpoId?: string): Promise<BankBook[]> => {
    try {
      const supabase = await createClient();
      let targetFpoId = fpoId;

      // If no fpoId provided, get from current user
      if (!targetFpoId) {
        const user = await supabase.auth.getUser();
        targetFpoId = user.data.user?.id;
      }

      if (!targetFpoId) {
        console.error("No FPO ID available");
        return [];
      }

      // Fetch all bank books for the FPO
      const { data, error } = await supabase
        .from('bank_books')
        .select('*')
        .eq('fpo_id', targetFpoId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error fetching bank books for FPO:", error);
        return [];
      }

      if (!data) {
        return [];
      }

      return data.map(bankBook => BankBook.fromDbFormat(bankBook));
    } catch (error) {
      console.error("Unexpected error fetching bank books for FPO:", error);
      return [];
    }
  };
}

export function createBankBook(bankBook: BankBook) {
  return async (): Promise<BankBook | null> => {
    try {
      const supabase = await createClient();

      // Prepare bank book data
      const bankBookData = {
        ...bankBook.toDbFormat(),
        opening_date: bankBook.openingDate.toISOString().split('T')[0], // Ensure proper date format
      };

      // Insert new bank book
      const { data, error } = await supabase
        .from('bank_books')
        .insert(bankBookData)
        .select('*')
        .single();

      if (error) {
        console.error("Error creating bank book:", error);
        return null;
      }

      return BankBook.fromDbFormat(data);
    } catch (error) {
      console.error("Unexpected error creating bank book:", error);
      return null;
    }
  };
}

export function updateBankBook(bankBook: BankBook) {
  return async (): Promise<BankBook | null> => {
    try {
      const supabase = await createClient();

      if (!bankBook.id) {
        console.error("Bank book ID is required for update");
        return null;
      }

      // Update bank book
      const { data, error } = await supabase
        .from('bank_books')
        .update({
          opening_balance: bankBook.openingBalance,
          opening_date: bankBook.openingDate.toISOString().split('T')[0], // Convert to date string
          updated_at: new Date().toISOString(),
        })
        .eq('id', bankBook.id)
        .select('*')
        .single();

      if (error) {
        console.error("Error updating bank book:", error);
        return null;
      }

      return BankBook.fromDbFormat(data);
    } catch (error) {
      console.error("Unexpected error updating bank book:", error);
      return null;
    }
  };
}

export function upsertBankBook(bankBook: BankBook) {
  return async (): Promise<BankBook | null> => {
    try {
      const supabase = await createClient();

      // Prepare data for upsert
      const bankBookData = {
        ...bankBook.toDbFormat(),
        opening_date: bankBook.openingDate.toISOString().split('T')[0], // Ensure proper date format
      };

      // Upsert bank book (insert if new, update if exists)
      const { data, error } = await supabase
        .from('bank_books')
        .upsert(bankBookData, { 
          onConflict: 'bank_account_id', // Use unique constraint on bank_account_id
          ignoreDuplicates: false 
        })
        .select('*')
        .single();

      if (error) {
        console.error("Error upserting bank book:", error);
        return null;
      }

      return BankBook.fromDbFormat(data);
    } catch (error) {
      console.error("Unexpected error upserting bank book:", error);
      return null;
    }
  };
}

export function deleteBankBook(bankBookId: string) {
  return async (): Promise<boolean> => {
    try {
      const supabase = await createClient();

      // Delete bank book (entries will be cascade deleted due to FK constraint)
      const { error } = await supabase
        .from('bank_books')
        .delete()
        .eq('id', bankBookId);

      if (error) {
        console.error("Error deleting bank book:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Unexpected error deleting bank book:", error);
      return false;
    }
  };
}

// Helper function to check if bank book exists for bank account
export async function bankBookExists(bankAccountId: string, fpoId?: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    let targetFpoId = fpoId;

    // If no fpoId provided, get from current user
    if (!targetFpoId) {
      const user = await supabase.auth.getUser();
      targetFpoId = user.data.user?.id;
    }

    if (!targetFpoId) {
      console.error("No FPO ID available");
      return false;
    }

    const { data, error } = await supabase
      .from('bank_books')
      .select('id')
      .eq('bank_account_id', bankAccountId)
      .eq('fpo_id', targetFpoId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return false; // No bank book found
      }
      console.error("Error checking bank book existence:", error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error("Unexpected error checking bank book existence:", error);
    return false;
  }
}

// Helper function to get bank book ID by bank account ID
export async function getBankBookIdByBankAccountId(bankAccountId: string, fpoId?: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    let targetFpoId = fpoId;

    // If no fpoId provided, get from current user
    if (!targetFpoId) {
      const user = await supabase.auth.getUser();
      targetFpoId = user.data.user?.id;
    }

    if (!targetFpoId) {
      console.error("No FPO ID available");
      return null;
    }

    const { data, error } = await supabase
      .from('bank_books')
      .select('id')
      .eq('bank_account_id', bankAccountId)
      .eq('fpo_id', targetFpoId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No bank book found
      }
      console.error("Error getting bank book ID:", error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error("Unexpected error getting bank book ID:", error);
    return null;
  }
}