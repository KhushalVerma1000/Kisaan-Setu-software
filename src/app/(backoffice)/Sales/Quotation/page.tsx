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
import { Search, FileDown, Plus, Eye, Edit, Trash2, MoreHorizontal, Download } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// Sample quotation data structure
interface Quotation {
  id: string;
  customerName: string;
  quotationNumber: string;
  amount: number;
  date: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';
  validUntil: string;
}

export default function QuotationPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("25");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Sample data - replace with your API calls
  const sampleQuotations: Quotation[] = [
    {
      id: "1",
      customerName: "ABC Farm Supplies",
      quotationNumber: "QUO-2024-001",
      amount: 15000,
      date: "2024-01-15",
      status: "Sent",
      validUntil: "2024-02-15"
    },
    {
      id: "2",
      customerName: "Green Valley Co-op",
      quotationNumber: "QUO-2024-002",
      amount: 25000,
      date: "2024-01-20",
      status: "Draft",
      validUntil: "2024-02-20"
    },
    {
      id: "3",
      customerName: "Farmers United Ltd",
      quotationNumber: "QUO-2024-003",
      amount: 8500,
      date: "2024-01-25",
      status: "Accepted",
      validUntil: "2024-02-25"
    },
    {
      id: "4",
      customerName: "Rural Supply Chain",
      quotationNumber: "QUO-2024-004",
      amount: 32000,
      date: "2024-01-30",
      status: "Rejected",
      validUntil: "2024-03-01"
    },
    {
      id: "5",
      customerName: "Agro Mart Express",
      quotationNumber: "QUO-2024-005",
      amount: 18750,
      date: "2024-02-05",
      status: "Expired",
      validUntil: "2024-03-05"
    }
  ];

  // Header button functionalities
  const handleAddNewQuotation = useCallback(() => {
    console.log("Add New Quotation clicked");
    router.push('/dashboard/quotations/new');
  }, [router]);

  const handleExportExcel = useCallback(async () => {
    setIsLoading(true);
    try {
      const dataToExport = quotations.length > 0 ? quotations : sampleQuotations;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Quotations");

      worksheet.columns = [
        { header: "Quotation Number", key: "quotationNumber", width: 20 },
        { header: "Customer Name", key: "customerName", width: 25 },
        { header: "Amount (₹)", key: "amount", width: 15 },
        { header: "Date", key: "date", width: 12 },
        { header: "Valid Until", key: "validUntil", width: 12 },
        { header: "Status", key: "status", width: 12 },
      ];

      dataToExport.forEach((quotation) => {
        worksheet.addRow({
          quotationNumber: quotation.quotationNumber,
          customerName: quotation.customerName,
          amount: quotation.amount,
          date: quotation.date,
          validUntil: quotation.validUntil,
          status: quotation.status,
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `quotations_${new Date().toISOString().split("T")[0]}.xlsx`
      );
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    } finally {
      setIsLoading(false);
    }
  }, [quotations, sampleQuotations]);

  // Search functionality
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    
    if (value.trim()) {
      const filtered = sampleQuotations.filter(quotation =>
        quotation.customerName.toLowerCase().includes(value.toLowerCase()) ||
        quotation.quotationNumber.toLowerCase().includes(value.toLowerCase()) ||
        quotation.status.toLowerCase().includes(value.toLowerCase())
      );
      setQuotations(filtered);
    } else {
      setQuotations(sampleQuotations);
    }
  }, []);

  // Load sample data on component mount
  const loadQuotations = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setQuotations(sampleQuotations);
    } catch (error) {
      console.error("Error loading quotations:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Header buttons configuration
  const headerButtons = useMemo(() => [
    { 
      label: "Add New Quotation", 
      onClick: handleAddNewQuotation 
    },
    { 
      label: isLoading ? "Exporting..." : "Export Excel", 
      onClick: handleExportExcel 
    },
  ], [handleAddNewQuotation, handleExportExcel, isLoading]);

  useHeaderButtons(headerButtons);

  // Get status variant for Badge
  const getStatusVariant = (status: Quotation['status']) => {
    switch (status) {
      case 'Draft': return 'secondary';
      case 'Sent': return 'default';
      case 'Accepted': return 'default';
      case 'Rejected': return 'destructive';
      case 'Expired': return 'outline';
      default: return 'secondary';
    }
  };

  // Get status color classes
  const getStatusColor = (status: Quotation['status']) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      case 'Sent': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'Accepted': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'Rejected': return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'Expired': return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  // Pagination logic
  const itemsPerPageNum = parseInt(itemsPerPage);
  const totalPages = Math.ceil(quotations.length / itemsPerPageNum);
  const startIndex = (currentPage - 1) * itemsPerPageNum;
  const endIndex = startIndex + itemsPerPageNum;
  const currentQuotations = quotations.slice(startIndex, endIndex);

  // Delete quotation handler
  const handleDeleteQuotation = (quotationId: string) => {
    console.log('Delete quotation:', quotationId);
    setQuotations(prev => prev.filter(q => q.id !== quotationId));
  };

  useEffect(() => {
    loadQuotations();
  }, [loadQuotations]);

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
            <BreadcrumbPage>Quotation List</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

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
              placeholder="Search quotations..." 
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleAddNewQuotation}
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
              <p className="mt-2 text-muted-foreground">Loading quotations...</p>
            </div>
          ) : currentQuotations.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quotation Number</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Valid Until</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentQuotations.map((quotation) => (
                      <TableRow key={quotation.id}>
                        <TableCell className="font-medium text-primary">
                          {quotation.quotationNumber}
                        </TableCell>
                        <TableCell>{quotation.customerName}</TableCell>
                        <TableCell>₹{quotation.amount.toLocaleString('en-IN')}</TableCell>
                        <TableCell>{new Date(quotation.date).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell>{new Date(quotation.validUntil).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(quotation.status)}>
                            {quotation.status}
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
                                onClick={() => router.push(`/dashboard/quotations/${quotation.id}`)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/quotations/${quotation.id}/edit`)}
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
                                      This action cannot be undone. This will permanently delete the quotation.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteQuotation(quotation.id)}>
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
                {currentQuotations.map((quotation) => (
                  <Card key={quotation.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-primary">{quotation.quotationNumber}</p>
                          <p className="text-sm text-muted-foreground">{quotation.customerName}</p>
                        </div>
                        <Badge className={getStatusColor(quotation.status)}>
                          {quotation.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Amount:</span>
                          <p className="font-medium">₹{quotation.amount.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date:</span>
                          <p>{new Date(quotation.date).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Valid Until:</span>
                          <p>{new Date(quotation.validUntil).toLocaleDateString('en-IN')}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/quotations/${quotation.id}`)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/quotations/${quotation.id}/edit`)}
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
                                This action cannot be undone. This will permanently delete the quotation.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteQuotation(quotation.id)}>
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
                {searchTerm ? 
                  `No quotations found matching "${searchTerm}"` : 
                  "No quotations available. Create your first quotation to get started."
                }
              </p>
              {!searchTerm && (
                <Button onClick={handleAddNewQuotation}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Quotation
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {quotations.length > itemsPerPageNum && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, quotations.length)} of {quotations.length} results
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