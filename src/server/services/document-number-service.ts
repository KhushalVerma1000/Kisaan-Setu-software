/**
 * DocumentNumberService - Universal document numbering system
 * Server-side service for API routes and server actions
 * Supports: invoices, purchase_vouchers, quotations, purchase_orders, sales_orders, etc.
 * 
 * Features:
 * - Auto-generated consecutive numbers per FPO
 * - Customizable prefixes and formats
 * - Preview next numbers without consuming them
 * - Reset and manage sequences
 * - Integration with existing invoice settings
 * 
 * @example
 * import { DocumentNumberService } from '@/server/services/document-number-service';
 * const service = await DocumentNumberService.create();
 * const nextNumber = await service.previewNext('fpo-123', 'purchase_voucher');
 * console.log(nextNumber); // "PV-001"
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';

// Types
export type DocumentType = 
  | 'invoice' 
  | 'purchase_voucher' 
  | 'quotation' 
  | 'purchase_order' 
  | 'sales_order'
  | 'credit_note'
  | 'debit_note'
  | 'delivery_note';

export interface DocumentSequenceSettings {
  id?: string;
  fpoId: string;
  documentType: DocumentType;
  currentNumber: number;
  prefix: string;
  startNumber: number;
  showPrefix: boolean;
  numberFormat: string; // 'XXX' = 3 digits, 'XXXX' = 4 digits, etc.
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SequenceUpdateOptions {
  prefix?: string;
  showPrefix?: boolean;
  numberFormat?: string;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * DocumentNumberService Class
 */
export class DocumentNumberService {
  private supabase: SupabaseClient;

  private constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Create a new DocumentNumberService instance with server client
   */
  static async create(): Promise<DocumentNumberService> {
    const supabase = await createClient();
    return new DocumentNumberService(supabase);
  }

  /**
   * Preview the next document number without generating it
   * Perfect for showing users what number they'll get
   */
  async previewNext(
    fpoId: string, 
    documentType: DocumentType, 
    customPrefix?: string
  ): Promise<ServiceResponse<string>> {
    try {
      const { data, error } = await this.supabase.rpc('preview_next_document_number', {
        p_fpo_id: fpoId,
        p_document_type: documentType,
        p_custom_prefix: customPrefix || null
      });

      if (error) {
        console.error('Preview error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('Preview exception:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Generate a document number manually (usually done automatically by triggers)
   * Use this if you need to generate numbers programmatically
   */
  async generate(
    fpoId: string, 
    documentType: DocumentType, 
    customPrefix?: string
  ): Promise<ServiceResponse<string>> {
    try {
      const { data, error } = await this.supabase.rpc('generate_document_number', {
        p_fpo_id: fpoId,
        p_document_type: documentType,
        p_custom_prefix: customPrefix || null
      });

      if (error) {
        console.error('Generation error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('Generation exception:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Reset document sequence to a specific number
   * Useful for admin operations or starting fresh
   */
  async resetSequence(
    fpoId: string, 
    documentType: DocumentType, 
    resetTo: number = 0
  ): Promise<ServiceResponse<boolean>> {
    try {
      const { data, error } = await this.supabase.rpc('reset_document_sequence', {
        p_fpo_id: fpoId,
        p_document_type: documentType,
        p_reset_to: resetTo
      });

      if (error) {
        console.error('Reset error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || true };
    } catch (error: any) {
      console.error('Reset exception:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Update sequence settings (prefix, format, etc.)
   */
  async updateSettings(
    fpoId: string,
    documentType: DocumentType,
    settings: SequenceUpdateOptions
  ): Promise<ServiceResponse<boolean>> {
    try {
      const { data, error } = await this.supabase.rpc('update_document_sequence_settings', {
        p_fpo_id: fpoId,
        p_document_type: documentType,
        p_prefix: settings.prefix || null,
        p_show_prefix: settings.showPrefix !== undefined ? settings.showPrefix : null,
        p_number_format: settings.numberFormat || null
      });

      if (error) {
        console.error('Update settings error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || true };
    } catch (error: any) {
      console.error('Update settings exception:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Get all sequences for a specific FPO
   */
  async getFpoSequences(fpoId: string): Promise<ServiceResponse<DocumentSequenceSettings[]>> {
    try {
      const { data, error } = await this.supabase
        .from('document_number_sequences')
        .select('*')
        .eq('fpo_id', fpoId)
        .order('document_type');

      if (error) {
        console.error('Get sequences error:', error);
        return { success: false, error: error.message };
      }

      const sequences = (data || []).map((item: any) => ({
        id: item.id,
        fpoId: item.fpo_id,
        documentType: item.document_type,
        currentNumber: item.current_number,
        prefix: item.prefix,
        startNumber: item.start_number,
        showPrefix: item.show_prefix,
        numberFormat: item.number_format,
        createdAt: item.created_at ? new Date(item.created_at) : undefined,
        updatedAt: item.updated_at ? new Date(item.updated_at) : undefined
      }));

      return { success: true, data: sequences };
    } catch (error: any) {
      console.error('Get sequences exception:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Get sequence for a specific document type
   */
  async getSequence(fpoId: string, documentType: DocumentType): Promise<ServiceResponse<DocumentSequenceSettings | null>> {
    try {
      const { data, error } = await this.supabase
        .from('document_number_sequences')
        .select('*')
        .eq('fpo_id', fpoId)
        .eq('document_type', documentType)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found - return null
          return { success: true, data: null };
        }
        console.error('Get sequence error:', error);
        return { success: false, error: error.message };
      }

      const sequence: DocumentSequenceSettings = {
        id: data.id,
        fpoId: data.fpo_id,
        documentType: data.document_type,
        currentNumber: data.current_number,
        prefix: data.prefix,
        startNumber: data.start_number,
        showPrefix: data.show_prefix,
        numberFormat: data.number_format,
        createdAt: data.created_at ? new Date(data.created_at) : undefined,
        updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
      };

      return { success: true, data: sequence };
    } catch (error: any) {
      console.error('Get sequence exception:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Initialize default sequences for a new FPO
   * Call this when creating a new FPO to set up all document types
   */
  async initializeFpo(fpoId: string): Promise<ServiceResponse<boolean>> {
    const defaultSequences: Array<{documentType: DocumentType; prefix: string}> = [
      { documentType: 'invoice', prefix: 'INV-' },
      { documentType: 'purchase_voucher', prefix: 'PV-' },
      { documentType: 'quotation', prefix: 'QT-' },
      { documentType: 'purchase_order', prefix: 'PO-' },
      { documentType: 'sales_order', prefix: 'SO-' },
      { documentType: 'credit_note', prefix: 'CN-' },
      { documentType: 'debit_note', prefix: 'DN-' },
      { documentType: 'delivery_note', prefix: 'DEL-' }
    ];

    try {
      const sequencesToInsert = defaultSequences.map(seq => ({
        fpo_id: fpoId,
        document_type: seq.documentType,
        current_number: 0,
        prefix: seq.prefix,
        start_number: 1,
        show_prefix: true,
        number_format: 'XXX'
      }));

      const { error } = await this.supabase
        .from('document_number_sequences')
        .upsert(sequencesToInsert, {
          onConflict: 'fpo_id,document_type'
        });

      if (error) {
        console.error('Initialize FPO error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: true };
    } catch (error: any) {
      console.error('Initialize FPO exception:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Run migration for existing FPOs (import existing document numbers)
   * Only run this once when setting up the system
   */
  async migrateExistingSequences(): Promise<ServiceResponse<boolean>> {
    try {
      const { data, error } = await this.supabase.rpc('migrate_existing_sequences');

      if (error) {
        console.error('Migration error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || true };
    } catch (error: any) {
      console.error('Migration exception:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Get next numbers for multiple document types at once
   * Useful for dashboard previews
   */
  async previewMultiple(
    fpoId: string, 
    documentTypes: DocumentType[]
  ): Promise<ServiceResponse<Record<DocumentType, string>>> {
    try {
      const results: Record<string, string> = {};
      
      // Run previews in parallel
      const previews = await Promise.allSettled(
        documentTypes.map(async (type) => {
          const result = await this.previewNext(fpoId, type);
          return { type, result };
        })
      );

      // Process results
      for (const preview of previews) {
        if (preview.status === 'fulfilled') {
          const { type, result } = preview.value;
          if (result.success && result.data) {
            results[type] = result.data;
          } else {
            console.warn(`Preview failed for ${type}:`, result.error);
            results[type] = 'Error';
          }
        } else {
          console.warn('Preview promise rejected:', preview.reason);
        }
      }

      return { success: true, data: results as Record<DocumentType, string> };
    } catch (error: any) {
      console.error('Preview multiple exception:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Validate document number format
   */
  isValidDocumentNumber(documentNumber: string, expectedPrefix?: string): boolean {
    if (!documentNumber || documentNumber.trim() === '') {
      return false;
    }

    // If prefix is expected, check for it
    if (expectedPrefix) {
      if (!documentNumber.startsWith(expectedPrefix)) {
        return false;
      }
      
      // Extract number part and validate it's numeric
      const numberPart = documentNumber.substring(expectedPrefix.length);
      return /^\d+$/.test(numberPart);
    }

    // Generic validation - should contain at least one digit
    return /\d/.test(documentNumber);
  }

  /**
   * Extract number from document number string
   */
  extractNumber(documentNumber: string): number | null {
    const match = documentNumber.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Get default prefix for document type
   */
  getDefaultPrefix(documentType: DocumentType): string {
    const prefixes: Record<DocumentType, string> = {
      invoice: 'INV-',
      purchase_voucher: 'PV-',
      quotation: 'QT-',
      purchase_order: 'PO-',
      sales_order: 'SO-',
      credit_note: 'CN-',
      debit_note: 'DN-',
      delivery_note: 'DEL-'
    };

    return prefixes[documentType] || 'DOC-';
  }
}

/**
 * Usage Examples for Server-side API routes and Server Actions:
 * 
 * // API Route usage (app/api/documents/preview/route.ts)
 * import { DocumentNumberService } from '@/server/services/document-number-service';
 * 
 * export async function POST(request: Request) {
 *   const service = await DocumentNumberService.create();
 *   const { fpoId, documentType } = await request.json();
 *   
 *   const preview = await service.previewNext(fpoId, documentType);
 *   return Response.json(preview);
 * }
 * 
 * // Server Action usage
 * 'use server';
 * import { DocumentNumberService } from '@/server/services/document-number-service';
 * 
 * export async function generateDocumentNumber(fpoId: string, documentType: DocumentType) {
 *   const service = await DocumentNumberService.create();
 *   return await service.generate(fpoId, documentType);
 * }
 * 
 * // Initialize new FPO with all document types
 * const service = await DocumentNumberService.create();
 * await service.initializeFpo('new-fpo-id');
 * 
 * // Get all sequences for an FPO
 * const sequences = await service.getFpoSequences('fpo-123');
 * if (sequences.success) {
 *   console.log('All sequences:', sequences.data);
 * }
 * 
 * // Update sequence settings
 * await service.updateSettings('fpo-123', 'invoice', {
 *   prefix: 'INVOICE-',
 *   showPrefix: true,
 *   numberFormat: 'XXXX'
 * });
 * 
 * // Preview multiple document types at once
 * const previews = await service.previewMultiple('fpo-123', ['invoice', 'purchase_order']);
 * if (previews.success) {
 *   console.log('Next numbers:', previews.data); // { invoice: "INV-001", purchase_order: "PO-001" }
 * }
 * 
 * // Utility functions (no async needed)
 * const service = await DocumentNumberService.create();
 * const isValid = service.isValidDocumentNumber('INV-001', 'INV-');
 * const number = service.extractNumber('INV-001'); // returns 1
 * const prefix = service.getDefaultPrefix('invoice'); // returns 'INV-'
 */