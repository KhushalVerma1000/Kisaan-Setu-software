import { Invoice, InvoiceInterface } from "../../core/entities/invoice";
import { createClient } from "@/utils/supabase/server";

export interface InvoiceStatistics {
  totalInvoices: number;
  totalRevenue: number;
  averageInvoiceValue: number;
  totalOutstanding: number;
  paidInvoices: number;
  draftInvoices: number;
  sentInvoices: number;
  cancelledInvoices: number;
  overdueInvoices: number;
  overdueAmount: number;
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  monthlyGrowth: number;
  topCustomers: CustomerStatistics[];
  monthlyTrends: MonthlyTrend[];
  gstCollected: number;
  statusDistribution: StatusDistribution;
}

export interface CustomerStatistics {
  customerName: string;
  totalInvoices: number;
  totalAmount: number;
  averageInvoiceValue: number;
  lastInvoiceDate: Date;
  outstandingAmount: number;
}

export interface MonthlyTrend {
  month: string;
  year: number;
  totalInvoices: number;
  totalRevenue: number;
  averageInvoiceValue: number;
  paidInvoices: number;
  outstandingAmount: number;
}

export interface StatusDistribution {
  draft: { count: number; amount: number };
  sent: { count: number; amount: number };
  paid: { count: number; amount: number };
  cancelled: { count: number; amount: number };
}

export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

export interface TopItemsStatistics {
  itemName: string;
  totalQuantity: number;
  totalRevenue: number;
  averagePrice: number;
  invoiceCount: number;
}

export interface PaymentAnalytics {
  averagePaymentTime: number; // in days
  onTimePayments: number;
  latePayments: number;
  paymentTrends: PaymentTrend[];
}

export interface PaymentTrend {
  month: string;
  year: number;
  averagePaymentTime: number;
  onTimePaymentRate: number;
}

export function getInvoiceStatistics(
  fpoId: string,
  dateFilter: DateRangeFilter = {}
) {
  return async (): Promise<InvoiceStatistics> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();
      
      if (!user.data.user?.id) {
        console.error("User not authenticated");
        return getEmptyStatistics();
      }

      // Build base query
      let query = supabase
        .from('invoices')
        .select('*')
        .eq('fpo_id', fpoId);

      // Apply date filter if provided
      if (dateFilter.startDate) {
        query = query.gte('invoice_date', dateFilter.startDate.toISOString());
      }
      if (dateFilter.endDate) {
        query = query.lte('invoice_date', dateFilter.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching invoice statistics:", error);
        return getEmptyStatistics();
      }

      if (!data || data.length === 0) {
        return getEmptyStatistics();
      }

      const invoices = data.map(item => Invoice.fromDbFormat(item));
      return calculateStatistics(invoices);
    } catch (error) {
      console.error("Unexpected error fetching invoice statistics:", error);
      return getEmptyStatistics();
    }
  };
}

function calculateStatistics(invoices: Invoice[]): InvoiceStatistics {
  const totalInvoices = invoices.length;
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.summary.grandTotal, 0);
  const averageInvoiceValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

  // Status-based calculations
  const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
  const draftInvoices = invoices.filter(inv => inv.status === 'draft').length;
  const sentInvoices = invoices.filter(inv => inv.status === 'sent').length;
  const cancelledInvoices = invoices.filter(inv => inv.status === 'cancelled').length;

  // Outstanding amount (draft + sent invoices)
  const outstandingInvoices = invoices.filter(inv => inv.status === 'draft' || inv.status === 'sent');
  const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + inv.summary.grandTotal, 0);

  // Overdue calculations
  const overdueInvoices = invoices.filter(inv => inv.isOverdue(30)).length;
  const overdueAmount = invoices
    .filter(inv => inv.isOverdue(30))
    .reduce((sum, inv) => sum + inv.summary.grandTotal, 0);

  // Monthly revenue calculations
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const currentMonthInvoices = invoices.filter(inv => {
    const invDate = new Date(inv.invoiceDate);
    return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
  });
  const currentMonthRevenue = currentMonthInvoices.reduce((sum, inv) => sum + inv.summary.grandTotal, 0);

  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  
  const previousMonthInvoices = invoices.filter(inv => {
    const invDate = new Date(inv.invoiceDate);
    return invDate.getMonth() === previousMonth && invDate.getFullYear() === previousYear;
  });
  const previousMonthRevenue = previousMonthInvoices.reduce((sum, inv) => sum + inv.summary.grandTotal, 0);

  const monthlyGrowth = previousMonthRevenue > 0 
    ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
    : 0;

  // GST collected
  const gstCollected = invoices.reduce((sum, inv) => sum + inv.summary.totalGST, 0);

  // Status distribution
  const statusDistribution: StatusDistribution = {
    draft: {
      count: draftInvoices,
      amount: invoices.filter(inv => inv.status === 'draft').reduce((sum, inv) => sum + inv.summary.grandTotal, 0)
    },
    sent: {
      count: sentInvoices,
      amount: invoices.filter(inv => inv.status === 'sent').reduce((sum, inv) => sum + inv.summary.grandTotal, 0)
    },
    paid: {
      count: paidInvoices,
      amount: invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.summary.grandTotal, 0)
    },
    cancelled: {
      count: cancelledInvoices,
      amount: invoices.filter(inv => inv.status === 'cancelled').reduce((sum, inv) => sum + inv.summary.grandTotal, 0)
    }
  };

  // Top customers
  const topCustomers = calculateTopCustomers(invoices);

  // Monthly trends
  const monthlyTrends = calculateMonthlyTrends(invoices);

  return {
    totalInvoices,
    totalRevenue,
    averageInvoiceValue,
    totalOutstanding,
    paidInvoices,
    draftInvoices,
    sentInvoices,
    cancelledInvoices,
    overdueInvoices,
    overdueAmount,
    currentMonthRevenue,
    previousMonthRevenue,
    monthlyGrowth,
    topCustomers,
    monthlyTrends,
    gstCollected,
    statusDistribution
  };
}

function calculateTopCustomers(invoices: Invoice[]): CustomerStatistics[] {
  const customerMap = new Map<string, CustomerStatistics>();

  invoices.forEach(invoice => {
    const customerName = invoice.customer.name;
    const amount = invoice.summary.grandTotal;
    const invoiceDate = new Date(invoice.invoiceDate);
    const isOutstanding = invoice.status === 'draft' || invoice.status === 'sent';

    if (customerMap.has(customerName)) {
      const existing = customerMap.get(customerName)!;
      existing.totalInvoices += 1;
      existing.totalAmount += amount;
      existing.averageInvoiceValue = existing.totalAmount / existing.totalInvoices;
      
      if (invoiceDate > existing.lastInvoiceDate) {
        existing.lastInvoiceDate = invoiceDate;
      }
      
      if (isOutstanding) {
        existing.outstandingAmount += amount;
      }
    } else {
      customerMap.set(customerName, {
        customerName,
        totalInvoices: 1,
        totalAmount: amount,
        averageInvoiceValue: amount,
        lastInvoiceDate: invoiceDate,
        outstandingAmount: isOutstanding ? amount : 0
      });
    }
  });

  return Array.from(customerMap.values())
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10); // Top 10 customers
}

function calculateMonthlyTrends(invoices: Invoice[]): MonthlyTrend[] {
  const monthlyMap = new Map<string, MonthlyTrend>();

  invoices.forEach(invoice => {
    const date = new Date(invoice.invoiceDate);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    const amount = invoice.summary.grandTotal;
    const isPaid = invoice.status === 'paid';
    const isOutstanding = invoice.status === 'draft' || invoice.status === 'sent';

    if (monthlyMap.has(monthKey)) {
      const existing = monthlyMap.get(monthKey)!;
      existing.totalInvoices += 1;
      existing.totalRevenue += amount;
      existing.averageInvoiceValue = existing.totalRevenue / existing.totalInvoices;
      
      if (isPaid) {
        existing.paidInvoices += 1;
      }
      
      if (isOutstanding) {
        existing.outstandingAmount += amount;
      }
    } else {
      monthlyMap.set(monthKey, {
        month,
        year,
        totalInvoices: 1,
        totalRevenue: amount,
        averageInvoiceValue: amount,
        paidInvoices: isPaid ? 1 : 0,
        outstandingAmount: isOutstanding ? amount : 0
      });
    }
  });

  return Array.from(monthlyMap.values())
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return new Date(`${a.month} 1, ${a.year}`).getMonth() - new Date(`${b.month} 1, ${b.year}`).getMonth();
    })
    .slice(0, 12); // Last 12 months
}

function getEmptyStatistics(): InvoiceStatistics {
  return {
    totalInvoices: 0,
    totalRevenue: 0,
    averageInvoiceValue: 0,
    totalOutstanding: 0,
    paidInvoices: 0,
    draftInvoices: 0,
    sentInvoices: 0,
    cancelledInvoices: 0,
    overdueInvoices: 0,
    overdueAmount: 0,
    currentMonthRevenue: 0,
    previousMonthRevenue: 0,
    monthlyGrowth: 0,
    topCustomers: [],
    monthlyTrends: [],
    gstCollected: 0,
    statusDistribution: {
      draft: { count: 0, amount: 0 },
      sent: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 }
    }
  };
}

// Additional utility functions

export function getTopSellingItems(fpoId: string, limit: number = 10) {
  return async (): Promise<TopItemsStatistics[]> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();
      
      if (!user.data.user?.id) {
        console.error("User not authenticated");
        return [];
      }

      const { data, error } = await supabase
        .from('invoices')
        .select('items')
        .eq('fpo_id', fpoId)
        .in('status', ['paid', 'sent']); // Only consider paid and sent invoices

      if (error) {
        console.error("Error fetching top selling items:", error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      const itemsMap = new Map<string, TopItemsStatistics>();

      data.forEach(invoice => {
        const items = JSON.parse(invoice.items || '[]');
        items.forEach((item: any) => {
          const itemName = item.item.name;
          const quantity = item.quantity;
          const revenue = item.calculations.lineTotal;
          const price = item.unitPrice;

          if (itemsMap.has(itemName)) {
            const existing = itemsMap.get(itemName)!;
            existing.totalQuantity += quantity;
            existing.totalRevenue += revenue;
            existing.invoiceCount += 1;
            existing.averagePrice = existing.totalRevenue / existing.totalQuantity;
          } else {
            itemsMap.set(itemName, {
              itemName,
              totalQuantity: quantity,
              totalRevenue: revenue,
              averagePrice: price,
              invoiceCount: 1
            });
          }
        });
      });

      return Array.from(itemsMap.values())
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit);
    } catch (error) {
      console.error("Unexpected error fetching top selling items:", error);
      return [];
    }
  };
}

export function getRevenueByDateRange(
  fpoId: string,
  startDate: Date,
  endDate: Date,
  groupBy: 'day' | 'week' | 'month' = 'day'
) {
  return async (): Promise<{ date: string; revenue: number; invoiceCount: number }[]> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();
      
      if (!user.data.user?.id) {
        console.error("User not authenticated");
        return [];
      }

      const { data, error } = await supabase
        .from('invoices')
        .select('invoice_date, summary')
        .eq('fpo_id', fpoId)
        .gte('invoice_date', startDate.toISOString())
        .lte('invoice_date', endDate.toISOString())
        .in('status', ['paid', 'sent']);

      if (error) {
        console.error("Error fetching revenue by date range:", error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      const revenueMap = new Map<string, { revenue: number; invoiceCount: number }>();

      data.forEach(invoice => {
        const date = new Date(invoice.invoice_date);
        const summary = JSON.parse(invoice.summary || '{}');
        const revenue = summary.grandTotal || 0;

        let dateKey: string;
        if (groupBy === 'day') {
          dateKey = date.toISOString().split('T')[0];
        } else if (groupBy === 'week') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          dateKey = weekStart.toISOString().split('T')[0];
        } else {
          dateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        }

        if (revenueMap.has(dateKey)) {
          const existing = revenueMap.get(dateKey)!;
          existing.revenue += revenue;
          existing.invoiceCount += 1;
        } else {
          revenueMap.set(dateKey, { revenue, invoiceCount: 1 });
        }
      });

      return Array.from(revenueMap.entries())
        .map(([date, data]) => ({
          date,
          revenue: data.revenue,
          invoiceCount: data.invoiceCount
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error("Unexpected error fetching revenue by date range:", error);
      return [];
    }
  };
}

export function getPaymentAnalytics(fpoId: string) {
  return async (): Promise<PaymentAnalytics> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();
      
      if (!user.data.user?.id) {
        console.error("User not authenticated");
        return {
          averagePaymentTime: 0,
          onTimePayments: 0,
          latePayments: 0,
          paymentTrends: []
        };
      }

      const { data, error } = await supabase
        .from('invoices')
        .select('invoice_date, updated_at, status')
        .eq('fpo_id', fpoId)
        .eq('status', 'paid');

      if (error) {
        console.error("Error fetching payment analytics:", error);
        return {
          averagePaymentTime: 0,
          onTimePayments: 0,
          latePayments: 0,
          paymentTrends: []
        };
      }

      if (!data || data.length === 0) {
        return {
          averagePaymentTime: 0,
          onTimePayments: 0,
          latePayments: 0,
          paymentTrends: []
        };
      }

      const paymentTimes: number[] = [];
      let onTimePayments = 0;
      let latePayments = 0;
      const paymentDueDays = 30; // Assuming 30 days payment terms

      data.forEach(invoice => {
        const invoiceDate = new Date(invoice.invoice_date);
        const paidDate = new Date(invoice.updated_at);
        const paymentTime = Math.floor((paidDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
        
        paymentTimes.push(paymentTime);
        
        if (paymentTime <= paymentDueDays) {
          onTimePayments++;
        } else {
          latePayments++;
        }
      });

      const averagePaymentTime = paymentTimes.length > 0 
        ? paymentTimes.reduce((sum, time) => sum + time, 0) / paymentTimes.length 
        : 0;

      // Calculate payment trends by month
      const trendMap = new Map<string, { totalPayments: number; totalTime: number; onTime: number }>();

      data.forEach(invoice => {
        const paidDate = new Date(invoice.updated_at);
        const invoiceDate = new Date(invoice.invoice_date);
        const monthKey = `${paidDate.getFullYear()}-${paidDate.getMonth()}`;
        const month = paidDate.toLocaleString('default', { month: 'long' });
        const year = paidDate.getFullYear();
        const paymentTime = Math.floor((paidDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
        const isOnTime = paymentTime <= paymentDueDays;

        if (trendMap.has(monthKey)) {
          const existing = trendMap.get(monthKey)!;
          existing.totalPayments += 1;
          existing.totalTime += paymentTime;
          if (isOnTime) existing.onTime += 1;
        } else {
          trendMap.set(monthKey, {
            totalPayments: 1,
            totalTime: paymentTime,
            onTime: isOnTime ? 1 : 0
          });
        }
      });

      const paymentTrends: PaymentTrend[] = Array.from(trendMap.entries())
        .map(([key, data]) => {
          const [yearStr, monthStr] = key.split('-');
          const year = parseInt(yearStr);
          const monthIndex = parseInt(monthStr);
          const month = new Date(year, monthIndex).toLocaleString('default', { month: 'long' });
          
          return {
            month,
            year,
            averagePaymentTime: data.totalTime / data.totalPayments,
            onTimePaymentRate: (data.onTime / data.totalPayments) * 100
          };
        })
        .sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return new Date(`${a.month} 1, ${a.year}`).getMonth() - new Date(`${b.month} 1, ${b.year}`).getMonth();
        });

      return {
        averagePaymentTime,
        onTimePayments,
        latePayments,
        paymentTrends
      };
    } catch (error) {
      console.error("Unexpected error fetching payment analytics:", error);
      return {
        averagePaymentTime: 0,
        onTimePayments: 0,
        latePayments: 0,
        paymentTrends: []
      };
    }
  };
}

export function getGSTSummary(fpoId: string, dateFilter: DateRangeFilter = {}) {
  return async (): Promise<{
    totalGSTCollected: number;
    gstByRate: { [rate: string]: { taxable: number; gst: number } };
    monthlyGST: { month: string; year: number; gst: number }[];
  }> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();
      
      if (!user.data.user?.id) {
        console.error("User not authenticated");
        return {
          totalGSTCollected: 0,
          gstByRate: {},
          monthlyGST: []
        };
      }

      let query = supabase
        .from('invoices')
        .select('gst_breakdown, summary, invoice_date')
        .eq('fpo_id', fpoId)
        .in('status', ['paid', 'sent']);

      if (dateFilter.startDate) {
        query = query.gte('invoice_date', dateFilter.startDate.toISOString());
      }
      if (dateFilter.endDate) {
        query = query.lte('invoice_date', dateFilter.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching GST summary:", error);
        return {
          totalGSTCollected: 0,
          gstByRate: {},
          monthlyGST: []
        };
      }

      if (!data || data.length === 0) {
        return {
          totalGSTCollected: 0,
          gstByRate: {},
          monthlyGST: []
        };
      }

      let totalGSTCollected = 0;
      const gstByRate: { [rate: string]: { taxable: number; gst: number } } = {};
      const monthlyGSTMap = new Map<string, number>();

      data.forEach(invoice => {
        const summary = JSON.parse(invoice.summary || '{}');
        const gstBreakdown = JSON.parse(invoice.gst_breakdown || '{}');
        const invoiceDate = new Date(invoice.invoice_date);
        const monthKey = `${invoiceDate.getFullYear()}-${invoiceDate.getMonth()}`;
        const month = invoiceDate.toLocaleString('default', { month: 'long' });
        const year = invoiceDate.getFullYear();

        const invoiceGST = summary.totalGST || 0;
        totalGSTCollected += invoiceGST;

        // Monthly GST
        if (monthlyGSTMap.has(monthKey)) {
          monthlyGSTMap.set(monthKey, monthlyGSTMap.get(monthKey)! + invoiceGST);
        } else {
          monthlyGSTMap.set(monthKey, invoiceGST);
        }

        // GST by rate
        Object.entries(gstBreakdown).forEach(([rate, data]: [string, any]) => {
          if (gstByRate[rate]) {
            gstByRate[rate].taxable += data.taxable;
            gstByRate[rate].gst += data.gst;
          } else {
            gstByRate[rate] = {
              taxable: data.taxable,
              gst: data.gst
            };
          }
        });
      });

      const monthlyGST = Array.from(monthlyGSTMap.entries())
        .map(([key, gst]) => {
          const [yearStr, monthStr] = key.split('-');
          const year = parseInt(yearStr);
          const monthIndex = parseInt(monthStr);
          const month = new Date(year, monthIndex).toLocaleString('default', { month: 'long' });
          
          return { month, year, gst };
        })
        .sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return new Date(`${a.month} 1, ${a.year}`).getMonth() - new Date(`${b.month} 1, ${b.year}`).getMonth();
        });

      return {
        totalGSTCollected,
        gstByRate,
        monthlyGST
      };
    } catch (error) {
      console.error("Unexpected error fetching GST summary:", error);
      return {
        totalGSTCollected: 0,
        gstByRate: {},
        monthlyGST: []
      };
    }
  };
}