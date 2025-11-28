// @/server/features/vouchers/infrastructure/persistence/voucherSupabase.ts

import { createClient } from "@/utils/supabase/server";
import {
    Voucher,
    PaymentVoucher,
    ReceiptVoucher,
    ContraVoucher,
    JournalVoucher,
    VoucherFactory,
    VoucherLineItem,
    BaseVoucher
} from "../../core/entities/VoucherSystem";
import { LedgerEntry, createUniversalLedgerEntry, UniversalTransactionData } from "@/server/features/ledger/core/entities/Ledger";
import { getLedgerAccountById } from "@/server/features/ledger/infrastructure/persistence/ledgerAccountSupabase";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface CreateVoucherParams {
    voucherNumber: string;
    voucherType: 'payment' | 'receipt' | 'contra' | 'journal';
    date: Date;
    fpoId: string;
    description: string;
    notes?: string;
    lineItems: VoucherLineItem[];
    createdBy?: string;
}

export interface VoucherWithEntries {
    voucher: Voucher;
    ledgerEntries: LedgerEntry[];
}

export interface VoucherOperationResult {
    voucher: Voucher;
    ledgerEntries: LedgerEntry[];
    success: boolean;
    message: string;
}

// ============================================================================
// BASIC VOUCHER CRUD OPERATIONS
// ============================================================================

/**
 * Get voucher by ID with its ledger entries
 */
export async function getVoucherById(voucherId: string): Promise<VoucherWithEntries | null> {
    const supabase = await createClient();

    try {
        // Fetch voucher
        const { data: voucherData, error: voucherError } = await supabase
            .from('vouchers')
            .select('*')
            .eq('id', voucherId)
            .single();

        if (voucherError) {
            if (voucherError.code === 'PGRST116') {
                return null;
            }
            throw new Error(voucherError.message);
        }

        const voucher = VoucherFactory.fromDbFormat(voucherData);

        // Fetch associated ledger entries
        const ledgerEntries = await getLedgerEntriesByIds(voucherData.ledger_entry_ids);

        return {
            voucher,
            ledgerEntries
        };
    } catch (error) {
        console.error('Error fetching voucher by ID:', error);
        throw error;
    }
}

/**
 * Get voucher by voucher number
 */
export async function getVoucherByNumber(voucherNumber: string): Promise<VoucherWithEntries | null> {
    const supabase = await createClient();

    try {
        const { data: voucherData, error: voucherError } = await supabase
            .from('vouchers')
            .select('*')
            .eq('voucher_number', voucherNumber)
            .single();

        if (voucherError) {
            if (voucherError.code === 'PGRST116') {
                return null;
            }
            throw new Error(voucherError.message);
        }

        const voucher = VoucherFactory.fromDbFormat(voucherData);
        const ledgerEntries = await getLedgerEntriesByIds(voucherData.ledger_entry_ids);

        return {
            voucher,
            ledgerEntries
        };
    } catch (error) {
        console.error('Error fetching voucher by number:', error);
        throw error;
    }
}

/**
 * Get all vouchers for an FPO with optional filters
 */
export async function getVouchersByFpo(params: {
    fpoId: string;
    voucherType?: 'payment' | 'receipt' | 'contra' | 'journal';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}): Promise<VoucherWithEntries[]> {
    const supabase = await createClient();

    try {
        let query = supabase
            .from('vouchers')
            .select('*')
            .eq('fpo_id', params.fpoId)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        if (params.voucherType) {
            query = query.eq('voucher_type', params.voucherType);
        }

        if (params.startDate) {
            query = query.gte('date', params.startDate.toISOString().split('T')[0]);
        }

        if (params.endDate) {
            query = query.lte('date', params.endDate.toISOString().split('T')[0]);
        }

        if (params.limit) {
            query = query.limit(params.limit);
        }

        if (params.offset) {
            query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
        }

        const { data: voucherData, error } = await query;

        if (error) {
            throw new Error(error.message);
        }

        // Fetch all vouchers with their entries
        const vouchersWithEntries = await Promise.all(
            voucherData.map(async (voucherRow) => {
                const voucher = VoucherFactory.fromDbFormat(voucherRow);
                const ledgerEntries = await getLedgerEntriesByIds([voucherRow.ledger_entry_ids]);
                return { voucher, ledgerEntries };
            })
        );

        return vouchersWithEntries;
    } catch (error) {
        console.error('Error fetching vouchers by FPO:', error);
        throw error;
    }
}

/**
 * Get vouchers by date range
 */
export async function getVouchersByDateRange(
    fpoId: string,
    startDate: Date,
    endDate: Date
): Promise<VoucherWithEntries[]> {
    return getVouchersByFpo({ fpoId, startDate, endDate });
}

// ============================================================================
// CREATE VOUCHER WITH LEDGER ENTRIES
// ============================================================================

/**
 * Create a complete voucher with ledger entries in a transaction
 */
// Update the createVoucher function in voucherSupabase.ts

export async function createVoucher(params: CreateVoucherParams): Promise<VoucherOperationResult> {
    const supabase = await createClient();

    try {
        // 1. Create voucher instance based on type
        let voucher: Voucher;

        switch (params.voucherType) {
            case 'payment':
                voucher = VoucherFactory.createPaymentVoucher({
                    voucherNumber: params.voucherNumber,
                    date: params.date,
                    fpoId: params.fpoId,
                    description: params.description,
                    notes: params.notes
                });
                break;
            case 'receipt':
                voucher = VoucherFactory.createReceiptVoucher({
                    voucherNumber: params.voucherNumber,
                    date: params.date,
                    fpoId: params.fpoId,
                    description: params.description,
                    notes: params.notes
                });
                break;
            case 'contra':
                voucher = VoucherFactory.createContraVoucher({
                    voucherNumber: params.voucherNumber,
                    date: params.date,
                    fpoId: params.fpoId,
                    description: params.description,
                    notes: params.notes
                });
                break;
            case 'journal':
                voucher = VoucherFactory.createJournalVoucher({
                    voucherNumber: params.voucherNumber,
                    date: params.date,
                    fpoId: params.fpoId,
                    description: params.description,
                    notes: params.notes
                });
                break;
            default:
                throw new Error(`Invalid voucher type: ${params.voucherType}`);
        }

        // 2. Add line items to voucher
        params.lineItems.forEach(item => voucher.addLineItem(item));

        // 3. Validate voucher
        voucher.validate();

        // 4. Create ledger entries from line items WITH ledger references
        const ledgerEntriesToCreate = params.lineItems.map((item, index) => ({
            ledgerAccountId: item.ledgerAccountId,
            date: params.date,
            amount: item.amount,
            type: item.type,
            primaryDescription: `${params.voucherType.charAt(0).toUpperCase() + params.voucherType.slice(1)} Voucher #${params.voucherNumber}`,
            secondaryDescription: item.description,
            referenceDescription: params.description,
            documentType: `${params.voucherType}_voucher`,
            documentNumber: params.voucherNumber,
            ledgerReference: item.ledgerReference, // NEW: Include ledger reference
            isOpeningBalance: false
        }));

        // 5. Insert ledger entries first
        const ledgerEntriesDbFormat = ledgerEntriesToCreate.map(entry => ({
            ledger_account_id: entry.ledgerAccountId,
            date: entry.date,
            amount: entry.amount,
            type: entry.type,
            primary_description: entry.primaryDescription,
            secondary_description: entry.secondaryDescription,
            reference_description: entry.referenceDescription,
            document_type: entry.documentType,
            document_number: entry.documentNumber,
            ledger_reference: entry.ledgerReference, // NEW: Map to database field
            is_opening_balance: false,
            created_at: new Date(),
            updated_at: new Date()
        }));

        const { data: createdLedgerEntries, error: ledgerError } = await supabase
            .from('ledger_entry')
            .insert(ledgerEntriesDbFormat)
            .select();

        if (ledgerError) {
            throw new Error(`Failed to create ledger entries: ${ledgerError.message}`);
        }

        // 6. Update voucher with ledger entry IDs
        voucher.ledgerEntryIds = createdLedgerEntries.map(entry => entry.id);

        // 7. Insert voucher with ledger entry IDs
        const voucherDbFormat = {
            ...voucher.toDbFormat(),
            created_by: params.createdBy
        };

        const { data: createdVoucher, error: voucherError } = await supabase
            .from('vouchers')
            .insert(voucherDbFormat)
            .select()
            .single();

        if (voucherError) {
            // Rollback: Delete created ledger entries
            await supabase
                .from('ledger_entry')
                .delete()
                .in('id', voucher.ledgerEntryIds);

            throw new Error(`Failed to create voucher: ${voucherError.message}`);
        }

        // 8. Update ledger entries with document_id (voucher ID)
        await supabase
            .from('ledger_entry')
            .update({ document_id: createdVoucher.id })
            .in('id', voucher.ledgerEntryIds);

        // 9. Return complete result
        const finalVoucher = VoucherFactory.fromDbFormat(createdVoucher);
        const finalLedgerEntries = createdLedgerEntries.map(LedgerEntry.fromDbFormat);

        console.log(`✓ Created ${params.voucherType} voucher #${params.voucherNumber} with ${finalLedgerEntries.length} ledger entries (with references)`);

        return {
            voucher: finalVoucher,
            ledgerEntries: finalLedgerEntries,
            success: true,
            message: `${params.voucherType.charAt(0).toUpperCase() + params.voucherType.slice(1)} voucher #${params.voucherNumber} created successfully`
        };

    } catch (error) {
        console.error('Error creating voucher:', error);
        throw error;
    }
}

// ============================================================================
// UPDATE VOUCHER
// ============================================================================

/**
 * Update a voucher and its ledger entries
 * Note: This creates new ledger entries and marks old ones as deleted
 */
export async function updateVoucher(
    voucherId: string,
    updates: {
        description?: string;
        notes?: string;
        lineItems?: VoucherLineItem[];
    }
): Promise<VoucherOperationResult> {
    const supabase = await createClient();

    try {
        // 1. Fetch existing voucher
        const existingVoucher = await getVoucherById(voucherId);
        if (!existingVoucher) {
            throw new Error('Voucher not found');
        }

        // 2. If updating line items, delete old ledger entries and create new ones
        if (updates.lineItems) {
            // Delete old ledger entries
            const { error: deleteError } = await supabase
                .from('ledger_entry')
                .delete()
                .in('id', existingVoucher.voucher.ledgerEntryIds);



            if (deleteError) {
                throw new Error(`Failed to delete old ledger entries: ${deleteError.message}`);
            }

            // Add new line items
            existingVoucher.voucher.lineItems = [];
            updates.lineItems.forEach(item => existingVoucher.voucher.addLineItem(item));
            // Validate
            existingVoucher.voucher.validate();

            // Create new ledger entries
            const newLedgerEntries = existingVoucher.voucher.createLedgerEntries();
            const ledgerEntriesDbFormat = newLedgerEntries.map(entry => ({
                ledger_account_id: entry.ledgerAccountId,
                date: entry.date,
                amount: entry.amount,
                type: entry.type,
                primary_description: entry.primaryDescription,
                secondary_description: entry.secondaryDescription,
                reference_description: entry.referenceDescription,
                document_id: voucherId,
                document_type: entry.documentType,
                document_number: entry.documentNumber,
                is_opening_balance: false
            }));

            const { data: createdEntries, error: createError } = await supabase
                .from('ledger_entry')
                .insert(ledgerEntriesDbFormat)
                .select();

            if (createError) {
                throw new Error(`Failed to create new ledger entries: ${createError.message}`);
            }

            existingVoucher.voucher.ledgerEntryIds = createdEntries.map(e => e.id);
        }

        // 3. Update voucher record
        const updateData: any = {
            updated_at: new Date()
        };

        if (updates.description) updateData.description = updates.description;
        if (updates.notes !== undefined) updateData.notes = updates.notes;
        if (updates.lineItems) updateData.ledger_entry_ids = existingVoucher.voucher.ledgerEntryIds;

        const { data: updatedVoucher, error: updateError } = await supabase
            .from('vouchers')
            .update(updateData)
            .eq('id', voucherId)
            .select()
            .single();

        if (updateError) {
            throw new Error(`Failed to update voucher: ${updateError.message}`);
        }

        // 4. Fetch updated ledger entries
        const ledgerEntries = await getLedgerEntriesByIds(updatedVoucher.ledger_entry_ids);

        return {
            voucher: VoucherFactory.fromDbFormat(updatedVoucher),
            ledgerEntries,
            success: true,
            message: `Voucher #${updatedVoucher.voucher_number} updated successfully`
        };

    } catch (error) {
        console.error('Error updating voucher:', error);
        throw error;
    }
}

// ============================================================================
// DELETE VOUCHER
// ============================================================================

/**
 * Delete a voucher and its associated ledger entries
 */
export async function deleteVoucher(voucherId: string): Promise<{ success: boolean; message: string }> {
    const supabase = await createClient();

    try {
        // 1. Fetch voucher to get ledger entry IDs
        const { data: voucher, error: fetchError } = await supabase
            .from('vouchers')
            .select('ledger_entry_ids, voucher_number')
            .eq('id', voucherId)
            .single();

        if (fetchError) {
            throw new Error(`Voucher not found: ${fetchError.message}`);
        }

        // 2. Delete ledger entries
        if (voucher.ledger_entry_ids && voucher.ledger_entry_ids.length > 0) {
            const { error: deleteEntriesError } = await supabase
                .from('ledger_entry')
                .delete()
                .in('id', voucher.ledger_entry_ids);

            if (deleteEntriesError) {
                throw new Error(`Failed to delete ledger entries: ${deleteEntriesError.message}`);
            }
        }

        // 3. Delete voucher
        const { error: deleteVoucherError } = await supabase
            .from('vouchers')
            .delete()
            .eq('id', voucherId);

        if (deleteVoucherError) {
            throw new Error(`Failed to delete voucher: ${deleteVoucherError.message}`);
        }

        return {
            success: true,
            message: `Voucher #${voucher.voucher_number} deleted successfully`
        };

    } catch (error) {
        console.error('Error deleting voucher:', error);
        throw error;
    }
}

// ============================================================================
// REVERSAL OPERATIONS
// ============================================================================

/**
 * Create a reversal voucher for a journal voucher
 */
export async function createReversalVoucher(
    originalVoucherId: string,
    reversalDate: Date,
    reversalDescription?: string,
    createdBy?: string
): Promise<VoucherOperationResult> {
    const supabase = await createClient();

    try {
        // 1. Fetch original voucher
        const originalVoucher = await getVoucherById(originalVoucherId);
        if (!originalVoucher) {
            throw new Error('Original voucher not found');
        }

        // 2. Only journal vouchers can be reversed
        if (originalVoucher.voucher.voucherType !== 'journal') {
            throw new Error('Only journal vouchers can be reversed');
        }

        // 3. Create reversal voucher
        const journalVoucher = originalVoucher.voucher as JournalVoucher;
        const reversalVoucherNumber = await generateVoucherNumber('journal', reversalDate, originalVoucher.voucher.fpoId);

        const reversalVoucher = journalVoucher.createReversalVoucher(
            reversalVoucherNumber,
            reversalDate,
            reversalDescription
        );

        // 4. Create reversal voucher in database
        return await createVoucher({
            voucherNumber: reversalVoucher.voucherNumber,
            voucherType: 'journal',
            date: reversalVoucher.date,
            fpoId: reversalVoucher.fpoId,
            description: reversalVoucher.description,
            notes: reversalVoucher.notes,
            lineItems: reversalVoucher.lineItems,
            createdBy
        });

    } catch (error) {
        console.error('Error creating reversal voucher:', error);
        throw error;
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get ledger entries by their IDs
 */
import { getLedgerEntriesByIds } from '@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase';

/**
 * Generate next voucher number for a type
 */
export async function generateVoucherNumber(
    voucherType: 'payment' | 'receipt' | 'contra' | 'journal',
    date: Date,
    fpoId: string
): Promise<string> {
    const supabase = await createClient();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    const prefixes = {
        payment: 'PAY',
        receipt: 'REC',
        contra: 'CON',
        journal: 'JRN'
    };

    const prefix = `${prefixes[voucherType]}/${year}${month}/`;

    // Get last voucher number for this type and period
    const { data, error } = await supabase
        .from('vouchers')
        .select('voucher_number')
        .eq('fpo_id', fpoId)
        .eq('voucher_type', voucherType)
        .ilike('voucher_number', `${prefix}%`)
        .order('voucher_number', { ascending: false })
        .limit(1);

    if (error) {
        throw new Error(`Failed to generate voucher number: ${error.message}`);
    }

    let nextSequence = 1;

    if (data && data.length > 0) {
        const lastNumber = data[0].voucher_number;
        const lastSequence = parseInt(lastNumber.split('/').pop() || '0');
        nextSequence = lastSequence + 1;
    }

    return `${prefix}${String(nextSequence).padStart(4, '0')}`;
}

/**
 * Validate voucher balance by checking its ledger entries
 */
export async function validateVoucherBalance(voucherId: string): Promise<{
    isBalanced: boolean;
    totalDebits: number;
    totalCredits: number;
    difference: number;
}> {
    const supabase = await createClient();

    try {
        const { data: voucher, error } = await supabase
            .from('vouchers')
            .select('ledger_entry_ids')
            .eq('id', voucherId)
            .single();

        if (error) {
            throw new Error(error.message);
        }

        if (!voucher.ledger_entry_ids || voucher.ledger_entry_ids.length === 0) {
            return {
                isBalanced: true,
                totalDebits: 0,
                totalCredits: 0,
                difference: 0
            };
        }

        const { data: entries, error: entriesError } = await supabase
            .from('ledger_entry')
            .select('amount, type')
            .in('id', voucher.ledger_entry_ids);

        if (entriesError) {
            throw new Error(entriesError.message);
        }

        const totalDebits = entries
            .filter(entry => entry.type === 'Dr')
            .reduce((sum, entry) => sum + entry.amount, 0);

        const totalCredits = entries
            .filter(entry => entry.type === 'Cr')
            .reduce((sum, entry) => sum + entry.amount, 0);

        const difference = Math.abs(totalDebits - totalCredits);
        const isBalanced = difference < 0.01;

        return {
            isBalanced,
            totalDebits,
            totalCredits,
            difference
        };

    } catch (error) {
        console.error('Error validating voucher balance:', error);
        throw error;
    }
}

/**
 * Get voucher summary statistics
 */
export async function getVoucherSummary(params: {
    fpoId: string;
    startDate: Date;
    endDate: Date;
}): Promise<{
    totalVouchers: number;
    byType: {
        payment: number;
        receipt: number;
        contra: number;
        journal: number;
    };
    totalAmount: {
        payment: number;
        receipt: number;
    };
}> {
    const supabase = await createClient();

    try {
        const { data: vouchers, error } = await supabase
            .from('vouchers')
            .select('voucher_type, ledger_entry_ids')
            .eq('fpo_id', params.fpoId)
            .gte('date', params.startDate.toISOString().split('T')[0])
            .lte('date', params.endDate.toISOString().split('T')[0]);

        if (error) {
            throw new Error(error.message);
        }

        const summary = {
            totalVouchers: vouchers.length,
            byType: {
                payment: 0,
                receipt: 0,
                contra: 0,
                journal: 0
            },
            totalAmount: {
                payment: 0,
                receipt: 0
            }
        };

        // Count by type
        vouchers.forEach(v => {
            summary.byType[v.voucher_type as keyof typeof summary.byType]++;
        });

        // Calculate amounts for payment and receipt vouchers
        for (const voucher of vouchers) {
            if (voucher.voucher_type === 'payment' || voucher.voucher_type === 'receipt') {
                const entries = await getLedgerEntriesByIds(voucher.ledger_entry_ids);
                const amount = entries.reduce((sum, entry) => sum + entry.amount, 0) / 2; // Divide by 2 since Dr=Cr

                if (voucher.voucher_type === 'payment') {
                    summary.totalAmount.payment += amount;
                } else {
                    summary.totalAmount.receipt += amount;
                }
            }
        }

        return summary;

    } catch (error) {
        console.error('Error getting voucher summary:', error);
        throw error;
    }
}