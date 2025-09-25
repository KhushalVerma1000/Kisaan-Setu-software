// lib/api/PaymentApiHelper.ts
import { PaymentType, PaymentMethod } from '@/server/features/Payment/core/entities/Payment';

// Base API response types
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

// Enhanced Payment input types
export interface PaymentInput {
  amount: number;
  method: PaymentMethod;
  type: PaymentType;
  date: Date;
  partyLedgerAccountId: string;
  notes?: string;
  referenceNumber?: string;
  cashbookId?: string;
  bankbookId?: string;
}

export interface PaymentDocumentInput {
  documentId: string;
  documentNumber: string;
  documentType: string;
  fpoId: string;
  totalDocumentAmount?: number;
}

// Response types (keeping existing interfaces)
export interface PaymentDetails {
  payment: {
    id: string;
    amount: number;
    method: PaymentMethod;
    type: PaymentType;
    date: string;
    paymentStatus: string;
    notes?: string;
    referenceNumber?: string;
    cashbookId?: string;
    bankbookId?: string;
    createdAt: string;
    updatedAt: string;
    isReversalPayment: boolean;
    isReversed: boolean;
    canBeReversed: boolean;
  };
  paymentDocument: {
    id: string;
    documentId: string;
    documentNumber: string;
    documentType: string;
    totalDocumentAmount: number;
    totalPaidAmount: number;
    paymentStatus: string;
    remainingAmount: number;
    isFullyPaid: boolean;
  };
  partyName: string;
}

export interface PaymentValidation {
  isValid: boolean;
  remainingAmount: number;
  errorMessage?: string;
  paymentDocument?: {
    id: string;
    documentNumber: string;
    totalDocumentAmount: number;
    totalPaidAmount: number;
    paymentStatus: string;
    isFullyPaid: boolean;
  };
}

// Enhanced API Helper Class
export class PaymentApiHelper {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/payments') {
    this.baseUrl = baseUrl;
  }

  /**
   * Process a payment - supports document auto-creation
   */
  async processPayment(
    paymentInput: PaymentInput,
    documentInput: PaymentDocumentInput
  ): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'processPayment',
          paymentInput,
          documentInput,
        }),
      });

      const result: ApiResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('Error processing payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Enhanced helper method to create payment document input
   */
  createPaymentDocumentInput(data: {
    documentId: string;
    documentNumber: string;
    documentType: string;
    fpoId: string;
    totalDocumentAmount?: number;
  }): PaymentDocumentInput {
    return {
      documentId: data.documentId,
      documentNumber: data.documentNumber,
      documentType: data.documentType,
      fpoId: data.fpoId,
      totalDocumentAmount: data.totalDocumentAmount,
    };
  }

  // Keep all existing methods...
  async validatePaymentDocument(
    documentId: string,
    documentType: string,
    fpoId: string,
    paymentAmount: number
  ): Promise<ApiResponse<PaymentValidation>> {
    try {
      const response = await fetch(`${this.baseUrl}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          documentType,
          fpoId,
          paymentAmount,
        }),
      });

      const result: ApiResponse<PaymentValidation> = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('Error validating payment document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async getPaymentDetails(paymentId: string): Promise<ApiResponse<PaymentDetails>> {
    try {
      const response = await fetch(`${this.baseUrl}/${paymentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result: ApiResponse<PaymentDetails> = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('Error getting payment details:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Keep existing helper method
  createPaymentInput(data: {
    amount: number;
    method: PaymentMethod;
    type: PaymentType;
    partyLedgerAccountId: string;
    date?: Date;
    notes?: string;
    referenceNumber?: string;
    cashbookId?: string;
    bankbookId?: string;
  }): PaymentInput {
    return {
      amount: data.amount,
      method: data.method,
      type: data.type,
      date: data.date || new Date(),
      partyLedgerAccountId: data.partyLedgerAccountId,
      notes: data.notes,
      referenceNumber: data.referenceNumber,
      cashbookId: data.cashbookId,
      bankbookId: data.bankbookId,
    };
  }
}

// Export enhanced utility functions
export const PaymentUtils = {
  /**
   * Validate payment method and book ID consistency
   */
  validatePaymentMethodConsistency(
    method: PaymentMethod,
    cashbookId?: string,
    bankbookId?: string
  ): { isValid: boolean; message?: string } {
    if (method === 'cash' && !cashbookId) {
      return {
        isValid: false,
        message: 'Cash book ID is required for cash payments',
      };
    }

    if (method === 'bank_transfer' && !bankbookId) {
      return {
        isValid: false,
        message: 'Bank book ID is required for bank transfer payments',
      };
    }

    return { isValid: true };
  },

  /**
   * Generate reference number for payment
   */
  generateReferenceNumber(prefix: string = 'PAY'): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}-${timestamp}-${random}`;
  },
};

// Export a default instance
export const paymentApi = new PaymentApiHelper();