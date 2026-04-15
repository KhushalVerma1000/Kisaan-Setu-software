'use server';

import { createClient } from '@/utils/supabase/server';
import { PurchaseOrderLineItem } from '../../core/entities/PurchaseOrderLineItem';

// ============================================================================
// PURCHASE ORDER LINE ITEMS PERSISTENCE
// ============================================================================

/**
 * Save line items for a purchase order
 */
export async function savePurchaseOrderLineItems(
  purchaseOrderId: string,
  lineItems: PurchaseOrderLineItem[]
) {
  const supabase = await createClient();

  // Step 1: Delete existing line items
  const { error: deleteError } = await supabase
    .from('purchase_order_line_items')
    .delete()
    .eq('purchase_order_id', purchaseOrderId);

  if (deleteError) throw new Error(`Failed to clear existing line items: ${deleteError.message}`);

  if (lineItems.length === 0) return [];

  // Step 2: Prepare and Insert new line items
  const lineItemsDbData = lineItems.map((item, index) => {
    item.purchaseOrderId = purchaseOrderId;
    item.lineNumber = index + 1;
    return item.toDatabase();
  });

  const { data: insertedItems, error: insertError } = await supabase
    .from('purchase_order_line_items')
    .insert(lineItemsDbData)
    .select();

  if (insertError) throw new Error(`Failed to insert line items: ${insertError.message}`);

  return insertedItems.map(PurchaseOrderLineItem.fromDatabase);
}

/**
 * Get line items for a purchase order
 */
export async function getPurchaseOrderLineItems(purchaseOrderId: string): Promise<PurchaseOrderLineItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('purchase_order_line_items')
    .select('*')
    .eq('purchase_order_id', purchaseOrderId)
    .order('line_number', { ascending: true });

  if (error) throw new Error(error.message);

  return data.map(item => PurchaseOrderLineItem.fromDatabase(item));
}

/**
 * Get line items for a purchase order converted to SelectedItem-compatible format
 * This is used when loading purchase orders for editing in AddItemComponent
 */
export async function getPurchaseOrderLineItemsAsSelectedItems(purchaseOrderId: string): Promise<any[]> {
  const lineItems = await getPurchaseOrderLineItems(purchaseOrderId);

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
 * Delete line items for a purchase order
 */
export async function deletePurchaseOrderLineItems(purchaseOrderId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('purchase_order_line_items')
    .delete()
    .eq('purchase_order_id', purchaseOrderId);

  if (error) throw new Error(error.message);
}
