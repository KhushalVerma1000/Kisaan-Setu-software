import { createClient } from "@/utils/supabase/server";
import { PurchaseVoucher, PurchaseVoucherInterface } from "../../core/entities/PurchaseVoucher";
import { getFpoState } from "@/server/features/fpo/infrastructure/persistence/FpoProfileSupabase";
import { getSupplierStateById } from "@/server/features/ledger/infrastructure/persistence/ledgerAccountSupabase";
import { convertKeysToCamel } from "@/utils/caseConvertor";

/**
 * Get supplier state by supplier ID (assuming you have a suppliers/ledger_accounts table)
 */
export async function getSupplierState(supplierId: string): Promise<string | null> {
    const state = await getSupplierStateById(supplierId)
    return state

}

/**
 * Get all purchase vouchers for a specific FPO
 */
export async function getAllFpoPurchaseVouchers(fpoId: string): Promise<PurchaseVoucher[]> {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from('purchase_vouchers')
            .select('*')
            .eq('fpo_id', fpoId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching purchase vouchers:', error);
            throw new Error(error.message);
        }

        // Fetch line items for each voucher from the dedicated table
        const vouchers = await Promise.all(data.map(async (item) => {
            const lineItems = await getPurchaseLineItemsAsSelectedItems(item.id);
            return PurchaseVoucher.fromDbFormat({ ...item, items: lineItems });
        }));
        return vouchers;
    } catch (error) {
        console.error('Error in getAllFpoPurchaseVouchers:', error);
        throw error;
    }
}

/**
 * Get purchase voucher by ID
 */
export async function getPurchaseVoucherById(voucherId: string): Promise<PurchaseVoucher | null> {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from('purchase_vouchers')
            .select('*')
            .eq('id', voucherId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows found
                return null;
            }
            console.error('Error fetching purchase voucher by ID:', error);
            throw new Error(error.message);
        }

        // Fetch line items from the dedicated table
        const lineItems = await getPurchaseLineItemsAsSelectedItems(data.id);
        return PurchaseVoucher.fromDbFormat({ ...data, items: lineItems });
    } catch (error) {
        console.error('Error in getPurchaseVoucherById:', error);
        throw error;
    }
}

/**
 * Get purchase vouchers by supplier/vendor
 */
export async function getPurchaseVouchersBySupplier(fpoId: string, supplierId: string): Promise<PurchaseVoucher[]> {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from('purchase_vouchers')
            .select('*')
            .eq('fpo_id', fpoId)
            .eq('supplier_vendor_id', supplierId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching purchase vouchers by supplier:', error);
            throw new Error(error.message);
        }

        return data.map(PurchaseVoucher.fromDbFormat);
    } catch (error) {
        console.error('Error in getPurchaseVouchersBySupplier:', error);
        throw error;
    }
}

/**
 * Get purchase vouchers by status
 */
export async function getPurchaseVouchersByStatus(fpoId: string, status: 'draft' | 'approved' | 'rejected'): Promise<PurchaseVoucher[]> {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from('purchase_vouchers')
            .select('*')
            .eq('fpo_id', fpoId)
            .eq('status', status)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching purchase vouchers by status:', error);
            throw new Error(error.message);
        }

        return data.map(PurchaseVoucher.fromDbFormat);
    } catch (error) {
        console.error('Error in getPurchaseVouchersByStatus:', error);
        throw error;
    }
}

/**
 * Get purchase vouchers by date range
 */
export async function getPurchaseVouchersByDateRange(
    fpoId: string,
    startDate: Date,
    endDate: Date
): Promise<PurchaseVoucher[]> {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from('purchase_vouchers')
            .select('*')
            .eq('fpo_id', fpoId)
            .gte('party_invoice_date', startDate.toISOString())
            .lte('party_invoice_date', endDate.toISOString())
            .order('party_invoice_date', { ascending: false });

        if (error) {
            console.error('Error fetching purchase vouchers by date range:', error);
            throw new Error(error.message);
        }

        return data.map(PurchaseVoucher.fromDbFormat);
    } catch (error) {
        console.error('Error in getPurchaseVouchersByDateRange:', error);
        throw error;
    }
}

/**
 * Create a new purchase voucher with GST calculations
 */
import { savePurchaseLineItems, getPurchaseLineItems, deletePurchaseLineItems, getPurchaseLineItemsAsSelectedItems } from "./purchaseLineItemsSupabase";
import { PurchaseLineItem } from "../../core/entities/PurchaseLineItem";

export async function createPurchaseVoucher(voucherData: PurchaseVoucherInterface): Promise<PurchaseVoucher> {
    const supabase = await createClient();
    const user = await supabase.auth.getUser();

    try {
        // If supplierState is not provided but supplierVendorId is, fetch the supplier state
        let supplierState = voucherData.supplierState;
        if (!supplierState && voucherData.supplierVendorId) {
            const state = await getSupplierState(voucherData.supplierVendorId);
            if (!state) {
                throw new Error('Could not determine supplier state for GST calculation');
            }
            supplierState = state;
        }

        // Create voucher with supplier state
        const voucher = PurchaseVoucher.fromInterface({
            ...voucherData,
            supplierState: supplierState!
        });

        // Validate the voucher data
        const validation = voucher.validate();
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        // Get FPO state for GST calculation
        const fpoState = await getFpoState(voucher.fpoId);
        if (!fpoState) {
            throw new Error('Could not determine FPO state for GST calculation');
        }

        // Calculate totals with GST
        await voucher.calculateTotals(fpoState);

        // Set timestamps
        voucher.createdAt = new Date();
        voucher.updatedAt = new Date();

        // Convert to database format
        const dbData = voucher.toDbFormat();

        // Remove id for insert
        const { id, ...insertData } = dbData;

        // Set created_by from user session
        if (user.data.user?.id) {
            (insertData as any).created_by = user.data.user.id;
        }

        // 1. Insert Purchase Voucher
        const { data, error } = await supabase
            .from('purchase_vouchers')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            console.error('Error creating purchase voucher:', error);
            throw new Error(error.message);
        }

        console.log('Purchase voucher created successfully:', data);
        const createdVoucher = PurchaseVoucher.fromDbFormat(data);
        const voucherId = createdVoucher.id!;

        // 2. Insert Line Items and Create Inventory Transactions
        // Convert PurchaseVoucherItem to PurchaseLineItem
        const lineItems = voucher.items.map(item => PurchaseLineItem.fromInterface({
            itemId: item.item.id,
            itemName: item.item.name,
            itemType: item.item.type,
            hsnSac: item.item.hsn_sac || '0000',
            quantity: item.quantity,
            unitCode: item.item.unit?.code,
            unitPrice: item.unitPrice,
            discountType: item.discount.type,
            discountValue: item.discount.value,
            discountAmount: item.calculations.discountAmount,
            gstRate: item.gstConfig.rate,
            gstType: item.gstConfig.type,
            baseAmount: item.calculations.baseAmount,
            taxableAmount: item.calculations.taxableAmount,
            gstAmount: item.calculations.totalGstAmount,
            lineTotal: item.calculations.lineTotal,
            purchaseVoucherId: voucherId
        }));

        await savePurchaseLineItems(voucherId, voucher.fpoId, lineItems, {
            voucherNumber: createdVoucher.voucherNumber || '',
            supplierName: voucher.supplierVendorName,
            supplierId: voucher.supplierVendorId,
            transactionDate: voucher.partyInvoiceDate instanceof Date ? voucher.partyInvoiceDate : new Date(voucher.partyInvoiceDate)
        });

        return createdVoucher;
    } catch (error) {
        console.error('Error in createPurchaseVoucher:', error);
        throw error;
    }
}

/**
 * Update an existing purchase voucher with GST calculations
 */
export async function updatePurchaseVoucher(
    voucherId: string,
    voucherData: PurchaseVoucherInterface
): Promise<PurchaseVoucher> {
    const supabase = await createClient();

    try {
        // First check if the voucher exists
        const { data: existingVoucher, error: fetchError } = await supabase
            .from('purchase_vouchers')
            .select('id')
            .eq('id', voucherId)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                throw new Error('Purchase voucher not found');
            }
            console.error('Error checking voucher existence:', fetchError);
            throw new Error(`Failed to verify voucher: ${fetchError.message}`);
        }

        // If supplierState is not provided but supplierVendorId is, fetch the supplier state
        let supplierState = voucherData.supplierState;
        if (!supplierState && voucherData.supplierVendorId) {
            const state = await getSupplierState(voucherData.supplierVendorId);
            if (!state) {
                throw new Error('Could not determine supplier state for GST calculation');
            }
            supplierState = state
        }

        // Create voucher with supplier state
        const voucher = PurchaseVoucher.fromInterface({
            ...voucherData,
            id: voucherId,
            supplierState: supplierState!
        });

        const validation = voucher.validate();
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        // Get FPO state for GST calculation
        const fpoState = await getFpoState(voucher.fpoId);
        if (!fpoState) {
            throw new Error('Could not determine FPO state for GST calculation');
        }

        // Calculate totals with GST
        await voucher.calculateTotals(fpoState);

        // Set updated timestamp
        voucher.updatedAt = new Date();

        // Convert to database format
        const dbData = voucher.toDbFormat();

        // Remove id from update data
        const { id, created_at, ...updateData } = dbData;

        const { data, error } = await supabase
            .from('purchase_vouchers')
            .update(updateData)
            .eq('id', voucherId)
            .select()
            .single();

        if (error) {
            console.error('Error updating purchase voucher:', error);
            throw new Error(error.message);
        }

        console.log('Purchase voucher updated successfully:', voucherId);
        const updatedVoucher = PurchaseVoucher.fromDbFormat(data);

        // Update line items and transactions
        const lineItems = voucher.items.map(item => PurchaseLineItem.fromInterface({
            itemId: item.item.id,
            itemName: item.item.name,
            itemType: item.item.type,
            hsnSac: item.item.hsn_sac || '0000',
            quantity: item.quantity,
            unitCode: item.item.unit?.code,
            unitPrice: item.unitPrice,
            discountType: item.discount.type,
            discountValue: item.discount.value,
            discountAmount: item.calculations.discountAmount,
            gstRate: item.gstConfig.rate,
            gstType: item.gstConfig.type,
            baseAmount: item.calculations.baseAmount,
            taxableAmount: item.calculations.taxableAmount,
            gstAmount: item.calculations.totalGstAmount,
            lineTotal: item.calculations.lineTotal,
            purchaseVoucherId: voucherId
        }));

        await savePurchaseLineItems(voucherId, voucher.fpoId, lineItems, {
            voucherNumber: updatedVoucher.voucherNumber || '',
            supplierName: voucher.supplierVendorName,
            supplierId: voucher.supplierVendorId,
            transactionDate: voucher.partyInvoiceDate instanceof Date ? voucher.partyInvoiceDate : new Date(voucher.partyInvoiceDate)
        });

        return updatedVoucher;
    } catch (error) {
        console.error('Error in updatePurchaseVoucher:', error);
        throw error;
    }
}

/**
 * Update purchase voucher status
 */
export async function updatePurchaseVoucherStatus(
    voucherId: string,
    status: 'draft' | 'approved' | 'rejected'
): Promise<PurchaseVoucher> {
    const supabase = await createClient();

    try {
        // First check if the voucher exists
        const { data: existingVoucher, error: fetchError } = await supabase
            .from('purchase_vouchers')
            .select('*')
            .eq('id', voucherId)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                throw new Error('Purchase voucher not found');
            }
            console.error('Error checking voucher existence:', fetchError);
            throw new Error(`Failed to verify voucher: ${fetchError.message}`);
        }

        const { data, error } = await supabase
            .from('purchase_vouchers')
            .update({
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', voucherId)
            .select()
            .single();

        if (error) {
            console.error('Error updating purchase voucher status:', error);
            throw new Error(error.message);
        }

        console.log(`Purchase voucher ${voucherId} status updated to ${status}`);
        return PurchaseVoucher.fromDbFormat(data);
    } catch (error) {
        console.error('Error in updatePurchaseVoucherStatus:', error);
        throw error;
    }
}

/**
 * Update purchase voucher notes
 */
export async function updatePurchaseVoucherNotes(
    voucherId: string,
    notes: string
): Promise<PurchaseVoucher> {
    const supabase = await createClient();

    try {
        // First check if the voucher exists
        const { data: existingVoucher, error: fetchError } = await supabase
            .from('purchase_vouchers')
            .select('*')
            .eq('id', voucherId)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                throw new Error('Purchase voucher not found');
            }
            console.error('Error checking voucher existence:', fetchError);
            throw new Error(`Failed to verify voucher: ${fetchError.message}`);
        }

        const { data, error } = await supabase
            .from('purchase_vouchers')
            .update({
                notes,
                updated_at: new Date().toISOString()
            })
            .eq('id', voucherId)
            .select()
            .single();

        if (error) {
            console.error('Error updating purchase voucher notes:', error);
            throw new Error(error.message);
        }

        console.log(`Purchase voucher ${voucherId} notes updated`);
        return PurchaseVoucher.fromDbFormat(data);
    } catch (error) {
        console.error('Error in updatePurchaseVoucherNotes:', error);
        throw error;
    }
}

/**
 * Delete a purchase voucher
 */
export async function deletePurchaseVoucher(voucherId: string): Promise<void> {
    const supabase = await createClient();

    try {
        // First check if the voucher exists
        const { data: existingVoucher, error: fetchError } = await supabase
            .from('purchase_vouchers')
            .select('id')
            .eq('id', voucherId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error checking voucher existence:', fetchError);
            throw new Error(`Failed to verify voucher: ${fetchError.message}`);
        }

        if (!existingVoucher) {
            throw new Error('Purchase voucher not found');
        }

        // Delete line items and inventory transactions first
        await deletePurchaseLineItems(voucherId);

        const { error } = await supabase
            .from('purchase_vouchers')
            .delete()
            .eq('id', voucherId);

        if (error) {
            console.error('Error deleting purchase voucher:', error);
            throw new Error(error.message);
        }

        console.log('Purchase voucher deleted successfully:', voucherId);
    } catch (error) {
        console.error('Error in deletePurchaseVoucher:', error);
        throw error;
    }
}

/**
 * Bulk delete purchase vouchers
 */
export async function bulkDeletePurchaseVouchers(voucherIds: string[]): Promise<void> {
    const supabase = await createClient();

    try {
        if (!voucherIds || voucherIds.length === 0) {
            throw new Error('No voucher IDs provided for deletion');
        }

        // First check if all vouchers exist
        const { data: existingVouchers, error: fetchError } = await supabase
            .from('purchase_vouchers')
            .select('id')
            .in('id', voucherIds);

        if (fetchError) {
            console.error('Error checking vouchers existence:', fetchError);
            throw new Error(`Failed to verify vouchers: ${fetchError.message}`);
        }

        if (!existingVouchers || existingVouchers.length !== voucherIds.length) {
            const foundIds = existingVouchers?.map(v => v.id) || [];
            const missingIds = voucherIds.filter(id => !foundIds.includes(id));
            throw new Error(`Some purchase vouchers not found: ${missingIds.join(', ')}`);
        }

        // Delete line items and inventory transactions for each voucher
        for (const id of voucherIds) {
            await deletePurchaseLineItems(id);
        }

        const { error } = await supabase
            .from('purchase_vouchers')
            .delete()
            .in('id', voucherIds);

        if (error) {
            console.error('Error bulk deleting purchase vouchers:', error);
            throw new Error(error.message);
        }

        console.log(`${voucherIds.length} purchase vouchers deleted successfully`);
    } catch (error) {
        console.error('Error in bulkDeletePurchaseVouchers:', error);
        throw error;
    }
}

/**
 * Get purchase voucher statistics for FPO with GST breakdown
 */
export async function getPurchaseVoucherStats(fpoId: string): Promise<{
    totalVouchers: number;
    totalAmount: number;
    totalCGST: number;
    totalSGST: number;
    totalIGST: number;
    totalGST: number;
    draftCount: number;
    approvedCount: number;
    rejectedCount: number;
    avgAmount: number;
    interstateCount: number;
    intrastateCount: number;
}> {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from('purchase_vouchers')
            .select('status, summary')
            .eq('fpo_id', fpoId);

        if (error) {
            console.error('Error fetching purchase voucher stats:', error);
            throw new Error(error.message);
        }

        const stats = {
            totalVouchers: data.length,
            totalAmount: 0,
            totalCGST: 0,
            totalSGST: 0,
            totalIGST: 0,
            totalGST: 0,
            draftCount: 0,
            approvedCount: 0,
            rejectedCount: 0,
            avgAmount: 0,
            interstateCount: 0,
            intrastateCount: 0
        };

        data.forEach(voucher => {
            // FIXED: Handle both stringified (old) and object (new) formats
            let summary;
            if (typeof voucher.summary === 'string') {
                try {
                    summary = JSON.parse(voucher.summary);
                } catch {
                    summary = {};
                }
            } else {
                summary = voucher.summary || {};
            }

            stats.totalAmount += summary.grandTotal || 0;
            stats.totalCGST += summary.totalCGST || 0;
            stats.totalSGST += summary.totalSGST || 0;
            stats.totalIGST += summary.totalIGST || 0;
            stats.totalGST += summary.totalGST || 0;

            // Count GST types
            if (summary.gstType === 'interstate') {
                stats.interstateCount++;
            } else if (summary.gstType === 'intrastate') {
                stats.intrastateCount++;
            }

            switch (voucher.status) {
                case 'draft':
                    stats.draftCount++;
                    break;
                case 'approved':
                    stats.approvedCount++;
                    break;
                case 'rejected':
                    stats.rejectedCount++;
                    break;
            }
        });

        stats.avgAmount = stats.totalVouchers > 0 ? stats.totalAmount / stats.totalVouchers : 0;

        return stats;
    } catch (error) {
        console.error('Error in getPurchaseVoucherStats:', error);
        throw error;
    }
}


/**
 * Search purchase vouchers
 */
export async function searchPurchaseVouchers(
    fpoId: string,
    searchTerm: string
): Promise<PurchaseVoucher[]> {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from('purchase_vouchers')
            .select('*')
            .eq('fpo_id', fpoId)
            .or(`supplier_vendor_name.ilike.%${searchTerm}%,party_invoice_number.ilike.%${searchTerm}%,po_number.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%,supplier_state.ilike.%${searchTerm}%`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error searching purchase vouchers:', error);
            throw new Error(error.message);
        }

        return data.map(PurchaseVoucher.fromDbFormat);
    } catch (error) {
        console.error('Error in searchPurchaseVouchers:', error);
        throw error;
    }
}

/**
 * Recalculate GST for existing purchase voucher (utility function)
 * Useful when FPO state changes or when migrating existing data
 */
export async function recalculatePurchaseVoucherGST(voucherId: string): Promise<PurchaseVoucher> {
    const supabase = await createClient();

    try {
        // Get existing voucher
        const existingVoucher = await getPurchaseVoucherById(voucherId);
        if (!existingVoucher) {
            throw new Error('Purchase voucher not found');
        }

        // Get FPO state for GST calculation
        const fpoState = await getFpoState(existingVoucher.fpoId);
        if (!fpoState) {
            throw new Error('Could not determine FPO state for GST calculation');
        }

        // Recalculate totals with current GST rules
        await existingVoucher.calculateTotals(fpoState);
        existingVoucher.updatedAt = new Date();

        // Update in database
        const dbData = existingVoucher.toDbFormat();
        const { id, created_at, ...updateData } = dbData;

        const { data, error } = await supabase
            .from('purchase_vouchers')
            .update(updateData)
            .eq('id', voucherId)
            .select()
            .single();

        if (error) {
            console.error('Error recalculating purchase voucher GST:', error);
            throw new Error(error.message);
        }

        console.log('Purchase voucher GST recalculated successfully:', voucherId);
        return PurchaseVoucher.fromDbFormat(data);
    } catch (error) {
        console.error('Error in recalculatePurchaseVoucherGST:', error);
        throw error;
    }
}

/**
 * Get GST summary report for purchase vouchers in a date range
 */
export async function getPurchaseVoucherGSTReport(
    fpoId: string,
    startDate: Date,
    endDate: Date
): Promise<{
    totalTaxableAmount: number;
    totalCGST: number;
    totalSGST: number;
    totalIGST: number;
    totalGST: number;
    gstBreakdown: { [rate: string]: { taxable: number; cgst: number; sgst: number; igst: number; totalGst: number } };
    interstateAmount: number;
    intrastateAmount: number;
}> {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from('purchase_vouchers')
            .select('summary, gst_breakdown')
            .eq('fpo_id', fpoId)
            .gte('party_invoice_date', startDate.toISOString())
            .lte('party_invoice_date', endDate.toISOString())
            .eq('status', 'approved'); // Only approved vouchers for GST reporting

        if (error) {
            console.error('Error fetching purchase vouchers for GST report:', error);
            throw new Error(error.message);
        }

        const report = {
            totalTaxableAmount: 0,
            totalCGST: 0,
            totalSGST: 0,
            totalIGST: 0,
            totalGST: 0,
            gstBreakdown: {} as any,
            interstateAmount: 0,
            intrastateAmount: 0
        };

        data.forEach(voucher => {
            // FIXED: Handle both stringified (old) and object (new) formats
            let summary, gstBreakdown;

            if (typeof voucher.summary === 'string') {
                try {
                    summary = JSON.parse(voucher.summary);
                } catch {
                    summary = {};
                }
            } else {
                summary = voucher.summary || {};
            }

            if (typeof voucher.gst_breakdown === 'string') {
                try {
                    gstBreakdown = JSON.parse(voucher.gst_breakdown);
                } catch {
                    gstBreakdown = {};
                }
            } else {
                gstBreakdown = voucher.gst_breakdown || {};
            }

            report.totalCGST += summary.totalCGST || 0;
            report.totalSGST += summary.totalSGST || 0;
            report.totalIGST += summary.totalIGST || 0;
            report.totalGST += summary.totalGST || 0;

            if (summary.gstType === 'interstate') {
                report.interstateAmount += summary.grandTotal || 0;
            } else {
                report.intrastateAmount += summary.grandTotal || 0;
            }

            // Merge GST breakdown
            Object.keys(gstBreakdown).forEach(rate => {
                if (!report.gstBreakdown[rate]) {
                    report.gstBreakdown[rate] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalGst: 0 };
                }
                report.gstBreakdown[rate].taxable += gstBreakdown[rate].taxable || 0;
                report.gstBreakdown[rate].cgst += gstBreakdown[rate].cgst || 0;
                report.gstBreakdown[rate].sgst += gstBreakdown[rate].sgst || 0;
                report.gstBreakdown[rate].igst += gstBreakdown[rate].igst || 0;
                report.gstBreakdown[rate].totalGst += gstBreakdown[rate].totalGst || 0;
            });
        });

        // Calculate total taxable amount
        report.totalTaxableAmount = Object.values(report.gstBreakdown).reduce(
            (sum: number, breakdown: any) => sum + breakdown.taxable, 0
        );

        return report;
    } catch (error) {
        console.error('Error in getPurchaseVoucherGSTReport:', error);
        throw error;
    }
}

/**
 * Utility function to safely parse JSON fields for backward compatibility
 * Use this helper in any function that reads JSONB fields
 */
function parseJsonField(field: any, defaultValue: any = {}) {
    if (typeof field === 'string') {
        try {
            return JSON.parse(field);
        } catch (error) {
            console.warn('Failed to parse JSON field:', error);
            return defaultValue;
        }
    }
    return field || defaultValue;
}



export const getPurchaseVouchersList = async (ledgerId: string, status?: string) => {
    const supabase = await createClient();
    const query = supabase
        .from('purchase_vouchers')
        .select('id, voucher_number')
        .eq('supplier_vendor_id', ledgerId);

    if (status) query.eq('status', status);

    const { data, error } = await query;
    return { data: convertKeysToCamel(data), error };
};