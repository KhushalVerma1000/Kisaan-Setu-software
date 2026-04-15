import { createClient } from '@/utils/supabase/server'

/**
 * Check stock availability for multiple items (Compatible with stockManagementHelper.ts)
 * @param itemIds - Array of item IDs to check stock for
 * @param fpo_id - FPO ID to filter items
 * @returns Promise with current stock levels and availability status
 */
export async function checkItemsStockAvailability(
  itemIds: string[],
  fpo_id: string
): Promise<{
  [itemId: string]: {
    currentStock: number;
    available: boolean;
    itemName?: string;
    itemType?: 'product' | 'service';
    lowStockAlert?: number;
    isLowStock?: boolean;
  }
} | null> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('items')
      .select('id, name, type, current_stock, low_stock_alert')
      .eq('fpo_id', fpo_id)
      .in('id', itemIds)

    if (error) {
      throw new Error(error.message)
    }

    if (!data) return {}

    const stockStatus: {
      [itemId: string]: {
        currentStock: number;
        available: boolean;
        itemName?: string;
        itemType?: 'product' | 'service';
        lowStockAlert?: number;
        isLowStock?: boolean;
      }
    } = {}

    // Process each item
    data.forEach(item => {
      const currentStock = item.current_stock || 0
      const isProduct = item.type === 'product'
      const lowStockAlert = item.low_stock_alert
      const isLowStock = lowStockAlert !== null && currentStock <= lowStockAlert

      stockStatus[item.id] = {
        currentStock: currentStock,
        available: isProduct ? currentStock > 0 : true, // Services are always available
        itemName: item.name,
        itemType: item.type,
        lowStockAlert: lowStockAlert,
        isLowStock: isLowStock
      }
    })

    // Add entries for items not found (they don't exist or belong to different FPO)
    itemIds.forEach(itemId => {
      if (!stockStatus[itemId]) {
        stockStatus[itemId] = {
          currentStock: 0,
          available: false,
          itemName: undefined,
          itemType: undefined,
          lowStockAlert: undefined,
          isLowStock: false
        }
      }
    })

    return stockStatus
  } catch (error) {
    console.error('Error checking items stock availability:', error)
    return null
  }
}

/**
 * Check stock availability for a single item
 * @param itemId - Item ID to check stock for
 * @param fpo_id - FPO ID to filter items
 * @returns Promise with current stock level and availability status
 */
export async function checkSingleItemStock(
  itemId: string,
  fpo_id: string
): Promise<{
  currentStock: number;
  available: boolean;
  itemName?: string;
  itemType?: 'product' | 'service';
  lowStockAlert?: number;
  isLowStock?: boolean;
} | null> {
  const result = await checkItemsStockAvailability([itemId], fpo_id)
  return result ? result[itemId] : null
}

/**
 * Bulk check stock availability with quantity requirements
 * @param itemChecks - Array of items with required quantities
 * @param fpo_id - FPO ID to filter items
 * @returns Promise with stock validation results
 */
export async function validateStockRequirements(
  itemChecks: { itemId: string; requiredQuantity: number }[],
  fpo_id: string
): Promise<{
  allAvailable: boolean;
  stockValidation: {
    [itemId: string]: {
      currentStock: number;
      requiredQuantity: number;
      available: boolean;
      sufficient: boolean;
      shortfall: number;
      itemName?: string;
      itemType?: 'product' | 'service';
    }
  };
  unavailableItems: string[];
  insufficientItems: string[];
} | null> {
  try {
    const itemIds = itemChecks.map(check => check.itemId)
    const stockStatus = await checkItemsStockAvailability(itemIds, fpo_id)

    if (!stockStatus) {
      return null
    }

    const stockValidation: {
      [itemId: string]: {
        currentStock: number;
        requiredQuantity: number;
        available: boolean;
        sufficient: boolean;
        shortfall: number;
        itemName?: string;
        itemType?: 'product' | 'service';
      }
    } = {}

    const unavailableItems: string[] = []
    const insufficientItems: string[] = []

    itemChecks.forEach(check => {
      const stockInfo = stockStatus[check.itemId]
      const currentStock = stockInfo?.currentStock || 0
      const isAvailable = stockInfo?.available || false
      const isSufficient = stockInfo?.itemType === 'service' || currentStock >= check.requiredQuantity
      const shortfall = Math.max(0, check.requiredQuantity - currentStock)

      stockValidation[check.itemId] = {
        currentStock: currentStock,
        requiredQuantity: check.requiredQuantity,
        available: isAvailable,
        sufficient: isSufficient,
        shortfall: shortfall,
        itemName: stockInfo?.itemName,
        itemType: stockInfo?.itemType
      }

      if (!isAvailable) {
        unavailableItems.push(check.itemId)
      } else if (!isSufficient) {
        insufficientItems.push(check.itemId)
      }
    })

    const allAvailable = unavailableItems.length === 0 && insufficientItems.length === 0

    return {
      allAvailable,
      stockValidation,
      unavailableItems,
      insufficientItems
    }
  } catch (error) {
    console.error('Error validating stock requirements:', error)
    return null
  }
}

/**
 * Recalculate stock for an item based on its transaction history
 * updates the items table with the new stock level
 * @param itemId - Item ID to recalculate
 * @param fpoId - FPO ID
 */
export async function recalculateItemStock(itemId: string, fpoId: string): Promise<number> {
  const supabase = await createClient();

  try {
    // 1. Calculate total stock from transactions
    const { data, error } = await supabase
      .from('inventory_transactions')
      .select('quantity')
      .eq('item_id', itemId)
      .eq('fpo_id', fpoId);

    if (error) throw new Error(`Failed to fetch transactions: ${error.message}`);

    // Sum up quantities (can be negative for sales, positive for purchases)
    const currentStock = data?.reduce((sum, tx) => sum + Number(tx.quantity), 0) || 0;

    // 2. Update the item's current_stock in the items table
    const { error: updateError } = await supabase
      .from('items')
      .update({ current_stock: currentStock })
      .eq('id', itemId)
      .eq('fpo_id', fpoId);

    if (updateError) throw new Error(`Failed to update item stock: ${updateError.message}`);

    return currentStock;
  } catch (error) {
    console.error('Error recalculating item stock:', error);
    // Fallback: return 0 or rethrow? Rethrowing is safer to alert the caller.
    throw error;
  }
}