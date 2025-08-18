// pages/bank-book/index.tsx or app/bank-book/page.tsx (depending on your Next.js version)
'use client'; // Add this if using App Router

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
  Calendar,
  IndianRupee,
  ArrowUpCircle,
  ArrowDownCircle,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  Info
} from 'lucide-react';

import { BankBookAPI } from '@/server/features/bankbookSystm/infrastructure/apiHelper/bankbookApi';
import { BankAccountsService, useBankAccounts } from '@/server/features/fpo/infrastructure/apiHelper/BankAccountsService';
import { BankDetail } from '@/server/features/fpo/core/entities/BankDetail';
import BankSelectionModal from '@/components/bankbook/BankSelectionModal';
import { useAppSelector } from '@/store/hooks';

interface BankAccount extends BankDetail {
  currentBalance?: number;
  lastUpdated?: string;
}

interface BankBook {
  id: string;
  bankAccountId: string;
  fpoId: string;
  openingBalance: number;
  openingDate: string;
  currentBalance: number;
  bankAccount?: BankAccount;
}

interface BankBookEntry {
  id: string;
  amount: number;
  type: 'Dr' | 'Cr';
  date: string;
  transactionType: string;
  paymentMethod?: string;
  partyName?: string;
  documentNumber?: string;
  additionalInfo?: string;
  primaryDescription?: string;
  secondaryDescription?: string;
  chequeNumber?: string;
  referenceNumber?: string;
  runningBalance?: number;
  balanceType?: string;
}

const BankBookPage: React.FC = () => {
  // Get current user and FPO ID
  const user = useAppSelector((state) => state.user);
  const fpoIdOfUser = user.fpoId;

  // Use the custom hook for bank accounts
  const {
    bankAccounts,
    loading: bankAccountsLoading,
    error: bankAccountsError,
    refetch: refetchBankAccounts
  } = useBankAccounts();

  // State Management
  const [isLoading, setIsLoading] = useState(true);
  const [showBankSelection, setShowBankSelection] = useState(false);
  const [selectedBankBook, setSelectedBankBook] = useState<BankBook | null>(null);
  const [entries, setEntries] = useState<BankBookEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<BankBookEntry[]>([]);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('all');
  const [entryTypeFilter, setEntryTypeFilter] = useState('all');

  // Move initializeBankBook to useCallback to fix dependency warning
  const initializeBankBook = useCallback(async () => {
    if (!fpoIdOfUser) {
      toast.error('FPO ID not found. Please log in again.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      if (bankAccounts.length === 0) {
        toast.error('No bank accounts found. Please add a bank account first.');
        setIsLoading(false);
        return;
      }

      // Fetch bank books for FPO
      const bankBooks = await BankBookAPI.getBankBooks(fpoIdOfUser);
      
      if (bankBooks.length === 0) {
        // No bank books exist, show bank selection to create one
        setShowBankSelection(true);
        toast.info('No bank books found. Please select a bank account to create a bank book.');
      } else if (bankBooks.length === 1) {
        // Only one bank book, select it automatically
        const bankBookWithAccount = {
          ...bankBooks[0],
          bankAccount: bankAccounts.find(acc => acc.id === bankBooks[0].bankAccountId)
        };
        await selectBankBook(bankBookWithAccount);
      } else {
        // Multiple bank books, show selection modal
        setShowBankSelection(true);
      }
    } catch (error) {
      console.error('Error initializing page:', error);
      toast.error('Failed to load bank book data');
    } finally {
      setIsLoading(false);
    }
  }, [bankAccounts, fpoIdOfUser]);

  const selectBankBook = async (bankBook: BankBook) => {
    try {
      setSelectedBankBook(bankBook);
      await loadBankBookEntries(bankBook.id);
      setShowBankSelection(false);
      toast.success(`Bank book loaded for ${bankBook.bankAccount?.bankName}`);
    } catch (error) {
      console.error('Error selecting bank book:', error);
      toast.error('Failed to load bank book entries');
    }
  };

  const handleBankSelection = async (bankAccount: BankAccount) => {
    if (!fpoIdOfUser) {
      toast.error('FPO ID not found. Please log in again.');
      return;
    }

    try {
      // Check if bank book exists for this account
      const bankBooks = await BankBookAPI.getBankBooks(fpoIdOfUser);
      const existingBankBook = bankBooks.find((bb: BankBook) => bb.bankAccountId === bankAccount.id);

      if (existingBankBook) {
        const bankBookWithAccount = {
          ...existingBankBook,
          bankAccount: bankAccount
        };
        await selectBankBook(bankBookWithAccount);
      } else {
        // Create new bank book
        const newBankBook = await BankBookAPI.createBankBook({
          bankAccountId: bankAccount.id,
          fpoId: fpoIdOfUser,
          openingBalance: bankAccount.currentBalance || 0,
          openingDate: new Date().toISOString().split('T')[0]
        });
        
        const bankBookWithAccount = {
          ...newBankBook,
          bankAccount: bankAccount
        };
        
        await selectBankBook(bankBookWithAccount);
        toast.success('Bank book created successfully');
      }
    } catch (error) {
      console.error('Error handling bank selection:', error);
      toast.error('Failed to create or load bank book');
    }
  };

  const loadBankBookEntries = async (bankBookId: string, start?: string, end?: string) => {
    try {
      const statement = await BankBookAPI.getStatement(bankBookId, start, end);
      setEntries(statement.entries);
      setFilteredEntries(statement.entries);
    } catch (error) {
      console.error('Error loading entries:', error);
      toast.error('Failed to load bank book entries');
    }
  };

  // Initialize page - moved hook to top level
  useEffect(() => {
    if (!bankAccountsLoading && !bankAccountsError && fpoIdOfUser) {
      initializeBankBook();
    }
  }, [bankAccountsLoading, bankAccountsError, bankAccounts, initializeBankBook, fpoIdOfUser]);

  // Apply filters - moved hook to top level
  useEffect(() => {
    let filtered = [...entries];

    // Search filter
    if (searchTerm) {
      const lowercaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.primaryDescription?.toLowerCase().includes(lowercaseSearch) ||
        entry.secondaryDescription?.toLowerCase().includes(lowercaseSearch) ||
        entry.additionalInfo?.toLowerCase().includes(lowercaseSearch) ||
        entry.partyName?.toLowerCase().includes(lowercaseSearch) ||
        entry.documentNumber?.toLowerCase().includes(lowercaseSearch) ||
        entry.chequeNumber?.toLowerCase().includes(lowercaseSearch) ||
        entry.referenceNumber?.toLowerCase().includes(lowercaseSearch)
      );
    }

    // Date filters
    if (startDate) {
      filtered = filtered.filter(entry => new Date(entry.date) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter(entry => new Date(entry.date) <= new Date(endDate));
    }

    // Transaction type filter
    if (transactionTypeFilter && transactionTypeFilter !== 'all') {
      filtered = filtered.filter(entry => entry.transactionType === transactionTypeFilter);
    }

    // Entry type filter (Dr/Cr)
    if (entryTypeFilter && entryTypeFilter !== 'all') {
      filtered = filtered.filter(entry => entry.type === entryTypeFilter);
    }

    setFilteredEntries(filtered);
  }, [entries, searchTerm, startDate, endDate, transactionTypeFilter, entryTypeFilter]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const handleRefresh = async () => {
    if (selectedBankBook) {
      await loadBankBookEntries(selectedBankBook.id, startDate, endDate);
      await refetchBankAccounts(); // Refresh bank accounts as well
      toast.success('Bank book refreshed');
    }
  };

  const handleExport = async () => {
    if (selectedBankBook) {
      try {
        await BankBookAPI.exportStatementAsJSON(selectedBankBook.id, startDate, endDate);
        toast.success('Bank book exported successfully');
      } catch (error) {
        toast.error('Failed to export bank book');
      }
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setTransactionTypeFilter('all');
    setEntryTypeFilter('all');
  };

  // Early return for missing FPO ID
  if (!fpoIdOfUser) {
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
  if (isLoading || bankAccountsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading bank book...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (bankAccountsError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading bank accounts: {bankAccountsError}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={refetchBankAccounts}>
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
            You need to add at least one bank account before creating a bank book.
          </p>
          <Button onClick={() => {/* Navigate to bank accounts page */}}>
            <Plus className="w-4 h-4 mr-2" />
            Add Bank Account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="w-8 h-8" />
            Bank Book
          </h1>
          {selectedBankBook?.bankAccount && (
            <div className="mt-1 space-y-1">
              <p className="text-muted-foreground">
                {selectedBankBook.bankAccount.bankName} - {BankAccountsService.formatAccountNumber(selectedBankBook.bankAccount.accountNumber)}
              </p>
              <p className="text-sm text-muted-foreground">
                Account Holder: {selectedBankBook.bankAccount.accountHolderName}
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBankSelection(true)}>
            <Building2 className="w-4 h-4 mr-2" />
            Change Bank
          </Button>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {selectedBankBook && (
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
                    {formatAmount(selectedBankBook.openingBalance)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className={`text-2xl font-bold ${selectedBankBook.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatAmount(selectedBankBook.currentBalance)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Opening Date</p>
                  <p className="text-lg font-semibold">
                    {formatDate(selectedBankBook.openingDate)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Account Type</p>
                  <Badge variant={selectedBankBook.bankAccount?.isPrimary ? 'default' : 'secondary'}>
                    {selectedBankBook.bankAccount?.isPrimary ? 'Primary' : 'Secondary'}
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
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="transaction-type">Transaction Type</Label>
                  <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {BankBookAPI.getTransactionTypes().map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
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
          {filteredEntries.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <ArrowUpCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Credits</p>
                      <p className="text-lg font-semibold text-green-600">
                        {formatAmount(filteredEntries
                          .filter(e => e.type === 'Cr')
                          .reduce((sum, e) => sum + e.amount, 0)
                        )}
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
                      <p className="text-sm text-muted-foreground">Total Debits</p>
                      <p className="text-lg font-semibold text-red-600">
                        {formatAmount(filteredEntries
                          .filter(e => e.type === 'Dr')
                          .reduce((sum, e) => sum + e.amount, 0)
                        )}
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
                  {filteredEntries.length} of {entries.length} entries
                </Badge>
              </div>
              <CardDescription>
                View and manage your bank transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Party</TableHead>
                      <TableHead>Type</TableHead>
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
                            {entries.length === 0 ? 'No entries found' : 'No entries match the current filters'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{formatDate(entry.date)}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{entry.transactionType}</p>
                              {entry.additionalInfo && (
                                <p className="text-sm text-muted-foreground">
                                  {entry.additionalInfo}
                                </p>
                              )}
                              {entry.documentNumber && (
                                <p className="text-xs text-muted-foreground">
                                  Doc: {entry.documentNumber}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{entry.partyName || '-'}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={entry.type === 'Dr' ? 'default' : 'secondary'}
                              className={entry.type === 'Dr' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}
                            >
                              {entry.type === 'Dr' ? (
                                <ArrowUpCircle className="w-3 h-3 mr-1" />
                              ) : (
                                <ArrowDownCircle className="w-3 h-3 mr-1" />
                              )}
                              {entry.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {entry.type === 'Dr' ? formatAmount(entry.amount) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {entry.type === 'Cr' ? formatAmount(entry.amount) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span className={entry.runningBalance && entry.runningBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {entry.runningBalance ? formatAmount(entry.runningBalance) : '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" title="View Details">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" title="Edit Entry">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" title="Delete Entry">
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
            </CardContent>
          </Card>
        </>
      )}

      {/* Bank Selection Modal */}
      <BankSelectionModal
        isOpen={showBankSelection}
        onClose={() => setShowBankSelection(false)}
        bankAccounts={bankAccounts}
        onSelectBank={handleBankSelection}
        isLoading={isLoading}
      />
    </div>
  );
};

export default BankBookPage;