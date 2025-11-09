'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  IndianRupee,
  ArrowUpCircle,
  ArrowDownCircle,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  Info
} from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { DatePicker } from '@/components/ui/datepicker';

interface BankDetails {
  accountNumber: string;
  accountHolderName?: string;
  ifscCode: string;
  BankName?: string;
  accountType: 'Regular' | 'OD' | 'CC';
  upiId?: string;
}

interface LedgerAccount {
  id: string;
  name: string;
  groupName: string;
  openingBalance: number;
  balanceType: 'Dr' | 'Cr';
  openingDate: string;
  fpoId: string;
  phoneNumber?: string | null;
  address?: string | null;
  state?: string | null;
  gstNumber?: string | null;
  bankDetails?: BankDetails;
}

interface LedgerEntry {
  id: string;
  ledgerAccountId: string;
  date: string;
  amount: number;
  type: 'Dr' | 'Cr';
  primaryDescription: string;
  secondaryDescription?: string | null;
  referenceDescription?: string | null;
  documentId?: string | null;
  documentType: string;
  documentNumber?: string | null;
  ledgerReference?: string | null;
  isOpeningBalance: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StatementEntry {
  entry: LedgerEntry;
  runningBalance: number;
  runningBalanceType: 'Dr' | 'Cr';
}

interface LedgerStatement {
  ledgerAccount: LedgerAccount;
  statement: StatementEntry[];
  currentBalance: {
    balance: number;
    balanceType: 'Dr' | 'Cr';
  };
}

interface APIError {
  error: string;
  details?: string;
}

const BankBookPage: React.FC = () => {
  // Get current user and FPO ID
  const user = useAppSelector((state) => state.user);
  const fpoId = user.fpoId || '';

  // State Management
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStatement, setIsLoadingStatement] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<LedgerAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<LedgerAccount | null>(null);
  const [ledgerStatement, setLedgerStatement] = useState<LedgerStatement | null>(null);
  const [filteredEntries, setFilteredEntries] = useState<StatementEntry[]>([]);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [documentTypeFilter, setDocumentTypeFilter] = useState('all');
  const [entryTypeFilter, setEntryTypeFilter] = useState('all');

  // Fetch bank accounts (ledgers with group name "Bank Accounts")
  const fetchBankAccounts = useCallback(async () => {
    if (!fpoId) {
      toast.error('FPO ID not found. Please log in again.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/ledger/ledgerAccount?fpo_id=${fpoId}&group_name=Bank Accounts`);
      
      if (!response.ok) {
        const errorData: APIError = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to fetch bank accounts');
      }
      
      const data: LedgerAccount[] = await response.json();
      setBankAccounts(data);
      
      // Auto-select first account if only one exists
      if (data.length === 1) {
        setSelectedAccount(data[0]);
        await loadLedgerStatement(data[0].id);
      } else if (data.length === 0) {
        toast.info('No bank accounts found. Please add a bank account first.');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('Error fetching bank accounts:', err);
      toast.error(`Failed to fetch bank accounts: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [fpoId]);

  // Load ledger statement for selected account
  const loadLedgerStatement = async (ledgerId: string, start?: Date, end?: Date) => {
    setIsLoadingStatement(true);
    try {
      const params = new URLSearchParams({
        ledgerAccountId: ledgerId
      });
      
      if (start) {
        params.append('startDate', start.toISOString().split('T')[0]);
      }
      if (end) {
        params.append('endDate', end.toISOString().split('T')[0]);
      }

      console.log('Fetching statement with params:', params.toString());

      const response = await fetch(`/api/ledger/ledger-entries/statement?${params.toString()}`);
      
      if (!response.ok) {
        const errorData: APIError = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to fetch statement');
      }
      
      const data: LedgerStatement = await response.json();
      console.log('Statement data received:', data);
      
      setLedgerStatement(data);
      setFilteredEntries(data.statement);
    } catch (error) {
      console.error('Error loading statement:', error);
      toast.error('Failed to load bank account statement');
      setLedgerStatement(null);
      setFilteredEntries([]);
    } finally {
      setIsLoadingStatement(false);
    }
  };

  // Initialize page
  useEffect(() => {
    if (fpoId) {
      fetchBankAccounts();
    }
  }, [fpoId, fetchBankAccounts]);

  // Apply filters
  useEffect(() => {
    if (!ledgerStatement) {
      setFilteredEntries([]);
      return;
    }

    let filtered = [...ledgerStatement.statement];

    // Search filter
    if (searchTerm) {
      const lowercaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.entry.primaryDescription?.toLowerCase().includes(lowercaseSearch) ||
        item.entry.secondaryDescription?.toLowerCase().includes(lowercaseSearch) ||
        item.entry.referenceDescription?.toLowerCase().includes(lowercaseSearch) ||
        item.entry.documentNumber?.toLowerCase().includes(lowercaseSearch) ||
        item.entry.documentType?.toLowerCase().includes(lowercaseSearch)
      );
    }

    // Document type filter
    if (documentTypeFilter && documentTypeFilter !== 'all') {
      filtered = filtered.filter(item => item.entry.documentType === documentTypeFilter);
    }

    // Entry type filter (Dr/Cr)
    if (entryTypeFilter && entryTypeFilter !== 'all') {
      filtered = filtered.filter(item => item.entry.type === entryTypeFilter);
    }

    setFilteredEntries(filtered);
  }, [ledgerStatement, searchTerm, documentTypeFilter, entryTypeFilter]);

  // Handle account selection
  const handleAccountSelect = async (accountId: string) => {
    const account = bankAccounts.find(acc => acc.id === accountId);
    if (account) {
      setSelectedAccount(account);
      await loadLedgerStatement(account.id, startDate, endDate);
      toast.success(`Selected ${account.name}`);
    }
  };

  // Calculate totals from filtered entries
  const calculateTotals = () => {
    const totalDebit = filteredEntries.reduce((sum, item) => 
      item.entry.type === 'Dr' ? sum + item.entry.amount : sum, 0
    );
    const totalCredit = filteredEntries.reduce((sum, item) => 
      item.entry.type === 'Cr' ? sum + item.entry.amount : sum, 0
    );
    return { totalDebit, totalCredit };
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatAccountNumber = (accountNumber: string) => {
    if (!accountNumber) return '';
    if (accountNumber.length <= 4) return accountNumber;
    return `****${accountNumber.slice(-4)}`;
  };

  const handleRefresh = async () => {
    await fetchBankAccounts();
    if (selectedAccount) {
      await loadLedgerStatement(selectedAccount.id, startDate, endDate);
    }
    toast.success('Bank book refreshed');
  };

  const handleExport = async () => {
    if (!selectedAccount || !ledgerStatement) return;
    
    try {
      // TODO: Implement PDF export functionality
      toast.info('Export functionality coming soon');
    } catch (error) {
      toast.error('Failed to export bank statement');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate(undefined);
    setEndDate(undefined);
    setDocumentTypeFilter('all');
    setEntryTypeFilter('all');
    if (selectedAccount) {
      loadLedgerStatement(selectedAccount.id);
    }
  };

  // Get unique document types from statement
  const getDocumentTypes = () => {
    if (!ledgerStatement) return [];
    const types = new Set(ledgerStatement.statement.map(item => item.entry.documentType));
    return Array.from(types).filter(Boolean);
  };

  // Format document type for display
  const formatDocumentType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Early return for missing FPO ID
  if (!fpoId) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            FPO ID not found. Please log in again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading bank accounts...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading bank accounts: {error}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={fetchBankAccounts}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // No bank accounts state
  if (bankAccounts.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Bank Accounts Found</h2>
          <p className="text-muted-foreground mb-6">
            You need to add at least one bank account before viewing the bank book.
          </p>
          <Button onClick={() => window.location.href = '/add-bank-account'}>
            <Plus className="w-4 h-4 mr-2" />
            Add Bank Account
          </Button>
        </div>
      </div>
    );
  }

  const { totalDebit, totalCredit } = calculateTotals();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="w-8 h-8" />
            Bank Book
          </h1>
          {selectedAccount && (
            <div className="mt-1 space-y-1">
              <p className="text-muted-foreground">
                {selectedAccount.bankDetails?.BankName} - {formatAccountNumber(selectedAccount.bankDetails?.accountNumber || '')}
              </p>
              <p className="text-sm text-muted-foreground">
                Account Holder: {selectedAccount.bankDetails?.accountHolderName}
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoadingStatement}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingStatement ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={!selectedAccount || !ledgerStatement}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => window.location.href = '/add-bank-account'}>
            <Plus className="w-4 h-4 mr-2" />
            Add Account
          </Button>
        </div>
      </div>

      {/* Account Selection */}
      {bankAccounts.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Bank Account</CardTitle>
            <CardDescription>Choose a bank account to view transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedAccount?.id || ''} 
              onValueChange={handleAccountSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a bank account" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} - {account.bankDetails?.BankName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {selectedAccount && (
        <>
          {/* Balance Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IndianRupee className="w-5 h-5" />
                Account Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Opening Balance</p>
                  <p className="text-2xl font-bold">
                    {formatAmount(selectedAccount.openingBalance)}
                  </p>
                  <Badge variant="outline" className="mt-1">
                    {selectedAccount.balanceType}
                  </Badge>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className={`text-2xl font-bold ${ledgerStatement?.currentBalance.balanceType === 'Dr' ? 'text-green-600' : 'text-red-600'}`}>
                    {ledgerStatement ? formatAmount(ledgerStatement.currentBalance.balance) : formatAmount(selectedAccount.openingBalance)}
                  </p>
                  <Badge variant="outline" className="mt-1">
                    {ledgerStatement ? ledgerStatement.currentBalance.balanceType : selectedAccount.balanceType}
                  </Badge>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Opening Date</p>
                  <p className="text-lg font-semibold">
                    {formatDate(selectedAccount.openingDate)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Account Type</p>
                  <Badge variant="secondary">
                    {selectedAccount.bankDetails?.accountType || 'Regular'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search entries..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <DatePicker
                    date={startDate}
                    onDateChange={(date) => {
                      setStartDate(date);
                      if (selectedAccount && date) {
                        loadLedgerStatement(selectedAccount.id, date, endDate);
                      }
                    }}
                    label="Start Date"
                    placeholder="Select start date"
                  />
                </div>
                
                <div>
                  <DatePicker
                    date={endDate}
                    onDateChange={(date) => {
                      setEndDate(date);
                      if (selectedAccount && date) {
                        loadLedgerStatement(selectedAccount.id, startDate, date);
                      }
                    }}
                    label="End Date"
                    placeholder="Select end date"
                  />
                </div>

                <div>
                  <Label htmlFor="document-type">Document Type</Label>
                  <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {getDocumentTypes().map((type) => (
                        <SelectItem key={type} value={type}>
                          {formatDocumentType(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="entry-type">Entry Type</Label>
                  <Select value={entryTypeFilter} onValueChange={setEntryTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Dr">Debit (Dr)</SelectItem>
                      <SelectItem value="Cr">Credit (Cr)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          {ledgerStatement && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <ArrowUpCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Debits</p>
                      <p className="text-lg font-semibold text-green-600">
                        {formatAmount(totalDebit)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <ArrowDownCircle className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Credits</p>
                      <p className="text-lg font-semibold text-red-600">
                        {formatAmount(totalCredit)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Entries</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {filteredEntries.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Entries Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Bank Book Entries</CardTitle>
                <Badge variant="secondary">
                  {filteredEntries.length} {ledgerStatement && `of ${ledgerStatement.statement.length}`} entries
                </Badge>
              </div>
              <CardDescription>
                View and manage your bank transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStatement ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Loading statement...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Document Type</TableHead>
                        <TableHead>Doc No.</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <div className="text-muted-foreground">
                              {ledgerStatement?.statement.length === 0 ? 'No entries found' : 'No entries match the current filters'}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEntries.map((item) => (
                          <TableRow key={item.entry.id}>
                            <TableCell className="whitespace-nowrap">{formatDate(item.entry.date)}</TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                <p className="font-medium">{item.entry.primaryDescription}</p>
                                {item.entry.secondaryDescription && (
                                  <p className="text-sm text-muted-foreground truncate">
                                    {item.entry.secondaryDescription}
                                  </p>
                                )}
                                {item.entry.referenceDescription && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    Ref: {item.entry.referenceDescription}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={item.entry.isOpeningBalance ? 'bg-blue-50' : ''}>
                                {formatDocumentType(item.entry.documentType)}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {item.entry.documentNumber || '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              {item.entry.type === 'Dr' ? formatAmount(item.entry.amount) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium text-red-600">
                              {item.entry.type === 'Cr' ? formatAmount(item.entry.amount) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              <div className="flex flex-col items-end">
                                <span className={item.runningBalanceType === 'Dr' ? 'text-green-600' : 'text-red-600'}>
                                  {formatAmount(item.runningBalance)}
                                </span>
                                <Badge variant="outline" className="text-xs mt-1">
                                  {item.runningBalanceType}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  title="View Details"
                                  disabled={item.entry.isOpeningBalance}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  title="Edit Entry"
                                  disabled={item.entry.isOpeningBalance}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  title="Delete Entry"
                                  disabled={item.entry.isOpeningBalance}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default BankBookPage;