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
import { Search, Plus, Eye, Edit, Trash2, MoreHorizontal, Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { format } from "date-fns";

// Credit Note data structure
interface CreditNote {
  id: string;
  creditNoteNumber: string;
  customerName: string;
  amount: number;
  date: string;
  status: 'Draft' | 'Sent' | 'Applied' | 'Cancelled';
  reason: string;
  originalInvoice?: string;
}

// Customer data structure
interface Customer {
  id: string;
  name: string;
}

export default function CreditNoteReturnPage() {
  const router = useRouter();
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
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

  const sampleCreditNotes: CreditNote[] = [
    {
      id: "1",
      creditNoteNumber: "CN-2025-001",
      customerName: "ABC Farm Supplies",
      amount: 2500,
      date: "2025-04-15",
      status: "Applied",
      reason: "Product Return",
      originalInvoice: "INV-2025-045"
    },
    {
      id: "2",
      creditNoteNumber: "CN-2025-002",
      customerName: "Green Valley Co-op",
      amount: 1200,
      date: "2025-04-20",
      status: "Sent",
      reason: "Damaged Goods",
      originalInvoice: "INV-2025-052"
    },
    {
      id: "3",
      creditNoteNumber: "CN-2025-003",
      customerName: "Farmers United Ltd",
      amount: 800,
      date: "2025-04-25",
      status: "Draft",
      reason: "Billing Error",
      originalInvoice: "INV-2025-058"
    }
  ];

  // Header button functionalities
  const handleAddNewCreditNote = useCallback(() => {
    console.log("Add Credit Note/Return clicked");
    router.push('/dashboard/sales/credit-notes/new');
  }, [router]);

  // Search and filter functionality
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
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
      let filtered = sampleCreditNotes;
      
      // Apply customer filter
      if (selectedCustomer) {
        const customer = sampleCustomers.find(c => c.id === selectedCustomer);
        if (customer) {
          filtered = filtered.filter(cn => cn.customerName === customer.name);
        }
      }
      
      // Apply date range filter
      if (fromDate && toDate) {
        filtered = filtered.filter(cn => {
          const noteDate = new Date(cn.date);
          return noteDate >= fromDate && noteDate <= toDate;
        });
      }
      
      // Apply search filter
      if (searchTerm.trim()) {
        filtered = filtered.filter(cn =>
          cn.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cn.creditNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cn.reason.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setCreditNotes(filtered);
      setIsLoading(false);
    }, 500);
  }, [selectedCustomer, fromDate, toDate, searchTerm]);

  // Header buttons configuration
  const headerButtons = useMemo(() => [
    { 
      label: "Add Credit Note/Return", 
      onClick: handleAddNewCreditNote 
    }
  ], [handleAddNewCreditNote]);

  useHeaderButtons(headerButtons);

  // Get status color classes
  const getStatusColor = (status: CreditNote['status']) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      case 'Sent': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'Applied': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'Cancelled': return 'bg-red-100 text-red-800 hover:bg-red-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  // Pagination logic
  const itemsPerPageNum = parseInt(itemsPerPage);
  const totalPages = Math.ceil(creditNotes.length / itemsPerPageNum);
  const startIndex = (currentPage - 1) * itemsPerPageNum;
  const endIndex = startIndex + itemsPerPageNum;
  const currentCreditNotes = creditNotes.slice(startIndex, endIndex);

  // Delete credit note handler
  const handleDeleteCreditNote = (creditNoteId: string) => {
    console.log('Delete credit note:', creditNoteId);
    setCreditNotes(prev => prev.filter(cn => cn.id !== creditNoteId));
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
            <BreadcrumbLink href="/dashboard/sales">Sale</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Credit Note/Return List</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Filters Card */}
      <Card>
        <CardContent className="p-4 md:p-6">
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
                  <SelectItem value="b">--Select Customer--</SelectItem>
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
              <p className="mt-2 text-muted-foreground">Loading credit notes...</p>
            </div>
          ) : currentCreditNotes.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Credit Note Number</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Original Invoice</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentCreditNotes.map((creditNote) => (
                      <TableRow key={creditNote.id}>
                        <TableCell className="font-medium text-primary">
                          {creditNote.creditNoteNumber}
                        </TableCell>
                        <TableCell>{creditNote.customerName}</TableCell>
                        <TableCell>₹{creditNote.amount.toLocaleString('en-IN')}</TableCell>
                        <TableCell>{new Date(creditNote.date).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell>{creditNote.reason}</TableCell>
                        <TableCell>{creditNote.originalInvoice || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(creditNote.status)}>
                            {creditNote.status}
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
                                onClick={() => router.push(`/dashboard/sales/credit-notes/${creditNote.id}`)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/sales/credit-notes/${creditNote.id}/edit`)}
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
                                      This action cannot be undone. This will permanently delete the credit note.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteCreditNote(creditNote.id)}>
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
                {currentCreditNotes.map((creditNote) => (
                  <Card key={creditNote.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-primary">{creditNote.creditNoteNumber}</p>
                          <p className="text-sm text-muted-foreground">{creditNote.customerName}</p>
                        </div>
                        <Badge className={getStatusColor(creditNote.status)}>
                          {creditNote.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Amount:</span>
                          <p className="font-medium">₹{creditNote.amount.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date:</span>
                          <p>{new Date(creditNote.date).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Reason:</span>
                          <p>{creditNote.reason}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Invoice:</span>
                          <p>{creditNote.originalInvoice || '-'}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/sales/credit-notes/${creditNote.id}`)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/sales/credit-notes/${creditNote.id}/edit`)}
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
                                This action cannot be undone. This will permanently delete the credit note.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteCreditNote(creditNote.id)}>
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
              <div className="text-6xl text-gray-300 mb-4">📄</div>
              <h3 className="text-xl font-medium text-gray-500 mb-2">No Record Found!!</h3>
              <p className="text-gray-400 mb-6">
                {searchTerm || selectedCustomer ? 
                  "No credit notes found matching your filters" : 
                  "No credit notes available. Create your first credit note to get started."
                }
              </p>
              {!searchTerm && !selectedCustomer && (
                <Button onClick={handleAddNewCreditNote}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Credit Note/Return
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {creditNotes.length > itemsPerPageNum && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, creditNotes.length)} of {creditNotes.length} results
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