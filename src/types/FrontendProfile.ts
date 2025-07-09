// types/FrontendProfile.ts
import { BankDetail } from '@/server/features/fpo/core/entities/BankDetail';
import { InvoiceSettings } from '@/server/features/fpo/core/entities/InvoiceSettings';

// Frontend-only bank detail type with additional properties
export interface FrontendBankDetail {
  id?: string;
  fpoId?: string;
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  upiId?: string;
  isPrimary?: boolean;
  // Frontend-only properties
  printBankDetails?: boolean;
  printUpiQr?: boolean;
}

// Frontend-only invoice settings type with additional properties
export interface FrontendInvoiceSettings {
  id?: string;
  fpoId?: string;
  invoicePrefix: string;
  defaultTerms: string;
  signatureUrl?: string;
  // Frontend-only properties
  startNumber: number;
  showPrefix: boolean;
  signatureFile?: File | null;
}

// Frontend profile type that matches your component needs
export interface FrontendProfile {
  id: string;
  companyName?: string;
  incorporationDate?: Date;
  logoUrl?: string;
  ceoName?: string;
  phoneNumber?: string;
  invoiceEmail?: string;
  gstNumber?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  bankDetails: FrontendBankDetail[];
  invoiceSettings: FrontendInvoiceSettings;
}

// Utility functions to convert between database entities and frontend types
export const convertToFrontendProfile = (dbProfile: any): FrontendProfile => {
  return {
    id: dbProfile.id,
    companyName: dbProfile.companyName,
    incorporationDate: dbProfile.incorporationDate,
    logoUrl: dbProfile.logoUrl,
    ceoName: dbProfile.ceoName,
    phoneNumber: dbProfile.phoneNumber,
    invoiceEmail: dbProfile.invoiceEmail,
    gstNumber: dbProfile.gstNumber,
    addressLine1: dbProfile.addressLine1,
    city: dbProfile.city,
    state: dbProfile.state,
    pincode: dbProfile.pincode,
    bankDetails: dbProfile.bankDetails?.map((bd: BankDetail) => ({
      id: bd.id,
      fpoId: bd.fpoId,
      accountHolderName: bd.accountHolderName,
      accountNumber: bd.accountNumber,
      bankName: bd.bankName,
      ifscCode: bd.ifscCode,
      upiId: bd.upiId,
      isPrimary: bd.isPrimary,
      // Default frontend-only values
      printBankDetails: false,
      printUpiQr: false,
    })) || [],
    invoiceSettings: {
      id: dbProfile.invoiceSettings?.id,
      fpoId: dbProfile.invoiceSettings?.fpoId,
      invoicePrefix: dbProfile.invoiceSettings?.invoicePrefix || "",
      defaultTerms: dbProfile.invoiceSettings?.defaultTerms || "",
      signatureUrl: dbProfile.invoiceSettings?.signatureUrl,
      // Default frontend-only values
      startNumber: 1,
      showPrefix: false,
      signatureFile: null,
    },
  };
};

export const convertToDbProfile = (frontendProfile: FrontendProfile) => {
  return {
    id: frontendProfile.id,
    companyName: frontendProfile.companyName,
    incorporationDate: frontendProfile.incorporationDate,
    logoUrl: frontendProfile.logoUrl,
    ceoName: frontendProfile.ceoName,
    phoneNumber: frontendProfile.phoneNumber,
    invoiceEmail: frontendProfile.invoiceEmail,
    gstNumber: frontendProfile.gstNumber,
    addressLine1: frontendProfile.addressLine1,
    city: frontendProfile.city,
    state: frontendProfile.state,
    pincode: frontendProfile.pincode,
    bankDetails: frontendProfile.bankDetails?.map(bd => ({
      id: bd.id,
      fpoId: bd.fpoId,
      accountHolderName: bd.accountHolderName,
      accountNumber: bd.accountNumber,
      bankName: bd.bankName,
      ifscCode: bd.ifscCode,
      upiId: bd.upiId,
      isPrimary: bd.isPrimary || false,
    })),
    invoiceSettings: {
      id: frontendProfile.invoiceSettings.id,
      fpoId: frontendProfile.invoiceSettings.fpoId,
      invoicePrefix: frontendProfile.invoiceSettings.invoicePrefix,
      defaultTerms: frontendProfile.invoiceSettings.defaultTerms,
      signatureUrl: frontendProfile.invoiceSettings.signatureUrl,
    },
  };
};

export const createDefaultFrontendProfile = (userDetails: any): FrontendProfile => {
  return {
    id: userDetails.id,
    companyName: userDetails.fponame || "",
    invoiceEmail: userDetails.email || "",
    bankDetails: [
      {
        accountHolderName: "",
        bankName: "",
        accountNumber: "",
        ifscCode: "",
        upiId: "",
        isPrimary: true,
        printBankDetails: false,
        printUpiQr: false,
      },
    ],
    invoiceSettings: {
      invoicePrefix: "INV-",
      startNumber: 1,
      defaultTerms: "",
      signatureUrl: "",
      showPrefix: false,
      signatureFile: null,
    },
  };
};