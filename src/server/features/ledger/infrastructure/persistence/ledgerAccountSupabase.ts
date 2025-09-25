import { createClient } from "@/utils/supabase/server";
import { LedgerAccount, LedgerAccountInterface, LedgerEntry, createOpeningBalanceEntry } from "../../core/entities/Ledger";


export async function getLedgerNameById(ledgerId: string): Promise<string | null> {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('ledger_account')
            .select('name')
            .eq('id', ledgerId)
            .single();

        if (error) {
            console.error('Error fetching ledger name by ID:', error);
            return null;
        }

        return data?.name || null;
    } catch (error) {
        console.error('Error in getLedgerNameById:', error);
        return null;
    }
}

export async function getAllUserAssociatedLedgerAccount(fpo_id: string): Promise<LedgerAccount[]> {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('ledger_account')
            .select('*')
            .eq('fpo_id', fpo_id)
        if (error) {
            throw new Error(error.message)
        }
        else {
            return data.map(LedgerAccount.fromDbFormat)
        }
    } catch (error) {
        console.error('Error in fetching  Ledger Accounts', error);
        throw error
    }
}

export async function getLedgerAccountById(ledgerId: string): Promise<LedgerAccount | null> {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('ledger_account')
            .select('*')
            .eq('id', ledgerId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows found
                return null;
            }
            throw new Error(error.message);
        }

        return LedgerAccount.fromDbFormat(data);
    } catch (error) {
        console.error('Error in fetching ledger account by ID:', error);
        throw error;
    }
}

export async function getSupplierStateById(supplierId: string): Promise<string | null> {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from('ledger_account') // or 'suppliers' table
            .select('state')
            .eq('id', supplierId)
            .single();

        if (error) {
            console.error('Error fetching supplier state:', error);
            return null;
        }

        // Extract state from billing address
        // This assumes billing_address is a JSON object with a 'state' field
        // Adjust parsing based on your actual data structure
       const state = data?.state

        return state || null;
    } catch (error) {
        console.error('Error in getSupplierState:', error);
        return null;
    }
}

export async function createNewLedgerAccount(ledgerAccountParameter: LedgerAccountInterface): Promise<{
    ledgerAccount: LedgerAccount;
    openingBalanceEntry: LedgerEntry | null;
}> {
    const supabase = await createClient();
    
    try {
        // Start a transaction-like operation
        const newLedger = LedgerAccount.fromInterface(ledgerAccountParameter);
        const addNewLedgerAccountToDB = newLedger.toDbFormat();

        // Create the ledger account first
        const { data: accountData, error: accountError } = await supabase
            .from('ledger_account')
            .insert(addNewLedgerAccountToDB)
            .select()
            .single();

        if (accountError) {
            console.error("Error creating new ledger account", accountError);
            throw new Error(accountError.message);
        }

        const createdAccount = LedgerAccount.fromDbFormat(accountData);
        
        // Create opening balance entry if opening balance is not zero
        let openingBalanceEntry: LedgerEntry | null = null;
        
        if (createdAccount.openingBalance !== 0) {
            try {
                const openingEntry = createOpeningBalanceEntry(createdAccount);
                
                const { data: entryData, error: entryError } = await supabase
                    .from('ledger_entry')
                    .insert(openingEntry.toDbFormat())
                    .select()
                    .single();

                if (entryError) {
                    console.warn("Warning: Failed to create opening balance entry", entryError);
                    // Don't throw error here - account creation succeeded
                } else {
                    openingBalanceEntry = LedgerEntry.fromDbFormat(entryData);
                    console.log(`Opening balance entry created for account ${createdAccount.id}`);
                }
            } catch (entryError) {
                console.warn("Warning: Exception creating opening balance entry", entryError);
                // Don't throw - account creation was successful
            }
        }

        return {
            ledgerAccount: createdAccount,
            openingBalanceEntry
        };
    } catch (error) {
        console.error('Error in createNewLedgerAccount:', error);
        throw error;
    }
}

export async function updateLedgerAccount(ledgerId: string, ledgerAccountParameter: LedgerAccountInterface): Promise<{
    ledgerAccount: LedgerAccount;
    openingBalanceEntry: LedgerEntry | null;
}> {
    const supabase = await createClient();
    
    try {
        // First check if the ledger exists and get current opening balance
        const { data: existingLedger, error: fetchError } = await supabase
            .from('ledger_account')
            .select('*')
            .eq('id', ledgerId)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                throw new Error('Ledger account not found');
            }
            console.error(`Error checking ledger existence:`, fetchError);
            throw new Error(`Failed to verify ledger: ${fetchError.message}`);
        }

        const oldAccount = LedgerAccount.fromDbFormat(existingLedger);
        
        // Create updated ledger and convert to DB format
        const updatedLedger = LedgerAccount.fromInterface({
            ...ledgerAccountParameter,
            id: ledgerId // Ensure the ID is preserved
        });
        const updateData = updatedLedger.toDbFormat();

        // Remove the ID from update data to avoid updating the primary key
        const { id, ...updateFields } = updateData;

        // Update the ledger account
        const { data: accountData, error: updateError } = await supabase
            .from('ledger_account')
            .update(updateFields)
            .eq('id', ledgerId)
            .select()
            .single();

        if (updateError) {
            console.error(`Error updating ledger account:`, updateError);
            throw new Error(`Failed to update ledger account: ${updateError.message}`);
        }

        const updatedAccount = LedgerAccount.fromDbFormat(accountData);
        let openingBalanceEntry: LedgerEntry | null = null;

        // Handle opening balance entry updates
        const oldOpeningBalance = oldAccount.openingBalance;
        const newOpeningBalance = updatedAccount.openingBalance;
        const oldBalanceType = oldAccount.balanceType;
        const newBalanceType = updatedAccount.balanceType;

        // Check if opening balance or balance type changed
        if (oldOpeningBalance !== newOpeningBalance || oldBalanceType !== newBalanceType) {
            try {
                // First, delete existing opening balance entry
                const { error: deleteError } = await supabase
                    .from('ledger_entry')
                    .delete()
                    .eq('ledger_account_id', ledgerId)
                    .eq('is_opening_balance', true);

                if (deleteError) {
                    console.warn("Warning: Failed to delete old opening balance entry", deleteError);
                }
              

                // Create new opening balance entry if balance is not zero
                if (newOpeningBalance !== 0) {
                    const openingEntry = createOpeningBalanceEntry(updatedAccount);
                    
                    const { data: entryData, error: entryError } = await supabase
                        .from('ledger_entry')
                        .insert(openingEntry.toDbFormat())
                        .select()
                        .single();

                    if (entryError) {
                        console.warn("Warning: Failed to create new opening balance entry", entryError);
                    } else {
                        openingBalanceEntry = LedgerEntry.fromDbFormat(entryData);
                        console.log(`Opening balance entry updated for account ${updatedAccount.id}`);
                    }
                }
            } catch (entryError) {
                console.warn("Warning: Exception handling opening balance entry update", entryError);
                // Don't throw - account update was successful
            }
        }

        console.log(`Ledger account ${ledgerId} updated successfully`);
        return {
            ledgerAccount: updatedAccount,
            openingBalanceEntry
        };
    } catch (error) {
        console.error('Error in updateLedgerAccount:', error);
        throw error;
    }
}

export async function deleteLedgerAccount(ledgerId: string): Promise<void> {
    const supabase = await createClient();
    
    try {
        // First check if the ledger exists
        const { data: existingLedger, error: fetchError } = await supabase
            .from('ledger_account')
            .select('id')
            .eq('id', ledgerId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error(`Error checking ledger existence:`, fetchError);
            throw new Error(`Failed to verify ledger: ${fetchError.message}`);
        }

        if (!existingLedger) {
            throw new Error('Ledger account not found');
        }

        // Delete all related ledger entries first (including opening balance)
        const { error: entriesDeleteError } = await supabase
            .from('ledger_entry')
            .delete()
            .eq('ledger_account_id', ledgerId);

        if (entriesDeleteError) {
            console.warn("Warning: Failed to delete all ledger entries", entriesDeleteError);
            // Continue with account deletion
        }

        // Delete the ledger account
        const { error: deleteError } = await supabase
            .from('ledger_account')
            .delete()
            .eq('id', ledgerId);

        if (deleteError) {
            console.error(`Error deleting ledger account:`, deleteError);
            throw new Error(`Failed to delete ledger account: ${deleteError.message}`);
        }

        console.log(`Ledger account ${ledgerId} and related entries deleted successfully`);
    } catch (error) {
        console.error('Error in deleteLedgerAccount:', error);
        throw error;
    }
}

export async function bulkDeleteLedgerAccounts(ledgerIds: string[]): Promise<void> {
    const supabase = await createClient();
    
    try {
        if (!ledgerIds || ledgerIds.length === 0) {
            throw new Error('No ledger IDs provided for deletion');
        }

        // First check if all ledgers exist
        const { data: existingLedgers, error: fetchError } = await supabase
            .from('ledger_account')
            .select('id')
            .in('id', ledgerIds);

        if (fetchError) {
            console.error(`Error checking ledgers existence:`, fetchError);
            throw new Error(`Failed to verify ledgers: ${fetchError.message}`);
        }

        if (!existingLedgers || existingLedgers.length !== ledgerIds.length) {
            const foundIds = existingLedgers?.map(l => l.id) || [];
            const missingIds = ledgerIds.filter(id => !foundIds.includes(id));
            throw new Error(`Some ledger accounts not found: ${missingIds.join(', ')}`);
        }

        // Delete all related ledger entries first
        const { error: entriesDeleteError } = await supabase
            .from('ledger_entry')
            .delete()
            .in('ledger_account_id', ledgerIds);

        if (entriesDeleteError) {
            console.warn("Warning: Failed to delete some ledger entries", entriesDeleteError);
            // Continue with account deletion
        }

        // Delete the ledger accounts
        const { error: deleteError } = await supabase
            .from('ledger_account')
            .delete()
            .in('id', ledgerIds);

        if (deleteError) {
            console.error(`Error bulk deleting ledger accounts:`, deleteError);
            throw new Error(`Failed to delete ledger accounts: ${deleteError.message}`);
        }

        console.log(`${ledgerIds.length} ledger accounts and related entries deleted successfully`);
    } catch (error) {
        console.error('Error in bulkDeleteLedgerAccounts:', error);
        throw error;
    }
}

// Utility function to get ledger account with current balance
export async function getLedgerAccountWithBalance(ledgerId: string): Promise<{
    ledgerAccount: LedgerAccount;
    currentBalance: { balance: number; balanceType: 'Dr' | 'Cr' };
} | null> {
    const supabase = await createClient();
    
    try {
        // Get ledger account
        const ledgerAccount = await getLedgerAccountById(ledgerId);
        if (!ledgerAccount) {
            return null;
        }

        // Get all entries for this account
        const { data: entriesData, error: entriesError } = await supabase
            .from('ledger_entry')
            .select('*')
            .eq('ledger_account_id', ledgerId);

        if (entriesError) {
            throw new Error(entriesError.message);
        }

        const ledgerEntries = entriesData.map(LedgerEntry.fromDbFormat);
        
        // Use Ledger class to calculate current balance
        const { Ledger } = await import("../../core/entities/Ledger");
        const ledger = new Ledger(ledgerAccount, ledgerEntries);
        const currentBalance = ledger.getCurrentBalance();

        return {
            ledgerAccount,
            currentBalance
        };
    } catch (error) {
        console.error('Error getting ledger account with balance:', error);
        throw error;
    }
}

// Utility function to recalculate and fix opening balance entry
export async function fixOpeningBalanceEntry(ledgerId: string): Promise<LedgerEntry | null> {
    const supabase = await createClient();
    
    try {
        const ledgerAccount = await getLedgerAccountById(ledgerId);
        if (!ledgerAccount) {
            throw new Error('Ledger account not found');
        }

        // Delete existing opening balance entry
        await supabase
            .from('ledger_entry')
            .delete()
            .eq('ledger_account_id', ledgerId)
            .eq('is_opening_balance', true);

        // Create new opening balance entry if balance is not zero
        if (ledgerAccount.openingBalance !== 0) {
            const openingEntry = createOpeningBalanceEntry(ledgerAccount);
            
            const { data: entryData, error: entryError } = await supabase
                .from('ledger_entry')
                .insert(openingEntry.toDbFormat())
                .select()
                .single();

            if (entryError) {
                throw new Error(entryError.message);
            }

            return LedgerEntry.fromDbFormat(entryData);
        }

        return null;
    } catch (error) {
        console.error('Error fixing opening balance entry:', error);
        throw error;
    }
}