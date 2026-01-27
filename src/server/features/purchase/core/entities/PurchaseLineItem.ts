import { LineItemBase, ILineItemBase } from "@/server/features/items/core/entities/LineItemBase";

export interface IPurchaseLineItem extends ILineItemBase {
  purchaseVoucherId: string;
}

export class PurchaseLineItem extends LineItemBase implements IPurchaseLineItem {
  purchaseVoucherId: string;

  constructor(data: Partial<IPurchaseLineItem>) {
    super(data);
    this.purchaseVoucherId = data.purchaseVoucherId || '';
  }

  toDatabase(): any {
    return {
      ...super.toDatabase(),
      purchase_voucher_id: this.purchaseVoucherId
    };
  }

  toJSON(): IPurchaseLineItem {
    return {
      ...super.toJSON(),
      purchaseVoucherId: this.purchaseVoucherId
    };
  }

  static fromDatabase(data: any): PurchaseLineItem {
    const baseData = super.fromDatabase(data);
    return new PurchaseLineItem({
      ...baseData,
      purchaseVoucherId: data.purchase_voucher_id
    });
  }

  static fromInterface(data: Partial<IPurchaseLineItem>): PurchaseLineItem {
    return new PurchaseLineItem(data);
  }
}
