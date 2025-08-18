// Enhanced Client-side API helper functions with Ledger Integration
// @/server/features/purchase/infrastructure/purchaseVoucher/purchaseVoucherApi.ts
import { PurchaseVoucherInterface } from '@/server/features/purchase/core/entities/PurchaseVoucher';
import { LedgerEntryAPI } from '@/server/features/ledger/infrastructure/apiHelper/ledgerEntry/ledgerEntryApi';
import { 
  processDocumentStock, 
  logStockOperationSummary,
  BulkStockOperationResult 
} from '@/server/features/items/infrastructure/itemApi/stockManagementHelper';
import { LedgerEntryInterface } from '@/server/features/ledger/core/entities/Ledger';
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

   
// Create purchase voucher with mandatory ledger entry and stock updates
static async create(data: PurchaseVoucherInterface) {
  console.log('=== PurchaseVoucherAPI: Creating purchase voucher with ledger entry and stock updates ===');
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
    // console.log("api response ======================================================",response)
    const voucherResult = await response.json()
    console.log('Purchase voucher created successfully:', voucherResult.voucher.id);

    // Step 2: Update stock for all items
    let stockUpdateResult: BulkStockOperationResult | null = null;
    try {
      console.log('=== Starting stock updates ===');
      stockUpdateResult = await processDocumentStock(data, 'purchase_voucher');
      
      // Log the stock update summary
      logStockOperationSummary(
        stockUpdateResult, 
        'purchase_voucher', 
        voucherResult.voucher?.id
      );

      if (stockUpdateResult.failedCount > 0) {
        console.warn(`Stock updates partially failed: ${stockUpdateResult.failedCount}/${stockUpdateResult.totalItems} items failed`);
      } else {
        console.log('All stock updates completed successfully');
      }

    } catch (stockError) {
      console.error('Stock update failed:', stockError);
      // Continue with ledger entry creation even if stock update fails
      stockUpdateResult = {
        totalItems: 0,
        successCount: 0,
        failedCount: 0,
        results: [],
        errors: [stockError instanceof Error ? stockError.message : 'Unknown stock update error']
      };
    }

    // Step 3: Create corresponding ledger entry using the helper method
    try {
      const voucherDataForLedger = {
        voucherId: voucherResult.id, // ✅ Document ID
        supplierId: data.supplierVendorId,
        supplierName: data.supplierVendorName,
        voucherNumber: data.voucherNumber || data.poNumber || data.partyInvoiceNumber || 'N/A',
        voucherDate: typeof data.partyInvoiceDate === 'string' 
          ? data.partyInvoiceDate 
          : data.partyInvoiceDate?.toISOString() || new Date().toISOString(),
        grandTotal: data.summary.grandTotal,
        notes: data.notes,
        partyInvoiceNumber: data.partyInvoiceNumber
      };

      console.log('Creating ledger entry using createFromPurchaseVoucher:', voucherDataForLedger);

      const ledgerResult = await LedgerEntryAPI.createFromPurchaseVoucher(voucherDataForLedger);
      console.log('Ledger entry created successfully:', ledgerResult?.id);

      // Return comprehensive result
      return {
        success: true,
        voucher: voucherResult.voucher,
        ledgerEntry: ledgerResult,
        stockUpdate: stockUpdateResult,
        message: 'Purchase voucher, stock updates, and ledger entry completed',
        warnings: stockUpdateResult?.failedCount > 0 
          ? [`${stockUpdateResult.failedCount} stock updates failed`]
          : []
      };

    } catch (ledgerError) {
      console.error('Ledger entry creation failed:', ledgerError);

      // Purchase voucher and stock updates completed but ledger failed
      console.warn('Purchase voucher created and stock updated but ledger entry failed');

      return {
        success: false,
        voucher: voucherResult.voucher,
        stockUpdate: stockUpdateResult,
        error: 'Purchase voucher created and stock updated but ledger entry failed',
        ledgerError: ledgerError instanceof Error ? ledgerError.message : 'Unknown ledger error',
        requiresManualLedgerEntry: true
      };
    }

  } catch (error) {
    console.error('Purchase voucher creation failed:', error);
    throw new Error(`Failed to create purchase voucher: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
// Enhanced Update method for PurchaseVoucherAPI with smart stock management and ledger entry update
static async update(
  data: PurchaseVoucherInterface, 
  options: {
    updateLedger?: boolean;
    updateStock?: boolean;
  } = {}
) {
  const { updateLedger = true, updateStock = true } = options;
  
  console.log('=== PurchaseVoucherAPI: Updating purchase voucher with smart stock and ledger updates ===');
  console.log('Purchase voucher data:', data);
  console.log('Options:', { updateLedger, updateStock });

  if (!data.id) {
    throw new Error('Purchase voucher ID is required for update operation');
  }

  try {
    // Step 1: Fetch original purchase voucher data
    console.log('=== Step 1: Fetching original purchase voucher data ===');
    const originalVoucherResponse = await this.getById(data.id);
    const originalVoucherData = originalVoucherResponse.data;
    
    if (!originalVoucherData) {
      throw new Error('Original purchase voucher data not found');
    }

    console.log('Original purchase voucher fetched successfully:', {
      id: originalVoucherData.id,
      voucherNumber: originalVoucherData.voucherNumber,
      itemsCount: originalVoucherData.items?.length || 0,
      originalAmount: originalVoucherData.summary?.grandTotal,
      newAmount: data.summary?.grandTotal
    });

    // Step 2: Handle ledger entry update (before stock/voucher updates for consistency)
    let ledgerUpdateResult = null;
    let originalLedgerEntry = null;

    if (updateLedger && data.supplierVendorId && data.summary?.grandTotal) {
      try {
        console.log('=== Step 2: Handling ledger entry update ===');
        
        // Check if purchase voucher has existing ledger entries
        const ledgerCheck = await LedgerEntryAPI.hasLedgerEntries(data.id);
        console.log('Existing ledger entries check:', ledgerCheck);

        if (ledgerCheck.exists && ledgerCheck.count > 0) {
          // Get the primary ledger entry (should be only one for purchase voucher)
          originalLedgerEntry = ledgerCheck.entries[0];
          console.log('Found existing ledger entry:', originalLedgerEntry.id);

          // Check if ledger update is needed
          const needsLedgerUpdate = this.shouldUpdateLedgerEntry(originalVoucherData, data);
          
          if (needsLedgerUpdate.update) {
            console.log('Ledger update required:', needsLedgerUpdate.reasons);
            
            if (needsLedgerUpdate.recreate) {
              // Significant changes require recreating the entry
              console.log('Recreating ledger entry due to significant changes');
              
              // Delete old entry
              await LedgerEntryAPI.deleteByDocumentId(data.id);
              
              // Create new entry
              const newLedgerEntryData = {
                voucherId: data.id,
                supplierId: data.supplierVendorId,
                supplierName: data.supplierVendorName,
                voucherNumber: data.voucherNumber || data.poNumber || data.partyInvoiceNumber || 'N/A',
                voucherDate: typeof data.partyInvoiceDate === 'string' 
                  ? data.partyInvoiceDate 
                  : data.partyInvoiceDate?.toISOString() || new Date().toISOString(),
                grandTotal: data.summary.grandTotal,
                notes: data.notes,
                partyInvoiceNumber: data.partyInvoiceNumber
              };
              
              ledgerUpdateResult = await LedgerEntryAPI.createFromPurchaseVoucher(newLedgerEntryData);
              console.log('New ledger entry created:', ledgerUpdateResult?.id);
              
            } else {
              // Minor changes can be updated in place
              console.log('Updating existing ledger entry in place');
              
              const updatedLedgerData = {
                ...originalLedgerEntry,
                amount: data.summary.grandTotal,
                date: typeof data.partyInvoiceDate === 'string' 
                  ? data.partyInvoiceDate 
                  : data.partyInvoiceDate?.toISOString(),
                description: `Purchase Voucher - ${data.voucherNumber || data.poNumber || data.partyInvoiceNumber}${data.notes ? ' - ' + data.notes : ''}`,
                documentNumber: data.voucherNumber || data.poNumber || data.partyInvoiceNumber || 'N/A'
              };
              
              ledgerUpdateResult = await LedgerEntryAPI.update(originalLedgerEntry.id, updatedLedgerData);
              console.log('Ledger entry updated successfully:', ledgerUpdateResult?.id);
            }
          } else {
            console.log('No ledger update required - values unchanged');
            ledgerUpdateResult = originalLedgerEntry;
          }
          
        } else {
          // No existing ledger entry - create new one
          console.log('No existing ledger entry found - creating new one');
          
          const newLedgerEntryData = {
            voucherId: data.id,
            supplierId: data.supplierVendorId,
            supplierName: data.supplierVendorName,
            voucherNumber: data.voucherNumber || data.poNumber || data.partyInvoiceNumber || 'N/A',
            voucherDate: typeof data.partyInvoiceDate === 'string' 
              ? data.partyInvoiceDate 
              : data.partyInvoiceDate?.toISOString() || new Date().toISOString(),
            grandTotal: data.summary.grandTotal,
            notes: data.notes,
            partyInvoiceNumber: data.partyInvoiceNumber
          };
          
          ledgerUpdateResult = await LedgerEntryAPI.createFromPurchaseVoucher(newLedgerEntryData);
          console.log('New ledger entry created:', ledgerUpdateResult?.id);
        }

      } catch (ledgerError) {
        console.error('Ledger entry update failed:', ledgerError);
        throw new Error(`Ledger update failed: ${ledgerError instanceof Error ? ledgerError.message : 'Unknown ledger error'}`);
      }
    }

    // Step 3: Perform smart stock update (validates and updates only differences)
    let stockUpdateResult: any = null;
    let stockUpdateSucceeded = false;

    if (updateStock) {
      try {
        console.log('=== Step 3: Performing smart stock update ===');
        
        const { 
          smartUpdateDocumentStock, 
          logStockOperationSummary 
        } = await import('@/server/features/items/infrastructure/itemApi/stockManagementHelper');

        stockUpdateResult = await smartUpdateDocumentStock(
          originalVoucherData,
          data,
          'purchase_voucher'
        );

        stockUpdateSucceeded = true;
        
        // Log the stock update summary
        logStockOperationSummary(
          stockUpdateResult, 
          'purchase_voucher_update', 
          data.id
        );

        if (stockUpdateResult.failedCount > 0) {
          // Stock validation/update failed - rollback ledger if updated
          const errorMessage = `Stock update failed: ${stockUpdateResult.failedCount}/${stockUpdateResult.totalItems} items failed`;
          console.error(errorMessage);
          console.error('Stock update errors:', stockUpdateResult.errors);
          
          // Rollback ledger changes if they were made
          if (ledgerUpdateResult && originalLedgerEntry) {
            await this.rollbackLedgerUpdate(originalLedgerEntry, ledgerUpdateResult, data.id);
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
          await this.rollbackLedgerUpdate(originalLedgerEntry, ledgerUpdateResult, data.id);
        }
        
        throw new Error(`Stock validation/update failed: ${stockError instanceof Error ? stockError.message : 'Unknown stock update error'}`);
      }
    }

    // Step 4: Update purchase voucher in database
    console.log('=== Step 4: Updating purchase voucher in database ===');
    let voucherUpdateSucceeded = false;
    let voucherResult: any = null;

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
        throw new Error(`Failed to update purchase voucher: ${response.status} - ${errorText}`);
      }

      voucherResult = await response.json();
      voucherUpdateSucceeded = true;
      
      console.log('✅ Purchase voucher updated successfully in database:', voucherResult.voucher?.id);

    } catch (voucherError) {
      console.error('❌ Purchase voucher database update failed:', voucherError);
      
      // COMPENSATION: Stock and ledger updates succeeded but voucher update failed
      // We need to reverse both changes to maintain data consistency
      if (stockUpdateSucceeded && updateStock && stockUpdateResult?.totalItems > 0) {
        console.log('=== COMPENSATION: Reversing stock changes due to voucher update failure ===');
        await this.rollbackStockUpdate(data, originalVoucherData);
      }

      // Rollback ledger changes if they were made
      if (ledgerUpdateResult && originalLedgerEntry) {
        await this.rollbackLedgerUpdate(originalLedgerEntry, ledgerUpdateResult, data.id);
      }

      throw new Error(`Purchase voucher update failed: ${voucherError instanceof Error ? voucherError.message : 'Unknown error'}`);
    }

    // Step 5: Prepare success response
    console.log('=== Purchase voucher update completed successfully ===');
    
    return {
      success: true,
      voucher: voucherResult.voucher,
      stockUpdate: stockUpdateResult,
      ledgerUpdate: {
        updated: updateLedger,
        entry: ledgerUpdateResult,
        operation: originalLedgerEntry ? 'updated' : 'created'
      },
      message: 'Purchase voucher, stock, and ledger updated successfully',
      summary: {
        voucherUpdated: true,
        stockUpdateRequested: updateStock,
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
    console.error('Purchase voucher update operation failed:', error);
    throw new Error(`Failed to update purchase voucher: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Enhanced delete method with optimized ledger entry handling
static async delete(
  id: string, 
  options: {
    handleLedgerEntry?: boolean;
    reverseStock?: boolean;
    force?: boolean;
  } = {}
) {
  const { handleLedgerEntry = true, reverseStock = true, force = false } = options;
  
  console.log('=== PurchaseVoucherAPI: Deleting purchase voucher with safe stock reversal and ledger cleanup ===');
  console.log('Purchase voucher ID:', id);
  console.log('Options:', { handleLedgerEntry, reverseStock, force });

  if (!id || id.trim() === '') {
    throw new Error('Purchase voucher ID is required for delete operation');
  }

  try {
    // Step 1: Fetch purchase voucher data to be deleted
    console.log('=== Step 1: Fetching purchase voucher data for deletion ===');
    const voucherResult = await this.getById(id);
    const voucherData = voucherResult.data;
    
    if (!voucherData) {
      if (!force) {
        throw new Error('Purchase voucher data not found');
      } else {
        console.warn('⚠️ Force deletion enabled - proceeding without voucher data');
      }
    }

    if (voucherData) {
      console.log('Purchase voucher fetched successfully:', {
        id: voucherData.id,
        voucherNumber: voucherData.voucherNumber,
        itemsCount: voucherData.items?.length || 0,
        amount: voucherData.summary?.grandTotal
      });
    }

    // Step 2: Handle ledger entry cleanup (before other operations for consistency)
    let ledgerCleanupResult: any = null;
    let deletedLedgerEntries: any[] = [];

    if (handleLedgerEntry) {
      try {
        console.log('=== Step 2: Handling ledger entry cleanup ===');
        
        // Check if purchase voucher has ledger entries
        const ledgerCheck = await LedgerEntryAPI.hasLedgerEntries(id);
        console.log('Existing ledger entries check:', ledgerCheck);

        if (ledgerCheck.exists && ledgerCheck.count > 0) {
          console.log(`Found ${ledgerCheck.count} ledger entries to handle`);
          
          // Store entries for potential rollback
          deletedLedgerEntries = [...ledgerCheck.entries];
          
          // Delete all ledger entries for this purchase voucher
          ledgerCleanupResult = await LedgerEntryAPI.deleteByDocumentId(id);
          console.log('✅ Ledger entries deleted successfully:', {
            deletedCount: ledgerCleanupResult.deletedCount || ledgerCheck.count
          });
          
        } else {
          console.log('ℹ️ No ledger entries found to handle');
          ledgerCleanupResult = { deletedCount: 0, message: 'No ledger entries found' };
        }

      } catch (ledgerError) {
        console.error('❌ Ledger cleanup handling failed:', ledgerError);
        
        if (!force) {
          throw new Error(`Ledger cleanup failed: ${ledgerError instanceof Error ? ledgerError.message : 'Unknown ledger error'}`);
        } else {
          console.warn('⚠️ Force deletion enabled - proceeding despite ledger handling failure');
          ledgerCleanupResult = {
            strategy: 'create_reversal',
            action: 'failed',
            originalEntriesCount: deletedLedgerEntries.length,
            reversalEntriesCreated: 0,
            error: ledgerError instanceof Error ? ledgerError.message : 'Unknown error',
            success: false
          };
        }
      }
    }

    // Step 3: Perform safe stock reversal (validates and reverses stock changes)
    let stockReversalResult: any = null;
    let stockReversalSucceeded = false;

    if (reverseStock && voucherData) {
      try {
        console.log('=== Step 3: Performing safe stock reversal ===');
        
        const { 
          safeReverseDocumentStock, 
          logStockOperationSummary 
        } = await import('@/server/features/items/infrastructure/itemApi/stockManagementHelper');

        stockReversalResult = await safeReverseDocumentStock(
          voucherData,
          'purchase_voucher',
          {
            skipValidation: false, // We want validation
            force: force // Use the force flag for stock operations too
          }
        );

        stockReversalSucceeded = true;
        
        // Log the stock reversal summary
        logStockOperationSummary(
          stockReversalResult, 
          'purchase_voucher_delete_reversal', 
          id
        );

        if (stockReversalResult.failedCount > 0) {
          // Stock reversal failed - rollback ledger cleanup
          const errorMessage = `Stock reversal failed: ${stockReversalResult.failedCount}/${stockReversalResult.totalItems} items failed`;
          console.error(errorMessage);
          console.error('Stock reversal errors:', stockReversalResult.errors);
          
          if (!force) {
            // Rollback ledger deletion if it was done
            if (deletedLedgerEntries.length > 0) {
              await this.rollbackLedgerDeletion(deletedLedgerEntries);
            }
            
            throw new Error(`${errorMessage}. Cannot delete purchase voucher safely. Issues: ${stockReversalResult.errors.join(', ')}`);
          } else {
            console.warn('⚠️ Force deletion enabled - proceeding despite stock reversal failures');
          }
        }

        console.log('✅ Safe stock reversal completed successfully:', {
          totalItems: stockReversalResult.totalItems,
          successCount: stockReversalResult.successCount,
          failedCount: stockReversalResult.failedCount
        });

      } catch (stockError) {
        console.error('❌ Stock reversal failed:', stockError);
        
        if (!force) {
          // Rollback ledger deletion if it was done
          if (deletedLedgerEntries.length > 0) {
            await this.rollbackLedgerDeletion(deletedLedgerEntries);
          }
          
          throw new Error(`Stock reversal validation/execution failed: ${stockError instanceof Error ? stockError.message : 'Unknown stock reversal error'}`);
        } else {
          console.warn('⚠️ Force deletion enabled - proceeding despite stock reversal failure');
          stockReversalResult = {
            totalItems: 0,
            successCount: 0,
            failedCount: 0,
            results: [],
            errors: [stockError instanceof Error ? stockError.message : 'Unknown stock reversal error']
          };
        }
      }
    }

    // Step 4: Delete purchase voucher from database
    console.log('=== Step 4: Deleting purchase voucher from database ===');
    let voucherDeleteSucceeded = false;
    let deleteResult: any = null;

    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete purchase voucher from database: ${response.status} - ${errorText}`);
      }
      
      deleteResult = await response.json();
      voucherDeleteSucceeded = true;
      
      console.log('✅ Purchase voucher deleted successfully from database');

    } catch (deleteError) {
      console.error('❌ Purchase voucher database deletion failed:', deleteError);
      
      if (!force) {
        // COMPENSATION: Stock reversal and ledger cleanup succeeded but voucher deletion failed
        // We need to restore both to maintain consistency
        if (stockReversalSucceeded && stockReversalResult?.totalItems > 0) {
          console.log('=== COMPENSATION: Re-applying stock changes due to voucher deletion failure ===');
          await this.rollbackStockReversal(voucherData);
        }

        // Rollback ledger deletion if it was done
        if (deletedLedgerEntries.length > 0) {
          await this.rollbackLedgerDeletion(deletedLedgerEntries);
        }

        throw new Error(`Purchase voucher deletion failed: ${deleteError instanceof Error ? deleteError.message : 'Unknown error'}`);
      } else {
        console.warn('⚠️ Force deletion enabled - continuing despite database deletion failure');
      }
    }

    // Step 5: Prepare success response
    console.log('=== Purchase voucher deletion completed successfully ===');
    
    const warnings = [];
    if (stockReversalResult && (stockReversalResult.failedCount || 0) > 0) {
      warnings.push(`${stockReversalResult.failedCount} stock reversals failed`);
    }
    if (ledgerCleanupResult && ledgerCleanupResult.deletedCount === 0 && deletedLedgerEntries.length > 0) {
      warnings.push('Ledger entries cleanup failed');
    }
    if (!voucherDeleteSucceeded && force) {
      warnings.push('Database deletion failed but force mode was used');
    }

    return {
      success: true,
      deletedVoucherId: id,
      stockReversal: stockReversalResult,
      ledgerCleanup: ledgerCleanupResult,
      message: 'Purchase voucher deleted successfully with proper cleanup',
      summary: {
        voucherDeleted: voucherDeleteSucceeded,
        stockReversalRequested: reverseStock,
        stockItemsProcessed: stockReversalResult?.totalItems || 0,
        stockItemsReversed: stockReversalResult?.successCount || 0,
        stockHadChanges: stockReversalResult ? (stockReversalResult.totalItems || 0) > 0 : false,
        ledgerHandlingRequested: handleLedgerEntry,
        ledgerEntriesFound: deletedLedgerEntries.length,
        ledgerEntriesDeleted: ledgerCleanupResult?.deletedCount || 0,
        ledgerHandlingSuccessful: (ledgerCleanupResult?.deletedCount || 0) === deletedLedgerEntries.length,
        forceUsed: force,
        operationType: 'safe_delete_with_ledger_cleanup'
      },
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error) {
    console.error('Purchase voucher deletion operation failed:', error);
    throw new Error(`Failed to delete purchase voucher: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper method to determine if ledger entry needs updating
private static shouldUpdateLedgerEntry(original: PurchaseVoucherInterface, updated: PurchaseVoucherInterface) {
  const reasons: string[] = [];
  let needsUpdate = false;
  let needsRecreate = false;

  // Check amount change
  if (original.summary?.grandTotal !== updated.summary?.grandTotal) {
    reasons.push('Amount changed');
    needsUpdate = true;
  }

  // Check supplier change (requires recreation)
  if (original.supplierVendorId !== updated.supplierVendorId) {
    reasons.push('Supplier changed');
    needsUpdate = true;
    needsRecreate = true;
  }

  // Check date change
  const originalDate = typeof original.partyInvoiceDate === 'string' 
    ? original.partyInvoiceDate 
    : original.partyInvoiceDate?.toISOString();
  const updatedDate = typeof updated.partyInvoiceDate === 'string' 
    ? updated.partyInvoiceDate 
    : updated.partyInvoiceDate?.toISOString();
  
  if (originalDate !== updatedDate) {
    reasons.push('Date changed');
    needsUpdate = true;
  }

  // Check voucher number change
  const originalVoucherNumber = original.voucherNumber || original.poNumber || original.partyInvoiceNumber;
  const updatedVoucherNumber = updated.voucherNumber || updated.poNumber || updated.partyInvoiceNumber;
  
  if (originalVoucherNumber !== updatedVoucherNumber) {
    reasons.push('Voucher number changed');
    needsUpdate = true;
  }

  return {
    update: needsUpdate,
    recreate: needsRecreate,
    reasons
  };
}

// Helper method to rollback ledger updates
private static async rollbackLedgerUpdate(originalEntry: any, newEntry: any, documentId: string): Promise<void> {
  console.log('=== ROLLBACK: Reversing ledger changes ===');
  try {
    if (newEntry && newEntry.id !== originalEntry?.id) {
      // New entry was created - delete it
      if (newEntry.id) {
        await LedgerEntryAPI.delete(newEntry.id);
        console.log('✅ New ledger entry deleted');
      }
      
      // Restore original entry if it existed
      if (originalEntry) {
        const { id, ...entryData } = originalEntry;
        await LedgerEntryAPI.create(entryData);
        console.log('✅ Original ledger entry restored');
      }
    } else if (newEntry && newEntry.id === originalEntry?.id) {
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

// Helper method to rollback ledger reversal entries
private static async rollbackLedgerReversalEntries(reversalEntries: any[]): Promise<void> {
  console.log('=== ROLLBACK: Deleting created reversal entries ===');
  try {
    for (const reversalInfo of reversalEntries) {
      if (reversalInfo.reversalEntry?.id) {
        await LedgerEntryAPI.delete(reversalInfo.reversalEntry.id);
        console.log('✅ Reversal entry deleted:', reversalInfo.reversalEntry.id);
      }
    }
  } catch (rollbackError) {
    console.error('❌ CRITICAL: Reversal entries rollback failed:', rollbackError);
    throw new Error('Reversal entries rollback failed - manual intervention required');
  }
}

// Helper method to rollback stock updates
private static async rollbackStockUpdate(currentData: PurchaseVoucherInterface, originalData: PurchaseVoucherInterface): Promise<void> {
  try {
    const { smartUpdateDocumentStock } = await import('@/server/features/items/infrastructure/itemApi/stockManagementHelper');
    await smartUpdateDocumentStock(currentData, originalData, 'purchase_voucher');
    console.log('✅ Stock update rollback completed');
  } catch (rollbackError) {
    console.error('❌ CRITICAL: Stock rollback failed:', rollbackError);
    throw new Error('Stock rollback failed - manual intervention required');
  }
}

// Helper method to rollback stock reversal
private static async rollbackStockReversal(voucherData: PurchaseVoucherInterface): Promise<void> {
  try {
    const { processDocumentStock } = await import('@/server/features/items/infrastructure/itemApi/stockManagementHelper');
    await processDocumentStock(voucherData, 'purchase_voucher');
    console.log('✅ Stock reversal rollback completed');
  } catch (rollbackError) {
    console.error('❌ CRITICAL: Stock reversal rollback failed:', rollbackError);
    throw new Error('Stock reversal rollback failed - manual intervention required');
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

// Convenience method for stock-only updates
static async updateWithoutStock(data: PurchaseVoucherInterface, updateLedger: boolean = false) {
  return this.update(data, { updateStock: false, updateLedger });
}

// Convenience method for metadata-only updates (no stock, no ledger)
static async updateMetadataOnly(data: PurchaseVoucherInterface) {
  return this.update(data, { updateStock: false, updateLedger: false });
}

// Convenience method for safe deletion (with all protections)
static async safeDelete(id: string) {
  return this.delete(id, {
    handleLedgerEntry: true,
    reverseStock: true,
    force: false
  });
}

// Convenience method for force deletion (when you need to delete despite errors)
static async forceDelete(id: string, reverseStock: boolean = true) {
  return this.delete(id, {
    handleLedgerEntry: true, // Still try to handle ledger, but with force
    reverseStock,
    force: true
  });
}

// Convenience method for document-only deletion (no stock or ledger changes)
static async deleteDocumentOnly(id: string) {
  return this.delete(id, {
    handleLedgerEntry: false,
    reverseStock: false,
    force: false
  });
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
    }}