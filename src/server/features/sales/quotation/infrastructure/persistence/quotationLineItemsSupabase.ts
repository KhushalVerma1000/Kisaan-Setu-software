'use server';

import { createClient } from '@/utils/supabase/server';
import { QuotationLineItem } from '../../core/entities/QuotationLineItem';

// ============================================================================
// QUOTATION LINE ITEMS PERSISTENCE
// ============================================================================

/**
 * Save line items for a quotation
 */
export async function saveQuotationLineItems(
  quotationId: string,
  lineItems: QuotationLineItem[]
) {
  const supabase = await createClient();

  // Step 1: Delete existing line items
  const { error: deleteError } = await supabase
    .from('quotation_line_items')
    .delete()
    .eq('quotation_id', quotationId);

  if (deleteError) throw new Error(`Failed to clear existing line items: ${deleteError.message}`);

  if (lineItems.length === 0) return [];

  // Step 2: Prepare and Insert new line items
  const lineItemsDbData = lineItems.map((item, index) => {
    item.quotationId = quotationId;
    item.lineNumber = index + 1;
    return item.toDatabase();
  });

  const { data: insertedItems, error: insertError } = await supabase
    .from('quotation_line_items')
    .insert(lineItemsDbData)
    .select();

  if (insertError) throw new Error(`Failed to insert line items: ${insertError.message}`);

  return insertedItems.map(QuotationLineItem.fromDatabase);
}

/**
 * Get line items for a quotation
 */
export async function getQuotationLineItems(quotationId: string): Promise<QuotationLineItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('quotation_line_items')
    .select('*')
    .eq('quotation_id', quotationId)
    .order('line_number', { ascending: true });

  if (error) throw new Error(error.message);

  return data.map(item => QuotationLineItem.fromDatabase(item));
}

/**
 * Get line items for a quotation converted to SelectedItem-compatible format
 * This is used when loading quotations for editing in AddItemComponent
 */
export async function getQuotationLineItemsAsSelectedItems(quotationId: string): Promise<any[]> {
  const lineItems = await getQuotationLineItems(quotationId);

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
 * Delete line items for a quotation
 */
export async function deleteQuotationLineItems(quotationId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('quotation_line_items')
    .delete()
    .eq('quotation_id', quotationId);

  if (error) throw new Error(error.message);
}
