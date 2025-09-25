export type PaymentType = 'payment_in' | 'payment_out';
export type PaymentMethod = 'cash' | 'bank_transfer';
export type PaymentStatus =   'active' | 'reversed' | 'cancelled';


export interface PaymentInterface {
    id?: string;
    paymentDocumentId: string;
    type: PaymentType;
    method: PaymentMethod;
    amount: number;
    date: Date;
    partyLedgerAccountId: string;
    cashbookId?: string;
    bankbookId?: string;
    notes: string;
    referenceNumber?: string;
    paymentStatus: PaymentStatus;
    reversalPaymentId?: string;
    fpoId: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export class Payment implements PaymentInterface {
    constructor(
        public paymentDocumentId: string,
        public type: PaymentType,
        public method: PaymentMethod,
        public amount: number,
        public date: Date,
        public partyLedgerAccountId: string,
        public notes: string,
        public fpoId: string,
        public id?: string,
        public cashbookId?: string,
        public bankbookId?: string,
        public referenceNumber?: string,
        public paymentStatus: PaymentStatus = 'active',
        public reversalPaymentId?: string,
        public createdAt?: Date,
        public updatedAt?: Date
    ) {
        this.validatePayment();
    }

    private validatePayment(): void {
        if (this.amount === 0) {
            throw new Error('Payment amount cannot be zero');
        }
        
        // Validate method and book ID consistency
        if (this.method === 'bank_transfer' && !this.bankbookId) {
            throw new Error('Bankbook ID is required for bank transfers');
        }
        
        if (this.method === 'cash' && !this.cashbookId) {
            throw new Error('Cashbook ID is required for cash payments');
        }

        if (this.method === 'cash' && this.bankbookId) {
            throw new Error('Bankbook ID should not be provided for cash payments');
        }

        if (this.method === 'bank_transfer' && this.cashbookId) {
            throw new Error('Cashbook ID should not be provided for bank transfers');
        }

        if (!this.paymentDocumentId || !this.partyLedgerAccountId || !this.fpoId) {
            throw new Error('Payment document ID, party ledger account ID, and FPO ID are required');
        }

      
    }

    // Check if this payment can be reversed
    canBeReversed(): boolean {
        if (this.paymentStatus !== 'active') {
            return false;
        }

        // Business rule: Can reverse within 30 days
        const daysSincePayment = (new Date().getTime() - this.date.getTime()) / (1000 * 60 * 60 * 24);
        return daysSincePayment <= 30;
    }

    // Check if this is a reversal payment (has negative amount)
    isReversalPayment(): boolean {
        return this.amount < 0 && this.reversalPaymentId !== undefined;
    }

    // Check if this payment was reversed
    isReversed(): boolean {
        return this.paymentStatus === 'reversed';
    }

    // Get the relevant book ID based on payment method
    getBookId(): string | null {
        if (this.method === 'cash') {
            return this.cashbookId || null;
        } else if (this.method === 'bank_transfer') {
            return this.bankbookId || null;
        }
        return null;
    }

 

    // Get payment summary for display
    getPaymentSummary(): {
        title: string;
        amount: string;
        method: string;
        date: string;
        status: PaymentStatus;
        reference?: string;
        bookId?: string;
        notes: string;
    } {
        const isNegative = this.amount < 0;
        const displayAmount = Math.abs(this.amount);
        
        return {
            title: this.isReversalPayment() 
                ? `Payment Reversal (${this.type === 'payment_in' ? 'Received' : 'Paid'})`
                : `Payment ${this.type === 'payment_in' ? 'Received' : 'Made'}`,
            amount: `${isNegative ? '-' : ''}₹${displayAmount.toLocaleString()}`,
            method: this.method === 'cash' ? 'Cash' : 'Bank Transfer',
            date: this.date.toLocaleDateString(),
            status: this.paymentStatus,
            reference: this.referenceNumber,
            bookId: this.getBookId() || undefined,
            notes: this.notes
        };
    }


    // Method to convert to database format
    toDbFormat(): any {
        return {
            id: this.id,
            payment_document_id: this.paymentDocumentId,
            type: this.type,
            method: this.method,
            amount: this.amount,
            date: this.date,
            party_ledger_account_id: this.partyLedgerAccountId,
            cashbook_id: this.cashbookId,
            bankbook_id: this.bankbookId,
            notes: this.notes,
            reference_number: this.referenceNumber,
            payment_status: this.paymentStatus,
            reversal_payment_id: this.reversalPaymentId,
            fpo_id: this.fpoId,
            created_at: this.createdAt || new Date(),
            updated_at: this.updatedAt || new Date()
        };
    }

    // Static method to create from database format
    static fromDbFormat(dbRow: any): Payment {
        return new Payment(
            dbRow.payment_document_id,
            dbRow.type,
            dbRow.method,
            dbRow.amount,
            new Date(dbRow.date),
            dbRow.party_ledger_account_id,
            dbRow.notes || '', // Provide empty string as fallback
            dbRow.fpo_id,
            dbRow.id,
            dbRow.cashbook_id,
            dbRow.bankbook_id,
            dbRow.reference_number,
            dbRow.payment_status || 'active',
            dbRow.reversal_payment_id,
            dbRow.created_at ? new Date(dbRow.created_at) : undefined,
            dbRow.updated_at ? new Date(dbRow.updated_at) : undefined
        );
    }

    // Static method to create from interface
    static fromInterface(paymentData: PaymentInterface): Payment {
        return new Payment(
            paymentData.paymentDocumentId,
            paymentData.type,
            paymentData.method,
            paymentData.amount,
            paymentData.date,
            paymentData.partyLedgerAccountId,
            paymentData.notes,
            paymentData.fpoId,
            paymentData.id,
            paymentData.cashbookId,
            paymentData.bankbookId,
            paymentData.referenceNumber,
            paymentData.paymentStatus,
            paymentData.reversalPaymentId,
            paymentData.createdAt,
            paymentData.updatedAt
        );
    }
}

// Utility function to create payment entry
export function createPaymentEntry(data: {
    paymentDocumentId: string;
    type: PaymentType;
    method: PaymentMethod;
    amount: number;
    date: Date;
    partyLedgerAccountId: string;
    fpoId: string;
    cashbookId?: string;
    bankbookId?: string;
    notes?: string;
    referenceNumber?: string;
}): Payment {
    return new Payment(
        data.paymentDocumentId,
        data.type,
        data.method,
        data.amount,
        data.date,
        data.partyLedgerAccountId,
        data.notes || '', // Provide empty string fallback for optional notes
        data.fpoId,
        undefined, // id - let Supabase generate
        data.cashbookId,
        data.bankbookId,
        data.referenceNumber
    );
}

