import { FPO } from '../../core/entities/fpo';
import { IFPORepository } from '../../core/interfaces/IFPORepository';
import { supabase } from '@/utils/supabase/client';

export class SupabaseFPORepository implements IFPORepository {
  async save(fpo: FPO): Promise<void> {
    const { error } = await supabase.from('fpo_profiles').insert([fpo.toJSON()]);
    if (error) throw new Error(error.message);
  }

  async findById(id: string): Promise<FPO | null> {
    const { data, error } = await supabase
      .from('fpo_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return new FPO(
      data.id,
      data.company_name,
      data.incorporation_date,
      data.logo_url,
      data.owner_name,
      data.phone_number,
      data.invoice_email,
      data.gst_number,
      data.address_line1,
      data.city,
      data.state,
      data.pincode,
      data.created_at,
      data.updated_at
    );
  }

  async update(fpo: FPO): Promise<void> {
    const { error } = await supabase
      .from('fpo_profiles')
      .update(fpo.toJSON())
      .eq('id', fpo.id);

    if (error) throw new Error(error.message);
  }
}
