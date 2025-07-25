"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useHeaderButtons } from "@/hooks/useHeaderButtons";
import { useRouter } from "next/navigation";
import { Search, FileDown, Plus, Eye, Edit, Trash2, MoreHorizontal, Download, Send, CreditCard, AlertTriangle } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { InvoiceAPI } from '@/server/features/sales/invoice/infrastructure/apihelpers/invoiceApi';
import { InvoiceInterface } from '@/server/features/sales/invoice/core/entities/invoice';
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAllLedgerAccounts, selectLedgerAccountsError, selectLedgerAccountsLoading } from "@/store/slices/ledgerAccountSlice";
import { toast } from 'react-toastify';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import InvoiceSummary from "@/components/invoice/EnhancedSummaryCards";
import EnhancedSummaryCards from "@/components/invoice/EnhancedSummaryCards";
import { InvoiceStatsAPIExtended } from "@/server/features/sales/invoice/infrastructure/apihelpers/invoiceStatsApiHelper";
import { InvoicePDFService } from "@/server/services/pdf/InvoicePDFService";
// Extended Invoice interface with additional display properties
interface InvoiceDisplay extends InvoiceInterface {
  customerName: string;
  cgst?: number;
  sgst?: number;
  igst?: number;
}

export default function InvoicePage() {
  const router = useRouter();

  // State management
  const [invoices, setInvoices] = useState<InvoiceDisplay[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerList, setcustomerList] = useState<string[]>([])
  const [customerFilter, setCustomerFilter] = useState("all"); // New customer filter
  const [itemsPerPage, setItemsPerPage] = useState("25");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'draft' | 'sent' | 'paid' | 'cancelled' | 'all'>("all");
  // Replace dateFilter with proper date range
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>(() => {
    // Set default to current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
      from: startOfMonth,
      to: endOfMonth
    };
  });
  const [totalCount, setTotalCount] = useState(0);
  const [statistics, setStatistics] = useState<any>(null);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);

const [allInvoices, setAllInvoices] = useState<InvoiceDisplay[]>([]); // Store all loaded invoices
const [filteredInvoices, setFilteredInvoices] = useState<InvoiceDisplay[]>([]); // Store filtered results


  const dispatch = useAppDispatch();

  // Redux state
  const user = useAppSelector((state) => state.user);
  const ledgerAccounts = useAppSelector(selectAllLedgerAccounts);
  const ledgerAccountsLoading = useAppSelector(selectLedgerAccountsLoading);
  const ledgerAccountsError = useAppSelector(selectLedgerAccountsError);

  const fpoIdOfUser = user?.fpoId ? user.fpoId : "";
  const [fpoId] = useState(fpoIdOfUser); // Replace with actual FPO ID from context/auth

  // Load invoices from API

 
const loadInvoices = useCallback(async (showSuccessToast = false) => {
  setIsLoading(true);
  try {
    const filters: any = {
      page: 1, // Always load from page 1
      limit: 1000, // Load more records to reduce API calls
      sortBy: 'created_at' as const,
      sortOrder: 'desc' as const,
      fpoId
    };

    // Only apply date range filter to API (expensive filters)
    if (dateRange.from) {
      filters.dateFrom = format(dateRange.from, 'yyyy-MM-dd');
    }
    if (dateRange.to) {
      filters.dateTo = format(dateRange.to, 'yyyy-MM-dd');
    }

    const response = await InvoiceAPI.getAll(filters);

    if (response.invoices) {
      setAllInvoices(response.invoices || []); // Store all invoices
      setTotalCount(response.total || 0);

      if (showSuccessToast) {
        toast.success(`Loaded ${response.invoices.length} invoices successfully`);
      }
    } else {
      throw new Error(response.message || 'Failed to fetch invoices');
    }
  } catch (error) {
    console.error("Error loading invoices:", error);
    toast.error(error instanceof Error ? error.message : 'Failed to load invoices');
    setAllInvoices([]);
    setTotalCount(0);
  } finally {
    setIsLoading(false);
  }
}, [dateRange, fpoId]); // Remove other dependencies


const applyClientSideFilters = useCallback(() => {
  let filtered = [...allInvoices];

  // Apply status filter
  if (statusFilter !== "all") {
    filtered = filtered.filter(invoice => 
      invoice.status?.toLowerCase() === statusFilter.toLowerCase()
    );
  }

  // Apply search filter
  if (searchTerm.trim()) {
    const search = searchTerm.toLowerCase().trim();
    filtered = filtered.filter(invoice => 
      invoice.invoiceNumber?.toLowerCase().includes(search) ||
      invoice.customer?.name?.toLowerCase().includes(search) ||
      invoice.summary?.grandTotal?.toString().includes(search)
    );
  }

  // Apply customer filter
  if (customerFilter && customerFilter !== "all" && customerFilter.trim()) {
    filtered = filtered.filter(invoice => 
      invoice.customer?.name === customerFilter
    );
  }

  setFilteredInvoices(filtered);
}, [allInvoices, statusFilter, searchTerm, customerFilter]);



  // get current financial year
  const getCurrentFinancialYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based (0 = January, 3 = April)

    // Financial year in India typically starts from April 1st
    let fyStart, fyEnd;
    if (currentMonth >= 3) { // April (3) to March (15)
      fyStart = new Date(currentYear, 3, 1); // April 1st current year
      fyEnd = new Date(currentYear + 1, 2, 31); // March 31st next year
    } else {
      fyStart = new Date(currentYear - 1, 3, 1); // April 1st previous year
      fyEnd = new Date(currentYear, 2, 31); // March 31st current year
    }

    return {
      start: fyStart,
      end: fyEnd,
      label: `FY ${fyStart.getFullYear()}-${fyEnd.getFullYear().toString().slice(-2)}`
    };
  };


  const getFinancialYearRanges = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based

    const ranges = [];

    // Helper function to create financial year
    const createFY = (startYear: number) => {
      const fyStart = new Date(startYear, 3, 1); // April 1st
      const fyEnd = new Date(startYear + 1, 2, 31); // March 31st
      return {
        start: fyStart,
        end: fyEnd,
        label: `FY ${startYear}-${(startYear + 1).toString().slice(-2)}`
      };
    };

    // Determine current FY start year
    let currentFYStart;
    if (currentMonth >= 3) { // April (3) to March (15)
      currentFYStart = currentYear;
    } else {
      currentFYStart = currentYear - 1;
    }

    // Current FY
    ranges.push({
      ...createFY(currentFYStart),
      key: 'current',
      displayLabel: 'Current FY'
    });

    // Previous FY
    ranges.push({
      ...createFY(currentFYStart - 1),
      key: 'previous1',
      displayLabel: 'Previous FY'
    });

    // Previous 2 FY
    ranges.push({
      ...createFY(currentFYStart - 2),
      key: 'previous2',
      displayLabel: 'Previous 2 FY'
    });

    // Previous 3 FY
    ranges.push({
      ...createFY(currentFYStart - 3),
      key: 'previous3',
      displayLabel: 'Previous 3 FY'
    });

    return ranges;
  };

  // Load statistics
  const loadStatistics = useCallback(async () => {
    try {
      // const stats = await InvoiceAPI.getDashboardStatistics(fpoId, 1);
      const stats = await InvoiceStatsAPIExtended.getAllFYDashboards(fpoId)
      if (stats.currentFY.success) {
        console.log(stats)
        setStatistics(stats.currentFY.data);
      }
      else {
        toast.warning("Could not load statistics");

      }
    } catch (error) {
      console.error("Error loading statistics:", error);
      toast.error("Failed to load statistics");

    }
  }, [fpoId]);



  // Header button functionalities
  const handleAddNewInvoice = useCallback(() => {
    router.push('/Sales/Invoice/new');
  }, [router]);
  const handleExportExcel = useCallback(async () => {
    setIsLoading(true);
    toast.info('Preparing export...');

    try {
      const exportFilters: any = {};

      if (statusFilter !== "all") {
        exportFilters.status = statusFilter;
      }
      if (searchTerm.trim()) {
        exportFilters.search = searchTerm.trim();
      }
      if (customerFilter.trim()) {
        exportFilters.customerName = customerFilter.trim();
      }
      if (dateRange.from) {
        exportFilters.dateFrom = format(dateRange.from, 'yyyy-MM-dd');
      }
      if (dateRange.to) {
        exportFilters.dateTo = format(dateRange.to, 'yyyy-MM-dd');
      }

      await InvoiceAPI.export(fpoId, 'csv', exportFilters);
      toast.success('Export completed successfully');
    } catch (error) {
      // console.error("Error exporting invoices:", error);
      // toast.warning('API export failed, creating local Excel file...');

      try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Invoices");

        worksheet.columns = [
          { header: "Invoice Number", key: "invoice_number", width: 18 },
          { header: "Customer Name", key: "customerName", width: 25 },
          { header: "Amount (₹)", key: "total_amount", width: 15 },
          { header: "Issue Date", key: "invoice_date", width: 12 },
          { header: "Status", key: "status", width: 12 },
          { header: "CGST (₹)", key: "cgst", width: 12 },
          { header: "SGST (₹)", key: "sgst", width: 12 },
          { header: "IGST (₹)", key: "igst", width: 12 },
        ];

        filteredInvoices.forEach((invoice) => {
          worksheet.addRow({
            invoice_number: invoice.invoiceNumber,
            customerName: invoice.customer.name,
            total_amount: invoice.summary.grandTotal,
            invoice_date: invoice.invoiceDate,
            status: invoice.status,
            cgst: invoice.summary.totalCGST || invoice.cgst || 0,
            sgst: invoice.summary.totalSGST || invoice.sgst || 0,
            igst: invoice.summary.totalIGST || invoice.igst || 0,
          });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(
          new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
          `invoices_${new Date().toISOString().split("T")[0]}.xlsx`
        );
        toast.success('Excel file downloaded successfully');
      } catch (excelError) {
        console.error("Error creating Excel fallback:", excelError);
        toast.error('Failed to export invoices');
      }
    } finally {
      setIsLoading(false);
    }
  }, [invoices, fpoId, statusFilter, searchTerm, customerFilter, dateRange]);

  // Search functionality with debouncing
const handleSearch = useCallback((value: string) => {
  setSearchTerm(value);
  // Remove debouncing logic - filtering happens immediately via useEffect
}, []);

  // Status filter functionality
  const handleStatusFilter = useCallback((value: string) => {
    setStatusFilter(value as any);
    setCurrentPage(1);
  }, []);

  // Date filter functionality
  const handleDateRangeChange = useCallback((range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
    setCurrentPage(1);
  }, []);

  // getting current month
  const isCurrentMonth = (from: Date | undefined, to: Date | undefined) => {
    if (!from || !to) return false;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return from.getTime() === startOfMonth.getTime() &&
      to.getTime() === endOfMonth.getTime();
  };
  const clearDateRange = useCallback(() => {
    setDateRange({ from: undefined, to: undefined });
    setCurrentPage(1);
  }, []);


  //  custom filter

 
const handleCustomerFilter = useCallback((value: string) => {
  console.log('Customer filter changed to:', value); // Debug log
  setCustomerFilter(value);
  setCurrentPage(1);
  
  // Clear any existing debounce timer since this should be immediate
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
    setSearchDebounceTimer(null);
  }
}, [searchDebounceTimer]);

  // Add this function to get unique customers for the dropdown
  const uniqueCustomers = useMemo(() => {
    const customers = Array.from(new Set(invoices.map(invoice => invoice.customer.name)))
      .sort()
      .filter(name => name && name.trim() !== "");
    return customers;
  }, [invoices]);
  // CRUD Operations
  const handleDeleteInvoice = useCallback(async (invoiceId: string) => {
    try {
      setIsLoading(true);
      const response = await InvoiceAPI.delete(invoiceId);

      if (response.success) {
        toast.success('Invoice deleted successfully');
        await loadInvoices(false);
        await loadStatistics();
      } else {
        throw new Error(response.message || 'Failed to delete invoice');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete invoice');
    } finally {
      setIsLoading(false);
    }
  }, [loadInvoices, loadStatistics]);

  const handleMarkAsPaid = useCallback(async (invoiceId: string) => {
    try {
      setIsLoading(true);
      const response = await InvoiceAPI.updateStatus(invoiceId, 'paid');

      if (response.success) {
        toast.success('Invoice marked as paid successfully');
        await loadInvoices(false);
        await loadStatistics();
      } else {
        throw new Error(response.message || 'Failed to mark invoice as paid');
      }
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to mark invoice as paid');
    } finally {
      setIsLoading(false);
    }
  }, [loadInvoices, loadStatistics]);

  const handleSendInvoice = useCallback(async (invoiceId: string) => {
    try {
      setIsLoading(true);
      const response = await InvoiceAPI.updateStatus(invoiceId, 'sent');

      if (response.success) {
        toast.success('Invoice sent successfully');
        await loadInvoices(false);
        await loadStatistics();
      } else {
        throw new Error(response.message || 'Failed to send invoice');
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send invoice');
    } finally {
      setIsLoading(false);
    }
  }, [loadInvoices, loadStatistics]);
  // Bulk operations
  const handleBulkDelete = useCallback(async (invoiceIds: string[]) => {
    try {
      setIsLoading(true);
      const response = await InvoiceAPI.bulkDelete(invoiceIds);

      if (response.success) {
        await loadInvoices();
        await loadStatistics();
      } else {
        throw new Error(response.message || 'Failed to delete invoices');
      }
    } catch (error) {
      console.error('Error bulk deleting invoices:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadInvoices, loadStatistics]);

  const handleBulkStatusUpdate = useCallback(async (invoiceIds: string[], status: 'draft' | 'sent' | 'paid' | 'cancelled') => {
    try {
      setIsLoading(true);
      const response = await InvoiceAPI.bulkUpdateStatus(invoiceIds, status);

      if (response.success) {
        await loadInvoices();
        await loadStatistics();
      } else {
        throw new Error(response.message || 'Failed to update invoice status');
      }
    } catch (error) {
      console.error('Error bulk updating invoice status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadInvoices, loadStatistics]);

  // Header buttons configuration
  const headerButtons = useMemo(() => [
    {
      label: "Add New Invoice",
      onClick: handleAddNewInvoice
    },
    {
      label: isLoading ? "Exporting..." : "Export Excel",
      onClick: handleExportExcel
    },
  ], [handleAddNewInvoice, handleExportExcel, isLoading]);

  useHeaderButtons(headerButtons);


 const handleDownloadPDF = useCallback(
  async (invoiceId: string)=> {

    try {
        const invoicePDF = new InvoicePDFService();
        toast.info('generating PDF')
 await invoicePDF.generatePDF(invoiceId);
    } catch (error) {
    toast.warn('something went wrong')
    }

   },
   [loadInvoices , loadStatistics],
 )
 
  const getStatusColor = (status: string | null | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    switch (status.toLowerCase()) {
      case 'draft': return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      case 'sent': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'paid': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'cancelled': return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const isOverdue = (status: string | null | undefined) => {
    if (!status) return false;
    const today = new Date();

    // Check if due date is valid
    return status.toLowerCase() !== 'paid' && status.toLowerCase() !== 'cancelled';
  };


  // Calculate statistics from current data if API stats not available

  const calculateStatistics = useMemo(() => {
    if (statistics && statistics.success !== false) {
      // Use API statistics data when available
      return {
        totalInvoices: statistics.totalInvoices || 0,
        paidInvoices: statistics.paidInvoices || 0,
        outstandingAmount: statistics.outstandingAmount || 0,
        totalAmount: statistics.totalRevenue || 0,
        gstCollected: statistics.gstCollected || 0,
        averageInvoiceValue: statistics.averageInvoiceValue || 0,
        monthlyGrowth: statistics.monthlyGrowth || 0,
        currentMonthRevenue: statistics.currentMonthRevenue || 0,
        previousMonthRevenue: statistics.previousMonthRevenue || 0,
        draftInvoices: statistics.draftInvoices || 0,
        sentInvoices: statistics.sentInvoices || 0,
        cancelledInvoices: statistics.cancelledInvoices || 0,
        overdueAmount: statistics.overdueAmount || 0,
        overdueInvoices: statistics.overdueInvoices || 0,
        topCustomers: statistics.topCustomers || [],
        statusDistribution: statistics.statusDistribution || {}
      };
    }

    // Fallback calculation from current invoices when API stats not available
    const paidCount = invoices.filter(i => i.status?.toLowerCase() === 'paid').length;
    const draftCount = invoices.filter(i => i.status?.toLowerCase() === 'draft').length;
    const sentCount = invoices.filter(i => i.status?.toLowerCase() === 'sent').length;
    const cancelledCount = invoices.filter(i => i.status?.toLowerCase() === 'cancelled').length;

    const outstandingAmount = invoices
      .filter(i => i.status?.toLowerCase() !== 'paid' && i.status?.toLowerCase() !== 'cancelled')
      .reduce((sum, i) => sum + (i.summary.grandTotal || 0), 0);

    const totalAmount = invoices.reduce((sum, i) => sum + (i.summary.grandTotal || 0), 0);

    const gstCollected = invoices.reduce((sum, i) =>
      sum + (i.summary.totalCGST || 0) + (i.summary.totalSGST || 0) + (i.summary.totalIGST || 0), 0
    );

    const averageInvoiceValue = totalCount > 0 ? totalAmount / totalCount : 0;

    return {
      totalInvoices: totalCount,
      paidInvoices: paidCount,
      outstandingAmount,
      totalAmount,
      gstCollected,
      averageInvoiceValue,
      monthlyGrowth: 0, // Can't calculate without historical data
      currentMonthRevenue: 0, // Can't calculate without date filtering
      previousMonthRevenue: 0, // Can't calculate without date filtering
      draftInvoices: draftCount,
      sentInvoices: sentCount,
      cancelledInvoices: cancelledCount,
      overdueAmount: 0, // Would need due date logic
      overdueInvoices: 0, // Would need due date logic
      topCustomers: [], // Would need aggregation logic
      statusDistribution: {
        draft: { count: draftCount },
        sent: { count: sentCount },
        paid: { count: paidCount },
        cancelled: { count: cancelledCount }
      }
    };
  }, [statistics, invoices, totalCount]);

  // Pagination logic
 
const itemsPerPageNum = parseInt(itemsPerPage);
const totalFilteredCount = filteredInvoices.length;
const totalPages = Math.ceil(totalFilteredCount / itemsPerPageNum);

// Get paginated results from filtered invoices
const startIndex = (currentPage - 1) * itemsPerPageNum;
const endIndex = startIndex + itemsPerPageNum;
const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

  // Effects
  useEffect(() => {
    loadInvoices(true);
  }, [fpoId , dateRange]);

  // Effect for applying client-side filters
useEffect(() => {
  applyClientSideFilters();
}, [applyClientSideFilters]);



// Effect for resetting current page when filters change
useEffect(() => {
  setCurrentPage(1);
}, [statusFilter, searchTerm, customerFilter]);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

 

  // Return statement will be in the next chunk...
  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/Dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/sales">Sale</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Invoice List</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Summary Cards */}
      <div className="space-y-4">
        {/* Financial Year Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Financial Year Summary</h2>
            <p className="text-sm text-muted-foreground">
              {getCurrentFinancialYear().label}
              <span className="mx-2">•</span>
              {format(getCurrentFinancialYear().start, 'MMM dd, yyyy')} - {format(getCurrentFinancialYear().end, 'MMM dd, yyyy')}
            </p>
          </div>
          {statistics && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-muted-foreground">
                  Monthly Growth: {statistics.monthlyGrowth > 0 ? '+' : ''}{statistics.monthlyGrowth.toFixed(1)}%
                </span>
              </div>
              <div className="text-muted-foreground">
                Avg Invoice: ₹{statistics.averageInvoiceValue?.toFixed(0).toLocaleString('en-IN') || 0}
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Summary Cards Grid */}
        <EnhancedSummaryCards
          statistics={statistics}
          isLoading={isLoading}
        />

      </div>

      {/* Enhanced Header Actions - Mobile First with Better Organization */}
      <div className="space-y-4">
        {/* Top Row - Main Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
              <SelectTrigger className="w-20 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground whitespace-nowrap">per page</span>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleAddNewInvoice}
              className="flex-1 sm:flex-none h-9"
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="sm:hidden">Add Invoice</span>
              <span className="hidden sm:inline">Add New Invoice</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleExportExcel}
              disabled={isLoading}
              className="flex-1 sm:flex-none h-9"
            >
              <FileDown className="h-4 w-4 mr-2" />
              <span>{isLoading ? "Exporting..." : "Export"}</span>
            </Button>
          </div>
        </div>

        {/* Filters Section */}
        <Card className="p-4">
          <div className="space-y-4">
            {/* Search Row */}
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  className="pl-10 h-9"
                  placeholder="Search invoices by number,customer or amount..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>

             
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Status Filter */}
              <div className="flex-1 min-w-0">
                <Select value={statusFilter} onValueChange={handleStatusFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                        Draft
                      </div>
                    </SelectItem>
                    <SelectItem value="sent">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        Sent
                      </div>
                    </SelectItem>
                    <SelectItem value="paid">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                        Paid
                      </div>
                    </SelectItem>
                    <SelectItem value="cancelled">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                        Cancelled
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Dropdown */}
               <div className="flex-1 min-w-0">
        <Select value={customerFilter} onValueChange={handleCustomerFilter}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="All Customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {/* FIXED: Get unique customers from all loaded invoices */}
            {Array.from(new Set(allInvoices
              .map(invoice => invoice.customer?.name)
              .filter(name => name && name.trim() !== "")
            ))
              .sort()
              .map(customerName => (
                <SelectItem key={customerName} value={customerName}>
                  {customerName}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

              {/* Date Range Picker */}

              <div className="flex-1 min-w-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant="outline"
                      className={cn(
                        "h-9 w-full justify-start text-left font-normal",
                        !dateRange.from && !dateRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <span className="truncate">
                            {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
                          </span>
                        ) : (
                          format(dateRange.from, "MMM dd, yyyy")
                        )
                      ) : (
                        <span>Pick date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3 space-y-3">
                      {/* Enhanced Quick Date Filters with Financial Years */}
                      <div className="space-y-2">
                        {/* Standard Quick Filters */}
                        <div className="grid grid-cols-2 gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const today = new Date();
                              handleDateRangeChange({ from: today, to: today });
                            }}
                            className="h-7 text-xs"
                          >
                            Today
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const today = new Date();
                              const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                              handleDateRangeChange({ from: weekAgo, to: today });
                            }}
                            className="h-7 text-xs"
                          >
                            Last 7 days
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const today = new Date();
                              const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                              handleDateRangeChange({ from: monthAgo, to: today });
                            }}
                            className="h-7 text-xs"
                          >
                            Last 30 days
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const today = new Date();
                              const start = new Date(today.getFullYear(), today.getMonth(), 1);
                              const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                              handleDateRangeChange({ from: start, to: end });
                            }}
                            className="h-7 text-xs"
                          >
                            This month
                          </Button>
                        </div>

                        {/* Financial Year Filters */}
                        <div className="border-t pt-2">
                          <p className="text-xs font-medium mb-1 text-muted-foreground">Financial Years</p>
                          <div className="grid grid-cols-2 gap-1">
                            {getFinancialYearRanges().map((fy) => (
                              <Button
                                key={fy.key}
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  handleDateRangeChange({ from: fy.start, to: fy.end });
                                }}
                                className="h-7 text-xs justify-start"
                              >
                                {fy.displayLabel} ({fy.label})
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Additional Quick Filters */}
                        <div className="border-t pt-2">
                          <div className="grid grid-cols-2 gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const today = new Date();
                                const startOfYear = new Date(today.getFullYear(), 0, 1);
                                handleDateRangeChange({ from: startOfYear, to: today });
                              }}
                              className="h-7 text-xs"
                            >
                              Calendar Year
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const today = new Date();
                                const lastYear = new Date(today.getFullYear() - 1, 0, 1);
                                const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
                                handleDateRangeChange({ from: lastYear, to: lastYearEnd });
                              }}
                              className="h-7 text-xs"
                            >
                              Last Cal Year
                            </Button>
                          </div>
                        </div>
                      </div>

                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={{
                          from: dateRange.from,
                          to: dateRange.to
                        }}
                        onSelect={(range) => {
                          if (range) {
                            handleDateRangeChange({
                              from: range.from,
                              to: range.to
                            });
                          }
                        }}
                        numberOfMonths={2}
                        className="rounded-md border"
                        // Allow selection of dates up to 5 years back and 1 year forward (to accommodate FY ranges)
                        disabled={(date) => {
                          const today = new Date();
                          const fiveYearsAgo = new Date(today.getFullYear() - 5, today.getMonth(), today.getDate());
                          const oneYearAhead = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
                          return date < fiveYearsAgo || date > oneYearAhead;
                        }}
                      />

                      {(dateRange.from || dateRange.to) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Reset to current month instead of clearing completely
                            const now = new Date();
                            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                            handleDateRangeChange({ from: startOfMonth, to: endOfMonth });
                          }}
                          className="w-full h-7"
                        >
                          Reset to current month
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Active Filters Display */}
           {(searchTerm || (customerFilter && customerFilter !== "all") || statusFilter !== "all" || dateRange.from || dateRange.to) && (
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
        <span className="text-sm text-muted-foreground">Active filters:</span>

        {searchTerm && (
          <Badge variant="secondary" className="gap-1">
            Search: {searchTerm}
            <button
              onClick={() => handleSearch("")}
              className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
            >
              ×
            </button>
          </Badge>
        )}

        {customerFilter && customerFilter !== "all" && (
          <Badge variant="secondary" className="gap-1">
            Customer: {customerFilter}
            <button
              onClick={() => handleCustomerFilter("all")}
              className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
            >
              ×
            </button>
          </Badge>
        )}

        {statusFilter !== "all" && (
          <Badge variant="secondary" className="gap-1">
            Status: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
            <button
              onClick={() => handleStatusFilter("all")}
              className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
            >
              ×
            </button>
          </Badge>
        )}

        {(dateRange.from || dateRange.to) && (
          <Badge variant="secondary" className="gap-1">
            Date: {dateRange.from ? format(dateRange.from, "MMM dd") : "Start"} - {dateRange.to ? format(dateRange.to, "MMM dd, yyyy") : "End"}
            <button
              onClick={clearDateRange}
              className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
            >
              ×
            </button>
          </Badge>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            handleSearch("");
            handleCustomerFilter("all");
            handleStatusFilter("all");
            clearDateRange();
          }}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Clear all
        </Button>
      </div>
    )}
          </div>
        </Card>

        {/* Results Summary */}
      
{!isLoading && (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted-foreground">
    <div>
      {totalFilteredCount > 0 ? (
        <>
          Showing {startIndex + 1} to {Math.min(endIndex, totalFilteredCount)} of {totalFilteredCount} invoices
          {(searchTerm || customerFilter !== "all" || statusFilter !== "all") && (
            <span className="ml-1">(filtered from {totalCount} total)</span>
          )}
        </>
      ) : (
        "No invoices found"
      )}
    </div>

    {totalFilteredCount > 0 && (
      <div className="flex items-center gap-4">
        <span>Total Value: ₹{filteredInvoices.reduce((sum, inv) => sum + (inv.summary?.grandTotal || 0), 0).toLocaleString('en-IN')}</span>
        {statusFilter === "all" && (
          <span>Paid: {filteredInvoices.filter(inv => inv.status?.toLowerCase() === 'paid').length}/{totalFilteredCount}</span>
        )}
      </div>
    )}
  </div>
)}
      </div>

      {/* Table Card */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">Loading invoices...</p>
            </div>
          ) : filteredInvoices.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>CGST</TableHead>
                      <TableHead>SGST</TableHead>
                      <TableHead>IGST</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>{invoice.customer.name}</TableCell>
                        <TableCell>₹{invoice.summary.grandTotal?.toLocaleString("en-IN") || 0}</TableCell>
                        <TableCell>
                          {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(invoice.status)}>
                            {invoice.status ? (invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)) : 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>₹{(invoice.summary.totalCGST || invoice.cgst || 0).toLocaleString('en-IN')}</TableCell>
                        <TableCell>₹{(invoice.summary.totalSGST || invoice.sgst || 0).toLocaleString('en-IN')}</TableCell>
                        <TableCell>₹{(invoice.summary.totalGST || invoice.igst || 0).toLocaleString('en-IN')}</TableCell>

                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => router.push(`/Sales/Invoice/${invoice.id}/view`)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/Sales/Invoice/${invoice.id}/edit`)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              {invoice.status === 'draft' && (
                                <DropdownMenuItem onClick={() => invoice.id && handleSendInvoice(invoice.id)}>
                                  <Send className="mr-2 h-4 w-4" />
                                  Send Invoice
                                </DropdownMenuItem>
                              )}
                              {(invoice.status === 'sent' || isOverdue(invoice.status)) && (
                                <DropdownMenuItem onClick={() => invoice.id && handleMarkAsPaid(invoice.id)}>
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  Mark as Paid
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => invoice.id && handleDownloadPDF(invoice.id)}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Download PDF
                              </DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the invoice.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => invoice.id && handleDeleteInvoice(invoice.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4 p-4">
                {paginatedInvoices.map((invoice) => (
                  <Card key={invoice.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-primary">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-muted-foreground">{invoice.customer.name}</p>
                        </div>
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status ? (invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)) : 'Unknown'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Amount:</span>
                          <p className="font-medium">₹{invoice.summary.grandTotal?.toLocaleString('en-IN') || 0}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Issue Date:</span>
                          <p>{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">CGST:</span>
                          <p>₹{(invoice.summary.totalCGST || invoice.cgst || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">SGST:</span>
                          <p>₹{(invoice.summary.totalSGST || invoice.sgst || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">IGST:</span>
                          <p>₹{(invoice.summary.totalIGST || invoice.igst || 0).toLocaleString('en-IN')}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/Sales/Invoice/${invoice.id}/view`)}
                          className="flex-1"
                          disabled={isLoading}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/Sales/Invoice/${invoice.id}/edit`)}
                          className="flex-1"
                          disabled={isLoading}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        {(invoice.status === 'sent') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => invoice.id && handleMarkAsPaid(invoice.id)}
                            className="flex-1"
                            disabled={isLoading}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Pay
                          </Button>
                        )}
                        {invoice.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => invoice.id && handleSendInvoice(invoice.id)}
                            className="flex-1"
                            disabled={isLoading}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Send
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" disabled={isLoading}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the invoice.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => invoice.id && handleDeleteInvoice(invoice.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="p-16 text-center">
              <div className="text-6xl text-gray-300 mb-4">🧾</div>
              <h3 className="text-xl font-medium text-gray-500 mb-2">No Record Found!!</h3>
              <p className="text-gray-400 mb-6">
                {searchTerm || statusFilter !== "all" || customerFilter !== "all" ||
                  (dateRange.from && !isCurrentMonth(dateRange.from, dateRange.to)) ?
                  `No invoices found matching the selected filters` :
                  "No invoices available. Create your first invoice to get started."
                }
              </p>
              {!searchTerm && statusFilter === "all" && customerFilter === "all" &&
                (!dateRange.from || isCurrentMonth(dateRange.from, dateRange.to)) && (
                  <Button onClick={handleAddNewInvoice} disabled={isLoading}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Invoice
                  </Button>
                )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalFilteredCount > itemsPerPageNum && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPageNum) + 1} to {Math.min(currentPage * itemsPerPageNum, totalCount)} of {totalCount} results
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || isLoading}
                >
                  Previous
                </Button>
                <div className="flex gap-1">
                  {/* Show page numbers with ellipsis for large page counts */}
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        disabled={isLoading}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || isLoading}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}