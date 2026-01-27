import { createClient } from "@/utils/supabase/server";
import { InventoryTransaction, InventoryTransactionInterface } from "../../core/entities/InventoryTransaction";

export class InventoryService {

    // Create a new inventory transaction
    static async createInventoryTransaction(transactionData: InventoryTransactionInterface): Promise<InventoryTransaction | null> {
        try {
            const supabase = await createClient();

            // If stockBefore/After are not properly set, we might want to fetch current stock here
            // But for efficiency, we assume the caller or the DB handles it, or we just rely on recalculation.
            // However, the DB constraint requires them.

            if (transactionData.stockBefore === undefined || transactionData.stockAfter === undefined) {
                // Fetch current stock
                const { data: itemData, error: itemError } = await supabase
                    .from('items')
                    .select('current_stock')
                    .eq('id', transactionData.itemId)
                    .single();

                if (!itemError && itemData) {
                    transactionData.stockBefore = Number(itemData.current_stock || 0);

                    // Calculate stockAfter based on transaction type
                    let changeInStock = transactionData.quantity;
                    if (transactionData.transactionType === 'sale') {
                        changeInStock = -Math.abs(transactionData.quantity);
                    } else if (['purchase', 'opening'].includes(transactionData.transactionType)) {
                        changeInStock = Math.abs(transactionData.quantity);
                    }

                    transactionData.stockAfter = transactionData.stockBefore + changeInStock;
                } else {
                    // Fallback
                    transactionData.stockBefore = 0;
                    let changeInStock = transactionData.quantity;
                    if (transactionData.transactionType === 'sale') {
                        changeInStock = -Math.abs(transactionData.quantity);
                    }
                    transactionData.stockAfter = changeInStock;
                }
            }

            const transaction = new InventoryTransaction(transactionData);
            const dbData = transaction.toDbFormat();

            // Remove undefined ID (let DB generate)
            delete dbData.id;

            const { data, error } = await supabase
                .from('inventory_transactions')
                .insert(dbData)
                .select()
                .single();

            if (error) {
                console.error("Error creating inventory transaction:", error);
                return null;
            }

            return InventoryTransaction.fromDbFormat(data);
        } catch (error) {
            console.error("Unexpected error in createInventoryTransaction:", error);
            return null;
        }
    }

    // Recalculate stock for an item using RPC
    static async recalculateItemStock(itemId: string, fpoId: string): Promise<number | null> {
        try {
            const supabase = await createClient();

            const { data, error } = await supabase.rpc('recalculate_item_stock', {
                p_item_id: itemId,
                p_fpo_id: fpoId
            });

            if (error) {
                console.error(`Error recalculating stock for item ${itemId}:`, error);
                return null;
            }

            return Number(data);
        } catch (error) {
            console.error("Unexpected error in recalculateItemStock:", error);
            return null;
        }
    }

    // Get transactions for an item
    static async getItemTransactions(itemId: string, fpoId: string, limit = 50): Promise<InventoryTransaction[]> {
        try {
            const supabase = await createClient();

            const { data, error } = await supabase
                .from('inventory_transactions')
                .select('*')
                .eq('item_id', itemId)
                .eq('fpo_id', fpoId)
                .order('transaction_date', { ascending: false })
                .limit(limit);

            if (error) {
                console.error("Error fetching item transactions:", error);
                return [];
            }

            return (data || []).map(InventoryTransaction.fromDbFormat);
        } catch (error) {
            console.error("Unexpected error getting item transactions:", error);
            return [];
        }
    }
}
