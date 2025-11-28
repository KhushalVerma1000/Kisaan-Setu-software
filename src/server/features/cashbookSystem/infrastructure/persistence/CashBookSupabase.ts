// import { CashBook } from "../../core/entities/CashbookSystem";
// import { createClient } from "@/utils/supabase/server";

// export function getCashBook() {
//   return async (fpoId?: string): Promise<CashBook | null> => {
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

//       // Fetch cash book for the FPO
//       const { data, error } = await supabase
//         .from('cash_books')
//         .select('*')
//         .eq('fpo_id', targetFpoId)
//         .single();

//       if (error) {
//         if (error.code === 'PGRST116') {
//           // No cash book found - this is expected for new FPOs
//           console.log("No cash book found for FPO:", targetFpoId);
//           return null;
//         }
//         console.error("Error fetching cash book:", error);
//         return null;
//       }

//       if (!data) {
//         console.warn("No cash book data found for FPO:", targetFpoId);
//         return null;
//       }

//       return CashBook.fromDbFormat(data);
//     } catch (error) {
//       console.error("Unexpected error fetching cash book:", error);
//       return null;
//     }
//   };
// }

// export function createCashBook(cashBook: CashBook) {
//   return async (): Promise<CashBook | null> => {
//     try {
//       const supabase = await createClient();

//       // Insert new cash book
//       const { data, error } = await supabase
//         .from('cash_books')
//         .insert(cashBook.toDbFormat())
//         .select('*')
//         .single();

//       if (error) {
//         console.error("Error creating cash book:", error);
//         return null;
//       }

//       return CashBook.fromDbFormat(data);
//     } catch (error) {
//       console.error("Unexpected error creating cash book:", error);
//       return null;
//     }
//   };
// }

// export function updateCashBook(cashBook: CashBook) {
//   return async (): Promise<CashBook | null> => {
//     try {
//       const supabase = await createClient();

//       if (!cashBook.id) {
//         console.error("Cash book ID is required for update");
//         return null;
//       }

//       // Update cash book
//       const { data, error } = await supabase
//         .from('cash_books')
//         .update({
//           opening_balance: cashBook.openingBalance,
//           opening_date: cashBook.openingDate.toISOString().split('T')[0], // Convert to date string
//           updated_at: new Date().toISOString(),
//         })
//         .eq('id', cashBook.id)
//         .select('*')
//         .single();

//       if (error) {
//         console.error("Error updating cash book:", error);
//         return null;
//       }

//       return CashBook.fromDbFormat(data);
//     } catch (error) {
//       console.error("Unexpected error updating cash book:", error);
//       return null;
//     }
//   };
// }

// export function upsertCashBook(cashBook: CashBook) {
//   return async (): Promise<CashBook | null> => {
//     try {
//       const supabase = await createClient();

//       // Prepare data for upsert
//       const cashBookData = {
//         ...cashBook.toDbFormat(),
//         opening_date: cashBook.openingDate.toISOString().split('T')[0], // Ensure proper date format
//       };

//       // Upsert cash book (insert if new, update if exists)
//       const { data, error } = await supabase
//         .from('cash_books')
//         .upsert(cashBookData, { 
//           onConflict: 'fpo_id', // Use unique constraint on fpo_id
//           ignoreDuplicates: false 
//         })
//         .select('*')
//         .single();

//       if (error) {
//         console.error("Error upserting cash book:", error);
//         return null;
//       }

//       return CashBook.fromDbFormat(data);
//     } catch (error) {
//       console.error("Unexpected error upserting cash book:", error);
//       return null;
//     }
//   };
// }

// export function deleteCashBook(cashBookId: string) {
//   return async (): Promise<boolean> => {
//     try {
//       const supabase = await createClient();

//       // Delete cash book (entries will be cascade deleted due to FK constraint)
//       const { error } = await supabase
//         .from('cash_books')
//         .delete()
//         .eq('id', cashBookId);

//       if (error) {
//         console.error("Error deleting cash book:", error);
//         return false;
//       }

//       return true;
//     } catch (error) {
//       console.error("Unexpected error deleting cash book:", error);
//       return false;
//     }
//   };
// }

// // Helper function to check if cash book exists for FPO
// export async function cashBookExists(fpoId: string): Promise<boolean> {
//   try {
//     const supabase = await createClient();

//     const { data, error } = await supabase
//       .from('cash_books')
//       .select('id')
//       .eq('fpo_id', fpoId)
//       .single();

//     if (error) {
//       if (error.code === 'PGRST116') {
//         return false; // No cash book found
//       }
//       console.error("Error checking cash book existence:", error);
//       return false;
//     }

//     return !!data;
//   } catch (error) {
//     console.error("Unexpected error checking cash book existence:", error);
//     return false;
//   }
// }

// // Helper function to get cash book ID by FPO ID
// export async function getCashBookIdByFpoId(fpoId: string): Promise<string | null> {
//   try {
//     const supabase = await createClient();

//     const { data, error } = await supabase
//       .from('cash_books')
//       .select('id')
//       .eq('fpo_id', fpoId)
//       .single();

//     if (error) {
//       if (error.code === 'PGRST116') {
//         return null; // No cash book found
//       }
//       console.error("Error getting cash book ID:", error);
//       return null;
//     }

//     return data?.id || null;
//   } catch (error) {
//     console.error("Unexpected error getting cash book ID:", error);
//     return null;
//   }
// }

// // ADD TO: server/features/cashbookSystem/infrastructure/persistence/CashBookSupabase.ts

// import { createNewLedgerAccount } from "@/server/features/ledger/infrastructure/persistence/ledgerAccountSupabase";
// import { LedgerAccount } from "@/server/features/ledger/core/entities/Ledger";
// import { getFpoState } from "@/server/features/fpo/infrastructure/persistence/FpoProfileSupabase";

// /**
//  * Creates Cash Book with corresponding Ledger Account
//  * This should be called when setting up a new FPO's cash book
//  */
// // REPLACE createCashBookWithLedger
// // export async function createCashBookWithLedger(
// //     fpoId: string, 
// //     openingBalance: number,
// //     openingDate: Date
// // ): Promise<{ 
// //     cashBook: CashBook; 
// //     ledgerAccount: LedgerAccount;
// // }> {
// //     try {
// //      const fpostate = await  getFpoState(fpoId);
// //         // Step 1: Create ledger account
// //         const cashLedgerResult = await createNewLedgerAccount({
// //             name: 'Cash-in-Hand',
// //             groupName: 'Cash-in-Hand',
// //             openingBalance: Math.abs(openingBalance),
// //             balanceType: openingBalance >= 0 ? 'Dr' : 'Cr',
// //             fpoId: fpoId,
// //             state: fpostate ? fpostate : undefined,
// //             openingDate: openingDate
// //         });

// //         // Step 2: Create cash book WITH ledger_account_id
// //         const cashBook = new CashBook(
// //             fpoId, 
// //             openingBalance, 
// //             openingDate,
// //             undefined, // id
// //             cashLedgerResult.ledgerAccount.id // NEW - store ledger account ID
// //         );
        
// //         const createdCashBook = await createCashBook(cashBook)();

// //         if (!createdCashBook) {
// //             throw new Error('Failed to create cash book');
// //         }

// //         console.log(`Created Cash Book with linked Ledger Account: ${cashLedgerResult.ledgerAccount.id}`);

// //         return { 
// //             cashBook: createdCashBook, 
// //             ledgerAccount: cashLedgerResult.ledgerAccount
// //         };
// //     } catch (error) {
// //         console.error('Error in createCashBookWithLedger:', error);
// //         throw error;
// //     }
// // }

// // REMOVE getCashLedgerAccountId() - no longer needed!

// /**
//  * Get Cash Ledger Account ID for an FPO
//  */
// export async function getCashLedgerAccountId(fpoId: string): Promise<string | null> {
//     const supabase = await createClient();
    
//     try {
//         const { data, error } = await supabase
//             .from('ledger_account')
//             .select('id')
//             .eq('fpo_id', fpoId)
//             .eq('name', 'Cash-in-Hand')
//             .eq('group_name', 'Cash-in-Hand')
//             .single();

//         if (error) {
//             if (error.code === 'PGRST116') {
//                 return null;
//             }
//             throw new Error(error.message);
//         }

//         return data?.id || null;
//     } catch (error) {
//         console.error('Error getting cash ledger account ID:', error);
//         return null;
//     }
// }

// /**
//  * Reconcile Cash Book with Cash Ledger Account
//  */
// export async function reconcileCashBookWithLedger(
//     cashBookId: string,
//     cashLedgerAccountId: string
// ): Promise<{
//     isReconciled: boolean;
//     cashBookBalance: number;
//     ledgerBalance: number;
//     difference: number;
// }> {
//     const supabase = await createClient();
    
//     try {
//         // Get cash book balance
//         const { data: cashBookData, error: cashBookError } = await supabase
//             .from('cash_books')
//             .select('opening_balance')
//             .eq('id', cashBookId)
//             .single();

//         if (cashBookError) throw new Error(cashBookError.message);

//         const { data: cashEntries, error: entriesError } = await supabase
//             .from('cash_book_entries')
//             .select('amount, type')
//             .eq('cash_book_id', cashBookId);

//         if (entriesError) throw new Error(entriesError.message);

//         let cashBookBalance = cashBookData.opening_balance;
//         cashEntries?.forEach(entry => {
//             cashBookBalance += entry.type === 'Dr' ? entry.amount : -entry.amount;
//         });

//         // Get ledger balance
//         const { data: ledgerData, error: ledgerError } = await supabase
//             .from('ledger_account')
//             .select('opening_balance, balance_type')
//             .eq('id', cashLedgerAccountId)
//             .single();

//         if (ledgerError) throw new Error(ledgerError.message);

//         const { data: ledgerEntries, error: ledgerEntriesError } = await supabase
//             .from('ledger_entry')
//             .select('amount, type')
//             .eq('ledger_account_id', cashLedgerAccountId);

//         if (ledgerEntriesError) throw new Error(ledgerEntriesError.message);

//         let ledgerBalance = ledgerData.balance_type === 'Dr' 
//             ? ledgerData.opening_balance 
//             : -ledgerData.opening_balance;

//         ledgerEntries?.forEach(entry => {
//             ledgerBalance += entry.type === 'Dr' ? entry.amount : -entry.amount;
//         });

//         const difference = Math.abs(cashBookBalance - ledgerBalance);
//         const isReconciled = difference < 0.01;

//         return {
//             isReconciled,
//             cashBookBalance,
//             ledgerBalance,
//             difference
//         };
//     } catch (error) {
//         console.error('Error reconciling cash book with ledger:', error);
//         throw error;
//     }
// }