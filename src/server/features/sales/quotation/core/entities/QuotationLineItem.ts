import { LineItemBase, ILineItemBase } from "@/server/features/items/core/entities/LineItemBase";

export interface IQuotationLineItem extends ILineItemBase {
  quotationId: string;
}

export class QuotationLineItem extends LineItemBase implements IQuotationLineItem {
  quotationId: string;

  constructor(data: Partial<IQuotationLineItem>) {
    super(data);
    this.quotationId = data.quotationId || '';
  }

  toDatabase(): any {
    return {
      ...super.toDatabase(),
      quotation_id: this.quotationId
    };
  }

  toJSON(): IQuotationLineItem {
    return {
      ...super.toJSON(),
      quotationId: this.quotationId
    };
  }

  static fromDatabase(data: any): QuotationLineItem {
    const baseData = super.fromDatabase(data);
    return new QuotationLineItem({
      ...baseData,
      quotationId: data.quotation_id
    });
  }

  static fromInterface(data: Partial<IQuotationLineItem>): QuotationLineItem {
    return new QuotationLineItem(data);
  }
}
