// @/serer/features/cashbookSystem/core/entities/cashbookSystem.ts
// Cash Book Entry Interface
export interface CashBookEntryInterface {
    id?: string;
    cashBookId: string;
    date: Date;
    amount: number;
    type: 'Dr' | 'Cr';  // Dr = Cash In, Cr = Cash Out
    transactionType: string;  // 'Payment In', 'Payment Out', 'Opening Balance', etc.

    // Document Reference System
    documentId?: string;        // Reference to source document
    documentType?: string;      // 'invoice', 'purchase_voucher', 'payment_voucher', etc.
    documentNumber?: string;    // Human-readable document number

    // Rich Description System (similar to your LedgerEntry)
    primaryDescription: string; // Main description (e.g., "Payment In", "Payment Out")
    secondaryDescription?: string; // Additional context (e.g., "Party: PARTY NAME")
    referenceDescription?: string; // Reference info (e.g., "Invoice #3", "Purchase Voucher #14173")
    ledgerReference?: string;   // Related ledger name for cross-references

    // Additional Metadata
    isOpeningBalance?: boolean; // Flag for opening balance entries
    createdAt?: Date;
    updatedAt?: Date;
}

export class CashBookEntry implements CashBookEntryInterface {
    constructor(
        public cashBookId: string,
        public date: Date,
        public amount: number,
        public type: 'Dr' | 'Cr',
        public transactionType: string,
        public primaryDescription: string,
        public id?: string,
        public documentId?: string,
        public documentType?: string,
        public documentNumber?: string,
        public secondaryDescription?: string,
        public referenceDescription?: string,
        public ledgerReference?: string,
        public isOpeningBalance: boolean = false,
        public createdAt?: Date,
        public updatedAt?: Date
    ) { }

    // Get formatted description like in your image
    getFormattedDescription(): string {
        let description = this.primaryDescription;

        if (this.secondaryDescription) {
            description += `\n${this.secondaryDescription}`;
        }

        if (this.referenceDescription) {
            description += `\n${this.referenceDescription}`;
        }

        if (this.ledgerReference) {
            description += `\nLedger: ${this.ledgerReference}`;
        }

        return description;
    }

    // Method to convert to database format
    toDbFormat(): any {
        return {
            id: this.id,
            cash_book_id: this.cashBookId,
            date: this.date,
            amount: this.amount,
            type: this.type,
            transaction_type: this.transactionType,
            document_id: this.documentId,
            document_type: this.documentType,
            document_number: this.documentNumber,
            primary_description: this.primaryDescription,
            secondary_description: this.secondaryDescription,
            reference_description: this.referenceDescription,
            ledger_reference: this.ledgerReference,
            is_opening_balance: this.isOpeningBalance,
            created_at: this.createdAt || new Date(),
            updated_at: this.updatedAt || new Date()
        };
    }

    // Static method to create from database format
    static fromDbFormat(dbRow: any): CashBookEntry {
        return new CashBookEntry(
            dbRow.cash_book_id,
            new Date(dbRow.date),
            dbRow.amount,
            dbRow.type,
            dbRow.transaction_type,
            dbRow.primary_description,
            dbRow.id,
            dbRow.document_id,
            dbRow.document_type,
            dbRow.document_number,
            dbRow.secondary_description,
            dbRow.reference_description,
            dbRow.ledger_reference,
            dbRow.is_opening_balance || false,
            dbRow.created_at ? new Date(dbRow.created_at) : undefined,
            dbRow.updated_at ? new Date(dbRow.updated_at) : undefined
        );
    }
}

// Cash Book Interface
export interface CashBookInterface {
    id?: string;
    fpoId: string;
    openingBalance: number;
    openingDate: Date;
    ledgerAccountId?: string; // NEW
    createdAt?: Date;
    updatedAt?: Date;
}

export class CashBook implements CashBookInterface {
    constructor(
        public fpoId: string,
        public openingBalance: number,
        public openingDate: Date,
        public id?: string,
        public ledgerAccountId?: string, // NEW
        public createdAt?: Date,
        public updatedAt?: Date,
        public entries: CashBookEntry[] = []
    ) {
        // No validation needed - negative balances are allowed
    }

    // Method to convert to database format
    toDbFormat(): any {
        return {
            id: this.id,
            fpo_id: this.fpoId,
            opening_balance: this.openingBalance,
            opening_date: this.openingDate,
            ledger_account_id: this.ledgerAccountId, // NEW
            created_at: this.createdAt || new Date(),
            updated_at: this.updatedAt || new Date()
        };
    }

    // Static method to create from database format
    static fromDbFormat(dbRow: any): CashBook {
        return new CashBook(
            dbRow.fpo_id,
            dbRow.opening_balance,
            new Date(dbRow.opening_date),
            dbRow.id,
            dbRow.ledger_account_id, // NEW
            dbRow.created_at ? new Date(dbRow.created_at) : undefined,
            dbRow.updated_at ? new Date(dbRow.updated_at) : undefined
        );
    }

    // Add entry (no balance validation)
    addEntry(entry: CashBookEntry): void {
        // Simply add the entry - negative balances are allowed
        this.entries.push(entry);
    }

    // Helper method to calculate net amount effect
    private getNetAmount(entry: CashBookEntry): number {
        // Dr = Cash In (positive), Cr = Cash Out (negative)
        return entry.type === 'Dr' ? entry.amount : -entry.amount;
    }

    // Get current cash balance (can be negative)
    getCurrentBalance(): number {
        let balance = this.openingBalance;

        this.entries.forEach(entry => {
            if (entry.isOpeningBalance) return; // Skip opening balance entry
            balance += this.getNetAmount(entry);
        });

        return balance; // Can be negative
    }

    // Get current balance with sign indicator
    getCurrentBalanceWithSign(): { balance: number; isNegative: boolean } {
        const balance = this.getCurrentBalance();
        return {
            balance: Math.abs(balance),
            isNegative: balance < 0
        };
    }

    // FIXED: Get cash book statement with running balance
    getStatementWithRunningBalance(
        startDate?: Date,
        endDate?: Date
    ): CashBookStatementEntry[] {
        // Filter entries by date range if provided
        let entries = this.entries;
        if (startDate && endDate) {
            entries = entries.filter(entry =>
                entry.date >= startDate && entry.date <= endDate
            );
        }

        // Sort by date
        const sortedEntries = [...entries].sort((a, b) =>
            a.date.getTime() - b.date.getTime()
        );

        const statement: CashBookStatementEntry[] = [];
        let runningBalance = this.openingBalance;

        sortedEntries.forEach(entry => {
            // Skip opening balance entry in calculation if we already have opening balance
            if (entry.isOpeningBalance) {
                statement.push({
                    entry,
                    runningBalance: this.openingBalance,
                    isNegativeBalance: this.openingBalance < 0  // FIXED: Added missing property
                });
                return;
            }

            // Calculate running balance
            runningBalance += this.getNetAmount(entry);

            statement.push({
                entry,
                runningBalance,
                isNegativeBalance: runningBalance < 0  // FIXED: Added missing property
            });
        });

        return statement;
    }

    // Get entries for a specific date range
    getEntriesForDateRange(startDate: Date, endDate: Date): CashBookEntry[] {
        return this.entries.filter(entry =>
            entry.date >= startDate && entry.date <= endDate
        );
    }
}

// FIXED: Cash Book Statement Entry (for running balance display)
export interface CashBookStatementEntry {
    entry: CashBookEntry;
    runningBalance: number; // Can be negative
    isNegativeBalance: boolean; // Indicates if balance is negative
}

// Transaction Types Enum (extensible)
export enum CashBookTransactionType {
    PAYMENT_IN = 'Payment In',
    PAYMENT_OUT = 'Payment Out',
    OPENING_BALANCE = 'Opening Balance',
    // Future transaction types can be added here
    BANK_DEPOSIT = 'Bank Deposit',
    BANK_WITHDRAWAL = 'Bank Withdrawal',
    CASH_TRANSFER = 'Cash Transfer'
}

// Universal Cash Book Entry Builder
export interface UniversalCashBookTransactionData {
    cashBookId: string;
    amount: number;
    type: 'Dr' | 'Cr';
    date: Date;
    transactionType: string;

    // Description components
    partyName?: string;         // Customer/Supplier name
    documentNumber?: string;    // Invoice #, Voucher #, etc.
    additionalInfo?: string;    // Any additional context
    relatedLedgerName?: string; // Cross-reference ledger name

    // Document reference
    documentId?: string;
    documentType?: string;      // 'invoice', 'voucher', 'payment', etc.
}

// Utility function to create cash book entry
export function createCashBookEntry(data: UniversalCashBookTransactionData): CashBookEntry {
    // Build rich description
    const primaryDescription = data.transactionType;

    let secondaryDescription = '';
    if (data.partyName) {
        secondaryDescription = `Party: ${data.partyName}`;
    }

    let referenceDescription = '';
    if (data.documentNumber) {
        referenceDescription = data.documentNumber;
    }

    if (data.additionalInfo) {
        referenceDescription += referenceDescription ? ` - ${data.additionalInfo}` : data.additionalInfo;
    }

    return new CashBookEntry(
        data.cashBookId,
        data.date,
        data.amount,
        data.type,
        data.transactionType,
        primaryDescription,
        undefined, // id
        data.documentId,
        data.documentType,
        data.documentNumber,
        secondaryDescription || undefined,
        referenceDescription || undefined,
        data.relatedLedgerName
    );
}

// IMPROVED: Opening balance utility for cash book
export function createCashBookOpeningBalanceEntry(
    cashBook: CashBook
): CashBookEntry {
    // Handle negative opening balances properly
    const balanceType: 'Dr' | 'Cr' = cashBook.openingBalance >= 0 ? 'Dr' : 'Cr';
    const balanceAmount = Math.abs(cashBook.openingBalance);

    return new CashBookEntry(
        cashBook.id!,
        cashBook.openingDate,
        balanceAmount,  // Always positive amount
        balanceType,    // Dr for positive, Cr for negative opening balance
        CashBookTransactionType.OPENING_BALANCE,
        'Opening Balance',
        undefined, // id
        undefined, // documentId
        'opening_balance', // documentType
        undefined, // documentNumber
        undefined, // secondaryDescription
        undefined, // referenceDescription
        undefined, // ledgerReference
        true // isOpeningBalance
    );
}