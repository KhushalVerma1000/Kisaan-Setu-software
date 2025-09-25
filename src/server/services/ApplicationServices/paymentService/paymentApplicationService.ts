// server/services/application/PaymentApplicationService.ts
import { BaseApplicationService } from '../BaseApplicationService';
import { PaymentInterface, Payment } from '@/server/features/Payment/core/entities/Payment';
import { PaymentDocumentInterface, PaymentDocument } from '@/server/features/Payment/core/entities/PaymentDocument';
import { 
    createPayment, 
    reversePayment, 
    getPaymentById,
    PaymentOperationResult 
} from '@/server/features/Payment/infrastructure/persistence/paymentSupabase';
import {
    createPaymentDocument,
    getPaymentDocumentByDocument,
    getPaymentDocumentById
} from '@/server/features/Payment/infrastructure/persistence/paymentDocumentSupabase';
import { 
    createLedgerEntryFromPaymentOperation 
} from '@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase';
import {
    createCashBookEntryFromPaymentOperation
} from '@/server/features/cashbookSystem/infrastructure/persistence/CashBookEntrySupabase';
import {
    createBankBookEntryFromPaymentOperation
} from '@/server/features/bankbookSystm/infrastructure/persistence/BankBookEntrySystem';
import { getLedgerNameById } from '@/server/features/ledger/infrastructure/persistence/ledgerAccountSupabase';
import { LedgerEntry } from '@/server/features/ledger/core/entities/Ledger';
import { CashBookEntry } from '@/server/features/cashbookSystem/core/entities/CashbookSystem';
import { BankBookEntry } from '@/server/features/bankbookSystm/core/entities/BankBookSystem';

// Input types for the service
export interface PaymentDocumentInput {
    documentId: string;
    documentNumber: string;
    documentType: string;
    totalDocumentAmount?: number; // Optional for existing documents
    fpoId: string;
}

export type PaymentInput = Omit<PaymentInterface, 'paymentDocumentId'>;

// Enhanced result type with all created entries
export interface PaymentServiceResult {
    payment: Payment;
    paymentDocument: PaymentDocument;
    ledgerEntry: LedgerEntry;
    cashBookEntry?: CashBookEntry;
    bankBookEntry?: BankBookEntry;
    previousPaidAmount: number;
    newPaidAmount: number;
    remainingAmount: number;
    statusChanged: boolean;
    partyName: string;
}

export interface PaymentReversalResult {
    originalPayment: Payment;
    reversalPayment: Payment;
    paymentDocument: PaymentDocument;
    reversalLedgerEntry: LedgerEntry;
    reversalCashBookEntry?: CashBookEntry;
    reversalBankBookEntry?: BankBookEntry;
    previousPaidAmount: number;
    newPaidAmount: number;
    remainingAmount: number;
    statusChanged: boolean;
    partyName: string;
    reversalReason: string;
}

export class PaymentApplicationService extends BaseApplicationService {
    
    /**
     * Process a complete payment with all associated entries
     * This is the main method for creating payments
     */
    async processPayment(
        paymentInput: PaymentInput,
        documentInput: PaymentDocumentInput
    ): Promise<PaymentServiceResult> {
        return this.executeInTransaction(async () => {
            try {
                this.log(`Starting payment processing for document ${documentInput.documentType} ${documentInput.documentId}`, 'info');

                // Step 1: Get or create payment document
                const paymentDocument = await this.getOrCreatePaymentDocument(documentInput);
                this.log(`Payment document resolved: ${paymentDocument.id}`, 'info');

                // Step 2: Create payment with resolved payment document ID
                const paymentData: PaymentInterface = {
                    ...paymentInput,
                    paymentDocumentId: paymentDocument.id!
                };

                // Get the transaction client and use the feature layer function
                const supabase = await this.getSupabaseClient();
                const paymentResult = await createPayment(paymentData, supabase);
                this.log(`Payment created: ${paymentResult.payment.id}`, 'info');
                this.log(`Payment document updated to status: ${paymentResult.paymentDocument.paymentStatus}`, 'info');

                // Step 3: Get party name for descriptive entries
                const partyName = await getLedgerNameById(paymentResult.payment.partyLedgerAccountId);
                if (!partyName) {
                    throw new Error(`Party ledger account not found: ${paymentResult.payment.partyLedgerAccountId}`);
                }
                this.log(`Party name resolved: ${partyName}`, 'info');

                // Step 4: Create ledger entry using existing function
                const ledgerEntry = await createLedgerEntryFromPaymentOperation(paymentResult);
                this.log(`Ledger entry created: ${ledgerEntry.id}`, 'info');

                // Step 5: Create cash book or bank book entry based on payment method using existing functions
                let cashBookEntry: CashBookEntry | undefined;
                let bankBookEntry: BankBookEntry | undefined;

                if (paymentResult.payment.method === 'cash' && paymentResult.payment.cashbookId) {
                    cashBookEntry = await createCashBookEntryFromPaymentOperation(paymentResult, partyName);
                    this.log(`Cash book entry created: ${cashBookEntry.id}`, 'info');
                } else if (paymentResult.payment.method === 'bank_transfer' && paymentResult.payment.bankbookId) {
                    bankBookEntry = await createBankBookEntryFromPaymentOperation(paymentResult, partyName);
                    this.log(`Bank book entry created: ${bankBookEntry.id}`, 'info');
                }

                const result: PaymentServiceResult = {
                    payment: paymentResult.payment,
                    paymentDocument: paymentResult.paymentDocument,
                    ledgerEntry,
                    cashBookEntry,
                    bankBookEntry,
                    previousPaidAmount: paymentResult.previousPaidAmount,
                    newPaidAmount: paymentResult.newPaidAmount,
                    remainingAmount: paymentResult.remainingAmount,
                    statusChanged: paymentResult.statusChanged,
                    partyName
                };

                this.log(`Payment processing completed successfully for ${paymentResult.payment.id}`, 'info');
                return result;

            } catch (error) {
                this.log(`Error in payment processing: ${error}`, 'error');
                throw error;
            }
        });
    }

    /**
     * Process payment reversal with all associated entries
     */
    async processPaymentReversal(
        paymentId: string,
        reason: string
    ): Promise<PaymentReversalResult> {
        return this.executeInTransaction(async () => {
            try {
                this.log(`Starting payment reversal for payment ${paymentId}, reason: ${reason}`, 'info');

                // Step 1: Get original payment details first
                const supabase = await this.getSupabaseClient();
                const originalPayment = await getPaymentById(paymentId, supabase);
                if (!originalPayment) {
                    throw new Error('Payment not found');
                }

                // Step 2: Use feature layer function with transaction context
                const reversalResult = await reversePayment(paymentId, reason, supabase);
                this.log(`Reversal payment created: ${reversalResult.payment.id}`, 'info');
                this.log(`Payment document updated after reversal to status: ${reversalResult.paymentDocument.paymentStatus}`, 'info');

                // Step 3: Get party name
                const partyName = await getLedgerNameById(reversalResult.payment.partyLedgerAccountId);
                if (!partyName) {
                    throw new Error(`Party ledger account not found: ${reversalResult.payment.partyLedgerAccountId}`);
                }
                this.log(`Party name resolved: ${partyName}`, 'info');

                // Step 4: Create reversal ledger entry using existing function
                const reversalLedgerEntry = await createLedgerEntryFromPaymentOperation(reversalResult);
                this.log(`Reversal ledger entry created: ${reversalLedgerEntry.id}`, 'info');

                // Step 5: Create reversal cash book or bank book entry using existing functions
                let reversalCashBookEntry: CashBookEntry | undefined;
                let reversalBankBookEntry: BankBookEntry | undefined;

                if (reversalResult.payment.method === 'cash' && reversalResult.payment.cashbookId) {
                    reversalCashBookEntry = await createCashBookEntryFromPaymentOperation(reversalResult, partyName);
                    this.log(`Reversal cash book entry created: ${reversalCashBookEntry.id}`, 'info');
                } else if (reversalResult.payment.method === 'bank_transfer' && reversalResult.payment.bankbookId) {
                    reversalBankBookEntry = await createBankBookEntryFromPaymentOperation(reversalResult, partyName);
                    this.log(`Reversal bank book entry created: ${reversalBankBookEntry.id}`, 'info');
                }

                const result: PaymentReversalResult = {
                    originalPayment,
                    reversalPayment: reversalResult.payment,
                    paymentDocument: reversalResult.paymentDocument,
                    reversalLedgerEntry,
                    reversalCashBookEntry,
                    reversalBankBookEntry,
                    previousPaidAmount: reversalResult.previousPaidAmount,
                    newPaidAmount: reversalResult.newPaidAmount,
                    remainingAmount: reversalResult.remainingAmount,
                    statusChanged: reversalResult.statusChanged,
                    partyName,
                    reversalReason: reason
                };

                this.log(`Payment reversal completed successfully for ${paymentId}`, 'info');
                return result;

            } catch (error) {
                this.log(`Error in payment reversal: ${error}`, 'error');
                throw error;
            }
        });
    }

    /**
     * Get payment details with all associated entries
     */
    async getPaymentDetails(paymentId: string): Promise<{
        payment: Payment;
        paymentDocument: PaymentDocument;
        partyName: string;
    } | null> {
        try {
            // Use existing function to get payment
            const payment = await getPaymentById(paymentId);
            if (!payment) {
                return null;
            }

            // Use existing function to get payment document
            const paymentDocument = await getPaymentDocumentById(payment.paymentDocumentId);
            if (!paymentDocument) {
                throw new Error('Payment document not found');
            }

            // Get party name
            const partyName = await getLedgerNameById(payment.partyLedgerAccountId);
            if (!partyName) {
                throw new Error(`Party ledger account not found: ${payment.partyLedgerAccountId}`);
            }

            return {
                payment,
                paymentDocument,
                partyName
            };

        } catch (error) {
            this.log(`Error getting payment details: ${error}`, 'error');
            throw error;
        }
    }

    /**
     * Get payment document summary for validation before payment
     */
    async validatePaymentDocument(
        documentId: string,
        documentType: string,
        fpoId: string,
        paymentAmount: number
    ): Promise<{
        isValid: boolean;
        paymentDocument: PaymentDocument | null;
        remainingAmount: number;
        errorMessage?: string;
    }> {
        try {
            const paymentDocument = await getPaymentDocumentByDocument(documentId, documentType, fpoId);
            
            if (!paymentDocument) {
                return {
                    isValid: false,
                    paymentDocument: null,
                    remainingAmount: 0,
                    errorMessage: 'Payment document not found'
                };
            }

            const canAcceptPayment = paymentDocument.canAcceptPayment(Math.abs(paymentAmount));
            const remainingAmount = paymentDocument.calculateRemainingAmount();

            return {
                isValid: canAcceptPayment,
                paymentDocument,
                remainingAmount,
                errorMessage: canAcceptPayment ? undefined : `Payment amount exceeds remaining amount (₹${remainingAmount})`
            };
        } catch (error) {
            this.log(`Error validating payment document: ${error}`, 'error');
            return {
                isValid: false,
                paymentDocument: null,
                remainingAmount: 0,
                errorMessage: 'Error validating payment document'
            };
        }
    }

    // Private helper methods

    /**
     * Get existing payment document or create a new one
     */
    private async getOrCreatePaymentDocument(documentInput: PaymentDocumentInput): Promise<PaymentDocument> {
        // Try to find existing payment document using existing function
        let paymentDocument = await getPaymentDocumentByDocument(
            documentInput.documentId,
            documentInput.documentType,
            documentInput.fpoId
        );

        if (paymentDocument) {
            this.log(`Found existing payment document: ${paymentDocument.id}`, 'info');
            return paymentDocument;
        }

        // Create new payment document using existing function
        if (!documentInput.totalDocumentAmount) {
            throw new Error('Total document amount is required for new payment documents');
        }

        const newDocumentData: PaymentDocumentInterface = {
            documentId: documentInput.documentId,
            documentNumber: documentInput.documentNumber,
            documentType: documentInput.documentType,
            totalDocumentAmount: documentInput.totalDocumentAmount,
            fpoId: documentInput.fpoId,
            totalPaidAmount: 0,
            paymentStatus: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        paymentDocument = await createPaymentDocument(newDocumentData);
        this.log(`Created new payment document: ${paymentDocument.id}`, 'info');
        return paymentDocument;
    }
}