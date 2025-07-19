import { Invoice, InvoiceInterface } from "../../core/entities/invoice";
import { createClient } from "@/utils/supabase/server";

export function createInvoice(invoice: Invoice) {
  return async (): Promise<Invoice | null> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();
      
      if (!user.data.user?.id) {
        console.error("User not authenticated");
        return null;
      }

      // Convert invoice to database format
      const dbData = invoice.toDbFormat();
      
      // Set created_by to current user
      dbData.created_by = user.data.user.id;
      
      // Remove id for creation (let DB generate it)
      delete dbData.id;

      const { data, error } = await supabase
        .from('invoices')
        .insert(dbData)
        .select('*')
        .single();

      if (error) {
        console.error("Error creating invoice:", error);
        return null;
      }

      return Invoice.fromDbFormat(data);
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
      const user = await supabase.auth.getUser();
      
      if (!user.data.user?.id) {
        console.error("User not authenticated");
        return null;
      }

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

      return Invoice.fromDbFormat(data);
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

      return Invoice.fromDbFormat(data);
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

      return Invoice.fromDbFormat(data);
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