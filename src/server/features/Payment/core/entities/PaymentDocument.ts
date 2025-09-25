export type PaymentStatus = 'pending' | 'partial' | 'completed';

export interface PaymentDocumentInterface {
    id?: string;
    documentId: string;
    documentNumber: string; // Human-readable document number for display only
    documentType: string;
    totalDocumentAmount: number;
    totalPaidAmount: number;
    paymentStatus: PaymentStatus;
    fpoId: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export class PaymentDocument implements PaymentDocumentInterface {
    constructor(
        public documentId: string,
        public documentNumber: string, // Added documentNumber parameter
        public documentType: string,
        public totalDocumentAmount: number,
        public fpoId: string,
        public id?: string,
        public totalPaidAmount: number = 0,
        public paymentStatus: PaymentStatus = 'pending',
        public createdAt?: Date,
        public updatedAt?: Date
    ) {
        this.validatePaymentDocument();
    }

    private validatePaymentDocument(): void {
        if (this.totalDocumentAmount <= 0) {
            throw new Error('Total document amount must be greater than 0');
        }
        if (this.totalPaidAmount < 0) {
            throw new Error('Total paid amount cannot be negative');
        }
        if (this.totalPaidAmount > this.totalDocumentAmount) {
            throw new Error('Total paid amount cannot exceed document amount');
        }
        if (!this.documentId || !this.documentNumber || !this.documentType || !this.fpoId) {
            throw new Error('Document ID, document number, document type, and FPO ID are required');
        }
        // Basic validation for document number
        if (this.documentNumber.trim() === '') {
            throw new Error('Document number cannot be empty');
        }
    }

    // Calculate remaining amount to be paid
    calculateRemainingAmount(): number {
        return this.totalDocumentAmount - this.totalPaidAmount;
    }

    // Check if document is fully paid
    isFullyPaid(): boolean {
        return this.totalPaidAmount >= this.totalDocumentAmount;
    }

    // Check if a payment amount can be accepted without overpayment
    canAcceptPayment(paymentAmount: number): boolean {
        if (paymentAmount <= 0) {
            return false;
        }
        return (this.totalPaidAmount + paymentAmount) <= this.totalDocumentAmount;
    }

    // Update paid amount and recalculate status
    updatePaidAmount(newPaidAmount: number): void {
        if (newPaidAmount < 0) {
            throw new Error('Paid amount cannot be negative');
        }
        if (newPaidAmount > this.totalDocumentAmount) {
            throw new Error('Paid amount cannot exceed document amount');
        }

        this.totalPaidAmount = newPaidAmount;
        this.updatedAt = new Date();
        
        // Update status based on paid amount
        if (this.totalPaidAmount === 0) {
            this.paymentStatus = 'pending';
        } else if (this.totalPaidAmount < this.totalDocumentAmount) {
            this.paymentStatus = 'partial';
        } else {
            this.paymentStatus = 'completed';
        }
    }

    // Get payment progress information
    getPaymentProgress(): {
        totalAmount: number;
        paidAmount: number;
        remainingAmount: number;
        progressPercentage: number;
        status: PaymentStatus;
        documentInfo: {
            documentId: string;
            documentNumber: string;
            documentType: string;
        };
    } {
        const remainingAmount = this.calculateRemainingAmount();
        const progressPercentage = (this.totalPaidAmount / this.totalDocumentAmount) * 100;

        return {
            totalAmount: this.totalDocumentAmount,
            paidAmount: this.totalPaidAmount,
            remainingAmount,
            progressPercentage: Math.min(100, progressPercentage),
            status: this.paymentStatus,
            documentInfo: {
                documentId: this.documentId,
                documentNumber: this.documentNumber,
                documentType: this.documentType
            }
        };
    }

    // Get display name for the document (human-readable)
    getDocumentDisplayName(): string {
        return `${this.documentNumber} (${this.documentType})`;
    }

    // Method to convert to database format
    toDbFormat(): any {
        return {
            id: this.id,
            document_id: this.documentId,
            document_number: this.documentNumber, // Added to database format
            document_type: this.documentType,
            total_document_amount: this.totalDocumentAmount,
            total_paid_amount: this.totalPaidAmount,
            payment_status: this.paymentStatus,
            fpo_id: this.fpoId,
            created_at: this.createdAt || new Date(),
            updated_at: this.updatedAt || new Date()
        };
    }

    // Static method to create from database format
    static fromDbFormat(dbRow: any): PaymentDocument {
        return new PaymentDocument(
            dbRow.document_id,
            dbRow.document_number, // Added documentNumber from database
            dbRow.document_type,
            dbRow.total_document_amount,
            dbRow.fpo_id,
            dbRow.id,
            dbRow.total_paid_amount || 0,
            dbRow.payment_status || 'pending',
            dbRow.created_at ? new Date(dbRow.created_at) : undefined,
            dbRow.updated_at ? new Date(dbRow.updated_at) : undefined
        );
    }

    // Static method to create from interface
    static fromInterface(paymentDocumentData: PaymentDocumentInterface): PaymentDocument {
        return new PaymentDocument(
            paymentDocumentData.documentId,
            paymentDocumentData.documentNumber, // Added documentNumber from interface
            paymentDocumentData.documentType,
            paymentDocumentData.totalDocumentAmount,
            paymentDocumentData.fpoId,
            paymentDocumentData.id,
            paymentDocumentData.totalPaidAmount,
            paymentDocumentData.paymentStatus,
            paymentDocumentData.createdAt,
            paymentDocumentData.updatedAt
        );
    }
}