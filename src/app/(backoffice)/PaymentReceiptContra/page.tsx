"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Search, Plus, Eye, Edit, Trash2, MoreHorizontal, Calendar as CalendarIcon, ChevronDown, Download } from "lucide-react";
import { format } from "date-fns";

// Transaction data structure
interface Transaction {
  id: string;
  transactionNumber: string;
  type: 'Payment' | 'Receipt' | 'Contra';
  partyName: string;
  amount: number;
  date: string;
  paymentMode: string;
  status: 'Draft' | 'Approved' | 'Cancelled';
  reference?: string;
  description?: string;
}

export default function PaymentReceiptContraPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("25");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filter states
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date(2025, 3, 1)); // April 1, 2025
  const [toDate, setToDate] = useState<Date | undefined>(new Date(2026, 2, 31)); // March 31, 2026
  const [showFromCalendar, setShowFromCalendar] = useState(false);
  const [showToCalendar, setShowToCalendar] = useState(false);

  // Sample transaction data
  const sampleTransactions: Transaction[] = [
    {
      id: "1",
      transactionNumber: "PAY-2025-001",
      type: "Payment",
      partyName: "ABC Farm Supplies",
      amount: 15000,
      date: "2025-04-15",
      paymentMode: "Bank Transfer",
      status: "Approved",
      reference: "TXN123456",
      description: "Payment for fertilizers"
    },
    {
      id: "2",
      transactionNumber: "REC-2025-002",
      type: "Receipt",
      partyName: "Green Valley Co-op",
      amount: 8500,
      date: "2025-04-18",
      paymentMode: "Cash",
      status: "Approved",
      reference: "REC789012",
      description: "Receipt for seeds supply"
    },
    {
      id: "3",
      transactionNumber: "CON-2025-003",
      type: "Contra",
      partyName: "Bank Transfer",
      amount: 25000,
      date: "2025-04-20",
      paymentMode: "Bank Transfer",
      status: "Approved",
      reference: "CON345678",
      description: "Fund transfer between accounts"
    },
    {
      id: "4",
      transactionNumber: "PAY-2025-004",
      type: "Payment",
      partyName: "Rural Supply Chain",
      amount: 12000,
      date: "2025-04-22",
      paymentMode: "Cheque",
      status: "Draft",
      reference: "CHQ901234",
      description: "Payment for equipment"
    },
    {
      id: "5",
      transactionNumber: "REC-2025-005",
      type: "Receipt",
      partyName: "Farmers United Ltd",
      amount: 18500,
      date: "2025-04-25",
      paymentMode: "UPI",
      status: "Approved",
      reference: "UPI567890",
      description: "Receipt for crop purchase"
    }
  ];

  // Header button functionalities
  const handleAddPayment = useCallback(() => {
    console.log("Add Payment clicked");
    router.push('/dashboard/accounts/payments/new');
  }, [router]);

  const handleAddReceipt = useCallback(() => {
    console.log("Add Receipt clicked");
    router.push('/dashboard/accounts/receipts/new');
  }, [router]);

  const handleAddContra = useCallback(() => {
    console.log("Add Contra clicked");
    router.push('/dashboard/accounts/contra/new');
  }, [router]);

  const handleExportExcel = useCallback(() => {
    console.log("Export Excel clicked");
    // Implement Excel export functionality
  }, []);

  // Search and filter functionality
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleSubmit = useCallback(() => {
    console.log("Submit filters:", {
      fromDate,
      toDate,
      searchTerm
    });
    
    setIsLoading(true);
    
    // Simulate API call with filters
    setTimeout(() => {
      let filtered = sampleTransactions;
      
      // Apply date range filter
      if (fromDate && toDate) {
        filtered = filtered.filter(txn => {
          const txnDate = new Date(txn.date);
          return txnDate >= fromDate && txnDate <= toDate;
        });
      }
      
      // Apply search filter
      if (searchTerm.trim()) {
        filtered = filtered.filter(txn =>
          txn.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          txn.transactionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          txn.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          txn.paymentMode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (txn.description && txn.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
      
      setTransactions(filtered);
      setIsLoading(false);
    }, 500);
  }, [fromDate, toDate, searchTerm]);

  const handleResetDate = useCallback(() => {
    setFromDate(new Date(2025, 3, 1));
    setToDate(new Date(2026, 2, 31));
  }, []);

  // Header buttons configuration
  const headerButtons = useMemo(() => [
    { 
      label: "Add Payment", 
      onClick: handleAddPayment 
    },
    { 
      label: "Add Receipt", 
      onClick: handleAddReceipt 
    },
    { 
      label: "Add Contra", 
      onClick: handleAddContra 
    },
    { 
      label: "Export Excel", 
      onClick: handleExportExcel 
    }
  ], [handleAddPayment, handleAddReceipt, handleAddContra, handleExportExcel]);

  useHeaderButtons(headerButtons);

  // Get status color classes
  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      case 'Approved': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'Cancelled': return 'bg-red-100 text-red-800 hover:bg-red-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  // Get type color classes
  const getTypeColor = (type: Transaction['type']) => {
    switch (type) {
      case 'Payment': return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'Receipt': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'Contra': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  // Pagination logic
  const itemsPerPageNum = parseInt(itemsPerPage);
  const totalPages = Math.ceil(transactions.length / itemsPerPageNum);
  const startIndex = (currentPage - 1) * itemsPerPageNum;
  const endIndex = startIndex + itemsPerPageNum;
  const currentTransactions = transactions.slice(startIndex, endIndex);

  // Delete transaction handler
  const handleDeleteTransaction = (transactionId: string) => {
    console.log('Delete transaction:', transactionId);
    setTransactions(prev => prev.filter(txn => txn.id !== transactionId));
  };

  // Load initial data
  useEffect(() => {
    handleSubmit();
  }, []);

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
            <BreadcrumbLink href="/dashboard/accounts">Accounts</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Payment/Receipt/Contra</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Filters Card */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
                    {fromDate ? format(fromDate, "MM/dd/yyyy") : "Pick a date"}
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
                    {toDate ? format(toDate, "MM/dd/yyyy") : "Pick a date"}
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

            {/* Reset Date Button */}
            <Button 
              variant="outline"
              onClick={handleResetDate}
              className="w-full"
            >
              Reset Date
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table Controls */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">items/page</span>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input 
            className="pl-10 w-full sm:w-80" 
            placeholder="Search..." 
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table Card */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">Loading transactions...</p>
            </div>
          ) : currentTransactions.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction Number</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Party Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment Mode</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium text-primary">
                          {transaction.transactionNumber}
                        </TableCell>
                        <TableCell>
                          <Badge className={getTypeColor(transaction.type)}>
                            {transaction.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.partyName}</TableCell>
                        <TableCell>₹{transaction.amount.toLocaleString('en-IN')}</TableCell>
                        <TableCell>{new Date(transaction.date).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell>{transaction.paymentMode}</TableCell>
                        <TableCell>{transaction.reference || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(transaction.status)}>
                            {transaction.status}
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
                                onClick={() => router.push(`/dashboard/accounts/transactions/${transaction.id}`)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/accounts/transactions/${transaction.id}/edit`)}
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
                                      This action cannot be undone. This will permanently delete the transaction.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteTransaction(transaction.id)}>
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
                {currentTransactions.map((transaction) => (
                  <Card key={transaction.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-primary">{transaction.transactionNumber}</p>
                          <p className="text-sm text-muted-foreground">{transaction.partyName}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Badge className={getTypeColor(transaction.type)}>
                            {transaction.type}
                          </Badge>
                          <Badge className={getStatusColor(transaction.status)}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Amount:</span>
                          <p className="font-medium">₹{transaction.amount.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date:</span>
                          <p>{new Date(transaction.date).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Payment Mode:</span>
                          <p>{transaction.paymentMode}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Reference:</span>
                          <p>{transaction.reference || '-'}</p>
                        </div>
                      </div>
                      
                      {transaction.description && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Description:</span>
                          <p>{transaction.description}</p>
                        </div>
                      )}
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/accounts/transactions/${transaction.id}`)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/accounts/transactions/${transaction.id}/edit`)}
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
                                This action cannot be undone. This will permanently delete the transaction.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteTransaction(transaction.id)}>
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
                  "No transactions found matching your search criteria" : 
                  "No transactions available in the selected date range."
                }
              </p>
              {!searchTerm && (
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button onClick={handleAddPayment}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment
                  </Button>
                  <Button onClick={handleAddReceipt} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Receipt
                  </Button>
                  <Button onClick={handleAddContra} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contra
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {transactions.length > itemsPerPageNum && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, transactions.length)} of {transactions.length} results
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