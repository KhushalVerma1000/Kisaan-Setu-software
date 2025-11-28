// @/server/features/ledger/infrastructure/persistence/ledgerReportsSupabase.ts
import { createClient } from "@/utils/supabase/server";
import { LedgerAccount, LedgerEntry, Ledger } from "../../core/entities/Ledger";
import { LedgerGroup } from "../../core/entities/LedgerGroup";
import { getAllLedgerGroups } from "./ledgerGroupSupabase";

// Types for Balance Sheet
export interface BalanceSheetEntry {
    ledger: string;
    amount: string;
    balance: number | string;
}

export interface BalanceSheetSection {
    [groupName: string]: BalanceSheetEntry[];
}

export interface BalanceSheetData {
    assets: BalanceSheetSection;
    liabilities: BalanceSheetSection;
    total_assets: string;
    total_liabilities: string;
    is_balanced: boolean;
}

export interface BalanceSheetResponse {
    status: boolean;
    message: string;
    data: BalanceSheetData;
}

// Helper function to format currency
function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Math.abs(amount));
}

// Enhanced helper function to determine if a group is an asset or liability
// Now considers custom groups by checking their parent group hierarchy
async function determineGroupType(
    groupName: string, 
    allGroups: LedgerGroup[]
): Promise<'asset' | 'liability' | 'income' | 'expense' | 'unknown'> {
    
    // Create a map for quick group lookup
    const groupMap = new Map(allGroups.map(group => [group.group, group]));
    
    // Hardcoded primary group classifications
    const primaryAssetGroups = [
        'Current Assets',
        'Bank Accounts',
        'Cash-in-Hand', 
        'Deposits (Asset)',
        'Loans & Advances (Asset)',
        'Stock-in-Hand',
        'Sundry Debtors',
        'Fixed Assets',
        'Investments',
        'Misc Expenses (Asset)'
    ];
    
    const primaryLiabilityGroups = [
        'Capital Account',
        'Reserves & Surplus',
        'Current Liabilities',
        'Duties & Taxes',
        'Provisions',
        'Sundry Creditors',
        'Loans (Liabilities)',
        'Bank OD A/c',
        'Secured Loans',
        'Unsecured Loans',
        'Suspense A/c'
    ];
    
    const primaryIncomeGroups = [
        'Direct Incomes',
        'Indirect Incomes',
        'Sales',
        'Sales Accounts'
    ];
    
    const primaryExpenseGroups = [
        'Direct Expenses',
        'Indirect Expenses',
        'Purchase Accounts',
        'Expenses'
    ];
    
    // Function to traverse up the parent hierarchy
    function getGroupTypeByHierarchy(currentGroupName: string, visited = new Set()): string {
        // Prevent infinite loops
        if (visited.has(currentGroupName)) {
            return 'unknown';
        }
        visited.add(currentGroupName);
        
        // Check if current group is a primary group
        if (primaryAssetGroups.includes(currentGroupName)) return 'asset';
        if (primaryLiabilityGroups.includes(currentGroupName)) return 'liability';
        if (primaryIncomeGroups.includes(currentGroupName)) return 'income';
        if (primaryExpenseGroups.includes(currentGroupName)) return 'expense';
        
        // If not primary, check parent group
        const currentGroup = groupMap.get(currentGroupName);
        if (currentGroup && currentGroup.parentgroup && currentGroup.parentgroup !== currentGroupName) {
            return getGroupTypeByHierarchy(currentGroup.parentgroup, visited);
        }
        
        return 'unknown';
    }
    
    const groupType = getGroupTypeByHierarchy(groupName);
    return groupType as 'asset' | 'liability' | 'income' | 'expense' | 'unknown';
}

// Helper function to determine if a group is an asset
async function isAssetGroup(groupName: string, allGroups: LedgerGroup[]): Promise<boolean> {
    const groupType = await determineGroupType(groupName, allGroups);
    return groupType === 'asset';
}

// Helper function to determine if a group is a liability
async function isLiabilityGroup(groupName: string, allGroups: LedgerGroup[]): Promise<boolean> {
    const groupType = await determineGroupType(groupName, allGroups);
    return groupType === 'liability';
}

// Helper function to determine if a group is income
async function isIncomeGroup(groupName: string, allGroups: LedgerGroup[]): Promise<boolean> {
    const groupType = await determineGroupType(groupName, allGroups);
    return groupType === 'income';
}

// Helper function to determine if a group is expense
async function isExpenseGroup(groupName: string, allGroups: LedgerGroup[]): Promise<boolean> {
    const groupType = await determineGroupType(groupName, allGroups);
    return groupType === 'expense';
}

// Get ledger balance with proper calculation
async function getLedgerBalance(ledgerAccount: LedgerAccount, entries: LedgerEntry[]): Promise<{
    balance: number;
    balanceType: 'Dr' | 'Cr';
}> {
    const ledger = new Ledger(ledgerAccount, entries);
    return ledger.getCurrentBalance();
}

// Generate Balance Sheet for an FPO with custom group support
export async function generateBalanceSheet(
    fpoId: string,
    asOfDate?: Date
): Promise<BalanceSheetResponse> {
    const supabase = await createClient();
    
    try {
        // Get all ledger groups (including custom ones) for this FPO
        const allGroups = await getAllLedgerGroups(fpoId);
        
        // Get all ledger accounts for the FPO
        const { data: accountsData, error: accountsError } = await supabase
            .from('ledger_account')
            .select('*')
            .eq('fpo_id', fpoId);

        if (accountsError) {
            throw new Error(`Failed to fetch ledger accounts: ${accountsError.message}`);
        }

        if (!accountsData || accountsData.length === 0) {
            return {
                status: false,
                message: "No ledger accounts found for this FPO",
                data: {
                    assets: {},
                    liabilities: {},
                    total_assets: "0.00",
                    total_liabilities: "0.00",
                    is_balanced: true
                }
            };
        }

        // Get all ledger entries for these accounts
        const accountIds = accountsData.map(acc => acc.id);
        let entriesQuery = supabase
            .from('ledger_entry')
            .select('*')
            .in('ledger_account_id', accountIds);

        // Filter by date if provided
        if (asOfDate) {
            entriesQuery = entriesQuery.lte('date', asOfDate.toISOString());
        }

        const { data: entriesData, error: entriesError } = await entriesQuery;

        if (entriesError) {
            throw new Error(`Failed to fetch ledger entries: ${entriesError.message}`);
        }

        // Convert to domain objects
        const ledgerAccounts = accountsData.map(LedgerAccount.fromDbFormat);
        const ledgerEntries = (entriesData || []).map(LedgerEntry.fromDbFormat);

        // Group entries by ledger account
        const entriesByAccount = new Map<string, LedgerEntry[]>();
        ledgerEntries.forEach(entry => {
            if (!entriesByAccount.has(entry.ledgerAccountId)) {
                entriesByAccount.set(entry.ledgerAccountId, []);
            }
            entriesByAccount.get(entry.ledgerAccountId)!.push(entry);
        });

        // Calculate balances and organize by groups
        const assets: BalanceSheetSection = {};
        const liabilities: BalanceSheetSection = {};
        let totalAssets = 0;
        let totalLiabilities = 0;

        for (const account of ledgerAccounts) {
            const entries = entriesByAccount.get(account.id!) || [];
            const { balance, balanceType } = await getLedgerBalance(account, entries);
            
            // Skip accounts with zero balance (optional - you can remove this condition if you want to show all accounts)
            if (balance === 0) {
                continue;
            }

            const balanceSheetEntry: BalanceSheetEntry = {
                ledger: account.name,
                amount: formatCurrency(balance),
                balance: balance
            };

            // Determine the actual balance value for totals
            let actualBalance = balance;
            
            // Use enhanced group classification that considers custom groups
            const isAsset = await isAssetGroup(account.groupName, allGroups);
            const isLiability = await isLiabilityGroup(account.groupName, allGroups);
            
            if (isAsset) {
                // Assets normally have Dr balance
                if (balanceType === 'Cr') {
                    actualBalance = -balance;
                    balanceSheetEntry.balance = -balance;
                }
                
                if (!assets[account.groupName]) {
                    assets[account.groupName] = [];
                }
                assets[account.groupName].push(balanceSheetEntry);
                totalAssets += actualBalance;
            } 
            else if (isLiability) {
                // Liabilities normally have Cr balance
                if (balanceType === 'Dr') {
                    actualBalance = -balance;
                    balanceSheetEntry.balance = -balance;
                }
                
                if (!liabilities[account.groupName]) {
                    liabilities[account.groupName] = [];
                }
                liabilities[account.groupName].push(balanceSheetEntry);
                totalLiabilities += actualBalance;
            }
            // Skip income/expense accounts in balance sheet
        }

        // Sort entries within each group by ledger name
        Object.keys(assets).forEach(groupName => {
            assets[groupName].sort((a, b) => a.ledger.localeCompare(b.ledger));
        });
        
        Object.keys(liabilities).forEach(groupName => {
            liabilities[groupName].sort((a, b) => a.ledger.localeCompare(b.ledger));
        });

        const balanceSheetData: BalanceSheetData = {
            assets,
            liabilities,
            total_assets: formatCurrency(totalAssets),
            total_liabilities: formatCurrency(totalLiabilities),
            is_balanced: Math.abs(totalAssets - totalLiabilities) < 0.01 // Allow for small rounding differences
        };

        return {
            status: true,
            message: "Balance Sheet generated successfully",
            data: balanceSheetData
        };

    } catch (error) {
        console.error('Error generating balance sheet:', error);
        return {
            status: false,
            message: `Failed to generate balance sheet: ${error instanceof Error ? error.message : 'Unknown error'}`,
            data: {
                assets: {},
                liabilities: {},
                total_assets: "0.00",
                total_liabilities: "0.00",
                is_balanced: false
            }
        };
    }
}

// Generate Trial Balance (unchanged as it shows all groups regardless of type)
export interface TrialBalanceEntry {
    ledger: string;
    group: string;
    debit: string;
    credit: string;
    debitAmount: number;
    creditAmount: number;
}

export interface TrialBalanceData {
    entries: TrialBalanceEntry[];
    total_debit: string;
    total_credit: string;
    is_balanced: boolean;
}

export interface TrialBalanceResponse {
    status: boolean;
    message: string;
    data: TrialBalanceData;
}

export async function generateTrialBalance(
    fpoId: string,
    asOfDate?: Date
): Promise<TrialBalanceResponse> {
    const supabase = await createClient();
    
    try {
        // Get all ledger accounts for the FPO
        const { data: accountsData, error: accountsError } = await supabase
            .from('ledger_account')
            .select('*')
            .eq('fpo_id', fpoId);

        if (accountsError) {
            throw new Error(`Failed to fetch ledger accounts: ${accountsError.message}`);
        }

        if (!accountsData || accountsData.length === 0) {
            return {
                status: false,
                message: "No ledger accounts found for this FPO",
                data: {
                    entries: [],
                    total_debit: "0.00",
                    total_credit: "0.00",
                    is_balanced: true
                }
            };
        }

        // Get all ledger entries for these accounts
        const accountIds = accountsData.map(acc => acc.id);
        let entriesQuery = supabase
            .from('ledger_entry')
            .select('*')
            .in('ledger_account_id', accountIds);

        if (asOfDate) {
            entriesQuery = entriesQuery.lte('date', asOfDate.toISOString());
        }

        const { data: entriesData, error: entriesError } = await entriesQuery;

        if (entriesError) {
            throw new Error(`Failed to fetch ledger entries: ${entriesError.message}`);
        }

        // Convert to domain objects
        const ledgerAccounts = accountsData.map(LedgerAccount.fromDbFormat);
        const ledgerEntries = (entriesData || []).map(LedgerEntry.fromDbFormat);

        // Group entries by ledger account
        const entriesByAccount = new Map<string, LedgerEntry[]>();
        ledgerEntries.forEach(entry => {
            if (!entriesByAccount.has(entry.ledgerAccountId)) {
                entriesByAccount.set(entry.ledgerAccountId, []);
            }
            entriesByAccount.get(entry.ledgerAccountId)!.push(entry);
        });

        // Calculate trial balance
        const trialBalanceEntries: TrialBalanceEntry[] = [];
        let totalDebit = 0;
        let totalCredit = 0;

        for (const account of ledgerAccounts) {
            const entries = entriesByAccount.get(account.id!) || [];
            const { balance, balanceType } = await getLedgerBalance(account, entries);
            
            // Skip accounts with zero balance (optional)
            if (balance === 0) {
                continue;
            }

            const trialBalanceEntry: TrialBalanceEntry = {
                ledger: account.name,
                group: account.groupName,
                debit: balanceType === 'Dr' ? formatCurrency(balance) : "0.00",
                credit: balanceType === 'Cr' ? formatCurrency(balance) : "0.00",
                debitAmount: balanceType === 'Dr' ? balance : 0,
                creditAmount: balanceType === 'Cr' ? balance : 0
            };

            trialBalanceEntries.push(trialBalanceEntry);
            
            if (balanceType === 'Dr') {
                totalDebit += balance;
            } else {
                totalCredit += balance;
            }
        }

        // Sort by ledger name
        trialBalanceEntries.sort((a, b) => a.ledger.localeCompare(b.ledger));

        const trialBalanceData: TrialBalanceData = {
            entries: trialBalanceEntries,
            total_debit: formatCurrency(totalDebit),
            total_credit: formatCurrency(totalCredit),
            is_balanced: Math.abs(totalDebit - totalCredit) < 0.01
        };

        return {
            status: true,
            message: "Trial Balance generated successfully",
            data: trialBalanceData
        };

    } catch (error) {
        console.error('Error generating trial balance:', error);
        return {
            status: false,
            message: `Failed to generate trial balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
            data: {
                entries: [],
                total_debit: "0.00",
                total_credit: "0.00",
                is_balanced: false
            }
        };
    }
}

// Generate Profit & Loss Statement with custom group support
export interface ProfitLossEntry {
    ledger: string;
    group: string;
    amount: string;
    balance: number;
}

export interface ProfitLossSection {
    [groupName: string]: ProfitLossEntry[];
}

export interface ProfitLossData {
    income: ProfitLossSection;
    expenses: ProfitLossSection;
    total_income: string;
    total_expenses: string;
    net_profit: string;
    net_loss: string;
}

export interface ProfitLossResponse {
    status: boolean;
    message: string;
    data: ProfitLossData;
}

export async function generateProfitLossStatement(
    fpoId: string,
    fromDate: Date,
    toDate: Date
): Promise<ProfitLossResponse> {
    const supabase = await createClient();
    
    try {
        // Get all ledger groups (including custom ones) for this FPO
        const allGroups = await getAllLedgerGroups(fpoId);
        
        // Get all ledger accounts for the FPO
        const { data: accountsData, error: accountsError } = await supabase
            .from('ledger_account')
            .select('*')
            .eq('fpo_id', fpoId);

        if (accountsError) {
            throw new Error(`Failed to fetch ledger accounts: ${accountsError.message}`);
        }

        if (!accountsData || accountsData.length === 0) {
            return {
                status: false,
                message: "No ledger accounts found for this FPO",
                data: {
                    income: {},
                    expenses: {},
                    total_income: "0.00",
                    total_expenses: "0.00",
                    net_profit: "0.00",
                    net_loss: "0.00"
                }
            };
        }

        // Filter for income and expense accounts using enhanced group classification
        const incomeExpenseAccounts = [];
        for (const acc of accountsData) {
            const isIncome = await isIncomeGroup(acc.group_name, allGroups);
            const isExpense = await isExpenseGroup(acc.group_name, allGroups);
            
            if (isIncome || isExpense) {
                incomeExpenseAccounts.push(acc);
            }
        }

        if (incomeExpenseAccounts.length === 0) {
            return {
                status: true,
                message: "No income or expense accounts found",
                data: {
                    income: {},
                    expenses: {},
                    total_income: "0.00",
                    total_expenses: "0.00",
                    net_profit: "0.00",
                    net_loss: "0.00"
                }
            };
        }

        // Get ledger entries for the period
        const accountIds = incomeExpenseAccounts.map(acc => acc.id);
        const { data: entriesData, error: entriesError } = await supabase
            .from('ledger_entry')
            .select('*')
            .in('ledger_account_id', accountIds)
            .gte('date', fromDate.toISOString())
            .lte('date', toDate.toISOString())
            .eq('is_opening_balance', false); // Exclude opening balance entries

        if (entriesError) {
            throw new Error(`Failed to fetch ledger entries: ${entriesError.message}`);
        }

        // Convert to domain objects
        const ledgerAccounts = incomeExpenseAccounts.map(LedgerAccount.fromDbFormat);
        const ledgerEntries = (entriesData || []).map(LedgerEntry.fromDbFormat);

        // Group entries by ledger account
        const entriesByAccount = new Map<string, LedgerEntry[]>();
        ledgerEntries.forEach(entry => {
            if (!entriesByAccount.has(entry.ledgerAccountId)) {
                entriesByAccount.set(entry.ledgerAccountId, []);
            }
            entriesByAccount.get(entry.ledgerAccountId)!.push(entry);
        });

        // Organize by income and expenses
        const income: ProfitLossSection = {};
        const expenses: ProfitLossSection = {};
        let totalIncome = 0;
        let totalExpenses = 0;

        for (const account of ledgerAccounts) {
            const entries = entriesByAccount.get(account.id!) || [];
            
            // Calculate period balance (not cumulative)
            let periodBalance = 0;
            entries.forEach(entry => {
                if (entry.type === 'Dr') {
                    periodBalance += entry.amount;
                } else {
                    periodBalance -= entry.amount;
                }
            });

            // Skip accounts with zero activity in the period
            if (periodBalance === 0) {
                continue;
            }

            const profitLossEntry: ProfitLossEntry = {
                ledger: account.name,
                group: account.groupName,
                amount: formatCurrency(Math.abs(periodBalance)),
                balance: Math.abs(periodBalance)
            };

            // Use enhanced group classification
            const isIncome = await isIncomeGroup(account.groupName, allGroups);
            
            if (isIncome) {
                if (!income[account.groupName]) {
                    income[account.groupName] = [];
                }
                income[account.groupName].push(profitLossEntry);
                totalIncome += Math.abs(periodBalance);
            } else {
                if (!expenses[account.groupName]) {
                    expenses[account.groupName] = [];
                }
                expenses[account.groupName].push(profitLossEntry);
                totalExpenses += Math.abs(periodBalance);
            }
        }

        // Sort entries within each group
        Object.keys(income).forEach(groupName => {
            income[groupName].sort((a, b) => a.ledger.localeCompare(b.ledger));
        });
        
        Object.keys(expenses).forEach(groupName => {
            expenses[groupName].sort((a, b) => a.ledger.localeCompare(b.ledger));
        });

        const netAmount = totalIncome - totalExpenses;
        const profitLossData: ProfitLossData = {
            income,
            expenses,
            total_income: formatCurrency(totalIncome),
            total_expenses: formatCurrency(totalExpenses),
            net_profit: netAmount > 0 ? formatCurrency(netAmount) : "0.00",
            net_loss: netAmount < 0 ? formatCurrency(Math.abs(netAmount)) : "0.00"
        };

        return {
            status: true,
            message: "Profit & Loss Statement generated successfully",
            data: profitLossData
        };

    } catch (error) {
        console.error('Error generating P&L statement:', error);
        return {
            status: false,
            message: `Failed to generate P&L statement: ${error instanceof Error ? error.message : 'Unknown error'}`,
            data: {
                income: {},
                expenses: {},
                total_income: "0.00",
                total_expenses: "0.00",
                net_profit: "0.00",
                net_loss: "0.00"
            }
        };
    }
}

// Export all report generation functions
export {
    formatCurrency,
    determineGroupType,
    isAssetGroup,
    isLiabilityGroup,
    isIncomeGroup,
    isExpenseGroup,
    getLedgerBalance
};