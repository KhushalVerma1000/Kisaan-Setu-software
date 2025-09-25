// server/services/application/BaseApplicationService.ts
import { createClient } from '@/utils/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { transactionManager, TransactionContext } from '@/utils/supabase/transaction/TransactionManager';

export abstract class BaseApplicationService {
  protected transactionContext?: TransactionContext;

  /**
   * Get Supabase client - uses transaction context if available
   */
  protected async getSupabaseClient(): Promise<SupabaseClient> {
    if (this.transactionContext && this.transactionContext.isActive) {
      return this.transactionContext.client;
    }
    return await createClient();
  }

  /**
   * Execute operations in a transaction
   * This is the main method you'll use in your services
   */
  protected async executeInTransaction<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    return transactionManager.executeInTransaction(async (context) => {
      // Set transaction context for this service instance
      const previousContext = this.transactionContext;
      this.transactionContext = context;
      
      try {
        const result = await operation();
        return result;
      } finally {
        // Restore previous context
        this.transactionContext = previousContext;
      }
    });
  }

  /**
   * Execute operations with an existing transaction context
   * Use this when you want to participate in a parent transaction
   */
  protected async executeWithContext<T>(
    context: TransactionContext,
    operation: () => Promise<T>
  ): Promise<T> {
    const previousContext = this.transactionContext;
    this.transactionContext = context;
    
    try {
      const result = await operation();
      return result;
    } finally {
      this.transactionContext = previousContext;
    }
  }

  /**
   * Check if currently running in a transaction
   */
  protected isInTransaction(): boolean {
    return !!(this.transactionContext && this.transactionContext.isActive);
  }

  /**
   * Get current transaction ID (for logging/debugging)
   */
  protected getCurrentTransactionId(): string | null {
    return this.transactionContext?.transactionId || null;
  }

  /**
   * Validation helper
   */
  protected validateInput(data: any, schema: any): boolean {
    // Add your validation logic here
    return true;
  }

  /**
   * Log with transaction context
   */
  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const txnId = this.getCurrentTransactionId();
    const logMessage = txnId ? `[TXN:${txnId}] ${message}` : message;
    
    switch (level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }
}