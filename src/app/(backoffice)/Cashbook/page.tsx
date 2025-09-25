'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus, Search, Filter, Download, TrendingUp, TrendingDown, DollarSign, Receipt, CreditCard } from 'lucide-react';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { CashbookAPI } from '@/server/features/cashbookSystem/infrastructure/apiHelper/cashbookApi';
import { useAppSelector } from '@/store/hooks';

interface CashbookEntry {
  entry: {
    id: string;
    cashBookId: string;
    date: string;
    amount: number;
    type: 'Dr' | 'Cr';
    transactionType: string;
    primaryDescription: string;
    documentId?: string;
    documentType?: string;
    documentNumber?: string;
    secondaryDescription?: string;
    referenceDescription?: string;
    ledgerReference?: string;
    isOpeningBalance?: boolean;
    createdAt: string;
    updatedAt: string;
  };
  runningBalance: number;
  isNegativeBalance: boolean;
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
  openingBalance: number;
  currentBalance: number;
  isNegativeBalance: boolean;
  totalCashIn: number;
  totalCashOut: number;
  netCashFlow: number;
  entryCount: number;
  statement: CashbookEntry[];
}

export default function CashbookPage() {
  const user = useAppSelector((state) => state.user);
  const fpoIdOfUser = user.fpoId;

  // State management - all hooks must be declared before any early returns
  const [loading, setLoading] = useState(true);
  const [cashbook, setCashbook] = useState<Cashbook | null>(null);
  const [statement, setStatement] = useState<CashbookStatement | null>(null);
  const [showInitDialog, setShowInitDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Dr' | 'Cr'>('all');
  const [dateRange, setDateRange] = useState<{
    startDate: string;
    endDate: string;
  }>({
    startDate: '',
    endDate: ''
  });

  // Initialization form state
  const [initForm, setInitForm] = useState({
    openingBalance: '',
    openingDate: format(new Date(), 'yyyy-MM-dd')
  });

  // Export form state
  const [exportForm, setExportForm] = useState({
    startDate: '',
    endDate: ''
  });

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
        dateRange.startDate || undefined,
        dateRange.endDate || undefined
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
      if (!initForm.openingBalance || !initForm.openingDate) {
        toast.error('Please fill all required fields');
        return;
      }

      const openingBalance = parseFloat(initForm.openingBalance);
      if (isNaN(openingBalance)) {
        toast.error('Please enter a valid opening balance');
        return;
      }

      const newCashbook = await CashbookAPI.createCashbook({
        fpoId: fpoIdOfUser,
        openingBalance,
        openingDate: initForm.openingDate
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
      if (!exportForm.startDate || !exportForm.endDate) {
        toast.error('Please select both start and end dates for export');
        return;
      }

      if (new Date(exportForm.startDate) > new Date(exportForm.endDate)) {
        toast.error('Start date cannot be after end date');
        return;
      }

      // Create and download JSON file
      const exportData = await CashbookAPI.getStatement(
        fpoIdOfUser,
        exportForm.startDate,
        exportForm.endDate
      );
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `cashbook_${exportForm.startDate}_${exportForm.endDate}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      setShowExportDialog(false);
      setExportForm({ startDate: '', endDate: '' });
      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  // Apply date filter
  const handleDateFilter = async () => {
    if (dateRange.startDate && dateRange.endDate) {
      if (new Date(dateRange.startDate) > new Date(dateRange.endDate)) {
        toast.error('Start date cannot be after end date');
        return;
      }
    }
    await loadStatement();
    toast.success('Filter applied successfully');
  };

  // Filter entries
  const filteredEntries = statement?.statement?.filter(entryWrapper => {
    const entry = entryWrapper.entry;
    const matchesSearch = !searchTerm || 
      entry.primaryDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.secondaryDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.transactionType?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || entry.type === filterType;

    return matchesSearch && matchesType;
  }) || [];

  // Clear date filter
  const clearDateFilter = () => {
    setDateRange({ startDate: '', endDate: '' });
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
    }).format(amount);
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
                  {formatCurrency(statement.currentBalance)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {statement.isNegativeBalance ? 
                    <span className="text-red-600">Negative Balance</span> : 
                    <span className="text-green-600">Positive Balance</span>
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

          {/* Filters */}
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

                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Filter Actions</Label>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleDateFilter} 
                      variant="default" 
                      size="sm"
                      className="gap-1"
                    >
                      <Filter className="h-4 w-4" />
                      Apply
                    </Button>
                    <Button 
                      onClick={clearDateFilter} 
                      variant="outline" 
                      size="sm"
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Current Period</Label>
                  <div className="text-sm text-muted-foreground">
                    {dateRange.startDate && dateRange.endDate ? (
                      <div>
                        {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
                      </div>
                    ) : (
                      <div>All entries</div>
                    )}
                  </div>
                </div>
              </div>
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
                {filteredEntries.length} of {statement.statement.length} entries
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
                              entryWrapper.isNegativeBalance ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {formatCurrency(Math.abs(entryWrapper.runningBalance))}
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
                value={initForm.openingBalance}
                onChange={(e) => setInitForm(prev => ({ ...prev, openingBalance: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="openingDate">Opening Date</Label>
              <Input
                id="openingDate"
                type="date"
                value={initForm.openingDate}
                onChange={(e) => setInitForm(prev => ({ ...prev, openingDate: e.target.value }))}
              />
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="exportStartDate">Start Date</Label>
              <Input
                id="exportStartDate"
                type="date"
                value={exportForm.startDate}
                onChange={(e) => setExportForm(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="exportEndDate">End Date</Label>
              <Input
                id="exportEndDate"
                type="date"
                value={exportForm.endDate}
                onChange={(e) => setExportForm(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>

            {exportForm.startDate && exportForm.endDate && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Export Period:</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(exportForm.startDate)} - {formatDate(exportForm.endDate)}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowExportDialog(false);
              setExportForm({ startDate: '', endDate: '' });
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