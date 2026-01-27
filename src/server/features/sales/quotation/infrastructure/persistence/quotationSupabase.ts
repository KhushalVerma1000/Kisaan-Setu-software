import { createClient } from "@/utils/supabase/server";
import { Quotation } from "../../core/entities/Quotation";
import { saveQuotationLineItems, getQuotationLineItems, deleteQuotationLineItems, getQuotationLineItemsAsSelectedItems } from "./quotationLineItemsSupabase";
import { QuotationLineItem } from "../../core/entities/QuotationLineItem";

export async function createQuotation(quotation: Quotation): Promise<Quotation | null> {
    try {
        const supabase = await createClient();
        const user = await supabase.auth.getUser();

        const dbData = quotation.toDbFormat();

        // Remove id for creation
        delete dbData.id;

        // Set created_by
        if (user.data.user?.id) {
            dbData.created_by = user.data.user.id;
        }

        const { data, error } = await supabase
            .from('quotations')
            .insert(dbData)
            .select()
            .single();

        if (error) {
            console.error("Error creating quotation:", error);
            return null;
        }

        const createdQuotation = Quotation.fromDbFormat(data);
        const quotationId = createdQuotation.id!;

        // Insert Line Items
        const lineItems = quotation.items.map(item => QuotationLineItem.fromInterface({
            itemId: item.item.id,
            itemName: item.item.name,
            itemType: item.item.type,
            hsnSac: item.item.hsn_sac || '',
            quantity: item.quantity,
            unitCode: item.item.unit?.code,
            unitPrice: item.unitPrice,
            discountType: item.discount.type,
            discountValue: item.discount.value,
            discountAmount: item.calculations.discountAmount,
            gstRate: item.gstConfig.rate,
            gstType: item.gstConfig.type,
            baseAmount: item.calculations.baseAmount,
            taxableAmount: item.calculations.taxableAmount,
            gstAmount: item.calculations.totalGstAmount,
            lineTotal: item.calculations.lineTotal,
            quotationId: quotationId
        }));

        await saveQuotationLineItems(quotationId, lineItems);

        return createdQuotation;
    } catch (error) {
        console.error("Unexpected error creating quotation:", error);
        return null;
    }
}

export async function getQuotationById(id: string): Promise<Quotation | null> {
    try {
        const supabase = await createClient();

        // Fetch quotation and line items
        // Note: We might need to join with items table manually or use select query builder
        // But for simplicity/standard supabase:
        const { data, error } = await supabase
            .from('quotations')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error("Error fetching quotation:", error);
            return null;
        }



        // Fetch line items from the dedicated table
        const lineItems = await getQuotationLineItemsAsSelectedItems(data.id);

        // Reconstruct quotation with items
        const quotation = Quotation.fromDbFormat({ ...data, items: lineItems });

        return quotation;
    } catch (error) {
        console.error("Unexpected error getting quotation:", error);
        return null;
    }
}

export async function deleteQuotation(id: string): Promise<boolean> {
    try {
        const supabase = await createClient();
        const { error } = await supabase
            .from('quotations')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error deleting quotation:", error);
            return false;
        }
        return true;
    } catch (error) {
        console.error("Unexpected error deleting quotation:", error);
        return false;
    }
}
