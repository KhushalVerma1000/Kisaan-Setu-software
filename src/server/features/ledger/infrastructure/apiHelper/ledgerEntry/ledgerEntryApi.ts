// Enhanced Client-side API helper functions
// @/server/features/ledger/infrastructure/ledgerEntry/ledgerEntryApi.ts
import { LedgerEntryInterface } from '@/server/features/ledger/core/entities/Ledger';

const API_BASE_URL = '/api/ledger/ledger-entries';

export class LedgerEntryAPI {
    // Get all ledger entries for a ledger account
    static async getAll(ledgerAccountId: string) {
        const response = await fetch(`${API_BASE_URL}?ledgerAccountId=${ledgerAccountId}`);
        if (!response.ok) throw new Error('Failed to fetch ledger entries');
        const data = await response.json();
        return data.entries; // Return entries array directly
    }

    // Get ledger entry by ID
    static async getById(id: string) {
        const response = await fetch(`${API_BASE_URL}/${id}`);
        if (!response.ok) throw new Error('Failed to fetch ledger entry');
        const data = await response.json();
        return data.entry; // Return entry object directly
    }

    
    // Get ledger entry by document ID (single entry)
    static async getByDocumentId(documentId: string) {
        const response = await fetch(`${API_BASE_URL}/document/${documentId}`);
        if (!response.ok) {
            if (response.status === 404) {
                return null; // No entry found
            }
            throw new Error('Failed to fetch ledger entry by document ID');
        }
        const data = await response.json();
        return data.entry; // Return entry object directly
    }

    // Get all ledger entries by document ID (multiple entries possible)
    static async getAllByDocumentId(documentId: string) {
        const response = await fetch(`${API_BASE_URL}/document/${documentId}/all`);
        if (!response.ok) throw new Error('Failed to fetch ledger entries by document ID');
        const data = await response.json();
        return data.entries; // Return entries array directly
    }

    // Check if document has ledger entries
    static async hasLedgerEntries(documentId: string) {
        try {
            const entries = await this.getAllByDocumentId(documentId);
            return { exists: true, count: entries.length, entries };
        } catch (error) {
            return { 
                exists: false, 
                count: 0, 
                entries: [],
                error: error instanceof Error ? error.message : 'Document not found' 
            };
        }
    }

    // Delete ledger entries by document ID (useful when deleting a document)
    static async deleteByDocumentId(documentId: string) {
        const response = await fetch(`${API_BASE_URL}/document/${documentId}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete ledger entries by document ID');
        const result = await response.json();
        return result; // Return result with count of deleted entries
    }

    // Get ledger entries by document type
    static async getByDocumentType(documentType: string, limit?: number) {
        const params = new URLSearchParams({ documentType });
        if (limit) params.append('limit', limit.toString());
        
        const response = await fetch(`${API_BASE_URL}/by-document-type?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch ledger entries by document type');
        const data = await response.json();
        return data.entries; // Return entries array directly
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
        const result = await response.json();
        return result.entry; // Return entry object directly
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
        const result = await response.json();
        return result.entry; // Return entry object directly
    }

    // Delete ledger entry
    static async delete(id: string) {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete ledger entry');
        const result = await response.json();
        return result.message; // Return success message
    }

    // Get ledger balance for an account
    static async getBalance(ledgerAccountId: string) {
        const response = await fetch(`${API_BASE_URL}/balance?ledgerAccountId=${ledgerAccountId}`);
        if (!response.ok) throw new Error('Failed to fetch ledger balance');
        const data = await response.json();
        return data.balance; // Return balance directly
    }

    // Get ledger statement
    static async getStatement(ledgerAccountId: string, startDate?: string, endDate?: string) {
        const params = new URLSearchParams({ ledgerAccountId });
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        const response = await fetch(`${API_BASE_URL}/statement?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch ledger statement');
        return response.json(); // Return full ledger with statement object
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
        const result = await response.json();
        return result.message; // Return success message
    }

    // Create opening balance entry
    static async createOpeningBalance(ledgerAccountId: string) {
        const response = await fetch(`${API_BASE_URL}/opening-balance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ledgerAccountId }),
        });
        if (!response.ok) throw new Error('Failed to create opening balance entry');
        const result = await response.json();
        return result.entry; // Return entry object directly
    }

    // === TRANSACTION-SPECIFIC METHODS ===

    // Create sales invoice ledger entry
 
     // Updated transaction methods
     static async createSalesInvoiceEntry(data: {
         customerLedgerAccountId: string;
         amount: number;
         date: string;
         invoiceId: string;        // Changed from invoiceNumber
         invoiceNumber: string;    // Added for display
         customerName?: string;
     }) {
         const response = await fetch(`${API_BASE_URL}/transactions/sales`, {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
             },
             body: JSON.stringify(data),
         });
         if (!response.ok) throw new Error('Failed to create sales invoice ledger entry');
         const result = await response.json();
         return result.entry;
     }
 
     static async createPurchaseVoucherEntry(data: {
         supplierLedgerAccountId: string;
         amount: number;
         date: string;
         voucherId: string;        // Changed from voucherNumber
         voucherNumber: string;    // Added for display
         supplierName?: string;
     }) {
         const response = await fetch(`${API_BASE_URL}/transactions/purchase`, {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
             },
             body: JSON.stringify(data),
         });
         if (!response.ok) throw new Error('Failed to create purchase voucher ledger entry');
         const result = await response.json();
         return result.entry;
     }
 
     static async createPaymentInEntry(data: {
         customerLedgerAccountId: string;
         amount: number;
         date: string;
         paymentId: string;        // Changed from receiptNumber
         receiptNumber: string;    // Added for display
         customerName?: string;
     }) {
         const response = await fetch(`${API_BASE_URL}/transactions/payment-in`, {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
             },
             body: JSON.stringify(data),
         });
         if (!response.ok) throw new Error('Failed to create payment in ledger entry');
         const result = await response.json();
         return result.entry;
     }
 
     static async createPaymentOutEntry(data: {
         supplierLedgerAccountId: string;
         amount: number;
         date: string;
         paymentId: string;        // Changed from paymentNumber
         paymentNumber: string;    // Added for display
         supplierName?: string;
     }) {
         const response = await fetch(`${API_BASE_URL}/transactions/payment-out`, {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
             },
             body: JSON.stringify(data),
         });
         if (!response.ok) throw new Error('Failed to create payment out ledger entry');
         const result = await response.json();
         return result.entry;
     }
 
     // Updated helper methods
     static async createFromInvoice(invoiceData: {
         invoiceId: string;        // Added invoice ID
         customerId: string;
         customerName?: string;
         invoiceNumber: string;
         invoiceDate: string;
         grandTotal: number;
         notes?: string;
     }) {
         return this.createSalesInvoiceEntry({
             customerLedgerAccountId: invoiceData.customerId,
             customerName: invoiceData.customerName,
             amount: invoiceData.grandTotal,
             date: invoiceData.invoiceDate,
             invoiceId: invoiceData.invoiceId,        // Use invoice ID
             invoiceNumber: invoiceData.invoiceNumber  // Display number
         });
     }
 
     static async createFromPurchaseVoucher(voucherData: {
         voucherId: string;        // Added voucher ID
         supplierId: string;
         supplierName?: string;
         voucherNumber: string;
         voucherDate: string;
         grandTotal: number;
         notes?: string;
         partyInvoiceNumber?: string;
     }) {
         return this.createPurchaseVoucherEntry({
             supplierLedgerAccountId: voucherData.supplierId,
             supplierName: voucherData.supplierName,
             amount: voucherData.grandTotal,
             date: voucherData.voucherDate,
             voucherId: voucherData.voucherId,        // Use voucher ID
             voucherNumber: voucherData.voucherNumber  // Display number
         });
     }
 
    // === UTILITY METHODS ===

    // Check if ledger account exists by trying to get its balance
    static async checkLedgerAccount(ledgerAccountId: string) {
        try {
            const balance = await this.getBalance(ledgerAccountId);
            return { exists: true, balance };
        } catch (error) {
            return { 
                exists: false, 
                error: error instanceof Error ? error.message : 'Account not found' 
            };
        }
    }

    // Search ledger entries (if implemented on backend)
    static async search(ledgerAccountId: string, searchTerm: string) {
        const response = await fetch(
            `${API_BASE_URL}?ledgerAccountId=${ledgerAccountId}&search=${encodeURIComponent(searchTerm)}`
        );
        if (!response.ok) throw new Error('Failed to search ledger entries');
        const data = await response.json();
        return data.entries; // Return entries array directly
    }

    // Get ledger entries by date range (if implemented on backend)
    static async getByDateRange(ledgerAccountId: string, startDate: string, endDate: string) {
        const response = await fetch(
            `${API_BASE_URL}?ledgerAccountId=${ledgerAccountId}&startDate=${startDate}&endDate=${endDate}`
        );
        if (!response.ok) throw new Error('Failed to fetch ledger entries by date range');
        const data = await response.json();
        return data.entries; // Return entries array directly
    }

    // Get paginated ledger entries (if implemented on backend)
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
        return response.json(); // Return full pagination object
    }

    // === VALIDATION METHODS ===

    // Validate ledger entry before creation (if implemented on backend)
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

    // === REPORTING METHODS ===

    // Get ledger entries summary/statistics (if implemented on backend)
    static async getStats(ledgerAccountId: string, startDate?: string, endDate?: string) {
        const params = new URLSearchParams({ ledgerAccountId });
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        params.append('stats', 'true');
        
        const response = await fetch(`${API_BASE_URL}?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch ledger stats');
        return response.json();
    }

    // Export ledger entries (if implemented on backend)
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