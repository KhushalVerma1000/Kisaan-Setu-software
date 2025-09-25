export interface LedgerAccountInterface {
    id?: string;
    name: string;
    groupName: string;
    openingBalance: number;
    balanceType: 'Dr' | 'Cr';
    phoneNumber?: string;
    address?: string;
    fpoId?: string;
    gstNumber?: string;
    openingDate?: Date;
    state?: string;
}

export class LedgerAccount implements LedgerAccountInterface {
    constructor(
        public name: string,
        public groupName: string,
        public openingBalance: number,
        public balanceType: 'Dr' | 'Cr',
        public id?: string,
        public phoneNumber?: string,
        public address?: string,
        public fpoId?: string,
        public gstNumber?: string,
        public openingDate?: Date,
        public state?: string
    ) {}

    // Method to convert to database format
    toDbFormat(): any {
        return {
            id: this.id,
            name: this.name,
            group_name: this.groupName,
            opening_balance: this.openingBalance,
            balance_type: this.balanceType,
            phone_number: this.phoneNumber,
            address: this.address,
            fpo_id: this.fpoId,
            gst_number: this.gstNumber,
            opening_date: this.openingDate,
            state: this.state
        };
    }

    static fromInterface(ledgerAccountData: LedgerAccountInterface): LedgerAccount {
        return new LedgerAccount(
            ledgerAccountData.name,
            ledgerAccountData.groupName,
            ledgerAccountData.openingBalance,
            ledgerAccountData.balanceType,
            ledgerAccountData.id,
            ledgerAccountData.phoneNumber,
            ledgerAccountData.address,
            ledgerAccountData.fpoId,
            ledgerAccountData.gstNumber,
            ledgerAccountData.openingDate,
            ledgerAccountData.state
        );
    }

    // Static method to create from database format
    static fromDbFormat(dbRow: any): LedgerAccount {
        return new LedgerAccount(
            dbRow.name,
            dbRow.group_name,
            dbRow.opening_balance,
            dbRow.balance_type,
            dbRow.id,
            dbRow.phone_number,
            dbRow.address,
            dbRow.fpo_id,
            dbRow.gst_number,
            dbRow.opening_date ? new Date(dbRow.opening_date) : undefined,
            dbRow.state
        );
    }
}

// Ledger Entry Interface
export interface LedgerEntryInterface {
    id?: string;
    ledgerAccountId: string;
    date: Date;
    amount: number;
    type: 'Dr' | 'Cr';
    
    // Document Reference System
    documentId?: string;        // Reference to source document (invoice_id, voucher_id, etc.)
    documentType?: string;      // 'invoice', 'voucher', 'payment', 'purchase', etc.
    documentNumber?: string;    // Human-readable document number
    
    // Rich Description System
    primaryDescription: string; // Main description (e.g., "Payment In", "Invoice", "Purchase")
    secondaryDescription?: string; // User notes/additional context
    referenceDescription?: string; // Reference info (e.g., "Invoice #3")
    ledgerReference?: string;   // Related ledger name for cross-references
    
    // Additional Metadata
    isOpeningBalance?: boolean; // Flag for opening balance entries
    createdAt?: Date;
    updatedAt?: Date;
}

export class LedgerEntry implements LedgerEntryInterface {
    constructor(
        public ledgerAccountId: string,
        public date: Date,
        public amount: number,
        public type: 'Dr' | 'Cr',
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
    ) {}

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
            ledger_account_id: this.ledgerAccountId,
            date: this.date,
            amount: this.amount,
            type: this.type,
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
    static fromDbFormat(dbRow: any): LedgerEntry {
        return new LedgerEntry(
            dbRow.ledger_account_id,
            new Date(dbRow.date),
            dbRow.amount,
            dbRow.type,
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

// Universal Transaction Entry Builder
export interface UniversalTransactionData {
    // Core transaction data
    ledgerAccountId: string;
    amount: number;
    type: 'Dr' | 'Cr';
    date: Date;
    
    // Description components
    transactionType: string;    // "Invoice", "Payment In", "Purchase Voucher", etc.
    relatedLedgerName?: string; // Customer/Supplier ledger name (goes to ledgerReference)
    documentNumber?: string;    // Invoice #, Voucher #, etc. (goes to referenceDescription)
    notes?: string;             // User-provided notes (goes to secondaryDescription)
    
    // Document reference
    documentId?: string;
    documentType?: string;      // 'invoice', 'voucher', 'payment', etc.
}

// Ledger with Running Balance
export interface LedgerStatementEntry {
    entry: LedgerEntry;
    runningBalance: number;
    runningBalanceType: 'Dr' | 'Cr';
}

export class Ledger {
    constructor(
        public ledgerAccount: LedgerAccount,
        public ledgerEntries: LedgerEntry[] = []
    ) {}

    // Get statement with running balance
    getStatementWithRunningBalance(
        startDate?: Date,
        endDate?: Date
    ): LedgerStatementEntry[] {
        // Filter entries by date range if provided
        let entries = this.ledgerEntries;
        if (startDate && endDate) {
            entries = entries.filter(entry => 
                entry.date >= startDate && entry.date <= endDate
            );
        }

        // Sort by date
        const sortedEntries = [...entries].sort((a, b) => 
            a.date.getTime() - b.date.getTime()
        );

        const statement: LedgerStatementEntry[] = [];
        let runningBalance = 0;
        const currentBalanceType = this.ledgerAccount.balanceType;

        // Start with opening balance (if no date filter or includes opening date)
        if (!startDate || startDate <= this.ledgerAccount.openingDate!) {
            runningBalance = this.ledgerAccount.openingBalance;
        }

        sortedEntries.forEach(entry => {
            // Skip opening balance entry in calculation if we already included it
            if (entry.isOpeningBalance && (!startDate || startDate <= this.ledgerAccount.openingDate!)) {
                statement.push({
                    entry,
                    runningBalance: Math.abs(runningBalance),
                    runningBalanceType: runningBalance >= 0 ? currentBalanceType : 
                                      (currentBalanceType === 'Dr' ? 'Cr' : 'Dr')
                });
                return;
            }

            // Calculate running balance
            if (this.ledgerAccount.balanceType === 'Dr') {
                runningBalance += entry.type === 'Dr' ? entry.amount : -entry.amount;
            } else {
                runningBalance += entry.type === 'Cr' ? entry.amount : -entry.amount;
            }

            // Determine balance type
            const balanceType = runningBalance >= 0 ? this.ledgerAccount.balanceType : 
                              (this.ledgerAccount.balanceType === 'Dr' ? 'Cr' : 'Dr');

            statement.push({
                entry,
                runningBalance: Math.abs(runningBalance),
                runningBalanceType: balanceType
            });
        });

        return statement;
    }

    // Get current balance
    getCurrentBalance(): { balance: number; balanceType: 'Dr' | 'Cr' } {
        let balance = this.ledgerAccount.openingBalance;
        
        this.ledgerEntries.forEach(entry => {
            if (entry.isOpeningBalance) return; // Skip opening balance entry
            
            if (this.ledgerAccount.balanceType === 'Dr') {
                balance += entry.type === 'Dr' ? entry.amount : -entry.amount;
            } else {
                balance += entry.type === 'Cr' ? entry.amount : -entry.amount;
            }
        });
        
        return {
            balance: Math.abs(balance),
            balanceType: balance >= 0 ? this.ledgerAccount.balanceType : 
                        (this.ledgerAccount.balanceType === 'Dr' ? 'Cr' : 'Dr')
        };
    }

    // Add a new entry
    addEntry(entry: LedgerEntry): void {
        this.ledgerEntries.push(entry);
    }

    // Get entries for a specific date range
    getEntriesForDateRange(startDate: Date, endDate: Date): LedgerEntry[] {
        return this.ledgerEntries.filter(entry => 
            entry.date >= startDate && entry.date <= endDate
        );
    }
}

// Utility function to create universal transaction entry
export function createUniversalLedgerEntry(data: UniversalTransactionData): LedgerEntry {
    // Build rich description structure
    const primaryDescription = data.transactionType;
    const secondaryDescription = data.notes || undefined; // User notes go here
    const referenceDescription = data.documentNumber || undefined; // Document reference
    const ledgerReference = data.relatedLedgerName || undefined; // Related ledger name

    return new LedgerEntry(
        data.ledgerAccountId,
        data.date,
        data.amount,
        data.type,
        primaryDescription,
        undefined, // id
        data.documentId,
        data.documentType,
        data.documentNumber,
        secondaryDescription, // This stores user notes
        referenceDescription, // Document reference
        ledgerReference // Related ledger name
    );
}

// Opening balance utility
export function createOpeningBalanceEntry(
    ledgerAccount: LedgerAccount
): LedgerEntry {
    return new LedgerEntry(
        ledgerAccount.id!,
        ledgerAccount.openingDate || new Date(),
        ledgerAccount.openingBalance,
        ledgerAccount.balanceType,
        'Opening Balance',
        undefined, // id
        undefined, // documentId
        'opening_balance', // documentType
        undefined, // documentNumber
        undefined, // secondaryDescription (no notes for opening balance)
        undefined, // referenceDescription
        undefined, // ledgerReference
        true // isOpeningBalance
    );
}