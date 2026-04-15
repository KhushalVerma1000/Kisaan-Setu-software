'use server';

import { createClient } from '@/utils/supabase/server';
import { PurchaseLineItem } from '../../core/entities/PurchaseLineItem';
import { InventoryTransaction } from '@/server/features/inventory/core/entities/InventoryTransaction';
import { recalculateItemStock } from '@/server/features/items/infrastructure/persistence/stockSupabase';

// ============================================================================
// PURCHASE LINE ITEMS PERSISTENCE
// ============================================================================

/**
 * Save line items for a purchase voucher
 * Handles creating/updating line items and their inventory transactions
 */
export async function savePurchaseLineItems(
  voucherId: string,
  fpoId: string,
  lineItems: PurchaseLineItem[],
  voucherDetails: {
    voucherNumber: string;
    supplierName: string;
    supplierId?: string;
    transactionDate: Date;
  }
) {
  const supabase = await createClient();

  // Step 1: Delete existing inventory transactions for this document
  const { error: txDeleteError } = await supabase
    .from('inventory_transactions')
    .delete()
    .eq('document_id', voucherId)
    .eq('document_type', 'purchase_voucher');

  if (txDeleteError) throw new Error(`Failed to clear existing transactions: ${txDeleteError.message}`);

  // Step 2: Delete existing line items
  const { error: deleteError } = await supabase
    .from('purchase_line_items')
    .delete()
    .eq('purchase_voucher_id', voucherId);

  if (deleteError) throw new Error(`Failed to clear existing line items: ${deleteError.message}`);

  if (lineItems.length === 0) return [];

  // Step 3: Prepare and Insert new line items
  const lineItemsDbData = lineItems.map((item, index) => {
    item.purchaseVoucherId = voucherId;
    item.lineNumber = index + 1;
    return item.toDatabase();
  });

  const { data: insertedItems, error: insertError } = await supabase
    .from('purchase_line_items')
    .insert(lineItemsDbData)
    .select();

  if (insertError) throw new Error(`Failed to insert line items: ${insertError.message}`);

  // Step 4: Create Inventory Transactions
  const transactions: any[] = [];
  const itemIds = lineItems.map(i => i.itemId);

  // Fetch current stock
  const { data: stockData } = await supabase
    .from('items')
    .select('id, current_stock')
    .in('id', itemIds)
    .eq('fpo_id', fpoId);

  const stockMap = new Map<string, number>();
  if (stockData) {
    stockData.forEach((item: any) => stockMap.set(item.id, Number(item.current_stock)));
  }

  for (const item of lineItems) {
    const currentStock = stockMap.get(item.itemId) || 0;

    // Use factory method which handles service/product logic internally
    const transaction = InventoryTransaction.createPurchaseTransaction({
      fpoId,
      itemId: item.itemId,
      itemType: item.itemType,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      purchaseVoucherId: voucherId,
      voucherNumber: voucherDetails.voucherNumber,
      supplierName: voucherDetails.supplierName,
      supplierId: voucherDetails.supplierId,
      transactionDate: voucherDetails.transactionDate,
      currentStock: currentStock
    });

    // Update local stock map
    stockMap.set(item.itemId, transaction.stockAfter);

    transactions.push(transaction.toDbFormat());
  }

  if (transactions.length > 0) {
    const { error: txInsertError } = await supabase
      .from('inventory_transactions')
      .insert(transactions);

    if (txInsertError) throw new Error(`Failed to create inventory transactions: ${txInsertError.message}`);
  }

  // Step 5: Trigger stock recalculation
  await Promise.all(itemIds.map(id => recalculateItemStock(id, fpoId)));

  return insertedItems.map(PurchaseLineItem.fromDatabase);
}

/**
 * Get line items for a purchase voucher
 */
export async function getPurchaseLineItems(voucherId: string): Promise<PurchaseLineItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('purchase_line_items')
    .select('*')
    .eq('purchase_voucher_id', voucherId)
    .order('line_number', { ascending: true });

  if (error) throw new Error(error.message);

  return data.map(item => PurchaseLineItem.fromDatabase(item));
}

/**
 * Get line items for a purchase voucher converted to SelectedItem-compatible format
 * This is used when loading vouchers for editing in AddItemComponent
 */
export async function getPurchaseLineItemsAsSelectedItems(voucherId: string): Promise<any[]> {
  const lineItems = await getPurchaseLineItems(voucherId);

  // Convert to the format expected by AddItemComponent/LineItemManager
  return lineItems.map(li => {
    const json = li.toJSON();
    return {
      id: json.id,
      item: {
        id: json.itemId,
        name: json.itemName,
        type: json.itemType,
        category: { id: 'default', name: 'General' },
        hsn_sac: json.hsnSac,
        salePrice: json.unitPrice,
        purchasePrice: json.unitPrice,
        salePriceInclusive: json.gstType === 'including',
        gstTaxPercent: json.gstRate,
        unit: json.unitCode ? { code: json.unitCode, label: json.unitCode } : { code: 'NOS', label: 'Numbers' }
      },
      quantity: json.quantity,
      unitPrice: json.unitPrice,
      discount: {
        value: json.discountValue || 0,
        type: json.discountType || 'fixed'
      },
      gstConfig: {
        rate: json.gstRate,
        type: json.gstType
      },
      lineNumber: json.lineNumber,
      calculations: {
        baseAmount: json.baseAmount,
        discountAmount: json.discountAmount,
        taxableAmount: json.taxableAmount,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalGstAmount: json.gstAmount,
        lineTotal: json.lineTotal
      }
    };
  });
}

/**
 * Delete line items for a purchase voucher
 */
export async function deletePurchaseLineItems(voucherId: string) {
  const supabase = await createClient();

  await supabase
    .from('inventory_transactions')
    .delete()
    .eq('document_id', voucherId)
    .eq('document_type', 'purchase_voucher');

  const { error } = await supabase
    .from('purchase_line_items')
    .delete()
    .eq('purchase_voucher_id', voucherId);

  if (error) throw new Error(error.message);
}
