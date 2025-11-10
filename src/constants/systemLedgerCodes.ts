// constants/systemLedgerCodes.ts

/**
 * System Ledger Codes
 * These codes are used to programmatically find system ledgers
 * DO NOT CHANGE these codes once in production as they're used in business logic
 */
export const SYSTEM_LEDGER_CODES = {
    // Sales & Revenue
    SALES: 'SYS_SALES',
    SALES_RETURN: 'SYS_SALES_RET',
    
    // Purchase
    PURCHASE: 'SYS_PURCHASE',
    PURCHASE_RETURN: 'SYS_PURCHASE_RET',
    
    // GST Input (Assets - amounts you can claim back)
    GST_INPUT_CGST: 'SYS_GST_IN_CGST',
    GST_INPUT_SGST: 'SYS_GST_IN_SGST',
    GST_INPUT_IGST: 'SYS_GST_IN_IGST',
    
    // GST Output (Liabilities - amounts you owe to government)
    GST_OUTPUT_CGST: 'SYS_GST_OUT_CGST',
    GST_OUTPUT_SGST: 'SYS_GST_OUT_SGST',
    GST_OUTPUT_IGST: 'SYS_GST_OUT_IGST',
    
    // TDS/TCS
    TDS_PAYABLE: 'SYS_TDS_PAY',
    TCS_PAYABLE: 'SYS_TCS_PAY',
    TDS_RECEIVABLE: 'SYS_TDS_REC',
    
    // Cash
    CASH: 'SYS_CASH',
    PETTY_CASH: 'SYS_PETTY_CASH',
    
    // Capital & Equity
    CAPITAL: 'SYS_CAPITAL',
    RETAINED_EARNINGS: 'SYS_RETAINED',
    DRAWINGS: 'SYS_DRAWINGS',
    PROFIT_LOSS: 'SYS_PL',
    
    // Discounts
    DISCOUNT_ALLOWED: 'SYS_DISC_ALLOWED',
    DISCOUNT_RECEIVED: 'SYS_DISC_RECV',
    
    // Common Expenses
    FREIGHT: 'SYS_FREIGHT',
    PACKING: 'SYS_PACKING',
    LOADING: 'SYS_LOADING',
    BANK_CHARGES: 'SYS_BANK_CHG',
    INTEREST_BANK: 'SYS_INT_BANK',
    
    // Miscellaneous
    ROUNDING_OFF: 'SYS_ROUNDING',
} as const;

export type SystemLedgerCode = typeof SYSTEM_LEDGER_CODES[keyof typeof SYSTEM_LEDGER_CODES];

/**
 * System Ledger Categories for easier grouping
 */
export const SYSTEM_LEDGER_CATEGORIES = {
    SALES: [SYSTEM_LEDGER_CODES.SALES, SYSTEM_LEDGER_CODES.SALES_RETURN],
    PURCHASE: [SYSTEM_LEDGER_CODES.PURCHASE, SYSTEM_LEDGER_CODES.PURCHASE_RETURN],
    GST_INPUT: [
        SYSTEM_LEDGER_CODES.GST_INPUT_CGST,
        SYSTEM_LEDGER_CODES.GST_INPUT_SGST,
        SYSTEM_LEDGER_CODES.GST_INPUT_IGST,
    ],
    GST_OUTPUT: [
        SYSTEM_LEDGER_CODES.GST_OUTPUT_CGST,
        SYSTEM_LEDGER_CODES.GST_OUTPUT_SGST,
        SYSTEM_LEDGER_CODES.GST_OUTPUT_IGST,
    ],
    TAX: [
        SYSTEM_LEDGER_CODES.TDS_PAYABLE,
        SYSTEM_LEDGER_CODES.TCS_PAYABLE,
        SYSTEM_LEDGER_CODES.TDS_RECEIVABLE,
    ],
    CASH: [SYSTEM_LEDGER_CODES.CASH, SYSTEM_LEDGER_CODES.PETTY_CASH],
    CAPITAL: [
        SYSTEM_LEDGER_CODES.CAPITAL,
        SYSTEM_LEDGER_CODES.RETAINED_EARNINGS,
        SYSTEM_LEDGER_CODES.DRAWINGS,
        SYSTEM_LEDGER_CODES.PROFIT_LOSS,
    ],
} as const;

/**
 * Helper function to check if a code is a valid system ledger code
 */
export function isValidSystemLedgerCode(code: string): code is SystemLedgerCode {
    return Object.values(SYSTEM_LEDGER_CODES).includes(code as SystemLedgerCode);
}

/**
 * Get human-readable description of a system ledger code
 */
export function getSystemLedgerDescription(code: SystemLedgerCode): string {
    const descriptions: Record<SystemLedgerCode, string> = {
        [SYSTEM_LEDGER_CODES.SALES]: 'Sales Account',
        [SYSTEM_LEDGER_CODES.SALES_RETURN]: 'Sales Return',
        [SYSTEM_LEDGER_CODES.PURCHASE]: 'Purchase Account',
        [SYSTEM_LEDGER_CODES.PURCHASE_RETURN]: 'Purchase Return',
        [SYSTEM_LEDGER_CODES.GST_INPUT_CGST]: 'GST Input (CGST)',
        [SYSTEM_LEDGER_CODES.GST_INPUT_SGST]: 'GST Input (SGST)',
        [SYSTEM_LEDGER_CODES.GST_INPUT_IGST]: 'GST Input (IGST)',
        [SYSTEM_LEDGER_CODES.GST_OUTPUT_CGST]: 'GST Output (CGST)',
        [SYSTEM_LEDGER_CODES.GST_OUTPUT_SGST]: 'GST Output (SGST)',
        [SYSTEM_LEDGER_CODES.GST_OUTPUT_IGST]: 'GST Output (IGST)',
        [SYSTEM_LEDGER_CODES.TDS_PAYABLE]: 'TDS Payable',
        [SYSTEM_LEDGER_CODES.TCS_PAYABLE]: 'TCS Payable',
        [SYSTEM_LEDGER_CODES.TDS_RECEIVABLE]: 'TDS Receivable',
        [SYSTEM_LEDGER_CODES.CASH]: 'Cash',
        [SYSTEM_LEDGER_CODES.PETTY_CASH]: 'Petty Cash',
        [SYSTEM_LEDGER_CODES.CAPITAL]: 'Capital Account',
        [SYSTEM_LEDGER_CODES.RETAINED_EARNINGS]: 'Retained Earnings',
        [SYSTEM_LEDGER_CODES.DRAWINGS]: 'Drawings',
        [SYSTEM_LEDGER_CODES.PROFIT_LOSS]: 'Profit & Loss A/c',
        [SYSTEM_LEDGER_CODES.DISCOUNT_ALLOWED]: 'Discount Allowed',
        [SYSTEM_LEDGER_CODES.DISCOUNT_RECEIVED]: 'Discount Received',
        [SYSTEM_LEDGER_CODES.FREIGHT]: 'Freight & Transportation',
        [SYSTEM_LEDGER_CODES.PACKING]: 'Packing Charges',
        [SYSTEM_LEDGER_CODES.LOADING]: 'Loading & Unloading',
        [SYSTEM_LEDGER_CODES.BANK_CHARGES]: 'Bank Charges',
        [SYSTEM_LEDGER_CODES.INTEREST_BANK]: 'Interest on Bank Charges',
        [SYSTEM_LEDGER_CODES.ROUNDING_OFF]: 'Rounding Off',
    };
    
    return descriptions[code] || code;
}