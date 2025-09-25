// /server/features/Payment/infrastructure/apiHelper/paymentDocumentApi.ts
import { PaymentDocument, PaymentDocumentInterface, PaymentStatus } from '@/server/features/Payment/core/entities/PaymentDocument';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  count?: number;
}

interface PaymentValidationResult {
  canAcceptPayment: boolean;
  paymentDocument: PaymentDocument | null;
  remainingAmount: number;
  errorMessage?: string;
}

interface PaymentDocumentStatistics {
  totalDocuments: number;
  pendingDocuments: number;
  partialDocuments: number;
  completedDocuments: number;
  totalDocumentAmount: number;
  totalPaidAmount: number;
  totalOutstandingAmount: number;
  averageDocumentAmount: number;
  averageCompletionRate: number;
}

interface PaymentDocumentSummary {
  paymentDocument: PaymentDocument | null;
  progress: {
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    progressPercentage: number;
    status: PaymentStatus;
  } | null;
  canAcceptPayment: boolean;
}

class PaymentDocumentApiError extends Error {
  constructor(message: string, public statusCode?: number, public details?: string) {
    super(message);
    this.name = 'PaymentDocumentApiError';
  }
}

export class PaymentDocumentApi {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/payment-documents') {
    this.baseUrl = baseUrl;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const data: ApiResponse<T> = await response.json();
    
    if (!response.ok || !data.success) {
      throw new PaymentDocumentApiError(
        data.error || 'API request failed',
        response.status,
        data.details
      );
    }

    return data.data as T;
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value.toString());
      });
    }
    
    return url.toString();
  }

  /**
   * Get all payment documents for an FPO
   */
  async getAllPaymentDocuments(fpoId: string): Promise<PaymentDocument[]> {
    const url = this.buildUrl('', { fpoId });
    const response = await fetch(url);
    return this.handleResponse<PaymentDocument[]>(response);
  }

  /**
   * Get payment document by ID
   */
  async getPaymentDocumentById(paymentDocumentId: string): Promise<PaymentDocument> {
    const url = this.buildUrl(`/${paymentDocumentId}`);
    const response = await fetch(url);
    return this.handleResponse<PaymentDocument>(response);
  }

  /**
   * Get payment document by document reference
   */
  async getPaymentDocumentByDocument(
    documentId: string,
    documentType: string,
    fpoId: string
  ): Promise<PaymentDocument> {
    const url = this.buildUrl('/by-document', {
      documentId,
      documentType,
      fpoId
    });
    const response = await fetch(url);
    return this.handleResponse<PaymentDocument>(response);
  }

  /**
   * Validate if a payment amount can be accepted
   */
  async validatePaymentAmount(
    documentId: string,
    documentType: string,
    fpoId: string,
    paymentAmount: number
  ): Promise<PaymentValidationResult> {
    const url = this.buildUrl('/validate-payment', {
      documentId,
      documentType,
      fpoId,
      paymentAmount
    });
    const response = await fetch(url);
    return this.handleResponse<PaymentValidationResult>(response);
  }

  /**
   * Create a new payment document
   */
  async createPaymentDocument(
    paymentDocumentData: PaymentDocumentInterface
  ): Promise<PaymentDocument> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentDocumentData),
    });
    return this.handleResponse<PaymentDocument>(response);
  }

  /**
   * Update payment document
   */
  async updatePaymentDocument(
    paymentDocumentId: string,
    updates: Partial<{
      totalDocumentAmount: number;
      totalPaidAmount: number;
      paymentStatus: PaymentStatus;
    }>
  ): Promise<PaymentDocument> {
    const response = await fetch(`${this.baseUrl}/${paymentDocumentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    return this.handleResponse<PaymentDocument>(response);
  }

  /**
   * Delete payment document
   */
  async deletePaymentDocument(paymentDocumentId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${paymentDocumentId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const data: ApiResponse<void> = await response.json();
      throw new PaymentDocumentApiError(
        data.error || 'Failed to delete payment document',
        response.status,
        data.details
      );
    }
  }

  /**
   * Get payment documents by status
   */
  async getPaymentDocumentsByStatus(
    fpoId: string,
    status: PaymentStatus
  ): Promise<PaymentDocument[]> {
    const url = this.buildUrl('/by-status', { fpoId, status });
    const response = await fetch(url);
    return this.handleResponse<PaymentDocument[]>(response);
  }

  /**
   * Get payment documents by type
   */
  async getPaymentDocumentsByType(
    fpoId: string,
    documentType: string
  ): Promise<PaymentDocument[]> {
    const url = this.buildUrl('/by-type', { fpoId, documentType });
    const response = await fetch(url);
    return this.handleResponse<PaymentDocument[]>(response);
  }

  /**
   * Get pending payment documents
   */
  async getPendingPaymentDocuments(fpoId: string): Promise<PaymentDocument[]> {
    const url = this.buildUrl('/pending', { fpoId });
    const response = await fetch(url);
    return this.handleResponse<PaymentDocument[]>(response);
  }

  /**
   * Get overdue payment documents
   */
  async getOverduePaymentDocuments(
    fpoId: string,
    daysOverdue: number = 30
  ): Promise<PaymentDocument[]> {
    const url = this.buildUrl('/overdue', { fpoId, daysOverdue });
    const response = await fetch(url);
    return this.handleResponse<PaymentDocument[]>(response);
  }

  /**
   * Get payment document statistics
   */
  async getPaymentDocumentStatistics(fpoId: string): Promise<PaymentDocumentStatistics> {
    const url = this.buildUrl('/statistics', { fpoId });
    const response = await fetch(url);
    return this.handleResponse<PaymentDocumentStatistics>(response);
  }

  /**
   * Get payment document summary with progress
   */
  async getPaymentDocumentSummary(
    documentId: string,
    documentType: string,
    fpoId: string
  ): Promise<PaymentDocumentSummary> {
    const url = this.buildUrl('/summary', {
      documentId,
      documentType,
      fpoId
    });
    const response = await fetch(url);
    return this.handleResponse<PaymentDocumentSummary>(response);
  }

  /**
   * Search payment documents
   */
  async searchPaymentDocuments(
    fpoId: string,
    searchTerm: string,
    limit: number = 50
  ): Promise<PaymentDocument[]> {
    const url = this.buildUrl('/search', { fpoId, searchTerm, limit });
    const response = await fetch(url);
    return this.handleResponse<PaymentDocument[]>(response);
  }

  /**
   * Recalculate payment document totals
   */
  async recalculatePaymentDocumentTotals(paymentDocumentId: string): Promise<PaymentDocument> {
    const response = await fetch(`${this.baseUrl}/${paymentDocumentId}/recalculate`, {
      method: 'POST',
    });
    return this.handleResponse<PaymentDocument>(response);
  }

  /**
   * Batch operations for multiple payment documents
   */
  async batchGetPaymentDocuments(paymentDocumentIds: string[]): Promise<PaymentDocument[]> {
    const response = await fetch(`${this.baseUrl}/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: paymentDocumentIds }),
    });
    return this.handleResponse<PaymentDocument[]>(response);
  }

  /**
   * Check if payment document exists
   */
  async paymentDocumentExists(
    documentId: string,
    documentType: string,
    fpoId: string
  ): Promise<boolean> {
    try {
      await this.getPaymentDocumentByDocument(documentId, documentType, fpoId);
      return true;
    } catch (error) {
      if (error instanceof PaymentDocumentApiError && error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get payment documents with pagination
   */
  async getPaymentDocumentsPaginated(
    fpoId: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      status?: PaymentStatus;
      documentType?: string;
      searchTerm?: string;
    }
  ): Promise<{
    documents: PaymentDocument[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const params: Record<string, string | number> = {
      fpoId,
      page,
      pageSize
    };

    if (filters?.status) params.status = filters.status;
    if (filters?.documentType) params.documentType = filters.documentType;
    if (filters?.searchTerm) params.searchTerm = filters.searchTerm;

    const url = this.buildUrl('/paginated', params);
    const response = await fetch(url);
    return this.handleResponse<{
      documents: PaymentDocument[];
      pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    }>(response);
  }
}

// Export singleton instance for easy use
export const paymentDocumentApi = new PaymentDocumentApi();

// Export error class for error handling
export { PaymentDocumentApiError };

// Type exports for convenience
export type {
  PaymentValidationResult,
  PaymentDocumentStatistics,
  PaymentDocumentSummary,
  ApiResponse
};