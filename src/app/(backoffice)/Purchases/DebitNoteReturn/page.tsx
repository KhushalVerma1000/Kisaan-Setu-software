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
import { Search, Plus, Eye, Edit, Trash2, MoreHorizontal, CalendarIcon, ChevronDown } from "lucide-react";
import { format } from "date-fns";

// Debit Note data structure
interface DebitNote {
  id: string;
  debitNoteNumber: string;
  supplierName: string;
  amount: number;
  date: string;
  status: 'Draft' | 'Sent' | 'Applied' | 'Cancelled';
  reason: string;
  originalBill?: string;
}

// Supplier data structure
interface Supplier {
  id: string;
  name: string;
}

export default function DebitNoteReturnPage() {
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>([]);
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
    { id: "1", name: "Fertilizer Supply Co." },
    { id: "2", name: "Seed Distribution Ltd" },
    { id: "3", name: "Agricultural Tools Inc" },
    { id: "4", name: "Crop Protection Systems" },
    { id: "5", name: "Farm Equipment Depot" }
  ];

  const sampleDebitNotes: DebitNote[] = [
    {
      id: "1",
      debitNoteNumber: "DN-2025-001",
      supplierName: "Fertilizer Supply Co.",
      amount: 3500,
      date: "2025-04-10",
      status: "Applied",
      reason: "Quality Issues",
      originalBill: "BILL-2025-032"
    },
    {
      id: "2",
      debitNoteNumber: "DN-2025-002",
      supplierName: "Seed Distribution Ltd",
      amount: 1800,
      date: "2025-04-18",
      status: "Sent",
      reason: "Overcharge",
      originalBill: "BILL-2025-041"
    },
    {
      id: "3",
      debitNoteNumber: "DN-2025-003",
      supplierName: "Agricultural Tools Inc",
      amount: 2200,
      date: "2025-04-22",
      status: "Draft",
      reason: "Defective Goods",
      originalBill: "BILL-2025-048"
    }
  ];

  // Header button functionalities
  const handleAddNewDebitNote = useCallback(() => {
    console.log("Add Debit Note/Return clicked");
    // router.push('/dashboard/purchase/debit-notes/new');
  }, []);

  // Search and filter functionality
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
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
      let filtered = sampleDebitNotes;
      
      // Apply supplier filter
      if (selectedSupplier) {
        const supplier = sampleSuppliers.find(s => s.id === selectedSupplier);
        if (supplier) {
          filtered = filtered.filter(dn => dn.supplierName === supplier.name);
        }
      }
      
      // Apply date range filter
      if (fromDate && toDate) {
        filtered = filtered.filter(dn => {
          const noteDate = new Date(dn.date);
          return noteDate >= fromDate && noteDate <= toDate;
        });
      }
      
      // Apply search filter
      if (searchTerm.trim()) {
        filtered = filtered.filter(dn =>
          dn.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          dn.debitNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          dn.reason.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setDebitNotes(filtered);
      setIsLoading(false);
    }, 500);
  }, [selectedSupplier, fromDate, toDate, searchTerm]);

  // Get status color classes
  const getStatusColor = (status: DebitNote['status']) => {
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
  const totalPages = Math.ceil(debitNotes.length / itemsPerPageNum);
  const startIndex = (currentPage - 1) * itemsPerPageNum;
  const endIndex = startIndex + itemsPerPageNum;
  const currentDebitNotes = debitNotes.slice(startIndex, endIndex);

  // Delete debit note handler
  const handleDeleteDebitNote = (debitNoteId: string) => {
    console.log('Delete debit note:', debitNoteId);
    setDebitNotes(prev => prev.filter(dn => dn.id !== debitNoteId));
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
            <BreadcrumbLink href="/dashboard/purchase">Purchase</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Debit Note/Return List</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Debit Note</h1>
          <p className="text-sm text-gray-500">Purchase / Debit Note/Return List</p>
        </div>
        <Button onClick={handleAddNewDebitNote} className="bg-blue-600 hover:bg-blue-700">
          Add Debit Note/Return
        </Button>
      </div>

      {/* Filters Card */}
      <Card>
        <CardContent className="p-4 md:p-6">
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
                  <SelectItem value="b">--Select Supplier--</SelectItem>
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
              className="w-full bg-blue-600 hover:bg-blue-700"
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
              <p className="mt-2 text-muted-foreground">Loading debit notes...</p>
            </div>
          ) : currentDebitNotes.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Debit Note Number</TableHead>
                      <TableHead>Supplier Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Original Bill</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentDebitNotes.map((debitNote) => (
                      <TableRow key={debitNote.id}>
                        <TableCell className="font-medium text-primary">
                          {debitNote.debitNoteNumber}
                        </TableCell>
                        <TableCell>{debitNote.supplierName}</TableCell>
                        <TableCell>₹{debitNote.amount.toLocaleString('en-IN')}</TableCell>
                        <TableCell>{new Date(debitNote.date).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell>{debitNote.reason}</TableCell>
                        <TableCell>{debitNote.originalBill || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(debitNote.status)}>
                            {debitNote.status}
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
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem>
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
                                      This action cannot be undone. This will permanently delete the debit note.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteDebitNote(debitNote.id)}>
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
                {currentDebitNotes.map((debitNote) => (
                  <Card key={debitNote.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-primary">{debitNote.debitNoteNumber}</p>
                          <p className="text-sm text-muted-foreground">{debitNote.supplierName}</p>
                        </div>
                        <Badge className={getStatusColor(debitNote.status)}>
                          {debitNote.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Amount:</span>
                          <p className="font-medium">₹{debitNote.amount.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date:</span>
                          <p>{new Date(debitNote.date).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Reason:</span>
                          <p>{debitNote.reason}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Bill:</span>
                          <p>{debitNote.originalBill || '-'}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
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
                                This action cannot be undone. This will permanently delete the debit note.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteDebitNote(debitNote.id)}>
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
                {searchTerm || selectedSupplier ? 
                  "No debit notes found matching your filters" : 
                  "No debit notes available. Create your first debit note to get started."
                }
              </p>
              {!searchTerm && !selectedSupplier && (
                <Button onClick={handleAddNewDebitNote} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Debit Note/Return
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {debitNotes.length > itemsPerPageNum && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, debitNotes.length)} of {debitNotes.length} results
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