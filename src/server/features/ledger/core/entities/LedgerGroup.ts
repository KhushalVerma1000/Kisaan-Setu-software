export interface LedgerGroupInterface {

    group: string;
    parentgroup?: string;
    id?: string;
    fpoId?: string;
    isDefault?: boolean;
}

export class LedgerGroup implements LedgerGroupInterface {
    constructor(
        public group: string,
        public parentgroup?: string,
        public id?: string,
        public fpoId?: string,
        public isDefault: boolean = false
    ) { }

    // Static method to create default ledger groups
    static defaultLedgerGroups(): LedgerGroup[] {
        return [
            new LedgerGroup('Current Assets', undefined, undefined, undefined, true),
            new LedgerGroup('Bank Accounts', 'Current Assets', undefined, undefined, true),
            new LedgerGroup('Cash-in-Hand', 'Current Assets', undefined, undefined, true),
            new LedgerGroup('Deposits (Asset)', 'Current Assets', undefined, undefined, true),
            new LedgerGroup('Loans & Advances (Asset)', 'Current Assets', undefined, undefined, true),
            new LedgerGroup('Stock-in-Hand', 'Current Assets', undefined, undefined, true),
            new LedgerGroup('Sundry Debtors', 'Current Assets', undefined, undefined, true),
            new LedgerGroup('Fixed Assets', undefined, undefined, undefined, true),
            new LedgerGroup('Investments', undefined, undefined, undefined, true),
            new LedgerGroup('Misc Expenses (Asset)', undefined, undefined, undefined, true),
            new LedgerGroup('Capital Account', undefined, undefined, undefined, true),
            new LedgerGroup('Reserves & Surplus', 'Capital Account', undefined, undefined, true),
            new LedgerGroup('Current Liabilities', undefined, undefined, undefined, true),
            new LedgerGroup('Duties & Taxes', 'Current Liabilities', undefined, undefined, true),
            new LedgerGroup('Provisions', 'Current Liabilities', undefined, undefined, true),
            new LedgerGroup('Sundry Creditors', 'Current Liabilities', undefined, undefined, true),
            new LedgerGroup('Loans (Liabilities)', undefined, undefined, undefined, true),
            new LedgerGroup('Bank OD A/c', 'Loans (Liabilities)', undefined, undefined, true),
            new LedgerGroup('Secured Loans', 'Loans (Liabilities)', undefined, undefined, true),
            new LedgerGroup('Unsecured Loans', 'Loans (Liabilities)', undefined, undefined, true),
            new LedgerGroup('Suspense A/c', undefined, undefined, undefined, true),
            new LedgerGroup('Direct Expenses', undefined, undefined, undefined, true),
            new LedgerGroup('Indirect Expenses', undefined, undefined, undefined, true),
            new LedgerGroup('Purchase Accounts', undefined, undefined, undefined, true),
            new LedgerGroup('Direct Income', undefined, undefined, undefined, true),
            new LedgerGroup('Indirect Income', undefined, undefined, undefined, true),
            new LedgerGroup('Sales Accounts', undefined, undefined, undefined, true)
        ];
    }

    // Method to convert to database format
    toDbFormat(): any {
        return {
            id: this.id,
            group_name: this.group,
            parent_group: this.parentgroup,
            fpo_id: this.fpoId,
            is_default: this.isDefault
        };
    }

    // Static method to create from database format
    static fromDbFormat(dbRow: any): LedgerGroup {
        return new LedgerGroup(
            dbRow.group_name,
            dbRow.parent_group,
            dbRow.id,
            dbRow.fpo_id,
            dbRow.is_default
        );
    }

    // Method to get all child groups
    getChildGroups(allGroups: LedgerGroup[]): LedgerGroup[] {
        return allGroups.filter(group => group.parentgroup === this.group);
    }

    // Method to get the full hierarchy path
    getHierarchyPath(allGroups: LedgerGroup[]): string[] {
        const path = [this.group];
        let currentGroup: LedgerGroup = this;

        while (currentGroup.parentgroup) {
            const parentGroup = allGroups.find(g => g.group === currentGroup.parentgroup);
            if (parentGroup) {
                path.unshift(parentGroup.group);
                currentGroup = parentGroup;
            } else {
                break;
            }
        }

        return path;
    }

    // Method to check if group is a root group (no parent)
    isRootGroup(): boolean {
        return !this.parentgroup;
    }

    // Method to check if group has children
    hasChildren(allGroups: LedgerGroup[]): boolean {
        return allGroups.some(group => group.parentgroup === this.group);
    }
}