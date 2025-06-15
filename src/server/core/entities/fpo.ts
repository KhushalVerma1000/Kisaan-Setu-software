// Represents the fpo_profiles table
export interface FPOProfile {
  id: string; // Corresponds to the auth.users id
  company_name: string;
  incorporation_date?: Date | null;
  logo_url?: string | null;
  owner_name?: string | null;
  phone_number?: string | null;
  invoice_email?: string | null;
  gst_number?: string | null;
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
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