// @/server/features/ledger/core/entities/Ledger.ts
//
// LedgerAccount used to live in this file as a single fat class carrying
// both chart-of-accounts fields and party master data (phone, address,
// GSTIN, state, opening date). It's been split — LedgerAccount now lives
// in ./LedgerAccount.ts (chart-of-accounts only), and the party-shaped
// fields moved to ./Party.ts. This file re-imports the slim LedgerAccount
// rather than redefining it.
//
// One real consequence of that split shows up below: openingDate used to
// be read directly off ledgerAccount.openingDate inside the Ledger class
// and createOpeningBalanceEntry. It's Party data now (system ledgers like
// Cash never had a "customer since" date to begin with — only actual
// parties did), so both now take it as an explicit parameter instead of
// reaching into ledgerAccount for it. Callers resolve it from
// party.openingDate when a party exists, or omit it for system ledgers.

import { LedgerAccount } from "./LedgerAccount";

export { LedgerAccount } from "./LedgerAccount";
export type { LedgerAccountProps, BankDetails } from "./LedgerAccount";

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
        public ledgerEntries: LedgerEntry[] = [],
        // Was ledgerAccount.openingDate before the Party split — that
        // field lives on Party now (only actual parties have an "opening
        // date"; system ledgers like Cash never did). Resolve it from
        // party.openingDate at the call site, or omit for system ledgers.
        public openingDate?: Date
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

        if (!startDate || (this.openingDate && startDate <= this.openingDate)) {
            runningBalance = this.ledgerAccount.openingBalance;
        }

        sortedEntries.forEach(entry => {
            if (entry.isOpeningBalance && (!startDate || (this.openingDate && startDate <= this.openingDate))) {
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

// Opening balance utility — openingDate is now an explicit parameter
// (used to be ledgerAccount.openingDate; that field moved to Party).
// Defaults to "today" for system ledgers, which never have a Party and
// therefore never have an opening date to resolve.
export function createOpeningBalanceEntry(
    ledgerAccount: LedgerAccount,
    openingDate?: Date
): LedgerEntry {
    return new LedgerEntry(
        ledgerAccount.id!,
        openingDate || new Date(),
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