// types/api/voucher.ts

export interface ApiResponse<T = unknown> {
    data?: T;
    error?: string;
    message?: string;
    success: boolean;
}

export interface VoucherQueryParams {
    fpoId: string;
    voucherType?: 'payment' | 'receipt' | 'contra' | 'journal';
    startDate?: string;
    endDate?: string;
    summary?: boolean;
}

export interface CreatePaymentVoucherRequest {
    voucherNumber?: string;
    date: string;
    fpoId: string;
    description: string;
    paymentMode: 'cash' | 'bank';
    cashBookId?: string;
    bankBookId?: string;
    chequeNumber?: string;
    chequeDate?: string;
    notes?: string;
    entries: Array<{
        ledgerAccountId: string;
        amount: number;
        description: string;
    }>;
}

export interface CreateReceiptVoucherRequest {
    voucherNumber?: string;
    date: string;
    fpoId: string;
    description: string;
    receiptMode: 'cash' | 'bank';
    cashBookId?: string;
    bankBookId?: string;
    chequeNumber?: string;
    chequeDate?: string;
    notes?: string;
    entries: Array<{
        ledgerAccountId: string;
        amount: number;
        description: string;
    }>;
}

export interface CreateContraVoucherRequest {
    voucherNumber?: string;
    date: string;
    fpoId: string;
    description: string;
    fromAccount: 'cash' | 'bank';
    toAccount: 'cash' | 'bank';
    amount: number;
    fromCashBookId?: string;
    fromBankBookId?: string;
    toCashBookId?: string;
    toBankBookId?: string;
    notes?: string;
}

export interface CreateJournalVoucherRequest {
    voucherNumber?: string;
    date: string;
    fpoId: string;
    description: string;
    journalType: 'adjustment' | 'correction' | 'transfer' | 'accrual' | 'provision' | 'other';
    referenceNumber?: string;
    isReversalEntry?: boolean;
    originalVoucherId?: string;
    notes?: string;
    entries: Array<{
        ledgerAccountId: string;
        amount: number;
        type: 'Dr' | 'Cr';
        description: string;
    }>;
}

export interface CreateReversalVoucherRequest {
    originalVoucherId: string;
    reversalDate: string;
    reversalDescription?: string;
}

export interface VoucherSummary {
    totalPaymentVouchers: number;
    totalReceiptVouchers: number;
    totalContraVouchers: number;
    totalJournalVouchers: number;
    totalPaymentAmount: number;
    totalReceiptAmount: number;
    totalContraAmount: number;
    totalJournalAmount: number;
}
