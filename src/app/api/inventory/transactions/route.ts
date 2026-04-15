import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '@/server/features/inventory/infrastructure/persistence/inventorySupabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const itemId = searchParams.get('item_id');
        const fpoId = searchParams.get('fpo_id');
        const limitParam = searchParams.get('limit');

        if (!itemId) {
            return NextResponse.json(
                { error: 'item_id is required' },
                { status: 400 }
            );
        }

        if (!fpoId) {
            return NextResponse.json(
                { error: 'fpo_id is required' },
                { status: 400 }
            );
        }

        const limit = limitParam ? parseInt(limitParam, 10) : 50;

        const transactions = await InventoryService.getItemTransactions(itemId, fpoId, limit);

        return NextResponse.json({
            success: true,
            data: transactions,
            count: transactions.length
        });

    } catch (error) {
        console.error('Error in GET /api/inventory/transactions:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
