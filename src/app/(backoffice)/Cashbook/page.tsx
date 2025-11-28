'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Download, TrendingUp, TrendingDown, DollarSign, Receipt } from 'lucide-react';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { CashbookAPI } from '@/server/features/cashbookSystem/infrastructure/apiHelper/cashbookApi';
import { useAppSelector } from '@/store/hooks';
import { StatementPDFUtils } from '@/server/services/pdf/Statements/StatementPDFService';
import { DatePicker } from '@/components/ui/datepicker';

interface CashbookEntry {
  entry: {
    id: string;
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
    isOpeningBalance?: boolean;
  };
  runningBalance: number;
  runningBalanceType: 'Dr' | 'Cr';
}

interface Cashbook {
  id: string;
  fpoId: string;
  openingBalance: number;
  openingDate: string;
  createdAt: string;
  updatedAt: string;
}

interface CashbookStatement {
  reportType: string;
  period: {
    startDate?: string;
    endDate?: string;
  };
  ledgerAccount?: {
    id: string;
    name: string;
    groupName: string;
  };
  openingBalance: {
    amount: number;
    type: 'Dr' | 'Cr';
  };
  currentBalance: {
    amount: number;
    type: 'Dr' | 'Cr';
  };
  totalCashIn: number;
  totalCashOut: number;
  netCashFlow: number;
  entryCount: number;
  statement: CashbookEntry[];
}

export default function CashbookPage() {
  const user = useAppSelector((state) => state.user);
  const fpoIdOfUser = user.fpoId;

  // State management
  const [loading, setLoading] = useState(true);
  const [cashbook, setCashbook] = useState<Cashbook | null>(null);
  const [statement, setStatement] = useState<CashbookStatement | null>(null);
  const [showInitDialog, setShowInitDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Dr' | 'Cr'>('all');
  
  // Date state as Date objects for DatePicker
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Initialization form state
  const [initOpeningBalance, setInitOpeningBalance] = useState('');
  const [initOpeningDate, setInitOpeningDate] = useState<Date | undefined>(new Date());

  // Export form state
  const [exportStartDate, setExportStartDate] = useState<Date | undefined>(undefined);
  const [exportEndDate, setExportEndDate] = useState<Date | undefined>(undefined);

  // Convert Date to ISO string for API
  const dateToISOString = (date: Date | undefined): string | undefined => {
    if (!date) return undefined;
    return format(date, 'yyyy-MM-dd');
  };

  // Load cashbook data
  const loadCashbookData = async () => {
    if (!fpoIdOfUser) {
      toast.error('FPO ID not found. Please log in again.');
      return;
    }

    try {
      setLoading(true);
      const result = await CashbookAPI.checkCashbook(fpoIdOfUser);
      
      if (result.exists && result.cashbook) {
        setCashbook(result.cashbook);
        await loadStatement();
      } else {
        setShowInitDialog(true);
      }
    } catch (error) {
      console.error('Error loading cashbook:', error);
      toast.error('Failed to load cashbook data');
    } finally {
      setLoading(false);
    }
  };

  // Load statement data
  const loadStatement = async () => {
    if (!fpoIdOfUser) return;

    try {
      const statementData = await CashbookAPI.getStatement(
        fpoIdOfUser,
        dateToISOString(startDate),
        dateToISOString(endDate)
      );

      console.log('Statement data:', statementData);
      setStatement(statementData);
    } catch (error) {
      console.error('Error loading statement:', error);
      toast.error('Failed to load cashbook statement');
    }
  };

  // Initialize cashbook
  const handleInitializeCashbook = async () => {
    if (!fpoIdOfUser) {
      toast.error('FPO ID not found. Please log in again.');
      return;
    }

    try {
      if (!initOpeningBalance || !initOpeningDate) {
        toast.error('Please fill all required fields');
        return;
      }

      const openingBalance = parseFloat(initOpeningBalance);
      if (isNaN(openingBalance)) {
        toast.error('Please enter a valid opening balance');
        return;
      }

      const newCashbook = await CashbookAPI.createCashbook({
        fpoId: fpoIdOfUser,
        openingBalance,
        openingDate: dateToISOString(initOpeningDate)!
      });

      setCashbook(newCashbook);
      setShowInitDialog(false);
      await loadStatement();
      toast.success('Cashbook initialized successfully');
    } catch (error) {
      console.error('Error initializing cashbook:', error);
      toast.error('Failed to initialize cashbook');
    }
  };

  // Export data with date range
  const handleExport = async () => {
    if (!fpoIdOfUser) {
      toast.error('FPO ID not found. Please log in again.');
      return;
    }

    try {
      if (!exportStartDate || !exportEndDate) {
        toast.error('Please select both start and end dates for export');
        return;
      }

      if (exportStartDate > exportEndDate) {
        toast.error('Start date cannot be after end date');
        return;
      }

      try {
        const statementData = await CashbookAPI.getStatement(
          fpoIdOfUser, 
          dateToISOString(exportStartDate)!, 
          dateToISOString(exportEndDate)!
        );
        await StatementPDFUtils.generateCashBookPDF(statementData, fpoIdOfUser);
        toast.success('Cash book PDF exported successfully');
      } catch (error) {
        toast.error('Failed to export cash book PDF');
      }
      
      setShowExportDialog(false);
      setExportStartDate(undefined);
      setExportEndDate(undefined);
      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  // Apply date filter
  const handleDateFilter = async () => {
    if (startDate && endDate) {
      if (startDate > endDate) {
        toast.error('Start date cannot be after end date');
        return;
      }
    }
    await loadStatement();
    toast.success('Filter applied successfully');
  };

  // Filter entries - exclude opening balance
  const filteredEntries = statement?.statement?.filter(entryWrapper => {
    const entry = entryWrapper.entry;
    
    // Skip opening balance entries in the display
    if (entry.isOpeningBalance) {
      return false;
    }
    
    const matchesSearch = !searchTerm || 
      entry.primaryDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.secondaryDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || entry.type === filterType;

    return matchesSearch && matchesType;
  }) || [];

  // Clear date filter
  const clearDateFilter = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setTimeout(() => {
      loadStatement();
      toast.success('Filter cleared');
    }, 100);
  };

  // Helper function to format date safely
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd MMM, yyyy');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(Math.abs(amount));
  };

  // useEffect hook
  useEffect(() => {
    loadCashbookData();
  }, [fpoIdOfUser]);

  // Early return after all hooks are declared
  if (!fpoIdOfUser) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              FPO ID not found. Please log in again to access the cashbook.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading cashbook...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cashbook</h1>
          <p className="text-muted-foreground">
            Manage your cash transactions and track balance
          </p>
          {statement?.ledgerAccount && (
            <p className="text-sm text-muted-foreground mt-1">
              Ledger: {statement.ledgerAccount.name} ({statement.ledgerAccount.groupName})
            </p>
          )}
        </div>
        
        {cashbook && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowExportDialog(true)} className="gap-2">
              <Download className="h-4 w-4" />
              Export Data
            </Button>
          </div>
        )}
      </div>

      {cashbook && statement && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(statement.currentBalance.amount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {statement.currentBalance.type === 'Cr' ? 
                    <span className="text-red-600">Negative Balance (Cr)</span> : 
                    <span className="text-green-600">Positive Balance (Dr)</span>
                  }
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash In</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(statement.totalCashIn)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total receipts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash Out</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(statement.totalCashOut)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total payments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${statement.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(statement.netCashFlow)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {statement.entryCount} transactions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters with DatePicker */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters & Date Range</CardTitle>
              <CardDescription>
                Filter entries by search term, type, and date range
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-6">
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search entries..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={filterType} onValueChange={(value: 'all' | 'Dr' | 'Cr') => setFilterType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Dr">Cash In (Dr)</SelectItem>
                      <SelectItem value="Cr">Cash Out (Cr)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <DatePicker
                    date={startDate}
                    onDateChange={setStartDate}
                    label="Start Date"
                    placeholder="DD/MM/YYYY"
                  />
                </div>

                <div className="md:col-span-2">
                  <DatePicker
                    date={endDate}
                    onDateChange={setEndDate}
                    label="End Date"
                    placeholder="DD/MM/YYYY"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={handleDateFilter} 
                  variant="default" 
                  size="sm"
                  className="gap-1"
                >
                  <Filter className="h-4 w-4" />
                  Apply Filter
                </Button>
                <Button 
                  onClick={clearDateFilter} 
                  variant="outline" 
                  size="sm"
                >
                  Clear Filter
                </Button>
              </div>

              {(startDate || endDate) && (
                <div className="mt-3 text-sm text-muted-foreground">
                  Current Period: {startDate ? format(startDate, 'dd MMM, yyyy') : 'Start'} - {endDate ? format(endDate, 'dd MMM, yyyy') : 'End'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Entries Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Cashbook Entries
              </CardTitle>
              <CardDescription>
                {filteredEntries.length} entries
                {statement.period.startDate && statement.period.endDate && (
                  <span className="ml-2">
                    ({formatDate(statement.period.startDate)} - {formatDate(statement.period.endDate)})
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Doc No.</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No entries found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEntries.map((entryWrapper) => {
                        const entry = entryWrapper.entry;
                        return (
                          <TableRow key={entry.id}>
                            <TableCell>
                              {formatDate(entry.date)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{entry.primaryDescription}</div>
                                {entry.secondaryDescription && (
                                  <div className="text-sm text-muted-foreground">
                                    {entry.secondaryDescription}
                                  </div>
                                )}
                                {entry.referenceDescription && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {entry.referenceDescription}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={entry.type === 'Dr' ? 'default' : 'destructive'}>
                                {entry.type === 'Dr' ? 'Cash In' : 'Cash Out'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {entry.documentNumber && (
                                <Badge variant="outline">
                                  {entry.documentNumber}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${
                              entry.type === 'Dr' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {entry.type === 'Dr' ? '+' : '-'}{formatCurrency(entry.amount)}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${
                              entryWrapper.runningBalanceType === 'Cr' ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {formatCurrency(entryWrapper.runningBalance)}
                              <span className="text-xs ml-1 text-muted-foreground">
                                {entryWrapper.runningBalanceType}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Initialization Dialog */}
      <Dialog open={showInitDialog} onOpenChange={setShowInitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initialize Cashbook</DialogTitle>
            <DialogDescription>
              Set up your cashbook by entering the opening balance and date.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openingBalance">Opening Balance (₹)</Label>
              <Input
                id="openingBalance"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={initOpeningBalance}
                onChange={(e) => setInitOpeningBalance(e.target.value)}
              />
            </div>
            
            <DatePicker
              date={initOpeningDate}
              onDateChange={setInitOpeningDate}
              label="Opening Date"
              placeholder="DD/MM/YYYY"
              required
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInitDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInitializeCashbook}>
              Initialize Cashbook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Cashbook Data</DialogTitle>
            <DialogDescription>
              Select date range to export cashbook entries and statement.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <DatePicker
              date={exportStartDate}
              onDateChange={setExportStartDate}
              label="Start Date"
              placeholder="DD/MM/YYYY"
              required
            />
            
            <DatePicker
              date={exportEndDate}
              onDateChange={setExportEndDate}
              label="End Date"
              placeholder="DD/MM/YYYY"
              required
            />

            {exportStartDate && exportEndDate && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Export Period:</p>
                <p className="text-sm text-muted-foreground">
                  {format(exportStartDate, 'dd MMM, yyyy')} - {format(exportEndDate, 'dd MMM, yyyy')}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowExportDialog(false);
              setExportStartDate(undefined);
              setExportEndDate(undefined);
            }}>
              Cancel
            </Button>
            <Button onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}