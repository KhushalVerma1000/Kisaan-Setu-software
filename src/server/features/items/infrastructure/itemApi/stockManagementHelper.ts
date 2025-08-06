// stockManagementHelper.ts (Updated for client-side use)

// Generic interfaces for stock operations
export interface StockUpdateItem {
  id: string;
  quantity: number;
  item: {
    id: string;
    type: 'product' | 'service';
    name: string;
  };
}

export interface StockOperationResult {
  success: boolean;
  itemId: string;
  itemName: string;
  previousStock?: number;
  newStock?: number;
  error?: string;
}

export interface BulkStockOperationResult {
  totalItems: number;
  successCount: number;
  failedCount: number;
  results: StockOperationResult[];
  errors: string[];
}

// Stock operation types
export type StockOperationType = 'purchase' | 'sale' | 'adjustment';

const API_BASE_URL = '/api/items/stock';

/**
 * Updates stock for a single item based on operation type (via API route)
 * @param itemId - The item ID to update
 * @param quantity - The quantity to add/subtract
 * @param operationType - Type of operation (purchase adds stock, sale subtracts stock)
 * @param itemName - Item name for logging purposes
 * @returns Promise<StockOperationResult>
 */
export async function updateItemStock(
  itemId: string,
  quantity: number,
  operationType: StockOperationType,
  itemName: string = 'Unknown Item'
): Promise<StockOperationResult> {
  try {
    console.log(`Updating stock for item ${itemName} (${itemId}): ${operationType} - ${quantity}`);

    // Determine the operation based on type
    const operation = operationType === 'purchase' ? 'add' : 'subtract';
    
    const response = await fetch(`${API_BASE_URL}/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'single',
        itemId,
        quantity,
        operation,
        itemName
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update stock');
    }

    const result = await response.json();
    console.log(`Stock updated successfully for ${itemName}: ${result.newStock}`);

    return result;

  } catch (error) {
    console.error(`Error updating stock for item ${itemName} (${itemId}):`, error);
    return {
      success: false,
      itemId,
      itemName,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Updates stock for multiple items in bulk (via API route)
 * @param items - Array of items with quantities
 * @param operationType - Type of operation
 * @returns Promise<BulkStockOperationResult>
 */
export async function updateBulkItemStock(
  items: StockUpdateItem[],
  operationType: StockOperationType
): Promise<BulkStockOperationResult> {
  try {
    console.log(`Starting bulk stock update for ${items.length} items - Operation: ${operationType}`);

    const response = await fetch(`${API_BASE_URL}/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'bulk',
        items,
        operationType
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to perform bulk stock update');
    }

    const result = await response.json();
    
    console.log(`Bulk stock update completed:`, {
      total: result.totalItems,
      success: result.successCount,
      failed: result.failedCount
    });

    return result;

  } catch (error) {
    console.error('Bulk stock update failed:', error);
    
    // Return error structure matching BulkStockOperationResult
    return {
      totalItems: 0,
      successCount: 0,
      failedCount: items.length,
      results: items.map(item => ({
        success: false,
        itemId: item.item.id,
        itemName: item.item.name,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })),
      errors: [error instanceof Error ? error.message : 'Unknown error occurred']
    };
  }
}

/**
 * Helper function to process purchase voucher items for stock update
 * @param purchaseVoucherData - Purchase voucher data
 * @returns Promise<BulkStockOperationResult>
 */
export async function processPurchaseVoucherStock(
  purchaseVoucherData: any
): Promise<BulkStockOperationResult> {
  console.log('Processing stock updates for purchase voucher');

  if (!purchaseVoucherData.items || !Array.isArray(purchaseVoucherData.items)) {
    throw new Error('Invalid purchase voucher data - items array is required');
  }

  // Transform purchase voucher items to stock update format
  const stockItems: StockUpdateItem[] = purchaseVoucherData.items.map((item: any) => ({
    id: item.id,
    quantity: item.quantity,
    item: {
      id: item.item.id,
      type: item.item.type,
      name: item.item.name
    }
  }));

  return await updateBulkItemStock(stockItems, 'purchase');
}

/**
 * Helper function to process invoice items for stock update
 * @param invoiceData - Invoice data
 * @returns Promise<BulkStockOperationResult>
 */
export async function processInvoiceStock(
  invoiceData: any
): Promise<BulkStockOperationResult> {
  console.log('Processing stock updates for invoice (sale)');

  if (!invoiceData.items || !Array.isArray(invoiceData.items)) {
    throw new Error('Invalid invoice data - items array is required');
  }

  // Transform invoice items to stock update format
  const stockItems: StockUpdateItem[] = invoiceData.items.map((item: any) => ({
    id: item.id,
    quantity: item.quantity,
    item: {
      id: item.item.id,
      type: item.item.type,
      name: item.item.name
    }
  }));

  return await updateBulkItemStock(stockItems, 'sale');
}

/**
 * Generic function to process any document type for stock updates
 * @param documentData - Document data (purchase voucher or invoice)
 * @param documentType - Type of document
 * @returns Promise<BulkStockOperationResult>
 */
export async function processDocumentStock(
  documentData: any,
  documentType: 'purchase_voucher' | 'invoice' | 'quotation'
): Promise<BulkStockOperationResult> {
  console.log(`Processing stock updates for document type: ${documentType}`);

  switch (documentType) {
    case 'purchase_voucher':
      return await processPurchaseVoucherStock(documentData);
    
    case 'invoice':
      return await processInvoiceStock(documentData);
    
    case 'quotation':
      // Quotations don't affect stock
      console.log('Quotations do not affect stock - skipping stock update');
      return {
        totalItems: 0,
        successCount: 0,
        failedCount: 0,
        results: [],
        errors: []
      };
    
    default:
      throw new Error(`Unsupported document type: ${documentType}`);
  }
}

/**
 * Helper function to log stock operation summary
 * @param result - The bulk stock operation result
 * @param documentType - Type of document processed
 * @param documentId - ID of the document (for logging)
 */
export function logStockOperationSummary(
  result: BulkStockOperationResult,
  documentType: string,
  documentId?: string
): void {
  const logPrefix = documentId ? `[${documentType.toUpperCase()} ${documentId}]` : `[${documentType.toUpperCase()}]`;
  
  console.log(`${logPrefix} Stock Update Summary:`, {
    totalItems: result.totalItems,
    successful: result.successCount,
    failed: result.failedCount,
    errors: result.errors
  });

  if (result.failedCount > 0) {
    console.warn(`${logPrefix} Stock update failures:`, result.errors);
  }

  // Log successful updates
  result.results
    .filter(r => r.success)
    .forEach(r => {
      console.log(`${logPrefix} ✅ ${r.itemName}: Stock updated to ${r.newStock}`);
    });

  // Log failed updates
  result.results
    .filter(r => !r.success)
    .forEach(r => {
      console.error(`${logPrefix} ❌ ${r.itemName}: ${r.error}`);
    });
}

/**
 * Check stock availability for items (via API route)
 * @param itemIds - Array of item IDs to check
 * @returns Promise with current stock levels
 */
export async function checkStockAvailability(itemIds: string[]): Promise<{
  [itemId: string]: {
    currentStock: number;
    available: boolean;
    itemName?: string;
  }
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ itemIds }),
    });

    if (!response.ok) {
      throw new Error('Failed to check stock availability');
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking stock availability:', error);
    throw error;
  }
}

/**
 * Get low stock items (via API route)
 * @param threshold - Minimum stock level threshold
 * @param fpoId - FPO ID to filter items
 * @returns Promise with low stock items
 */
export async function getLowStockItems(threshold: number = 10, fpoId?: string): Promise<any[]> {
  try {
    const params = new URLSearchParams();
    params.append('threshold', threshold.toString());
    if (fpoId) params.append('fpoId', fpoId);

    const response = await fetch(`${API_BASE_URL}/low-stock?${params.toString()}`);

    if (!response.ok) {
      throw new Error('Failed to get low stock items');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting low stock items:', error);
    throw error;
  }
}
// stockManagementHelper.ts - Additional functions for update operations

/**
 * Reverses stock changes for a document (used before applying new changes in updates)
 * @param documentData - Original document data
 * @param documentType - Type of document
 * @returns Promise<BulkStockOperationResult>
 */
export async function reverseDocumentStock(
  documentData: any,
  documentType: 'purchase_voucher' | 'invoice' | 'quotation'
): Promise<BulkStockOperationResult> {
  console.log(`Reversing stock updates for document type: ${documentType}`);

  switch (documentType) {
    case 'purchase_voucher':
      // Reverse purchase by treating it as a sale (subtract the stock that was added)
      return await processInvoiceStock(documentData); // This will subtract stock
    
    case 'invoice':
      // Reverse sale by treating it as a purchase (add back the stock that was subtracted)
      return await processPurchaseVoucherStock(documentData); // This will add stock back
    
    case 'quotation':
      // Quotations don't affect stock, so no reversal needed
      console.log('Quotations do not affect stock - skipping stock reversal');
      return {
        totalItems: 0,
        successCount: 0,
        failedCount: 0,
        results: [],
        errors: []
      };
    
    default:
      throw new Error(`Unsupported document type for reversal: ${documentType}`);
  }
}

/**
 * Updates stock by first reversing old changes and then applying new changes
 * @param oldDocumentData - Original document data before update
 * @param newDocumentData - New document data after update
 * @param documentType - Type of document
 * @returns Promise<{reversal: BulkStockOperationResult, update: BulkStockOperationResult}>
 */
export async function updateDocumentStock(
  oldDocumentData: any,
  newDocumentData: any,
  documentType: 'purchase_voucher' | 'invoice' | 'quotation'
): Promise<{
  reversal: BulkStockOperationResult;
  update: BulkStockOperationResult;
  summary: {
    totalReversed: number;
    totalUpdated: number;
    reversalSuccess: number;
    updateSuccess: number;
    reversalFailed: number;
    updateFailed: number;
    overallSuccess: boolean;
  };
}> {
  console.log(`Updating stock for document type: ${documentType}`);

  try {
    // Step 1: Reverse the old stock changes
    console.log('Step 1: Reversing old stock changes...');
    const reversalResult = await reverseDocumentStock(oldDocumentData, documentType);
    
    logStockOperationSummary(
      reversalResult, 
      `${documentType}_reversal`, 
      oldDocumentData.id
    );

    // Step 2: Apply the new stock changes
    console.log('Step 2: Applying new stock changes...');
    const updateResult = await processDocumentStock(newDocumentData, documentType);
    
    logStockOperationSummary(
      updateResult, 
      `${documentType}_update`, 
      newDocumentData.id
    );

    // Calculate summary
    const summary = {
      totalReversed: reversalResult.totalItems,
      totalUpdated: updateResult.totalItems,
      reversalSuccess: reversalResult.successCount,
      updateSuccess: updateResult.successCount,
      reversalFailed: reversalResult.failedCount,
      updateFailed: updateResult.failedCount,
      overallSuccess: (reversalResult.failedCount === 0 && updateResult.failedCount === 0)
    };

    console.log('Stock update operation completed:', summary);

    return {
      reversal: reversalResult,
      update: updateResult,
      summary
    };

  } catch (error) {
    console.error('Stock update operation failed:', error);
    throw new Error(`Failed to update document stock: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Smart stock update that only processes changed items
 * @param oldDocumentData - Original document data
 * @param newDocumentData - New document data
 * @param documentType - Type of document
 * @returns Promise<BulkStockOperationResult>
 */
export async function smartUpdateDocumentStock(
  oldDocumentData: any,
  newDocumentData: any,
  documentType: 'purchase_voucher' | 'invoice' | 'quotation'
): Promise<BulkStockOperationResult> {
  console.log(`Smart stock update for document type: ${documentType}`);

  if (documentType === 'quotation') {
    console.log('Quotations do not affect stock - skipping smart stock update');
    return {
      totalItems: 0,
      successCount: 0,
      failedCount: 0,
      results: [],
      errors: []
    };
  }

  try {
    // Create maps for easy comparison
    const oldItemsMap = new Map();
    const newItemsMap = new Map();

    // Map old items
    if (oldDocumentData.items && Array.isArray(oldDocumentData.items)) {
      oldDocumentData.items.forEach((item: any) => {
        oldItemsMap.set(item.item.id, item.quantity);
      });
    }

    // Map new items
    if (newDocumentData.items && Array.isArray(newDocumentData.items)) {
      newDocumentData.items.forEach((item: any) => {
        newItemsMap.set(item.item.id, item.quantity);
      });
    }

    const stockAdjustments: StockUpdateItem[] = [];

    // Process all items (old and new)
    const allItemIds = new Set([...oldItemsMap.keys(), ...newItemsMap.keys()]);

    for (const itemId of allItemIds) {
      const oldQuantity = oldItemsMap.get(itemId) || 0;
      const newQuantity = newItemsMap.get(itemId) || 0;
      const quantityDifference = newQuantity - oldQuantity;

      if (quantityDifference !== 0) {
        // Find item details from new data (or old data if item was removed)
        let itemDetails = newDocumentData.items?.find((item: any) => item.item.id === itemId)?.item;
        if (!itemDetails) {
          itemDetails = oldDocumentData.items?.find((item: any) => item.item.id === itemId)?.item;
        }

        if (itemDetails && itemDetails.type === 'product') {
          stockAdjustments.push({
            id: `adj_${itemId}_${Date.now()}`,
            quantity: Math.abs(quantityDifference),
            item: itemDetails
          });
        }
      }
    }

    if (stockAdjustments.length === 0) {
      console.log('No stock adjustments needed - quantities unchanged');
      return {
        totalItems: 0,
        successCount: 0,
        failedCount: 0,
        results: [],
        errors: []
      };
    }

    // Apply adjustments based on document type and quantity changes
    const operationType = documentType === 'purchase_voucher' ? 'purchase' : 'sale';
    return await updateBulkItemStock(stockAdjustments, operationType);

  } catch (error) {
    console.error('Smart stock update failed:', error);
    throw new Error(`Smart stock update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validates stock availability before processing a document update
 * @param documentData - Document data to validate
 * @param documentType - Type of document
 * @returns Promise<{valid: boolean, issues: string[], stockCheck: any}>
 */
export async function validateStockForUpdate(
  documentData: any,
  documentType: 'purchase_voucher' | 'invoice' | 'quotation'
): Promise<{
  valid: boolean;
  issues: string[];
  stockCheck: any;
}> {
  console.log(`Validating stock for ${documentType} update`);

  if (documentType === 'quotation' || documentType === 'purchase_voucher') {
    // Quotations and purchases don't need stock validation (they don't reduce stock)
    return {
      valid: true,
      issues: [],
      stockCheck: {}
    };
  }

  try {
    if (!documentData.items || !Array.isArray(documentData.items)) {
      return {
        valid: false,
        issues: ['No items found in document'],
        stockCheck: {}
      };
    }

    const productItemIds = documentData.items
      .filter((item: any) => item.item.type === 'product')
      .map((item: any) => item.item.id);

    if (productItemIds.length === 0) {
      return {
        valid: true,
        issues: [],
        stockCheck: {}
      };
    }

    const stockCheck = await checkStockAvailability(productItemIds);
    const issues: string[] = [];

    // Check each item's stock availability
    documentData.items.forEach((item: any) => {
      if (item.item.type === 'product') {
        const stock = stockCheck[item.item.id];
        if (!stock || stock.currentStock < item.quantity) {
          issues.push(
            `Insufficient stock for ${item.item.name}: Required ${item.quantity}, Available ${stock?.currentStock || 0}`
          );
        }
      }
    });

    return {
      valid: issues.length === 0,
      issues,
      stockCheck
    };

  } catch (error) {
    console.error('Stock validation failed:', error);
    return {
      valid: false,
      issues: [`Stock validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      stockCheck: {}
    };
  }
}