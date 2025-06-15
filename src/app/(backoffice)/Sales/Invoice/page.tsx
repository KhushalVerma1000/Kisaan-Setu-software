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
import * as XLSX from 'xlsx';

// Invoice data structure
interface Invoice {
  id: string;
  customerName: string;
  invoiceNumber: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  paymentMethod?: string;
  paidAmount?: number;
}

export default function InvoicePage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("25");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Sample data - replace with your API calls
  const sampleInvoices: Invoice[] = [
    {
      id: "1",
      customerName: "ABC Farm Supplies",
      invoiceNumber: "INV-2024-001",
      amount: 15000,
      issueDate: "2024-01-15",
      dueDate: "2024-02-15",
      status: "Sent",
      paymentMethod: "Bank Transfer"
    },
    {
      id: "2",
      customerName: "Green Valley Co-op",
      invoiceNumber: "INV-2024-002",
      amount: 25000,
      issueDate: "2024-01-20",
      dueDate: "2024-02-20",
      status: "Draft"
    },
    {
      id: "3",
      customerName: "Farmers United Ltd",
      invoiceNumber: "INV-2024-003",
      amount: 8500,
      issueDate: "2024-01-25",
      dueDate: "2024-02-25",
      status: "Paid",
      paymentMethod: "Cash",
      paidAmount: 8500
    },
    {
      id: "4",
      customerName: "Rural Supply Chain",
      invoiceNumber: "INV-2024-004",
      amount: 32000,
      issueDate: "2024-01-10",
      dueDate: "2024-02-10",
      status: "Overdue",
      paymentMethod: "Credit Card"
    },
    {
      id: "5",
      customerName: "Agro Mart Express",
      invoiceNumber: "INV-2024-005",
      amount: 18750,
      issueDate: "2024-02-05",
      dueDate: "2024-03-05",
      status: "Cancelled"
    },
    {
      id: "6",
      customerName: "Prime Agriculture Ltd",
      invoiceNumber: "INV-2024-006",
      amount: 42500,
      issueDate: "2024-02-10",
      dueDate: "2024-03-10",
      status: "Paid",
      paymentMethod: "Bank Transfer",
      paidAmount: 42500
    }
  ];

  // Header button functionalities
  const handleAddNewInvoice = useCallback(() => {
    console.log("Add New Invoice clicked");
    router.push('/dashboard/invoices/new');
  }, [router]);

  const handleExportExcel = useCallback(() => {
    console.log("Export Excel clicked");
    setIsLoading(true);
    
    try {
      const dataToExport = invoices.length > 0 ? invoices : sampleInvoices;
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport.map(invoice => ({
        'Invoice Number': invoice.invoiceNumber,
        'Customer Name': invoice.customerName,
        'Amount (₹)': invoice.amount,
        'Issue Date': invoice.issueDate,
        'Due Date': invoice.dueDate,
        'Status': invoice.status,
        'Payment Method': invoice.paymentMethod || 'N/A',
        'Paid Amount (₹)': invoice.paidAmount || 0
      })));

      ws['!cols'] = [
        { width: 18 }, { width: 25 }, { width: 15 }, 
        { width: 12 }, { width: 12 }, { width: 12 },
        { width: 15 }, { width: 15 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Invoices");
      const fileName = `invoices_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      console.log(`Excel file exported: ${fileName}`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    } finally {
      setIsLoading(false);
    }
  }, [invoices]);

  // Search functionality
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    applyFilters(value, statusFilter, dateFilter);
  }, [statusFilter, dateFilter]);

  // Status filter functionality
  const handleStatusFilter = useCallback((value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
    applyFilters(searchTerm, value, dateFilter);
  }, [searchTerm, dateFilter]);

  // Date filter functionality
  const handleDateFilter = useCallback((value: string) => {
    setDateFilter(value);
    setCurrentPage(1);
    applyFilters(searchTerm, statusFilter, value);
  }, [searchTerm, statusFilter]);

  // Apply all filters
  const applyFilters = useCallback((search: string, status: string, date: string) => {
    let filtered = [...sampleInvoices];

    // Apply search filter
    if (search.trim()) {
      filtered = filtered.filter(invoice =>
        invoice.customerName.toLowerCase().includes(search.toLowerCase()) ||
        invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        invoice.status.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply status filter
    if (status !== "all") {
      filtered = filtered.filter(invoice => invoice.status.toLowerCase() === status.toLowerCase());
    }

    // Apply date filter
    if (date !== "all") {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      filtered = filtered.filter(invoice => {
        const invoiceDate = new Date(invoice.issueDate);
        const invoiceMonth = invoiceDate.getMonth();
        const invoiceYear = invoiceDate.getFullYear();

        switch (date) {
          case "today":
            return invoiceDate.toDateString() === today.toDateString();
          case "yesterday":
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            return invoiceDate.toDateString() === yesterday.toDateString();
          case "last7days":
            const last7Days = new Date(today);
            last7Days.setDate(today.getDate() - 7);
            return invoiceDate >= last7Days && invoiceDate <= today;
          case "last30days":
            const last30Days = new Date(today);
            last30Days.setDate(today.getDate() - 30);
            return invoiceDate >= last30Days && invoiceDate <= today;
          case "thismonth":
            return invoiceMonth === currentMonth && invoiceYear === currentYear;
          case "lastmonth":
            const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            return invoiceMonth === lastMonth && invoiceYear === lastMonthYear;
          case "thisyear":
            return invoiceYear === currentYear;
          default:
            return true;
        }
      });
    }

    setInvoices(filtered);
  }, []);

  // Load sample data on component mount
  const loadInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setInvoices(sampleInvoices);
    } catch (error) {
      console.error("Error loading invoices:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  // Get status variant for Badge
  const getStatusVariant = (status: Invoice['status']) => {
    switch (status) {
      case 'Draft': return 'secondary';
      case 'Sent': return 'default';
      case 'Paid': return 'default';
      case 'Overdue': return 'destructive';
      case 'Cancelled': return 'outline';
      default: return 'secondary';
    }
  };

  // Get status color classes
  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      case 'Sent': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'Paid': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'Overdue': return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'Cancelled': return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  // Check if invoice is overdue
  const isOverdue = (dueDate: string, status: Invoice['status']) => {
    const today = new Date();
    const due = new Date(dueDate);
    return status !== 'Paid' && status !== 'Cancelled' && due < today;
  };

  // Pagination logic
  const itemsPerPageNum = parseInt(itemsPerPage);
  const totalPages = Math.ceil(invoices.length / itemsPerPageNum);
  const startIndex = (currentPage - 1) * itemsPerPageNum;
  const endIndex = startIndex + itemsPerPageNum;
  const currentInvoices = invoices.slice(startIndex, endIndex);

  // Delete invoice handler
  const handleDeleteInvoice = (invoiceId: string) => {
    console.log('Delete invoice:', invoiceId);
    setInvoices(prev => prev.filter(i => i.id !== invoiceId));
  };

  // Mark as paid handler
  const handleMarkAsPaid = (invoiceId: string) => {
    console.log('Mark as paid:', invoiceId);
    setInvoices(prev => prev.map(invoice => 
      invoice.id === invoiceId 
        ? { ...invoice, status: 'Paid' as const, paidAmount: invoice.amount }
        : invoice
    ));
  };

  // Send invoice handler
  const handleSendInvoice = (invoiceId: string) => {
    console.log('Send invoice:', invoiceId);
    setInvoices(prev => prev.map(invoice => 
      invoice.id === invoiceId 
        ? { ...invoice, status: 'Sent' as const }
        : invoice
    ));
  };

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold">{invoices.length}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileDown className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid Invoices</p>
                <p className="text-2xl font-bold text-green-600">
                  {invoices.filter(i => i.status === 'Paid').length}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  {invoices.filter(i => i.status === 'Overdue' || isOverdue(i.dueDate, i.status)).length}
                </p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">
                  ₹{invoices.reduce((sum, i) => sum + i.amount, 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Download className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header Actions - Mobile First */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground hidden sm:inline">items/page</span>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={handleDateFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last7days">Last 7 Days</SelectItem>
                <SelectItem value="last30days">Last 30 Days</SelectItem>
                <SelectItem value="thismonth">This Month</SelectItem>
                <SelectItem value="lastmonth">Last Month</SelectItem>
                <SelectItem value="thisyear">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              className="pl-10 w-full sm:w-80" 
              placeholder="Search invoices..." 
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleAddNewInvoice}
              className="flex-1 sm:flex-none"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add New</span>
              <span className="sm:hidden">Add</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportExcel}
              disabled={isLoading}
              className="flex-1 sm:flex-none"
            >
              <FileDown className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{isLoading ? "Exporting..." : "Export"}</span>
              <span className="sm:hidden">Export</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">Loading invoices...</p>
            </div>
          ) : currentInvoices.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block max-w-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium text-primary">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>{invoice.customerName}</TableCell>
                        <TableCell>₹{invoice.amount.toLocaleString('en-IN')}</TableCell>
                        <TableCell>{new Date(invoice.issueDate).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell>
                          <span className={isOverdue(invoice.dueDate, invoice.status) ? "text-red-600 font-medium" : ""}>
                            {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{invoice.paymentMethod || '-'}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/invoices/${invoice.id}/edit`)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              {invoice.status === 'Draft' && (
                                <DropdownMenuItem onClick={() => handleSendInvoice(invoice.id)}>
                                  <Send className="mr-2 h-4 w-4" />
                                  Send Invoice
                                </DropdownMenuItem>
                              )}
                              {(invoice.status === 'Sent' || invoice.status === 'Overdue') && (
                                <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice.id)}>
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  Mark as Paid
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => window.open(`/dashboard/invoices/${invoice.id}/download`, '_blank')}
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
                                    <AlertDialogAction onClick={() => handleDeleteInvoice(invoice.id)}>
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
                {currentInvoices.map((invoice) => (
                  <Card key={invoice.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-primary">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-muted-foreground">{invoice.customerName}</p>
                        </div>
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Amount:</span>
                          <p className="font-medium">₹{invoice.amount.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Issue Date:</span>
                          <p>{new Date(invoice.issueDate).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Due Date:</span>
                          <p className={isOverdue(invoice.dueDate, invoice.status) ? "text-red-600 font-medium" : ""}>
                            {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Payment:</span>
                          <p>{invoice.paymentMethod || '-'}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/invoices/${invoice.id}/edit`)}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        {(invoice.status === 'Sent' || invoice.status === 'Overdue') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAsPaid(invoice.id)}
                            className="flex-1"
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Pay
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
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
                              <AlertDialogAction onClick={() => handleDeleteInvoice(invoice.id)}>
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
                {searchTerm || statusFilter !== "all" || dateFilter !== "all" ? 
                  `No invoices found matching the selected filters` : 
                  "No invoices available. Create your first invoice to get started."
                }
              </p>
              {!searchTerm && statusFilter === "all" && dateFilter === "all" && (
                <Button onClick={handleAddNewInvoice}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Invoice
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {invoices.length > itemsPerPageNum && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, invoices.length)} of {invoices.length} results
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
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