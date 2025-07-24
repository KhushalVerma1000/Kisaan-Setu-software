// Enhanced Client-side API helper functions
// @/server/features/ledger/infrastructure/ledgerEntry/ledgerEntryApi.ts
import { LedgerEntryInterface } from '@/server/features/ledger/core/entities/Ledger';

const API_BASE_URL = '/api/ledger/ledger-entries';

export class LedgerEntryAPI {
    // Get all ledger entries for a ledger account
    static async getAll(ledgerAccountId: string) {
        const response = await fetch(`${API_BASE_URL}?ledgerAccountId=${ledgerAccountId}`);
        if (!response.ok) throw new Error('Failed to fetch ledger entries');
        return response.json();
    }

    // Get ledger entry by ID
    static async getById(id: string) {
        const response = await fetch(`${API_BASE_URL}/${id}`);
        if (!response.ok) throw new Error('Failed to fetch ledger entry');
        return response.json();
    }

    // Create ledger entry
    static async create(data: LedgerEntryInterface) {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create ledger entry');
        return response.json();
    }

    // Update ledger entry
    static async update(id: string, data: LedgerEntryInterface) {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update ledger entry');
        return response.json();
    }

    // Delete ledger entry
    static async delete(id: string) {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete ledger entry');
        return response.json();
    }

    // Get ledger entries by date range
    static async getByDateRange(ledgerAccountId: string, startDate: string, endDate: string) {
        const response = await fetch(
            `${API_BASE_URL}?ledgerAccountId=${ledgerAccountId}&startDate=${startDate}&endDate=${endDate}`
        );
        if (!response.ok) throw new Error('Failed to fetch ledger entries by date range');
        return response.json();
    }

    // Get ledger balance for an account
    static async getBalance(ledgerAccountId: string, upToDate?: string) {
        const params = new URLSearchParams({ ledgerAccountId });
        if (upToDate) params.append('upToDate', upToDate);
        
        const response = await fetch(`${API_BASE_URL}/balance?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch ledger balance');
        return response.json();
    }

    // Get ledger statement
    static async getStatement(ledgerAccountId: string, startDate?: string, endDate?: string) {
        const params = new URLSearchParams({ ledgerAccountId });
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        const response = await fetch(`${API_BASE_URL}/statement?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch ledger statement');
        return response.json();
    }

    // Bulk delete ledger entries
    static async bulkDelete(entryIds: string[]) {
        const response = await fetch(`${API_BASE_URL}/bulk-delete`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ entryIds }),
        });
        if (!response.ok) throw new Error('Failed to bulk delete ledger entries');
        return response.json();
    }

    // Search ledger entries
    static async search(ledgerAccountId: string, searchTerm: string) {
        const response = await fetch(
            `${API_BASE_URL}?ledgerAccountId=${ledgerAccountId}&search=${encodeURIComponent(searchTerm)}`
        );
        if (!response.ok) throw new Error('Failed to search ledger entries');
        return response.json();
    }

    // Get ledger entries with pagination
    static async getPaginated(
        ledgerAccountId: string,
        page: number = 1,
        limit: number = 10,
        sortBy: string = 'date',
        sortOrder: 'asc' | 'desc' = 'desc'
    ) {
        const params = new URLSearchParams({
            ledgerAccountId,
            page: page.toString(),
            limit: limit.toString(),
            sortBy,
            sortOrder
        });
        
        const response = await fetch(`${API_BASE_URL}/paginated?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch paginated ledger entries');
        return response.json();
    }

    // === TRANSACTION-SPECIFIC METHODS ===

    // Create sales invoice ledger entry
    static async createSalesInvoiceEntry(data: {
        customerLedgerAccountId: string;
        amount: number;
        date: string;
        invoiceNumber: string;
        description?: string;
    }) {
        const response = await fetch(`${API_BASE_URL}/transactions/sales`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create sales invoice ledger entry');
        return response.json();
    }

    // Create purchase voucher ledger entry
    static async createPurchaseVoucherEntry(data: {
        supplierLedgerAccountId: string;
        amount: number;
        date: string;
        voucherNumber: string;
        description?: string;
    }) {
        const response = await fetch(`${API_BASE_URL}/transactions/purchase`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create purchase voucher ledger entry');
        return response.json();
    }

    // Create payment in ledger entry
    static async createPaymentInEntry(data: {
        customerLedgerAccountId: string;
        amount: number;
        date: string;
        receiptNumber: string;
        description?: string;
    }) {
        const response = await fetch(`${API_BASE_URL}/transactions/payment-in`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create payment in ledger entry');
        return response.json();
    }

    // Create payment out ledger entry
    static async createPaymentOutEntry(data: {
        supplierLedgerAccountId: string;
        amount: number;
        date: string;
        paymentNumber: string;
        description?: string;
    }) {
        const response = await fetch(`${API_BASE_URL}/transactions/payment-out`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create payment out ledger entry');
        return response.json();
    }

    // === HELPER METHODS FOR INVOICES AND PURCHASE VOUCHERS ===

    // Helper: Create ledger entry from invoice data
    static async createFromInvoice(invoiceData: {
        customerId: string;
        invoiceNumber: string;
        invoiceDate: string;
        grandTotal: number;
        notes?: string;
    }) {
        return this.createSalesInvoiceEntry({
            customerLedgerAccountId: invoiceData.customerId,
            amount: invoiceData.grandTotal,
            date: invoiceData.invoiceDate,
            invoiceNumber: invoiceData.invoiceNumber,
            description: `Sales Invoice - ${invoiceData.invoiceNumber}${invoiceData.notes ? ' - ' + invoiceData.notes : ''}`
        });
    }

    // Helper: Create ledger entry from purchase voucher data
    static async createFromPurchaseVoucher(voucherData: {
        supplierId: string;
        voucherNumber: string;
        voucherDate: string;
        grandTotal: number;
        notes?: string;
        partyInvoiceNumber?: string;
    }) {
        return this.createPurchaseVoucherEntry({
            supplierLedgerAccountId: voucherData.supplierId,
            amount: voucherData.grandTotal,
            date: voucherData.voucherDate,
            voucherNumber: voucherData.voucherNumber,
            description: `Purchase Voucher - ${voucherData.partyInvoiceNumber || voucherData.voucherNumber}${voucherData.notes ? ' - ' + voucherData.notes : ''}`
        });
    }

    // === VALIDATION METHODS ===

    // Validate ledger entry before creation
    static async validate(data: LedgerEntryInterface) {
        const response = await fetch(`${API_BASE_URL}/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to validate ledger entry');
        return response.json();
    }

    // Check if ledger account exists
    static async checkLedgerAccount(ledgerAccountId: string) {
        try {
            const response = await this.getBalance(ledgerAccountId);
            return { exists: true, balance: response.balance };
        } catch (error) {
            return { exists: false, error: error instanceof Error ? error.message : 'Account not found' };
        }
    }

    // === REPORTING METHODS ===

    // Get ledger entries summary/statistics
    static async getStats(ledgerAccountId: string, startDate?: string, endDate?: string) {
        const params = new URLSearchParams({ ledgerAccountId });
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        params.append('stats', 'true');
        
        const response = await fetch(`${API_BASE_URL}?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch ledger stats');
        return response.json();
    }

    // Export ledger entries
    static async export(
        ledgerAccountId: string,
        format: 'json' | 'csv' = 'json',
        startDate?: string,
        endDate?: string
    ) {
        const params = new URLSearchParams({
            ledgerAccountId,
            format
        });
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        const response = await fetch(`${API_BASE_URL}/export?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to export ledger entries');
        
        if (format === 'csv') {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ledger_entries_${ledgerAccountId}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            return;
        }
        
        return response.json();
    }
}