import { FPO } from '../core/entities/fpo';
import { IFPORepository } from '../core/interfaces/IFPORepository';

export class FPOService {
  constructor(private repo: IFPORepository) {}

  async getFPOById(id: string): Promise<FPO | null> {
    return await this.repo.findById(id);
  }
async createFPO(input: Omit<FPO, 'created_at' | 'updated_at'>): Promise<FPO> {
  const fpo = new FPO(
    input.id,                    // this is user.id 
    input.company_name,
    input.incorporation_date,
    input.logo_url,
    input.owner_name,
    input.phone_number,
    input.invoice_email,
    input.gst_number,
    input.address_line1,
    input.city,
    input.state,
    input.pincode,
    new Date().toISOString(),
    new Date().toISOString()
  )

  await this.repo.save(fpo)
  return fpo
}

  async updateFPO(id: string, update: Partial<FPO>): Promise<FPO> {
    const fpo = await this.repo.findById(id);
    if (!fpo) throw new Error('FPO not found');

    fpo.update(update);
    await this.repo.update(fpo);
    return fpo;
  }
}
