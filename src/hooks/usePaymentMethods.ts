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

// Payment method option interface
export interface PaymentMethodOption {
  type: 'cash' | 'bank_transfer';
  id: string;
  name: string;
  displayName: string;
  bankName?: string;
}

// Hook state interface
interface UsePaymentMethodsState {
  cashbookId: string | null;
  bankAccounts: BankAccount[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Hook options interface
interface UsePaymentMethodsOptions {
  fpoId?: string;
  autoFetch?: boolean;
  enabled?: boolean;
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

// Custom hook for payment methods
export const usePaymentMethods = ({
  fpoId,
  autoFetch = true,
  enabled = true,
}: UsePaymentMethodsOptions): UsePaymentMethodsState => {
  const [cashbookId, setCashbookId] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch function
  const fetchData = useCallback(async () => {
    if (!fpoId || !enabled) {
      setCashbookId(null);
      setBankAccounts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch both cashbook and bank accounts in parallel
      const [cashbookResult, bankAccountsResult] = await Promise.allSettled([
        fetchCashbook(fpoId),
        fetchBankAccounts(),
      ]);

      // Handle cashbook result
      if (cashbookResult.status === 'fulfilled') {
        setCashbookId(cashbookResult.value);
      } else {
        console.warn('Failed to fetch cashbook:', cashbookResult.reason);
        setCashbookId(null);
      }

      // Handle bank accounts result
      if (bankAccountsResult.status === 'fulfilled') {
        setBankAccounts(bankAccountsResult.value);
      } else {
        console.warn('Failed to fetch bank accounts:', bankAccountsResult.reason);
        setBankAccounts([]);
        
        // Only set error if both requests failed
        if (cashbookResult.status === 'rejected') {
          throw bankAccountsResult.reason;
        }
      }

      // If cashbook failed but bank accounts succeeded, only warn
      if (cashbookResult.status === 'rejected' && bankAccountsResult.status === 'fulfilled') {
        console.warn('Cashbook not available, only bank transfer options will be shown');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setCashbookId(null);
      setBankAccounts([]);
      
      // Only show toast for critical/unexpected errors
      if (err instanceof Error && !err.message.includes('404') && !err.message.includes('Not Found')) {
        toast.error(`Failed to load payment methods: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  }, [fpoId, enabled]);

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

  return {
    cashbookId,
    bankAccounts,
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

// Additional hook for adding bank accounts
interface UseAddBankAccountState {
  addBankAccount: (bankAccount: Omit<BankAccount, 'id' | 'isPrimary'>) => Promise<BankAccount | null>;
  loading: boolean;
  error: string | null;
}

export const useAddBankAccount = (): UseAddBankAccountState => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addBankAccount = useCallback(async (
    bankAccountData: Omit<BankAccount, 'id' | 'isPrimary'>
  ): Promise<BankAccount | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/bank-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bankAccountData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to add bank account: ${response.statusText}`);
      }

      const data = await response.json();
      const addedAccount = data.data;
      
      if (addedAccount) {
        toast.success('Bank account added successfully');
      }
      
      return addedAccount || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error(`Failed to add bank account: ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    addBankAccount,
    loading,
    error,
  };
};

export default usePaymentMethods;