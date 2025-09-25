// types/api/payment.ts
import { Payment } from '@/server/features/Payment/core/entities/Payment';
import { LedgerEntry } from '@/server/features/ledger/core/entities/Ledger';
import { CashBookEntry } from '@/server/features/cashbookSystem/core/entities/CashbookSystem';
import { BankBookEntry } from '@/server/features/bankbookSystm/core/entities/BankBookSystem';

// API Request Types
export interface CreatePaymentRequest {
    paymentData: {
        fpoId: string;
        partyLedgerAccountId: string;
        documentId: string;
        documentType: 'invoice' | 'purchase_voucher' | 'other';
        amount: number;
        method: 'cash' | 'bank_transfer' | 'cheque' | 'other';
        referenceNumber?: string;
        date: string; // ISO date string
        description?: string;
        notes?: string;
        cashbookId?: string; // Required for cash payments
        bankbookId?: string; // Required for bank transfers
    };
    documentTotalAmount: number;
    partyLedgerName?: string;
}

export interface ReversePaymentRequest {
    reason: string;
    partyLedgerName?: string;
}

// API Response Types
export interface PaymentApiResponse {
    success: boolean;
    data?: {
        payment: Payment;
        paymentDocument: any;
        ledgerEntry: LedgerEntry;
        cashbookEntry?: CashBookEntry;
        bankbookEntry?: BankBookEntry;
        operationDetails: {
            previousPaidAmount: number;
            newPaidAmount: number;
            remainingAmount: number;
            statusChanged: boolean;
        };
    };
    error?: string;
    errors?: string[];
}

export interface PaymentSummaryResponse {
    success: boolean;
    data?: {
        payment: Payment;
        ledgerEntries: LedgerEntry[];
        cashbookEntries: CashBookEntry[];
        bankbookEntries: BankBookEntry[];
    };
    error?: string;
}

export interface PaymentReversalResponse {
    success: boolean;
    data?: PaymentApiResponse['data'];
    message?: string;
    error?: string;
    errors?: string[];
}

// Client-side hook types (for React Query or SWR)
export interface UseCreatePaymentMutation {
    mutate: (data: CreatePaymentRequest) => Promise<PaymentApiResponse>;
    isLoading: boolean;
    error: Error | null;
}

export interface UseReversePaymentMutation {
    mutate: (paymentId: string, data: ReversePaymentRequest) => Promise<PaymentReversalResponse>;
    isLoading: boolean;
    error: Error | null;
}