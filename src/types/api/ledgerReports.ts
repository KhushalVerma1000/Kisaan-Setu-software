
// types/ledgerReports.ts
export interface ApiResponse<T> {
    status: boolean;
    message: string;
    data: T;
    error?: string;
}

export interface ReportFilters {
    fpoId: string;
    asOfDate?: string;
    fromDate?: string;
    toDate?: string;
}
