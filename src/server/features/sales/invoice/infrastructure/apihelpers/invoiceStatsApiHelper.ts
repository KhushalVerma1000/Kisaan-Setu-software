// Client-side API helper functions for Invoice Statistics
// @/server/features/sales/invoice/infrastructure/invoiceStatsApiHelper.ts

const STATS_API_BASE_URL = '/api/statistics/invoices';

// Type definitions matching your route.ts file
export interface InvoiceStatistics {
  totalRevenue: number;
  totalInvoices: number;
  averageInvoiceValue: number;
  totalOutstanding: number;
  monthlyGrowth: number;
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  statusDistribution: any;
  overdueInvoices: number;
  topCustomers: any[];
  monthlyTrends: any[];
}

export interface TopItemsStatistics {
  itemName: string;
  quantity: number;
  revenue: number;
  invoiceCount: number;
}

export interface PaymentAnalytics {
  totalReceived: number;
  totalPending: number;
  averagePaymentTime: number;
  paymentMethods: { [method: string]: number };
  overdueAmount: number;
}

export interface GSTSummary {
  totalGSTCollected: number;
  gstByRate: { [rate: string]: { taxable: number; gst: number } };
  monthlyGST: { month: string; year: number; gst: number }[];
}

export interface RevenueTrend {
  date: string;
  revenue: number;
  invoiceCount: number;
}

export interface DashboardStats {
  totalRevenue: number;
  totalInvoices: number;
  averageInvoiceValue: number;
  outstandingAmount: number;
  monthlyGrowth: number;
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  statusDistribution: any;
  collectionEfficiency: number;
  overdueRate: number;
  topCustomers: any[];
  monthlyTrends: any[];
}

// API Response interfaces
export interface StatisticsOverviewResponse {
  success: boolean;
  data: InvoiceStatistics;
}

export interface TopItemsResponse {
  success: boolean;
  data: TopItemsStatistics[];
}

export interface RevenueTrendsResponse {
  success: boolean;
  data: RevenueTrend[];
}

export interface PaymentAnalyticsResponse {
  success: boolean;
  data: PaymentAnalytics;
}

export interface GSTSummaryResponse {
  success: boolean;
  data: GSTSummary;
}

export interface ComprehensiveStatsResponse {
  success: boolean;
  data: {
    overview: InvoiceStatistics;
    topSellingItems: TopItemsStatistics[];
    paymentAnalytics: PaymentAnalytics;
    gstSummary: GSTSummary;
  };
}

export interface DashboardStatsResponse {
  success: boolean;
  data: DashboardStats;
  metadata: {
    period: number;
    dateRange: { startDate: Date; endDate: Date };
  };
}

export interface FYDashboardStatsResponse {
  success: boolean;
  data: DashboardStats;
  metadata: {
    financialYear: string;
    dateRange: { startDate: Date; endDate: Date };
  };
}

export class InvoiceStatsAPI {
  
  // ===== OVERVIEW STATISTICS =====
  
  /**
   * Get invoice overview statistics (default endpoint)
   * @param fpoId - FPO ID
   * @param dateFilter - Optional date range filter
   */
  static async getOverviewStatistics(
    fpoId: string, 
    dateFilter?: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<StatisticsOverviewResponse> {
    const params = new URLSearchParams();
    params.append('fpoId', fpoId);
    
    if (dateFilter?.startDate) {
      params.append('startDate', dateFilter.startDate);
    }
    if (dateFilter?.endDate) {
      params.append('endDate', dateFilter.endDate);
    }

    const response = await fetch(`${STATS_API_BASE_URL}?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch overview statistics');
    return response.json();
  }

  // ===== TOP SELLING ITEMS =====
  
  /**
   * Get top selling items
   * @param fpoId - FPO ID
   * @param limit - Number of items to return (default: 10)
   */
  static async getTopSellingItems(
    fpoId: string, 
    limit: number = 10
  ): Promise<TopItemsResponse> {
    const params = new URLSearchParams();
    params.append('fpoId', fpoId);
    params.append('endpoint', 'top-items');
    params.append('limit', limit.toString());

    const response = await fetch(`${STATS_API_BASE_URL}?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch top selling items');
    return response.json();
  }

  // ===== REVENUE TRENDS =====
  
  /**
   * Get revenue trends
   * @param fpoId - FPO ID
   * @param startDate - Start date (required)
   * @param endDate - End date (required)
   * @param groupBy - Group by period (day, week, month)
   */
  static async getRevenueTrends(
    fpoId: string, 
    startDate: string, 
    endDate: string, 
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<RevenueTrendsResponse> {
    const params = new URLSearchParams();
    params.append('fpoId', fpoId);
    params.append('endpoint', 'revenue-trends');
    params.append('startDate', startDate);
    params.append('endDate', endDate);
    params.append('groupBy', groupBy);

    const response = await fetch(`${STATS_API_BASE_URL}?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch revenue trends');
    return response.json();
  }

  // ===== PAYMENT ANALYTICS =====
  
  /**
   * Get payment analytics
   * @param fpoId - FPO ID
   */
  static async getPaymentAnalytics(fpoId: string): Promise<PaymentAnalyticsResponse> {
    const params = new URLSearchParams();
    params.append('fpoId', fpoId);
    params.append('endpoint', 'payment-analytics');

    const response = await fetch(`${STATS_API_BASE_URL}?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch payment analytics');
    return response.json();
  }

  // ===== GST SUMMARY =====
  
  /**
   * Get GST summary
   * @param fpoId - FPO ID
   * @param dateFilter - Optional date range filter
   */
  static async getGSTSummary(
    fpoId: string, 
    dateFilter?: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<GSTSummaryResponse> {
    const params = new URLSearchParams();
    params.append('fpoId', fpoId);
    params.append('endpoint', 'gst-summary');
    
    if (dateFilter?.startDate) {
      params.append('startDate', dateFilter.startDate);
    }
    if (dateFilter?.endDate) {
      params.append('endDate', dateFilter.endDate);
    }

    const response = await fetch(`${STATS_API_BASE_URL}?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch GST summary');
    return response.json();
  }

  // ===== COMPREHENSIVE STATISTICS =====
  
  /**
   * Get comprehensive statistics (all stats in one call)
   * @param fpoId - FPO ID
   * @param dateFilter - Optional date range filter
   */
  static async getComprehensiveStatistics(
    fpoId: string, 
    dateFilter?: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<ComprehensiveStatsResponse> {
    const params = new URLSearchParams();
    params.append('fpoId', fpoId);
    params.append('endpoint', 'comprehensive');
    
    if (dateFilter?.startDate) {
      params.append('startDate', dateFilter.startDate);
    }
    if (dateFilter?.endDate) {
      params.append('endDate', dateFilter.endDate);
    }

    const response = await fetch(`${STATS_API_BASE_URL}?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch comprehensive statistics');
    return response.json();
  }

  // ===== DASHBOARD STATISTICS =====
  
  /**
   * Get dashboard statistics
   * @param fpoId - FPO ID
   * @param period - Period in days (default: 30)
   */
  static async getDashboardStatistics(
    fpoId: string, 
    period: number = 30
  ): Promise<DashboardStatsResponse> {
    const params = new URLSearchParams();
    params.append('fpoId', fpoId);
    params.append('endpoint', 'dashboard');
    params.append('period', period.toString());

    const response = await fetch(`${STATS_API_BASE_URL}?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch dashboard statistics');
    return response.json();
  }

  // ===== FINANCIAL YEAR DASHBOARD =====
  
  /**
   * Get Financial Year dashboard statistics
   * @param fpoId - FPO ID
   * @param fyYear - Financial year starting year (optional, defaults to current FY)
   */
  static async getFYDashboardStatistics(
    fpoId: string, 
    fyYear?: number
  ): Promise<FYDashboardStatsResponse> {
    const params = new URLSearchParams();
    params.append('fpoId', fpoId);
    params.append('endpoint', 'fy-dashboard');
    
    if (fyYear) {
      params.append('fyYear', fyYear.toString());
    }

    const response = await fetch(`${STATS_API_BASE_URL}?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch FY dashboard statistics');
    return response.json();
  }

  // ===== CONVENIENCE METHODS =====

  /**
   * Get statistics for a specific date range with all components
   * @param fpoId - FPO ID
   * @param startDate - Start date
   * @param endDate - End date
   * @param includeRevenueTrends - Whether to include revenue trends
   * @param groupBy - Group by period for revenue trends
   */
  static async getStatisticsForDateRange(
    fpoId: string, 
    startDate: string, 
    endDate: string,
    includeRevenueTrends: boolean = false,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ) {
    const dateFilter = { startDate, endDate };
    
    try {
      if (includeRevenueTrends) {
        // Handle revenue trends separately to avoid type conflicts
        const [overview, gstSummary, topSellingItems, paymentAnalytics, revenueTrends] = await Promise.all([
          this.getOverviewStatistics(fpoId, dateFilter),
          this.getGSTSummary(fpoId, dateFilter),
          this.getTopSellingItems(fpoId, 10),
          this.getPaymentAnalytics(fpoId),
          this.getRevenueTrends(fpoId, startDate, endDate, groupBy)
        ]);

        return {
          overview,
          gstSummary,
          topSellingItems,
          paymentAnalytics,
          revenueTrends
        };
      } else {
        // Without revenue trends
        const [overview, gstSummary, topSellingItems, paymentAnalytics] = await Promise.all([
          this.getOverviewStatistics(fpoId, dateFilter),
          this.getGSTSummary(fpoId, dateFilter),
          this.getTopSellingItems(fpoId, 10),
          this.getPaymentAnalytics(fpoId)
        ]);

        return {
          overview,
          gstSummary,
          topSellingItems,
          paymentAnalytics
        };
      }
    } catch (error) {
      throw new Error('Failed to fetch statistics for date range');
    }
  }

  /**
   * Get current month statistics
   */
  static async getCurrentMonthStatistics(fpoId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return this.getStatisticsForDateRange(
      fpoId,
      startOfMonth.toISOString().split('T')[0],
      endOfMonth.toISOString().split('T')[0],
      true,
      'day'
    );
  }

  /**
   * Get year-to-date statistics
   */
  static async getYearToDateStatistics(fpoId: string) {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return this.getStatisticsForDateRange(
      fpoId,
      startOfYear.toISOString().split('T')[0],
      now.toISOString().split('T')[0],
      true,
      'month'
    );
  }

  /**
   * Get last 30 days statistics
   */
  static async getLast30DaysStatistics(fpoId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    return this.getStatisticsForDateRange(
      fpoId,
      thirtyDaysAgo.toISOString().split('T')[0],
      now.toISOString().split('T')[0],
      true,
      'day'
    );
  }

  /**
   * Get last 12 months statistics
   */
  static async getLast12MonthsStatistics(fpoId: string) {
    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(now.getMonth() - 12);

    return this.getStatisticsForDateRange(
      fpoId,
      twelveMonthsAgo.toISOString().split('T')[0],
      now.toISOString().split('T')[0],
      true,
      'month'
    );
  }
}

// ===== FINANCIAL YEAR HELPER =====

export class FinancialYearHelper {
  
  /**
   * Get Indian Financial Year dates (April 1 to March 31)
   * @param year - Starting year of the financial year
   */
  static getIndianFYDates(year: number) {
    const startDate = new Date(year, 3, 1); // April 1st
    const endDate = new Date(year + 1, 2, 31); // March 31st next year
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      fyLabel: `FY ${year}-${year + 1}`
    };
  }
  
  /**
   * Get current, previous, and previous-to-previous FY dates
   */
  static getFYRanges() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    // If current month is Jan-Mar, we're still in previous calendar year's FY
    const currentFYYear = currentMonth < 3 ? currentYear - 1 : currentYear;
    
    return {
      current: this.getIndianFYDates(currentFYYear),
      previous: this.getIndianFYDates(currentFYYear - 1),
      previousToPrevious: this.getIndianFYDates(currentFYYear - 2)
    };
  }

  /**
   * Get current financial year starting year
   */
  static getCurrentFYYear(): number {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    return currentMonth < 3 ? currentYear - 1 : currentYear;
  }
}

// ===== EXTENDED FINANCIAL YEAR API =====

export class InvoiceStatsAPIExtended extends InvoiceStatsAPI {
  
  /**
   * Get current financial year dashboard statistics
   */
  static async getCurrentFYDashboard(fpoId: string): Promise<FYDashboardStatsResponse> {
    return this.getFYDashboardStatistics(fpoId); // No fyYear = current FY
  }

  /**
   * Get previous financial year dashboard statistics
   */
  static async getPreviousFYDashboard(fpoId: string): Promise<FYDashboardStatsResponse> {
    const currentFYYear = FinancialYearHelper.getCurrentFYYear();
    return this.getFYDashboardStatistics(fpoId, currentFYYear - 1);
  }

  /**
   * Get previous to previous financial year dashboard statistics
   */
  static async getPreviousToPreviousFYDashboard(fpoId: string): Promise<FYDashboardStatsResponse> {
    const currentFYYear = FinancialYearHelper.getCurrentFYYear();
    return this.getFYDashboardStatistics(fpoId, currentFYYear - 2);
  }

  /**
   * Get current financial year comprehensive statistics
   */
  static async getCurrentFYStatistics(fpoId: string) {
    const { current } = FinancialYearHelper.getFYRanges();
    
    return {
      ...(await this.getStatisticsForDateRange(
        fpoId,
        current.startDate,
        current.endDate,
        true, // Include revenue trends
        'month' // Group by month for FY view
      )),
      financialYear: current.fyLabel,
      dateRange: {
        startDate: current.startDate,
        endDate: current.endDate
      }
    };
  }

  /**
   * Get previous financial year comprehensive statistics
   */
  static async getPreviousFYStatistics(fpoId: string) {
    const { previous } = FinancialYearHelper.getFYRanges();
    
    return {
      ...(await this.getStatisticsForDateRange(
        fpoId,
        previous.startDate,
        previous.endDate,
        true,
        'month'
      )),
      financialYear: previous.fyLabel,
      dateRange: {
        startDate: previous.startDate,
        endDate: previous.endDate
      }
    };
  }

  /**
   * Get all three financial years dashboard statistics with comparison
   */
  static async getAllFYDashboards(fpoId: string) {
    try {
      const [current, previous, previousToPrevious] = await Promise.all([
        this.getCurrentFYDashboard(fpoId),
        this.getPreviousFYDashboard(fpoId), 
        this.getPreviousToPreviousFYDashboard(fpoId)
      ]);

      return {
        currentFY: current,
        previousFY: previous,
        previousToPreviousFY: previousToPrevious,
        comparison: {
          currentVsPrevious: {
            revenueGrowth: this.calculateGrowthPercentage(
              current.data.totalRevenue,
              previous.data.totalRevenue
            ),
            invoiceGrowth: this.calculateGrowthPercentage(
              current.data.totalInvoices,
              previous.data.totalInvoices
            ),
            collectionEfficiencyChange: current.data.collectionEfficiency - previous.data.collectionEfficiency,
            overdueRateChange: current.data.overdueRate - previous.data.overdueRate
          },
          previousVsPreviousToPrevious: {
            revenueGrowth: this.calculateGrowthPercentage(
              previous.data.totalRevenue,
              previousToPrevious.data.totalRevenue
            ),
            invoiceGrowth: this.calculateGrowthPercentage(
              previous.data.totalInvoices,
              previousToPrevious.data.totalInvoices
            )
          }
        }
      };
    } catch (error) {
      throw new Error('Failed to fetch all FY dashboard statistics');
    }
  }

  /**
   * Get specific financial year dashboard statistics
   * @param fpoId - FPO ID
   * @param fyStartYear - Financial year starting year
   */
  static async getCustomFYDashboard(fpoId: string, fyStartYear: number): Promise<FYDashboardStatsResponse> {
    return this.getFYDashboardStatistics(fpoId, fyStartYear);
  }

  /**
   * Get specific financial year comprehensive statistics
   * @param fpoId - FPO ID
   * @param fyStartYear - Financial year starting year
   */
  static async getCustomFYStatistics(fpoId: string, fyStartYear: number) {
    const fyDates = FinancialYearHelper.getIndianFYDates(fyStartYear);
    
    return {
      ...(await this.getStatisticsForDateRange(
        fpoId,
        fyDates.startDate,
        fyDates.endDate,
        true,
        'month'
      )),
      financialYear: fyDates.fyLabel,
      dateRange: {
        startDate: fyDates.startDate,
        endDate: fyDates.endDate
      }
    };
  }

  /**
   * Utility method to calculate growth percentage
   */
  private static calculateGrowthPercentage(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }
}

// ===== USAGE EXAMPLES =====

/*
// Basic usage examples:

// 1. Get overview statistics
const overview = await InvoiceStatsAPI.getOverviewStatistics('fpo123');

// 2. Get overview with date filter
const overviewFiltered = await InvoiceStatsAPI.getOverviewStatistics('fpo123', {
  startDate: '2024-01-01',
  endDate: '2024-12-31'
});

// 3. Get top selling items
const topItems = await InvoiceStatsAPI.getTopSellingItems('fpo123', 5);

// 4. Get revenue trends
const revenueTrends = await InvoiceStatsAPI.getRevenueTrends(
  'fpo123', 
  '2024-01-01', 
  '2024-12-31', 
  'month'
);

// 5. Get payment analytics
const paymentAnalytics = await InvoiceStatsAPI.getPaymentAnalytics('fpo123');

// 6. Get GST summary
const gstSummary = await InvoiceStatsAPI.getGSTSummary('fpo123', {
  startDate: '2024-04-01',
  endDate: '2025-03-31'
});

// 7. Get comprehensive statistics
const comprehensive = await InvoiceStatsAPI.getComprehensiveStatistics('fpo123');

// 8. Get dashboard statistics (last 30 days)
const dashboard = await InvoiceStatsAPI.getDashboardStatistics('fpo123', 30);

// 9. Get current FY dashboard
const fyDashboard = await InvoiceStatsAPI.getFYDashboardStatistics('fpo123');

// 10. Get specific FY dashboard
const specificFYDashboard = await InvoiceStatsAPI.getFYDashboardStatistics('fpo123', 2023);

// Extended usage examples:

// 11. Get current FY dashboard
const currentFYDashboard = await InvoiceStatsAPIExtended.getCurrentFYDashboard('fpo123');

// 12. Get all three FY dashboards with comparison
const allFYDashboards = await InvoiceStatsAPIExtended.getAllFYDashboards('fpo123');

// 13. Get current month statistics
const currentMonth = await InvoiceStatsAPI.getCurrentMonthStatistics('fpo123');

// 14. Get last 12 months statistics
const last12Months = await InvoiceStatsAPI.getLast12MonthsStatistics('fpo123');

// 15. Get custom date range statistics
const customRange = await InvoiceStatsAPI.getStatisticsForDateRange(
  'fpo123',
  '2024-01-01',
  '2024-06-30',
  true, // include revenue trends
  'week' // group by week
);
*/