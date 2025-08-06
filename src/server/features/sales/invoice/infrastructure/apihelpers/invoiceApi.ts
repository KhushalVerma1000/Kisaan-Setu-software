// Enhanced Client-side API helper functions with Ledger Integration
// @/server/features/sales/invoice/infrastructure/invoiceApi.ts
import { InvoiceInterface } from '@/server/features/sales/invoice/core/entities/invoice';
import { LedgerEntryAPI } from '@/server/features/ledger/infrastructure/apiHelper/ledgerEntry/ledgerEntryApi';

const API_BASE_URL = '/api/sales/invoices';

export class InvoiceAPI {
    // Get all invoices with filters
    static async getAll(filters?: {
        status?: 'draft' | 'sent' | 'paid' | 'cancelled';
        dateFrom?: string;
        dateTo?: string;
        customerName?: string;
        invoiceNumber?: string;
        fpoId?: string;
        page?: number;
        limit?: number;
        sortBy?: 'invoice_date' | 'invoice_number' | 'created_at' | 'updated_at';
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
        if (!response.ok) throw new Error('Failed to fetch invoices');
        return response.json();
    }

    // Get invoice by ID
    static async getById(id: string) {
        const response = await fetch(`${API_BASE_URL}/${id}`);
        if (!response.ok) throw new Error('Failed to fetch invoice');
        return response.json();
    }

    // Create invoice with mandatory ledger entry
    // static async create(data: InvoiceInterface) {
    //     console.log('=== InvoiceAPI: Creating invoice with ledger entry ===');
    //     console.log('Invoice data:', data);

    //     // Validation: Check if customer ID exists for ledger entry
    //     if (!data.customer.id) {
    //         throw new Error('Customer ID is required for ledger entry creation');
    //     }

    //     if (!data.summary?.grandTotal || data.summary.grandTotal <= 0) {
    //         throw new Error('Valid grand total is required for ledger entry');
    //     }

    //     try {
    //         // Step 1: Create the invoice
    //         const response = await fetch(API_BASE_URL, {
    //             method: 'POST',
    //             headers: {
    //                 'Content-Type': 'application/json',
    //             },
    //             body: JSON.stringify(data),
    //         });

    //         if (!response.ok) {
    //             const errorText = await response.text();
    //             throw new Error(`Failed to create invoice: ${response.status} - ${errorText}`);
    //         }

    //         const invoiceResult = await response.json();
    //         console.log('Invoice created successfully:', invoiceResult.invoice?.id);

    //         // Step 2: Create corresponding ledger entry
    //         try {
    //             const ledgerEntryData = {
    //                 customerLedgerAccountId: data.customer.id,
    //                 amount: data.summary.grandTotal,
    //                 date: typeof data.invoiceDate === 'string' ? data.invoiceDate : data.invoiceDate?.toISOString() || new Date().toISOString(),
    //                 invoiceNumber: data.invoiceNumber,
    //                 description: `Sales Invoice - ${data.invoiceNumber}${data.notes ? ' - ' + data.notes : ''}`
    //             };

    //             console.log('Creating ledger entry:', ledgerEntryData);

    //             const ledgerResult = await LedgerEntryAPI.createSalesInvoiceEntry(ledgerEntryData);
    //             console.log('Ledger entry created successfully:', ledgerResult.entry?.id);

    //             return {
    //                 success: true,
    //                 invoice: invoiceResult.invoice,
    //                 ledgerEntry: ledgerResult.entry,
    //                 message: 'Invoice and ledger entry created successfully'
    //             };

    //         } catch (ledgerError) {
    //             console.error('Ledger entry creation failed:', ledgerError);
                
    //             // Invoice was created but ledger failed - this is a critical issue
    //             // You might want to implement compensation logic here
    //             console.warn('Invoice created but ledger entry failed - consider implementing rollback');
                
    //             return {
    //                 success: false,
    //                 invoice: invoiceResult.invoice,
    //                 error: 'Invoice created but ledger entry failed',
    //                 ledgerError: ledgerError instanceof Error ? ledgerError.message : 'Unknown ledger error',
    //                 requiresManualLedgerEntry: true
    //             };
    //         }

    //     } catch (error) {
    //         console.error('Invoice creation failed:', error);
    //         throw new Error(`Failed to create invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    //     }
    // }
// Enhanced create method with stock updates for invoiceApi.ts

// Create invoice with mandatory ledger entry and stock updates
static async create(data: InvoiceInterface) {
    console.log('=== InvoiceAPI: Creating invoice with ledger entry and stock updates ===');
    console.log('Invoice data:', data);

    // Validation: Check if customer ID exists for ledger entry
    if (!data.customer.id) {
        throw new Error('Customer ID is required for ledger entry creation');
    }

    if (!data.summary?.grandTotal || data.summary.grandTotal <= 0) {
        throw new Error('Valid grand total is required for ledger entry');
    }

    if (!data.invoiceNumber || data.invoiceNumber.trim() === '') {
        throw new Error('Invoice number is required');
    }

    try {
        // Step 1: Validate stock availability before creating the invoice
        console.log('=== Validating stock availability ===');
        
        const { validateStockForUpdate } = await import('@/server/features/items/infrastructure/itemApi/stockManagementHelper');
        
        const stockValidation = await validateStockForUpdate(data, 'invoice');
        
        if (!stockValidation.valid) {
            console.error('Stock validation failed:', stockValidation.issues);
            throw new Error(`Insufficient stock: ${stockValidation.issues.join(', ')}`);
        }
        
        console.log('Stock validation passed - proceeding with invoice creation');

        // Step 2: Create the invoice
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create invoice: ${response.status} - ${errorText}`);
        }

        const invoiceResult = await response.json();
        console.log('Invoice created successfully:', invoiceResult.invoice?.id);

        // Step 3: Update stock for all items (reduce stock for sale)
        let stockUpdateResult: any = null;
        try {
            console.log('=== Starting stock updates ===');
            
            const { 
                processDocumentStock, 
                logStockOperationSummary 
            } = await import('@/server/features/items/infrastructure/itemApi/stockManagementHelper');

            stockUpdateResult = await processDocumentStock(data, 'invoice');
            
            // Log the stock update summary
            logStockOperationSummary(
                stockUpdateResult, 
                'invoice', 
                invoiceResult.invoice?.id
            );

            if (stockUpdateResult.failedCount > 0) {
                console.warn(`Stock updates partially failed: ${stockUpdateResult.failedCount}/${stockUpdateResult.totalItems} items failed`);
                
                // This is critical for invoices - if stock can't be reduced, we might need to handle this differently
                console.error('Stock reduction failed for some items - this may indicate data inconsistency');
            } else {
                console.log('All stock updates completed successfully');
            }

        } catch (stockError) {
            console.error('Stock update failed:', stockError);
            
            // For invoices, stock reduction failure is more critical than for purchases
            // You might want to consider rolling back the invoice creation
            console.error('Critical: Invoice created but stock could not be reduced');
            
            stockUpdateResult = {
                totalItems: 0,
                successCount: 0,
                failedCount: data.items?.length || 0,
                results: [],
                errors: [stockError instanceof Error ? stockError.message : 'Unknown stock update error']
            };
        }

        // Step 4: Create corresponding ledger entry
        let ledgerResult = null;
        try {
            const ledgerEntryData = {
                customerLedgerAccountId: data.customer.id,
                amount: data.summary.grandTotal,
                date: typeof data.invoiceDate === 'string' 
                    ? data.invoiceDate 
                    : data.invoiceDate?.toISOString() || new Date().toISOString(),
                invoiceNumber: data.invoiceNumber,
                description: `Sales Invoice - ${data.invoiceNumber}${data.notes ? ' - ' + data.notes : ''}`
            };

            console.log('Creating ledger entry:', ledgerEntryData);

            ledgerResult = await LedgerEntryAPI.createSalesInvoiceEntry(ledgerEntryData);
            console.log('Ledger entry created successfully:', ledgerResult.entry?.id);

        } catch (ledgerError) {
            console.error('Ledger entry creation failed:', ledgerError);
            ledgerResult = {
                success: false,
                error: ledgerError instanceof Error ? ledgerError.message : 'Unknown ledger error'
            };
        }

        // Step 5: Determine overall success and create response
        const hasStockIssues = stockUpdateResult?.failedCount > 0;
        const hasLedgerIssues = !ledgerResult?.entry;
        
        const warnings: string[] = [];
        if (hasStockIssues) {
            warnings.push(`${stockUpdateResult.failedCount} stock updates failed`);
        }
        if (hasLedgerIssues) {
            warnings.push('Ledger entry creation failed');
        }

        // Determine if this is a successful creation with warnings or a failed creation
        const overallSuccess = !hasStockIssues; // For invoices, stock issues are more critical
        
        if (overallSuccess) {
            return {
                success: true,
                invoice: invoiceResult.invoice,
                ledgerEntry: ledgerResult?.entry || null,
                stockUpdate: stockUpdateResult,
                message: 'Invoice creation completed',
                warnings: warnings.length > 0 ? warnings : undefined,
                summary: {
                    invoiceCreated: true,
                    stockItemsProcessed: stockUpdateResult?.totalItems || 0,
                    stockUpdatesSuccessful: stockUpdateResult?.successCount || 0,
                    stockUpdatesFailed: stockUpdateResult?.failedCount || 0,
                    ledgerEntryCreated: !!ledgerResult?.entry,
                    requiresAttention: warnings.length > 0
                }
            };
        } else {
            // Critical failure - stock couldn't be reduced
            return {
                success: false,
                invoice: invoiceResult.invoice,
                stockUpdate: stockUpdateResult,
                ledgerEntry: ledgerResult?.entry || null,
                error: 'Invoice created but critical stock updates failed',
                warnings: warnings,
                requiresManualIntervention: true,
                summary: {
                    invoiceCreated: true,
                    stockItemsProcessed: stockUpdateResult?.totalItems || 0,
                    stockUpdatesSuccessful: stockUpdateResult?.successCount || 0,
                    stockUpdatesFailed: stockUpdateResult?.failedCount || 0,
                    ledgerEntryCreated: !!ledgerResult?.entry,
                    criticalIssue: true
                }
            };
        }

    } catch (error) {
        console.error('Invoice creation failed:', error);
        throw new Error(`Failed to create invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

    // Update invoice with optional ledger entry update
    static async update(data: InvoiceInterface, updateLedger: boolean = true) {
        console.log('=== InvoiceAPI: Updating invoice ===');
        console.log('Invoice data:', data);
        console.log('Update ledger:', updateLedger);

        try {
            // Step 1: Update the invoice
            const response = await fetch(`${API_BASE_URL}/${data.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update invoice: ${response.status} - ${errorText}`);
            }

            const invoiceResult = await response.json();
            console.log('Invoice updated successfully:', invoiceResult.invoice?.id);

            // Step 2: Update ledger entry if requested and data is valid
            if (updateLedger && data.customer?.id && data.summary?.grandTotal) {
                try {
                    // Note: You might need to store ledger entry ID with invoice to update it
                    // For now, we'll create a new entry or implement a lookup mechanism
                    console.log('Ledger update requested but implementation is under work ');
                    
                    // Option 1: If you have ledgerEntryId stored with invoice
                    // const ledgerResult = await LedgerEntryAPI.update(data.ledgerEntryId, updatedLedgerData);
                    
                    // Option 2: Create compensation entry for the difference
                    // const balanceCheck = await LedgerEntryAPI.getBalance(data.customer.id);
                    // Handle accordingly
                    
                    return {
                        success: true,
                        invoice: invoiceResult.invoice,
                        message: 'Invoice updated successfully',
                        ledgerNote: 'Ledger update logic depends on your business requirements'
                    };

                } catch (ledgerError) {
                    console.error('Ledger entry update failed:', ledgerError);
                    return {
                        success: true,
                        invoice: invoiceResult.invoice,
                        warning: 'Invoice updated but ledger entry update failed',
                        ledgerError: ledgerError instanceof Error ? ledgerError.message : 'Unknown ledger error'
                    };
                }
            }

            return {
                success: true,
                invoice: invoiceResult.invoice,
                message: 'Invoice updated successfully'
            };

        } catch (error) {
            console.error('Invoice update failed:', error);
            throw new Error(`Failed to update invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Delete invoice (consider ledger entry implications)
    static async delete(id: string, handleLedgerEntry: boolean = true) {
        console.log('=== InvoiceAPI: Deleting invoice ===');
        console.log('Invoice ID:', id);
        console.log('Handle ledger entry:', handleLedgerEntry);

        if (handleLedgerEntry) {
            console.warn('Invoice deletion with ledger entries requires careful consideration');
            console.warn('Consider creating reversal entries instead of deletion');
            // You might want to create a reversal ledger entry instead of deleting
        }

        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE',
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to delete invoice: ${response.status} - ${errorText}`);
        }
        
        return response.json();
    }

    // Update invoice status with ledger considerations
    static async updateStatus(id: string, status: 'draft' | 'sent' | 'paid' | 'cancelled', handleLedgerEntry: boolean = true) {
        console.log('=== InvoiceAPI: Updating invoice status ===');
        console.log('Invoice ID:', id, 'New status:', status);

        const response = await fetch(`${API_BASE_URL}/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status }),
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to update invoice status: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        // Handle ledger implications for status changes
        if (handleLedgerEntry && status === 'paid') {
            console.log('Invoice marked as paid - consider creating payment receipt ledger entry');
            // You might want to create a payment receipt entry here
        } else if (handleLedgerEntry && status === 'cancelled') {
            console.log('Invoice cancelled - consider creating reversal ledger entry');
            // You might want to create a reversal entry here
        }

        return result;
    }

    // Create invoice with validation and ledger check
    static async createWithValidation(data: InvoiceInterface) {
        console.log('=== InvoiceAPI: Creating invoice with validation ===');

        // Pre-validation checks
        const validationErrors: string[] = [];

        if (!data.customer?.id) {
            validationErrors.push('Customer ID is required');
        }

        if (!data.invoiceNumber || data.invoiceNumber.trim() === '') {
            validationErrors.push('Invoice number is required');
        }

        if (!data.summary?.grandTotal || data.summary.grandTotal <= 0) {
            validationErrors.push('Valid grand total is required');
        }

        if (!data.invoiceDate) {
            validationErrors.push('Invoice date is required');
        }

        if (validationErrors.length > 0) {
            throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
        }

        // Check if customer ledger account exists
        if (data.customer?.id) {
            try {
                const ledgerCheck = await LedgerEntryAPI.checkLedgerAccount(data.customer.id);
                if (!ledgerCheck.exists) {
                    console.warn('Customer ledger account does not exist, but proceeding with creation');
                    // You might want to create the ledger account here or throw an error
                }
            } catch (error) {
                console.warn('Could not verify customer ledger account:', error);
            }
        }

        // Proceed with creation
        return this.create(data);
    }

    // === EXISTING METHODS (keeping your original functionality) ===

    // Get invoice by number
    static async getByNumber(invoiceNumber: string, fpoId?: string) {
        const params = new URLSearchParams();
        if (fpoId) params.append('fpoId', fpoId);
        
        const response = await fetch(`${API_BASE_URL}/number/${invoiceNumber}${params.toString() ? '?' + params.toString() : ''}`);
        if (!response.ok) throw new Error('Failed to fetch invoice by number');
        return response.json();
    }

    // Get invoices by status
    static async getByStatus(
        status: 'draft' | 'sent' | 'paid' | 'cancelled', 
        options?: {
            page?: number;
            limit?: number;
            sortBy?: 'invoice_date' | 'invoice_number' | 'created_at' | 'updated_at';
            sortOrder?: 'asc' | 'desc';
        }
    ) {
        const params = new URLSearchParams();
        if (options) {
            Object.entries(options).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, value.toString());
                }
            });
        }

        const response = await fetch(`${API_BASE_URL}/status/${status}${params.toString() ? '?' + params.toString() : ''}`);
        if (!response.ok) throw new Error('Failed to fetch invoices by status');
        return response.json();
    }

    // Get invoices by FPO ID
    static async getByFpoId(
        fpoId: string,
        options?: {
            page?: number;
            limit?: number;
            sortBy?: 'invoice_date' | 'invoice_number' | 'created_at' | 'updated_at';
            sortOrder?: 'asc' | 'desc';
        }
    ) {
        const params = new URLSearchParams();
        if (options) {
            Object.entries(options).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, value.toString());
                }
            });
        }

        const response = await fetch(`${API_BASE_URL}/fpo/${fpoId}${params.toString() ? '?' + params.toString() : ''}`);
        if (!response.ok) throw new Error('Failed to fetch invoices by FPO ID');
        return response.json();
    }

    // Get next invoice number
    static async getNextInvoiceNumber(fpoId: string, prefix: string = 'INV') {
        const params = new URLSearchParams();
        params.append('fpoId', fpoId);
        params.append('prefix', prefix);

        const response = await fetch(`/api/invoices/next-number?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to get next invoice number');
        return response.json();
    }

    // Bulk update status
    static async bulkUpdateStatus(ids: string[], status: 'draft' | 'sent' | 'paid' | 'cancelled') {
        const response = await fetch(`${API_BASE_URL}/bulk`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids, status }),
        });
        if (!response.ok) throw new Error('Failed to bulk update invoice status');
        return response.json();
    }

    // Bulk delete
    static async bulkDelete(ids: string[]) {
        const response = await fetch(`${API_BASE_URL}/bulk`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids }),
        });
        if (!response.ok) throw new Error('Failed to bulk delete invoices');
        return response.json();
    }

    // Search invoices
    static async search(searchTerm: string, fpoId?: string) {
        const filters: any = {};
        
        if (searchTerm) {
            filters.customerName = searchTerm;
        }
        
        if (fpoId) {
            filters.fpoId = fpoId;
        }

        try {
            return await this.getAll(filters);
        } catch (error) {
            if (searchTerm) {
                filters.customerName = undefined;
                filters.invoiceNumber = searchTerm;
                return await this.getAll(filters);
            }
            throw error;
        }
    }

    // Get invoices by date range
    static async getByDateRange(fpoId: string, startDate: string, endDate: string) {
        const filters = {
            fpoId,
            dateFrom: startDate,
            dateTo: endDate
        };

        return await this.getAll(filters);
    }

    // Export invoices
    static async export(fpoId: string, format: 'json' | 'csv' = 'json', filters?: any) {
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
        if (!response.ok) throw new Error('Failed to export invoices');
        
        if (format === 'csv') {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoices_${fpoId}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            return;
        }
        
        return response.json();
    }

    // Validate invoice
    static async validate(data: InvoiceInterface) {
        const response = await fetch(`${API_BASE_URL}/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to validate invoice');
        return response.json();
    }

    // === LEDGER-SPECIFIC HELPER METHODS ===

    // Get customer ledger statement for invoice period
    static async getCustomerLedgerStatement(customerId: string, startDate?: string, endDate?: string) {
        return LedgerEntryAPI.getStatement(customerId, startDate, endDate);
    }

    // Get customer balance
    static async getCustomerBalance(customerId: string) {
        return LedgerEntryAPI.getBalance(customerId);
    }

    // Create payment receipt entry (when invoice is paid)
    static async createPaymentReceipt(customerId: string, amount: number, receiptNumber: string, date?: string) {
        return LedgerEntryAPI.createPaymentInEntry({
            customerLedgerAccountId: customerId,
            amount: amount,
            date: date || new Date().toISOString(),
            receiptNumber: receiptNumber,
            description: `Payment received - Receipt ${receiptNumber}`
        });
    }
}