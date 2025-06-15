import { SupabaseClient } from '@supabase/supabase-js';
import { IFPORepository } from '@/server/core/interfaces/IFPORepository';
import { FPOProfile, FPOCompleteDetails } from '@/server/core/entities/fpo';

export class SupabaseFPORepository implements IFPORepository {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  async updateProfile(fpoId: string, data: Partial<Omit<FPOProfile, 'id'>>): Promise<FPOProfile> {
    const { data: updatedProfile, error } = await this.supabase
      .from('fpo_profiles')
      .update({ ...data, updated_at: new Date() }) // Also update the timestamp
      .eq('id', fpoId)
      .select()
      .single();

    if (error) {
      console.error('Error updating FPO profile:', error);
      // You could check for specific errors, e.g., if no row was found
      throw new Error('Could not update FPO profile.');
    }
    return updatedProfile;
  }

  async getCompleteDetails(fpoId: string): Promise<FPOCompleteDetails | null> {
    // This is an advanced query that fetches from multiple tables at once!
    const { data, error } = await this.supabase
      .from('fpo_profiles')
      .select(`
        *,
        bank_details (*),
        invoice_settings (*)
      `)
      .eq('id', fpoId)
      .single();

    if (error) {
      console.error('Error fetching complete FPO details:', error);
      return null;
    }

    if (!data) return null;

    // Supabase returns nested objects, which we can map to our composite type
    return {
      profile: {
        id: data.id,
        company_name: data.company_name,
        // ...map all other profile fields
      },
      bankDetails: data.bank_details,
      invoiceSettings: data.invoice_settings,
    };
  }
}