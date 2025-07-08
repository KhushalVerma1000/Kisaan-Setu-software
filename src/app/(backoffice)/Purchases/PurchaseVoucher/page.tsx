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
import { Search, FileDown, Plus, Eye, Edit, Trash2, MoreHorizontal, Calendar, ShoppingCart } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// Purchase Voucher data structure
interface PurchaseVoucher {
  id: string;
  voucherNumber: string;
  customerName: string;
  supplierName: string;
  amount: number;
  date: string;
  dueDate: string;
  status: 'Draft' | 'Pending' | 'Approved' | 'Paid' | 'Cancelled';
  description: string;
}

export default function PurchaseVoucherPage() {
  const router = useRouter();
  const [purchaseVouchers, setPurchaseVouchers] = useState<PurchaseVoucher[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("25");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [fromDate, setFromDate] = useState("2025-04-01");
  const [toDate, setToDate] = useState("2026-03-31");

  // Sample data - replace with your API calls
  const samplePurchaseVouchers: PurchaseVoucher[] = [
    {
      id: "1",
      voucherNumber: "PV-2024-001",
      customerName: "ABC Farm Supplies",
      supplierName: "Green Valley Seeds Ltd",
      amount: 25000,
      date: "2024-01-15",
      dueDate: "2024-02-15",
      status: "Approved",
      description: "Seed purchase for wheat farming"
    },
    {
      id: "2",
      voucherNumber: "PV-2024-002",
      customerName: "Rural Supply Chain",
      supplierName: "Fertilizer Co.",
      amount: 18500,
      date: "2024-01-20",
      dueDate: "2024-02-20",
      status: "Pending",
      description: "Organic fertilizer procurement"
    },
    {
      id: "3",
      voucherNumber: "PV-2024-003",
      customerName: "Farmers United Ltd",
      supplierName: "Equipment Rental Inc",
      amount: 42000,
      date: "2024-01-25",
      dueDate: "2024-02-25",
      status: "Paid",
      description: "Tractor rental for harvest season"
    },
    {
      id: "4",
      voucherNumber: "PV-2024-004",
      customerName: "Agro Mart Express",
      supplierName: "Pesticide Solutions",
      amount: 12750,
      date: "2024-02-01",
      dueDate: "2024-03-01",
      status: "Draft",
      description: "Pest control chemicals"
    },
    {
      id: "5",
      voucherNumber: "PV-2024-005",
      customerName: "Green Valley Co-op",
      supplierName: "Irrigation Systems",
      amount: 35000,
      date: "2024-02-05",
      dueDate: "2024-03-05",
      status: "Cancelled",
      description: "Drip irrigation equipment"
    }
  ];

  // Header button functionalities
  const handleAddNewPurchaseOrder = useCallback(() => {
    console.log("Add Purchase Order clicked");
    router.push('/dashboard/purchase/vouchers/new');
  }, [router]);

  // ✅ Updated Excel Export Handler using ExcelJS
  const handleExportExcel = useCallback(async () => {
    setIsLoading(true);
    try {
      const dataToExport = purchaseVouchers.length > 0 ? purchaseVouchers : samplePurchaseVouchers;

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Purchase Vouchers");

      worksheet.columns = [
        { header: 'Voucher Number', key: 'voucherNumber', width: 20 },
        { header: 'Customer Name', key: 'customerName', width: 25 },
        { header: 'Supplier Name', key: 'supplierName', width: 25 },
        { header: 'Amount (₹)', key: 'amount', width: 15 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Due Date', key: 'dueDate', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Description', key: 'description', width: 30 },
      ];

      dataToExport.forEach((voucher) => {
        worksheet.addRow({
          voucherNumber: voucher.voucherNumber,
          customerName: voucher.customerName,
          supplierName: voucher.supplierName,
          amount: voucher.amount,
          date: voucher.date,
          dueDate: voucher.dueDate,
          status: voucher.status,
          description: voucher.description,
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `purchase_vouchers_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(new Blob([buffer]), fileName);
    } catch (error) {
      console.error("Error exporting Excel:", error);
    } finally {
      setIsLoading(false);
    }
  }, [purchaseVouchers]);

  // Search functionality
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    
    if (value.trim()) {
      const filtered = samplePurchaseVouchers.filter(voucher =>
        voucher.customerName.toLowerCase().includes(value.toLowerCase()) ||
        voucher.voucherNumber.toLowerCase().includes(value.toLowerCase()) ||
        voucher.supplierName.toLowerCase().includes(value.toLowerCase()) ||
        voucher.status.toLowerCase().includes(value.toLowerCase())
      );
      setPurchaseVouchers(filtered);
    } else {
      setPurchaseVouchers(samplePurchaseVouchers);
    }
  }, []);

  // Filter functionality
  const handleSubmitFilter = useCallback(() => {
    console.log("Filter submitted:", { selectedCustomer, fromDate, toDate });
    setCurrentPage(1);
    
    let filtered = samplePurchaseVouchers;
    
    if (selectedCustomer) {
      filtered = filtered.filter(voucher => 
        voucher.customerName.toLowerCase().includes(selectedCustomer.toLowerCase())
      );
    }
    
    if (fromDate) {
      filtered = filtered.filter(voucher => 
        new Date(voucher.date) >= new Date(fromDate)
      );
    }
    
    if (toDate) {
      filtered = filtered.filter(voucher => 
        new Date(voucher.date) <= new Date(toDate)
      );
    }
    
    setPurchaseVouchers(filtered);
  }, [selectedCustomer, fromDate, toDate]);

  // Load sample data on component mount
  const loadPurchaseVouchers = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setPurchaseVouchers(samplePurchaseVouchers);
    } catch (error) {
      console.error("Error loading purchase vouchers:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Header buttons configuration
  const headerButtons = useMemo(() => [
    { 
      label: "Add Purchase Order", 
      onClick: handleAddNewPurchaseOrder 
    },
    { 
      label: isLoading ? "Exporting..." : "Export Excel", 
      onClick: handleExportExcel 
    },
  ], [handleAddNewPurchaseOrder, handleExportExcel, isLoading]);

  useHeaderButtons(headerButtons);

  // Get status variant for Badge
  const getStatusVariant = (status: PurchaseVoucher['status']) => {
    switch (status) {
      case 'Draft': return 'secondary';
      case 'Pending': return 'default';
      case 'Approved': return 'default';
      case 'Paid': return 'default';
      case 'Cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  // Get status color classes
  const getStatusColor = (status: PurchaseVoucher['status']) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      case 'Pending': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'Approved': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'Paid': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'Cancelled': return 'bg-red-100 text-red-800 hover:bg-red-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  // Pagination logic
  const itemsPerPageNum = parseInt(itemsPerPage);
  const totalPages = Math.ceil(purchaseVouchers.length / itemsPerPageNum);
  const startIndex = (currentPage - 1) * itemsPerPageNum;
  const endIndex = startIndex + itemsPerPageNum;
  const currentPurchaseVouchers = purchaseVouchers.slice(startIndex, endIndex);

  // Delete voucher handler
  const handleDeleteVoucher = (voucherId: string) => {
    console.log('Delete voucher:', voucherId);
    setPurchaseVouchers(prev => prev.filter(v => v.id !== voucherId));
  };

  // Sample customers for dropdown
  const customers = [
    "ABC Farm Supplies",
    "Green Valley Co-op",
    "Farmers United Ltd",
    "Rural Supply Chain",
    "Agro Mart Express"
  ];

  useEffect(() => {
    loadPurchaseVouchers();
  }, [loadPurchaseVouchers]);

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
            <BreadcrumbPage>Purchase Voucher List</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Purchase Voucher</h1>
          <p className="text-muted-foreground">Manage your purchase vouchers and orders</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddNewPurchaseOrder}>
            <Plus className="h-4 w-4 mr-2" />
            Add Purchase Order
          </Button>
          <Button variant="outline" onClick={handleExportExcel} disabled={isLoading}>
            <FileDown className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filter Section */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer</label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="--Select Customer--" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customers">--Select Customer--</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer} value={customer}>
                      {customer}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <div className="relative">
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <div className="relative">
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            <Button onClick={handleSubmitFilter} className="w-full">
              Submit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Header Actions */}
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
              <p className="mt-2 text-muted-foreground">Loading purchase vouchers...</p>
            </div>
          ) : currentPurchaseVouchers.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Voucher Number</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentPurchaseVouchers.map((voucher) => (
                      <TableRow key={voucher.id}>
                        <TableCell className="font-medium text-primary">
                          {voucher.voucherNumber}
                        </TableCell>
                        <TableCell>{voucher.customerName}</TableCell>
                        <TableCell>{voucher.supplierName}</TableCell>
                        <TableCell>₹{voucher.amount.toLocaleString('en-IN')}</TableCell>
                        <TableCell>{new Date(voucher.date).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell>{new Date(voucher.dueDate).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(voucher.status)}>
                            {voucher.status}
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
                                onClick={() => router.push(`/dashboard/purchase/vouchers/${voucher.id}`)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/purchase/vouchers/${voucher.id}/edit`)}
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
                                      This action cannot be undone. This will permanently delete the purchase voucher.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteVoucher(voucher.id)}>
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
                {currentPurchaseVouchers.map((voucher) => (
                  <Card key={voucher.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-primary">{voucher.voucherNumber}</p>
                          <p className="text-sm text-muted-foreground">{voucher.customerName}</p>
                        </div>
                        <Badge className={getStatusColor(voucher.status)}>
                          {voucher.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Supplier:</span>
                          <p className="font-medium">{voucher.supplierName}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Amount:</span>
                          <p className="font-medium">₹{voucher.amount.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date:</span>
                          <p>{new Date(voucher.date).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Due Date:</span>
                          <p>{new Date(voucher.dueDate).toLocaleDateString('en-IN')}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/purchase/vouchers/${voucher.id}`)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/purchase/vouchers/${voucher.id}/edit`)}
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
                                This action cannot be undone. This will permanently delete the purchase voucher.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteVoucher(voucher.id)}>
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
              <div className="text-6xl text-gray-300 mb-4">
                <ShoppingCart className="mx-auto h-16 w-16" />
              </div>
              <h3 className="text-xl font-medium text-gray-500 mb-2">No Record Found!!</h3>
              <p className="text-gray-400 mb-6">
                {searchTerm ? 
                  `No purchase vouchers found matching "${searchTerm}"` : 
                  "No purchase vouchers available. Create your first purchase voucher to get started."
                }
              </p>
              {!searchTerm && (
                <Button onClick={handleAddNewPurchaseOrder}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Purchase Order
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {purchaseVouchers.length > itemsPerPageNum && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, purchaseVouchers.length)} of {purchaseVouchers.length} results
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