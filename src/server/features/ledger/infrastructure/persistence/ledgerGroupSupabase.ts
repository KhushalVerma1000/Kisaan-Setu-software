// @/server/features/ledger/infrastructure/persistence/ledgerGroupSupabase.ts
import { createClient } from "@/utils/supabase/server";
import { LedgerGroup, LedgerGroupInterface } from "../../core/entities/LedgerGroup";

// Get all ledger groups (both default and user-created)
export async function getAllLedgerGroups(fpo_id: string): Promise<LedgerGroup[]> {
    const supabase = await createClient();
    
    try {
        // Get all groups: default groups (fpo_id = NULL) and user-created groups
        const { data, error } = await supabase
            .from('ledger_group')
            .select('*')
            .or(`fpo_id.is.null,fpo_id.eq.${fpo_id}`);

        if (error) {
            throw new Error(error.message);
        }
        return data.map(LedgerGroup.fromDbFormat);
    } catch (error) {
        console.error('Error fetching all ledger groups:', error);
        throw error;
    }
}

// Get only user-created groups (not default groups)
export async function getCreatedLedgerGroups(fpo_id: string): Promise<LedgerGroup[]> {
    const supabase = await createClient();
    
    try {
        const { data, error } = await supabase
            .from('ledger_group')
            .select('*')
            .eq('fpo_id', fpo_id);

        if (error) {
            throw new Error(error.message);
        }

        return data.map(LedgerGroup.fromDbFormat);
    } catch (error) {
        console.error('Error fetching created ledger groups:', error);
        throw error;
    }
}

export async function addNewLedgerGroupToDB(LedgerGroupparameter: LedgerGroupInterface): Promise<LedgerGroup> {
    const supabase = await createClient();
    
    const LedgerGroupobject = new LedgerGroup(
        LedgerGroupparameter.group,
        LedgerGroupparameter.parentgroup,
        LedgerGroupparameter.id,
        LedgerGroupparameter.fpoId
    );

    const ledgerGroupDbformat = LedgerGroupobject.toDbFormat();

    try {
        const { data, error } = await supabase
            .from('ledger_group')
            .insert(ledgerGroupDbformat)
            .select();

        if (!data || error) {
            throw new Error(error ? error.message : 'No data from Ledger Group insertion');
        }

        return LedgerGroup.fromDbFormat(data[0]);
    } catch (error) {
        console.error({ error });
        throw error;
    }
}