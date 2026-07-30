import { NextRequest, NextResponse } from "next/server";
import { bulkDeleteLedgerAccounts } from '@/server/features/ledger/infrastructure/persistence/ledgerAccountSupabase';

interface BulkDeleteRequest {
    ids: string[];
}

export async function DELETE(request: NextRequest) {
    try {
        const body: BulkDeleteRequest = await request.json();
        const { ids } = body;

        // Validate request body
        if (!ids || !Array.isArray(ids)) {
            return NextResponse.json(
                { 
                    error: 'Invalid request body',
                    details: 'Request body must contain an array of ledger IDs',
                    code: 'INVALID_REQUEST_BODY'
                },
                { status: 400 }
            );
        }

        // Validate that all IDs are strings
        if (ids.some(id => typeof id !== 'string' || !id.trim())) {
            return NextResponse.json(
                { 
                    error: 'Invalid ledger IDs',
                    details: 'All ledger IDs must be non-empty strings',
                    code: 'INVALID_LEDGER_IDS'
                },
                { status: 400 }
            );
        }

        // Check for empty array
        if (ids.length === 0) {
            return NextResponse.json(
                { 
                    error: 'No ledger IDs provided',
                    details: 'At least one ledger ID is required for bulk deletion',
                    code: 'EMPTY_IDS_ARRAY'
                },
                { status: 400 }
            );
        }

        // Limit the number of IDs to prevent abuse
        if (ids.length > 100) {
            return NextResponse.json(
                { 
                    error: 'Too many ledger IDs',
                    details: 'Maximum 100 ledger accounts can be deleted at once',
                    code: 'TOO_MANY_IDS'
                },
                { status: 400 }
            );
        }

        // Delete the ledger accounts
        await bulkDeleteLedgerAccounts(ids);

        return NextResponse.json(
            { 
                message: 'Ledger accounts deleted successfully',
                deletedCount: ids.length,
                deletedIds: ids
            },
            { status: 200 }
        );

    } catch (error) {
        console.error('Error in DELETE /api/ledger/ledgerAccount/bulk-delete:', error);
        
        // Handle specific error cases
        if (error instanceof Error) {
            if (error.message === 'No ledger IDs provided for deletion') {
                return NextResponse.json(
                    { 
                        error: 'No ledger IDs provided',
                        details: 'Request body must contain ledger IDs',
                        code: 'NO_IDS_PROVIDED'
                    },
                    { status: 400 }
                );
            }
            
            if (error.message.includes('Some ledger accounts not found')) {
                return NextResponse.json(
                    { 
                        error: 'Some ledgers not found',
                        details: error.message,
                        code: 'LEDGERS_NOT_FOUND'
                    },
                    { status: 404 }
                );
            }
            
            if (error.message.includes('Failed to verify ledgers')) {
                return NextResponse.json(
                    { 
                        error: 'Database error',
                        details: 'Unable to verify ledger existence',
                        code: 'DATABASE_ERROR'
                    },
                    { status: 500 }
                );
            }
            
            if (error.message.includes('Failed to delete ledger accounts')) {
                return NextResponse.json(
                    { 
                        error: 'Bulk delete failed',
                        details: error.message,
                        code: 'BULK_DELETE_FAILED'
                    },
                    { status: 500 }
                );
            }
        }

        // Handle JSON parsing errors
        if (error instanceof SyntaxError) {
            return NextResponse.json(
                { 
                    error: 'Invalid JSON',
                    details: 'Request body must be valid JSON',
                    code: 'INVALID_JSON'
                },
                { status: 400 }
            );
        }

        // Generic error response
        return NextResponse.json(
            { 
                error: 'Internal server error',
                details: 'An unexpected error occurred while deleting ledger accounts',
                code: 'INTERNAL_ERROR'
            },
            { status: 500 }
        );
    }
}