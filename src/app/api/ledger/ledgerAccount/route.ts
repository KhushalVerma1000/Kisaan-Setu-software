// /api/ledger/ledgerAccount/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createNewLedgerAccount, getAllUserAssociatedLedgerAccount } from '@/server/features/ledger/infrastructure/persistence/ledgerAccountSupabase';
import { LedgerAccountInterface } from '@/server/features/ledger/core/entities/Ledger';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const fpoId = searchParams.get('fpo_id');

        if (!fpoId) {
            return NextResponse.json(
                { error: 'FPO ID is required' },
                { status: 400 }
            );
        }

        const ledgerAccounts = await getAllUserAssociatedLedgerAccount(fpoId);
        
        return NextResponse.json(ledgerAccounts, { status: 200 });
    } catch (error) {
        console.error('Error in GET /api/ledger/ledgerAccount:', error);
        return NextResponse.json(
            { 
                error: 'Failed to fetch ledger accounts',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

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

        // Create new ledger account data
        const newLedgerAccountData: LedgerAccountInterface = {
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

        const newLedgerAccount = await createNewLedgerAccount(newLedgerAccountData);
        
        return NextResponse.json(
            { 
                message: 'Ledger account created successfully',
                data: newLedgerAccount
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error in POST /api/ledger/ledgerAccount:', error);
        return NextResponse.json(
            { 
                error: 'Failed to create ledger account',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}