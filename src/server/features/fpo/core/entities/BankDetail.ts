// server/features/fpo/core/entities/BankDetail.ts
export class BankDetail {
  public readonly id: string; // uuid
  public readonly fpoId: string; // uuid
  public accountHolderName: string;
  public accountNumber: string;
  public bankName: string;
  public ifscCode: string;
  public upiId?: string;
  public isPrimary: boolean;

  constructor(props: {
    id: string;
    fpoId: string;
    accountHolderName: string;
    accountNumber: string;
    bankName: string;
    ifscCode: string;
    upiId?: string;
    isPrimary?: boolean;
  }) {
    this.id = props.id;
    this.fpoId = props.fpoId;
    this.accountHolderName = props.accountHolderName;
    this.accountNumber = props.accountNumber;
    this.bankName = props.bankName;
    this.ifscCode = props.ifscCode;
    this.upiId = props.upiId;
    this.isPrimary = props.isPrimary ?? false;
  }
}