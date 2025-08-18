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
import { Search, FileDown, Plus, Eye, Edit, Trash2, MoreHorizontal, Calendar, ShoppingCart, FileText } from "lucide-react";
import { PurchaseVoucherAPI } from "@/server/features/purchase/infrastructure/apihelpers/purchaseVoucher/purchaseVoucherApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchLedgerAccountsAsync, selectAllLedgerAccounts, selectLedgerAccountsError, selectLedgerAccountsLoading } from "@/store/slices/ledgerAccountSlice";
import { PurchaseVoucherPDFService } from "@/server/services/pdf/PurchaseVoucherPDFService";

// Purchase Voucher interface matching your API structure
interface PurchaseVoucher {
  id: string;
  poNumber?: string;
  voucherNumber? : string;
  supplierVendorName: string;
  supplierVendorId: string;
  supplierVendorBillingAddress: string;
  partyInvoiceNumber: string;
  partyInvoiceDate: Date;
  gstin?: string;
  summary: {
    subTotal: number;
    totalGST: number;
    grandTotal: number;
  };
  status: 'draft' | 'approved' | 'rejected';
  fpoId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Stats interface
interface PurchaseVoucherStats {
  totalVouchers: number;
  totalAmount: number;
  draftCount: number;
  approvedCount: number;
  rejectedCount: number;
  avgAmount: number;
}

export default function PurchaseVoucherPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [purchaseVouchers, setPurchaseVouchers] = useState<PurchaseVoucher[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("25");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "draft" | "approved" | "rejected">("all");
  const [fromDate, setFromDate] = useState("2025-04-01");
  const [toDate, setToDate] = useState("2026-03-31");
  const [stats, setStats] = useState<PurchaseVoucherStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // redux states
  const user = useAppSelector((state) => state.user);
  const ledgerAccounts = useAppSelector(selectAllLedgerAccounts);
  const ledgerAccountsLoading = useAppSelector(selectLedgerAccountsLoading);
  const ledgerAccountsError = useAppSelector(selectLedgerAccountsError);

  // Get FPO ID with null check
  const fpoId = user?.fpoId;

  // Fetch ledger accounts on component mount
  useEffect(() => {
    if (fpoId && ledgerAccounts.length === 0) {
      dispatch(fetchLedgerAccountsAsync());
    }
  }, [dispatch, fpoId, ledgerAccounts.length]);

  // Load purchase vouchers from API
  const loadPurchaseVouchers = useCallback(async () => {
    if (!fpoId) {
      setError("FPO ID is required");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await PurchaseVoucherAPI.getAll({fpoId });
      setPurchaseVouchers(response.data || []);
    } catch (error) {
      console.error("Error loading purchase vouchers:", error);
      setError("Failed to load purchase vouchers");
      setPurchaseVouchers([]);
    } finally {
      setIsLoading(false);
    }
  }, [fpoId]);

  // Load statistics
  const loadStats = useCallback(async () => {
    if (!fpoId) {
      return;
    }

    try {
      const response = await PurchaseVoucherAPI.getStats(fpoId);
      setStats(response.data);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }, [fpoId]);

  // Header button functionalities
  const handleAddNewPurchaseVoucher = useCallback(() => {
    if (!fpoId) {
      setError("FPO ID is required to add purchase voucher");
      return;
    }
    console.log("Add Purchase Voucher clicked");
    router.push('/Purchases/PurchaseVoucher/AddNewPurchaseVoucher');
  }, [router, fpoId]);

  // status handler
  const handleStatusChange = (value: string) => {
    setSelectedStatus(value as "all" | "draft" | "approved" | "rejected");
  };

  // Export to Excel using API
  const handleExportExcel = useCallback(async () => {
    if (!fpoId) {
      setError("FPO ID is required for export");
      return;
    }

    setIsLoading(true);
    try {
      await PurchaseVoucherAPI.export(fpoId, 'csv');
    } catch (error) {
      console.error("Error exporting Excel:", error);
      setError("Failed to export data");
    } finally {
      setIsLoading(false);
    }
  }, [fpoId]);

  // Search functionality using API
  const handleSearch = useCallback(async (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);

    if (!fpoId) {
      setError("FPO ID is required for search");
      return;
    }

    if (value.trim()) {
      setIsLoading(true);
      try {
        const response = await PurchaseVoucherAPI.search(fpoId, value);
        setPurchaseVouchers(response.data || []);
      } catch (error) {
        console.error("Error searching:", error);
        setError("Search failed");
      } finally {
        setIsLoading(false);
      }
    } else {
      loadPurchaseVouchers();
    }
  }, [fpoId, loadPurchaseVouchers]);

  // Filter functionality

  // Updated filtering logic to handle the new values
  const handleSubmitFilter = useCallback(async () => {
    if (!fpoId) {
      setError("FPO ID is required for filtering");
      return;
    }

    console.log("Filter submitted:", { selectedSupplier, selectedStatus, fromDate, toDate });
    setCurrentPage(1);
    setIsLoading(true);

    try {
      let response;

      if (selectedStatus !== "all") {
        response = await PurchaseVoucherAPI.getByStatus( selectedStatus,fpoId);
      } else if (fromDate && toDate) {
        response = await PurchaseVoucherAPI.getByDateRange(fpoId, fromDate, toDate);
      } else {
        response = await PurchaseVoucherAPI.getAll({fpoId});
      }

      let filteredData = response.data || [];

      // Additional client-side filtering for supplier if needed
      // Skip filtering for "all", "loading", and "no-suppliers" values
      if (selectedSupplier &&
        selectedSupplier !== "all" &&
        selectedSupplier !== "loading" &&
        selectedSupplier !== "no-suppliers") {
        filteredData = filteredData.filter((voucher: PurchaseVoucher) =>
          voucher.supplierVendorName.toLowerCase().includes(selectedSupplier.toLowerCase()) ||
          voucher.supplierVendorId === selectedSupplier
        );
      }

      setPurchaseVouchers(filteredData);
    } catch (error) {
      console.error("Error filtering:", error);
      setError("Filter failed");
    } finally {
      setIsLoading(false);
    }
  }, [fpoId, selectedSupplier, selectedStatus, fromDate, toDate]);
  // Delete voucher handler
  const handleDeleteVoucher = useCallback(async (voucherId: string) => {
    try {
      await PurchaseVoucherAPI.delete(voucherId);
      setPurchaseVouchers(prev => prev.filter(v => v.id !== voucherId));
      loadStats(); // Refresh stats after deletion
    } catch (error) {
      console.error('Error deleting voucher:', error);
      setError("Failed to delete voucher");
    }
  }, [loadStats]);

   const handleDownloadPDF = useCallback(async (voucherId: string) => {
    try {
  const pdfService = new PurchaseVoucherPDFService();
await pdfService.generatePDF(voucherId);
    } catch (error) {
      console.error('Error geerating pdf', error);
      setError("Failed to generate pdf");
    }
  }, [loadStats]);



  // Header buttons configuration
  const headerButtons = useMemo(() => [
    {
      label: "Add Purchase Voucher",
      onClick: handleAddNewPurchaseVoucher
    },
    {
      label: isLoading ? "Exporting..." : "Export Excel",
      onClick: handleExportExcel
    },
  ], [handleAddNewPurchaseVoucher, handleExportExcel, isLoading]);

  useHeaderButtons(headerButtons);

  // Get status variant for Badge
  const getStatusVariant = (status: PurchaseVoucher['status']) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  // Get status color classes
  const getStatusColor = (status: PurchaseVoucher['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      case 'approved': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 hover:bg-red-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  // Pagination logic
  const itemsPerPageNum = parseInt(itemsPerPage);
  const totalPages = Math.ceil(purchaseVouchers.length / itemsPerPageNum);
  const startIndex = (currentPage - 1) * itemsPerPageNum;
  const endIndex = startIndex + itemsPerPageNum;
  const currentPurchaseVouchers = purchaseVouchers.slice(startIndex, endIndex);

  // Get suppliers from ledger accounts instead of purchase vouchers
  const suppliers = useMemo(() => {
    if (!ledgerAccounts || ledgerAccounts.length === 0) {
      return [];
    }

    // Filter and sort ledger accounts to use as suppliers
    return ledgerAccounts
      .filter(account => account?.name) // Ensure account has a name
      .map(account => ({
        id: account.id || "",
        name: account.name,
        // Add any other relevant fields from ledger account
      }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [ledgerAccounts]);

  // Format date for display
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN');
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Load data when fpoId is available
  useEffect(() => {
    if (fpoId) {
      loadPurchaseVouchers();
      loadStats();
    }
  }, [loadPurchaseVouchers, loadStats, fpoId]);

  // Show loading state if FPO ID is not available
  if (!fpoId) {
    return (
      <div className="space-y-4 md:space-y-6 p-4 md:p-6">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-700">
              <span className="font-medium">Warning:</span>
              <span>FPO ID is not available. Please ensure you are logged in properly.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <span className="font-medium">Error:</span>
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setError(null)}
                className="ml-auto"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ledger Accounts Error Display */}
      {ledgerAccountsError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <span className="font-medium">Ledger Accounts Error:</span>
              <span>{ledgerAccountsError}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => dispatch(fetchLedgerAccountsAsync())}
                className="ml-auto"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Vouchers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVouchers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approvedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Draft</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.draftCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Purchase Voucher</h1>
          <p className="text-muted-foreground">Manage your purchase vouchers and orders</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddNewPurchaseVoucher} disabled={!fpoId}>
            <Plus className="h-4 w-4 mr-2" />
            Add Purchase Voucher
          </Button>
          <Button variant="outline" onClick={handleExportExcel} disabled={isLoading || !fpoId}>
            <FileDown className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filter Section */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Supplier</label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="--Select Supplier--" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">--Select Supplier--</SelectItem>
                  {ledgerAccountsLoading && (
                    <SelectItem value="loading" disabled>
                      Loading suppliers...
                    </SelectItem>
                  )}
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                  {!ledgerAccountsLoading && suppliers.length === 0 && (
                    <SelectItem value="no-suppliers" disabled>
                      No suppliers available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={selectedStatus} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="--Select Status--" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">--Select Status--</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
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

            <Button onClick={handleSubmitFilter} className="w-full" disabled={isLoading || !fpoId}>
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
            placeholder="Search vouchers, suppliers, invoice numbers..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            disabled={!fpoId}
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
                      <TableHead>Voucher No.</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Invoice Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentPurchaseVouchers.map((voucher) => (
                      <TableRow key={voucher.id}>
                        <TableCell className="font-medium text-primary">
                          {voucher.voucherNumber || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{voucher.supplierVendorName}</div>
                            {voucher.gstin && (
                              <div className="text-sm text-muted-foreground">GSTIN: {voucher.gstin}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{voucher.partyInvoiceNumber}</TableCell>
                        <TableCell>{formatDate(voucher.partyInvoiceDate)}</TableCell>
                        <TableCell>{formatCurrency(voucher.summary.grandTotal)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(voucher.status)}>
                            {voucher.status.charAt(0).toUpperCase() + voucher.status.slice(1)}
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
 onSelect={(e) => handleDownloadPDF(voucher.id)}                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Pdf
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/Purchases/PurchaseVoucher/${voucher.id}/edit`)}
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
                          <p className="font-medium text-primary">{voucher.poNumber || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">{voucher.supplierVendorName}</p>
                        </div>
                        <Badge className={getStatusColor(voucher.status)}>
                          {voucher.status.charAt(0).toUpperCase() + voucher.status.slice(1)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Invoice:</span>
                          <p className="font-medium">{voucher.partyInvoiceNumber}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Amount:</span>
                          <p className="font-medium">{formatCurrency(voucher.summary.grandTotal)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date:</span>
                          <p>{formatDate(voucher.partyInvoiceDate)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">GSTIN:</span>
                          <p>{voucher.gstin || 'N/A'}</p>
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
                          onClick={() => router.push(`/Purchases/PurchaseVoucher/${voucher.id}/edit`)}
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
                <Button onClick={handleAddNewPurchaseVoucher} disabled={!fpoId}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Purchase Voucher
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