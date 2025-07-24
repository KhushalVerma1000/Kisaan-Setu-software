// Enhanced Client-side API helper functions with Ledger Integration
// @/server/features/purchase/infrastructure/purchaseVoucher/purchaseVoucherApi.ts
import { PurchaseVoucherInterface } from '@/server/features/purchase/core/entities/PurchaseVoucher';
import { LedgerEntryAPI } from '@/server/features/ledger/infrastructure/apiHelper/ledgerEntry/ledgerEntryApi';

const API_BASE_URL = '/api/purchase/purchase-vouchers';

export class PurchaseVoucherAPI {
    // === ENHANCED CRUD OPERATIONS WITH LEDGER INTEGRATION ===

    // Get all purchase vouchers with filters
    static async getAll(filters?: {
        fpoId?: string;
        status?: 'draft' | 'approved' | 'rejected';
        dateFrom?: string;
        dateTo?: string;
        supplierName?: string;
        voucherNumber?: string;
        partyInvoiceNumber?: string;
        supplierId?: string;
        page?: number;
        limit?: number;
        sortBy?: 'partyInvoiceDate' | 'poNumber' | 'created_at' | 'updated_at';
        sortOrder?: 'asc' | 'desc';
    }) {
        const params = new URLSearchParams();
        
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, value.toString());
                }
            });
        }

        const response = await fetch(`${API_BASE_URL}${params.toString() ? '?' + params.toString() : ''}`);
        if (!response.ok) throw new Error('Failed to fetch purchase vouchers');
        return response.json();
    }

    // Get purchase voucher by ID
    static async getById(id: string) {
        const response = await fetch(`${API_BASE_URL}/${id}`);
        if (!response.ok) throw new Error('Failed to fetch purchase voucher');
        return response.json();
    }

    // Create purchase voucher with mandatory ledger entry
    static async create(data: PurchaseVoucherInterface) {
        console.log('=== PurchaseVoucherAPI: Creating purchase voucher with ledger entry ===');
        console.log('Purchase voucher data:', data);

        // Validation: Check if supplier ID exists for ledger entry
        if (!data.supplierVendorId) {
            throw new Error('Supplier ID is required for ledger entry creation');
        }

        if (!data.summary?.grandTotal || data.summary.grandTotal <= 0) {
            throw new Error('Valid grand total is required for ledger entry');
        }

        if (!data.poNumber && !data.partyInvoiceNumber) {
            throw new Error('Either PO number or party invoice number is required');
        }

        try {
            // Step 1: Create the purchase voucher
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create purchase voucher: ${response.status} - ${errorText}`);
            }

            const voucherResult = await response.json();
            console.log('Purchase voucher created successfully:', voucherResult.voucher?.id);

            // Step 2: Create corresponding ledger entry
            try {
                const ledgerEntryData = {
                    supplierLedgerAccountId: data.supplierVendorId,
                    amount: data.summary.grandTotal,
                    date: typeof data.partyInvoiceDate === 'string' ? data.partyInvoiceDate : data.partyInvoiceDate?.toISOString() || new Date().toISOString(),
                    voucherNumber: data.poNumber || data.partyInvoiceNumber,
                    description: `Purchase Voucher - ${data.partyInvoiceNumber || data.poNumber}${data.notes ? ' - ' + data.notes : ''}`
                };

                console.log('Creating ledger entry:', ledgerEntryData);

                const ledgerResult = await LedgerEntryAPI.createPurchaseVoucherEntry(ledgerEntryData);
                console.log('Ledger entry created successfully:', ledgerResult.entry?.id);

                return {
                    success: true,
                    voucher: voucherResult.voucher,
                    ledgerEntry: ledgerResult.entry,
                    message: 'Purchase voucher and ledger entry created successfully'
                };

            } catch (ledgerError) {
                console.error('Ledger entry creation failed:', ledgerError);
                
                // Purchase voucher was created but ledger failed - this is a critical issue
                console.warn('Purchase voucher created but ledger entry failed - consider implementing rollback');
                
                return {
                    success: false,
                    voucher: voucherResult.voucher,
                    error: 'Purchase voucher created but ledger entry failed',
                    ledgerError: ledgerError instanceof Error ? ledgerError.message : 'Unknown ledger error',
                    requiresManualLedgerEntry: true
                };
            }

        } catch (error) {
            console.error('Purchase voucher creation failed:', error);
            throw new Error(`Failed to create purchase voucher: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Update purchase voucher with optional ledger entry update
    static async update(data: PurchaseVoucherInterface, updateLedger: boolean = true) {
        console.log('=== PurchaseVoucherAPI: Updating purchase voucher ===');
        console.log('Purchase voucher data:', data);
        console.log('Update ledger:', updateLedger);

        try {
            // Step 1: Update the purchase voucher
            const response = await fetch(`${API_BASE_URL}/${data.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update purchase voucher: ${response.status} - ${errorText}`);
            }

            const voucherResult = await response.json();
            console.log('Purchase voucher updated successfully:', voucherResult.voucher?.id);

            // Step 2: Update ledger entry if requested and data is valid
            if (updateLedger && data.supplierVendorId && data.summary?.grandTotal) {
                try {
                    console.log('Ledger update requested but implementation depends on your business logic');
                    
                    return {
                        success: true,
                        voucher: voucherResult.voucher,
                        message: 'Purchase voucher updated successfully',
                        ledgerNote: 'Ledger update logic depends on your business requirements'
                    };

                } catch (ledgerError) {
                    console.error('Ledger entry update failed:', ledgerError);
                    return {
                        success: true,
                        voucher: voucherResult.voucher,
                        warning: 'Purchase voucher updated but ledger entry update failed',
                        ledgerError: ledgerError instanceof Error ? ledgerError.message : 'Unknown ledger error'
                    };
                }
            }

            return {
                success: true,
                voucher: voucherResult.voucher,
                message: 'Purchase voucher updated successfully'
            };

        } catch (error) {
            console.error('Purchase voucher update failed:', error);
            throw new Error(`Failed to update purchase voucher: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Delete purchase voucher (consider ledger entry implications)
    static async delete(id: string, handleLedgerEntry: boolean = true) {
        console.log('=== PurchaseVoucherAPI: Deleting purchase voucher ===');
        console.log('Purchase voucher ID:', id);
        console.log('Handle ledger entry:', handleLedgerEntry);

        if (handleLedgerEntry) {
            console.warn('Purchase voucher deletion with ledger entries requires careful consideration');
            console.warn('Consider creating reversal entries instead of deletion');
        }

        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE',
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to delete purchase voucher: ${response.status} - ${errorText}`);
        }
        
        return response.json();
    }

    // Update purchase voucher status with ledger considerations
    static async updateStatus(id: string, status: 'draft' | 'approved' | 'rejected', handleLedgerEntry: boolean = true) {
        console.log('=== PurchaseVoucherAPI: Updating purchase voucher status ===');
        console.log('Purchase voucher ID:', id, 'New status:', status);

        const response = await fetch(`${API_BASE_URL}/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status }),
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update purchase voucher status: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        // Handle ledger implications for status changes
        if (handleLedgerEntry && status === 'approved') {
            console.log('Purchase voucher approved - ledger entry should be finalized');
        } else if (handleLedgerEntry && status === 'rejected') {
            console.log('Purchase voucher rejected - consider creating reversal ledger entry');
        }

        return result;
    }

    // Create purchase voucher with validation and ledger check
    static async createWithValidation(data: PurchaseVoucherInterface) {
        console.log('=== PurchaseVoucherAPI: Creating purchase voucher with validation ===');

        // Pre-validation checks
        const validationErrors: string[] = [];

        if (!data.supplierVendorId) {
            validationErrors.push('Supplier ID is required');
        }

        if (!data.partyInvoiceNumber || data.partyInvoiceNumber.trim() === '') {
            validationErrors.push('Party invoice number is required');
        }

        if (!data.summary?.grandTotal || data.summary.grandTotal <= 0) {
            validationErrors.push('Valid grand total is required');
        }

        if (!data.partyInvoiceDate) {
            validationErrors.push('Party invoice date is required');
        }

        if (!data.fpoId || data.fpoId.trim() === '') {
            validationErrors.push('FPO ID is required');
        }

        if (!data.items || data.items.length === 0) {
            validationErrors.push('At least one item is required');
        }

        if (validationErrors.length > 0) {
            throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
        }

        // Check if supplier ledger account exists
        if (data.supplierVendorId) {
            try {
                const ledgerCheck = await LedgerEntryAPI.checkLedgerAccount(data.supplierVendorId);
                if (!ledgerCheck.exists) {
                    console.warn('Supplier ledger account does not exist, but proceeding with creation');
                }
            } catch (error) {
                console.warn('Could not verify supplier ledger account:', error);
            }
        }

        // Proceed with creation
        return this.create(data);
    }

    // === EXISTING METHODS (enhanced versions) ===

    // Search purchase vouchers
    static async search(searchTerm: string, fpoId?: string) {
        const filters: any = {};
        
        if (searchTerm) {
            filters.supplierName = searchTerm;
        }
        
        if (fpoId) {
            filters.fpoId = fpoId;
        }

        try {
            return await this.getAll(filters);
        } catch (error) {
            if (searchTerm) {
                filters.supplierName = undefined;
                filters.partyInvoiceNumber = searchTerm;
                return await this.getAll(filters);
            }
            throw error;
        }
    }

    // Get by status
    static async getByStatus(
        status: 'draft' | 'approved' | 'rejected',
        fpoId?: string,
        options?: {
            page?: number;
            limit?: number;
            sortBy?: 'partyInvoiceDate' | 'poNumber' | 'created_at' | 'updated_at';
            sortOrder?: 'asc' | 'desc';
        }
    ) {
        const filters: any = { status };
        if (fpoId) filters.fpoId = fpoId;
        if (options) Object.assign(filters, options);

        return await this.getAll(filters);
    }

    // Get by date range
    static async getByDateRange(fpoId: string, startDate: string, endDate: string) {
        const filters = {
            fpoId,
            dateFrom: startDate,
            dateTo: endDate
        };

        return await this.getAll(filters);
    }

    // Get by supplier
    static async getBySupplier(fpoId: string, supplierId: string) {
        const filters = {
            fpoId,
            supplierId
        };

        return await this.getAll(filters);
    }

    // Get statistics
    static async getStats(fpoId: string, dateRange?: { startDate: string, endDate: string }) {
        const params = new URLSearchParams({ fpoId, stats: 'true' });
        
        if (dateRange) {
            params.append('startDate', dateRange.startDate);
            params.append('endDate', dateRange.endDate);
        }

        const response = await fetch(`${API_BASE_URL}?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch purchase voucher stats');
        return response.json();
    }

    // Validate purchase voucher
    static async validate(data: PurchaseVoucherInterface) {
        const response = await fetch(`${API_BASE_URL}/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to validate purchase voucher');
        return response.json();
    }

    // Export purchase vouchers
    static async export(
        fpoId: string, 
        format: 'json' | 'csv' = 'json',
        filters?: any
    ) {
        const params = new URLSearchParams();
        params.append('fpoId', fpoId);
        params.append('format', format);
        
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, value.toString());
                }
            });
        }

        const response = await fetch(`${API_BASE_URL}/export?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to export purchase vouchers');
        
        if (format === 'csv') {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `purchase_vouchers_${fpoId}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            return;
        }
        
        return response.json();
    }

    // Bulk delete
    static async bulkDelete(ids: string[], handleLedgerEntries: boolean = true) {
        if (handleLedgerEntries) {
            console.warn('Bulk deletion with ledger entries requires careful consideration');
        }

        const response = await fetch(`${API_BASE_URL}/bulk`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids }),
        });
        if (!response.ok) throw new Error('Failed to bulk delete purchase vouchers');
        return response.json();
    }

    // Bulk update status
    static async bulkUpdateStatus(ids: string[], status: 'draft' | 'approved' | 'rejected') {
        const response = await fetch(`${API_BASE_URL}/bulk/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids, status }),
        });
        if (!response.ok) throw new Error('Failed to bulk update purchase voucher status');
        return response.json();
    }

    // Get purchase voucher by PO number
    static async getByPONumber(poNumber: string, fpoId?: string) {
        const params = new URLSearchParams();
        if (fpoId) params.append('fpoId', fpoId);
        
        const response = await fetch(`${API_BASE_URL}/po/${poNumber}${params.toString() ? '?' + params.toString() : ''}`);
        if (!response.ok) throw new Error('Failed to fetch purchase voucher by PO number');
        return response.json();
    }

    // Get purchase voucher by party invoice number
    static async getByPartyInvoiceNumber(partyInvoiceNumber: string, fpoId?: string) {
        const params = new URLSearchParams();
        if (fpoId) params.append('fpoId', fpoId);
        
        const response = await fetch(`${API_BASE_URL}/party-invoice/${partyInvoiceNumber}${params.toString() ? '?' + params.toString() : ''}`);
        if (!response.ok) throw new Error('Failed to fetch purchase voucher by party invoice number');
        return response.json();
    }

    // === LEDGER-SPECIFIC HELPER METHODS ===

    // Get supplier ledger statement for purchase voucher period
    static async getSupplierLedgerStatement(supplierId: string, startDate?: string, endDate?: string) {
        return LedgerEntryAPI.getStatement(supplierId, startDate, endDate);
    }

    // Get supplier balance
    static async getSupplierBalance(supplierId: string) {
        return LedgerEntryAPI.getBalance(supplierId);
    }

    // Create payment voucher entry (when purchase voucher is paid)
    static async createPaymentVoucher(supplierId: string, amount: number, paymentNumber: string, date?: string) {
        return LedgerEntryAPI.createPaymentOutEntry({
            supplierLedgerAccountId: supplierId,
            amount: amount,
            date: date || new Date().toISOString(),
            paymentNumber: paymentNumber,
            description: `Payment made - Voucher ${paymentNumber}`
        });
    }

    // Helper: Create ledger entry from existing purchase voucher data
    static async createLedgerEntryFromVoucher(voucherId: string) {
        try {
            const voucher = await this.getById(voucherId);
            
            if (!voucher || !voucher.data) {
                throw new Error('Purchase voucher not found');
            }

            const voucherData = voucher.data;

            return LedgerEntryAPI.createFromPurchaseVoucher({
                supplierId: voucherData.supplierVendorId,
                voucherNumber: voucherData.poNumber || voucherData.partyInvoiceNumber,
                voucherDate: voucherData.partyInvoiceDate,
                grandTotal: voucherData.summary.grandTotal,
                notes: voucherData.notes,
                partyInvoiceNumber: voucherData.partyInvoiceNumber
            });

        } catch (error) {
            console.error('Failed to create ledger entry from voucher:', error);
            throw new Error(`Failed to create ledger entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Get next PO number
    static async getNextPONumber(fpoId: string, prefix: string = 'PO') {
        const params = new URLSearchParams();
        params.append('fpoId', fpoId);
        params.append('prefix', prefix);

        const response = await fetch(`${API_BASE_URL}/next-po-number?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to get next PO number');
        return response.json();
    }

    // === REPORTING AND ANALYTICS ===

    // Get purchase voucher analytics
    static async getAnalytics(fpoId: string, dateRange?: { startDate: string, endDate: string }) {
        const params = new URLSearchParams({ fpoId });
        
        if (dateRange) {
            params.append('startDate', dateRange.startDate);
            params.append('endDate', dateRange.endDate);
        }

        const response = await fetch(`${API_BASE_URL}/analytics?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch purchase voucher analytics');
        return response.json();
    }

    // Get supplier-wise purchase summary
    static async getSupplierWiseSummary(fpoId: string, dateRange?: { startDate: string, endDate: string }) {
        const params = new URLSearchParams({ fpoId });
        
        if (dateRange) {
            params.append('startDate', dateRange.startDate);
            params.append('endDate', dateRange.endDate);
        }

        const response = await fetch(`${API_BASE_URL}/supplier-summary?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch supplier-wise purchase summary');
        return response.json();
    }
}