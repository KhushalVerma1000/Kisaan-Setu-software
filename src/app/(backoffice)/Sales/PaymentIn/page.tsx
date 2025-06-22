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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useHeaderButtons } from "@/hooks/useHeaderButtons";
import { useRouter } from "next/navigation";
import { Search, Plus, Eye, Edit, Trash2, MoreHorizontal, CalendarIcon, ChevronDown, FileDown } from "lucide-react";
import { format } from "date-fns";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
// Payment data structure
interface Payment {
  id: string;
  paymentNumber: string;
  customerName: string;
  amount: number;
  date: string;
  status: 'Paid' | 'Pending' | 'Failed' | 'Refunded';
  paymentMethod: string;
  invoiceNumber?: string;
}

// Customer data structure
interface Customer {
  id: string;
  name: string;
}

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("25");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filter states
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date(2025, 3, 1)); // April 1, 2025
  const [toDate, setToDate] = useState<Date | undefined>(new Date(2026, 2, 31)); // March 31, 2026
  const [showFromCalendar, setShowFromCalendar] = useState(false);
  const [showToCalendar, setShowToCalendar] = useState(false);

  // Sample data
  const sampleCustomers: Customer[] = [
    { id: "1", name: "ABC Farm Supplies" },
    { id: "2", name: "Green Valley Co-op" },
    { id: "3", name: "Farmers United Ltd" },
    { id: "4", name: "Rural Supply Chain" },
    { id: "5", name: "Agro Mart Express" }
  ];

  const samplePayments: Payment[] = [
    {
      id: "1",
      paymentNumber: "PAY-2025-001",
      customerName: "ABC Farm Supplies",
      amount: 15000,
      date: "2025-04-15",
      status: "Paid",
      paymentMethod: "Bank Transfer",
      invoiceNumber: "INV-2025-045"
    },
    {
      id: "2",
      paymentNumber: "PAY-2025-002",
      customerName: "Green Valley Co-op",
      amount: 8500,
      date: "2025-04-20",
      status: "Pending",
      paymentMethod: "Credit Card",
      invoiceNumber: "INV-2025-052"
    },
    {
      id: "3",
      paymentNumber: "PAY-2025-003",
      customerName: "Farmers United Ltd",
      amount: 12000,
      date: "2025-04-25",
      status: "Paid",
      paymentMethod: "Cash",
      invoiceNumber: "INV-2025-058"
    },
    {
      id: "4",
      paymentNumber: "PAY-2025-004",
      customerName: "Rural Supply Chain",
      amount: 32000,
      date: "2025-05-01",
      status: "Failed",
      paymentMethod: "Bank Transfer",
      invoiceNumber: "INV-2025-062"
    },
    {
      id: "5",
      paymentNumber: "PAY-2025-005",
      customerName: "Agro Mart Express",
      amount: 18750,
      date: "2025-05-05",
      status: "Refunded",
      paymentMethod: "Credit Card",
      invoiceNumber: "INV-2025-065"
    }
  ];

  // Header button functionalities
  const handleAddNewPayment = useCallback(() => {
    console.log("Add New Payment clicked");
    router.push('/dashboard/sales/payments/new');
  }, [router]);


const handleExportExcel = useCallback(async () => {
  setIsLoading(true);
  try {
    const dataToExport = payments.length > 0 ? payments : samplePayments;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Payments");

    worksheet.columns = [
      { header: "Payment Number", key: "paymentNumber", width: 20 },
      { header: "Customer Name", key: "customerName", width: 25 },
      { header: "Amount (₹)", key: "amount", width: 15 },
      { header: "Date", key: "date", width: 12 },
      { header: "Payment Method", key: "paymentMethod", width: 15 },
      { header: "Invoice Number", key: "invoiceNumber", width: 15 },
      { header: "Status", key: "status", width: 12 },
    ];

    dataToExport.forEach((payment) => {
      worksheet.addRow({
        paymentNumber: payment.paymentNumber,
        customerName: payment.customerName,
        amount: payment.amount,
        date: payment.date,
        paymentMethod: payment.paymentMethod,
        invoiceNumber: payment.invoiceNumber || "-",
        status: payment.status,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `payments_${new Date().toISOString().split("T")[0]}.xlsx`
    );
    console.log("Excel file exported");
  } catch (error) {
    console.error("Error exporting to Excel:", error);
  } finally {
    setIsLoading(false);
  }
}, [payments, samplePayments]);

  // Header buttons configuration
  const headerButtons = useMemo(() => [
    { 
      label: "Add New Payment", 
      onClick: handleAddNewPayment 
    },
    { 
      label: isLoading ? "Exporting..." : "Export Excel", 
      onClick: handleExportExcel 
    },
  ], [handleAddNewPayment, handleExportExcel, isLoading]);

  useHeaderButtons(headerButtons);

  // Search and filter functionality
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    
    if (value.trim()) {
      const filtered = samplePayments.filter(payment =>
        payment.customerName.toLowerCase().includes(value.toLowerCase()) ||
        payment.paymentNumber.toLowerCase().includes(value.toLowerCase()) ||
        payment.paymentMethod.toLowerCase().includes(value.toLowerCase())
      );
      setPayments(filtered);
    } else {
      setPayments(samplePayments);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    console.log("Submit filters:", {
      customer: selectedCustomer,
      fromDate,
      toDate
    });
    
    setIsLoading(true);
    
    // Simulate API call with filters
    setTimeout(() => {
      let filtered = samplePayments;
      
      // Apply customer filter
      if (selectedCustomer) {
        const customer = sampleCustomers.find(c => c.id === selectedCustomer);
        if (customer) {
          filtered = filtered.filter(payment => payment.customerName === customer.name);
        }
      }
      
      // Apply date range filter
      if (fromDate && toDate) {
        filtered = filtered.filter(payment => {
          const paymentDate = new Date(payment.date);
          return paymentDate >= fromDate && paymentDate <= toDate;
        });
      }
      
      // Apply search filter
      if (searchTerm.trim()) {
        filtered = filtered.filter(payment =>
          payment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setPayments(filtered);
      setIsLoading(false);
    }, 500);
  }, [selectedCustomer, fromDate, toDate, searchTerm]);

  // Load sample data on component mount
  const loadPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setPayments(samplePayments);
    } catch (error) {
      console.error("Error loading payments:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get status color classes
  const getStatusColor = (status: Payment['status']) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'Pending': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'Failed': return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'Refunded': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  // Pagination logic
  const itemsPerPageNum = parseInt(itemsPerPage);
  const totalPages = Math.ceil(payments.length / itemsPerPageNum);
  const startIndex = (currentPage - 1) * itemsPerPageNum;
  const endIndex = startIndex + itemsPerPageNum;
  const currentPayments = payments.slice(startIndex, endIndex);

  // Delete payment handler
  const handleDeletePayment = (paymentId: string) => {
    console.log('Delete payment:', paymentId);
    setPayments(prev => prev.filter(p => p.id !== paymentId));
  };

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

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
            <BreadcrumbPage>Payment List</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Filters Card */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Customer Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Customer</label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="--Select Customer--" />
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </SelectTrigger>
                <SelectContent>
                  {sampleCustomers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* From Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">From Date</label>
              <Popover open={showFromCalendar} onOpenChange={setShowFromCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "dd/MM/yyyy") : "01/01/2025"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={(date) => {
                      setFromDate(date);
                      setShowFromCalendar(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* To Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">To Date</label>
              <Popover open={showToCalendar} onOpenChange={setShowToCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "dd/MM/yyyy") : "03/12/2025"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={(date) => {
                      setToDate(date);
                      setShowToCalendar(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Loading..." : "Submit"}
            </Button>
          </div>
        </CardContent>
      </Card>

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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              className="pl-10 w-full sm:w-80" 
              placeholder="Search payments..." 
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleAddNewPayment}
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
              <p className="mt-2 text-muted-foreground">Loading payments...</p>
            </div>
          ) : currentPayments.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Number</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium text-primary">
                          {payment.paymentNumber}
                        </TableCell>
                        <TableCell>{payment.customerName}</TableCell>
                        <TableCell>₹{payment.amount.toLocaleString('en-IN')}</TableCell>
                        <TableCell>{new Date(payment.date).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell>{payment.paymentMethod}</TableCell>
                        <TableCell>{payment.invoiceNumber || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(payment.status)}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/sales/payments/${payment.id}`)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/sales/payments/${payment.id}/edit`)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
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
                                      This action cannot be undone. This will permanently delete the payment record.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeletePayment(payment.id)}>
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
                {currentPayments.map((payment) => (
                  <Card key={payment.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-primary">{payment.paymentNumber}</p>
                          <p className="text-sm text-muted-foreground">{payment.customerName}</p>
                        </div>
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Amount:</span>
                          <p className="font-medium">₹{payment.amount.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date:</span>
                          <p>{new Date(payment.date).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Method:</span>
                          <p>{payment.paymentMethod}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Invoice:</span>
                          <p>{payment.invoiceNumber || '-'}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/sales/payments/${payment.id}`)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/sales/payments/${payment.id}/edit`)}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
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
                                This action cannot be undone. This will permanently delete the payment record.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeletePayment(payment.id)}>
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
              <div className="text-6xl text-gray-300 mb-4">💳</div>
              <h3 className="text-xl font-medium text-gray-500 mb-2">No Record Found!!</h3>
              <p className="text-gray-400 mb-6">
                {searchTerm ? 
                  `No payments found matching "${searchTerm}"` : 
                  "No payment records available. Create your first payment to get started."
                }
              </p>
              {!searchTerm && (
                <Button onClick={handleAddNewPayment}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Payment
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {payments.length > itemsPerPageNum && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, payments.length)} of {payments.length} results
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