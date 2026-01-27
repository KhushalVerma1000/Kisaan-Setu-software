import { LineItemBase, ILineItemBase } from "@/server/features/items/core/entities/LineItemBase";

export interface IPurchaseOrderLineItem extends ILineItemBase {
  purchaseOrderId: string;
}

export class PurchaseOrderLineItem extends LineItemBase implements IPurchaseOrderLineItem {
  purchaseOrderId: string;

  constructor(data: Partial<IPurchaseOrderLineItem>) {
    super(data);
    this.purchaseOrderId = data.purchaseOrderId || '';
  }

  toDatabase(): any {
    return {
      ...super.toDatabase(),
      purchase_order_id: this.purchaseOrderId
    };
  }

  toJSON(): IPurchaseOrderLineItem {
    return {
      ...super.toJSON(),
      purchaseOrderId: this.purchaseOrderId
    };
  }

  static fromDatabase(data: any): PurchaseOrderLineItem {
    const baseData = super.fromDatabase(data);
    return new PurchaseOrderLineItem({
      ...baseData,
      purchaseOrderId: data.purchase_order_id
    });
  }

  static fromInterface(data: Partial<IPurchaseOrderLineItem>): PurchaseOrderLineItem {
    return new PurchaseOrderLineItem(data);
  }
}
