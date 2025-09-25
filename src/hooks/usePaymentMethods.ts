import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';

// Bank account interface
export interface BankAccount {
  id: string;
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  upiId?: string;
  isPrimary: boolean;
}

// Bank book interface
export interface BankBook {
  id: string;
  bankAccountId: string;
  fpoId: string;
  openingBalance: number;
  openingDate: string;
  currentBalance: number;
  createdAt: string;
  updatedAt: string;
}

// Payment method option interface
export interface PaymentMethodOption {
  type: 'cash' | 'bank_transfer';
  id: string;
  name: string;
  displayName: string;
  bankName?: string;
  bankAccountId?: string; // Bank account ID for reference
  bookId?: string | null; // Cashbook ID for cash, Bankbook ID for bank_transfer
}

// Hook state interface
interface UsePaymentMethodsState {
  cashbookId: string | null;
  bankAccounts: BankAccount[];
  bankBooks: BankBook[];
  paymentOptions: PaymentMethodOption[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Hook options interface
interface UsePaymentMethodsOptions {
  fpoId?: string;
  autoFetch?: boolean;
  enabled?: boolean;
  includeBooks?: boolean; // Whether to fetch and include book information
  includeCash?: boolean;
  includeBankTransfer?: boolean;
}

// API function to fetch cashbook
const fetchCashbook = async (fpoId: string): Promise<string | null> => {
  const response = await fetch(`/api/cashbook?fpoId=${encodeURIComponent(fpoId)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      // Cashbook doesn't exist yet
      return null;
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch cashbook: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data?.id || null;
};

// API function to fetch bank accounts
const fetchBankAccounts = async (): Promise<BankAccount[]> => {
  const response = await fetch('/api/bank-accounts', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch bank accounts: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
};

// API function to fetch bank books
const fetchBankBooks = async (fpoId?: string): Promise<BankBook[]> => {
  const params = new URLSearchParams();
  if (fpoId) {
    params.append('fpoId', fpoId);
  }
  
  const response = await fetch(`/api/bank-books?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch bank books: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
};

// Custom hook for payment methods
export const usePaymentMethods = ({
  fpoId,
  autoFetch = true,
  enabled = true,
  includeBooks = false,
  includeCash = true,
  includeBankTransfer = true,
}: UsePaymentMethodsOptions): UsePaymentMethodsState => {
  const [cashbookId, setCashbookId] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankBooks, setBankBooks] = useState<BankBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build payment options based on fetched data
  const buildPaymentOptions = useCallback((): PaymentMethodOption[] => {
    const options: PaymentMethodOption[] = [];

    // Add cash option if cashbook is available and cash is enabled
    if (includeCash && cashbookId) {
      options.push({
        type: 'cash',
        id: cashbookId,
        name: 'Cash',
        displayName: 'Cash',
        bankAccountId: cashbookId,
        bookId: cashbookId, // For cash, cashbook ID is the book ID
      });
    }

    // Add bank account options if bank transfer is enabled
    if (includeBankTransfer && bankAccounts.length > 0) {
      bankAccounts.forEach(account => {
        // Find corresponding bankbook if books are included
        const correspondingBankBook = includeBooks 
          ? bankBooks.find(book => book.bankAccountId === account.id)
          : undefined;

        options.push({
          type: 'bank_transfer',
          id: includeBooks ? (correspondingBankBook?.id || account.id) : account.id,
          name: account.accountHolderName,
          displayName: `${account.accountHolderName} (${account.accountNumber.slice(-4)})`,
          bankName: account.bankName,
          bankAccountId: account.id,
          bookId: correspondingBankBook?.id || null,
        });
      });
    }

    return options;
  }, [cashbookId, bankAccounts, bankBooks, includeCash, includeBankTransfer, includeBooks]);

  // Fetch function
  const fetchData = useCallback(async () => {
    if (!fpoId || !enabled) {
      setCashbookId(null);
      setBankAccounts([]);
      setBankBooks([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare fetch promises
      const promises: Promise<any>[] = [];
      
      // Always fetch cashbook and bank accounts
      promises.push(fetchCashbook(fpoId));
      promises.push(fetchBankAccounts());
      
      // Fetch bank books only if includeBooks is true
      if (includeBooks) {
        promises.push(fetchBankBooks(fpoId));
      }

      const results = await Promise.allSettled(promises);

      // Handle cashbook result
      if (results[0].status === 'fulfilled') {
        setCashbookId(results[0].value);
      } else {
        console.warn('Failed to fetch cashbook:', results[0].reason);
        setCashbookId(null);
      }

      // Handle bank accounts result
      if (results[1].status === 'fulfilled') {
        setBankAccounts(results[1].value);
      } else {
        console.warn('Failed to fetch bank accounts:', results[1].reason);
        setBankAccounts([]);
      }

      // Handle bank books result (if requested)
      if (includeBooks && results[2]) {
        if (results[2].status === 'fulfilled') {
          setBankBooks(results[2].value);
        } else {
          console.warn('Failed to fetch bank books:', results[2].reason);
          setBankBooks([]);
        }
      }

      // Set error only if all critical requests failed
      const criticalFailures = results.slice(0, 2).filter(result => result.status === 'rejected');
      if (criticalFailures.length === 2) {
        throw new Error('Failed to fetch payment method data');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setCashbookId(null);
      setBankAccounts([]);
      setBankBooks([]);
      
      // Only show toast for critical/unexpected errors
      if (err instanceof Error && !err.message.includes('404') && !err.message.includes('Not Found')) {
        toast.error(`Failed to load payment methods: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  }, [fpoId, enabled, includeBooks]);

  // Auto-fetch effect
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [fetchData, autoFetch]);

  // Refetch function
  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Build payment options
  const paymentOptions = buildPaymentOptions();

  return {
    cashbookId,
    bankAccounts,
    bankBooks,
    paymentOptions,
    loading,
    error,
    refetch,
  };
};

// Additional hook for creating cashbook if it doesn't exist
interface UseCreateCashbookState {
  createCashbook: (fpoId: string, openingBalance: number, openingDate: Date) => Promise<string | null>;
  loading: boolean;
  error: string | null;
}

export const useCreateCashbook = (): UseCreateCashbookState => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCashbook = useCallback(async (
    fpoId: string, 
    openingBalance: number, 
    openingDate: Date
  ): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/cashbook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fpoId,
          openingBalance,
          openingDate: openingDate.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create cashbook: ${response.statusText}`);
      }

      const data = await response.json();
      const cashbookId = data.data?.id;
      
      if (cashbookId) {
        toast.success('Cashbook created successfully');
      }
      
      return cashbookId || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error(`Failed to create cashbook: ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createCashbook,
    loading,
    error,
  };
};

// Additional hook for creating bank book
interface UseCreateBankBookState {
  createBankBook: (bankAccountId: string, fpoId: string, openingBalance: number, openingDate: Date) => Promise<BankBook | null>;
  loading: boolean;
  error: string | null;
}

export const useCreateBankBook = (): UseCreateBankBookState => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBankBook = useCallback(async (
    bankAccountId: string,
    fpoId: string,
    openingBalance: number,
    openingDate: Date
  ): Promise<BankBook | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/bank-books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bankAccountId,
          fpoId,
          openingBalance,
          openingDate: openingDate.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create bank book: ${response.statusText}`);
      }

      const data = await response.json();
      const bankBook = data.data;
      
      if (bankBook) {
        toast.success('Bank book created successfully');
      }
      
      return bankBook || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error(`Failed to create bank book: ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createBankBook,
    loading,
    error,
  };
};

export default usePaymentMethods;