// server/core/transaction/TransactionManager.ts
import { createClient } from '@/utils/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

export interface TransactionContext {
  client: SupabaseClient;
  transactionId: string;
  isActive: boolean;
}

export class TransactionManager {
  private static instance: TransactionManager;
  private activeTransactions: Map<string, TransactionContext> = new Map();

  private constructor() {}

  static getInstance(): TransactionManager {
    if (!TransactionManager.instance) {
      TransactionManager.instance = new TransactionManager();
    }
    return TransactionManager.instance;
  }

  /**
   * Begin a new transaction and return transaction context
   */
  async beginTransaction(): Promise<TransactionContext> {
    const client = await createClient();
    const transactionId = this.generateTransactionId();
    
    try {
      // Call the database function to begin transaction
      const { error } = await client.rpc('begin_transaction', { 
        transaction_id: transactionId 
      });
      
      if (error) {
        throw new Error(`Failed to begin transaction: ${error.message}`);
      }

      const context: TransactionContext = {
        client,
        transactionId,
        isActive: true
      };

      this.activeTransactions.set(transactionId, context);
      
      console.log(`Transaction started: ${transactionId}`);
      return context;
      
    } catch (error) {
      console.error('Error beginning transaction:', error);
      throw error;
    }
  }

  /**
   * Commit a transaction
   */
  async commitTransaction(context: TransactionContext): Promise<void> {
    if (!context.isActive) {
      throw new Error('Transaction is not active');
    }

    try {
      const { error } = await context.client.rpc('commit_transaction', {
        transaction_id: context.transactionId
      });

      if (error) {
        throw new Error(`Failed to commit transaction: ${error.message}`);
      }

      context.isActive = false;
      this.activeTransactions.delete(context.transactionId);
      
      console.log(`Transaction committed: ${context.transactionId}`);
      
    } catch (error) {
      console.error('Error committing transaction:', error);
      // Still mark as inactive and cleanup
      context.isActive = false;
      this.activeTransactions.delete(context.transactionId);
      throw error;
    }
  }

  /**
   * Rollback a transaction
   */
  async rollbackTransaction(context: TransactionContext): Promise<void> {
    if (!context.isActive) {
      return; // Already inactive, nothing to rollback
    }

    try {
      const { error } = await context.client.rpc('rollback_transaction', {
        transaction_id: context.transactionId
      });

      if (error) {
        console.error(`Failed to rollback transaction: ${error.message}`);
      }

      context.isActive = false;
      this.activeTransactions.delete(context.transactionId);
      
      console.log(`Transaction rolled back: ${context.transactionId}`);
      
    } catch (error) {
      console.error('Error rolling back transaction:', error);
      // Still cleanup
      context.isActive = false;
      this.activeTransactions.delete(context.transactionId);
    }
  }

  /**
   * Execute operations within a transaction
   */
  async executeInTransaction<T>(
    operation: (context: TransactionContext) => Promise<T>
  ): Promise<T> {
    const context = await this.beginTransaction();
    
    try {
      const result = await operation(context);
      await this.commitTransaction(context);
      return result;
      
    } catch (error) {
      await this.rollbackTransaction(context);
      throw error;
    }
  }

  /**
   * Get active transaction count (for monitoring)
   */
  getActiveTransactionCount(): number {
    return this.activeTransactions.size;
  }

  /**
   * Cleanup inactive transactions (for maintenance)
   */
  cleanupInactiveTransactions(): void {
    for (const [id, context] of this.activeTransactions.entries()) {
      if (!context.isActive) {
        this.activeTransactions.delete(id);
      }
    }
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance export
export const transactionManager = TransactionManager.getInstance();