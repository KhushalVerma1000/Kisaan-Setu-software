// Enhanced Client-side API helper functions for Bank Book System
// @/server/features/bankbookSystem/infrastructure/apiHelper/bankbookApi.ts

const BANKBOOK_API_BASE_URL = '/api/bank-books';
const BANKBOOK_ENTRIES_API_BASE_URL = '/api/bank-books/entries';

export class BankBookAPI {
    // === BANK BOOK MANAGEMENT ===

    // Get all bank books for FPO
    static async getBankBooks(fpoId?: string) {
        const params = fpoId ? `?fpoId=${fpoId}` : '';
        const response = await fetch(`${BANKBOOK_API_BASE_URL}${params}`);
        if (!response.ok) throw new Error('Failed to fetch bank books');
        const result = await response.json();
        return result.data;
    }

    // Get specific bank book by ID
    static async getBankBook(bankBookId: string) {
        const response = await fetch(`${BANKBOOK_API_BASE_URL}/${bankBookId}`);
        if (!response.ok) throw new Error('Failed to fetch bank book');
        const result = await response.json();
        return result.data;
    }

    // Create new bank book
    static async createBankBook(data: {
        bankAccountId: string;
        fpoId: string;
        openingBalance: number;
        openingDate: string;
    }) {
        const response = await fetch(BANKBOOK_API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create bank book');
        const result = await response.json();
        return result.data;
    }

    // Create or upsert bank book
    static async upsertBankBook(data: {
        bankAccountId: string;
        fpoId: string;
        openingBalance: number;
        openingDate: string;
    }) {
        const response = await fetch(BANKBOOK_API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...data, upsert: true }),
        });
        if (!response.ok) throw new Error('Failed to upsert bank book');
        const result = await response.json();
        return result.data;
    }

    // Update bank book
    static async updateBankBook(data: {
        id: string;
        openingBalance: number;
        openingDate: string;
    }) {
        const response = await fetch(`${BANKBOOK_API_BASE_URL}/${data.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                openingBalance: data.openingBalance,
                openingDate: data.openingDate,
            }),
        });
        if (!response.ok) throw new Error('Failed to update bank book');
        const result = await response.json();
        return result.data;
    }

    // Delete bank book
    static async deleteBankBook(bankBookId: string) {
        const response = await fetch(`${BANKBOOK_API_BASE_URL}/${bankBookId}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete bank book');
        const result = await response.json();
        return result;
    }

    // === BANK BOOK ENTRIES ===

    // Get bank book entries
    static async getEntries(
        bankBookId: string,
        startDate?: string,
        endDate?: string
    ) {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const queryString = params.toString();
        const url = `${BANKBOOK_API_BASE_URL}/${bankBookId}/entries${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch bank book entries');
        const result = await response.json();
        return result.data;
    }

    // Get specific entry by ID
    static async getEntry(entryId: string) {
        const response = await fetch(`${BANKBOOK_ENTRIES_API_BASE_URL}/${entryId}`);
        if (!response.ok) throw new Error('Failed to fetch bank book entry');
        const result = await response.json();
        return result.data;
    }

    // Create bank book entry
    static async createEntry(data: {
        bankBookId: string;
        amount: number;
        type: 'Dr' | 'Cr';
        date: string;
        transactionType: string;
        paymentMethod?: string;
        partyName?: string;
        documentNumber?: string;
        additionalInfo?: string;
        relatedLedgerName?: string;
        chequeNumber?: string;
        referenceNumber?: string;
        documentId?: string;
        documentType?: string;
    }) {
        const response = await fetch(`${BANKBOOK_API_BASE_URL}/${data.bankBookId}/entries`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create bank book entry');
        const result = await response.json();
        return result.data;
    }

    // Create multiple entries (bulk operation)
    static async createBulkEntries(
        bankBookId: string,
        entries: Array<{
            amount: number;
            type: 'Dr' | 'Cr';
            date: string;
            transactionType: string;
            paymentMethod?: string;
            partyName?: string;
            documentNumber?: string;
            additionalInfo?: string;
            relatedLedgerName?: string;
            chequeNumber?: string;
            referenceNumber?: string;
            documentId?: string;
            documentType?: string;
        }>
    ) {
        const response = await fetch(`${BANKBOOK_API_BASE_URL}/${bankBookId}/entries`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ entries }),
        });
        if (!response.ok) throw new Error('Failed to create bulk bank book entries');
        const result = await response.json();
        return result.data;
    }

    // Update bank book entry
    static async updateEntry(data: {
        id: string;
        amount?: number;
        type?: 'Dr' | 'Cr';
        date?: string;
        transactionType?: string;
        paymentMethod?: string;
        primaryDescription?: string;
        secondaryDescription?: string;
        referenceDescription?: string;
        ledgerReference?: string;
        chequeNumber?: string;
        referenceNumber?: string;
        documentId?: string;
        documentType?: string;
        documentNumber?: string;
    }) {
        const { id, ...updateData } = data;
        const response = await fetch(`${BANKBOOK_ENTRIES_API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
        });
        if (!response.ok) throw new Error('Failed to update bank book entry');
        const result = await response.json();
        return result.data;
    }

    // Delete bank book entry
    static async deleteEntry(entryId: string) {
        const response = await fetch(`${BANKBOOK_ENTRIES_API_BASE_URL}/${entryId}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete bank book entry');
        const result = await response.json();
        return result;
    }

    // Bulk delete entries
    static async deleteBulkEntries(entryIds: string[]) {
        const response = await fetch(`${BANKBOOK_ENTRIES_API_BASE_URL}/bulk-delete`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ entryIds }),
        });
        if (!response.ok) throw new Error('Failed to bulk delete bank book entries');
        const result = await response.json();
        return result;
    }

    // === TRANSACTION-SPECIFIC ENTRY METHODS ===

    // Create opening balance entry
    static async createOpeningBalanceEntry(data: {
        bankBookId: string;
        date: string;
        amount: number;
        type: 'Dr' | 'Cr';
    }) {
        return this.createEntry({
            ...data,
            transactionType: 'Opening Balance',
            additionalInfo: 'Opening Balance Entry',
        });
    }

    // Create bank receipt entry (money received in bank)
    static async createBankReceiptEntry(data: {
        bankBookId: string;
        date: string;
        amount: number;
        paymentMethod: string;
        partyName?: string;
        documentNumber?: string;
        additionalInfo?: string;
        chequeNumber?: string;
        referenceNumber?: string;
        documentId?: string;
        documentType?: string;
    }) {
        return this.createEntry({
            bankBookId: data.bankBookId,
            date: data.date,
            amount: data.amount,
            type: 'Dr',
            transactionType: 'Bank Receipt',
            paymentMethod: data.paymentMethod,
            partyName: data.partyName,
            documentNumber: data.documentNumber,
            additionalInfo: data.additionalInfo,
            chequeNumber: data.chequeNumber,
            referenceNumber: data.referenceNumber,
            documentId: data.documentId,
            documentType: data.documentType || 'Receipt',
        });
    }

    // Create bank payment entry (money paid from bank)
    static async createBankPaymentEntry(data: {
        bankBookId: string;
        date: string;
        amount: number;
        paymentMethod: string;
        partyName?: string;
        documentNumber?: string;
        additionalInfo?: string;
        chequeNumber?: string;
        referenceNumber?: string;
        documentId?: string;
        documentType?: string;
    }) {
        return this.createEntry({
            bankBookId: data.bankBookId,
            date: data.date,
            amount: data.amount,
            type: 'Cr',
            transactionType: 'Bank Payment',
            paymentMethod: data.paymentMethod,
            partyName: data.partyName,
            documentNumber: data.documentNumber,
            additionalInfo: data.additionalInfo,
            chequeNumber: data.chequeNumber,
            referenceNumber: data.referenceNumber,
            documentId: data.documentId,
            documentType: data.documentType || 'Payment',
        });
    }

    // Create bank transfer entry (internal transfer)
    static async createBankTransferEntry(data: {
        bankBookId: string;
        date: string;
        amount: number;
        type: 'Dr' | 'Cr';
        transferType: 'In' | 'Out';
        otherBankAccount?: string;
        referenceNumber?: string;
        additionalInfo?: string;
        documentId?: string;
    }) {
        return this.createEntry({
            bankBookId: data.bankBookId,
            date: data.date,
            amount: data.amount,
            type: data.type,
            transactionType: 'Bank Transfer',
            paymentMethod: 'Transfer',
            partyName: data.otherBankAccount,
            additionalInfo: `${data.transferType === 'In' ? 'Transfer In' : 'Transfer Out'} - ${data.additionalInfo || ''}`,
            referenceNumber: data.referenceNumber,
            documentId: data.documentId,
            documentType: 'Transfer',
        });
    }

    // Create sales deposit entry (from invoice payment)
    static async createSalesDepositEntry(data: {
        bankBookId: string;
        invoiceId: string;
        invoiceNumber: string;
        date: string;
        amount: number;
        customerName?: string;
        paymentMethod: string;
        chequeNumber?: string;
        referenceNumber?: string;
    }) {
        return this.createEntry({
            bankBookId: data.bankBookId,
            date: data.date,
            amount: data.amount,
            type: 'Dr',
            transactionType: 'Sales Deposit',
            paymentMethod: data.paymentMethod,
            partyName: data.customerName,
            documentNumber: data.invoiceNumber,
            additionalInfo: `Sales Payment - Invoice: ${data.invoiceNumber}`,
            chequeNumber: data.chequeNumber,
            referenceNumber: data.referenceNumber,
            documentId: data.invoiceId,
            documentType: 'Invoice',
        });
    }

    // Create supplier payment entry (for purchase payment)
    static async createSupplierPaymentEntry(data: {
        bankBookId: string;
        voucherId: string;
        voucherNumber: string;
        date: string;
        amount: number;
        supplierName?: string;
        paymentMethod: string;
        chequeNumber?: string;
        referenceNumber?: string;
    }) {
        return this.createEntry({
            bankBookId: data.bankBookId,
            date: data.date,
            amount: data.amount,
            type: 'Cr',
            transactionType: 'Supplier Payment',
            paymentMethod: data.paymentMethod,
            partyName: data.supplierName,
            documentNumber: data.voucherNumber,
            additionalInfo: `Purchase Payment - Voucher: ${data.voucherNumber}`,
            chequeNumber: data.chequeNumber,
            referenceNumber: data.referenceNumber,
            documentId: data.voucherId,
            documentType: 'Purchase Voucher',
        });
    }

    // === REPORTING METHODS ===

    // Get bank book flow summary
    static async getFlowSummary(
        bankBookId: string,
        startDate: string,
        endDate: string
    ) {
        const params = new URLSearchParams({
            type: 'flow-summary',
            startDate,
            endDate,
        });

        const response = await fetch(`${BANKBOOK_API_BASE_URL}/${bankBookId}/reports?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch bank flow summary');
        const result = await response.json();
        return result.data;
    }

    // Get bank book balance
    static async getBalance(bankBookId: string) {
        const params = new URLSearchParams({
            type: 'balance',
        });

        const response = await fetch(`${BANKBOOK_API_BASE_URL}/${bankBookId}/reports?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch bank balance');
        const result = await response.json();
        return result.data;
    }

    // Get bank book statement with running balance
    static async getStatement(
        bankBookId: string,
        startDate?: string,
        endDate?: string
    ) {
        const entries = await this.getEntries(bankBookId, startDate, endDate);
        const balance = await this.getBalance(bankBookId);
        
        // Calculate running balance for statement
        let runningBalance = balance.openingBalance;
        const statementEntries = entries.map((entry: any) => {
            if (entry.type === 'Dr') {
                runningBalance += entry.amount;
            } else {
                runningBalance -= entry.amount;
            }
            return {
                ...entry,
                runningBalance: runningBalance,
                balanceType: runningBalance >= 0 ? 'Dr' : 'Cr',
            };
        });

        return {
            entries: statementEntries,
            openingBalance: balance.openingBalance,
            closingBalance: balance.currentBalance,
            totalDebit: entries.filter((e: any) => e.type === 'Dr').reduce((sum: number, e: any) => sum + e.amount, 0),
            totalCredit: entries.filter((e: any) => e.type === 'Cr').reduce((sum: number, e: any) => sum + e.amount, 0),
        };
    }

    // === UTILITY METHODS ===

    // Check if bank book exists
    static async checkBankBook(bankBookId: string) {
        try {
            const bankBook = await this.getBankBook(bankBookId);
            return { exists: true, bankBook };
        } catch (error) {
            return { 
                exists: false, 
                error: error instanceof Error ? error.message : 'Bank book not found' 
            };
        }
    }

    // Get current balance for bank book
    static async getCurrentBalance(bankBookId: string) {
        const balance = await this.getBalance(bankBookId);
        return {
            balance: balance.currentBalance,
            isNegative: balance.currentBalance < 0,
            openingBalance: balance.openingBalance,
        };
    }

    // Search entries (client-side filtering helper)
    static async searchEntries(
        bankBookId: string,
        searchTerm: string,
        startDate?: string,
        endDate?: string
    ) {
        const entries = await this.getEntries(bankBookId, startDate, endDate);
        const lowercaseSearch = searchTerm.toLowerCase();
        
        return entries.filter((entry: any) =>
            entry.primaryDescription?.toLowerCase().includes(lowercaseSearch) ||
            entry.secondaryDescription?.toLowerCase().includes(lowercaseSearch) ||
            entry.additionalInfo?.toLowerCase().includes(lowercaseSearch) ||
            entry.partyName?.toLowerCase().includes(lowercaseSearch) ||
            entry.documentNumber?.toLowerCase().includes(lowercaseSearch) ||
            entry.chequeNumber?.toLowerCase().includes(lowercaseSearch) ||
            entry.referenceNumber?.toLowerCase().includes(lowercaseSearch) ||
            entry.transactionType?.toLowerCase().includes(lowercaseSearch) ||
            entry.paymentMethod?.toLowerCase().includes(lowercaseSearch)
        );
    }

    // Get entries by transaction type
    static async getEntriesByType(
        bankBookId: string,
        transactionType: string,
        startDate?: string,
        endDate?: string
    ) {
        const entries = await this.getEntries(bankBookId, startDate, endDate);
        return entries.filter((entry: any) => entry.transactionType === transactionType);
    }

    // Get entries by payment method
    static async getEntriesByPaymentMethod(
        bankBookId: string,
        paymentMethod: string,
        startDate?: string,
        endDate?: string
    ) {
        const entries = await this.getEntries(bankBookId, startDate, endDate);
        return entries.filter((entry: any) => entry.paymentMethod === paymentMethod);
    }

    // Get entries by document
    static async getEntriesByDocument(
        bankBookId: string,
        documentId: string,
        documentType?: string
    ) {
        const entries = await this.getEntries(bankBookId);
        return entries.filter((entry: any) => 
            entry.documentId === documentId && 
            (!documentType || entry.documentType === documentType)
        );
    }

    // Get entries by party/customer
    static async getEntriesByParty(
        bankBookId: string,
        partyName: string,
        startDate?: string,
        endDate?: string
    ) {
        const entries = await this.getEntries(bankBookId, startDate, endDate);
        return entries.filter((entry: any) => 
            entry.partyName?.toLowerCase().includes(partyName.toLowerCase())
        );
    }

    // === VALIDATION METHODS ===

    // Validate entry data before creation
    static validateEntryData(data: {
        amount: number;
        type: string;
        transactionType: string;
        date: string;
    }) {
        const errors: string[] = [];

        if (!data.amount || data.amount <= 0) {
            errors.push('Amount must be greater than 0');
        }

        if (!['Dr', 'Cr'].includes(data.type)) {
            errors.push('Type must be either "Dr" or "Cr"');
        }

        if (!data.transactionType?.trim()) {
            errors.push('Transaction type is required');
        }

        if (!data.date) {
            errors.push('Date is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Validate bank book data
    static validateBankBookData(data: {
        bankAccountId: string;
        fpoId: string;
        openingBalance: number;
        openingDate: string;
    }) {
        const errors: string[] = [];

        if (!data.bankAccountId?.trim()) {
            errors.push('Bank account ID is required');
        }

        if (!data.fpoId?.trim()) {
            errors.push('FPO ID is required');
        }

        if (data.openingBalance === undefined || data.openingBalance === null) {
            errors.push('Opening balance is required');
        }

        if (!data.openingDate) {
            errors.push('Opening date is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // === EXPORT METHODS ===

    // Export entries as JSON
    static async exportEntriesAsJSON(
        bankBookId: string,
        startDate?: string,
        endDate?: string
    ) {
        const entries = await this.getEntries(bankBookId, startDate, endDate);
        const dataStr = JSON.stringify(entries, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `bankbook_entries_${bankBookId}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    // Export statement as JSON
    static async exportStatementAsJSON(
        bankBookId: string,
        startDate?: string,
        endDate?: string
    ) {
        const statement = await this.getStatement(bankBookId, startDate, endDate);
        const dataStr = JSON.stringify(statement, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `bankbook_statement_${bankBookId}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    // Export flow summary as JSON
    static async exportFlowSummaryAsJSON(
        bankBookId: string,
        startDate: string,
        endDate: string
    ) {
        const flowSummary = await this.getFlowSummary(bankBookId, startDate, endDate);
        const dataStr = JSON.stringify(flowSummary, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `bankbook_flow_summary_${bankBookId}_${startDate}_to_${endDate}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    // === HELPER METHODS ===

    // Get transaction types available
    static getTransactionTypes() {
        return [
            'Opening Balance',
            'Bank Receipt',
            'Bank Payment',
            'Bank Transfer',
            'Sales Deposit',
            'Supplier Payment',
            'Loan Receipt',
            'Loan Payment',
            'Interest Received',
            'Interest Paid',
            'Bank Charges',
            'Other Income',
            'Other Expense'
        ];
    }

    // Get payment methods available
    static getPaymentMethods() {
        return [
            'Cash',
            'Cheque',
            'DD (Demand Draft)',
            'NEFT',
            'RTGS',
            'IMPS',
            'UPI',
            'Card Payment',
            'Online Transfer',
            'Wire Transfer'
        ];
    }

    // Format amount for display
    static formatAmount(amount: number, currency: string = '₹') {
        return `${currency}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Format date for API
    static formatDateForAPI(date: Date) {
        return date.toISOString().split('T')[0];
    }

    // Parse API date
    static parseAPIDate(dateString: string) {
        return new Date(dateString);
    }
}