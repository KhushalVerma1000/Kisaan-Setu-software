// @/server/features/vouchers/core/entities/VoucherSystem.ts

import { LedgerEntry, LedgerAccount } from '@/server/features/ledger/core/entities/Ledger';
// ============================================================================
// BASE INTERFACES
// ============================================================================

export interface BaseVoucherInterface {
    id?: string;
    voucherNumber: string;
    voucherType: 'payment' | 'receipt' | 'contra' | 'journal';
    date: Date;
    fpoId: string;
    description: string;
    notes?: string;

    // Reference to ledger entries (stored as array of IDs in DB)
    ledgerEntryIds: string[];

    // For reversal functionality
    isReversalEntry?: boolean;
    originalVoucherId?: string;

    createdBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

// ============================================================================
// VOUCHER LINE ITEM (for creating ledger entries)
// ============================================================================

export interface VoucherLineItem {
    ledgerAccountId: string;
    ledgerAccountName?: string;
    ledgerReference?: string; // NEW: Reference to related ledger account(s)
    // For display purposes
    amount: number;
    type: 'Dr' | 'Cr';
    description: string;
}

// ============================================================================
// BASE VOUCHER CLASS
// ============================================================================

export abstract class BaseVoucher implements BaseVoucherInterface {
    public ledgerEntryIds: string[] = [];
    public lineItems: VoucherLineItem[] = [];

    constructor(
        public voucherNumber: string,
        public voucherType: 'payment' | 'receipt' | 'contra' | 'journal',
        public date: Date,
        public fpoId: string,
        public description: string,
        public id?: string,
        public notes?: string,
        public isReversalEntry?: boolean,
        public originalVoucherId?: string,
        public createdBy?: string,
        public createdAt?: Date,
        public updatedAt?: Date
    ) { }

    // Add a line item to the voucher
    addLineItem(item: VoucherLineItem): void {
        this.lineItems.push(item);
    }

    // Add multiple line items at once
    addLineItems(items: VoucherLineItem[]): void {
        this.lineItems.push(...items);
    }

    // Get total amount (sum of all debits or credits, they should be equal)
    getTotalAmount(): number {
        return this.lineItems
            .filter(item => item.type === 'Dr')
            .reduce((sum, item) => sum + item.amount, 0);
    }

    // Get total debits
    getTotalDebits(): number {
        return this.lineItems
            .filter(item => item.type === 'Dr')
            .reduce((sum, item) => sum + item.amount, 0);
    }

    // Get total credits
    getTotalCredits(): number {
        return this.lineItems
            .filter(item => item.type === 'Cr')
            .reduce((sum, item) => sum + item.amount, 0);
    }

    // Get debit entries
    getDebitEntries(): VoucherLineItem[] {
        return this.lineItems.filter(item => item.type === 'Dr');
    }

    // Get credit entries
    getCreditEntries(): VoucherLineItem[] {
        return this.lineItems.filter(item => item.type === 'Cr');
    }

    // Check if voucher is balanced (Dr = Cr)
    isBalanced(): boolean {
        const totalDebits = this.getTotalDebits();
        const totalCredits = this.getTotalCredits();
        return Math.abs(totalDebits - totalCredits) < 0.01;
    }

    // Create ledger entries from line items
    createLedgerEntries(): Partial<LedgerEntry>[] {
        return this.lineItems.map(item => ({
            ledgerAccountId: item.ledgerAccountId,
            date: this.date,
            amount: item.amount,
            type: item.type,
            primaryDescription: `${this.voucherType.charAt(0).toUpperCase() + this.voucherType.slice(1)} Voucher #${this.voucherNumber}`,
            secondaryDescription: item.description,
            referenceDescription: this.description,
            documentId: this.id,
            documentType: `${this.voucherType}_voucher`,
            documentNumber: this.voucherNumber,
            isOpeningBalance: false
        }));
    }

    // Get summary of the voucher
    getSummary(): {
        totalDebits: number;
        totalCredits: number;
        debitCount: number;
        creditCount: number;
        isBalanced: boolean;
    } {
        return {
            totalDebits: this.getTotalDebits(),
            totalCredits: this.getTotalCredits(),
            debitCount: this.getDebitEntries().length,
            creditCount: this.getCreditEntries().length,
            isBalanced: this.isBalanced()
        };
    }

    // Convert to database format
    toDbFormat(): any {
        return {
            id: this.id,
            voucher_number: this.voucherNumber,
            voucher_type: this.voucherType,
            date: this.date,
            fpo_id: this.fpoId,
            description: this.description,
            notes: this.notes,
            ledger_entry_ids: this.ledgerEntryIds,
            is_reversal_entry: this.isReversalEntry || false,
            original_voucher_id: this.originalVoucherId,
            created_by: this.createdBy,
            created_at: this.createdAt || new Date(),
            updated_at: this.updatedAt || new Date()
        };
    }

    // Abstract method for validation (to be implemented by subclasses)
    abstract validate(): void;
}

// ============================================================================
// PAYMENT VOUCHER
// ============================================================================

export class PaymentVoucher extends BaseVoucher {
    constructor(
        voucherNumber: string,
        date: Date,
        fpoId: string,
        description: string,
        id?: string,
        notes?: string,
        isReversalEntry?: boolean,
        originalVoucherId?: string,
        createdBy?: string,
        createdAt?: Date,
        updatedAt?: Date
    ) {
        super(
            voucherNumber,
            'payment',
            date,
            fpoId,
            description,
            id,
            notes,
            isReversalEntry,
            originalVoucherId,
            createdBy,
            createdAt,
            updatedAt
        );
    }

    validate(): void {
        if (!this.isBalanced()) {
            throw new Error('Payment voucher entries must be balanced');
        }

        if (this.lineItems.length < 2) {
            throw new Error('Payment voucher must have at least 2 entries');
        }

        // Must have at least one credit to cash/bank
        const hasCashOrBankCredit = this.getCreditEntries().some(
            item => this.isCashOrBankLedger(item.ledgerAccountId)
        );

        if (!hasCashOrBankCredit) {
            throw new Error('Payment voucher must have at least one credit entry to cash or bank account');
        }

        // All credits should typically be to cash/bank for payment vouchers
        // But we allow flexibility for complex scenarios
    }

    private isCashOrBankLedger(ledgerAccountId: string): boolean {
        // This should check against your ledger groups
        // You'll need to pass ledger account details or implement a lookup
        return true; // Placeholder
    }

    static fromDbFormat(dbRow: any): PaymentVoucher {
        const voucher = new PaymentVoucher(
            dbRow.voucher_number,
            new Date(dbRow.date),
            dbRow.fpo_id,
            dbRow.description,
            dbRow.id,
            dbRow.notes,
            dbRow.is_reversal_entry,
            dbRow.original_voucher_id,
            dbRow.created_by,
            dbRow.created_at ? new Date(dbRow.created_at) : undefined,
            dbRow.updated_at ? new Date(dbRow.updated_at) : undefined
        );

        voucher.ledgerEntryIds = dbRow.ledger_entry_ids || [];
        return voucher;
    }
}

// ============================================================================
// RECEIPT VOUCHER
// ============================================================================

export class ReceiptVoucher extends BaseVoucher {
    constructor(
        voucherNumber: string,
        date: Date,
        fpoId: string,
        description: string,
        id?: string,
        notes?: string,
        isReversalEntry?: boolean,
        originalVoucherId?: string,
        createdBy?: string,
        createdAt?: Date,
        updatedAt?: Date
    ) {
        super(
            voucherNumber,
            'receipt',
            date,
            fpoId,
            description,
            id,
            notes,
            isReversalEntry,
            originalVoucherId,
            createdBy,
            createdAt,
            updatedAt
        );
    }

    validate(): void {
        if (!this.isBalanced()) {
            throw new Error('Receipt voucher entries must be balanced');
        }

        if (this.lineItems.length < 2) {
            throw new Error('Receipt voucher must have at least 2 entries');
        }

        // Must have at least one debit to cash/bank
        const hasCashOrBankDebit = this.getDebitEntries().some(
            item => this.isCashOrBankLedger(item.ledgerAccountId)
        );

        if (!hasCashOrBankDebit) {
            throw new Error('Receipt voucher must have at least one debit entry to cash or bank account');
        }
    }

    private isCashOrBankLedger(ledgerAccountId: string): boolean {
        // This should check against your ledger groups
        return true; // Placeholder
    }

    static fromDbFormat(dbRow: any): ReceiptVoucher {
        const voucher = new ReceiptVoucher(
            dbRow.voucher_number,
            new Date(dbRow.date),
            dbRow.fpo_id,
            dbRow.description,
            dbRow.id,
            dbRow.notes,
            dbRow.is_reversal_entry,
            dbRow.original_voucher_id,
            dbRow.created_by,
            dbRow.created_at ? new Date(dbRow.created_at) : undefined,
            dbRow.updated_at ? new Date(dbRow.updated_at) : undefined
        );

        voucher.ledgerEntryIds = dbRow.ledger_entry_ids || [];
        return voucher;
    }
}

// ============================================================================
// CONTRA VOUCHER
// ============================================================================

export class ContraVoucher extends BaseVoucher {
    constructor(
        voucherNumber: string,
        date: Date,
        fpoId: string,
        description: string,
        id?: string,
        notes?: string,
        isReversalEntry?: boolean,
        originalVoucherId?: string,
        createdBy?: string,
        createdAt?: Date,
        updatedAt?: Date
    ) {
        super(
            voucherNumber,
            'contra',
            date,
            fpoId,
            description,
            id,
            notes,
            isReversalEntry,
            originalVoucherId,
            createdBy,
            createdAt,
            updatedAt
        );
    }

    validate(): void {
        if (!this.isBalanced()) {
            throw new Error('Contra voucher entries must be balanced');
        }

        if (this.lineItems.length < 2) {
            throw new Error('Contra voucher must have at least 2 entries');
        }

        // All entries should be cash/bank ledgers
        const allAreCashOrBank = this.lineItems.every(
            item => this.isCashOrBankLedger(item.ledgerAccountId)
        );

        if (!allAreCashOrBank) {
            throw new Error('Contra voucher entries must be between cash and bank accounts only');
        }

        // Must have at least one debit and one credit
        if (this.getDebitEntries().length === 0 || this.getCreditEntries().length === 0) {
            throw new Error('Contra voucher must have at least one debit and one credit entry');
        }
    }

    private isCashOrBankLedger(ledgerAccountId: string): boolean {
        // This should check against your ledger groups
        return true; // Placeholder
    }

    static fromDbFormat(dbRow: any): ContraVoucher {
        const voucher = new ContraVoucher(
            dbRow.voucher_number,
            new Date(dbRow.date),
            dbRow.fpo_id,
            dbRow.description,
            dbRow.id,
            dbRow.notes,
            dbRow.is_reversal_entry,
            dbRow.original_voucher_id,
            dbRow.created_by,
            dbRow.created_at ? new Date(dbRow.created_at) : undefined,
            dbRow.updated_at ? new Date(dbRow.updated_at) : undefined
        );

        voucher.ledgerEntryIds = dbRow.ledger_entry_ids || [];
        return voucher;
    }
}

// ============================================================================
// JOURNAL VOUCHER
// ============================================================================

export class JournalVoucher extends BaseVoucher {
    constructor(
        voucherNumber: string,
        date: Date,
        fpoId: string,
        description: string,
        id?: string,
        notes?: string,
        isReversalEntry?: boolean,
        originalVoucherId?: string,
        createdBy?: string,
        createdAt?: Date,
        updatedAt?: Date
    ) {
        super(
            voucherNumber,
            'journal',
            date,
            fpoId,
            description,
            id,
            notes,
            isReversalEntry,
            originalVoucherId,
            createdBy,
            createdAt,
            updatedAt
        );
    }

    validate(): void {
        if (!this.isBalanced()) {
            throw new Error('Journal voucher entries must be balanced');
        }

        if (this.lineItems.length < 2) {
            throw new Error('Journal voucher must have at least 2 entries');
        }

        if (this.isReversalEntry && !this.originalVoucherId) {
            throw new Error('Original voucher ID is required for reversal entries');
        }

        // Must have at least one debit and one credit
        if (this.getDebitEntries().length === 0 || this.getCreditEntries().length === 0) {
            throw new Error('Journal voucher must have at least one debit and one credit entry');
        }
    }

    // Create a reversal journal voucher
    createReversalVoucher(
        newVoucherNumber: string,
        reversalDate: Date,
        reversalDescription?: string
    ): JournalVoucher {
        const reversal = new JournalVoucher(
            newVoucherNumber,
            reversalDate,
            this.fpoId,
            reversalDescription || `Reversal of ${this.description}`,
            undefined,
            `Reversal of Journal Voucher #${this.voucherNumber}`,
            true,
            this.id
        );

        // Reverse all line items (Dr becomes Cr, Cr becomes Dr)
        this.lineItems.forEach(item => {
            reversal.addLineItem({
                ledgerAccountId: item.ledgerAccountId,
                ledgerAccountName: item.ledgerAccountName,
                amount: item.amount,
                type: item.type === 'Dr' ? 'Cr' : 'Dr',
                description: `Reversal: ${item.description}`
            });
        });

        return reversal;
    }

    static fromDbFormat(dbRow: any): JournalVoucher {
        const voucher = new JournalVoucher(
            dbRow.voucher_number,
            new Date(dbRow.date),
            dbRow.fpo_id,
            dbRow.description,
            dbRow.id,
            dbRow.notes,
            dbRow.is_reversal_entry,
            dbRow.original_voucher_id,
            dbRow.created_by,
            dbRow.created_at ? new Date(dbRow.created_at) : undefined,
            dbRow.updated_at ? new Date(dbRow.updated_at) : undefined
        );

        voucher.ledgerEntryIds = dbRow.ledger_entry_ids || [];
        return voucher;
    }
}

// ============================================================================
// VOUCHER FACTORY
// ============================================================================

export type Voucher = PaymentVoucher | ReceiptVoucher | ContraVoucher | JournalVoucher;

export class VoucherFactory {
    static createPaymentVoucher(data: {
        voucherNumber: string;
        date: Date;
        fpoId: string;
        description: string;
        notes?: string;
    }): PaymentVoucher {
        return new PaymentVoucher(
            data.voucherNumber,
            data.date,
            data.fpoId,
            data.description,
            undefined,
            data.notes
        );
    }

    static createReceiptVoucher(data: {
        voucherNumber: string;
        date: Date;
        fpoId: string;
        description: string;
        notes?: string;
    }): ReceiptVoucher {
        return new ReceiptVoucher(
            data.voucherNumber,
            data.date,
            data.fpoId,
            data.description,
            undefined,
            data.notes
        );
    }

    static createContraVoucher(data: {
        voucherNumber: string;
        date: Date;
        fpoId: string;
        description: string;
        notes?: string;
    }): ContraVoucher {
        return new ContraVoucher(
            data.voucherNumber,
            data.date,
            data.fpoId,
            data.description,
            undefined,
            data.notes
        );
    }

    static createJournalVoucher(data: {
        voucherNumber: string;
        date: Date;
        fpoId: string;
        description: string;
        notes?: string;
    }): JournalVoucher {
        return new JournalVoucher(
            data.voucherNumber,
            data.date,
            data.fpoId,
            data.description,
            undefined,
            data.notes
        );
    }

    static fromDbFormat(dbRow: any): Voucher {
        switch (dbRow.voucher_type) {
            case 'payment':
                return PaymentVoucher.fromDbFormat(dbRow);
            case 'receipt':
                return ReceiptVoucher.fromDbFormat(dbRow);
            case 'contra':
                return ContraVoucher.fromDbFormat(dbRow);
            case 'journal':
                return JournalVoucher.fromDbFormat(dbRow);
            default:
                throw new Error(`Unknown voucher type: ${dbRow.voucher_type}`);
        }
    }
}

// ============================================================================
// VOUCHER NUMBER GENERATOR
// ============================================================================

export class VoucherNumberGenerator {
    static generateVoucherNumber(
        voucherType: 'payment' | 'receipt' | 'contra' | 'journal',
        date: Date,
        sequence: number
    ): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const seq = String(sequence).padStart(4, '0');

        const prefixes = {
            payment: 'PAY',
            receipt: 'REC',
            contra: 'CON',
            journal: 'JRN'
        };

        return `${prefixes[voucherType]}/${year}${month}/${seq}`;
    }
}

// ============================================================================
// HELPER BUILDERS FOR COMPLEX VOUCHER SCENARIOS
// ============================================================================

export class VoucherBuilder {
    // Build a multi-debit payment voucher (pay multiple expenses from one bank)
    static buildMultiExpensePayment(params: {
        voucherNumber: string;
        date: Date;
        fpoId: string;
        bankLedgerId: string;
        expenses: Array<{
            ledgerAccountId: string;
            amount: number;
            description: string;
        }>;
        description: string;
        notes?: string;
    }): PaymentVoucher {
        const voucher = VoucherFactory.createPaymentVoucher({
            voucherNumber: params.voucherNumber,
            date: params.date,
            fpoId: params.fpoId,
            description: params.description,
            notes: params.notes
        });

        // Add all expense debits
        params.expenses.forEach(expense => {
            voucher.addLineItem({
                ledgerAccountId: expense.ledgerAccountId,
                amount: expense.amount,
                type: 'Dr',
                description: expense.description
            });
        });

        // Add single bank credit for total
        const totalAmount = params.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        voucher.addLineItem({
            ledgerAccountId: params.bankLedgerId,
            amount: totalAmount,
            type: 'Cr',
            description: 'Payment from bank'
        });

        return voucher;
    }

    // Build payment using both cash and bank
    static buildSplitPayment(params: {
        voucherNumber: string;
        date: Date;
        fpoId: string;
        expenseLedgerId: string;
        cashLedgerId: string;
        bankLedgerId: string;
        cashAmount: number;
        bankAmount: number;
        description: string;
        notes?: string;
    }): PaymentVoucher {
        const voucher = VoucherFactory.createPaymentVoucher({
            voucherNumber: params.voucherNumber,
            date: params.date,
            fpoId: params.fpoId,
            description: params.description,
            notes: params.notes
        });

        // Debit expense with total
        voucher.addLineItem({
            ledgerAccountId: params.expenseLedgerId,
            amount: params.cashAmount + params.bankAmount,
            type: 'Dr',
            description: params.description
        });

        // Credit cash
        voucher.addLineItem({
            ledgerAccountId: params.cashLedgerId,
            amount: params.cashAmount,
            type: 'Cr',
            description: 'Payment by cash'
        });

        // Credit bank
        voucher.addLineItem({
            ledgerAccountId: params.bankLedgerId,
            amount: params.bankAmount,
            type: 'Cr',
            description: 'Payment by bank'
        });

        return voucher;
    }

    // Build receipt with multiple income sources
    static buildMultiIncomeReceipt(params: {
        voucherNumber: string;
        date: Date;
        fpoId: string;
        cashOrBankLedgerId: string;
        incomes: Array<{
            ledgerAccountId: string;
            amount: number;
            description: string;
        }>;
        description: string;
        notes?: string;
    }): ReceiptVoucher {
        const voucher = VoucherFactory.createReceiptVoucher({
            voucherNumber: params.voucherNumber,
            date: params.date,
            fpoId: params.fpoId,
            description: params.description,
            notes: params.notes
        });

        // Add single cash/bank debit for total
        const totalAmount = params.incomes.reduce((sum, inc) => sum + inc.amount, 0);
        voucher.addLineItem({
            ledgerAccountId: params.cashOrBankLedgerId,
            amount: totalAmount,
            type: 'Dr',
            description: 'Total receipt'
        });

        // Add all income credits
        params.incomes.forEach(income => {
            voucher.addLineItem({
                ledgerAccountId: income.ledgerAccountId,
                amount: income.amount,
                type: 'Cr',
                description: income.description
            });
        });

        return voucher;
    }

    // Build complex journal with multiple debits and credits
    static buildComplexJournal(params: {
        voucherNumber: string;
        date: Date;
        fpoId: string;
        description: string;
        debits: Array<{
            ledgerAccountId: string;
            amount: number;
            description: string;
        }>;
        credits: Array<{
            ledgerAccountId: string;
            amount: number;
            description: string;
        }>;
        notes?: string;
    }): JournalVoucher {
        const voucher = VoucherFactory.createJournalVoucher({
            voucherNumber: params.voucherNumber,
            date: params.date,
            fpoId: params.fpoId,
            description: params.description,
            notes: params.notes
        });

        // Add all debits
        params.debits.forEach(debit => {
            voucher.addLineItem({
                ledgerAccountId: debit.ledgerAccountId,
                amount: debit.amount,
                type: 'Dr',
                description: debit.description
            });
        });

        // Add all credits
        params.credits.forEach(credit => {
            voucher.addLineItem({
                ledgerAccountId: credit.ledgerAccountId,
                amount: credit.amount,
                type: 'Cr',
                description: credit.description
            });
        });

        return voucher;
    }
}