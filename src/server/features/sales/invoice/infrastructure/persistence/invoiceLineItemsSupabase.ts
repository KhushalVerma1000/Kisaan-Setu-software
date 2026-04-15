'use server';

import { createClient } from '@/utils/supabase/server';
import { InvoiceLineItem } from '../../core/entities/InvoiceLineItem';
import { InventoryTransaction } from '@/server/features/inventory/core/entities/InventoryTransaction';
import { recalculateItemStock } from '@/server/features/items/infrastructure/persistence/stockSupabase';

// ============================================================================
// INVOICE LINE ITEMS PERSISTENCE
// ============================================================================

/**
 * Save line items for an invoice
 * Handles creating/updating line items and their inventory transactions
 */
export async function saveInvoiceLineItems(
  invoiceId: string,
  fpoId: string,
  lineItems: InvoiceLineItem[],
  invoiceDetails: {
    invoiceNumber: string;
    customerName: string;
    customerId?: string;
    invoiceDate: Date;
  }
) {
  const supabase = await createClient();

  // 1. Delete existing line items (simplest approach for full updates)
  // Note: Inventory transactions cascade delete automatically when line items are deleted? 
  // Wait, no, inventory_transactions link to invoice_id, not line_item_id directly in the current schema.
  // The schema links inventory_transactions to document_id (invoice_id).
  // So we should delete transactions for this invoice first to avoid duplicates if we are doing a full replace.

  // IMPORTANT: We need to respect the ON DELETE CASCADE behavior.
  // If we delete line lines, we don't necessarily delete transactions unless we link them better.
  // Actually, inventory_transactions are linked to the INVOICE, not the line item directly in the DB schema
  // (document_id = invoice_id).
  // Strategy:
  // 1. Delete all existing inventory transactions for this invoice (will be recreated)
  // 2. Delete all existing line items for this invoice (will be recreated)
  // 3. Insert new line items
  // 4. Create new inventory transactions

  // Step 1: Delete existing inventory transactions for this document
  const { error: txDeleteError } = await supabase
    .from('inventory_transactions')
    .delete()
    .eq('document_id', invoiceId)
    .eq('document_type', 'invoice');

  if (txDeleteError) throw new Error(`Failed to clear existing transactions: ${txDeleteError.message}`);

  // Step 2: Delete existing line items
  const { error: deleteError } = await supabase
    .from('invoice_line_items')
    .delete()
    .eq('invoice_id', invoiceId);

  if (deleteError) throw new Error(`Failed to clear existing line items: ${deleteError.message}`);

  if (lineItems.length === 0) return [];

  // Step 3: Prepare and Insert new line items
  const lineItemsDbData = lineItems.map((item, index) => {
    // Ensure invoice_id is set and line_number is correct
    item.invoiceId = invoiceId;
    item.lineNumber = index + 1;
    return item.toDatabase();
  });

  const { data: insertedItems, error: insertError } = await supabase
    .from('invoice_line_items')
    .insert(lineItemsDbData)
    .select();

  if (insertError) throw new Error(`Failed to insert line items: ${insertError.message}`);

  // Step 4: Create Inventory Transactions
  // We utilize the InventoryTransaction entity logic which checks itemType
  const transactions: any[] = [];

  // Need to fetch current stocks first for accurate calculation
  // Or rely on databasetriggers? No, we decided on app layer.
  // We can fetch current stock for all items involved.
  const itemIds = lineItems.map(i => i.itemId);

  // Fetch current stock for these items (helper query)
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
    const transaction = InventoryTransaction.createSaleTransaction({
      fpoId,
      itemId: item.itemId,
      itemType: item.itemType,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      invoiceId: invoiceId,
      invoiceNumber: invoiceDetails.invoiceNumber,
      customerName: invoiceDetails.customerName,
      customerId: invoiceDetails.customerId,
      transactionDate: invoiceDetails.invoiceDate,
      currentStock: currentStock
    });

    // Update local stock map for subsequent items of same ID (rare but possible)
    stockMap.set(item.itemId, transaction.stockAfter);

    transactions.push(transaction.toDbFormat());
  }

  if (transactions.length > 0) {
    const { error: txInsertError } = await supabase
      .from('inventory_transactions')
      .insert(transactions);

    if (txInsertError) throw new Error(`Failed to create inventory transactions: ${txInsertError.message}`);
  }

  // Step 5: Trigger stock recalculation for all affected items (as a safety net and to update items table)
  // We can do this asynchronously or let it complete
  // Using Promise.all for parallel execution
  await Promise.all(itemIds.map(id => recalculateItemStock(id, fpoId)));

  return insertedItems.map(InvoiceLineItem.fromDatabase);
}

/**
 * Get line items for an invoice
 */
export async function getInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('line_number', { ascending: true });

  if (error) throw new Error(error.message);

  return data.map(item => InvoiceLineItem.fromDatabase(item));
}

/**
 * Get line items for an invoice converted to SelectedItem-compatible format
 * This is used when loading invoices for editing in AddItemComponent
 */
export async function getInvoiceLineItemsAsSelectedItems(invoiceId: string): Promise<any[]> {
  const lineItems = await getInvoiceLineItems(invoiceId);

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
        cgstAmount: 0, // Will be recalculated
        sgstAmount: 0,
        igstAmount: 0,
        totalGstAmount: json.gstAmount,
        lineTotal: json.lineTotal
      }
    };
  });
}

/**
 * Delete line items for an invoice
 * (Transactions cascade delete via DB constraint on invoice deletion, 
 * but if just clearing lines, we need to handle transactions)
 */
export async function deleteInvoiceLineItems(invoiceId: string) {
  const supabase = await createClient();

  // Delete transactions manually if we are just calling this function (safety)
  await supabase
    .from('inventory_transactions')
    .delete()
    .eq('document_id', invoiceId)
    .eq('document_type', 'invoice');

  const { error } = await supabase
    .from('invoice_line_items')
    .delete()
    .eq('invoice_id', invoiceId);

  if (error) throw new Error(error.message);
}
