interface bankDetails{
    accountNumber: string;
    accountHolderName?: string;
    ifscCode: string;
    BankName?: string;
    accountType: 'Regular' | 'OD' | 'CC';
    upiId?: string; 
}

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
    state: string; 
    bankDetails?: bankDetails;

     isSystemLedger?: boolean;
    ledgerCode?: string | null;
}

export class LedgerAccount implements LedgerAccountInterface {
    constructor(
        public name: string,
        public groupName: string,
        public openingBalance: number,
        public balanceType: 'Dr' | 'Cr',
        public state: string,
        public id?: string,
        public phoneNumber?: string,
        public address?: string,
        public fpoId?: string,
        public gstNumber?: string,
        public openingDate?: Date,
        public bankDetails?: bankDetails,
        public isSystemLedger: boolean = false, 
        public ledgerCode?: string | null  
    ) {
        // Validate bankDetails is only set for Bank Accounts group
        if (bankDetails && groupName !== 'Bank Accounts') {
            throw new Error('bankDetails can only be set for ledgers in "Bank Accounts" group');
        }

           // Validate system ledgers have codes
        if (isSystemLedger && !ledgerCode) {
            throw new Error('System ledgers must have a ledger_code');
        }
    }

    // Method to validate and set bank details
    setBankDetails(bankDetails: bankDetails): void {
        if (this.groupName !== 'Bank Accounts') {
            throw new Error('bankDetails can only be set for ledgers in "Bank Accounts" group');
        }
        this.bankDetails = bankDetails;
    }

    // Method to check if ledger is a bank account
    isBankAccount(): boolean {
        return this.groupName === 'Bank Accounts';
    }

    // Method to convert to database format
    toDbFormat(): any {
        const dbFormat: any = {
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
            state: this.state,
             is_system_ledger: this.isSystemLedger, 
            ledger_code: this.ledgerCode  
        };

        // Only include bank_details if it's a Bank Account (JSONB field, no conversion needed)
        if (this.groupName === 'Bank Accounts' && this.bankDetails) {
            dbFormat.bank_details = this.bankDetails;
        }

        return dbFormat;
    }

    static fromInterface(ledgerAccountData: LedgerAccountInterface): LedgerAccount {
        // Validate bankDetails before creating instance
        if (ledgerAccountData.bankDetails && ledgerAccountData.groupName !== 'Bank Accounts') {
            throw new Error('bankDetails can only be set for ledgers in "Bank Accounts" group');
        }

        return new LedgerAccount(
            ledgerAccountData.name,
            ledgerAccountData.groupName,
            ledgerAccountData.openingBalance,
            ledgerAccountData.balanceType,
            ledgerAccountData.state,
            ledgerAccountData.id,
            ledgerAccountData.phoneNumber,
            ledgerAccountData.address,
            ledgerAccountData.fpoId,
            ledgerAccountData.gstNumber,
            ledgerAccountData.openingDate,
            ledgerAccountData.bankDetails,
               ledgerAccountData.isSystemLedger || false, 
            ledgerAccountData.ledgerCode || null  
        );
    }

    // Static method to create from database format
    static fromDbFormat(dbRow: any): LedgerAccount {
        let bankDetails: bankDetails | undefined = undefined;

        // Only parse bank_details if it's a Bank Account (JSONB field, already an object)
        if (dbRow.group_name === 'Bank Accounts' && dbRow.bank_details) {
            bankDetails = dbRow.bank_details;
        }

        return new LedgerAccount(
            dbRow.name,
            dbRow.group_name,
            dbRow.opening_balance,
            dbRow.balance_type,
            dbRow.state,
            dbRow.id,
            dbRow.phone_number,
            dbRow.address,
            dbRow.fpo_id,
            dbRow.gst_number,
            dbRow.opening_date ? new Date(dbRow.opening_date) : undefined,
            bankDetails,
            dbRow.is_system_ledger || false, 
            dbRow.ledger_code || null  
        );
    }

      // NEW METHOD: Check if this is a system ledger
    isSystem(): boolean {
        return this.isSystemLedger === true;
    }

    // NEW METHOD: Check if this ledger can be deleted
    canDelete(): boolean {
        return !this.isSystemLedger;
    }

    // NEW METHOD: Check if this ledger can be renamed
    canRename(): boolean {
        // System ledgers can be renamed by users if needed
        // But the code remains constant for application logic
        return true;
    }
    // Helper method to get bank details summary
    getBankDetailsSummary(): string | null {
        if (!this.isBankAccount() || !this.bankDetails) {
            return null;
        }

        return `${this.bankDetails.BankName || 'Bank'} - ${this.bankDetails.accountNumber} (${this.bankDetails.accountType})`;
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
    documentId?: string;
    documentType?: string;
    documentNumber?: string;
    
    // Rich Description System
    primaryDescription: string;
    secondaryDescription?: string;
    referenceDescription?: string;
    ledgerReference?: string;
    
    // Additional Metadata
    isOpeningBalance?: boolean;
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

    // Get formatted description
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
    ledgerAccountId: string;
    amount: number;
    type: 'Dr' | 'Cr';
    date: Date;
    transactionType: string;
    relatedLedgerName?: string;
    documentNumber?: string;
    notes?: string;
    documentId?: string;
    documentType?: string;
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
        let entries = this.ledgerEntries;
        if (startDate && endDate) {
            entries = entries.filter(entry => 
                entry.date >= startDate && entry.date <= endDate
            );
        }

        const sortedEntries = [...entries].sort((a, b) => 
            a.date.getTime() - b.date.getTime()
        );

        const statement: LedgerStatementEntry[] = [];
        let runningBalance = 0;
        const currentBalanceType = this.ledgerAccount.balanceType;

        if (!startDate || startDate <= this.ledgerAccount.openingDate!) {
            runningBalance = this.ledgerAccount.openingBalance;
        }

        sortedEntries.forEach(entry => {
            if (entry.isOpeningBalance && (!startDate || startDate <= this.ledgerAccount.openingDate!)) {
                statement.push({
                    entry,
                    runningBalance: Math.abs(runningBalance),
                    runningBalanceType: runningBalance >= 0 ? currentBalanceType : 
                                      (currentBalanceType === 'Dr' ? 'Cr' : 'Dr')
                });
                return;
            }

            if (this.ledgerAccount.balanceType === 'Dr') {
                runningBalance += entry.type === 'Dr' ? entry.amount : -entry.amount;
            } else {
                runningBalance += entry.type === 'Cr' ? entry.amount : -entry.amount;
            }

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
            if (entry.isOpeningBalance) return;
            
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
    const primaryDescription = data.transactionType;
    const secondaryDescription = data.notes || undefined;
    const referenceDescription = data.documentNumber || undefined;
    const ledgerReference = data.relatedLedgerName || undefined;

    return new LedgerEntry(
        data.ledgerAccountId,
        data.date,
        data.amount,
        data.type,
        primaryDescription,
        undefined,
        data.documentId,
        data.documentType,
        data.documentNumber,
        secondaryDescription,
        referenceDescription,
        ledgerReference
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
        undefined,
        undefined,
        'opening_balance',
        undefined,
        undefined,
        undefined,
        undefined,
        true
    );
}