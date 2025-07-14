// Enhanced debugging version of route.ts
import { LedgerGroup, LedgerGroupInterface } from "@/server/features/ledger/core/entities/LedgerGroup";
import { getAllLedgerGroups, addNewLedgerGroupToDB } from "@/server/features/ledger/infrastructure/persistence/ledgerGroupSupabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        // console.log('🚀 API Route GET called');
        
        const { searchParams } = new URL(request.url);
        const fpo_id = searchParams.get('fpo_id');
        
        // console.log('📥 Received fpo_id:', fpo_id);
        
        if (!fpo_id) {
            console.warn('⚠️ No fpo_id provided');
            return NextResponse.json(
                {
                    error: 'FPO ID is required',
                    code: 'MISSING_FPO_ID'
                },
                { status: 400 }
            );
        }

        if (fpo_id.trim().length === 0) {
            console.warn('⚠️ Empty fpo_id provided');
            return NextResponse.json(
                {
                    error: 'FPO ID cannot be empty',
                    code: 'INVALID_FPO_ID'
                },
                { status: 400 }
            );
        }

        // console.log('🔍 Calling getAllLedgerGroups...');
        
        // Get all ledger groups (both default and user-created)
        const allLedgerGroups = await getAllLedgerGroups(fpo_id);
        
        // console.log('📊 getAllLedgerGroups result:', {
        //     count: allLedgerGroups.length,
        //     groups: allLedgerGroups.map(g => ({ 
        //         id: g.id, 
        //         group: g.group, 
        //         parentgroup: g.parentgroup, 
        //         isDefault: g.isDefault 
        //     }))
        // });
        
        return NextResponse.json(allLedgerGroups, { status: 200 });

    } catch (error) {
        console.error('💥 Error in GET /api/ledger/ledgerGroup:', error);
        return NextResponse.json(
            { 
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // console.log('🚀 API Route POST called');
        
        const body = await request.json();
        // console.log('📥 POST body:', body);
        
        const data = await addNewLedgerGroupToDB(body);
        
        // console.log('✅ Successfully created group:', data);
        
        return NextResponse.json(
            { message: `${data.group} group created successfully` },
            { status: 200 }
        );
    } catch (error) {
        // console.error('💥 Error in POST /api/ledger/ledgerGroup:', error);
        return NextResponse.json(
            { 
                error: 'Failed to create ledger group',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}