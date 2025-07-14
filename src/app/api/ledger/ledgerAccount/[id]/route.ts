// /api/ledger/ledgerAccount/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { deleteLedgerAccount, getLedgerAccountById, updateLedgerAccount } from '@/server/features/ledger/infrastructure/persistence/ledgerAccountSupabase';
import { LedgerAccountInterface } from '@/server/features/ledger/core/entities/Ledger';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { error: 'Ledger account ID is required' },
                { status: 400 }
            );
        }

        const ledgerAccount = await getLedgerAccountById(id);
        
        if (!ledgerAccount) {
            return NextResponse.json(
                { error: 'Ledger account not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(ledgerAccount, { status: 200 });
    } catch (error) {
        console.error('Error in GET /api/ledger/ledgerAccount/[id]:', error);
        return NextResponse.json(
            { 
                error: 'Failed to fetch ledger account',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        if (!id) {
            return NextResponse.json(
                { error: 'Ledger account ID is required' },
                { status: 400 }
            );
        }

        // Validate required fields
        if (!body.name || !body.groupName || !body.fpoId) {
            return NextResponse.json(
                { error: 'Missing required fields: name, groupName, and fpoId are required' },
                { status: 400 }
            );
        }

        // Parse opening date if provided
        let openingDate: Date | undefined;
        if (body.openingDate) {
            openingDate = new Date(body.openingDate);
            if (isNaN(openingDate.getTime())) {
                return NextResponse.json(
                    { error: 'Invalid opening date format' },
                    { status: 400 }
                );
            }
        }

        // Validate GST number format if provided (basic validation)
        if (body.gstNumber && body.gstNumber.length > 0) {
            const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
            if (!gstRegex.test(body.gstNumber)) {
                return NextResponse.json(
                    { error: 'Invalid GST number format' },
                    { status: 400 }
                );
            }
        }

        // Create updated ledger account data
        const updatedLedgerAccountData: LedgerAccountInterface = {
            name: body.name.trim(),
            groupName: body.groupName,
            openingBalance: body.amount || 0,
            balanceType: body.amountType || 'Cr',
            phoneNumber: body.phoneNumber?.trim() || undefined,
            address: body.address?.trim() || undefined,
            fpoId: body.fpoId,
            gstNumber: body.gstNumber?.trim() || undefined,
            openingDate: openingDate,
            state: body.state || undefined,
        };

        const updatedLedgerAccount = await updateLedgerAccount(id, updatedLedgerAccountData);
        
        return NextResponse.json(
            { 
                message: 'Ledger account updated successfully',
                data: updatedLedgerAccount
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error in PUT /api/ledger/ledgerAccount/[id]:', error);
        return NextResponse.json(
            { 
                error: 'Failed to update ledger account',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Await the params before destructuring
        const { id } = await params;

        // Validate ledger ID
        if (!id || typeof id !== 'string') {
            return NextResponse.json(
                { 
                    error: 'Invalid ledger ID',
                    details: 'Ledger ID is required and must be a string',
                    code: 'INVALID_LEDGER_ID'
                },
                { status: 400 }
            );
        }

        // Delete the ledger account
        await deleteLedgerAccount(id);

        return NextResponse.json(
            { 
                message: 'Ledger account deleted successfully',
                id: id
            },
            { status: 200 }
        );

    } catch (error) {
        console.error('Error in DELETE /api/ledger/ledgerAccount/[id]:', error);
        
        // Handle specific error cases
        if (error instanceof Error) {
            if (error.message === 'Ledger account not found') {
                return NextResponse.json(
                    { 
                        error: 'Ledger not found',
                        details: 'The specified ledger account does not exist',
                        code: 'LEDGER_NOT_FOUND'
                    },
                    { status: 404 }
                );
            }
            
            if (error.message.includes('Failed to verify ledger')) {
                return NextResponse.json(
                    { 
                        error: 'Database error',
                        details: 'Unable to verify ledger existence',
                        code: 'DATABASE_ERROR'
                    },
                    { status: 500 }
                );
            }
            
            if (error.message.includes('Failed to delete ledger account')) {
                return NextResponse.json(
                    { 
                        error: 'Delete failed',
                        details: error.message,
                        code: 'DELETE_FAILED'
                    },
                    { status: 500 }
                );
            }
        }

        // Generic error response
        return NextResponse.json(
            { 
                error: 'Internal server error',
                details: 'An unexpected error occurred while deleting the ledger account',
                code: 'INTERNAL_ERROR'
            },
            { status: 500 }
        );
    }
}