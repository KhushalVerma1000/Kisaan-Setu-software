
// Client-side API helper functions
// @/server/features/purchase/infrastructure/purchaseVoucher/purchaseVoucherApi.ts
import { PurchaseVoucherInterface } from '@/server/features/purchase/core/entities/PurchaseVoucher';

const API_BASE_URL = '/api/purchase/purchase-vouchers';

export class PurchaseVoucherAPI {
    // Get all purchase vouchers
    static async getAll(fpoId: string) {
        const response = await fetch(`${API_BASE_URL}?fpoId=${fpoId}`);
        if (!response.ok) throw new Error('Failed to fetch purchase vouchers');
        return response.json();
    }

    // Get purchase voucher by ID
    static async getById(id: string) {
        const response = await fetch(`${API_BASE_URL}/${id}`);
        if (!response.ok) throw new Error('Failed to fetch purchase voucher');
        return response.json();
    }

    // Create purchase voucher
    static async create(data: PurchaseVoucherInterface) {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create purchase voucher');
        return response.json();
    }

    // Update purchase voucher
    static async update(id: string, data: PurchaseVoucherInterface) {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update purchase voucher');
        return response.json();
    }

    // Delete purchase voucher
    static async delete(id: string) {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete purchase voucher');
        return response.json();
    }

    // Update status
    static async updateStatus(id: string, status: 'draft' | 'approved' | 'rejected') {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status }),
        });
        if (!response.ok) throw new Error('Failed to update status');
        return response.json();
    }

    // Search purchase vouchers
    static async search(fpoId: string, searchTerm: string) {
        const response = await fetch(`${API_BASE_URL}?fpoId=${fpoId}&search=${encodeURIComponent(searchTerm)}`);
        if (!response.ok) throw new Error('Failed to search purchase vouchers');
        return response.json();
    }

    // Get by status
    static async getByStatus(fpoId: string, status: 'draft' | 'approved' | 'rejected') {
        const response = await fetch(`${API_BASE_URL}?fpoId=${fpoId}&status=${status}`);
        if (!response.ok) throw new Error('Failed to fetch purchase vouchers by status');
        return response.json();
    }

    // Get by date range
    static async getByDateRange(fpoId: string, startDate: string, endDate: string) {
        const response = await fetch(`${API_BASE_URL}?fpoId=${fpoId}&startDate=${startDate}&endDate=${endDate}`);
        if (!response.ok) throw new Error('Failed to fetch purchase vouchers by date range');
        return response.json();
    }

    // Get by supplier
    static async getBySupplier(fpoId: string, supplierId: string) {
        const response = await fetch(`${API_BASE_URL}/supplier/${supplierId}?fpoId=${fpoId}`);
        if (!response.ok) throw new Error('Failed to fetch purchase vouchers by supplier');
        return response.json();
    }

    // Get statistics
    static async getStats(fpoId: string) {
        const response = await fetch(`${API_BASE_URL}?fpoId=${fpoId}&stats=true`);
        if (!response.ok) throw new Error('Failed to fetch purchase voucher stats');
        return response.json();
    }

    // Validate purchase voucher
    static async validate(data: PurchaseVoucherInterface) {
        const response = await fetch(`${API_BASE_URL}/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to validate purchase voucher');
        return response.json();
    }

    // Export purchase vouchers
    static async export(fpoId: string, format: 'json' | 'csv' = 'json') {
        const response = await fetch(`${API_BASE_URL}/export?fpoId=${fpoId}&format=${format}`);
        if (!response.ok) throw new Error('Failed to export purchase vouchers');
        
        if (format === 'csv') {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `purchase_vouchers_${fpoId}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            return;
        }
        
        return response.json();
    }

    // Bulk delete
    static async bulkDelete(ids: string[]) {
        const response = await fetch(`${API_BASE_URL}?ids=${ids.join(',')}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to bulk delete purchase vouchers');
        return response.json();
    }
}