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
import * as XLSX from 'xlsx';

// Payment Out data structure
interface PaymentOut {
  id: string;
  paymentNumber: string;
  supplierName: string;
  amount: number;
  date: string;
  status: 'Paid' | 'Pending' | 'Failed' | 'Refunded';
  paymentMethod: string;
  billNumber?: string;
}

// Supplier data structure
interface Supplier {
  id: string;
  name: string;
}

export default function PaymentOutPage() {
  const router = useRouter();
  const [paymentOuts, setPaymentOuts] = useState<PaymentOut[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("25");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filter states
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date(2025, 3, 1)); // April 1, 2025
  const [toDate, setToDate] = useState<Date | undefined>(new Date(2026, 2, 31)); // March 31, 2026
  const [showFromCalendar, setShowFromCalendar] = useState(false);
  const [showToCalendar, setShowToCalendar] = useState(false);

  // Sample data
  const sampleSuppliers: Supplier[] = [
    { id: "1", name: "Fertilizer Co. Ltd" },
    { id: "2", name: "Seeds & Grains Inc" },
    { id: "3", name: "Agricultural Tools Ltd" },
    { id: "4", name: "Pesticide Solutions" },
    { id: "5", name: "Farm Equipment Co." }
  ];

  const samplePaymentOuts: PaymentOut[] = [
    {
      id: "1",
      paymentNumber: "POUT-2025-001",
      supplierName: "Fertilizer Co. Ltd",
      amount: 25000,
      date: "2025-04-15",
      status: "Paid",
      paymentMethod: "Bank Transfer",
      billNumber: "BILL-2025-045"
    },
    {
      id: "2",
      paymentNumber: "POUT-2025-002",
      supplierName: "Seeds & Grains Inc",
      amount: 18500,
      date: "2025-04-20",
      status: "Pending",
      paymentMethod: "Credit Card",
      billNumber: "BILL-2025-052"
    },
    {
      id: "3",
      paymentNumber: "POUT-2025-003",
      supplierName: "Agricultural Tools Ltd",
      amount: 32000,
      date: "2025-04-25",
      status: "Paid",
      paymentMethod: "Cash",
      billNumber: "BILL-2025-058"
    },
    {
      id: "4",
      paymentNumber: "POUT-2025-004",
      supplierName: "Pesticide Solutions",
      amount: 12000,
      date: "2025-05-01",
      status: "Failed",
      paymentMethod: "Bank Transfer",
      billNumber: "BILL-2025-062"
    },
    {
      id: "5",
      paymentNumber: "POUT-2025-005",
      supplierName: "Farm Equipment Co.",
      amount: 45750,
      date: "2025-05-05",
      status: "Refunded",
      paymentMethod: "Credit Card",
      billNumber: "BILL-2025-065"
    }
  ];

  // Header button functionalities
  const handleAddNewPaymentOut = useCallback(() => {
    console.log("Add New Payment Out clicked");
    router.push('/dashboard/purchase/payment-out/new');
  }, [router]);

  const handleExportExcel = useCallback(() => {
    console.log("Export Excel clicked");
    setIsLoading(true);
    
    try {
      const dataToExport = paymentOuts.length > 0 ? paymentOuts : samplePaymentOuts;
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport.map(paymentOut => ({
        'Payment Number': paymentOut.paymentNumber,
        'Supplier Name': paymentOut.supplierName,
        'Amount (₹)': paymentOut.amount,
        'Date': paymentOut.date,
        'Payment Method': paymentOut.paymentMethod,
        'Bill Number': paymentOut.billNumber || '-',
        'Status': paymentOut.status
      })));

      ws['!cols'] = [
        { width: 20 }, { width: 25 }, { width: 15 }, 
        { width: 12 }, { width: 15 }, { width: 15 }, { width: 12 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Payment Out");
      const fileName = `payment_out_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      console.log(`Excel file exported: ${fileName}`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    } finally {
      setIsLoading(false);
    }
  }, [paymentOuts]);

  // Header buttons configuration
  const headerButtons = useMemo(() => [
    { 
      label: "Add New Payment Out", 
      onClick: handleAddNewPaymentOut 
    },
    { 
      label: isLoading ? "Exporting..." : "Export Excel", 
      onClick: handleExportExcel 
    },
  ], [handleAddNewPaymentOut, handleExportExcel, isLoading]);

  useHeaderButtons(headerButtons);

  // Search and filter functionality
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    
    if (value.trim()) {
      const filtered = samplePaymentOuts.filter(paymentOut =>
        paymentOut.supplierName.toLowerCase().includes(value.toLowerCase()) ||
        paymentOut.paymentNumber.toLowerCase().includes(value.toLowerCase()) ||
        paymentOut.paymentMethod.toLowerCase().includes(value.toLowerCase())
      );
      setPaymentOuts(filtered);
    } else {
      setPaymentOuts(samplePaymentOuts);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    console.log("Submit filters:", {
      supplier: selectedSupplier,
      fromDate,
      toDate
    });
    
    setIsLoading(true);
    
    // Simulate API call with filters
    setTimeout(() => {
      let filtered = samplePaymentOuts;
      
      // Apply supplier filter
      if (selectedSupplier) {
        const supplier = sampleSuppliers.find(s => s.id === selectedSupplier);
        if (supplier) {
          filtered = filtered.filter(paymentOut => paymentOut.supplierName === supplier.name);
        }
      }
      
      // Apply date range filter
      if (fromDate && toDate) {
        filtered = filtered.filter(paymentOut => {
          const paymentDate = new Date(paymentOut.date);
          return paymentDate >= fromDate && paymentDate <= toDate;
        });
      }
      
      // Apply search filter
      if (searchTerm.trim()) {
        filtered = filtered.filter(paymentOut =>
          paymentOut.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          paymentOut.paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          paymentOut.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setPaymentOuts(filtered);
      setIsLoading(false);
    }, 500);
  }, [selectedSupplier, fromDate, toDate, searchTerm]);

  // Load sample data on component mount
  const loadPaymentOuts = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setPaymentOuts(samplePaymentOuts);
    } catch (error) {
      console.error("Error loading payment outs:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get status color classes
  const getStatusColor = (status: PaymentOut['status']) => {
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
  const totalPages = Math.ceil(paymentOuts.length / itemsPerPageNum);
  const startIndex = (currentPage - 1) * itemsPerPageNum;
  const endIndex = startIndex + itemsPerPageNum;
  const currentPaymentOuts = paymentOuts.slice(startIndex, endIndex);

  // Delete payment out handler
  const handleDeletePaymentOut = (paymentOutId: string) => {
    console.log('Delete payment out:', paymentOutId);
    setPaymentOuts(prev => prev.filter(p => p.id !== paymentOutId));
  };

  useEffect(() => {
    loadPaymentOuts();
  }, [loadPaymentOuts]);

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
            <BreadcrumbLink href="/dashboard/purchase">Purchase</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Payment Out List</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Filters Card */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Supplier Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Supplier</label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="--Select Supplier--" />
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </SelectTrigger>
                <SelectContent>
                  {sampleSuppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
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
              placeholder="Search payment outs..." 
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleAddNewPaymentOut}
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
              <p className="mt-2 text-muted-foreground">Loading payment outs...</p>
            </div>
          ) : currentPaymentOuts.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Number</TableHead>
                      <TableHead>Supplier Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Bill Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentPaymentOuts.map((paymentOut) => (
                      <TableRow key={paymentOut.id}>
                        <TableCell className="font-medium text-primary">
                          {paymentOut.paymentNumber}
                        </TableCell>
                        <TableCell>{paymentOut.supplierName}</TableCell>
                        <TableCell>₹{paymentOut.amount.toLocaleString('en-IN')}</TableCell>
                        <TableCell>{new Date(paymentOut.date).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell>{paymentOut.paymentMethod}</TableCell>
                        <TableCell>{paymentOut.billNumber || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(paymentOut.status)}>
                            {paymentOut.status}
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
                                onClick={() => router.push(`/dashboard/purchase/payment-out/${paymentOut.id}`)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/purchase/payment-out/${paymentOut.id}/edit`)}
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
                                      This action cannot be undone. This will permanently delete the payment out record.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeletePaymentOut(paymentOut.id)}>
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
                {currentPaymentOuts.map((paymentOut) => (
                  <Card key={paymentOut.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-primary">{paymentOut.paymentNumber}</p>
                          <p className="text-sm text-muted-foreground">{paymentOut.supplierName}</p>
                        </div>
                        <Badge className={getStatusColor(paymentOut.status)}>
                          {paymentOut.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Amount:</span>
                          <p className="font-medium">₹{paymentOut.amount.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date:</span>
                          <p>{new Date(paymentOut.date).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Method:</span>
                          <p>{paymentOut.paymentMethod}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Bill:</span>
                          <p>{paymentOut.billNumber || '-'}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/purchase/payment-out/${paymentOut.id}`)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/purchase/payment-out/${paymentOut.id}/edit`)}
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
                                This action cannot be undone. This will permanently delete the payment out record.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeletePaymentOut(paymentOut.id)}>
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
              <div className="text-6xl text-gray-300 mb-4">💸</div>
              <h3 className="text-xl font-medium text-gray-500 mb-2">No Record Found!!</h3>
              <p className="text-gray-400 mb-6">
                {searchTerm ? 
                  `No payment outs found matching "${searchTerm}"` : 
                  "No payment out records available. Create your first payment out to get started."
                }
              </p>
              {!searchTerm && (
                <Button onClick={handleAddNewPaymentOut}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Payment Out
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {paymentOuts.length > itemsPerPageNum && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, paymentOuts.length)} of {paymentOuts.length} results
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