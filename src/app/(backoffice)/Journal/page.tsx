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

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface LedgerEntry {
  id: string;
  ledgerAccountId: string;
  date: string;
  amount: number;
  type: 'Dr' | 'Cr';
  primaryDescription: string;
  secondaryDescription: string;
  referenceDescription: string;
  documentId: string;
  documentType: string;
  documentNumber: string;
  ledgerReference: string | null;
  isOpeningBalance: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SerializedVoucher {
  id?: string;
  voucherNumber: string;
  voucherType: string;
  date: string;
  fpoId: string;
  description: string;
  notes?: string;
  ledgerEntryIds: string[];
  isReversalEntry?: boolean;
  originalVoucherId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface VoucherWithEntries {
  voucher: SerializedVoucher;
  ledgerEntries: LedgerEntry[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const getTotalDebits = (ledgerEntries: LedgerEntry[]): number => {
  return ledgerEntries
    .filter(entry => entry.type === 'Dr')
    .reduce((sum, entry) => sum + entry.amount, 0);
};

const getTotalCredits = (ledgerEntries: LedgerEntry[]): number => {
  return ledgerEntries
    .filter(entry => entry.type === 'Cr')
    .reduce((sum, entry) => sum + entry.amount, 0);
};

const isVoucherBalanced = (ledgerEntries: LedgerEntry[]): boolean => {
  const debits = getTotalDebits(ledgerEntries);
  const credits = getTotalCredits(ledgerEntries);
  return Math.abs(debits - credits) < 0.01;
};

const getVoucherStatus = (ledgerEntries: LedgerEntry[]): 'balanced' | 'unbalanced' => {
  return isVoucherBalanced(ledgerEntries) ? 'balanced' : 'unbalanced';
};

const getDisplayAmount = (ledgerEntries: LedgerEntry[]): number => {
  return getTotalDebits(ledgerEntries);
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function JournalVoucherPage() {
  const router = useRouter();
  
  // Get current FPO ID
  const user = useAppSelector((state) => state.user);
  const fpoId = user.fpoId || "";
  
  // Date range state
  const [dateRange, setDateRange] = useState<{from: Date | undefined; to: Date | undefined}>(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999); 
    return { from: startOfMonth, to: endOfMonth };
  });
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "balanced" | "unbalanced">("all");
  
  // Data state
  const [vouchersData, setVouchersData] = useState<VoucherWithEntries[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Alert dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [voucherToDelete, setVoucherToDelete] = useState<{ id: string; number: string } | null>(null);

  // Fetch vouchers using API endpoint
  const fetchVouchers = useCallback(async () => {
    if (!fpoId || !dateRange.from || !dateRange.to) return;

    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams({
        fpoId,
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        voucherType: 'journal'
      });

      // Call API endpoint
      const response = await fetch(`/api/vouchers?${params.toString()}`);
      const result = await response.json();

      if (result.success && result.data) {
        // Filter for journal vouchers only
        const journalVouchers = result.data.filter(
          (item: VoucherWithEntries) => item.voucher.voucherType === 'journal'
        );
        
        console.log('Journal vouchers:', journalVouchers);
        setVouchersData(journalVouchers);
      } else {
        toast.error(result.error || "Failed to fetch vouchers");
        setVouchersData([]);
      }
    } catch (error) {
      console.error('Fetch vouchers error:', error);
      toast.error("Failed to fetch vouchers");
      setVouchersData([]);
    } finally {
      setLoading(false);
    }
  }, [fpoId, dateRange.from, dateRange.to]);

  // Fetch vouchers when date range changes
  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  // Memoized handlers
  const handleAdd = useCallback(() => {
    router.push("/Journal/add");
  }, [router]);

  const handleView = useCallback((id: string) => {
    router.push(`/Journal/view/${id}`);
  }, [router]);

  const handleEdit = useCallback((id: string) => {
    router.push(`/Journal/edit/${id}`);
  }, [router]);

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
  const handleDeleteClick = useCallback((id: string, voucherNumber: string) => {
    setVoucherToDelete({ id, number: voucherNumber });
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!voucherToDelete) return;

    try {
      const response = await deleteVoucher(voucherToDelete.id);
      if (response.success) {
        toast.success("Journal voucher deleted successfully");
        setDeleteDialogOpen(false);
        setVoucherToDelete(null);
        fetchVouchers();
      } else {
        toast.error(response.error || "Failed to delete journal voucher");
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error("Failed to delete journal voucher");
    }
  }, [voucherToDelete, fetchVouchers]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!vouchersData) return [];

    return vouchersData.filter(item => {
      const voucher = item.voucher;
      const matchesSearch = 
        voucher.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (voucher.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (voucher.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
        
      const voucherStatus = getVoucherStatus(item.ledgerEntries);
      const matchesStatus = statusFilter === "all" || voucherStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [vouchersData, searchTerm, statusFilter]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalVouchers = filteredData.length;
    const totalAmount = filteredData.reduce((sum, item) => 
      sum + getDisplayAmount(item.ledgerEntries), 0
    );
    const balancedVouchers = filteredData.filter(item => 
      getVoucherStatus(item.ledgerEntries) === 'balanced'
    ).length;
    const unbalancedVouchers = totalVouchers - balancedVouchers;
    
    return { totalVouchers, totalAmount, balancedVouchers, unbalancedVouchers };
  }, [filteredData]);

  // Export handler
  const handleExport = useCallback(async () => {
    if (filteredData.length === 0) {
      toast.error("No data to export");
      return;
    }

    setIsExporting(true);
    
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Journal Vouchers");

      worksheet.columns = [
        { header: 'Voucher Number', key: 'voucherNumber', width: 20 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Narration', key: 'narration', width: 40 },
        { header: 'Debit Amount', key: 'debitAmount', width: 15 },
        { header: 'Credit Amount', key: 'creditAmount', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Notes', key: 'notes', width: 30 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      filteredData.forEach(item => {
        const voucher = item.voucher;
        worksheet.addRow({
          voucherNumber: voucher.voucherNumber,
          date: format(new Date(voucher.date), 'dd/MM/yyyy'),
          narration: voucher.description || '',
          debitAmount: getTotalDebits(item.ledgerEntries),
          creditAmount: getTotalCredits(item.ledgerEntries),
          status: getVoucherStatus(item.ledgerEntries),
          notes: voucher.notes || '',
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      saveAs(blob, `journal_vouchers_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      
      toast.success("Export completed successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  }, [filteredData]);

  // Header buttons
  const headerbuttons = useMemo(() => [
    {
      label: "Add Journal Voucher",
      onClick: handleAdd,
      icon: <Plus className="h-4 w-4" />,
    },
    {
      label: isExporting ? "Exporting..." : "Export Excel",
      onClick: handleExport,
      disabled: isExporting || loading || filteredData.length === 0,
      icon: <FileDown className="h-4 w-4" />,
    },
  ], [handleAdd, handleExport, isExporting, loading, filteredData.length]);
  
  useHeaderButtons(headerbuttons);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Breadcrumb */}
      

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              Balanced
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-green-600">
              {summaryStats.balancedVouchers}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unbalanced
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-red-600">
              {summaryStats.unbalancedVouchers}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <CardTitle className="text-lg font-semibold">Journal Vouchers</CardTitle>
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
              <p className="mt-2 text-muted-foreground">Loading journal vouchers...</p>
            </div>
          ) : filteredData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voucher No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Narration</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => {
                    const voucher = item.voucher;
                    const ledgerEntries = item.ledgerEntries;
                    
                    return (
                      <TableRow key={voucher.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {voucher.voucherNumber}
                        </TableCell>
                        <TableCell>
                          {format(new Date(voucher.date), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate" title={voucher.description || 'No description'}>
                            {voucher.description || 'No description'}
                          </div>
                          {voucher.notes && (
                            <div className="text-xs text-muted-foreground truncate" title={voucher.notes}>
                              {voucher.notes}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAmount(getTotalDebits(ledgerEntries))}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAmount(getTotalCredits(ledgerEntries))}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={getVoucherStatus(ledgerEntries) === 'balanced' ? 'default' : 'destructive'}
                          >
                            {getVoucherStatus(ledgerEntries) === 'balanced' ? '✓ Balanced' : '✗ Unbalanced'}
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
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-16 text-center">
              <div className="text-6xl text-gray-300 mb-4">📄</div>
              <h3 className="text-xl font-medium text-gray-500 mb-2">
                No Journal Vouchers Found
              </h3>
              <p className="text-gray-400 mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? "Try adjusting your filters to see more results."
                  : "Get started by creating your first journal voucher."}
              </p>
              <Button onClick={handleAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Add Journal Voucher
              </Button>
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
              This will permanently delete the journal voucher{" "}
              <span className="font-semibold">{voucherToDelete?.number}</span>.
              This action cannot be undone and will remove all associated ledger entries.
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