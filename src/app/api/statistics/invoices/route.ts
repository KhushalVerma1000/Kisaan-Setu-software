import { NextRequest, NextResponse } from 'next/server';
import { 
  getInvoiceStatistics,
  getTopSellingItems,
  getRevenueByDateRange,
  getPaymentAnalytics,
  getGSTSummary,
  DateRangeFilter,
  InvoiceStatistics,
  TopItemsStatistics,
  PaymentAnalytics
} from '@/server/features/sales/invoice/infrastructure/persistence/invoiceStatistics';

// Helper function to validate date parameters
function validateDateParams(startDate?: string, endDate?: string): { isValid: boolean; error?: string } {
  if (startDate && isNaN(new Date(startDate).getTime())) {
    return { isValid: false, error: 'Invalid start date format' };
  }
  
  if (endDate && isNaN(new Date(endDate).getTime())) {
    return { isValid: false, error: 'Invalid end date format' };
  }
  
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    return { isValid: false, error: 'Start date cannot be after end date' };
  }
  
  return { isValid: true };
}

// Main GET handler - handles different endpoints based on query parameters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fpoId = searchParams.get('fpoId');
    const endpoint = searchParams.get('endpoint'); // Add this to differentiate endpoints
    
    if (!fpoId) {
      return NextResponse.json(
        { error: 'FPO ID is required' },
        { status: 400 }
      );
    }

    // Parse date filters
    const dateFilter: DateRangeFilter = {};
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    if (startDate) {
      dateFilter.startDate = new Date(startDate);
    }
    if (endDate) {
      dateFilter.endDate = new Date(endDate);
    }

    // Route to different handlers based on endpoint parameter
    switch (endpoint) {
      case 'top-items':
        return await handleTopItems(request, fpoId);
      
      case 'revenue-trends':
        return await handleRevenueTrends(request, fpoId);
      
      case 'payment-analytics':
        return await handlePaymentAnalytics(request, fpoId);
      
      case 'gst-summary':
        return await handleGSTSummary(request, fpoId, dateFilter);
      
      case 'comprehensive':
        return await handleComprehensiveStats(request, fpoId, dateFilter);
      
      case 'dashboard':
        return await handleDashboardStats(request, fpoId);
      
      case 'fy-dashboard':
        return await handleFYDashboardStats(request, fpoId);
      
      default:
        // Default to overview statistics
        return await handleOverviewStats(request, fpoId, dateFilter);
    }
  } catch (error) {
    console.error('Error in statistics route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handler functions (internal, not exported)
async function handleOverviewStats(request: NextRequest, fpoId: string, dateFilter: DateRangeFilter) {
  const getStats = getInvoiceStatistics(fpoId, dateFilter);
  const statistics = await getStats();

  return NextResponse.json({
    success: true,
    data: statistics
  });
}

async function handleTopItems(request: NextRequest, fpoId: string) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');

  const getTopItems = getTopSellingItems(fpoId, limit);
  const topItems = await getTopItems();

  return NextResponse.json({
    success: true,
    data: topItems
  });
}

async function handleRevenueTrends(request: NextRequest, fpoId: string) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const groupBy = searchParams.get('groupBy') as 'day' | 'week' | 'month' || 'day';
  
  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'Start date and end date are required for revenue trends' },
      { status: 400 }
    );
  }

  const getRevenue = getRevenueByDateRange(
    fpoId,
    new Date(startDate),
    new Date(endDate),
    groupBy
  );
  const revenueData = await getRevenue();

  return NextResponse.json({
    success: true,
    data: revenueData
  });
}

async function handlePaymentAnalytics(request: NextRequest, fpoId: string) {
  const getPayments = getPaymentAnalytics(fpoId);
  const paymentAnalytics = await getPayments();

  return NextResponse.json({
    success: true,
    data: paymentAnalytics
  });
}

async function handleGSTSummary(request: NextRequest, fpoId: string, dateFilter: DateRangeFilter) {
  const getGST = getGSTSummary(fpoId, dateFilter);
  const gstSummary = await getGST();

  return NextResponse.json({
    success: true,
    data: gstSummary
  });
}

async function handleComprehensiveStats(request: NextRequest, fpoId: string, dateFilter: DateRangeFilter) {
  // Get all statistics in parallel
  const [
    statistics,
    topItems,
    paymentAnalytics,
    gstSummary
  ] = await Promise.all([
    getInvoiceStatistics(fpoId, dateFilter)(),
    getTopSellingItems(fpoId, 10)(),
    getPaymentAnalytics(fpoId)(),
    getGSTSummary(fpoId, dateFilter)()
  ]);

  return NextResponse.json({
    success: true,
    data: {
      overview: statistics,
      topSellingItems: topItems,
      paymentAnalytics,
      gstSummary
    }
  });
}

async function handleDashboardStats(request: NextRequest, fpoId: string) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '30'; // Default to 30 days

  // Calculate date range based on period
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - parseInt(period));

  const dateFilter: DateRangeFilter = {
    startDate,
    endDate
  };

  // Get dashboard-specific statistics
  const getStats = getInvoiceStatistics(fpoId, dateFilter);
  const statistics = await getStats();

  // Calculate additional dashboard metrics
  const dashboardData = {
    totalRevenue: statistics.totalRevenue,
    totalInvoices: statistics.totalInvoices,
    averageInvoiceValue: statistics.averageInvoiceValue,
    outstandingAmount: statistics.totalOutstanding,
    monthlyGrowth: statistics.monthlyGrowth,
    currentMonthRevenue: statistics.currentMonthRevenue,
    previousMonthRevenue: statistics.previousMonthRevenue,
    statusDistribution: statistics.statusDistribution,
    collectionEfficiency: statistics.totalRevenue > 0 
      ? ((statistics.totalRevenue - statistics.totalOutstanding) / statistics.totalRevenue) * 100 
      : 0,
    overdueRate: statistics.totalInvoices > 0 
      ? (statistics.overdueInvoices / statistics.totalInvoices) * 100 
      : 0,
    topCustomers: statistics.topCustomers.slice(0, 5),
    monthlyTrends: statistics.monthlyTrends.slice(0, 6)
  };

  return NextResponse.json({
    success: true,
    data: dashboardData,
    metadata: {
      period: parseInt(period),
      dateRange: { startDate, endDate }
    }
  });
}

async function handleFYDashboardStats(request: NextRequest, fpoId: string) {
  const { searchParams } = new URL(request.url);
  const fyYear = searchParams.get('fyYear');

  // Calculate Indian Financial Year dates
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  const currentFYYear = currentMonth < 3 ? currentYear - 1 : currentYear;
  const targetFYYear = fyYear ? parseInt(fyYear) : currentFYYear;
  
  // Indian FY: April 1 to March 31
  const startDate = new Date(targetFYYear, 3, 1);
  const endDate = new Date(targetFYYear + 1, 2, 31);

  const dateFilter: DateRangeFilter = {
    startDate,
    endDate
  };

  const getStats = getInvoiceStatistics(fpoId, dateFilter);
  const statistics = await getStats();

  const dashboardData = {
    totalRevenue: statistics.totalRevenue,
    totalInvoices: statistics.totalInvoices,
    averageInvoiceValue: statistics.averageInvoiceValue,
    outstandingAmount: statistics.totalOutstanding,
    monthlyGrowth: statistics.monthlyGrowth,
    currentMonthRevenue: statistics.currentMonthRevenue,
    previousMonthRevenue: statistics.previousMonthRevenue,
    statusDistribution: statistics.statusDistribution,
    collectionEfficiency: statistics.totalRevenue > 0 
      ? ((statistics.totalRevenue - statistics.totalOutstanding) / statistics.totalRevenue) * 100 
      : 0,
    overdueRate: statistics.totalInvoices > 0 
      ? (statistics.overdueInvoices / statistics.totalInvoices) * 100 
      : 0,
    topCustomers: statistics.topCustomers?.slice(0, 5) || [],
    monthlyTrends: statistics.monthlyTrends?.slice(0, 6) || []
  };

  return NextResponse.json({
    success: true,
    data: dashboardData,
    metadata: {
      financialYear: `FY ${targetFYYear}-${targetFYYear + 1}`,
      dateRange: { startDate, endDate }
    }
  });
}

// Types for API responses
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
  data: {
    date: string;
    revenue: number;
    invoiceCount: number;
  }[];
}

export interface PaymentAnalyticsResponse {
  success: boolean;
  data: PaymentAnalytics;
}

export interface GSTSummaryResponse {
  success: boolean;
  data: {
    totalGSTCollected: number;
    gstByRate: { [rate: string]: { taxable: number; gst: number } };
    monthlyGST: { month: string; year: number; gst: number }[];
  };
}

export interface ComprehensiveStatsResponse {
  success: boolean;
  data: {
    overview: InvoiceStatistics;
    topSellingItems: TopItemsStatistics[];
    paymentAnalytics: PaymentAnalytics;
    gstSummary: {
      totalGSTCollected: number;
      gstByRate: { [rate: string]: { taxable: number; gst: number } };
      monthlyGST: { month: string; year: number; gst: number }[];
    };
  };
}

export interface DashboardStatsResponse {
  success: boolean;
  data: {
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
  };
  metadata: {
    period: number;
    dateRange: { startDate: Date; endDate: Date };
  };
}