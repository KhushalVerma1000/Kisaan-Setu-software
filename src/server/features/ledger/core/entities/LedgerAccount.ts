// @/server/features/ledger/core/entities/LedgerAccount.ts
//
// Pure domain entity — chart-of-accounts concept only. No party master
// data (that's Party.ts now) and no toDbFormat/fromDbFormat: mapping to
// and from the database shape lives in the infrastructure layer
// (PrismaLedgerAccountRepository), not on the entity. The entity doesn't
// need to know Prisma or Postgres exist.

export interface BankDetails {
    accountNumber: string;
    accountHolderName?: string;
    ifscCode: string;
    bankName?: string;
    accountType: 'Regular' | 'OD' | 'CC';
    upiId?: string;
}

export interface LedgerAccountProps {
    id?: string;
    name: string;
    groupName: string;
    openingBalance: number;
    balanceType: 'Dr' | 'Cr';
    fpoId?: string;
    bankDetails?: BankDetails;
    isSystemLedger?: boolean;
    ledgerCode?: string | null;
}

export class LedgerAccount {
    readonly id?: string;
    readonly name: string;
    readonly groupName: string;
    readonly openingBalance: number;
    readonly balanceType: 'Dr' | 'Cr';
    readonly fpoId?: string;
    readonly bankDetails?: BankDetails;
    readonly isSystemLedger: boolean;
    readonly ledgerCode?: string | null;

    constructor(props: LedgerAccountProps) {
        // bankDetails staying here (not moving to Party) is deliberate —
        // it's tied to group_name === 'Bank Accounts', the FPO's own bank
        // accounts, not a customer/vendor/farmer's payout details. See
        // SCHEMA_CHANGES.md for the full reasoning.
        if (props.bankDetails && props.groupName !== 'Bank Accounts') {
            throw new Error('bankDetails can only be set for ledgers in "Bank Accounts" group');
        }

        if (props.isSystemLedger && !props.ledgerCode) {
            throw new Error('System ledgers must have a ledger_code');
        }

        this.id = props.id;
        this.name = props.name;
        this.groupName = props.groupName;
        this.openingBalance = props.openingBalance;
        this.balanceType = props.balanceType;
        this.fpoId = props.fpoId;
        this.bankDetails = props.bankDetails;
        this.isSystemLedger = props.isSystemLedger ?? false;
        this.ledgerCode = props.ledgerCode ?? null;
    }

    isBankAccount(): boolean {
        return this.groupName === 'Bank Accounts';
    }

    isSystem(): boolean {
        return this.isSystemLedger === true;
    }

    canDelete(): boolean {
        return !this.isSystemLedger;
    }

    canRename(): boolean {
        // System ledgers can be renamed by users if needed; the code
        // itself (ledgerCode) is what stays constant for application logic.
        return true;
    }

    getBankDetailsSummary(): string | null {
        if (!this.isBankAccount() || !this.bankDetails) {
            return null;
        }

        return `${this.bankDetails.bankName || 'Bank'} - ${this.bankDetails.accountNumber} (${this.bankDetails.accountType})`;
    }

    /** Returns a new LedgerAccount with bankDetails set — entities are treated as immutable here, not mutated in place. */
    withBankDetails(bankDetails: BankDetails): LedgerAccount {
        if (this.groupName !== 'Bank Accounts') {
            throw new Error('bankDetails can only be set for ledgers in "Bank Accounts" group');
        }
        return new LedgerAccount({ ...this, bankDetails });
    }
}