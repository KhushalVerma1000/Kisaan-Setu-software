import { createClient } from "@/utils/supabase/server";
import { LedgerAccount, LedgerAccountInterface } from "../../core/entities/Ledger";

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


export async function createNewLedgerAccount(ledgerAccountParameter: LedgerAccountInterface): Promise<LedgerAccount> {

    const supabase = await createClient();
    const newLedger = LedgerAccount.fromInterface(ledgerAccountParameter)
    const addNewLedgerAccountToDB = newLedger.toDbFormat()

    try {
        const { data, error } = await supabase
            .from('ledger_account')
            .insert(addNewLedgerAccountToDB)
            .select()

        if (error) {
            console.error("error creating new ledger account", error)
            throw new Error(error.message)
        }
        else {
            return LedgerAccount.fromDbFormat(data[0])
        }
    }
    catch (error) {
        console.error(error);
        throw error
    }

}



export async function updateLedgerAccount(ledgerId: string, ledgerAccountParameter: LedgerAccountInterface): Promise<LedgerAccount> {
    const supabase = await createClient();
    
    try {
        // First check if the ledger exists
        const { data: existingLedger, error: fetchError } = await supabase
            .from('ledger_account')
            .select('id')
            .eq('id', ledgerId)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                throw new Error('Ledger account not found');
            }
            console.error(`Error checking ledger existence:`, fetchError);
            throw new Error(`Failed to verify ledger: ${fetchError.message}`);
        }

        // Create updated ledger and convert to DB format
        const updatedLedger = LedgerAccount.fromInterface({
            ...ledgerAccountParameter,
            id: ledgerId // Ensure the ID is preserved
        });
        const updateData = updatedLedger.toDbFormat();

        // Remove the ID from update data to avoid updating the primary key
        const { id, ...updateFields } = updateData;

        // Update the ledger account
        const { data, error: updateError } = await supabase
            .from('ledger_account')
            .update(updateFields)
            .eq('id', ledgerId)
            .select()
            .single();

        if (updateError) {
            console.error(`Error updating ledger account:`, updateError);
            throw new Error(`Failed to update ledger account: ${updateError.message}`);
        }

        console.log(`Ledger account ${ledgerId} updated successfully`);
        return LedgerAccount.fromDbFormat(data);
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

        // Delete the ledger account
        const { error: deleteError } = await supabase
            .from('ledger_account')
            .delete()
            .eq('id', ledgerId);

        if (deleteError) {
            console.error(`Error deleting ledger account:`, deleteError);
            throw new Error(`Failed to delete ledger account: ${deleteError.message}`);
        }

        console.log(`Ledger account ${ledgerId} deleted successfully`);
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

        // Delete the ledger accounts
        const { error: deleteError } = await supabase
            .from('ledger_account')
            .delete()
            .in('id', ledgerIds);

        if (deleteError) {
            console.error(`Error bulk deleting ledger accounts:`, deleteError);
            throw new Error(`Failed to delete ledger accounts: ${deleteError.message}`);
        }

        console.log(`${ledgerIds.length} ledger accounts deleted successfully`);
    } catch (error) {
        console.error('Error in bulkDeleteLedgerAccounts:', error);
        throw error;
    }
}