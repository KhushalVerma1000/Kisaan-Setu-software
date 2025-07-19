import { Invoice, InvoiceInterface } from "../../core/entities/invoice";
import { createClient } from "@/utils/supabase/server";

export interface InvoiceFilters {
  status?: 'draft' | 'sent' | 'paid' | 'cancelled';
  dateFrom?: Date;
  dateTo?: Date;
  customerName?: string;
  invoiceNumber?: string;
  fpoId?: string;
}

export interface InvoicePaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: 'invoice_date' | 'invoice_number' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface InvoiceQueryResult {
  invoices: Invoice[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function getInvoices(
  filters: InvoiceFilters = {},
  options: InvoicePaginationOptions = {}
) {
  return async (): Promise<InvoiceQueryResult> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();
      
      if (!user.data.user?.id) {
        console.error("User not authenticated");
        return {
          invoices: [],
          total: 0,
          page: 1,
          limit: 10,
          hasNext: false,
          hasPrev: false
        };
      }

      const {
        page = 1,
        limit = 10,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options;

      const {
        status,
        dateFrom,
        dateTo,
        customerName,
        invoiceNumber,
        fpoId
      } = filters;

      // Build the base query
      let query = supabase
        .from('invoices')
        .select('*', { count: 'exact' });

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }

      if (dateFrom) {
        query = query.gte('invoice_date', dateFrom.toISOString());
      }

      if (dateTo) {
        query = query.lte('invoice_date', dateTo.toISOString());
      }

      if (customerName) {
        query = query.ilike('customer->>name', `%${customerName}%`);
      }

      if (invoiceNumber) {
        query = query.ilike('invoice_number', `%${invoiceNumber}%`);
      }

      if (fpoId) {
        query = query.eq('fpo_id', fpoId);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching invoices:", error);
        return {
          invoices: [],
          total: 0,
          page,
          limit,
          hasNext: false,
          hasPrev: false
        };
      }

      const invoices = data?.map(item => Invoice.fromDbFormat(item)) || [];
      const total = count || 0;

      return {
        invoices,
        total,
        page,
        limit,
        hasNext: offset + limit < total,
        hasPrev: page > 1
      };
    } catch (error) {
      console.error("Unexpected error fetching invoices:", error);
      return {
        invoices: [],
        total: 0,
        page: 1,
        limit: 10,
        hasNext: false,
        hasPrev: false
      };
    }
  };
}

export function getInvoicesByFpoId(fpoId: string, options: InvoicePaginationOptions = {}) {
  return async (): Promise<InvoiceQueryResult> => {
    const filters: InvoiceFilters = { fpoId };
    return getInvoices(filters, options)();
  };
}

export function getInvoicesByStatus(
  status: 'draft' | 'sent' | 'paid' | 'cancelled',
  options: InvoicePaginationOptions = {}
) {
  return async (): Promise<InvoiceQueryResult> => {
    const filters: InvoiceFilters = { status };
    return getInvoices(filters, options)();
  };
}

export function getInvoicesByDateRange(
  dateFrom: Date,
  dateTo: Date,
  options: InvoicePaginationOptions = {}
) {
  return async (): Promise<InvoiceQueryResult> => {
    const filters: InvoiceFilters = { dateFrom, dateTo };
    return getInvoices(filters, options)();
  };
}

export function searchInvoices(
  searchTerm: string,
  options: InvoicePaginationOptions = {}
) {
  return async (): Promise<InvoiceQueryResult> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();
      
      if (!user.data.user?.id) {
        console.error("User not authenticated");
        return {
          invoices: [],
          total: 0,
          page: 1,
          limit: 10,
          hasNext: false,
          hasPrev: false
        };
      }

      const {
        page = 1,
        limit = 10,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options;

      // Search in invoice number, customer name, and notes
      let query = supabase
        .from('invoices')
        .select('*', { count: 'exact' })
        .or(`invoice_number.ilike.%${searchTerm}%,customer->>name.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error("Error searching invoices:", error);
        return {
          invoices: [],
          total: 0,
          page,
          limit,
          hasNext: false,
          hasPrev: false
        };
      }

      const invoices = data?.map(item => Invoice.fromDbFormat(item)) || [];
      const total = count || 0;

      return {
        invoices,
        total,
        page,
        limit,
        hasNext: offset + limit < total,
        hasPrev: page > 1
      };
    } catch (error) {
      console.error("Unexpected error searching invoices:", error);
      return {
        invoices: [],
        total: 0,
        page: 1,
        limit: 10,
        hasNext: false,
        hasPrev: false
      };
    }
  };
}

export function getOverdueInvoices(daysOverdue: number = 30, options: InvoicePaginationOptions = {}) {
  return async (): Promise<InvoiceQueryResult> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();
      
      if (!user.data.user?.id) {
        console.error("User not authenticated");
        return {
          invoices: [],
          total: 0,
          page: 1,
          limit: 10,
          hasNext: false,
          hasPrev: false
        };
      }

      const {
        page = 1,
        limit = 10,
        sortBy = 'invoice_date',
        sortOrder = 'asc'
      } = options;

      // Calculate the cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOverdue);

      let query = supabase
        .from('invoices')
        .select('*', { count: 'exact' })
        .in('status', ['draft', 'sent']) // Only unpaid invoices
        .lt('invoice_date', cutoffDate.toISOString());

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching overdue invoices:", error);
        return {
          invoices: [],
          total: 0,
          page,
          limit,
          hasNext: false,
          hasPrev: false
        };
      }

      const invoices = data?.map(item => Invoice.fromDbFormat(item)) || [];
      const total = count || 0;

      return {
        invoices,
        total,
        page,
        limit,
        hasNext: offset + limit < total,
        hasPrev: page > 1
      };
    } catch (error) {
      console.error("Unexpected error fetching overdue invoices:", error);
      return {
        invoices: [],
        total: 0,
        page: 1,
        limit: 10,
        hasNext: false,
        hasPrev: false
      };
    }
  };
}