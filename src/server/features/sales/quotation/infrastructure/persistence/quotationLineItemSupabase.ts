import { createClient } from "@/utils/supabase/server";
import { InvoiceItemInterface } from "@/server/features/sales/invoice/core/entities/invoice";

export class QuotationLineItemService {
    static async createQuotationLineItems(items: InvoiceItemInterface[], quotationId: string): Promise<boolean> {
        try {
            const supabase = await createClient();

            const lineItemsToInsert = items.map(item => ({
                quotation_id: quotationId,
                line_number: item.lineNumber,

                // Item reference
                item_id: item.item.id,
                item_name: item.item.name,
                item_type: item.item.type,
                hsn_sac: item.item.hsn_sac,
                unit_code: item.item.unit?.code || null,

                // Pricing
                quantity: item.quantity,
                unit_price: item.unitPrice,

                // Discount
                discount_type: item.discount.type,
                discount_value: item.discount.value,
                discount_amount: item.calculations.discountAmount,

                // GST
                gst_rate: item.gstConfig.rate,
                gst_type: item.gstConfig.type,

                // Calculated amounts
                base_amount: item.calculations.baseAmount,
                taxable_amount: item.calculations.taxableAmount,
                gst_amount: item.calculations.totalGstAmount,
                line_total: item.calculations.lineTotal,
            }));

            const { error } = await supabase
                .from('quotation_line_items')
                .insert(lineItemsToInsert);

            if (error) {
                console.error("Error creating quotation line items:", error);
                return false;
            }

            return true;
        } catch (error) {
            console.error("Unexpected error in createQuotationLineItems:", error);
            return false;
        }
    }
}
