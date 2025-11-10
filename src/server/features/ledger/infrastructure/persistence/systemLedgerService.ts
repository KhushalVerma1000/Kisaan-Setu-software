// services/systemLedgerService.ts

import { LedgerAccount } from '../../core/entities/Ledger';
import { SYSTEM_LEDGER_CODES, SystemLedgerCode } from '@/constants/systemLedgerCodes';
import { createClient } from '@/utils/supabase/server';


const supabase = await createClient()
/**
 * Get a system ledger by its code
 * @param fpoId - The FPO ID
 * @param code - The system ledger code
 * @returns The ledger account or null if not found
 */
export async function getSystemLedger(
    fpoId: string,
    code: SystemLedgerCode
): Promise<LedgerAccount | null> {
    try {
        const { data, error } = await supabase
            .from('ledger_account')
            .select('*')
            .eq('fpo_id', fpoId)
            .eq('ledger_code', code)
            .eq('is_system_ledger', true)
            .single();

        if (error) {
            console.error(`Error fetching system ledger ${code}:`, error);
            return null;
        }

        if (!data) {
            console.warn(`System ledger ${code} not found for FPO ${fpoId}`);
            return null;
        }

        return LedgerAccount.fromDbFormat(data);
    } catch (error) {
        console.error(`Failed to get system ledger ${code}:`, error);
        return null;
    }
}

/**
 * Get multiple system ledgers at once
 * @param fpoId - The FPO ID
 * @param codes - Array of system ledger codes
 * @returns Map of code to LedgerAccount
 */
export async function getSystemLedgers(
    fpoId: string,
    codes: SystemLedgerCode[]
): Promise<Map<SystemLedgerCode, LedgerAccount>> {
    try {
        const { data, error } = await supabase
            .from('ledger_account')
            .select('*')
            .eq('fpo_id', fpoId)
            .in('ledger_code', codes)
            .eq('is_system_ledger', true);

        if (error) {
            console.error('Error fetching system ledgers:', error);
            return new Map();
        }

        const ledgerMap = new Map<SystemLedgerCode, LedgerAccount>();
        
        data?.forEach(row => {
            const ledger = LedgerAccount.fromDbFormat(row);
            if (ledger.ledgerCode) {
                ledgerMap.set(ledger.ledgerCode as SystemLedgerCode, ledger);
            }
        });

        return ledgerMap;
    } catch (error) {
        console.error('Failed to get system ledgers:', error);
        return new Map();
    }
}

/**
 * Get all GST input ledgers for an FPO
 */
export async function getGSTInputLedgers(fpoId: string) {
    const codes = [
        SYSTEM_LEDGER_CODES.GST_INPUT_CGST,
        SYSTEM_LEDGER_CODES.GST_INPUT_SGST,
        SYSTEM_LEDGER_CODES.GST_INPUT_IGST,
    ];

    const ledgers = await getSystemLedgers(fpoId, codes);

    return {
        cgst: ledgers.get(SYSTEM_LEDGER_CODES.GST_INPUT_CGST) || null,
        sgst: ledgers.get(SYSTEM_LEDGER_CODES.GST_INPUT_SGST) || null,
        igst: ledgers.get(SYSTEM_LEDGER_CODES.GST_INPUT_IGST) || null,
    };
}

/**
 * Get all GST output ledgers for an FPO
 */
export async function getGSTOutputLedgers(fpoId: string) {
    const codes = [
        SYSTEM_LEDGER_CODES.GST_OUTPUT_CGST,
        SYSTEM_LEDGER_CODES.GST_OUTPUT_SGST,
        SYSTEM_LEDGER_CODES.GST_OUTPUT_IGST,
    ];

    const ledgers = await getSystemLedgers(fpoId, codes);

    return {
        cgst: ledgers.get(SYSTEM_LEDGER_CODES.GST_OUTPUT_CGST) || null,
        sgst: ledgers.get(SYSTEM_LEDGER_CODES.GST_OUTPUT_SGST) || null,
        igst: ledgers.get(SYSTEM_LEDGER_CODES.GST_OUTPUT_IGST) || null,
    };
}

/**
 * Verify that all system ledgers exist for an FPO
 * Useful for debugging or post-signup verification
 */
export async function verifySystemLedgers(fpoId: string): Promise<{
    allPresent: boolean;
    missing: SystemLedgerCode[];
    present: SystemLedgerCode[];
}> {
    const allCodes = Object.values(SYSTEM_LEDGER_CODES);
    const ledgers = await getSystemLedgers(fpoId, allCodes);

    const present: SystemLedgerCode[] = [];
    const missing: SystemLedgerCode[] = [];

    allCodes.forEach(code => {
        if (ledgers.has(code)) {
            present.push(code);
        } else {
            missing.push(code);
        }
    });

    return {
        allPresent: missing.length === 0,
        missing,
        present,
    };
}

/**
 * Get all system ledgers for an FPO
 * Returns them grouped by category
 */
export async function getAllSystemLedgers(fpoId: string) {
    const allCodes = Object.values(SYSTEM_LEDGER_CODES);
    const ledgers = await getSystemLedgers(fpoId, allCodes);

    return {
        sales: {
            sales: ledgers.get(SYSTEM_LEDGER_CODES.SALES) || null,
            salesReturn: ledgers.get(SYSTEM_LEDGER_CODES.SALES_RETURN) || null,
        },
        purchase: {
            purchase: ledgers.get(SYSTEM_LEDGER_CODES.PURCHASE) || null,
            purchaseReturn: ledgers.get(SYSTEM_LEDGER_CODES.PURCHASE_RETURN) || null,
        },
        gstInput: {
            cgst: ledgers.get(SYSTEM_LEDGER_CODES.GST_INPUT_CGST) || null,
            sgst: ledgers.get(SYSTEM_LEDGER_CODES.GST_INPUT_SGST) || null,
            igst: ledgers.get(SYSTEM_LEDGER_CODES.GST_INPUT_IGST) || null,
        },
        gstOutput: {
            cgst: ledgers.get(SYSTEM_LEDGER_CODES.GST_OUTPUT_CGST) || null,
            sgst: ledgers.get(SYSTEM_LEDGER_CODES.GST_OUTPUT_SGST) || null,
            igst: ledgers.get(SYSTEM_LEDGER_CODES.GST_OUTPUT_IGST) || null,
        },
        tax: {
            tdsPayable: ledgers.get(SYSTEM_LEDGER_CODES.TDS_PAYABLE) || null,
            tcsPayable: ledgers.get(SYSTEM_LEDGER_CODES.TCS_PAYABLE) || null,
            tdsReceivable: ledgers.get(SYSTEM_LEDGER_CODES.TDS_RECEIVABLE) || null,
        },
        cash: {
            cash: ledgers.get(SYSTEM_LEDGER_CODES.CASH) || null,
            pettyCash: ledgers.get(SYSTEM_LEDGER_CODES.PETTY_CASH) || null,
        },
        capital: {
            capital: ledgers.get(SYSTEM_LEDGER_CODES.CAPITAL) || null,
            retainedEarnings: ledgers.get(SYSTEM_LEDGER_CODES.RETAINED_EARNINGS) || null,
            drawings: ledgers.get(SYSTEM_LEDGER_CODES.DRAWINGS) || null,
            profitLoss: ledgers.get(SYSTEM_LEDGER_CODES.PROFIT_LOSS) || null,
        },
        discount: {
            allowed: ledgers.get(SYSTEM_LEDGER_CODES.DISCOUNT_ALLOWED) || null,
            received: ledgers.get(SYSTEM_LEDGER_CODES.DISCOUNT_RECEIVED) || null,
        },
        expenses: {
            freight: ledgers.get(SYSTEM_LEDGER_CODES.FREIGHT) || null,
            packing: ledgers.get(SYSTEM_LEDGER_CODES.PACKING) || null,
            loading: ledgers.get(SYSTEM_LEDGER_CODES.LOADING) || null,
            bankCharges: ledgers.get(SYSTEM_LEDGER_CODES.BANK_CHARGES) || null,
            interestBank: ledgers.get(SYSTEM_LEDGER_CODES.INTEREST_BANK) || null,
        },
        misc: {
            roundingOff: ledgers.get(SYSTEM_LEDGER_CODES.ROUNDING_OFF) || null,
        },
    };
}

/**
 * Check if a ledger is a system ledger
 */
export function isSystemLedger(ledger: LedgerAccount): boolean {
    return ledger.isSystemLedger === true;
}

/**
 * Get ledger by ID (works for both system and user ledgers)
 */
export async function getLedgerById(ledgerId: string): Promise<LedgerAccount | null> {
    try {
        const { data, error } = await supabase
            .from('ledger_account')
            .select('*')
            .eq('id', ledgerId)
            .single();

        if (error || !data) {
            console.error('Error fetching ledger:', error);
            return null;
        }

        return LedgerAccount.fromDbFormat(data);
    } catch (error) {
        console.error('Failed to get ledger:', error);
        return null;
    }
}