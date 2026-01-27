import { Invoice, InvoiceInterface } from "../../core/entities/invoice";
import { createClient } from "@/utils/supabase/server";
import { getFpoState } from "@/server/features/fpo/infrastructure/persistence/FpoProfileSupabase";

import { saveInvoiceLineItems, getInvoiceLineItems, deleteInvoiceLineItems, getInvoiceLineItemsAsSelectedItems } from "./invoiceLineItemsSupabase";
import { InvoiceLineItem } from "../../core/entities/InvoiceLineItem";

export function createInvoice(invoice: Invoice) {
  return async (): Promise<Invoice | null> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();

      if (!user.data.user?.id) {
        console.error("User not authenticated");
        return null;
      }

      // Get FPO state for GST calculation
      const fpoState = await getFpoState(invoice.fpoId);
      if (!fpoState) {
        console.error("Could not fetch FPO state for GST calculation");
        return null;
      }

      // Recalculate totals with proper GST breakdown
      await invoice.calculateTotals(fpoState);

      // Convert invoice to database format
      const dbData = invoice.toDbFormat();

      // Set created_by to current user
      dbData.created_by = user.data.user.id;

      // Remove id for creation (let DB generate it)
      delete dbData.id;

      // 1. Insert Invoice (Keep writing to 'items' JSONB for now)
      const { data, error } = await supabase
        .from('invoices')
        .insert(dbData)
        .select('*')
        .single();

      if (error) {
        console.error("Error creating invoice:", error);
        return null;
      }

      const createdInvoice = Invoice.fromDbFormat(data);
      const invoiceId = createdInvoice.id!;

      // 2. Insert Invoice Line Items and Create Inventory Transactions
      const lineItems = invoice.items.map(item => InvoiceLineItem.fromInterface({
        itemId: item.item.id,
        itemName: item.item.name,
        itemType: item.item.type,
        hsnSac: item.item.hsn_sac,
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
        invoiceId: invoiceId
      }));

      await saveInvoiceLineItems(invoiceId, invoice.fpoId, lineItems, {
        invoiceNumber: createdInvoice.invoiceNumber || '',
        customerName: invoice.customer.name,
        customerId: invoice.customer.id,
        invoiceDate: invoice.invoiceDate instanceof Date ? invoice.invoiceDate : new Date(invoice.invoiceDate)
      });

      return createdInvoice;
    } catch (error) {
      console.error("Unexpected error creating invoice:", error);
      return null;
    }
  };
}

export function getInvoiceById(invoiceId: string) {
  return async (): Promise<Invoice | null> => {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (error) {
        console.error("Error fetching invoice:", error);
        return null;
      }

      if (!data) {
        console.warn("No invoice found for ID:", invoiceId);
        return null;
      }

      // Fetch line items from the dedicated table instead of JSONB column
      const lineItems = await getInvoiceLineItemsAsSelectedItems(invoiceId);

      // Create invoice with items from line_items table
      const invoice = Invoice.fromDbFormat({ ...data, items: lineItems });

      // Recalculate GST with current FPO state (in case state was updated)
      const fpoState = await getFpoState(invoice.fpoId);
      if (fpoState) {
        await invoice.calculateTotals(fpoState);
      }

      return invoice;
    } catch (error) {
      console.error("Unexpected error fetching invoice:", error);
      return null;
    }
  };
}

export function getInvoiceByNumber(invoiceNumber: string, fpoId?: string) {
  return async (): Promise<Invoice | null> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();

      if (!user.data.user?.id) {
        console.error("User not authenticated");
        return null;
      }

      let query = supabase
        .from('invoices')
        .select('*')
        .eq('invoice_number', invoiceNumber);

      // If fpoId is provided, filter by it
      if (fpoId) {
        query = query.eq('fpo_id', fpoId);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error("Error fetching invoice by number:", error);
        return null;
      }

      // Fetch line items from the dedicated table
      const lineItems = await getInvoiceLineItemsAsSelectedItems(data.id);

      // Create invoice with items from line_items table
      const invoice = Invoice.fromDbFormat({ ...data, items: lineItems });

      // Recalculate GST with current FPO state
      const fpoState = await getFpoState(invoice.fpoId);
      if (fpoState) {
        await invoice.calculateTotals(fpoState);
      }

      return invoice;
    } catch (error) {
      console.error("Unexpected error fetching invoice by number:", error);
      return null;
    }
  };
}

export function updateInvoice(invoice: Invoice) {
  return async (): Promise<Invoice | null> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();

      if (!user.data.user?.id) {
        console.error("User not authenticated");
        return null;
      }

      if (!invoice.id) {
        console.error("Invoice ID is required for update");
        return null;
      }

      // Get FPO state for GST calculation
      const fpoState = await getFpoState(invoice.fpoId);
      if (!fpoState) {
        console.error("Could not fetch FPO state for GST calculation");
        return null;
      }

      // Recalculate totals with proper GST breakdown
      await invoice.calculateTotals(fpoState);

      // Convert invoice to database format
      const dbData = invoice.toDbFormat();

      // Ensure updated_at is set
      dbData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('invoices')
        .update(dbData)
        .eq('id', invoice.id)
        .select('*')
        .single();

      if (error) {
        console.error("Error updating invoice:", error);
        return null;
      }

      const updatedInvoice = Invoice.fromDbFormat(data);

      // Update line items and transactions
      const lineItems = invoice.items.map(item => InvoiceLineItem.fromInterface({
        itemId: item.item.id,
        itemName: item.item.name,
        itemType: item.item.type,
        hsnSac: item.item.hsn_sac,
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
        invoiceId: invoice.id!
      }));

      await saveInvoiceLineItems(invoice.id!, invoice.fpoId, lineItems, {
        invoiceNumber: updatedInvoice.invoiceNumber || '',
        customerName: invoice.customer.name,
        customerId: invoice.customer.id,
        invoiceDate: invoice.invoiceDate instanceof Date ? invoice.invoiceDate : new Date(invoice.invoiceDate)
      });

      return updatedInvoice;
    } catch (error) {
      console.error("Unexpected error updating invoice:", error);
      return null;
    }
  };
}

export function deleteInvoice(invoiceId: string) {
  return async (): Promise<boolean> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();

      if (!user.data.user?.id) {
        console.error("User not authenticated");
        return false;
      }

      // Delete line items and inventory transactions first
      await deleteInvoiceLineItems(invoiceId);

      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) {
        console.error("Error deleting invoice:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Unexpected error deleting invoice:", error);
      return false;
    }
  };
}

export function getNextInvoiceNumber(fpoId: string, prefix: string = 'INV') {
  return async (): Promise<string> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();

      if (!user.data.user?.id) {
        console.error("User not authenticated");
        return `${prefix}0001`;
      }

      // Get the latest invoice number with the given prefix for this FPO
      const { data, error } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('fpo_id', fpoId)
        .like('invoice_number', `${prefix}%`)
        .order('invoice_number', { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error fetching latest invoice number:", error);
        return `${prefix}0001`;
      }

      if (!data || data.length === 0) {
        return `${prefix}0001`;
      }

      // Extract the number part from the latest invoice number
      const latestNumber = data[0].invoice_number;
      const numberPart = latestNumber.replace(prefix, '');
      const nextNumber = parseInt(numberPart, 10) + 1;

      return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error("Unexpected error getting next invoice number:", error);
      return `${prefix}0001`;
    }
  };
}

// Additional utility functions

export function getInvoicesByFpo(fpoId: string, limit?: number, offset?: number) {
  return async (): Promise<{ invoices: Invoice[]; total: number } | null> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();

      if (!user.data.user?.id) {
        console.error("User not authenticated");
        return null;
      }

      let query = supabase
        .from('invoices')
        .select('*', { count: 'exact' })
        .eq('fpo_id', fpoId)
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      if (offset) {
        query = query.range(offset, offset + (limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching invoices by FPO:", error);
        return null;
      }

      const fpoState = await getFpoState(fpoId);
      const invoices = await Promise.all(
        (data || []).map(async (item) => {
          // Fetch line items from the dedicated table for each invoice
          const lineItems = await getInvoiceLineItemsAsSelectedItems(item.id);
          const invoice = Invoice.fromDbFormat({ ...item, items: lineItems });
          if (fpoState) {
            await invoice.calculateTotals(fpoState);
          }
          return invoice;
        })
      );

      return {
        invoices,
        total: count || 0
      };
    } catch (error) {
      console.error("Unexpected error fetching invoices by FPO:", error);
      return null;
    }
  };
}

export function validateGstCalculation(invoice: Invoice, fpoState: string): boolean {
  try {
    const shippingState = invoice.customer.shippingAddress?.state || invoice.customer.billingAddress.state;
    const isInterstate = shippingState !== fpoState;

    // Validate summary GST type matches expected
    const expectedGstType = isInterstate ? 'interstate' : 'intrastate';
    if (invoice.summary.gstType !== expectedGstType) {
      console.warn(`GST type mismatch. Expected: ${expectedGstType}, Got: ${invoice.summary.gstType}`);
      return false;
    }

    // Validate GST breakdown
    if (isInterstate) {
      // Interstate should have IGST only
      if (invoice.summary.totalCGST > 0 || invoice.summary.totalSGST > 0) {
        console.warn("Interstate invoice should not have CGST/SGST");
        return false;
      }
      if (invoice.summary.totalIGST !== invoice.summary.totalGST) {
        console.warn("Interstate invoice IGST should equal total GST");
        return false;
      }
    } else {
      // Intrastate should have CGST + SGST, no IGST
      if (invoice.summary.totalIGST > 0) {
        console.warn("Intrastate invoice should not have IGST");
        return false;
      }
      if (Math.abs(invoice.summary.totalCGST - invoice.summary.totalSGST) > 0.01) {
        console.warn("Intrastate invoice CGST and SGST should be equal");
        return false;
      }
      if (Math.abs((invoice.summary.totalCGST + invoice.summary.totalSGST) - invoice.summary.totalGST) > 0.01) {
        console.warn("Intrastate invoice CGST + SGST should equal total GST");
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error validating GST calculation:", error);
    return false;
  }
}

export function recalculateInvoiceGst(invoiceId: string) {
  return async (): Promise<Invoice | null> => {
    try {
      const invoice = await getInvoiceById(invoiceId)();
      if (!invoice) {
        console.error("Invoice not found for recalculation");
        return null;
      }

      const fpoState = await getFpoState(invoice.fpoId);
      if (!fpoState) {
        console.error("Could not fetch FPO state for recalculation");
        return null;
      }

      // Recalculate with current FPO state
      await invoice.calculateTotals(fpoState);

      // Validate the calculation
      const isValid = validateGstCalculation(invoice, fpoState);
      if (!isValid) {
        console.warn("GST calculation validation failed for invoice:", invoiceId);
      }

      // Update the invoice with recalculated values
      return await updateInvoice(invoice)();
    } catch (error) {
      console.error("Unexpected error recalculating invoice GST:", error);
      return null;
    }
  };
}

// Batch operation to recalculate GST for all invoices of an FPO
export function recalculateAllInvoicesForFpo(fpoId: string) {
  return async (): Promise<{ success: number; failed: number; errors: string[] }> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();

      if (!user.data.user?.id) {
        console.error("User not authenticated");
        return { success: 0, failed: 0, errors: ["User not authenticated"] };
      }

      // Get FPO state
      const fpoState = await getFpoState(fpoId);
      if (!fpoState) {
        return { success: 0, failed: 0, errors: ["Could not fetch FPO state"] };
      }

      // Get all invoices for this FPO
      const { data: invoicesData, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('fpo_id', fpoId);

      if (error) {
        console.error("Error fetching invoices for batch recalculation:", error);
        return { success: 0, failed: 0, errors: [error.message] };
      }

      if (!invoicesData || invoicesData.length === 0) {
        return { success: 0, failed: 0, errors: ["No invoices found for FPO"] };
      }

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Process each invoice
      for (const invoiceData of invoicesData) {
        try {
          const invoice = Invoice.fromDbFormat(invoiceData);

          // Recalculate GST
          await invoice.calculateTotals(fpoState);

          // Validate calculation
          const isValid = validateGstCalculation(invoice, fpoState);
          if (!isValid) {
            errors.push(`GST validation failed for invoice: ${invoice.invoiceNumber}`);
          }

          // Update in database
          const dbData = invoice.toDbFormat();
          dbData.updated_at = new Date().toISOString();

          const { error: updateError } = await supabase
            .from('invoices')
            .update(dbData)
            .eq('id', invoice.id);

          if (updateError) {
            failedCount++;
            errors.push(`Failed to update invoice ${invoice.invoiceNumber}: ${updateError.message}`);
          } else {
            successCount++;
          }
        } catch (invoiceError) {
          failedCount++;
          errors.push(`Error processing invoice: ${invoiceError instanceof Error ? invoiceError.message : 'Unknown error'}`);
        }
      }

      return { success: successCount, failed: failedCount, errors };
    } catch (error) {
      console.error("Unexpected error in batch recalculation:", error);
      return { success: 0, failed: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  };
}

// Helper function to get GST summary for reporting
export function getGstSummaryByFpo(fpoId: string, startDate?: Date, endDate?: Date) {
  return async (): Promise<{
    totalInvoices: number;
    interstateInvoices: number;
    intrastateInvoices: number;
    totalTaxable: number;
    totalCGST: number;
    totalSGST: number;
    totalIGST: number;
    totalGST: number;
    gstRateBreakdown: { [rate: string]: { count: number; taxable: number; gst: number; } };
  } | null> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();

      if (!user.data.user?.id) {
        console.error("User not authenticated");
        return null;
      }

      let query = supabase
        .from('invoices')
        .select('*')
        .eq('fpo_id', fpoId);

      if (startDate) {
        query = query.gte('invoice_date', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('invoice_date', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching invoices for GST summary:", error);
        return null;
      }

      if (!data || data.length === 0) {
        return {
          totalInvoices: 0,
          interstateInvoices: 0,
          intrastateInvoices: 0,
          totalTaxable: 0,
          totalCGST: 0,
          totalSGST: 0,
          totalIGST: 0,
          totalGST: 0,
          gstRateBreakdown: {}
        };
      }

      let totalInvoices = 0;
      let interstateInvoices = 0;
      let intrastateInvoices = 0;
      let totalTaxable = 0;
      let totalCGST = 0;
      let totalSGST = 0;
      let totalIGST = 0;
      let totalGST = 0;
      const gstRateBreakdown: { [rate: string]: { count: number; taxable: number; gst: number; } } = {};

      for (const invoiceData of data) {
        const invoice = Invoice.fromDbFormat(invoiceData);
        totalInvoices++;

        if (invoice.summary.gstType === 'interstate') {
          interstateInvoices++;
        } else {
          intrastateInvoices++;
        }

        totalTaxable += invoice.summary.subTotal - invoice.summary.totalDiscount;
        totalCGST += invoice.summary.totalCGST;
        totalSGST += invoice.summary.totalSGST;
        totalIGST += invoice.summary.totalIGST;
        totalGST += invoice.summary.totalGST;

        // Process GST breakdown by rate
        Object.entries(invoice.gstBreakdown).forEach(([rate, breakdown]) => {
          if (!gstRateBreakdown[rate]) {
            gstRateBreakdown[rate] = { count: 0, taxable: 0, gst: 0 };
          }
          gstRateBreakdown[rate].count += 1;
          gstRateBreakdown[rate].taxable += breakdown.taxable;
          gstRateBreakdown[rate].gst += breakdown.totalGst;
        });
      }

      return {
        totalInvoices,
        interstateInvoices,
        intrastateInvoices,
        totalTaxable,
        totalCGST,
        totalSGST,
        totalIGST,
        totalGST,
        gstRateBreakdown
      };
    } catch (error) {
      console.error("Unexpected error generating GST summary:", error);
      return null;
    }
  };
}