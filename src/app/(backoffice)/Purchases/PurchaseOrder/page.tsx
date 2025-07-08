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

// Purchase Order data structure
interface PurchaseOrder {
  id: string;
  supplierName: string;
  purchaseOrderNumber: string;
  amount: number;
  date: string;
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected' | 'Delivered' | 'Cancelled';
  expectedDelivery: string;
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
};

export default function PurchaseOrderPage() {
  const router = useRouter();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("25");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Sample purchase order data - replace with your API calls
  const samplePurchaseOrders: PurchaseOrder[] = [
    {
      id: "1",
      supplierName: "ABC Agricultural Supplies",
      purchaseOrderNumber: "PO-2024-001",
      amount: 45000,
      date: "2024-01-15",
      status: "Approved",
      expectedDelivery: "2024-02-15"
    },
    {
      id: "2",
      supplierName: "Green Tech Equipment",
      purchaseOrderNumber: "PO-2024-002",
      amount: 85000,
      date: "2024-01-20",
      status: "Sent",
      expectedDelivery: "2024-02-20"
    },
    {
      id: "3",
      supplierName: "Farm Tools International",
      purchaseOrderNumber: "PO-2024-003",
      amount: 32500,
      date: "2024-01-25",
      status: "Delivered",
      expectedDelivery: "2024-02-25"
    },
    {
      id: "4",
      supplierName: "Organic Seeds Co.",
      purchaseOrderNumber: "PO-2024-004",
      amount: 15750,
      date: "2024-01-30",
      status: "Draft",
      expectedDelivery: "2024-03-01"
    },
    {
      id: "5",
      supplierName: "Irrigation Systems Ltd",
      purchaseOrderNumber: "PO-2024-005",
      amount: 125000,
      date: "2024-02-05",
      status: "Rejected",
      expectedDelivery: "2024-03-05"
    },
    {
      id: "6",
      supplierName: "Fertilizer Experts",
      purchaseOrderNumber: "PO-2024-006",
      amount: 28900,
      date: "2024-02-10",
      status: "Cancelled",
      expectedDelivery: "2024-03-10"
    }
  ];

  // Header button functionalities
  const handleAddPurchaseOrder = useCallback(() => {
    console.log("Add Purchase Order clicked");
    router.push('/dashboard/purchase/purchase-orders/new');
  }, [router]);
 
  const handleExportExcel = useCallback(async () => {
    setIsLoading(true);
    try {
      const dataToExport = purchaseOrders.length > 0 ? purchaseOrders : samplePurchaseOrders;

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Purchase Orders");

      worksheet.columns = [
        { header: 'Purchase Order Number', key: 'purchaseOrderNumber', width: 25 },
        { header: 'Supplier Name', key: 'supplierName', width: 30 },
        { header: 'Amount (₹)', key: 'amount', width: 15 },
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Expected Delivery', key: 'expectedDelivery', width: 18 },
        { header: 'Status', key: 'status', width: 12 },
      ];

      dataToExport.forEach(po => {
        worksheet.addRow({
          purchaseOrderNumber: po.purchaseOrderNumber,
          supplierName: po.supplierName,
          amount: po.amount,
          date: formatDate(po.date),
          expectedDelivery: formatDate(po.expectedDelivery),
          status: po.status,
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `purchase_orders_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(new Blob([buffer]), fileName);
    } catch (error) {
      console.error("Error exporting Excel:", error);
    } finally {
      setIsLoading(false);
    }
  }, [purchaseOrders]);
  // Search functionality
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    
    if (value.trim()) {
      const filtered = samplePurchaseOrders.filter(po =>
        po.supplierName.toLowerCase().includes(value.toLowerCase()) ||
        po.purchaseOrderNumber.toLowerCase().includes(value.toLowerCase()) ||
        po.status.toLowerCase().includes(value.toLowerCase())
      );
      setPurchaseOrders(filtered);
    } else {
      setPurchaseOrders(samplePurchaseOrders);
    }
  }, []);

  // Load sample data on component mount
  const loadPurchaseOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setPurchaseOrders(samplePurchaseOrders);
    } catch (error) {
      console.error("Error loading purchase orders:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Header buttons configuration
  const headerButtons = useMemo(() => [
    { 
      label: "Add Purchase Order", 
      onClick: handleAddPurchaseOrder 
    },
    { 
      label: isLoading ? "Exporting..." : "Export Excel", 
      onClick: handleExportExcel 
    },
  ], [handleAddPurchaseOrder, handleExportExcel, isLoading]);

  useHeaderButtons(headerButtons);

  // Get status variant for Badge
  const getStatusVariant = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'Draft': return 'secondary';
      case 'Sent': return 'default';
      case 'Approved': return 'default';
      case 'Rejected': return 'destructive';
      case 'Delivered': return 'default';
      case 'Cancelled': return 'outline';
      default: return 'secondary';
    }
  };

  // Get status color classes
  const getStatusColor = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      case 'Sent': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'Approved': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'Rejected': return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'Delivered': return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200';
      case 'Cancelled': return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  // Pagination logic
  const itemsPerPageNum = parseInt(itemsPerPage);
  const totalPages = Math.ceil(purchaseOrders.length / itemsPerPageNum);
  const startIndex = (currentPage - 1) * itemsPerPageNum;
  const endIndex = startIndex + itemsPerPageNum;
  const currentPurchaseOrders = purchaseOrders.slice(startIndex, endIndex);

  // Delete purchase order handler
  const handleDeletePurchaseOrder = (purchaseOrderId: string) => {
    console.log('Delete purchase order:', purchaseOrderId);
    setPurchaseOrders(prev => prev.filter(po => po.id !== purchaseOrderId));
  };

  useEffect(() => {
    loadPurchaseOrders();
  }, [loadPurchaseOrders]);

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
            <BreadcrumbPage>Purchase Order List</BreadcrumbPage>
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
              placeholder="Search purchase orders..." 
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleAddPurchaseOrder}
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
              <p className="mt-2 text-muted-foreground">Loading purchase orders...</p>
            </div>
          ) : currentPurchaseOrders.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Purchase Order Number</TableHead>
                      <TableHead>Supplier Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Expected Delivery</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentPurchaseOrders.map((purchaseOrder) => (
                      <TableRow key={purchaseOrder.id}>
                        <TableCell className="font-medium text-primary">
                          {purchaseOrder.purchaseOrderNumber}
                        </TableCell>
                        <TableCell>{purchaseOrder.supplierName}</TableCell>
                        <TableCell>₹{purchaseOrder.amount.toLocaleString('en-IN')}</TableCell>
                        <TableCell>{formatDate(purchaseOrder.date)}</TableCell>
                        <TableCell>{formatDate(purchaseOrder.expectedDelivery)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(purchaseOrder.status)}>
                            {purchaseOrder.status}
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
                                onClick={() => router.push(`/dashboard/purchase/purchase-orders/${purchaseOrder.id}`)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/purchase/purchase-orders/${purchaseOrder.id}/edit`)}
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
                                      This action cannot be undone. This will permanently delete the purchase order.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeletePurchaseOrder(purchaseOrder.id)}>
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
                {currentPurchaseOrders.map((purchaseOrder) => (
                  <Card key={purchaseOrder.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-primary">{purchaseOrder.purchaseOrderNumber}</p>
                          <p className="text-sm text-muted-foreground">{purchaseOrder.supplierName}</p>
                        </div>
                        <Badge className={getStatusColor(purchaseOrder.status)}>
                          {purchaseOrder.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Amount:</span>
                          <p className="font-medium">₹{purchaseOrder.amount.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date:</span>
                          <p>{formatDate(purchaseOrder.date)}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Expected Delivery:</span>
                          <p>{formatDate(purchaseOrder.expectedDelivery)}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/purchase/purchase-orders/${purchaseOrder.id}`)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/purchase/purchase-orders/${purchaseOrder.id}/edit`)}
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
                                This action cannot be undone. This will permanently delete the purchase order.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeletePurchaseOrder(purchaseOrder.id)}>
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
              <div className="text-6xl text-gray-300 mb-4">📋</div>
              <h3 className="text-xl font-medium text-gray-500 mb-2">No Record Found!!</h3>
              <p className="text-gray-400 mb-6">
                {searchTerm ? 
                  `No purchase orders found matching "${searchTerm}"` : 
                  "No purchase orders available. Create your first purchase order to get started."
                }
              </p>
              {!searchTerm && (
                <Button onClick={handleAddPurchaseOrder}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Purchase Order
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {purchaseOrders.length > itemsPerPageNum && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, purchaseOrders.length)} of {purchaseOrders.length} results
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