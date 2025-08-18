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
  const logId = `[BULK-STOCK-${Date.now()}]`;
  console.log(`${logId} ==> Starting bulk stock update for ${items.length} items - Operation: ${operationType}`);

  // Log all items being processed
  items.forEach((item, index) => {
    console.log(`${logId} Item ${index + 1}:`, {
      id: item.id,
      itemId: item.item.id,
      itemName: item.item.name,
      itemType: item.item.type,
      quantity: item.quantity
    });
  });

  try {
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

    console.log(`${logId} API Response status:`, response.status);
    console.log(`${logId} API Response ok:`, response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${logId} API Error response:`, errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        console.error(`${logId} Parsed error data:`, errorData);
        throw new Error(errorData.error || 'Failed to perform bulk stock update');
      } catch (parseError) {
        console.error(`${logId} Failed to parse error response:`, parseError);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
    }

    const result = await response.json();
    console.log(`${logId} API Success response:`, result);
    
    // Extract the actual data from the API response wrapper
    const actualData = result.data || result;
    console.log(`${logId} Extracted data:`, actualData);
    
    console.log(`${logId} Bulk stock update completed:`, {
      total: actualData.totalItems,
      success: actualData.successCount,
      failed: actualData.failedCount,
      hasResults: !!actualData.results,
      resultsLength: actualData.results?.length || 0,
      hasErrors: !!actualData.errors,
      errorsLength: actualData.errors?.length || 0
    });

    // Validate result structure
    if (typeof actualData !== 'object' || actualData === null) {
      console.error(`${logId} Invalid result structure - not an object:`, typeof actualData);
      throw new Error('Invalid API response structure');
    }

    // Ensure required properties exist
    const validatedResult = {
      totalItems: actualData.totalItems || 0,
      successCount: actualData.successCount || 0,
      failedCount: actualData.failedCount || 0,
      results: Array.isArray(actualData.results) ? actualData.results : [],
      errors: Array.isArray(actualData.errors) ? actualData.errors : []
    };

    console.log(`${logId} Validated result:`, validatedResult);
    return validatedResult;

  } catch (error) {
    console.error(`${logId} Bulk stock update failed:`, error);
    console.error(`${logId} Error type:`, typeof error);
    console.error(`${logId} Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    
    // Return error structure matching BulkStockOperationResult
    const errorResult = {
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

    console.log(`${logId} Returning error result:`, errorResult);
    return errorResult;
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
 * Helper function to log stock operation summary (FIXED VERSION)
 * @param result - The bulk stock operation result
 * @param documentType - Type of document processed
 * @param documentId - ID of the document (for logging)
 */

/**
 * Enhanced logging function with safety checks
 */
export function logStockOperationSummary(
  result: BulkStockOperationResult,
  documentType: string,
  documentId?: string
): void {
  const logPrefix = documentId ? `[${documentType.toUpperCase()} ${documentId}]` : `[${documentType.toUpperCase()}]`;
  const logId = `[LOG-${Date.now()}]`;
  
  console.log(`${logId} ==> Stock Operation Summary for ${logPrefix}`);
  console.log(`${logId} Input result:`, result);
  console.log(`${logId} Result type:`, typeof result);
  
  // Validate result structure
  if (!result || typeof result !== 'object') {
    console.error(`${logId} Invalid result structure:`, result);
    return;
  }
  
  console.log(`${logPrefix} Stock Update Summary:`, {
    totalItems: result.totalItems,
    successful: result.successCount,
    failed: result.failedCount,
    errors: result.errors || [],
    hasResults: !!result.results,
    resultsCount: result.results?.length || 0
  });

  if (result.failedCount > 0) {
    console.warn(`${logPrefix} Stock update failures:`, result.errors || []);
  }

  // Safety check: ensure results array exists before filtering
  const results = result.results || [];
  console.log(`${logId} Processing ${results.length} result items`);
  
  if (!Array.isArray(results)) {
    console.error(`${logId} Results is not an array:`, typeof results, results);
    return;
  }

  // Log successful updates
  const successfulResults = results.filter(r => r && r.success);
  console.log(`${logId} Found ${successfulResults.length} successful results`);
  
  successfulResults.forEach((r, index) => {
    console.log(`${logPrefix} ✅ Success ${index + 1}: ${r.itemName}: Stock updated to ${r.newStock || 'N/A'}`);
  });

  // Log failed updates
  const failedResults = results.filter(r => r && !r.success);
  console.log(`${logId} Found ${failedResults.length} failed results`);
  
  failedResults.forEach((r, index) => {
    console.error(`${logPrefix} ❌ Failure ${index + 1}: ${r.itemName}: ${r.error || 'Unknown error'}`);
  });

  console.log(`${logId} <== Summary logging completed for ${logPrefix}`);
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
  const logId = `[REVERSE-STOCK-${Date.now()}]`;
  console.log(`${logId} ==> Starting stock reversal for document type: ${documentType}`);

  // Early return for quotations (they don't affect stock)
  if (documentType === 'quotation') {
    console.log(`${logId} Quotations do not affect stock - returning empty result`);
    return {
      totalItems: 0,
      successCount: 0,
      failedCount: 0,
      results: [],
      errors: []
    };
  }

  // Validate input data
  if (!documentData) {
    console.error(`${logId} Document data is null/undefined`);
    throw new Error('Document data is required for stock reversal');
  }

  if (!documentData.items || !Array.isArray(documentData.items)) {
    console.log(`${logId} No items found in document - returning empty result`);
    return {
      totalItems: 0,
      successCount: 0,
      failedCount: 0,
      results: [],
      errors: []
    };
  }

  console.log(`${logId} Document validation passed:`, {
    documentId: documentData.id || 'unknown',
    itemsCount: documentData.items.length,
    documentType
  });

  try {
    // Debug the document structure
    debugDocumentStructure(documentData, 'REVERSAL_INPUT');

    switch (documentType) {
      case 'purchase_voucher':
        // Reverse purchase by treating it as a sale (subtract the stock that was added)
        console.log(`${logId} Reversing purchase voucher - will subtract stock`);
        return await processInvoiceStock(documentData); // This will subtract stock

      case 'invoice':
        // Reverse sale by treating it as a purchase (add back the stock that was subtracted)
        console.log(`${logId} Reversing invoice - will add stock back`);
        return await processPurchaseVoucherStock(documentData); // This will add stock back

      default:
        const errorMsg = `Unsupported document type for reversal: ${documentType}`;
        console.error(`${logId} ${errorMsg}`);
        throw new Error(errorMsg);
    }

  } catch (error) {
    console.error(`${logId} Stock reversal failed:`, error);
    console.error(`${logId} Error details:`, {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });

    // Return error structure matching BulkStockOperationResult
    const errorResult = {
      totalItems: 0,
      successCount: 0,
      failedCount: documentData.items?.length || 0,
      results: (documentData.items || []).map((item: any) => ({
        success: false,
        itemId: item.item?.id || 'unknown',
        itemName: item.item?.name || 'Unknown Item',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })),
      errors: [error instanceof Error ? error.message : 'Unknown error occurred']
    };

    console.log(`${logId} Returning error result:`, errorResult);
    throw error; // Re-throw to maintain error handling chain
  }
}

/**
 * Validates if stock reversal is safe to perform
 * @param documentData - Document data to reverse
 * @param documentType - Type of document
 * @returns Promise<{safe: boolean, issues: string[], stockCheck: any}>
 */
export async function validateStockReversal(
  documentData: any,
  documentType: 'purchase_voucher' | 'invoice' | 'quotation'
): Promise<{
  safe: boolean;
  issues: string[];
  stockCheck: any;
}> {
  const logId = `[VALIDATE-REVERSAL-${Date.now()}]`;
  console.log(`${logId} ==> Validating stock reversal for ${documentType}`);

  if (documentType === 'quotation') {
    return {
      safe: true,
      issues: [],
      stockCheck: {}
    };
  }

if (documentType === 'purchase_voucher') {
  // For purchase vouchers, we're subtracting stock - need to check availability
  const validationResult = await validateStockForUpdate(documentData, 'invoice');
  return {
    safe: validationResult.valid, // Convert 'valid' to 'safe'
    issues: validationResult.issues,
    stockCheck: validationResult.stockCheck
  };
}

  if (documentType === 'invoice') {
    // For invoices, we're adding stock back - always safe
    return {
      safe: true,
      issues: [],
      stockCheck: {}
    };
  }

  return {
    safe: false,
    issues: [`Unsupported document type for reversal validation: ${documentType}`],
    stockCheck: {}
  };
}

/**
 * Safe stock reversal with validation
 * @param documentData - Document data to reverse
 * @param documentType - Type of document
 * @param options - Reversal options
 * @returns Promise<BulkStockOperationResult & {validation: any}>
 */
export async function safeReverseDocumentStock(
  documentData: any,
  documentType: 'purchase_voucher' | 'invoice' | 'quotation',
  options: {
    skipValidation?: boolean;
    force?: boolean;
  } = {}
): Promise<BulkStockOperationResult & {validation?: any}> {
  const { skipValidation = false, force = false } = options;
  const logId = `[SAFE-REVERSE-${Date.now()}]`;
  
  console.log(`${logId} ==> Safe stock reversal starting`, {
    documentType,
    skipValidation,
    force,
    documentId: documentData?.id || 'unknown'
  });

  let validation = null;

  // Step 1: Validate reversal safety (unless skipped)
  if (!skipValidation && !force) {
    console.log(`${logId} Step 1: Validating reversal safety`);
    validation = await validateStockReversal(documentData, documentType);
    
    if (!validation.safe) {
      console.error(`${logId} Reversal validation failed:`, validation.issues);
      
      const errorResult = {
        totalItems: 0,
        successCount: 0,
        failedCount: 0,
        results: [],
        errors: validation.issues,
        validation
      };
      
      throw new Error(`Stock reversal validation failed: ${validation.issues.join(', ')}`);
    }
    
    console.log(`${logId} ✅ Reversal validation passed`);
  } else {
    console.log(`${logId} Skipping validation (skipValidation: ${skipValidation}, force: ${force})`);
  }

  // Step 2: Perform the reversal
  console.log(`${logId} Step 2: Performing stock reversal`);
  const result = await reverseDocumentStock(documentData, documentType);
  
  console.log(`${logId} Stock reversal completed:`, {
    totalItems: result.totalItems,
    successCount: result.successCount,
    failedCount: result.failedCount
  });

  return {
    ...result,
    validation
  };
}

/**
 * Batch stock reversal for multiple documents
 * @param documents - Array of documents to reverse
 * @param options - Batch options
 * @returns Promise with batch results
 */
export async function batchReverseDocumentStock(
  documents: Array<{
    data: any;
    type: 'purchase_voucher' | 'invoice' | 'quotation';
    id?: string;
  }>,
  options: {
    continueOnError?: boolean;
    skipValidation?: boolean;
  } = {}
): Promise<{
  totalDocuments: number;
  successCount: number;
  failedCount: number;
  results: Array<{
    documentId: string;
    success: boolean;
    result?: BulkStockOperationResult;
    error?: string;
  }>;
  summary: BulkStockOperationResult;
}> {
  const { continueOnError = false, skipValidation = false } = options;
  const logId = `[BATCH-REVERSE-${Date.now()}]`;
  
  console.log(`${logId} ==> Starting batch stock reversal for ${documents.length} documents`);

  const results: Array<{
    documentId: string;
    success: boolean;
    result?: BulkStockOperationResult;
    error?: string;
  }> = [];

  let totalSuccessItems = 0;
  let totalFailedItems = 0;
  let totalItems = 0;
  const allErrors: string[] = [];
  const allResults: any[] = [];

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const docId = doc.id || doc.data?.id || `doc_${i}`;
    
    console.log(`${logId} Processing document ${i + 1}/${documents.length}: ${docId}`);

    try {
      const result = await safeReverseDocumentStock(doc.data, doc.type, { skipValidation });
      
      results.push({
        documentId: docId,
        success: true,
        result
      });

      totalItems += result.totalItems;
      totalSuccessItems += result.successCount;
      totalFailedItems += result.failedCount;
      allResults.push(...(result.results || []));
      allErrors.push(...(result.errors || []));

      console.log(`${logId} ✅ Document ${docId} reversed successfully`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      results.push({
        documentId: docId,
        success: false,
        error: errorMessage
      });

      allErrors.push(`Document ${docId}: ${errorMessage}`);
      
      console.error(`${logId} ❌ Document ${docId} reversal failed:`, errorMessage);

      if (!continueOnError) {
        console.error(`${logId} Stopping batch processing due to error`);
        break;
      }
    }
  }

  const summary = {
    totalItems,
    successCount: totalSuccessItems,
    failedCount: totalFailedItems,
    results: allResults,
    errors: allErrors
  };

  console.log(`${logId} Batch reversal completed:`, {
    totalDocuments: documents.length,
    processedDocuments: results.length,
    successfulDocuments: results.filter(r => r.success).length,
    failedDocuments: results.filter(r => !r.success).length,
    summary
  });

  return {
    totalDocuments: documents.length,
    successCount: results.filter(r => r.success).length,
    failedCount: results.filter(r => !r.success).length,
    results,
    summary
  };
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
  const logId = `[SMART-STOCK-${Date.now()}]`;
  console.log(`${logId} ==> Starting smart stock update for document type: ${documentType}`);

  if (documentType === 'quotation') {
    console.log(`${logId} Quotations do not affect stock - returning empty result`);
    return {
      totalItems: 0,
      successCount: 0,
      failedCount: 0,
      results: [],
      errors: []
    };
  }

  try {
    // Step 1: Validate input data
    console.log(`${logId} Step 1: Validating input data`);
    console.log(`${logId} Old document data:`, {
      hasItems: !!oldDocumentData?.items,
      itemsCount: oldDocumentData?.items?.length || 0,
      documentId: oldDocumentData?.id || 'unknown'
    });
    console.log(`${logId} New document data:`, {
      hasItems: !!newDocumentData?.items,
      itemsCount: newDocumentData?.items?.length || 0,
      documentId: newDocumentData?.id || 'unknown'
    });

    // Step 2: Create maps for comparison
    console.log(`${logId} Step 2: Creating item maps for comparison`);
    const oldItemsMap = new Map();
    const newItemsMap = new Map();

    // Map old items (sum quantities for duplicate items)
    if (oldDocumentData.items && Array.isArray(oldDocumentData.items)) {
      console.log(`${logId} Processing ${oldDocumentData.items.length} old items`);
      oldDocumentData.items.forEach((item: any, index: number) => {
        console.log(`${logId} Old item ${index}:`, {
          itemId: item?.item?.id,
          itemName: item?.item?.name,
          itemType: item?.item?.type,
          quantity: item?.quantity
        });

        if (item?.item?.id && item?.item?.type === 'product') {
          const currentQuantity = oldItemsMap.get(item.item.id) || 0;
          const newQuantity = currentQuantity + (item.quantity || 0);
          oldItemsMap.set(item.item.id, newQuantity);
          console.log(`${logId} Updated oldItemsMap: ${item.item.id} = ${currentQuantity} + ${item.quantity || 0} = ${newQuantity}`);
        } else {
          console.log(`${logId} Skipped old item (not a product or missing ID):`, item?.item);
        }
      });
    } else {
      console.log(`${logId} No old items array found or invalid format`);
    }

    // Map new items (sum quantities for duplicate items)
    if (newDocumentData.items && Array.isArray(newDocumentData.items)) {
      console.log(`${logId} Processing ${newDocumentData.items.length} new items`);
      newDocumentData.items.forEach((item: any, index: number) => {
        console.log(`${logId} New item ${index}:`, {
          itemId: item?.item?.id,
          itemName: item?.item?.name,
          itemType: item?.item?.type,
          quantity: item?.quantity
        });

        if (item?.item?.id && item?.item?.type === 'product') {
          const currentQuantity = newItemsMap.get(item.item.id) || 0;
          const newQuantity = currentQuantity + (item.quantity || 0);
          newItemsMap.set(item.item.id, newQuantity);
          console.log(`${logId} Updated newItemsMap: ${item.item.id} = ${currentQuantity} + ${item.quantity || 0} = ${newQuantity}`);
        } else {
          console.log(`${logId} Skipped new item (not a product or missing ID):`, item?.item);
        }
      });
    } else {
      console.log(`${logId} No new items array found or invalid format`);
    }

    console.log(`${logId} Maps created:`, {
      oldItemsCount: oldItemsMap.size,
      newItemsCount: newItemsMap.size
    });

    // Step 3: Calculate stock adjustments
    console.log(`${logId} Step 3: Calculating stock adjustments`);
    const stockAdjustments: StockUpdateItem[] = [];

    // Process all items (old and new)
    const allItemIds = new Set([...oldItemsMap.keys(), ...newItemsMap.keys()]);
    console.log(`${logId} Total unique items to process: ${allItemIds.size}`);
    console.log(`${logId} Item IDs: [${Array.from(allItemIds).join(', ')}]`);

    for (const itemId of allItemIds) {
      const oldQuantity = oldItemsMap.get(itemId) || 0;
      const newQuantity = newItemsMap.get(itemId) || 0;
      const quantityDifference = newQuantity - oldQuantity;

      console.log(`${logId} Processing item ${itemId}:`, {
        oldQuantity,
        newQuantity,
        quantityDifference
      });

      if (quantityDifference !== 0) {
        console.log(`${logId} Quantity changed for item ${itemId}, looking up item details...`);
        
        // Find item details - prioritize new data first, then old data
        let itemDetails = null;
        
        // Try to find in new document items first
        if (newDocumentData.items && Array.isArray(newDocumentData.items)) {
          itemDetails = newDocumentData.items.find((item: any) => item?.item?.id === itemId)?.item;
          if (itemDetails) {
            console.log(`${logId} Found item details in NEW document:`, {
              id: itemDetails.id,
              name: itemDetails.name,
              type: itemDetails.type
            });
          }
        }
        
        // If not found in new data, try old document items
        if (!itemDetails && oldDocumentData.items && Array.isArray(oldDocumentData.items)) {
          itemDetails = oldDocumentData.items.find((item: any) => item?.item?.id === itemId)?.item;
          if (itemDetails) {
            console.log(`${logId} Found item details in OLD document:`, {
              id: itemDetails.id,
              name: itemDetails.name,
              type: itemDetails.type
            });
          }
        }

        console.log(`${logId} Final item details for ${itemId}:`, itemDetails);

        if (itemDetails && itemDetails.type === 'product') {
          const adjustment = {
            id: `adj_${itemId}_${Date.now()}`,
            quantity: Math.abs(quantityDifference),
            item: {
              id: itemDetails.id,
              type: itemDetails.type,
              name: itemDetails.name
            }
          };

          stockAdjustments.push(adjustment);
          console.log(`${logId} ✅ Added stock adjustment:`, adjustment);
        } else if (!itemDetails) {
          console.log(`${logId} ❌ Item details not found for ${itemId} - skipping adjustment`);
        } else if (itemDetails.type !== 'product') {
          console.log(`${logId} ⚪ Item ${itemId} is not a product (${itemDetails.type}) - skipping stock adjustment`);
        }
      } else {
        console.log(`${logId} ⚪ No change needed for item ${itemId}`);
      }
    }

    console.log(`${logId} Stock adjustments calculated:`, {
      totalAdjustments: stockAdjustments.length,
      adjustments: stockAdjustments.map(adj => ({
        itemId: adj.item.id,
        itemName: adj.item.name,
        quantity: adj.quantity
      }))
    });

    // Step 4: Early return if no adjustments needed
    if (stockAdjustments.length === 0) {
      console.log(`${logId} No stock adjustments needed - quantities unchanged`);
      const result = {
        totalItems: 0,
        successCount: 0,
        failedCount: 0,
        results: [],
        errors: []
      };
      console.log(`${logId} Returning empty result:`, result);
      return result;
    }

    // Step 5: Apply adjustments
    console.log(`${logId} Step 5: Applying ${stockAdjustments.length} stock adjustments`);
    const operationType = documentType === 'purchase_voucher' ? 'purchase' : 'sale';
    console.log(`${logId} Operation type: ${operationType}`);

    const result = await updateBulkItemStock(stockAdjustments, operationType);
    console.log(`${logId} Bulk update result:`, result);

    return result;

  } catch (error) {
    console.error(`${logId} Smart stock update failed:`, error);
    console.error(`${logId} Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    
    const errorResult = {
      totalItems: 0,
      successCount: 0,
      failedCount: 0,
      results: [],
      errors: [error instanceof Error ? error.message : 'Unknown error occurred']
    };
    
    console.log(`${logId} Returning error result:`, errorResult);
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

export function debugDocumentStructure(documentData: any, label: string): void {
  const logId = `[DEBUG-DOC-${Date.now()}]`;
  console.log(`${logId} ==> Debug ${label} Document Structure`);
  
  if (!documentData) {
    console.log(`${logId} Document is null/undefined`);
    return;
  }
  
  console.log(`${logId} Document type:`, typeof documentData);
  console.log(`${logId} Document keys:`, Object.keys(documentData));
  console.log(`${logId} Document ID:`, documentData.id);
  console.log(`${logId} Has items:`, !!documentData.items);
  console.log(`${logId} Items type:`, typeof documentData.items);
  console.log(`${logId} Items is array:`, Array.isArray(documentData.items));
  console.log(`${logId} Items length:`, documentData.items?.length || 0);
  
  if (documentData.items && Array.isArray(documentData.items)) {
    documentData.items.forEach((item: any, index: number) => {
      console.log(`${logId} Item ${index}:`, {
        hasItem: !!item.item,
        itemId: item.item?.id,
        itemName: item.item?.name,
        itemType: item.item?.type,
        quantity: item.quantity,
        itemKeys: item.item ? Object.keys(item.item) : 'no item object'
      });
    });
  }
  
  console.log(`${logId} <== End debug ${label} document`);
}