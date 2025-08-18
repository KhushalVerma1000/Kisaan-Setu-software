"use client";
// {backoffice}/Ledger/LedgerEntries/page.ts
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Search, Calendar as CalendarIcon, Download, RefreshCw, AlertCircle, FileText, ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Ledger Entry interface (updated to match API response)
interface LedgerEntry {
  id: string;
  ledgerAccountId: string;
  date: string;
  amount: number;
  type: 'Dr' | 'Cr';
  primaryDescription: string;
  documentId?: string;
  documentType?: string;
  documentNumber?: string;
  secondaryDescription?: string;
  referenceDescription?: string;
  ledgerReference?: string;
  isOpeningBalance: boolean;
  createdAt: string;
  updatedAt: string;
}

// Statement Entry interface (matches API response structure)
interface StatementEntry {
  entry: LedgerEntry;
  runningBalance: number;
  runningBalanceType: 'Dr' | 'Cr';
}

// Ledger Account interface (updated to match API response)
interface LedgerAccount {
  id: string;
  name: string;
  groupName: string;
  openingBalance: number;
  balanceType: 'Dr' | 'Cr';
  phoneNumber?: string;
  address?: string;
  fpoId?: string;
  gstNumber?: string;
  openingDate?: string;
  state?: string;
}

// Balance interface 
interface BalanceObject {
  balance: number;
  balanceType: 'Dr' | 'Cr';
}

// Statement interface (updated to match API response)
interface LedgerStatementResponse {
  ledgerAccount: LedgerAccount;
  statement: StatementEntry[];
  currentBalance: BalanceObject;
}

// API Error interface
interface APIError {
  error: string;
  details?: string;
  code?: string;
}

export default function LedgerEntriesPage() {
  const router = useRouter();
  const params = useParams();
  const ledgerId = params.id as string;

  // State management
  const [ledgerAccount, setLedgerAccount] = useState<LedgerAccount | null>(null);
  const [statementEntries, setStatementEntries] = useState<StatementEntry[]>([]);
  const [allStatementEntries, setAllStatementEntries] = useState<StatementEntry[]>([]);
  const [currentBalance, setCurrentBalance] = useState<BalanceObject | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("25");
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Date range state
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);

  // Calculate statement summary from entries
  const statementSummary = useMemo(() => {
    if (!ledgerAccount || statementEntries.length === 0) {
      return {
        openingBalance: ledgerAccount?.openingBalance || 0,
        totalCredit: 0,
        totalDebit: 0,
        closingBalance: currentBalance?.balance || 0
      };
    }

    const totalCredit = statementEntries.reduce((sum, item) => 
      item.entry.type === 'Cr' ? sum + item.entry.amount : sum, 0
    );
    
    const totalDebit = statementEntries.reduce((sum, item) => 
      item.entry.type === 'Dr' ? sum + item.entry.amount : sum, 0
    );

    return {
      openingBalance: ledgerAccount.openingBalance,
      totalCredit,
      totalDebit,
      closingBalance: currentBalance?.balance || 0
    };
  }, [ledgerAccount, statementEntries, currentBalance]);

  // Fetch ledger statement (this will get both account and entries)
  const fetchLedgerStatement = useCallback(async (start?: Date, end?: Date) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let url = `/api/ledger/ledger-entries/statement?ledgerAccountId=${ledgerId}`;
      
      if (start && end) {
        url += `&startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData: APIError = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to fetch ledger statement');
      }
      
      const data: LedgerStatementResponse = await response.json();
      
      // Set ledger account info
      setLedgerAccount(data.ledgerAccount);
      
      // Sort statement entries by date (newest first) - but preserve running balance order
      const sortedEntries = [...data.statement].sort((a, b) => 
        new Date(b.entry.date).getTime() - new Date(a.entry.date).getTime()
      );
      
      setAllStatementEntries(sortedEntries);
      setStatementEntries(sortedEntries);
      setCurrentBalance(data.currentBalance);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch ledger statement';
      setError(errorMessage);
      console.error('Error fetching ledger statement:', err);
      toast.error(`Failed to fetch ledger statement: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [ledgerId]);

  // Handle date range filter
  const handleDateRangeFilter = useCallback(() => {
    if (startDate && endDate) {
      if (startDate > endDate) {
        toast.error('Start date cannot be after end date');
        return;
      }
      
      fetchLedgerStatement(startDate, endDate);
      setCurrentPage(1);
    } else {
      fetchLedgerStatement();
      setCurrentPage(1);
    }
  }, [startDate, endDate, fetchLedgerStatement]);

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  // Apply search filter
  const handleSubmit = useCallback(() => {
    let filtered = [...allStatementEntries];
    
    if (searchTerm.trim()) {
      filtered = filtered.filter(item =>
        item.entry.primaryDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.entry.secondaryDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.entry.referenceDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.entry.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.entry.amount.toString().includes(searchTerm) ||
        item.entry.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setStatementEntries(filtered);
    setCurrentPage(1);
  }, [searchTerm, allStatementEntries]);

  // Clear date filters
  const handleClearDateFilters = useCallback(() => {
    setStartDate(undefined);
    setEndDate(undefined);
    fetchLedgerStatement();
    setCurrentPage(1);
  }, [fetchLedgerStatement]);

  // Download PDF handler (dummy)
  const handleDownloadPDF = useCallback(() => {
    toast.info('PDF download feature coming soon!');
    console.log('Download PDF for ledger:', ledgerId);
  }, [ledgerId]);

  // Refresh data
  const handleRefresh = useCallback(() => {
    if (startDate && endDate) {
      fetchLedgerStatement(startDate, endDate);
    } else {
      fetchLedgerStatement();
    }
  }, [fetchLedgerStatement, startDate, endDate]);

  // Pagination logic
  const itemsPerPageNum = parseInt(itemsPerPage);
  const totalPages = Math.ceil(statementEntries.length / itemsPerPageNum);
  const startIndex = (currentPage - 1) * itemsPerPageNum;
  const endIndex = startIndex + itemsPerPageNum;
  const currentEntries = statementEntries.slice(startIndex, endIndex);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEntries(currentEntries.map(item => item.entry.id));
    } else {
      setSelectedEntries([]);
    }
  };

  const handleSelectEntry = (entryId: string, checked: boolean) => {
    if (checked) {
      setSelectedEntries(prev => [...prev, entryId]);
    } else {
      setSelectedEntries(prev => prev.filter(id => id !== entryId));
    }
  };

  // Load initial data
  useEffect(() => {
    fetchLedgerStatement();
  }, [fetchLedgerStatement]);

  // Apply search when allStatementEntries changes
  useEffect(() => {
    handleSubmit();
  }, [allStatementEntries]);

  if (error && !isLoading) {
    return (
      <div className="space-y-4 md:space-y-6 p-4 md:p-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/Ledger">Ledger</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Ledger Entries</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card>
          <CardContent className="p-16 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-800 mb-2">Failed to Load Ledger Entries</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={handleRefresh}>
                Try Again
              </Button>
              <Button variant="outline" onClick={() => router.push('/Ledger')}>
                Back to Ledger List
              </Button>
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
            <BreadcrumbLink href="/dashboard">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/Ledger">Ledger</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Ledger Entries</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push('/Ledger')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Ledger List
        </Button>
        <h1 className="text-2xl font-bold">Ledger Entries</h1>
      </div>

      {/* Ledger Account Details Card */}
      {ledgerAccount && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {ledgerAccount.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Group</p>
                <p className="font-medium">{ledgerAccount.groupName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Opening Balance</p>
                <div className="flex items-center gap-2">
                  <span className="font-medium">₹{ledgerAccount.openingBalance.toLocaleString('en-IN')}</span>
                  <Badge variant={ledgerAccount.balanceType === 'Dr' ? 'destructive' : 'default'}>
                    {ledgerAccount.balanceType}
                  </Badge>
                </div>
              </div>
              {ledgerAccount.phoneNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{ledgerAccount.phoneNumber}</p>
                </div>
              )}
              {ledgerAccount.address && (
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{ledgerAccount.address}</p>
                </div>
              )}
              {ledgerAccount.state && (
                <div>
                  <p className="text-sm text-muted-foreground">State</p>
                  <p className="font-medium">{ledgerAccount.state}</p>
                </div>
              )}
              {ledgerAccount.gstNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">GST Number</p>
                  <p className="font-medium">{ledgerAccount.gstNumber}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statement Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Statement Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">₹{statementSummary.openingBalance.toLocaleString('en-IN')}</div>
              <div className="text-sm text-blue-600">Opening Balance</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                <TrendingUp className="h-5 w-5" />
                ₹{statementSummary.totalCredit.toLocaleString('en-IN')}
              </div>
              <div className="text-sm text-green-600">Total Credit</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1">
                <TrendingDown className="h-5 w-5" />
                ₹{statementSummary.totalDebit.toLocaleString('en-IN')}
              </div>
              <div className="text-sm text-red-600">Total Debit</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">₹{statementSummary.closingBalance.toLocaleString('en-IN')}</div>
              <div className="text-sm text-purple-600">
                Current Balance ({currentBalance?.balanceType || 'Cr'})
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters Card */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">From Date</label>
              <Popover open={isStartDateOpen} onOpenChange={setIsStartDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Select start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      setIsStartDateOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">To Date</label>
              <Popover open={isEndDateOpen} onOpenChange={setIsEndDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Select end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      setEndDate(date);
                      setIsEndDateOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input 
                  className="pl-10" 
                  placeholder="Search entries..." 
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              <Button 
                onClick={handleDateRangeFilter}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? "Loading..." : "Filter"}
              </Button>
              <Button 
                variant="outline"
                onClick={handleClearDateFilters}
                disabled={isLoading}
              >
                Clear
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button 
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={isLoading}
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Controls */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
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
          
          {selectedEntries.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {selectedEntries.length} selected
            </div>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          Total Entries: {statementEntries.length}
        </div>
      </div>

      {/* Table Card */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">Loading entries...</p>
            </div>
          ) : currentEntries.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedEntries.length === currentEntries.length && currentEntries.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Document</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Running Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentEntries.map((item) => (
                      <TableRow key={item.entry.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedEntries.includes(item.entry.id)}
                            onCheckedChange={(checked) => handleSelectEntry(item.entry.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell>
                          {format(new Date(item.entry.date), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div>
                            <p className="font-medium truncate">{item.entry.primaryDescription}</p>
                            {item.entry.secondaryDescription && (
                              <p className="text-xs text-muted-foreground truncate">
                                {item.entry.secondaryDescription}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {item.entry.documentNumber && (
                            <p className="text-sm truncate">{item.entry.documentNumber}</p>
                          )}
                          {item.entry.referenceDescription && (
                            <p className="text-xs text-muted-foreground truncate">
                              {item.entry.referenceDescription}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.entry.type === 'Dr' ? 'destructive' : 'default'}>
                            {item.entry.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₹{item.entry.amount.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <span>₹{item.runningBalance.toLocaleString('en-IN')}</span>
                            <Badge 
                              variant={item.runningBalanceType === 'Dr' ? 'destructive' : 'default'}
                              className="text-xs"
                            >
                              {item.runningBalanceType}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4 p-4">
                {currentEntries.map((item) => (
                  <Card key={item.entry.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedEntries.includes(item.entry.id)}
                            onCheckedChange={(checked) => handleSelectEntry(item.entry.id, !!checked)}
                          />
                          <div>
                            <p className="font-medium">{format(new Date(item.entry.date), "dd MMM yyyy")}</p>
                            <p className="text-sm text-muted-foreground">{item.entry.primaryDescription}</p>
                            {item.entry.documentNumber && (
                              <p className="text-xs text-muted-foreground">{item.entry.documentNumber}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant={item.entry.type === 'Dr' ? 'destructive' : 'default'}>
                          {item.entry.type}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 border-t">
                        <div>
                          <p className="text-sm text-muted-foreground">Amount</p>
                          <p className="font-medium">₹{item.entry.amount.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Balance</p>
                          <div className="flex items-center gap-1">
                            <p className="font-medium">₹{item.runningBalance.toLocaleString('en-IN')}</p>
                            <Badge 
                              variant={item.runningBalanceType === 'Dr' ? 'destructive' : 'default'}
                              className="text-xs"
                            >
                              {item.runningBalanceType}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="p-16 text-center">
              <div className="text-6xl text-gray-300 mb-4">📊</div>
              <h3 className="text-xl font-medium text-gray-500 mb-2">No Entries Found</h3>
              <p className="text-gray-400 mb-6">
                {searchTerm || startDate || endDate ? 
                  "No entries found matching your filters" : 
                  "No entries available for this ledger account."
                }
              </p>
              {(searchTerm || startDate || endDate) && (
                <Button onClick={() => {
                  setSearchTerm("");
                  setStartDate(undefined);
                  setEndDate(undefined);
                  handleClearDateFilters();
                }}>
                  Clear All Filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {statementEntries.length > itemsPerPageNum && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, statementEntries.length)} of {statementEntries.length} results
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
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
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