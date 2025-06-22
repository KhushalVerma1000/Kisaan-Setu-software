// Represents the fpo_profiles table
export class FPO {
  constructor(
    public readonly id: string,
    public company_name: string,
    public incorporation_date?: string,
    public logo_url?: string,
    public owner_name?: string,
    public phone_number?: string,
    public invoice_email?: string,
    public gst_number?: string,
    public address_line1?: string,
    public city?: string,
    public state?: string,
    public pincode?: string,
    public created_at?: string,
    public updated_at?: string
  ) {}

  public update(data: Partial<Omit<FPO, 'id' | 'created_at' | 'updated_at'>>) {
    Object.assign(this, data);
    this.updated_at = new Date().toISOString();
  }

  public toJSON() {
    return {
      id: this.id,
      company_name: this.company_name,
      incorporation_date: this.incorporation_date,
      logo_url: this.logo_url,
      owner_name: this.owner_name,
      phone_number: this.phone_number,
      invoice_email: this.invoice_email,
      gst_number: this.gst_number,
      address_line1: this.address_line1,
      city: this.city,
      state: this.state,
      pincode: this.pincode,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

// Represents the bank_details table
export interface BankDetail {
  id: string;
  fpo_id: string;
  account_holder_name: string;
  account_number: string;
  bank_name: string;
  ifsc_code: string;
  upi_id?: string | null;
  is_primary: boolean;
}

// Represents the invoice_settings table
export interface InvoiceSettings {
  id: string; // Corresponds to the auth.users id
  invoice_prefix: string;
  default_terms?: string | null;
  signature_url?: string | null;
}

// A composite type for when we want to load everything for a settings page
// This is NOT an entity itself, but a combination of entities.
export interface FPOCompleteDetails {
  profile: FPOProfile;
  bankDetails: BankDetail[]; // An array, because an FPO can have multiple
  invoiceSettings: InvoiceSettings;
}