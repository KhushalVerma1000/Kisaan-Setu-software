import { BankDetail } from "../../core/entities/BankDetail";
import { createClient } from "@/utils/supabase/server";

export function addSecondaryBankAccount(bankDetail: BankDetail) {
  return async (): Promise<BankDetail | null> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;

      if (!userId) {
        console.error("User not authenticated");
        return null;
      }

      // Ensure this bank account is marked as non-primary
      if (bankDetail.isPrimary) {
        console.warn("Cannot add primary bank account through this function. Use updateFpoProfile instead.");
        return null;
      }

      // Insert the secondary bank account
      const { data, error } = await supabase
        .from('bank_details')
        .insert({
          id: bankDetail.id,
          fpo_id: userId,
          account_holder_name: bankDetail.accountHolderName,
          account_number: bankDetail.accountNumber,
          bank_name: bankDetail.bankName,
          ifsc_code: bankDetail.ifscCode,
          is_primary: false, // Force non-primary
          upi_id: bankDetail.upiId,
          print_bank_details: bankDetail.printBankDetails,
          print_upi_qr: bankDetail.printUpiQr,
        })
        .select('*')
        .single();

      if (error) {
        console.error("Error adding secondary bank account:", error);
        return null;
      }

      // Return the created bank detail entity
      return new BankDetail({
        id: data.id,
        fpoId: data.fpo_id,
        accountHolderName: data.account_holder_name,
        accountNumber: data.account_number,
        bankName: data.bank_name,
        ifscCode: data.ifsc_code,
        isPrimary: data.is_primary,
        upiId: data.upi_id,
        printBankDetails: data.print_bank_details,
        printUpiQr: data.print_upi_qr,
      });
    } catch (error) {
      console.error("Unexpected error adding secondary bank account:", error);
      return null;
    }
  };
}

export function updateSecondaryBankAccount(bankDetail: BankDetail) {
  return async (): Promise<BankDetail | null> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;

      if (!userId) {
        console.error("User not authenticated");
        return null;
      }

      // Verify ownership and non-primary status
      const { data: existingBank, error: fetchError } = await supabase
        .from('bank_details')
        .select('*')
        .eq('id', bankDetail.id)
        .eq('fpo_id', userId)
        .single();

      if (fetchError || !existingBank) {
        console.error("Bank account not found or access denied:", fetchError);
        return null;
      }

      if (existingBank.is_primary) {
        console.error("Cannot update primary bank account through this function");
        return null;
      }

      // Update the secondary bank account
      const { data, error } = await supabase
        .from('bank_details')
        .update({
          account_holder_name: bankDetail.accountHolderName,
          account_number: bankDetail.accountNumber,
          bank_name: bankDetail.bankName,
          ifsc_code: bankDetail.ifscCode,
          upi_id: bankDetail.upiId,
          print_bank_details: bankDetail.printBankDetails,
          print_upi_qr: bankDetail.printUpiQr,
          // Keep is_primary as false
          is_primary: false,
        })
        .eq('id', bankDetail.id)
        .eq('fpo_id', userId)
        .select('*')
        .single();

      if (error) {
        console.error("Error updating secondary bank account:", error);
        return null;
      }

      return new BankDetail({
        id: data.id,
        fpoId: data.fpo_id,
        accountHolderName: data.account_holder_name,
        accountNumber: data.account_number,
        bankName: data.bank_name,
        ifscCode: data.ifsc_code,
        isPrimary: data.is_primary,
        upiId: data.upi_id,
        printBankDetails: data.print_bank_details,
        printUpiQr: data.print_upi_qr,
      });
    } catch (error) {
      console.error("Unexpected error updating secondary bank account:", error);
      return null;
    }
  };
}

export function deleteSecondaryBankAccount(bankDetailId: string) {
  return async (): Promise<boolean> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;

      if (!userId) {
        console.error("User not authenticated");
        return false;
      }

      // Verify ownership and non-primary status before deletion
      const { data: existingBank, error: fetchError } = await supabase
        .from('bank_details')
        .select('is_primary')
        .eq('id', bankDetailId)
        .eq('fpo_id', userId)
        .single();

      if (fetchError || !existingBank) {
        console.error("Bank account not found or access denied:", fetchError);
        return false;
      }

      if (existingBank.is_primary) {
        console.error("Cannot delete primary bank account");
        return false;
      }

      // Delete the secondary bank account
      const { error } = await supabase
        .from('bank_details')
        .delete()
        .eq('id', bankDetailId)
        .eq('fpo_id', userId);

      if (error) {
        console.error("Error deleting secondary bank account:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Unexpected error deleting secondary bank account:", error);
      return false;
    }
  };
}

export function getSecondaryBankAccounts() {
  return async (): Promise<BankDetail[]> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;

      if (!userId) {
        console.error("User not authenticated");
        return [];
      }

      // Fetch all non-primary bank accounts for the user
      const { data, error } = await supabase
        .from('bank_details')
        .select('*')
        .eq('fpo_id', userId)
        .eq('is_primary', false)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error fetching secondary bank accounts:", error);
        return [];
      }

      return data.map((bd: any) => new BankDetail({
        id: bd.id,
        fpoId: bd.fpo_id,
        accountHolderName: bd.account_holder_name,
        accountNumber: bd.account_number,
        bankName: bd.bank_name,
        ifscCode: bd.ifsc_code,
        isPrimary: bd.is_primary,
        upiId: bd.upi_id,
        printBankDetails: bd.print_bank_details,
        printUpiQr: bd.print_upi_qr,
      }));
    } catch (error) {
      console.error("Unexpected error fetching secondary bank accounts:", error);
      return [];
    }
  };
}

export function getAllBankAccounts() {
  return async (): Promise<BankDetail[]> => {
    try {
      const supabase = await createClient();
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;

      if (!userId) {
        console.error("User not authenticated");
        return [];
      }

      // Fetch all bank accounts for the user (both primary and secondary)
      const { data, error } = await supabase
        .from('bank_details')
        .select('*')
        .eq('fpo_id', userId)
        .order('is_primary', { ascending: false }) // Primary accounts first
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error fetching all bank accounts:", error);
        return [];
      }

      return data.map((bd: any) => new BankDetail({
        id: bd.id,
        fpoId: bd.fpo_id,
        accountHolderName: bd.account_holder_name,
        accountNumber: bd.account_number,
        bankName: bd.bank_name,
        ifscCode: bd.ifsc_code,
        isPrimary: bd.is_primary,
        upiId: bd.upi_id,
        printBankDetails: bd.print_bank_details,
        printUpiQr: bd.print_upi_qr,
      }));
    } catch (error) {
      console.error("Unexpected error fetching all bank accounts:", error);
      return [];
    }
  };
}