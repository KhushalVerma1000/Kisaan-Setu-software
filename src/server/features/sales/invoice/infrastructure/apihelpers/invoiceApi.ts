// Enhanced Client-side API helper functions with Ledger Integration
// @/server/features/sales/invoice/infrastructure/invoiceApi.ts
import { InvoiceInterface } from '@/server/features/sales/invoice/core/entities/invoice';
import { LedgerEntryAPI } from '@/server/features/ledger/infrastructure/apiHelper/ledgerEntry/ledgerEntryApi';
import { LedgerEntryInterface } from '@/server/features/ledger/core/entities/Ledger';
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
// Enhanced create method with stock updates and proper ledger integration for invoiceApi.ts

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
        console.log("response of created invoice ",invoiceResult)
        const createdInvoice = invoiceResult;
        
        if (!createdInvoice || !createdInvoice.id) {
            throw new Error('Invoice creation failed: No invoice ID returned');
        }
        
        console.log('Invoice created successfully:', {
            id: createdInvoice.id,
            invoiceNumber: createdInvoice.invoiceNumber
        });

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
                createdInvoice.id
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

        // Step 4: Create corresponding ledger entry with proper document ID
        let ledgerResult = null;
        try {
            const ledgerEntryData = {
                customerLedgerAccountId: data.customer.id,
                amount: data.summary.grandTotal,
                date: typeof data.invoiceDate === 'string' 
                    ? data.invoiceDate 
                    : data.invoiceDate?.toISOString() || new Date().toISOString(),
                invoiceId: createdInvoice.id,           // ✅ Use the actual invoice ID from database
                invoiceNumber: data.invoiceNumber,       // ✅ Display number for reference
                customerName: data.customer.name,
            };

            console.log('Creating ledger entry with document ID:', {
                invoiceId: ledgerEntryData.invoiceId,
                invoiceNumber: ledgerEntryData.invoiceNumber,
                amount: ledgerEntryData.amount,
                customerId: ledgerEntryData.customerLedgerAccountId
            });

            ledgerResult = await LedgerEntryAPI.createSalesInvoiceEntry(ledgerEntryData);
            console.log('Ledger entry created successfully:', {
                ledgerEntryId: ledgerResult.entry?.id,
                linkedInvoiceId: createdInvoice.id
            });

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
                invoice: createdInvoice,
                ledgerEntry: ledgerResult?.entry || null,
                stockUpdate: stockUpdateResult,
                message: 'Invoice creation completed successfully',
                warnings: warnings.length > 0 ? warnings : undefined,
                summary: {
                    invoiceCreated: true,
                    invoiceId: createdInvoice.id,
                    invoiceNumber: createdInvoice.invoiceNumber,
                    stockItemsProcessed: stockUpdateResult?.totalItems || 0,
                    stockUpdatesSuccessful: stockUpdateResult?.successCount || 0,
                    stockUpdatesFailed: stockUpdateResult?.failedCount || 0,
                    ledgerEntryCreated: !!ledgerResult?.entry,
                    ledgerEntryId: ledgerResult?.entry?.id || null,
                    requiresAttention: warnings.length > 0
                }
            };
        } else {
            // Critical failure - stock couldn't be reduced
            return {
                success: false,
                invoice: createdInvoice,
                stockUpdate: stockUpdateResult,
                ledgerEntry: ledgerResult?.entry || null,
                error: 'Invoice created but critical stock updates failed',
                warnings: warnings,
                requiresManualIntervention: true,
                summary: {
                    invoiceCreated: true,
                    invoiceId: createdInvoice.id,
                    invoiceNumber: createdInvoice.invoiceNumber,
                    stockItemsProcessed: stockUpdateResult?.totalItems || 0,
                    stockUpdatesSuccessful: stockUpdateResult?.successCount || 0,
                    stockUpdatesFailed: stockUpdateResult?.failedCount || 0,
                    ledgerEntryCreated: !!ledgerResult?.entry,
                    ledgerEntryId: ledgerResult?.entry?.id || null,
                    criticalIssue: true
                }
            };
        }

    } catch (error) {
        console.error('Invoice creation failed:', error);
        throw new Error(`Failed to create invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
   static async update(data: InvoiceInterface, updateLedger: boolean = true) {
        console.log('=== InvoiceAPI: Updating invoice with smart stock and ledger updates ===');
        console.log('Invoice data:', data);
        console.log('Update ledger:', updateLedger);

        if (!data.id) {
            throw new Error('Invoice ID is required for update operation');
        }

        try {
            // Step 1: Fetch original invoice data
            console.log('=== Step 1: Fetching original invoice data ===');
            const originalInvoiceResponse = await fetch(`${API_BASE_URL}/${data.id}`);
            
            if (!originalInvoiceResponse.ok) {
                const errorText = await originalInvoiceResponse.text();
                throw new Error(`Failed to fetch original invoice: ${originalInvoiceResponse.status} - ${errorText}`);
            }

            const originalInvoiceResult = await originalInvoiceResponse.json();
            const originalInvoiceData = originalInvoiceResult.invoice || originalInvoiceResult;
            
            if (!originalInvoiceData) {
                throw new Error('Original invoice data not found');
            }

            console.log('Original invoice fetched successfully:', {
                id: originalInvoiceData.id,
                invoiceNumber: originalInvoiceData.invoiceNumber,
                itemsCount: originalInvoiceData.items?.length || 0,
                originalAmount: originalInvoiceData.summary?.grandTotal,
                newAmount: data.summary?.grandTotal
            });

            // Step 2: Handle ledger entry update (before stock/invoice updates for consistency)
            let ledgerUpdateResult = null;
            let originalLedgerEntry = null;

            if (updateLedger && data.customer?.id && data.summary?.grandTotal) {
                try {
                    console.log('=== Step 2: Handling ledger entry update ===');
                    
                    // Check if invoice has existing ledger entries
                    const ledgerCheck = await LedgerEntryAPI.hasLedgerEntries(data.id);
                    console.log('Existing ledger entries check:', ledgerCheck);

                    if (ledgerCheck.exists && ledgerCheck.count > 0) {
                        // Get the primary ledger entry (should be only one for invoice)
                        originalLedgerEntry = ledgerCheck.entries[0];
                        console.log('Found existing ledger entry:', originalLedgerEntry.id);

                        // Check if ledger update is needed
                        const needsLedgerUpdate = this.shouldUpdateLedgerEntry(originalInvoiceData, data);
                        
                        if (needsLedgerUpdate.update) {
                            console.log('Ledger update required:', needsLedgerUpdate.reasons);
                            
                            if (needsLedgerUpdate.recreate) {
                                // Significant changes require recreating the entry
                                console.log('Recreating ledger entry due to significant changes');
                                
                                // Delete old entry
                                await LedgerEntryAPI.delete(originalLedgerEntry.id);
                                
                                // Create new entry
                                const newLedgerEntryData = {
                                    customerLedgerAccountId: data.customer.id,
                                    amount: data.summary.grandTotal,
                                    date: typeof data.invoiceDate === 'string' 
                                        ? data.invoiceDate 
                                        : data.invoiceDate?.toISOString() || new Date().toISOString(),
                                    invoiceId: data.id,
                                    invoiceNumber: data.invoiceNumber,
                                    customerName: data.customer.name,
                                };
                                
                                ledgerUpdateResult = await LedgerEntryAPI.createSalesInvoiceEntry(newLedgerEntryData);
                                console.log('New ledger entry created:', ledgerUpdateResult.id);
                                
                            } else {
                                // Minor changes can be updated in place
                                console.log('Updating existing ledger entry in place');
                                
                                const updatedLedgerData = {
                                    ...originalLedgerEntry,
                                    amount: data.summary.grandTotal,
                                    date: typeof data.invoiceDate === 'string' 
                                        ? data.invoiceDate 
                                        : data.invoiceDate?.toISOString(),
                                    description: `Sales Invoice - ${data.invoiceNumber}${data.notes ? ' - ' + data.notes : ''}`,
                                };
                                
                                ledgerUpdateResult = await LedgerEntryAPI.update(originalLedgerEntry.id, updatedLedgerData);
                                console.log('Ledger entry updated successfully:', ledgerUpdateResult.id);
                            }
                        } else {
                            console.log('No ledger update required - values unchanged');
                            ledgerUpdateResult = originalLedgerEntry;
                        }
                        
                    } else {
                        // No existing ledger entry - create new one
                        console.log('No existing ledger entry found - creating new one');
                        
                        const newLedgerEntryData = {
                            customerLedgerAccountId: data.customer.id,
                            amount: data.summary.grandTotal,
                            date: typeof data.invoiceDate === 'string' 
                                ? data.invoiceDate 
                                : data.invoiceDate?.toISOString() || new Date().toISOString(),
                            invoiceId: data.id,
                            invoiceNumber: data.invoiceNumber,
                            customerName: data.customer.name,
                        };
                        
                        ledgerUpdateResult = await LedgerEntryAPI.createSalesInvoiceEntry(newLedgerEntryData);
                        console.log('New ledger entry created:', ledgerUpdateResult.id);
                    }

                } catch (ledgerError) {
                    console.error('Ledger entry update failed:', ledgerError);
                    throw new Error(`Ledger update failed: ${ledgerError instanceof Error ? ledgerError.message : 'Unknown ledger error'}`);
                }
            }

            // Step 3: Perform smart stock update (validates and updates only differences)
            console.log('=== Step 3: Performing smart stock update ===');
            
            const { 
                smartUpdateDocumentStock, 
                logStockOperationSummary 
            } = await import('@/server/features/items/infrastructure/itemApi/stockManagementHelper');

            let stockUpdateResult: any = null;
            let stockUpdateSucceeded = false;

            try {
                stockUpdateResult = await smartUpdateDocumentStock(
                    originalInvoiceData,
                    data,
                    'invoice'
                );

                stockUpdateSucceeded = true;
                
                // Log the stock update summary
                logStockOperationSummary(
                    stockUpdateResult, 
                    'invoice_update', 
                    data.id
                );

                if (stockUpdateResult.failedCount > 0) {
                    // Stock validation/update failed - rollback ledger if updated
                    const errorMessage = `Stock update failed: ${stockUpdateResult.failedCount}/${stockUpdateResult.totalItems} items failed`;
                    console.error(errorMessage);
                    console.error('Stock update errors:', stockUpdateResult.errors);
                    
                    // Rollback ledger changes if they were made
                    if (ledgerUpdateResult && originalLedgerEntry) {
                        await this.rollbackLedgerUpdate(originalLedgerEntry, ledgerUpdateResult);
                    }
                    
                    throw new Error(`${errorMessage}. Issues: ${stockUpdateResult.errors.join(', ')}`);
                }

                console.log('✅ Smart stock update completed successfully:', {
                    totalItems: stockUpdateResult.totalItems,
                    successCount: stockUpdateResult.successCount,
                    failedCount: stockUpdateResult.failedCount
                });

            } catch (stockError) {
                console.error('❌ Stock update failed:', stockError);
                
                // Rollback ledger changes if they were made
                if (ledgerUpdateResult && originalLedgerEntry) {
                    await this.rollbackLedgerUpdate(originalLedgerEntry, ledgerUpdateResult);
                }
                
                throw new Error(`Stock validation/update failed: ${stockError instanceof Error ? stockError.message : 'Unknown stock update error'}`);
            }

            // Step 4: Update invoice in database
            console.log('=== Step 4: Updating invoice in database ===');
            let invoiceUpdateSucceeded = false;
            let invoiceResult: any = null;

            try {
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

                invoiceResult = await response.json();
                invoiceUpdateSucceeded = true;
                
                console.log('✅ Invoice updated successfully in database:', invoiceResult.invoice?.id);

            } catch (invoiceError) {
                console.error('❌ Invoice database update failed:', invoiceError);
                
                // COMPENSATION: Stock and ledger updates succeeded but invoice update failed
                // We need to reverse both changes to maintain data consistency
                if (stockUpdateSucceeded && stockUpdateResult.totalItems > 0) {
                    console.log('=== COMPENSATION: Reversing stock changes due to invoice update failure ===');
                    await this.rollbackStockUpdate(data, originalInvoiceData);
                }

                // Rollback ledger changes if they were made
                if (ledgerUpdateResult && originalLedgerEntry) {
                    await this.rollbackLedgerUpdate(originalLedgerEntry, ledgerUpdateResult);
                }

                throw new Error(`Invoice update failed: ${invoiceError instanceof Error ? invoiceError.message : 'Unknown error'}`);
            }

            // Step 5: Prepare success response
            console.log('=== Invoice update completed successfully ===');
            
            return {
                success: true,
                invoice: invoiceResult.invoice,
                stockUpdate: stockUpdateResult,
                ledgerUpdate: {
                    updated: updateLedger,
                    entry: ledgerUpdateResult,
                    operation: originalLedgerEntry ? 'updated' : 'created'
                },
                message: 'Invoice, stock, and ledger updated successfully',
                summary: {
                    invoiceUpdated: true,
                    stockItemsProcessed: stockUpdateResult?.totalItems || 0,
                    stockUpdatesSuccessful: stockUpdateResult?.successCount || 0,
                    stockUpdatesFailed: stockUpdateResult?.failedCount || 0,
                    ledgerUpdateRequested: updateLedger,
                    ledgerEntryUpdated: !!ledgerUpdateResult,
                    ledgerEntryId: ledgerUpdateResult?.id,
                    operationType: 'smart_update_with_ledger'
                }
            };

        } catch (error) {
            console.error('Invoice update operation failed:', error);
            throw new Error(`Failed to update invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Enhanced delete method with optimized ledger entry handling
    static async delete(id: string, handleLedgerEntry: boolean = true) {
        console.log('=== InvoiceAPI: Deleting invoice with safe stock reversal and ledger cleanup ===');
        console.log('Invoice ID:', id);
        console.log('Handle ledger entry:', handleLedgerEntry);

        if (!id || id.trim() === '') {
            throw new Error('Invoice ID is required for delete operation');
        }

        try {
            // Step 1: Fetch invoice data to be deleted
            console.log('=== Step 1: Fetching invoice data for deletion ===');
            const invoiceResult = await this.getById(id);
            const invoiceData = await invoiceResult;
            
            if (!invoiceData) {
                throw new Error('Invoice data not found');
            }

            console.log('Invoice fetched successfully:', {
                id: invoiceData.id,
                invoiceNumber: invoiceData.invoiceNumber,
                status: invoiceData.status,
                itemsCount: invoiceData.items?.length || 0,
                amount: invoiceData.summary?.grandTotal
            });

            // Step 2: Handle ledger entry cleanup (before other operations for consistency)
            let ledgerCleanupResult: any = null;
            let deletedLedgerEntries: LedgerEntryInterface[] = [];

            if (handleLedgerEntry) {
                try {
                    console.log('=== Step 2: Handling ledger entry cleanup ===');
                    
                    // Check if invoice has ledger entries
                    const ledgerCheck = await LedgerEntryAPI.hasLedgerEntries(id);
                    console.log('Existing ledger entries check:', ledgerCheck);

                    if (ledgerCheck.exists && ledgerCheck.count > 0) {
                        console.log(`Found ${ledgerCheck.count} ledger entries to delete`);
                        
                        // Store entries for potential rollback
                        deletedLedgerEntries = [...ledgerCheck.entries] as LedgerEntryInterface[];
                        
                        // Delete all ledger entries for this invoice
                        ledgerCleanupResult = await LedgerEntryAPI.deleteByDocumentId(id);
                        console.log('✅ Ledger entries deleted successfully:', {
                            deletedCount: ledgerCleanupResult.deletedCount || ledgerCheck.count
                        });
                        
                    } else {
                        console.log('No ledger entries found for this invoice');
                        ledgerCleanupResult = { deletedCount: 0, message: 'No ledger entries found' };
                    }

                } catch (ledgerError) {
                    console.error('❌ Ledger entry cleanup failed:', ledgerError);
                    throw new Error(`Ledger cleanup failed: ${ledgerError instanceof Error ? ledgerError.message : 'Unknown ledger error'}`);
                }
            }

            // Step 3: Perform safe stock reversal (validates and reverses stock changes)
            console.log('=== Step 3: Performing safe stock reversal ===');
            
            const { 
                safeReverseDocumentStock, 
                logStockOperationSummary 
            } = await import('@/server/features/items/infrastructure/itemApi/stockManagementHelper');

            let stockReversalResult: any = null;
            let stockReversalSucceeded = false;

            try {
                stockReversalResult = await safeReverseDocumentStock(
                    invoiceData,
                    'invoice',
                    {
                        skipValidation: false, // We want validation
                        force: false // Respect validation failures
                    }
                );

                stockReversalSucceeded = true;
                
                // Log the stock reversal summary
                logStockOperationSummary(
                    stockReversalResult, 
                    'invoice_delete_reversal', 
                    id
                );

                if (stockReversalResult.failedCount > 0) {
                    // Stock reversal failed - rollback ledger cleanup
                    const errorMessage = `Stock reversal failed: ${stockReversalResult.failedCount}/${stockReversalResult.totalItems} items failed`;
                    console.error(errorMessage);
                    console.error('Stock reversal errors:', stockReversalResult.errors);
                    
                    // Rollback ledger deletion if it was done
                    if (deletedLedgerEntries.length > 0) {
                        await this.rollbackLedgerDeletion(deletedLedgerEntries);
                    }
                    
                    throw new Error(`${errorMessage}. Cannot delete invoice safely. Issues: ${stockReversalResult.errors.join(', ')}`);
                }

                console.log('✅ Safe stock reversal completed successfully:', {
                    totalItems: stockReversalResult.totalItems,
                    successCount: stockReversalResult.successCount,
                    failedCount: stockReversalResult.failedCount
                });

            } catch (stockError) {
                console.error('❌ Stock reversal failed:', stockError);
                
                // Rollback ledger deletion if it was done
                if (deletedLedgerEntries.length > 0) {
                    await this.rollbackLedgerDeletion(deletedLedgerEntries);
                }
                
                throw new Error(`Stock reversal validation/execution failed: ${stockError instanceof Error ? stockError.message : 'Unknown stock reversal error'}`);
            }

            // Step 4: Delete invoice from database
            console.log('=== Step 4: Deleting invoice from database ===');
            let invoiceDeleteSucceeded = false;
            let deleteResult: any = null;

            try {
                const response = await fetch(`${API_BASE_URL}/${id}`, {
                    method: 'DELETE',
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to delete invoice from database: ${response.status} - ${errorText}`);
                }
                
                deleteResult = await response.json();
                invoiceDeleteSucceeded = true;
                
                console.log('✅ Invoice deleted successfully from database');

            } catch (deleteError) {
                console.error('❌ Invoice database deletion failed:', deleteError);
                
                // COMPENSATION: Stock reversal and ledger cleanup succeeded but invoice deletion failed
                // We need to restore both to maintain consistency
                if (stockReversalSucceeded && stockReversalResult.totalItems > 0) {
                    console.log('=== COMPENSATION: Re-applying stock changes due to invoice deletion failure ===');
                    await this.rollbackStockReversal(invoiceData);
                }

                // Rollback ledger deletion if it was done
                if (deletedLedgerEntries.length > 0) {
                    await this.rollbackLedgerDeletion(deletedLedgerEntries);
                }

                throw new Error(`Invoice deletion failed: ${deleteError instanceof Error ? deleteError.message : 'Unknown error'}`);
            }

            // Step 5: Prepare success response
            console.log('=== Invoice deletion completed successfully ===');
            
            return {
                success: true,
                deletedInvoice: {
                    id: invoiceData.id,
                    invoiceNumber: invoiceData.invoiceNumber
                },
                stockReversal: stockReversalResult,
                ledgerCleanup: {
                    handled: handleLedgerEntry,
                    deletedEntries: deletedLedgerEntries.length,
                    result: ledgerCleanupResult
                },
                message: 'Invoice deleted, stock restored, and ledger cleaned up successfully',
                summary: {
                    invoiceDeleted: true,
                    stockItemsProcessed: stockReversalResult?.totalItems || 0,
                    stockReversalsSuccessful: stockReversalResult?.successCount || 0,
                    stockReversalsFailed: stockReversalResult?.failedCount || 0,
                    ledgerEntriesDeleted: deletedLedgerEntries.length,
                    ledgerHandled: handleLedgerEntry,
                    operationType: 'safe_delete_with_ledger_cleanup'
                }
            };

        } catch (error) {
            console.error('Invoice deletion operation failed:', error);
            throw new Error(`Failed to delete invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Helper method to determine if ledger entry needs updating
    private static shouldUpdateLedgerEntry(original: InvoiceInterface, updated: InvoiceInterface) {
        const reasons: string[] = [];
        let needsUpdate = false;
        let needsRecreate = false;

        // Check amount change
        if (original.summary?.grandTotal !== updated.summary?.grandTotal) {
            reasons.push('Amount changed');
            needsUpdate = true;
        }

        // Check customer change (requires recreation)
        if (original.customer?.id !== updated.customer?.id) {
            reasons.push('Customer changed');
            needsUpdate = true;
            needsRecreate = true;
        }

        // Check date change
        const originalDate = typeof original.invoiceDate === 'string' 
            ? original.invoiceDate 
            : original.invoiceDate?.toISOString();
        const updatedDate = typeof updated.invoiceDate === 'string' 
            ? updated.invoiceDate 
            : updated.invoiceDate?.toISOString();
        
        if (originalDate !== updatedDate) {
            reasons.push('Date changed');
            needsUpdate = true;
        }

        // Check invoice number change
        if (original.invoiceNumber !== updated.invoiceNumber) {
            reasons.push('Invoice number changed');
            needsUpdate = true;
        }

        return {
            update: needsUpdate,
            recreate: needsRecreate,
            reasons
        };
    }

    // Helper method to rollback ledger updates
    private static async rollbackLedgerUpdate(originalEntry: LedgerEntryInterface, newEntry: LedgerEntryInterface): Promise<void> {
        console.log('=== ROLLBACK: Reversing ledger changes ===');
        try {
            if (newEntry && newEntry.id !== originalEntry.id) {
                // New entry was created - delete it
                if (newEntry.id) {
                    await LedgerEntryAPI.delete(newEntry.id);
                    console.log('✅ New ledger entry deleted');
                }
                
                // Restore original entry
                await LedgerEntryAPI.create(originalEntry);
                console.log('✅ Original ledger entry restored');
            } else if (newEntry && newEntry.id === originalEntry.id) {
                // Entry was updated - restore original values
                if (originalEntry.id) {
                    await LedgerEntryAPI.update(originalEntry.id, originalEntry);
                    console.log('✅ Original ledger entry values restored');
                }
            }
        } catch (rollbackError) {
            console.error('❌ CRITICAL: Ledger rollback failed:', rollbackError);
            throw new Error('Ledger rollback failed - manual intervention required');
        }
    }

    // Helper method to rollback ledger deletion
    private static async rollbackLedgerDeletion(deletedEntries: LedgerEntryInterface[]): Promise<void> {
        console.log('=== ROLLBACK: Restoring deleted ledger entries ===');
        try {
            for (const entry of deletedEntries) {
                // Remove the ID to create a new entry with same data
                const { id, ...entryData } = entry;
                await LedgerEntryAPI.create(entryData as LedgerEntryInterface);
                console.log('✅ Ledger entry restored:', entry.id || 'unknown');
            }
        } catch (rollbackError) {
            console.error('❌ CRITICAL: Ledger deletion rollback failed:', rollbackError);
            throw new Error('Ledger deletion rollback failed - manual intervention required');
        }
    }

    // Helper method to rollback stock updates
    private static async rollbackStockUpdate(currentData: InvoiceInterface, originalData: InvoiceInterface): Promise<void> {
        try {
            const { smartUpdateDocumentStock } = await import('@/server/features/items/infrastructure/itemApi/stockManagementHelper');
            await smartUpdateDocumentStock(currentData, originalData, 'invoice');
            console.log('✅ Stock update rollback completed');
        } catch (rollbackError) {
            console.error('❌ CRITICAL: Stock rollback failed:', rollbackError);
            throw new Error('Stock rollback failed - manual intervention required');
        }
    }

    // Helper method to rollback stock reversal
    private static async rollbackStockReversal(invoiceData: InvoiceInterface): Promise<void> {
        try {
            const { processDocumentStock } = await import('@/server/features/items/infrastructure/itemApi/stockManagementHelper');
            await processDocumentStock(invoiceData, 'invoice');
            console.log('✅ Stock reversal rollback completed');
        } catch (rollbackError) {
            console.error('❌ CRITICAL: Stock reversal rollback failed:', rollbackError);
            throw new Error('Stock reversal rollback failed - manual intervention required');
        }
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
    static async getNextInvoiceNumber(fpoId: string) {
        const params = new URLSearchParams();
        params.append('fpoId', fpoId);

        const response = await fetch(`/api/document-number/preview`,{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fpoId , documentType: 'invoice' }),
        });
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

    // // Create payment receipt entry (when invoice is paid)
    // static async createPaymentReceipt(customerId: string, amount: number, receiptNumber: string, date?: string) {
    //     return LedgerEntryAPI.createPaymentInEntry({
    //         customerLedgerAccountId: customerId,
    //         amount: amount,
    //         date: date || new Date().toISOString(),
    //         receiptNumber: receiptNumber,
    //         description: `Payment received - Receipt ${receiptNumber}`
    //     });
    // }
}