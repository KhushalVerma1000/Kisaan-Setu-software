// Enhanced Client-side API helper functions for Cashbook System
// @/server/features/cashbookSystem/infrastructure/apiHelper/cashbookApi.ts

const CASHBOOK_API_BASE_URL = '/api/cashbook';
const CASHBOOK_ENTRIES_API_BASE_URL = '/api/cashbook/entries';
const CASHBOOK_REPORT_API_BASE_URL = '/api/cashbook/report';

export class CashbookAPI {
    // === CASHBOOK MANAGEMENT ===

    // Get cashbook for FPO
    static async getCashbook(fpoId: string) {
        const response = await fetch(`${CASHBOOK_API_BASE_URL}?fpoId=${fpoId}`);
        if (!response.ok) throw new Error('Failed to fetch cashbook');
        const result = await response.json();
        return result.data;
    }

    // Create new cashbook
    static async createCashbook(data: {
        fpoId: string;
        openingBalance: number;
        openingDate: string;
    }) {
        const response = await fetch(CASHBOOK_API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create cashbook');
        const result = await response.json();
        return result.data;
    }

    // Update/Create cashbook (upsert)
    static async updateCashbook(data: {
        id?: string;
        fpoId: string;
        openingBalance: number;
        openingDate: string;
    }) {
        const response = await fetch(CASHBOOK_API_BASE_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update cashbook');
        const result = await response.json();
        return result.data;
    }

    // === CASHBOOK ENTRIES ===

    // Get cashbook entries
    static async getEntries(
        cashBookId: string,
        startDate?: string,
        endDate?: string
    ) {
        const params = new URLSearchParams({ cashBookId });
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const response = await fetch(`${CASHBOOK_ENTRIES_API_BASE_URL}?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch cashbook entries');
        const result = await response.json();
        return result.data;
    }

    // Create cashbook entry
    static async createEntry(data: {
        cashBookId: string;
        date: string;
        amount: number;
        type: 'Dr' | 'Cr';
        transactionType: string;
        primaryDescription: string;
        documentId?: string;
        documentType?: string;
        documentNumber?: string;
        secondaryDescription?: string;
        referenceDescription?: string;
        ledgerReference?: string;
        isOpeningBalance?: boolean;
    }) {
        const response = await fetch(CASHBOOK_ENTRIES_API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create cashbook entry');
        const result = await response.json();
        return result.data;
    }

    // Update cashbook entry
    static async updateEntry(data: {
        id: string;
        cashBookId: string;
        date: string;
        amount: number;
        type: 'Dr' | 'Cr';
        transactionType: string;
        primaryDescription: string;
        documentId?: string;
        documentType?: string;
        documentNumber?: string;
        secondaryDescription?: string;
        referenceDescription?: string;
        ledgerReference?: string;
        isOpeningBalance?: boolean;
    }) {
        const response = await fetch(CASHBOOK_ENTRIES_API_BASE_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update cashbook entry');
        const result = await response.json();
        return result.data;
    }

    // Delete cashbook entry by ID
    static async deleteEntry(entryId: string) {
        const response = await fetch(`${CASHBOOK_ENTRIES_API_BASE_URL}?entryId=${entryId}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete cashbook entry');
        const result = await response.json();
        return result;
    }

    // Delete cashbook entries by document
    static async deleteEntriesByDocument(documentId: string, documentType?: string) {
        const params = new URLSearchParams({ documentId });
        if (documentType) params.append('documentType', documentType);

        const response = await fetch(`${CASHBOOK_ENTRIES_API_BASE_URL}?${params.toString()}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete cashbook entries by document');
        const result = await response.json();
        return result;
    }

    // === TRANSACTION-SPECIFIC ENTRY METHODS ===

    // Create opening balance entry
    static async createOpeningBalanceEntry(data: {
        cashBookId: string;
        date: string;
        amount: number;
        type: 'Dr' | 'Cr';
    }) {
        return this.createEntry({
            ...data,
            transactionType: 'Opening Balance',
            primaryDescription: 'Opening Balance',
            isOpeningBalance: true,
        });
    }

    // Create cash receipt entry
    static async createCashReceiptEntry(data: {
        cashBookId: string;
        date: string;
        amount: number;
        description: string;
        documentId?: string;
        documentNumber?: string;
        secondaryDescription?: string;
        ledgerReference?: string;
    }) {
        return this.createEntry({
            cashBookId: data.cashBookId,
            date: data.date,
            amount: data.amount,
            type: 'Dr',
            transactionType: 'Cash Receipt',
            primaryDescription: data.description,
            documentId: data.documentId,
            documentType: 'Receipt',
            documentNumber: data.documentNumber,
            secondaryDescription: data.secondaryDescription,
            ledgerReference: data.ledgerReference,
        });
    }

    // Create cash payment entry
    static async createCashPaymentEntry(data: {
        cashBookId: string;
        date: string;
        amount: number;
        description: string;
        documentId?: string;
        documentNumber?: string;
        secondaryDescription?: string;
        ledgerReference?: string;
    }) {
        return this.createEntry({
            cashBookId: data.cashBookId,
            date: data.date,
            amount: data.amount,
            type: 'Cr',
            transactionType: 'Cash Payment',
            primaryDescription: data.description,
            documentId: data.documentId,
            documentType: 'Payment',
            documentNumber: data.documentNumber,
            secondaryDescription: data.secondaryDescription,
            ledgerReference: data.ledgerReference,
        });
    }

    // Create sales entry (from invoice)
    static async createSalesEntry(data: {
        cashBookId: string;
        invoiceId: string;
        invoiceNumber: string;
        date: string;
        amount: number;
        customerName?: string;
    }) {
        return this.createEntry({
            cashBookId: data.cashBookId,
            date: data.date,
            amount: data.amount,
            type: 'Dr',
            transactionType: 'Sales',
            primaryDescription: `Cash Sales - ${data.customerName || 'Customer'}`,
            documentId: data.invoiceId,
            documentType: 'Invoice',
            documentNumber: data.invoiceNumber,
            secondaryDescription: `Invoice: ${data.invoiceNumber}`,
        });
    }

    // Create purchase entry (from purchase voucher)
    static async createPurchaseEntry(data: {
        cashBookId: string;
        voucherId: string;
        voucherNumber: string;
        date: string;
        amount: number;
        supplierName?: string;
    }) {
        return this.createEntry({
            cashBookId: data.cashBookId,
            date: data.date,
            amount: data.amount,
            type: 'Cr',
            transactionType: 'Purchase',
            primaryDescription: `Cash Purchase - ${data.supplierName || 'Supplier'}`,
            documentId: data.voucherId,
            documentType: 'Purchase Voucher',
            documentNumber: data.voucherNumber,
            secondaryDescription: `Voucher: ${data.voucherNumber}`,
        });
    }

    // === REPORTING METHODS ===

    // Get cashbook statement with running balance
    static async getStatement(
        fpoId: string,
        startDate?: string,
        endDate?: string
    ) {
        const params = new URLSearchParams({ 
            fpoId,
            type: 'statement'
        });
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const response = await fetch(`${CASHBOOK_REPORT_API_BASE_URL}?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch cashbook statement');
        const result = await response.json();
        return result.data;
    }

    // Get cashbook summary report
    static async getSummaryReport(
        cashBookId: string,
        startDate: string,
        endDate: string
    ) {
        const params = new URLSearchParams({ 
            cashBookId,
            type: 'summary',
            startDate,
            endDate
        });

        const response = await fetch(`${CASHBOOK_REPORT_API_BASE_URL}?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch cashbook summary');
        const result = await response.json();
        return result.data;
    }

    // Get cashbook statement by cashBookId
    static async getStatementByCashBookId(
        cashBookId: string,
        fpoId: string,
        startDate?: string,
        endDate?: string
    ) {
        const params = new URLSearchParams({ 
            cashBookId,
            fpoId,
            type: 'statement'
        });
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const response = await fetch(`${CASHBOOK_REPORT_API_BASE_URL}?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch cashbook statement');
        const result = await response.json();
        return result.data;
    }

    // === UTILITY METHODS ===

    // Check if cashbook exists for FPO
    static async checkCashbook(fpoId: string) {
        try {
            const cashbook = await this.getCashbook(fpoId);
            return { exists: true, cashbook };
        } catch (error) {
            return { 
                exists: false, 
                error: error instanceof Error ? error.message : 'Cashbook not found' 
            };
        }
    }

    // Get current balance for cashbook
    static async getCurrentBalance(fpoId: string) {
        const statement = await this.getStatement(fpoId);
        return {
            balance: statement.currentBalance,
            isNegative: statement.isNegativeBalance,
            openingBalance: statement.openingBalance,
        };
    }

    // Search entries (client-side filtering helper)
    static async searchEntries(
        cashBookId: string,
        searchTerm: string,
        startDate?: string,
        endDate?: string
    ) {
        const entries = await this.getEntries(cashBookId, startDate, endDate);
        const lowercaseSearch = searchTerm.toLowerCase();
        
        return entries.filter((entry: any) =>
            entry.primaryDescription?.toLowerCase().includes(lowercaseSearch) ||
            entry.secondaryDescription?.toLowerCase().includes(lowercaseSearch) ||
            entry.referenceDescription?.toLowerCase().includes(lowercaseSearch) ||
            entry.documentNumber?.toLowerCase().includes(lowercaseSearch) ||
            entry.transactionType?.toLowerCase().includes(lowercaseSearch)
        );
    }

    // Get entries by transaction type
    static async getEntriesByType(
        cashBookId: string,
        transactionType: string,
        startDate?: string,
        endDate?: string
    ) {
        const entries = await this.getEntries(cashBookId, startDate, endDate);
        return entries.filter((entry: any) => entry.transactionType === transactionType);
    }

    // Get entries by document
    static async getEntriesByDocument(
        cashBookId: string,
        documentId: string,
        documentType?: string
    ) {
        const entries = await this.getEntries(cashBookId);
        return entries.filter((entry: any) => 
            entry.documentId === documentId && 
            (!documentType || entry.documentType === documentType)
        );
    }

    // === BULK OPERATIONS ===

    // Create multiple entries (useful for complex transactions)
    static async createBulkEntries(entries: Array<{
        cashBookId: string;
        date: string;
        amount: number;
        type: 'Dr' | 'Cr';
        transactionType: string;
        primaryDescription: string;
        documentId?: string;
        documentType?: string;
        documentNumber?: string;
        secondaryDescription?: string;
        referenceDescription?: string;
        ledgerReference?: string;
        isOpeningBalance?: boolean;
    }>) {
        const promises = entries.map(entry => this.createEntry(entry));
        return Promise.all(promises);
    }

    // === VALIDATION METHODS ===

    // Validate entry data before creation
    static validateEntryData(data: {
        amount: number;
        type: string;
        primaryDescription: string;
        date: string;
    }) {
        const errors: string[] = [];

        if (!data.amount || data.amount <= 0) {
            errors.push('Amount must be greater than 0');
        }

        if (!['Dr', 'Cr'].includes(data.type)) {
            errors.push('Type must be either "Dr" or "Cr"');
        }

        if (!data.primaryDescription?.trim()) {
            errors.push('Primary description is required');
        }

        if (!data.date) {
            errors.push('Date is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // === EXPORT METHODS ===

    // Export entries as JSON
    static async exportEntriesAsJSON(
        cashBookId: string,
        startDate?: string,
        endDate?: string
    ) {
        const entries = await this.getEntries(cashBookId, startDate, endDate);
        const dataStr = JSON.stringify(entries, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `cashbook_entries_${cashBookId}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    // Export statement as JSON
    static async exportStatementAsJSON(
        fpoId: string,
        startDate?: string,
        endDate?: string
    ) {
        const statement = await this.getStatement(fpoId, startDate, endDate);
        const dataStr = JSON.stringify(statement, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `cashbook_statement_${fpoId}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
}