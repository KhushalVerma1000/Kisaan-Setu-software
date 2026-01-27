import { createClient } from "@/utils/supabase/server";
import { PurchaseVoucherItemInterface } from "@/server/features/purchase/core/entities/PurchaseVoucher";
// Note: We used PurchaseVoucherItemInterface for PurchaseOrder items as well.

export class PurchaseOrderLineItemService {
    static async createPurchaseOrderLineItems(items: PurchaseVoucherItemInterface[], purchaseOrderId: string): Promise<boolean> {
        try {
            const supabase = await createClient();

            const lineItemsToInsert = items.map(item => ({
                purchase_order_id: purchaseOrderId,
                // Migration: purchase_order_line_items ( ... po_id uuid NOT NULL REFERENCES purchase_orders(id) ...)
                // Wait, I should verify column name. 
                // Previous pattern was invoice_id, purchase_voucher_id, quotation_id.
                // It is likely purchase_order_id or po_id. 
                // Given table name purchase_order_line_items, likely purchase_order_id.
                // But let's check migration file part 4 (lines 260+).

                line_number: item.lineNumber,

                // Item reference
                item_id: item.item.id,
                item_name: item.item.name,
                item_type: item.item.type,
                hsn_sac: item.item.hsn_sac || '0000',
                unit_code: item.item.unit?.code || null,

                // Pricing
                quantity: item.quantity,
                unit_price: item.unitPrice,

                // Discount
                discount_type: item.discount?.type || 'fixed',
                discount_value: item.discount?.value || 0,
                discount_amount: item.calculations?.discountAmount || 0,

                // GST
                gst_rate: item.gstConfig?.rate || 0,
                gst_type: item.gstConfig?.type || 'excluding',

                // Calculated amounts
                base_amount: item.calculations?.baseAmount || 0,
                taxable_amount: item.calculations?.taxableAmount || 0,
                gst_amount: item.calculations?.totalGstAmount || 0,
                line_total: item.calculations?.lineTotal || 0,
            }));

            const { error } = await supabase
                .from('purchase_order_line_items')
                .insert(lineItemsToInsert);

            if (error) {
                console.error("Error creating purchase order line items:", error);
                return false;
            }

            return true;
        } catch (error) {
            console.error("Unexpected error in createPurchaseOrderLineItems:", error);
            return false;
        }
    }
}
