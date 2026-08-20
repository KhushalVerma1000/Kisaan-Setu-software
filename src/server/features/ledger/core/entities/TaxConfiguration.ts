// @/server/features/ledger/core/entities/TaxConfiguration.ts
//
// The third configuration block, alongside Party and the existing
// bank-account structure — attaches to system ledgers in the "Duties &
// Taxes" group (GST Output/Input CGST/SGST/IGST, TDS, TCS) instead of
// leaving "which ledger is my CGST-output account" as an implicit
// convention baked into a ledger_code string.
//
// This is what SYSTEM_LEDGER_CODES + systemLedgerService.ts were clearly
// building toward (getGSTOutputLedgers, getGSTInputLedgers) but never
// finished wiring up — createSalesInvoiceEntry posts a single Dr entry to
// the customer and nothing else; there's no GST leg at all yet. This
// entity is the structural piece that was missing to make that lookup a
// real, constraint-enforced domain query instead of string matching.

export type TaxType = 'CGST' | 'SGST' | 'IGST' | 'CESS' | 'TDS' | 'TCS';

// output/input = GST (collected on sales / paid on purchases, claimable back)
// payable/receivable = TDS/TCS (owed to government / deducted by others on your income)
export type TaxDirection = 'output' | 'input' | 'payable' | 'receivable';

const VALID_DIRECTIONS_BY_TYPE: Record<TaxType, TaxDirection[]> = {
    CGST: ['output', 'input'],
    SGST: ['output', 'input'],
    IGST: ['output', 'input'],
    CESS: ['output', 'input'],
    TDS: ['payable', 'receivable'],
    TCS: ['payable', 'receivable'],
};

export interface TaxConfigurationProps {
    id?: string;
    ledgerAccountId: string;
    taxType: TaxType;
    direction: TaxDirection;
    rate?: number;
    fpoId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export class TaxConfiguration {
    readonly id?: string;
    readonly ledgerAccountId: string;
    readonly taxType: TaxType;
    readonly direction: TaxDirection;
    readonly rate?: number;
    readonly fpoId?: string;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;

    constructor(props: TaxConfigurationProps) {
        const validDirections = VALID_DIRECTIONS_BY_TYPE[props.taxType];
        if (!validDirections.includes(props.direction)) {
            throw new Error(
                `Invalid direction "${props.direction}" for tax type ${props.taxType} — must be one of: ${validDirections.join(', ')}`
            );
        }

        if (props.rate !== undefined && (props.rate < 0 || props.rate > 100)) {
            throw new Error(`Tax rate must be between 0 and 100, got ${props.rate}`);
        }

        this.id = props.id;
        this.ledgerAccountId = props.ledgerAccountId;
        this.taxType = props.taxType;
        this.direction = props.direction;
        this.rate = props.rate;
        this.fpoId = props.fpoId;
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
    }

    isGst(): boolean {
        return this.taxType === 'CGST' || this.taxType === 'SGST' || this.taxType === 'IGST' || this.taxType === 'CESS';
    }

    isLiability(): boolean {
        return this.direction === 'output' || this.direction === 'payable';
    }
}