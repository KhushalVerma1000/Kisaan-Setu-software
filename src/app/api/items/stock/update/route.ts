import { NextRequest, NextResponse } from "next/server";
import { updateProductStock } from '@/server/features/items/infrastructure/persistence/ItemSupabase';

// Types for the API
interface StockUpdateItem {
  id: string;
  quantity: number;
  item: {
    id: string;
    type: 'product' | 'service';
    name: string;
  };
}

interface StockOperationResult {
  success: boolean;
  itemId: string;
  itemName: string;
  previousStock?: number;
  newStock?: number;
  error?: string;
}

interface BulkStockOperationResult {
  totalItems: number;
  successCount: number;
  failedCount: number;
  results: StockOperationResult[];
  errors: string[];
}

type StockOperationType = 'purchase' | 'sale' | 'adjustment';

// Server-side single item stock update using existing function
async function updateItemStock(
  itemId: string,
  quantity: number,
  operationType: StockOperationType,
  itemName: string = 'Unknown Item'
): Promise<StockOperationResult> {
  try {
    console.log(`[SERVER] Updating stock for item ${itemName} (${itemId}): ${operationType} - ${quantity}`);

    // Determine the operation based on type using existing function
    const operation = operationType === 'purchase' ? 'add' : 'subtract';
    
    // Use the existing updateProductStock function from ItemSupabase
    const updatedProduct = await updateProductStock(itemId, quantity, operation);

    if (!updatedProduct) {
      return {
        success: false,
        itemId,
        itemName,
        error: 'Failed to update stock - item not found or update failed'
      };
    }

    console.log(`[SERVER] Stock updated successfully for ${itemName}: ${updatedProduct.currentStock}`);

    return {
      success: true,
      itemId,
      itemName,
      previousStock: updatedProduct.currentStock - (operationType === 'purchase' ? quantity : -quantity), // Calculate previous stock
      newStock: updatedProduct.currentStock
    };

  } catch (error) {
    console.error(`[SERVER] Error updating stock for item ${itemName} (${itemId}):`, error);
    return {
      success: false,
      itemId,
      itemName,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Server-side bulk stock update
async function updateBulkItemStock(
  items: StockUpdateItem[],
  operationType: StockOperationType
): Promise<BulkStockOperationResult> {
  console.log(`[SERVER] Starting bulk stock update for ${items.length} items - Operation: ${operationType}`);

  const results: StockOperationResult[] = [];
  const errors: string[] = [];
  let successCount = 0;
  let failedCount = 0;

  // Filter only products (services don't have stock)
  const productItems = items.filter(item => item.item.type === 'product');
  console.log(`[SERVER] Processing ${productItems.length} products out of ${items.length} total items`);

  // Process each item sequentially to avoid database conflicts
  for (const item of productItems) {
    try {
      const result = await updateItemStock(
        item.item.id,
        item.quantity,
        operationType,
        item.item.name
      );

      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        failedCount++;
        if (result.error) {
          errors.push(`${item.item.name}: ${result.error}`);
        }
      }

      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 50));

    } catch (error) {
      failedCount++;
      const errorMessage = `${item.item.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMessage);
      
      results.push({
        success: false,
        itemId: item.item.id,
        itemName: item.item.name,
        error: errorMessage
      });
    }
  }

  const finalResult: BulkStockOperationResult = {
    totalItems: productItems.length,
    successCount,
    failedCount,
    results,
    errors
  };

  console.log(`[SERVER] Bulk stock update completed:`, {
    total: finalResult.totalItems,
    success: finalResult.successCount,
    failed: finalResult.failedCount
  });

  return finalResult;
}

// Helper function to transform document data to stock items
function transformDocumentToStockItems(documentData: any): StockUpdateItem[] {
  if (!documentData.items || !Array.isArray(documentData.items)) {
    throw new Error('Invalid document data - items array is required');
  }

  return documentData.items.map((item: any) => ({
    id: item.id,
    quantity: item.quantity,
    item: {
      id: item.item.id,
      type: item.item.type,
      name: item.item.name
    }
  }));
}

// API Route Handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, operationType, documentData, documentType } = body;

    console.log('[SERVER] Stock update API called:', { operationType, documentType, itemsCount: items?.length });

    // Validate request
    if (!operationType || !['purchase', 'sale', 'adjustment'].includes(operationType)) {
      return NextResponse.json(
        { error: 'Invalid operation type. Must be: purchase, sale, or adjustment' },
        { status: 400 }
      );
    }

    let stockItems: StockUpdateItem[] = [];

    // Handle different input formats
    if (items && Array.isArray(items)) {
      // Direct items array
      stockItems = items;
    } else if (documentData && documentType) {
      // Process from document data
      if (documentType === 'quotation') {
        // Quotations don't affect stock
        console.log('[SERVER] Quotations do not affect stock - skipping stock update');
        return NextResponse.json({
          success: true,
          data: {
            totalItems: 0,
            successCount: 0,
            failedCount: 0,
            results: [],
            errors: []
          },
          message: 'Quotations do not affect stock - no updates performed'
        });
      }

      try {
        stockItems = transformDocumentToStockItems(documentData);
      } catch (transformError) {
        return NextResponse.json(
          { 
            error: 'Failed to transform document data', 
            details: transformError instanceof Error ? transformError.message : 'Unknown transform error'
          },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Either items array or documentData with documentType is required' },
        { status: 400 }
      );
    }

    // Validate stock items
    if (!stockItems || stockItems.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalItems: 0,
          successCount: 0,
          failedCount: 0,
          results: [],
          errors: []
        },
        message: 'No items to process'
      });
    }

    // Process stock updates using existing functions
    const result = await updateBulkItemStock(stockItems, operationType);

    // Return success response
    return NextResponse.json({
      success: true,
      data: result,
      message: `Stock update completed: ${result.successCount}/${result.totalItems} items updated successfully`,
      warnings: result.failedCount > 0 ? [`${result.failedCount} items failed to update`] : []
    });

  } catch (error) {
    console.error('[SERVER] Stock update API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET method for API health check and documentation
export async function GET() {
  return NextResponse.json({
    message: 'Stock Update API is running',
    version: '1.0.0',
    endpoints: {
      POST: {
        description: 'Update stock for items',
        body: {
          operationType: {
            type: 'string',
            required: true,
            enum: ['purchase', 'sale', 'adjustment'],
            description: 'Type of stock operation'
          },
          items: {
            type: 'StockUpdateItem[]',
            required: false,
            description: 'Array of items to update (required if documentData not provided)'
          },
          documentData: {
            type: 'object',
            required: false,
            description: 'Document data containing items (required if items not provided)'
          },
          documentType: {
            type: 'string',
            required: false,
            enum: ['purchase_voucher', 'invoice', 'quotation'],
            description: 'Type of document (required if documentData provided)'
          }
        },
        response: {
          success: 'boolean',
          data: 'BulkStockOperationResult',
          message: 'string',
          warnings: 'string[]'
        }
      }
    },
    types: {
      StockUpdateItem: {
        id: 'string',
        quantity: 'number',
        item: {
          id: 'string',
          type: 'product | service',
          name: 'string'
        }
      },
      BulkStockOperationResult: {
        totalItems: 'number',
        successCount: 'number',
        failedCount: 'number',
        results: 'StockOperationResult[]',
        errors: 'string[]'
      }
    }
  });
}