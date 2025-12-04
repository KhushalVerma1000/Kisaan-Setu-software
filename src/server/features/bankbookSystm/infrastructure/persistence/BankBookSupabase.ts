// import { BankBook } from "../../core/entities/BankBookSystem";
// import { createClient } from "@/utils/supabase/server";

// export function getBankBook(bankAccountId: string) {
//   return async (fpoId?: string): Promise<BankBook | null> => {
//     try {
//       const supabase = await createClient();
//       let targetFpoId = fpoId;

//       // If no fpoId provided, get from current user
//       if (!targetFpoId) {
//         const user = await supabase.auth.getUser();
//         targetFpoId = user.data.user?.id;
//       }

//       if (!targetFpoId) {
//         console.error("No FPO ID available");
//         return null;
//       }

//       // Fetch bank book for the specific bank account and FPO
//       const { data, error } = await supabase
//         .from('bank_books')
//         .select('*')
//         .eq('bank_account_id', bankAccountId)
//         .eq('fpo_id', targetFpoId)
//         .single();

//       if (error) {
//         if (error.code === 'PGRST116') {
//           // No bank book found - this is expected for new bank accounts
//           console.log("No bank book found for bank account:", bankAccountId);
//           return null;
//         }
//         console.error("Error fetching bank book:", error);
//         return null;
//       }

//       if (!data) {
//         console.warn("No bank book data found for bank account:", bankAccountId);
//         return null;
//       }

//       return BankBook.fromDbFormat(data);
//     } catch (error) {
//       console.error("Unexpected error fetching bank book:", error);
//       return null;
//     }
//   };
// }

// export function getBankBookById(bankBookId: string) {
//   return async (): Promise<BankBook | null> => {
//     try {
//       const supabase = await createClient();

//       const { data, error } = await supabase
//         .from('bank_books')
//         .select('*')
//         .eq('id', bankBookId)
//         .single();

//       if (error) {
//         if (error.code === 'PGRST116') {
//           console.log("Bank book not found:", bankBookId);
//           return null;
//         }
//         console.error("Error fetching bank book by ID:", error);
//         return null;
//       }

//       if (!data) {
//         return null;
//       }

//       return BankBook.fromDbFormat(data);
//     } catch (error) {
//       console.error("Unexpected error fetching bank book by ID:", error);
//       return null;
//     }
//   };
// }

// export function getBankBooksByFpo() {
//   return async (fpoId?: string): Promise<BankBook[]> => {
//     try {
//       const supabase = await createClient();
//       let targetFpoId = fpoId;

//       // If no fpoId provided, get from current user
//       if (!targetFpoId) {
//         const user = await supabase.auth.getUser();
//         targetFpoId = user.data.user?.id;
//       }

//       if (!targetFpoId) {
//         console.error("No FPO ID available");
//         return [];
//       }

//       // Fetch all bank books for the FPO
//       const { data, error } = await supabase
//         .from('bank_books')
//         .select('*')
//         .eq('fpo_id', targetFpoId)
//         .order('created_at', { ascending: true });

//       if (error) {
//         console.error("Error fetching bank books for FPO:", error);
//         return [];
//       }

//       if (!data) {
//         return [];
//       }

//       return data.map(bankBook => BankBook.fromDbFormat(bankBook));
//     } catch (error) {
//       console.error("Unexpected error fetching bank books for FPO:", error);
//       return [];
//     }
//   };
// }

// export function createBankBook(bankBook: BankBook) {
//   return async (): Promise<BankBook | null> => {
//     try {
//       const supabase = await createClient();

//       // Prepare bank book data
//       const bankBookData = {
//         ...bankBook.toDbFormat(),
//         opening_date: bankBook.openingDate.toISOString().split('T')[0], // Ensure proper date format
//       };

//       // Insert new bank book
//       const { data, error } = await supabase
//         .from('bank_books')
//         .insert(bankBookData)
//         .select('*')
//         .single();

//       if (error) {
//         console.error("Error creating bank book:", error);
//         return null;
//       }

//       return BankBook.fromDbFormat(data);
//     } catch (error) {
//       console.error("Unexpected error creating bank book:", error);
//       return null;
//     }
//   };
// }

// export function updateBankBook(bankBook: BankBook) {
//   return async (): Promise<BankBook | null> => {
//     try {
//       const supabase = await createClient();

//       if (!bankBook.id) {
//         console.error("Bank book ID is required for update");
//         return null;
//       }

//       // Update bank book
//       const { data, error } = await supabase
//         .from('bank_books')
//         .update({
//           opening_balance: bankBook.openingBalance,
//           opening_date: bankBook.openingDate.toISOString().split('T')[0], // Convert to date string
//           updated_at: new Date().toISOString(),
//         })
//         .eq('id', bankBook.id)
//         .select('*')
//         .single();

//       if (error) {
//         console.error("Error updating bank book:", error);
//         return null;
//       }

//       return BankBook.fromDbFormat(data);
//     } catch (error) {
//       console.error("Unexpected error updating bank book:", error);
//       return null;
//     }
//   };
// }

// export function upsertBankBook(bankBook: BankBook) {
//   return async (): Promise<BankBook | null> => {
//     try {
//       const supabase = await createClient();

//       // Prepare data for upsert
//       const bankBookData = {
//         ...bankBook.toDbFormat(),
//         opening_date: bankBook.openingDate.toISOString().split('T')[0], // Ensure proper date format
//       };

//       // Upsert bank book (insert if new, update if exists)
//       const { data, error } = await supabase
//         .from('bank_books')
//         .upsert(bankBookData, { 
//           onConflict: 'bank_account_id', // Use unique constraint on bank_account_id
//           ignoreDuplicates: false 
//         })
//         .select('*')
//         .single();

//       if (error) {
//         console.error("Error upserting bank book:", error);
//         return null;
//       }

//       return BankBook.fromDbFormat(data);
//     } catch (error) {
//       console.error("Unexpected error upserting bank book:", error);
//       return null;
//     }
//   };
// }

// export function deleteBankBook(bankBookId: string) {
//   return async (): Promise<boolean> => {
//     try {
//       const supabase = await createClient();

//       // Delete bank book (entries will be cascade deleted due to FK constraint)
//       const { error } = await supabase
//         .from('bank_books')
//         .delete()
//         .eq('id', bankBookId);

//       if (error) {
//         console.error("Error deleting bank book:", error);
//         return false;
//       }

//       return true;
//     } catch (error) {
//       console.error("Unexpected error deleting bank book:", error);
//       return false;
//     }
//   };
// }

// // Helper function to check if bank book exists for bank account
// export async function bankBookExists(bankAccountId: string, fpoId?: string): Promise<boolean> {
//   try {
//     const supabase = await createClient();
//     let targetFpoId = fpoId;

//     // If no fpoId provided, get from current user
//     if (!targetFpoId) {
//       const user = await supabase.auth.getUser();
//       targetFpoId = user.data.user?.id;
//     }

//     if (!targetFpoId) {
//       console.error("No FPO ID available");
//       return false;
//     }

//     const { data, error } = await supabase
//       .from('bank_books')
//       .select('id')
//       .eq('bank_account_id', bankAccountId)
//       .eq('fpo_id', targetFpoId)
//       .single();

//     if (error) {
//       if (error.code === 'PGRST116') {
//         return false; // No bank book found
//       }
//       console.error("Error checking bank book existence:", error);
//       return false;
//     }

//     return !!data;
//   } catch (error) {
//     console.error("Unexpected error checking bank book existence:", error);
//     return false;
//   }
// }

// // Helper function to get bank book ID by bank account ID
// export async function getBankBookIdByBankAccountId(bankAccountId: string, fpoId?: string): Promise<string | null> {
//   try {
//     const supabase = await createClient();
//     let targetFpoId = fpoId;

//     // If no fpoId provided, get from current user
//     if (!targetFpoId) {
//       const user = await supabase.auth.getUser();
//       targetFpoId = user.data.user?.id;
//     }

//     if (!targetFpoId) {
//       console.error("No FPO ID available");
//       return null;
//     }

//     const { data, error } = await supabase
//       .from('bank_books')
//       .select('id')
//       .eq('bank_account_id', bankAccountId)
//       .eq('fpo_id', targetFpoId)
//       .single();

//     if (error) {
//       if (error.code === 'PGRST116') {
//         return null; // No bank book found
//       }
//       console.error("Error getting bank book ID:", error);
//       return null;
//     }

//     return data?.id || null;
//   } catch (error) {
//     console.error("Unexpected error getting bank book ID:", error);
//     return null;
//   }
// }

// // ADD TO: server/features/bankbook/infrastructure/persistence/BankBookSupabase.ts

// import { createNewLedgerAccount } from "@/server/features/ledger/infrastructure/persistence/ledgerAccountSupabase";
// import { LedgerAccount } from "@/server/features/ledger/core/entities/Ledger";

// /**
//  * Creates Bank Book with corresponding Ledger Account
//  */
// export async function createBankBookWithLedger(
//     bankAccountId: string,
//     fpoId: string,
//     openingBalance: number,
//     openingDate: Date,
//     bankName: string,
//     accountNumber?: string
// ): Promise<{ 
//     bankBook: BankBook; 
//     ledgerAccount: LedgerAccount;
//     bankLedgerAccountId: string; 
// }> {
//     try {
//         // Create ledger account name
//         const ledgerName = bankName;

//         // Step 1: Create ledger account for Bank Account
//         const bankLedgerResult = await createNewLedgerAccount({
//             name: ledgerName,
//             groupName: 'Bank Accounts',
//             openingBalance: Math.abs(openingBalance),
//             balanceType: openingBalance >= 0 ? 'Dr' : 'Cr',
//             fpoId: fpoId,
//             openingDate: openingDate
//         });

//         // Step 2: Create bank book
//         const bankBook = new BankBook(
//             undefined, 
//             bankAccountId, 
//             fpoId, 
//             openingBalance, 
//             openingDate
//         );
        
//         const createdBankBook = await createBankBook(bankBook)();

//         if (!createdBankBook) {
//             throw new Error('Failed to create bank book');
//         }

//         console.log(`Created Bank Book and Ledger Account for ${bankName}`);
//         console.log(`Bank Book ID: ${createdBankBook.id}, Ledger Account ID: ${bankLedgerResult.ledgerAccount.id}`);

//         return { 
//             bankBook: createdBankBook, 
//             ledgerAccount: bankLedgerResult.ledgerAccount,
//             bankLedgerAccountId: bankLedgerResult.ledgerAccount.id!
//         };
//     } catch (error) {
//         console.error('Error in createBankBookWithLedger:', error);
//         throw error;
//     }
// }

// /**
//  * Get Bank Ledger Account ID for a bank book
//  */
// export async function getBankLedgerAccountId(bankBookId: string): Promise<string | null> {
//     const supabase = await createClient();
    
//     try {
//         // Get bank book to find bank account details
//         const { data: bankBookData, error: bankBookError } = await supabase
//             .from('bank_books')
//             .select('bank_account_id, fpo_id')
//             .eq('id', bankBookId)
//             .single();

//         if (bankBookError) throw new Error(bankBookError.message);

//         // Get bank details
//         const { data: bankData, error: bankError } = await supabase
//             .from('bank_details')
//             .select('bank_name, account_number')
//             .eq('id', bankBookData.bank_account_id)
//             .single();

//         if (bankError) throw new Error(bankError.message);

//         // Search for ledger account matching this bank
//         const { data, error } = await supabase
//             .from('ledger_account')
//             .select('id')
//             .eq('fpo_id', bankBookData.fpo_id)
//             .eq('group_name', 'Bank Accounts')
//             .ilike('name', `%${bankData.bank_name}%`)
//             .single();

//         if (error) {
//             if (error.code === 'PGRST116') {
//                 return null;
//             }
//             throw new Error(error.message);
//         }

//         return data?.id || null;
//     } catch (error) {
//         console.error('Error getting bank ledger account ID:', error);
//         return null;
//     }
// }

// /**
//  * Reconcile Bank Book with Bank Ledger Account
//  */
// export async function reconcileBankBookWithLedger(
//     bankBookId: string,
//     bankLedgerAccountId: string
// ): Promise<{
//     isReconciled: boolean;
//     bankBookBalance: number;
//     ledgerBalance: number;
//     difference: number;
// }> {
//     const supabase = await createClient();
    
//     try {
//         // Get bank book balance
//         const { data: bankBookData, error: bankBookError } = await supabase
//             .from('bank_books')
//             .select('opening_balance')
//             .eq('id', bankBookId)
//             .single();

//         if (bankBookError) throw new Error(bankBookError.message);

//         const { data: bankEntries, error: entriesError } = await supabase
//             .from('bank_book_entries')
//             .select('amount, type')
//             .eq('bank_book_id', bankBookId);

//         if (entriesError) throw new Error(entriesError.message);

//         let bankBookBalance = bankBookData.opening_balance;
//         bankEntries?.forEach(entry => {
//             bankBookBalance += entry.type === 'Dr' ? entry.amount : -entry.amount;
//         });

//         // Get ledger balance
//         const { data: ledgerData, error: ledgerError } = await supabase
//             .from('ledger_account')
//             .select('opening_balance, balance_type')
//             .eq('id', bankLedgerAccountId)
//             .single();

//         if (ledgerError) throw new Error(ledgerError.message);

//         const { data: ledgerEntries, error: ledgerEntriesError } = await supabase
//             .from('ledger_entry')
//             .select('amount, type')
//             .eq('ledger_account_id', bankLedgerAccountId);

//         if (ledgerEntriesError) throw new Error(ledgerEntriesError.message);

//         let ledgerBalance = ledgerData.balance_type === 'Dr' 
//             ? ledgerData.opening_balance 
//             : -ledgerData.opening_balance;

//         ledgerEntries?.forEach(entry => {
//             ledgerBalance += entry.type === 'Dr' ? entry.amount : -entry.amount;
//         });

//         const difference = Math.abs(bankBookBalance - ledgerBalance);
//         const isReconciled = difference < 0.01;

//         return {
//             isReconciled,
//             bankBookBalance,
//             ledgerBalance,
//             difference
//         };
//     } catch (error) {
//         console.error('Error reconciling bank book with ledger:', error);
//         throw error;
//     }
// }