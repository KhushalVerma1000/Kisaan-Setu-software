// @/server/features/vouchers/application/services/voucherService.ts

import {
    createVoucher,
    updateVoucher,
    deleteVoucher,
    getVoucherById,
    getVoucherByNumber,
    getVouchersByFpo,
    generateVoucherNumber,
    validateVoucherBalance,
    createReversalVoucher,
    CreateVoucherParams,
    VoucherOperationResult,
    VoucherWithEntries
} from "@/server/features/vouchers/infrastructure/persistence/VoucherPrisma";
import {
    VoucherLineItem,
    PaymentVoucher,
    ReceiptVoucher,
    ContraVoucher,
    JournalVoucher
} from "@/server/features/vouchers/core/entities/VoucherSystem";
import { getLedgerAccountById } from "@/server/features/ledger/infrastructure/persistence/ledgerAccountSupabase";

// ============================================================================
// HELPER FUNCTION TO BUILD LEDGER REFERENCE
// ============================================================================

/**
 * Build ledger reference string for voucher entries
 * For payment/receipt: shows the contra account(s)
 * For contra: shows the transfer accounts
 * For journal: shows related accounts
 */
async function buildLedgerReference(
    lineItems: VoucherLineItem[],
    currentItemIndex: number,
    voucherType: 'payment' | 'receipt' | 'contra' | 'journal'
): Promise<string> {
    const currentItem = lineItems[currentItemIndex];
    
    // Get related entries (opposite type for most vouchers)
    const relatedEntries = lineItems.filter((item, idx) => {
        if (idx === currentItemIndex) return false;
        
        if (voucherType === 'payment' || voucherType === 'receipt' || voucherType === 'contra') {
            // For these vouchers, reference the opposite type
            return item.type !== currentItem.type;
        } else {
            // For journal vouchers, reference all other entries
            return true;
        }
    });

    if (relatedEntries.length === 0) {
        return currentItem.ledgerAccountName || 'Unknown';
    }

    // If single related entry, return its name
    if (relatedEntries.length === 1) {
        return relatedEntries[0].ledgerAccountName || 'Unknown';
    }

    // If multiple related entries, return them as comma-separated or "Multiple Accounts"
    if (relatedEntries.length <= 3) {
        return relatedEntries
            .map(item => item.ledgerAccountName)
            .filter(Boolean)
            .join(', ');
    }

    return `Multiple Accounts (${relatedEntries.length})`;
}

// ============================================================================
// MULTI-ENTRY VOUCHER CREATION WITH LEDGER REFERENCES
// ============================================================================

/**
 * Create a payment voucher with multiple entries (full flexibility)
 * At least one credit entry must be to a Cash or Bank account
 */
export async function createPaymentVoucher(params: {
    fpoId: string;
    date: Date;
    description: string;
    notes?: string;
    lineItems: VoucherLineItem[];
    createdBy?: string;
}): Promise<VoucherOperationResult> {
    try {
        // Verify all ledger accounts exist and enhance line items
        const ledgerIds = params.lineItems.map(item => item.ledgerAccountId);
        const ledgerAccounts = await Promise.all(
            ledgerIds.map(id => getLedgerAccountById(id))
        );

        // Check if any account is missing
        const missingAccounts = ledgerAccounts.filter(acc => !acc);
        if (missingAccounts.length > 0) {
            throw new Error('One or more ledger accounts not found');
        }

        // Add ledger names to line items
        const enhancedLineItems: VoucherLineItem[] = params.lineItems.map((item, index) => ({
            ...item,
            ledgerAccountName: ledgerAccounts[index]!.name
        }));

        // Validate that at least one credit is to cash/bank
        const creditItems = enhancedLineItems.filter(item => item.type === 'Cr');
        const validGroups = ['Cash-in-Hand', 'Bank Accounts', 'Bank OD/CC A/c'];
        
        let hasCashOrBankCredit = false;
        for (const item of creditItems) {
            const account = await getLedgerAccountById(item.ledgerAccountId);
            if (account && validGroups.includes(account.groupName)) {
                hasCashOrBankCredit = true;
                break;
            }
        }

        if (!hasCashOrBankCredit) {
            throw new Error('At least one credit entry must be to a Cash or Bank account');
        }

        // Validate balance
        const totalDebits = enhancedLineItems
            .filter(item => item.type === 'Dr')
            .reduce((sum, item) => sum + item.amount, 0);
        
        const totalCredits = enhancedLineItems
            .filter(item => item.type === 'Cr')
            .reduce((sum, item) => sum + item.amount, 0);

        if (Math.abs(totalDebits - totalCredits) > 0.01) {
            throw new Error(`Payment entries must be balanced. Debits: ₹${totalDebits}, Credits: ₹${totalCredits}`);
        }

        // Build ledger references for each line item
        const lineItemsWithReferences = await Promise.all(
            enhancedLineItems.map(async (item, index) => ({
                ...item,
                ledgerReference: await buildLedgerReference(enhancedLineItems, index, 'payment')
            }))
        );

        // Generate voucher number
        const voucherNumber = await generateVoucherNumber('payment', params.date, params.fpoId);

        // Create voucher with enhanced line items
        return await createVoucher({
            voucherNumber,
            voucherType: 'payment',
            date: params.date,
            fpoId: params.fpoId,
            description: params.description,
            notes: params.notes,
            lineItems: lineItemsWithReferences,
            createdBy: params.createdBy
        });
    } catch (error) {
        console.error('Error creating payment voucher:', error);
        throw error;
    }
}

/**
 * Create a receipt voucher with multiple entries (full flexibility)
 * At least one debit entry must be to a Cash or Bank account
 */
export async function createReceiptVoucher(params: {
    fpoId: string;
    date: Date;
    description: string;
    notes?: string;
    lineItems: VoucherLineItem[];
    createdBy?: string;
}): Promise<VoucherOperationResult> {
    try {
        // Verify all ledger accounts exist and enhance line items
        const ledgerIds = params.lineItems.map(item => item.ledgerAccountId);
        const ledgerAccounts = await Promise.all(
            ledgerIds.map(id => getLedgerAccountById(id))
        );

        // Check if any account is missing
        const missingAccounts = ledgerAccounts.filter(acc => !acc);
        if (missingAccounts.length > 0) {
            throw new Error('One or more ledger accounts not found');
        }

        // Add ledger names to line items
        const enhancedLineItems: VoucherLineItem[] = params.lineItems.map((item, index) => ({
            ...item,
            ledgerAccountName: ledgerAccounts[index]!.name
        }));

        // Validate that at least one debit is to cash/bank
        const debitItems = enhancedLineItems.filter(item => item.type === 'Dr');
        const validGroups = ['Cash-in-Hand', 'Bank Accounts', 'Bank OD/CC A/c'];
        
        let hasCashOrBankDebit = false;
        for (const item of debitItems) {
            const account = await getLedgerAccountById(item.ledgerAccountId);
            if (account && validGroups.includes(account.groupName)) {
                hasCashOrBankDebit = true;
                break;
            }
        }

        if (!hasCashOrBankDebit) {
            throw new Error('At least one debit entry must be to a Cash or Bank account');
        }

        // Validate balance
        const totalDebits = enhancedLineItems
            .filter(item => item.type === 'Dr')
            .reduce((sum, item) => sum + item.amount, 0);
        
        const totalCredits = enhancedLineItems
            .filter(item => item.type === 'Cr')
            .reduce((sum, item) => sum + item.amount, 0);

        if (Math.abs(totalDebits - totalCredits) > 0.01) {
            throw new Error(`Receipt entries must be balanced. Debits: ₹${totalDebits}, Credits: ₹${totalCredits}`);
        }

        // Build ledger references for each line item
        const lineItemsWithReferences = await Promise.all(
            enhancedLineItems.map(async (item, index) => ({
                ...item,
                ledgerReference: await buildLedgerReference(enhancedLineItems, index, 'receipt')
            }))
        );

        // Generate voucher number
        const voucherNumber = await generateVoucherNumber('receipt', params.date, params.fpoId);

        // Create voucher
        return await createVoucher({
            voucherNumber,
            voucherType: 'receipt',
            date: params.date,
            fpoId: params.fpoId,
            description: params.description,
            notes: params.notes,
            lineItems: lineItemsWithReferences,
            createdBy: params.createdBy
        });
    } catch (error) {
        console.error('Error creating receipt voucher:', error);
        throw error;
    }
}

/**
 * Create a contra voucher with multiple entries (full flexibility)
 * All entries must be Cash or Bank accounts
 */
export async function createContraVoucher(params: {
    fpoId: string;
    date: Date;
    description: string;
    notes?: string;
    lineItems: VoucherLineItem[];
    createdBy?: string;
}): Promise<VoucherOperationResult> {
    try {
        // Verify all ledger accounts exist and enhance line items
        const ledgerIds = params.lineItems.map(item => item.ledgerAccountId);
        const ledgerAccounts = await Promise.all(
            ledgerIds.map(id => getLedgerAccountById(id))
        );

        // Check if any account is missing
        const missingAccounts = ledgerAccounts.filter(acc => !acc);
        if (missingAccounts.length > 0) {
            throw new Error('One or more ledger accounts not found');
        }

        // Add ledger names to line items
        const enhancedLineItems: VoucherLineItem[] = params.lineItems.map((item, index) => ({
            ...item,
            ledgerAccountName: ledgerAccounts[index]!.name
        }));

        // Verify all are cash/bank accounts
        const validGroups = ['Cash-in-Hand', 'Bank Accounts', 'Bank OD/CC A/c'];
        
        for (const item of enhancedLineItems) {
            const account = await getLedgerAccountById(item.ledgerAccountId);
            if (!account || !validGroups.includes(account.groupName)) {
                throw new Error('All contra voucher entries must be Cash or Bank accounts');
            }
        }

        // Validate balance
        const totalDebits = enhancedLineItems
            .filter(item => item.type === 'Dr')
            .reduce((sum, item) => sum + item.amount, 0);
        
        const totalCredits = enhancedLineItems
            .filter(item => item.type === 'Cr')
            .reduce((sum, item) => sum + item.amount, 0);

        if (Math.abs(totalDebits - totalCredits) > 0.01) {
            throw new Error(`Contra entries must be balanced. Debits: ₹${totalDebits}, Credits: ₹${totalCredits}`);
        }

        // Must have at least one debit and one credit
        if (totalDebits === 0 || totalCredits === 0) {
            throw new Error('Contra voucher must have at least one debit and one credit entry');
        }

        // Build ledger references for each line item
        const lineItemsWithReferences = await Promise.all(
            enhancedLineItems.map(async (item, index) => ({
                ...item,
                ledgerReference: await buildLedgerReference(enhancedLineItems, index, 'contra')
            }))
        );

        // Generate voucher number
        const voucherNumber = await generateVoucherNumber('contra', params.date, params.fpoId);

        // Create voucher
        return await createVoucher({
            voucherNumber,
            voucherType: 'contra',
            date: params.date,
            fpoId: params.fpoId,
            description: params.description,
            notes: params.notes,
            lineItems: lineItemsWithReferences,
            createdBy: params.createdBy
        });
    } catch (error) {
        console.error('Error creating contra voucher:', error);
        throw error;
    }
}

/**
 * Create a journal voucher with multiple entries (full flexibility)
 * No restrictions on account types
 */
export async function createJournalVoucher(params: {
    fpoId: string;
    date: Date;
    description: string;
    notes?: string;
    lineItems: VoucherLineItem[];
    createdBy?: string;
}): Promise<VoucherOperationResult> {
    try {
        // Verify all ledger accounts exist
        const ledgerIds = params.lineItems.map(item => item.ledgerAccountId);
        const ledgerAccounts = await Promise.all(
            ledgerIds.map(id => getLedgerAccountById(id))
        );

        // Check if any account is missing
        const missingAccounts = ledgerAccounts.filter(acc => !acc);
        if (missingAccounts.length > 0) {
            throw new Error('One or more ledger accounts not found');
        }

        // Add ledger names to line items
        const enhancedLineItems: VoucherLineItem[] = params.lineItems.map((item, index) => ({
            ...item,
            ledgerAccountName: ledgerAccounts[index]!.name
        }));

        // Validate balance
        const totalDebits = enhancedLineItems
            .filter(item => item.type === 'Dr')
            .reduce((sum, item) => sum + item.amount, 0);
        
        const totalCredits = enhancedLineItems
            .filter(item => item.type === 'Cr')
            .reduce((sum, item) => sum + item.amount, 0);

        if (Math.abs(totalDebits - totalCredits) > 0.01) {
            throw new Error(`Journal entries must be balanced. Debits: ₹${totalDebits}, Credits: ₹${totalCredits}`);
        }

        // Must have at least one debit and one credit
        if (totalDebits === 0 || totalCredits === 0) {
            throw new Error('Journal voucher must have at least one debit and one credit entry');
        }

        // Build ledger references for each line item
        const lineItemsWithReferences = await Promise.all(
            enhancedLineItems.map(async (item, index) => ({
                ...item,
                ledgerReference: await buildLedgerReference(enhancedLineItems, index, 'journal')
            }))
        );

        // Generate voucher number
        const voucherNumber = await generateVoucherNumber('journal', params.date, params.fpoId);

        // Create voucher
        return await createVoucher({
            voucherNumber,
            voucherType: 'journal',
            date: params.date,
            fpoId: params.fpoId,
            description: params.description,
            notes: params.notes,
            lineItems: lineItemsWithReferences,
            createdBy: params.createdBy
        });
    } catch (error) {
        console.error('Error creating journal voucher:', error);
        throw error;
    }
}

// ============================================================================
// QUERY AND REPORTING FUNCTIONS
// ============================================================================

export async function getVoucherDetails(voucherId: string): Promise<VoucherWithEntries | null> {
    return await getVoucherById(voucherId);
}

export async function getVouchersForPeriod(params: {
    fpoId: string;
    startDate: Date;
    endDate: Date;
    voucherType?: 'payment' | 'receipt' | 'contra' | 'journal';
}): Promise<VoucherWithEntries[]> {
    return await getVouchersByFpo(params);
}

export async function searchVouchers(params: {
    fpoId: string;
    searchTerm: string;
    voucherType?: 'payment' | 'receipt' | 'contra' | 'journal';
    limit?: number;
}): Promise<VoucherWithEntries[]> {
    const voucherByNumber = await getVoucherByNumber(params.searchTerm);
    if (voucherByNumber) {
        return [voucherByNumber];
    }

    const allVouchers = await getVouchersByFpo({
        fpoId: params.fpoId,
        voucherType: params.voucherType,
        limit: params.limit || 50
    });

    return allVouchers.filter(v => 
        v.voucher.description.toLowerCase().includes(params.searchTerm.toLowerCase()) ||
        v.voucher.notes?.toLowerCase().includes(params.searchTerm.toLowerCase())
    );
}

export async function auditVoucher(voucherId: string): Promise<{
    isValid: boolean;
    issues: string[];
    voucherBalance: {
        isBalanced: boolean;
        totalDebits: number;
        totalCredits: number;
        difference: number;
    };
}> {
    const issues: string[] = [];

    const voucher = await getVoucherById(voucherId);
    if (!voucher) {
        return {
            isValid: false,
            issues: ['Voucher not found'],
            voucherBalance: {
                isBalanced: false,
                totalDebits: 0,
                totalCredits: 0,
                difference: 0
            }
        };
    }

    const balance = await validateVoucherBalance(voucherId);
    if (!balance.isBalanced) {
        issues.push(`Voucher is not balanced. Difference: ₹${balance.difference.toFixed(2)}`);
    }

    if (voucher.ledgerEntries.length === 0) {
        issues.push('No ledger entries found for this voucher');
    }

    for (const entry of voucher.ledgerEntries) {
        const ledgerAccount = await getLedgerAccountById(entry.ledgerAccountId);
        if (!ledgerAccount) {
            issues.push(`Ledger entry references non-existent account: ${entry.ledgerAccountId}`);
        }
    }

    return {
        isValid: issues.length === 0,
        issues,
        voucherBalance: balance
    };
}

// ============================================================================
// EXPORT SERVICE FUNCTIONS
// ============================================================================

export const VoucherService = {
    createPaymentVoucher,
    createReceiptVoucher,
    createContraVoucher,
    createJournalVoucher,
    getVoucherDetails,
    getVouchersForPeriod,
    searchVouchers,
    updateVoucher,
    deleteVoucher,
    createReversalVoucher,
    auditVoucher,
    validateVoucherBalance,
    generateVoucherNumber
};