import { LineItemBase, ILineItemBase } from "@/server/features/items/core/entities/LineItemBase";

export interface IInvoiceLineItem extends ILineItemBase {
  invoiceId: string;
}

export class InvoiceLineItem extends LineItemBase implements IInvoiceLineItem {
  invoiceId: string;

  constructor(data: Partial<IInvoiceLineItem>) {
    super(data);
    this.invoiceId = data.invoiceId || '';
  }

  toDatabase(): any {
    return {
      ...super.toDatabase(),
      invoice_id: this.invoiceId
    };
  }

  toJSON(): IInvoiceLineItem {
    return {
      ...super.toJSON(),
      invoiceId: this.invoiceId
    };
  }

  static fromDatabase(data: any): InvoiceLineItem {
    const baseData = super.fromDatabase(data);
    return new InvoiceLineItem({
      ...baseData,
      invoiceId: data.invoice_id
    });
  }

  static fromInterface(data: Partial<IInvoiceLineItem>): InvoiceLineItem {
    return new InvoiceLineItem(data);
  }
}
