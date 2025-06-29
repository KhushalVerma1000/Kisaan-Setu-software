// server/features/fpo/core/entities/FpoProfile.ts
import { BankDetail } from './BankDetail';
import { InvoiceSettings } from './InvoiceSettings';

export interface FpoProfileProps {
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
  bankDetails?: BankDetail[];
  invoiceSettings?: InvoiceSettings;
}

export class FpoProfile {
  public readonly id: string;
  public companyName?: string;
  public incorporationDate?: Date;
  public logoUrl?: string;
  public ceoName?: string;
  public phoneNumber?: string;
  public invoiceEmail?: string;
  public gstNumber?: string;
  public addressLine1?: string;
  public city?: string;
  public state?: string;
  public pincode?: string;

  public bankDetails: BankDetail[];
  public invoiceSettings: InvoiceSettings;

  constructor(props: FpoProfileProps) {
    this.id = props.id;
    this.companyName = props.companyName;
    this.incorporationDate = props.incorporationDate;
    this.logoUrl = props.logoUrl;
    this.ceoName = props.ceoName;
    this.phoneNumber = props.phoneNumber;
    this.invoiceEmail = props.invoiceEmail;
    this.gstNumber = props.gstNumber;
    this.addressLine1 = props.addressLine1;
    this.city = props.city;
    this.state = props.state;
    this.pincode = props.pincode;
    this.bankDetails = props.bankDetails ?? [];
    this.invoiceSettings = props.invoiceSettings ?? new InvoiceSettings({ id: props.id, fpoId: props.id });
  }

  // --- Business Logic Methods ---

  public updateProfileDetails(details: Partial<FpoProfileProps>) {
    if (details.companyName !== undefined) this.companyName = details.companyName;
    if (details.incorporationDate !== undefined) this.incorporationDate = details.incorporationDate;
    if (details.logoUrl !== undefined) this.logoUrl = details.logoUrl;
    if (details.ceoName !== undefined) this.ceoName = details.ceoName;
    if (details.phoneNumber !== undefined) this.phoneNumber = details.phoneNumber;
    if (details.invoiceEmail !== undefined) this.invoiceEmail = details.invoiceEmail;
    if (details.gstNumber !== undefined) this.gstNumber = details.gstNumber;
    if (details.addressLine1 !== undefined) this.addressLine1 = details.addressLine1;
    if (details.city !== undefined) this.city = details.city;
    if (details.state !== undefined) this.state = details.state;
    if (details.pincode !== undefined) this.pincode = details.pincode;
    // Do not update bankDetails or invoiceSettings here
  }

  public addBankDetail(bankDetail: BankDetail): void {
    if (bankDetail.fpoId !== this.id) {
      throw new Error("Cannot add a bank detail from another FPO.");
    }
    // Business Rule: Ensure only one primary account
    if (bankDetail.isPrimary) {
      this.bankDetails.forEach(bd => bd.isPrimary = false);
    }
    this.bankDetails.push(bankDetail);
  }

  public setPrimaryBankDetail(bankDetailId: string): void {
    let found = false;
    this.bankDetails.forEach(bd => {
      if (bd.id === bankDetailId) {
        bd.isPrimary = true;
        found = true;
      } else {
        bd.isPrimary = false;
      }
    });
    if (!found) {
      throw new Error(`Bank detail with id ${bankDetailId} not found.`);
    }
  }

  // Use this to attach loaded data from the database
  public setAssociatedData(data: { bankDetails: BankDetail[], invoiceSettings: InvoiceSettings }) {
    this.bankDetails = data.bankDetails;
    this.invoiceSettings = data.invoiceSettings;
  }
}