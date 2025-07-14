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

export interface LedgerEntryInterface {
    id?: string;
    ledgerAccountId: string;
    date: Date;
    amount: number;
    type: 'Dr' | 'Cr';
    description?: string;
}

export class LedgerEntry implements LedgerEntryInterface {
    constructor(
        public ledgerAccountId: string,
        public date: Date,
        public amount: number,
        public type: 'Dr' | 'Cr',
        public id?: string,
        public description?: string
    ) {}

    // Method to convert to database format
    toDbFormat(): any {
        return {
            id: this.id,
            ledger_account_id: this.ledgerAccountId,
            date: this.date,
            amount: this.amount,
            type: this.type,
            description: this.description
        };
    }

    // Static method to create from database format
    static fromDbFormat(dbRow: any): LedgerEntry {
        return new LedgerEntry(
            dbRow.ledger_account_id,
            dbRow.date,
            dbRow.amount,
            dbRow.type,
            dbRow.id,
            dbRow.description
        );
    }
}

// Enhanced Ledger class
export class Ledger {
    constructor(
        public ledgerAccount: LedgerAccount,
        public ledgerEntries: LedgerEntry[] = []
    ) {}

    // Calculate current balance
    getCurrentBalance(): number {
        let balance = this.ledgerAccount.openingBalance;
        
        this.ledgerEntries.forEach(entry => {
            if (this.ledgerAccount.balanceType === 'Dr') {
                balance += entry.type === 'Dr' ? entry.amount : -entry.amount;
            } else {
                balance += entry.type === 'Cr' ? entry.amount : -entry.amount;
            }
        });
        
        return balance;
    }

    // Get balance type (Dr/Cr) for current balance
    getCurrentBalanceType(): 'Dr' | 'Cr' {
        const currentBalance = this.getCurrentBalance();
        return currentBalance >= 0 ? this.ledgerAccount.balanceType : 
               (this.ledgerAccount.balanceType === 'Dr' ? 'Cr' : 'Dr');
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