import { createClient } from "@/utils/supabase/server";
import { PurchaseVoucher, PurchaseVoucherInterface } from "../../core/entities/PurchaseVoucher";

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

        return data.map(PurchaseVoucher.fromDbFormat);
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

        return PurchaseVoucher.fromDbFormat(data);
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
 * Create a new purchase voucher
 */
export async function createPurchaseVoucher(voucherData: PurchaseVoucherInterface): Promise<PurchaseVoucher> {
    const supabase = await createClient();
    
    try {
        // Validate the voucher data
        const voucher = PurchaseVoucher.fromInterface(voucherData);
        const validation = voucher.validate();
        
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        // Set timestamps
        voucher.createdAt = new Date();
        voucher.updatedAt = new Date();

        // Convert to database format
        const dbData = voucher.toDbFormat();
        
        // Remove id for insert
        const { id, ...insertData } = dbData;

        const { data, error } = await supabase
            .from('purchase_vouchers')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            console.error('Error creating purchase voucher:', error);
            throw new Error(error.message);
        }

        console.log('Purchase voucher created successfully:', data.id);
        return PurchaseVoucher.fromDbFormat(data);
    } catch (error) {
        console.error('Error in createPurchaseVoucher:', error);
        throw error;
    }
}

/**
 * Update an existing purchase voucher
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

        // Validate the updated voucher data
        const voucher = PurchaseVoucher.fromInterface({
            ...voucherData,
            id: voucherId
        });
        
        const validation = voucher.validate();
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

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
        return PurchaseVoucher.fromDbFormat(data);
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
 * Get purchase voucher statistics for FPO
 */
export async function getPurchaseVoucherStats(fpoId: string): Promise<{
    totalVouchers: number;
    totalAmount: number;
    draftCount: number;
    approvedCount: number;
    rejectedCount: number;
    avgAmount: number;
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
            draftCount: 0,
            approvedCount: 0,
            rejectedCount: 0,
            avgAmount: 0
        };

        data.forEach(voucher => {
            const summary = JSON.parse(voucher.summary || '{}');
            stats.totalAmount += summary.grandTotal || 0;
            
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
            .or(`supplier_vendor_name.ilike.%${searchTerm}%,party_invoice_number.ilike.%${searchTerm}%,po_number.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`)
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