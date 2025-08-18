// server/features/bankbook/core/entities/BankBookSystem.ts

// Bank Book Entry Interface
export interface BankBookEntryInterface {
    id?: string;
    bankBookId: string;
    date: Date;
    amount: number;
    type: 'Dr' | 'Cr';  // Dr = Money In, Cr = Money Out
    transactionType: string;  // 'Payment In', 'Payment Out', 'Opening Balance', etc.
    paymentMethod?: string;   // 'Cheque', 'NEFT', 'RTGS', 'UPI', 'Cash Deposit', 'DD', etc.
    
    // Document Reference System
    documentId?: string;        // Reference to source document
    documentType?: string;      // 'invoice', 'purchase_voucher', 'payment_voucher', etc.
    documentNumber?: string;    // Human-readable document number
    
    // Rich Description System (similar to CashBook)
    primaryDescription: string; // Main description (e.g., "Payment In", "Payment Out")
    secondaryDescription?: string; // Additional context (e.g., "Party: PARTY NAME")
    referenceDescription?: string; // Reference info (e.g., "Invoice #3 - Cheque #123456")
    ledgerReference?: string;   // Related ledger name for cross-references
    
    // Bank-specific fields
    chequeNumber?: string;      // Cheque number for cheque transactions
    referenceNumber?: string;   // NEFT/RTGS/UPI reference number
    
    // Additional Metadata
    isOpeningBalance?: boolean; // Flag for opening balance entries
    createdAt?: Date;
    updatedAt?: Date;
}

export class BankBookEntry implements BankBookEntryInterface {
    constructor(
        public bankBookId: string,
        public date: Date,
        public amount: number,
        public type: 'Dr' | 'Cr',
        public transactionType: string,
        public primaryDescription: string,
        public id?: string,
        public paymentMethod?: string,
        public documentId?: string,
        public documentType?: string,
        public documentNumber?: string,
        public secondaryDescription?: string,
        public referenceDescription?: string,
        public ledgerReference?: string,
        public chequeNumber?: string,
        public referenceNumber?: string,
        public isOpeningBalance: boolean = false,
        public createdAt?: Date,
        public updatedAt?: Date
    ) {}

    // Get formatted description like in your previous software
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
            bank_book_id: this.bankBookId,
            date: this.date,
            amount: this.amount,
            type: this.type,
            transaction_type: this.transactionType,
            payment_method: this.paymentMethod,
            document_id: this.documentId,
            document_type: this.documentType,
            document_number: this.documentNumber,
            primary_description: this.primaryDescription,
            secondary_description: this.secondaryDescription,
            reference_description: this.referenceDescription,
            ledger_reference: this.ledgerReference,
            cheque_number: this.chequeNumber,
            reference_number: this.referenceNumber,
            is_opening_balance: this.isOpeningBalance,
            created_at: this.createdAt || new Date(),
            updated_at: this.updatedAt || new Date()
        };
    }

    // Static method to create from database format
    static fromDbFormat(dbRow: any): BankBookEntry {
        return new BankBookEntry(
            dbRow.bank_book_id,
            new Date(dbRow.date),
            dbRow.amount,
            dbRow.type,
            dbRow.transaction_type,
            dbRow.primary_description,
            dbRow.id,
            dbRow.payment_method,
            dbRow.document_id,
            dbRow.document_type,
            dbRow.document_number,
            dbRow.secondary_description,
            dbRow.reference_description,
            dbRow.ledger_reference,
            dbRow.cheque_number,
            dbRow.reference_number,
            dbRow.is_opening_balance || false,
            dbRow.created_at ? new Date(dbRow.created_at) : undefined,
            dbRow.updated_at ? new Date(dbRow.updated_at) : undefined
        );
    }
}

// Bank Book Interface
export interface BankBookInterface {
    id?: string;
    bankAccountId: string;  // References BankDetail.id
    fpoId: string;
    openingBalance: number;
    openingDate: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export class BankBook implements BankBookInterface {
    constructor(
        public bankAccountId: string,
        public fpoId: string,
        public openingBalance: number,
        public openingDate: Date,
        public id?: string,
        public createdAt?: Date,
        public updatedAt?: Date,
        public entries: BankBookEntry[] = []
    ) {
        // No validation needed - negative balances are allowed (overdraft)
    }

    // Method to convert to database format
    toDbFormat(): any {
        return {
            id: this.id,
            bank_account_id: this.bankAccountId,
            fpo_id: this.fpoId,
            opening_balance: this.openingBalance,
            opening_date: this.openingDate,
            created_at: this.createdAt || new Date(),
            updated_at: this.updatedAt || new Date()
        };
    }

    // Static method to create from database format
    static fromDbFormat(dbRow: any): BankBook {
        return new BankBook(
            dbRow.bank_account_id,
            dbRow.fpo_id,
            dbRow.opening_balance,
            new Date(dbRow.opening_date),
            dbRow.id,
            dbRow.created_at ? new Date(dbRow.created_at) : undefined,
            dbRow.updated_at ? new Date(dbRow.updated_at) : undefined
        );
    }

    // Add entry (no balance validation - overdraft allowed)
    addEntry(entry: BankBookEntry): void {
        this.entries.push(entry);
    }

    // Helper method to calculate net amount effect
    private getNetAmount(entry: BankBookEntry): number {
        // Dr = Money In (positive), Cr = Money Out (negative)
        return entry.type === 'Dr' ? entry.amount : -entry.amount;
    }

    // Get current bank balance (can be negative for overdraft)
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

    // Get bank book statement with running balance
    getStatementWithRunningBalance(
        startDate?: Date,
        endDate?: Date
    ): BankBookStatementEntry[] {
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

        const statement: BankBookStatementEntry[] = [];
        let runningBalance = this.openingBalance;

        sortedEntries.forEach(entry => {
            // Skip opening balance entry in calculation if we already have opening balance
            if (entry.isOpeningBalance) {
                statement.push({
                    entry,
                    runningBalance: this.openingBalance,
                    isNegativeBalance: this.openingBalance < 0
                });
                return;
            }

            // Calculate running balance
            runningBalance += this.getNetAmount(entry);

            statement.push({
                entry,
                runningBalance,
                isNegativeBalance: runningBalance < 0
            });
        });

        return statement;
    }

    // Get entries for a specific date range
    getEntriesForDateRange(startDate: Date, endDate: Date): BankBookEntry[] {
        return this.entries.filter(entry => 
            entry.date >= startDate && entry.date <= endDate
        );
    }
}

// Bank Book Statement Entry (for running balance display)
export interface BankBookStatementEntry {
    entry: BankBookEntry;
    runningBalance: number; // Can be negative
    isNegativeBalance: boolean; // Indicates if balance is negative
}

// Transaction Types Enum (extensible)
export enum BankBookTransactionType {
    PAYMENT_IN = 'Payment In',
    PAYMENT_OUT = 'Payment Out',
    OPENING_BALANCE = 'Opening Balance',
    // Future transaction types can be added here
    BANK_CHARGES = 'Bank Charges',
    INTEREST_CREDIT = 'Interest Credit',
    CHEQUE_RETURN = 'Cheque Return'
}

// Payment Methods Enum (extensible)
export enum BankBookPaymentMethod {
    CHEQUE = 'Cheque',
    NEFT = 'NEFT',
    RTGS = 'RTGS',
    UPI = 'UPI',
    CASH_DEPOSIT = 'Cash Deposit',
    DEMAND_DRAFT = 'Demand Draft',
    ONLINE_TRANSFER = 'Online Transfer',
    // Future payment methods can be added here
    MOBILE_BANKING = 'Mobile Banking',
    ATM_TRANSFER = 'ATM Transfer'
}

// Universal Bank Book Entry Builder
export interface UniversalBankBookTransactionData {
    bankBookId: string;
    amount: number;
    type: 'Dr' | 'Cr';
    date: Date;
    transactionType: string;
    paymentMethod?: string;
    
    // Description components
    partyName?: string;         // Customer/Supplier name
    documentNumber?: string;    // Invoice #, Voucher #, etc.
    additionalInfo?: string;    // Any additional context
    relatedLedgerName?: string; // Cross-reference ledger name
    
    // Bank-specific data
    chequeNumber?: string;      // Cheque number
    referenceNumber?: string;   // NEFT/RTGS/UPI reference
    
    // Document reference
    documentId?: string;
    documentType?: string;      // 'invoice', 'voucher', 'payment', etc.
}

// Utility function to create bank book entry
export function createBankBookEntry(data: UniversalBankBookTransactionData): BankBookEntry {
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
    
    // Add payment method details to reference description
    if (data.paymentMethod && data.chequeNumber) {
        const methodInfo = `${data.paymentMethod} #${data.chequeNumber}`;
        referenceDescription += referenceDescription ? ` - ${methodInfo}` : methodInfo;
    } else if (data.paymentMethod && data.referenceNumber) {
        const methodInfo = `${data.paymentMethod} Ref: ${data.referenceNumber}`;
        referenceDescription += referenceDescription ? ` - ${methodInfo}` : methodInfo;
    } else if (data.paymentMethod) {
        referenceDescription += referenceDescription ? ` - ${data.paymentMethod}` : data.paymentMethod;
    }
    
    if (data.additionalInfo) {
        referenceDescription += referenceDescription ? ` - ${data.additionalInfo}` : data.additionalInfo;
    }

    return new BankBookEntry(
        data.bankBookId,
        data.date,
        data.amount,
        data.type,
        data.transactionType,
        primaryDescription,
        undefined, // id
        data.paymentMethod,
        data.documentId,
        data.documentType,
        data.documentNumber,
        secondaryDescription || undefined,
        referenceDescription || undefined,
        data.relatedLedgerName,
        data.chequeNumber,
        data.referenceNumber
    );
}

// Opening balance utility for bank book
export function createBankBookOpeningBalanceEntry(
    bankBook: BankBook
): BankBookEntry {
    // Handle negative opening balances properly (overdraft)
    const balanceType: 'Dr' | 'Cr' = bankBook.openingBalance >= 0 ? 'Dr' : 'Cr';
    const balanceAmount = Math.abs(bankBook.openingBalance);
    
    return new BankBookEntry(
        bankBook.id!,
        bankBook.openingDate,
        balanceAmount,  // Always positive amount
        balanceType,    // Dr for positive, Cr for negative opening balance
        BankBookTransactionType.OPENING_BALANCE,
        'Opening Balance',
        undefined, // id
        undefined, // paymentMethod
        undefined, // documentId
        'opening_balance', // documentType
        undefined, // documentNumber
        undefined, // secondaryDescription
        undefined, // referenceDescription
        undefined, // ledgerReference
        undefined, // chequeNumber
        undefined, // referenceNumber
        true // isOpeningBalance
    );
}