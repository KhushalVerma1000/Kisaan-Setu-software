// services/BankAccountsService.ts
import { BankDetail } from '@/server/features/fpo/core/entities/BankDetail';

export interface BankAccountData {
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  upiId?: string;
  printBankDetails?: boolean;
  printUpiQr?: boolean;
}

export interface BankAccountValidation {
  isDuplicate: boolean;
  isValidIfsc: boolean;
  isValidAccount: boolean;
  isValid: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class BankAccountsService {
  private static baseUrl = '/api/bank-accounts';

  /**
   * Get all bank accounts (primary + secondary)
   */
  static async getAllBankAccounts(): Promise<BankDetail[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<BankDetail[]> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch bank accounts');
      }

      return result.data || [];
    } catch (error) {
      console.error('Error fetching all bank accounts:', error);
      throw error;
    }
  }

  /**
   * Get only secondary bank accounts
   */
  static async getSecondaryBankAccounts(): Promise<BankDetail[]> {
    try {
      const response = await fetch(`${this.baseUrl}/secondary`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<BankDetail[]> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch secondary bank accounts');
      }

      return result.data || [];
    } catch (error) {
      console.error('Error fetching secondary bank accounts:', error);
      throw error;
    }
  }

  /**
   * Get a specific bank account by ID
   */
  static async getBankAccount(id: string): Promise<BankDetail | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<BankDetail> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch bank account');
      }

      return result.data || null;
    } catch (error) {
      console.error('Error fetching bank account:', error);
      throw error;
    }
  }

  /**
   * Add a new secondary bank account
   */
  static async addSecondaryBankAccount(bankData: BankAccountData): Promise<BankDetail> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bankData),
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<BankDetail> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to add bank account');
      }

      return result.data;
    } catch (error) {
      console.error('Error adding secondary bank account:', error);
      throw error;
    }
  }

  /**
   * Update a secondary bank account
   */
  static async updateSecondaryBankAccount(id: string, bankData: BankAccountData): Promise<BankDetail> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bankData),
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<BankDetail> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to update bank account');
      }

      return result.data;
    } catch (error) {
      console.error('Error updating secondary bank account:', error);
      throw error;
    }
  }

  /**
   * Delete a secondary bank account
   */
  static async deleteSecondaryBankAccount(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<null> = await response.json();
      
      return result.success;
    } catch (error) {
      console.error('Error deleting secondary bank account:', error);
      throw error;
    }
  }

  /**
   * Validate bank account details
   */
  static async validateBankAccount(
    accountNumber: string,
    ifscCode: string
  ): Promise<BankAccountValidation> {
    try {
      const response = await fetch(`${this.baseUrl}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountNumber, ifscCode }),
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<BankAccountValidation> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to validate bank account');
      }

      return result.data;
    } catch (error) {
      console.error('Error validating bank account:', error);
      throw error;
    }
  }

  /**
   * Utility method to format account number (mask middle digits)
   */
  static formatAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 4) return accountNumber;
    
    const start = accountNumber.substring(0, 2);
    const end = accountNumber.substring(accountNumber.length - 2);
    const middle = '*'.repeat(accountNumber.length - 4);
    
    return `${start}${middle}${end}`;
  }

  /**
   * Utility method to validate IFSC code format
   */
  static isValidIfscFormat(ifsc: string): boolean {
    const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscPattern.test(ifsc.toUpperCase());
  }

  /**
   * Utility method to validate account number format
   */
  static isValidAccountNumberFormat(accountNumber: string): boolean {
    const accountPattern = /^[0-9]{5,18}$/;
    return accountPattern.test(accountNumber);
  }
}

// React Hook for managing bank accounts
import { useState, useEffect } from 'react';

export function useBankAccounts() {
  const [bankAccounts, setBankAccounts] = useState<BankDetail[]>([]);
  const [secondaryAccounts, setSecondaryAccounts] = useState<BankDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const accounts = await BankAccountsService.getAllBankAccounts();
      setBankAccounts(accounts);
      setSecondaryAccounts(accounts.filter(account => !account.isPrimary));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bank accounts');
    } finally {
      setLoading(false);
    }
  };

  const addSecondaryAccount = async (bankData: BankAccountData) => {
    try {
      setError(null);
      const newAccount = await BankAccountsService.addSecondaryBankAccount(bankData);
      setBankAccounts(prev => [...prev, newAccount]);
      setSecondaryAccounts(prev => [...prev, newAccount]);
      return newAccount;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add bank account';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateSecondaryAccount = async (id: string, bankData: BankAccountData) => {
    try {
      setError(null);
      const updatedAccount = await BankAccountsService.updateSecondaryBankAccount(id, bankData);
      
      setBankAccounts(prev => 
        prev.map(account => account.id === id ? updatedAccount : account)
      );
      setSecondaryAccounts(prev => 
        prev.map(account => account.id === id ? updatedAccount : account)
      );
      
      return updatedAccount;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update bank account';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteSecondaryAccount = async (id: string) => {
    try {
      setError(null);
      await BankAccountsService.deleteSecondaryBankAccount(id);
      
      setBankAccounts(prev => prev.filter(account => account.id !== id));
      setSecondaryAccounts(prev => prev.filter(account => account.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete bank account';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  useEffect(() => {
    fetchAllAccounts();
  }, []);

  return {
    bankAccounts,
    secondaryAccounts,
    loading,
    error,
    refetch: fetchAllAccounts,
    addSecondaryAccount,
    updateSecondaryAccount,
    deleteSecondaryAccount,
  };
}