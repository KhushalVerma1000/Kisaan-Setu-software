import { ApiResponse } from "@/types/api/ledgerReports";


export class LedgerReportsAPI {
    private static baseUrl = '/api/reports';

    static async generateBalanceSheet(
        fpoId: string, 
        asOfDate?: Date
    ): Promise<ApiResponse<any>> {
        const params = new URLSearchParams({ fpoId });
        if (asOfDate) {
            params.append('asOfDate', asOfDate.toISOString());
        }

        const response = await fetch(`${this.baseUrl}/balance-sheet?${params}`);
        return response.json();
    }

    static async generateTrialBalance(
        fpoId: string, 
        asOfDate?: Date
    ): Promise<ApiResponse<any>> {
        const params = new URLSearchParams({ fpoId });
        if (asOfDate) {
            params.append('asOfDate', asOfDate.toISOString());
        }

        const response = await fetch(`${this.baseUrl}/trial-balance?${params}`);
        return response.json();
    }

    static async generateProfitLoss(
        fpoId: string, 
        fromDate: Date, 
        toDate: Date
    ): Promise<ApiResponse<any>> {
        const params = new URLSearchParams({ 
            fpoId,
            fromDate: fromDate.toISOString(),
            toDate: toDate.toISOString()
        });

        const response = await fetch(`${this.baseUrl}/profit-loss?${params}`);
        return response.json();
    }

    static async generateComprehensiveReports(
        fpoId: string,
        options?: {
            asOfDate?: Date;
            fromDate?: Date;
            toDate?: Date;
        }
    ): Promise<ApiResponse<any>> {
        const params = new URLSearchParams({ fpoId });
        
        if (options?.asOfDate) {
            params.append('asOfDate', options.asOfDate.toISOString());
        }
        if (options?.fromDate) {
            params.append('fromDate', options.fromDate.toISOString());
        }
        if (options?.toDate) {
            params.append('toDate', options.toDate.toISOString());
        }

        const response = await fetch(`${this.baseUrl}/comprehensive?${params}`);
        return response.json();
    }
}
