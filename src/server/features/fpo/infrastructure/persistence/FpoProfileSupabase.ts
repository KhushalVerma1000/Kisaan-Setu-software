import { FpoProfile } from "../../core/entities/FpoProfile";
import { BankDetail } from "../../core/entities/BankDetail";
import { InvoiceSettings } from "../../core/entities/InvoiceSettings";
import { createClient } from "@/utils/supabase/server";
import { LogoStorageService } from "@/utils/supabase/storage/logoStorage";

export function getFpoProfile() {
  return async (): Promise<FpoProfile | null> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();
      const id = user.data.user?.id;

      // Fetch profile with related bank_details and invoice_settings
      const { data, error } = await supabase
        .from('fpo_profiles')
        .select('*, bank_details(*), invoice_settings(*)')
        .eq('id', id)
        .single();

      if (error) {
        console.error("Error fetching FPO profile:", error);
        return null;
      }
      if (!data) {
        console.warn("No FPO profile found for ID:", id);
        return null;
      }

      // Map bank_details
      const bankDetails = Array.isArray(data.bank_details)
        ? data.bank_details.map((bd: any) => new BankDetail({
            id: bd.id,
            fpoId: bd.fpo_id,
            accountHolderName: bd.account_holder_name,
            accountNumber: bd.account_number,
            bankName: bd.bank_name,
            ifscCode: bd.ifsc_code,
            isPrimary: bd.is_primary,
            upiId: bd.upi_id,
          }))
        : [];

      // Always return invoiceSettings as an object (first element if array)
      let invoiceSettingsObj = undefined;
      if (Array.isArray(data.invoice_settings) && data.invoice_settings.length > 0) {
        invoiceSettingsObj = data.invoice_settings[0];
      } else if (data.invoice_settings && typeof data.invoice_settings === 'object') {
        invoiceSettingsObj = data.invoice_settings;
      }

      const invoiceSettings = invoiceSettingsObj
        ? new InvoiceSettings({
            id: invoiceSettingsObj.id,
            fpoId: invoiceSettingsObj.fpo_id,
            invoicePrefix: invoiceSettingsObj.invoice_prefix,
            defaultTerms: invoiceSettingsObj.default_terms,
            signatureUrl: invoiceSettingsObj.signature_url,
          })
        : undefined;

      return new FpoProfile({
        id: data.id,
        companyName: data.company_name,
        incorporationDate: data.incorporation_date ? new Date(data.incorporation_date) : undefined,
        logoUrl: data.logo_url,
        ceoName: data.ceo_name,
        phoneNumber: data.phone_number,
        invoiceEmail: data.invoice_email,
        gstNumber: data.gst_number,
        addressLine1: data.address_line1,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        bankDetails,
        invoiceSettings, // always an object or undefined
      });
    } catch (error) {
      console.error("Unexpected error fetching FPO profile:", error);
      return null;
    }
  };
}

export function updateFpoProfile(profile: FpoProfile) {
  return async (): Promise<FpoProfile | null> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();
      const id = user.data.user?.id;

      // Prepare data for update
      const {
        companyName, incorporationDate, logoUrl, ceoName, phoneNumber, invoiceEmail, gstNumber,
        addressLine1, city, state, pincode, bankDetails, invoiceSettings
      } = profile;

      // Convert incorporationDate to ISO string if it's a valid date
      let incorporationDateIso: string | null = null;
      if (incorporationDate) {
        let dateValue = incorporationDate;
        if (typeof dateValue === "string") {
          dateValue = new Date(dateValue);
        }
        if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
          incorporationDateIso = dateValue.toISOString();
        }
      }

      // Update fpo_profiles table
      const { data: updatedProfile, error: profileError } = await supabase
        .from('fpo_profiles')
        .upsert({
          id, // <-- include the id!
          company_name: companyName,
          incorporation_date: incorporationDateIso,
          logo_url: logoUrl,
          ceo_name: ceoName,
          phone_number: phoneNumber,
          invoice_email: invoiceEmail,
          gst_number: gstNumber,
          address_line1: addressLine1,
          city,
          state,
          pincode,
        }, { onConflict: 'id' }) // ensure 'id' is unique or primary key
        .eq('id', id)
        .select('*')
        .single();

      if (profileError) {
        console.error("Error updating FPO profile:", profileError);
        return null;
      }

      // Update bank_details if provided
      if (bankDetails && bankDetails.length > 0) {
        for (const bankDetail of bankDetails) {
          const { error: bankError } = await supabase
            .from('bank_details')
            .upsert({
              id: bankDetail.id || undefined, // Use existing ID or create new
              fpo_id: id,
              account_holder_name: bankDetail.accountHolderName,
              account_number: bankDetail.accountNumber,
              bank_name: bankDetail.bankName,
              ifsc_code: bankDetail.ifscCode,
              is_primary: bankDetail.isPrimary,
              upi_id: bankDetail.upiId,
            });

          if (bankError) {
            console.error("Error updating bank details:", bankError);
            return null;
          }
        }
      }

      let updatedInvoiceSettings = undefined;

      // Update invoice_settings if provided
      if (invoiceSettings) {
        const { data, error: invoiceError } = await supabase
          .from('invoice_settings')
          .upsert({
            fpo_id: id, // always use the current user's id
            invoice_prefix: invoiceSettings.invoicePrefix,
            default_terms: invoiceSettings.defaultTerms,
            signature_url: invoiceSettings.signatureUrl,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'fpo_id' })
          .select('*')
          .single();

        if (invoiceError) {
          console.error("Error updating invoice settings:", invoiceError);
          return null;
        }
        updatedInvoiceSettings = data;
      }

      // Return the updated profile using the DB response
      return new FpoProfile({
        ...updatedProfile,
        bankDetails: bankDetails.map((bd) => new BankDetail(bd)),
        invoiceSettings: updatedInvoiceSettings
          ? new InvoiceSettings({
              id: updatedInvoiceSettings.id,
              fpoId: updatedInvoiceSettings.fpo_id,
              invoicePrefix: updatedInvoiceSettings.invoice_prefix,
              defaultTerms: updatedInvoiceSettings.default_terms,
              signatureUrl: updatedInvoiceSettings.signature_url,
            })
          : undefined,
      });
    } catch (error) {
      console.error("Unexpected error updating FPO profile:", error);
      return null;
    }
  };
}


export function updateFpoProfileWithLogo(profile: FpoProfile, logoFile?: File) {
  return async (): Promise<FpoProfile | null> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();
      const id = user.data.user?.id;

      let logoUrl = profile.logoUrl;

      // Handle logo upload if file is provided
      if (logoFile) {
        logoUrl = await LogoStorageService.updateLogo(logoFile, id!, profile.logoUrl);
        if (!logoUrl) {
          console.error('Failed to upload logo');
          return null;
        }
      }

      // Prepare data for update
      const {
        companyName, incorporationDate, ceoName, phoneNumber, invoiceEmail, gstNumber,
        addressLine1, city, state, pincode, bankDetails, invoiceSettings
      } = profile;

      // Convert incorporationDate to ISO string if it's a valid date
      let incorporationDateIso: string | null = null;
      if (incorporationDate) {
        let dateValue = incorporationDate;
        if (typeof dateValue === "string") {
          dateValue = new Date(dateValue);
        }
        if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
          incorporationDateIso = dateValue.toISOString();
        }
      }

      // Update fpo_profiles table with new logo URL
      const { data: updatedProfile, error: profileError } = await supabase
        .from('fpo_profiles')
        .upsert({
          id,
          company_name: companyName,
          incorporation_date: incorporationDateIso,
          logo_url: logoUrl, // Use the uploaded logo URL
          ceo_name: ceoName,
          phone_number: phoneNumber,
          invoice_email: invoiceEmail,
          gst_number: gstNumber,
          address_line1: addressLine1,
          city,
          state,
          pincode,
        }, { onConflict: 'id' })
        .eq('id', id)
        .select('*')
        .single();

      if (profileError) {
        console.error("Error updating FPO profile:", profileError);
        return null;
      }

      // Handle bank details and invoice settings updates (same as before)
      if (bankDetails && bankDetails.length > 0) {
        for (const bankDetail of bankDetails) {
          const { error: bankError } = await supabase
            .from('bank_details')
            .upsert({
              id: bankDetail.id || undefined,
              fpo_id: id,
              account_holder_name: bankDetail.accountHolderName,
              account_number: bankDetail.accountNumber,
              bank_name: bankDetail.bankName,
              ifsc_code: bankDetail.ifscCode,
              is_primary: bankDetail.isPrimary,
              upi_id: bankDetail.upiId,
            });

          if (bankError) {
            console.error("Error updating bank details:", bankError);
            return null;
          }
        }
      }

      let updatedInvoiceSettings = undefined;

      if (invoiceSettings) {
        const { data, error: invoiceError } = await supabase
          .from('invoice_settings')
          .upsert({
            fpo_id: id,
            invoice_prefix: invoiceSettings.invoicePrefix,
            default_terms: invoiceSettings.defaultTerms,
            signature_url: invoiceSettings.signatureUrl,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'fpo_id' })
          .select('*')
          .single();

        if (invoiceError) {
          console.error("Error updating invoice settings:", invoiceError);
          return null;
        }
        updatedInvoiceSettings = data;
      }

      // Return the updated profile
      return new FpoProfile({
        ...updatedProfile,
        bankDetails: bankDetails.map((bd) => new BankDetail(bd)),
        invoiceSettings: updatedInvoiceSettings
          ? new InvoiceSettings({
              id: updatedInvoiceSettings.id,
              fpoId: updatedInvoiceSettings.fpo_id,
              invoicePrefix: updatedInvoiceSettings.invoice_prefix,
              defaultTerms: updatedInvoiceSettings.default_terms,
              signatureUrl: updatedInvoiceSettings.signature_url,
            })
          : undefined,
      });
    } catch (error) {
      console.error("Unexpected error updating FPO profile:", error);
      return null;
    }
  };
}