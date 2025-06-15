import { FPOProfile, BankDetail, InvoiceSettings ,FPOCompleteDetails } from '../entities/fpo';

export interface IFPORepository {
  // We specify the DTO (Data Transfer Object) for updating
  // This prevents the user from trying to update their ID or other protected fields.
  updateProfile(fpoId: string, data: Partial<Omit<FPOProfile, 'id'>>): Promise<FPOProfile>;
  
  // A method to get all the details needed for a "Settings" page
  getCompleteDetails(fpoId: string): Promise<FPOCompleteDetails | null>;

  // ... other methods for bank details, invoice settings etc. would go here
  // addBankDetail(fpoId: string, bankDetail: Omit<BankDetail, 'id' | 'fpo_id'>): Promise<BankDetail>;
}