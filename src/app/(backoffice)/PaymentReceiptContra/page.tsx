"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { 
  Plus, 
  FileDown, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  Search
} from "lucide-react";
import { useHeaderButtons } from "@/hooks/useHeaderButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DateRangePicker from "@/components/shared/date/dateRangePicker";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-toastify";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useAppSelector } from "@/store/hooks";

interface LedgerEntry {
  ledgerAccountId: string;
  date: string;
  amount: number;
  type: "Dr" | "Cr";
  primaryDescription: string;
  id: string;
  documentId: string;
  documentType: string;
  documentNumber: string;
  secondaryDescription: string;
  referenceDescription: string;
  ledgerReference: string | null;
  isOpeningBalance: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Voucher {
  voucherNumber: string;
  voucherType: string;
  date: string;
  fpoId: string;
  description: string;
  id: string;
  notes: string;
  isReversalEntry: boolean;
  originalVoucherId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  ledgerEntryIds: string[];
  lineItems: any[];
  ledgerEntries?: LedgerEntry[];
}

interface VoucherData {
  voucher: Voucher;
  ledgerEntries: LedgerEntry[];
}

export default function VouchersPage() {
  const router = useRouter();
  
  const user = useAppSelector((state) => state.user);
  const fpoIdOfUser = user.fpoId || "";
  const fpoId = fpoIdOfUser;

  // Voucher type filter
  const [voucherType, setVoucherType] = useState<"payment" | "receipt" | "contra">("payment");

  // Date range state - initialized to current month
  const [dateRange, setDateRange] = useState<{from: Date | undefined; to: Date | undefined}>(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    return { from: startOfMonth, to: endOfMonth };
  });
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "balanced" | "unbalanced">("all");
  const [isExporting, setIsExporting] = useState(false);
  
  // State for API data
  const [vouchersData, setVouchersData] = useState<VoucherData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Alert dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [voucherToDelete, setVoucherToDelete] = useState<{ id: string; number: string } | null>(null);

  const startDate = useMemo(() => dateRange?.from?.toISOString(), [dateRange?.from]);
  const endDate = useMemo(() => dateRange?.to?.toISOString(), [dateRange?.to]);

  // Helper functions (replacing utils)
  const calculateDisplayAmount = (voucher: Voucher): number => {
    if (!voucher.ledgerEntries || voucher.ledgerEntries.length === 0) {
      return 0;
    }
    // Sum all debit amounts
    return voucher.ledgerEntries
      .filter(entry => entry.type === 'Dr')
      .reduce((sum, entry) => sum + entry.amount, 0);
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getVoucherStatus = (voucher: Voucher): 'balanced' | 'unbalanced' => {
    if (!voucher.ledgerEntries || voucher.ledgerEntries.length === 0) {
      return 'unbalanced';
    }
    
    const totalDebit = voucher.ledgerEntries
      .filter(entry => entry.type === 'Dr')
      .reduce((sum, entry) => sum + entry.amount, 0);
      
    const totalCredit = voucher.ledgerEntries
      .filter(entry => entry.type === 'Cr')
      .reduce((sum, entry) => sum + entry.amount, 0);
    
    return Math.abs(totalDebit - totalCredit) < 0.01 ? 'balanced' : 'unbalanced';
  };

  // Fetch vouchers from API
  const fetchVouchers = useCallback(async () => {
    if (!fpoId || !startDate || !endDate) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        fpoId,
        startDate,
        endDate,
        voucherType,
      });

      const response = await fetch(`/api/vouchers?${params}`);
      const result = await response.json();
      console.log(result)

      if (result.success) {
        setVouchersData(result.data || []);
      } else {
        setError(result.error || "Failed to fetch vouchers");
        toast.error(result.error || "Failed to fetch vouchers");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch vouchers";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fpoId, startDate, endDate, voucherType]);

  // Fetch vouchers when filters change
  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  // Delete voucher function
  const deleteVoucher = async (id: string) => {
    try {
      const response = await fetch(`/api/vouchers/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        // Refresh the vouchers list
        await fetchVouchers();
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to delete voucher" };
    }
  };

  // Transform API data to match the expected voucher format
  const vouchers = useMemo(() => {
    return vouchersData.map(item => ({
      ...item.voucher,
      ledgerEntries: item.ledgerEntries,
    }));
  }, [vouchersData]);

  // Navigation handlers
  const handleAddPayment = useCallback(() => {
    router.push("/PaymentReceiptContra/Payment/add");
  }, [router]);

  const handleAddReceipt = useCallback(() => {
    router.push("PaymentReceiptContra/Receipt/add");
  }, [router]);

  const handleAddContra = useCallback(() => {
    router.push("/PaymentReceiptContra/Contra/add");
  }, [router]);

  const handleView = useCallback((id: string) => {
    const routes = {
      payment: `/PaymentReceiptContra/Payment/view/${id}`,
      receipt: `/PaymentReceiptContra/Receipt/view/${id}`,
      contra: `/PaymentReceiptContra/Contra/view/${id}`
    };
    router.push(routes[voucherType]);
  }, [router, voucherType]);

  const handleEdit = useCallback((id: string) => {
    const routes = {
      payment: `/PaymentReceiptContra/Payment/edit/${id}`,
      receipt: `/PaymentReceiptContra/Receipt/edit/${id}`,
      contra: `/PaymentReceiptContra/Contra/edit/${id}`
    };
    router.push(routes[voucherType]);
  }, [router, voucherType]);

  const handleDeleteClick = useCallback((id: string, voucherNumber: string) => {
    setVoucherToDelete({ id, number: voucherNumber });
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!voucherToDelete) return;

    const voucherTypeLabel = voucherType.charAt(0).toUpperCase() + voucherType.slice(1);
    
    try {
      const response = await deleteVoucher(voucherToDelete.id);
      if (response.success) {
        toast.success(`${voucherTypeLabel} voucher deleted successfully`);
        setDeleteDialogOpen(false);
        setVoucherToDelete(null);
      } else {
        toast.error(response.error || `Failed to delete ${voucherTypeLabel} voucher`);
      }
    } catch (error) {
      toast.error(`Failed to delete ${voucherTypeLabel} voucher`);
    }
  }, [voucherToDelete, voucherType]);

  const filteredData = useMemo(() => {
    if (!vouchers) return [];

    return vouchers.filter(voucher => {
      const matchesSearch = 
        voucher.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (voucher.description || '').toLowerCase().includes(searchTerm.toLowerCase());
        
      const voucherStatus = getVoucherStatus(voucher);
      const matchesStatus = statusFilter === "all" || voucherStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [vouchers, searchTerm, statusFilter]);

  const summaryStats = useMemo(() => {
    const totalVouchers = filteredData.length;
    const totalAmount = filteredData.reduce((sum, voucher) => 
      sum + calculateDisplayAmount(voucher), 0
    );
    const balancedVouchers = filteredData.filter(v => 
      getVoucherStatus(v) === 'balanced'
    ).length;
    
    return { totalVouchers, totalAmount, balancedVouchers };
  }, [filteredData]);

  const handleExport = useCallback(async () => {
    if (filteredData.length === 0) {
      toast.error("No data to export");
      return;
    }

    setIsExporting(true);
    
    try {
      const workbook = new ExcelJS.Workbook();
      const voucherTypeLabel = voucherType.charAt(0).toUpperCase() + voucherType.slice(1);
      const worksheet = workbook.addWorksheet(`${voucherTypeLabel} Vouchers`);

      worksheet.columns = [
        { header: 'Voucher Number', key: 'voucherNumber', width: 20 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Narration', key: 'narration', width: 40 },
        { header: 'Total Amount', key: 'totalAmount', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      filteredData.forEach(voucher => {
        worksheet.addRow({
          voucherNumber: voucher.voucherNumber,
          date: format(new Date(voucher.date), 'dd/MM/yyyy'),
          narration: voucher.description || '',
          totalAmount: calculateDisplayAmount(voucher),
          status: getVoucherStatus(voucher),
        });
      });

      worksheet.columns.forEach(column => {
        if (column.key !== 'narration') {
          column.width = Math.max(column.width || 10, 12);
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      saveAs(blob, `${voucherType}_vouchers_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      
      toast.success("Export completed successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  }, [filteredData, voucherType]);

  // Header buttons - Add buttons for payment, receipt, and contra only
  const headerbuttons = useMemo(() => [
    {
      label: "Add Payment",
      onClick: handleAddPayment,
      icon: <Plus className="h-4 w-4" />,
    },
    {
      label: "Add Receipt",
      onClick: handleAddReceipt,
      icon: <Plus className="h-4 w-4" />,
    },
    {
      label: "Add Contra",
      onClick: handleAddContra,
      icon: <Plus className="h-4 w-4" />,
    },
    {
      label: isExporting ? "Exporting..." : "Export Excel",
      onClick: handleExport,
      disabled: isExporting || loading,
      icon: <FileDown className="h-4 w-4" />,
    },
  ], [handleAddPayment, handleAddReceipt, handleAddContra, handleExport, isExporting, loading]);

  useHeaderButtons(headerbuttons);

  const getVoucherTitle = () => {
    const titles = {
      payment: "Payment Vouchers",
      receipt: "Receipt Vouchers",
      contra: "Contra Vouchers"
    };
    return titles[voucherType];
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Vouchers
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{summaryStats.totalVouchers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">
              {formatAmount(summaryStats.totalAmount)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Balanced Vouchers
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-green-600">
              {summaryStats.balancedVouchers}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Date Range Picker */}
            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium block">Date Range</label>
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                showStandardFilters={false}
                showFinancialYears={true}
                placeholder="Select date range"
                resetToCurrentMonth={true}
                numberOfMonths={2}
              />
            </div>

            {/* Voucher Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Voucher Type</label>
              <Select 
                value={voucherType} 
                onValueChange={(value) => setVoucherType(value as "payment" | "receipt" | "contra")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="receipt">Receipt</SelectItem>
                  <SelectItem value="contra">Contra</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select 
                value={statusFilter} 
                onValueChange={(value) => setStatusFilter(value as "all" | "balanced" | "unbalanced")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="unbalanced">Unbalanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vouchers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vouchers Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">{getVoucherTitle()}</CardTitle>
          {dateRange.from && dateRange.to && (
            <div className="text-sm text-muted-foreground">
              Showing: {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">Loading {voucherType} vouchers...</p>
            </div>
          ) : filteredData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voucher No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Narration</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((voucher) => (
                    <TableRow key={voucher.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {voucher.voucherNumber}
                      </TableCell>
                      <TableCell>
                        {format(new Date(voucher.date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {voucher.description || 'No description'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatAmount(calculateDisplayAmount(voucher))}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={getVoucherStatus(voucher) === 'balanced' ? 'default' : 'destructive'}
                        >
                          {getVoucherStatus(voucher) === 'balanced' ? 'Balanced' : 'Unbalanced'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => voucher.id && handleView(voucher.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => voucher.id && handleEdit(voucher.id)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => voucher.id && handleDeleteClick(voucher.id, voucher.voucherNumber)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-16 text-center">
              <div className="text-6xl text-gray-300 mb-4">📄</div>
              <h3 className="text-xl font-medium text-gray-500 mb-2">
                No {getVoucherTitle()} Found
              </h3>
              <p className="text-gray-400 mb-4">
                Try adjusting your filters or add a new {voucherType} voucher.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {voucherType} voucher{" "}
              <span className="font-semibold">{voucherToDelete?.number}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setVoucherToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}