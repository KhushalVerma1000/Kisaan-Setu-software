// src/models/Item.ts
import { Category } from "./Category";
import { Unit } from "./Unit";

export abstract class Item {
  constructor(
    public id: string,
    public name: string,
    public type: "product" | "service",
    public category: Category,
    public hsn_sac: string,
    public salePrice: number,
    public salePriceInclusive: boolean,
    public gstTaxPercent: number
  ) {}

  getGSTAmount(): number {
    return this.salePrice * (this.gstTaxPercent / 100);
  }

  getFinalPrice(): number {
    return this.salePriceInclusive ? this.salePrice : this.salePrice + this.getGSTAmount();
  }
}

export class Service extends Item {
  constructor(
    id: string,
    name: string,
    category: Category,
    hsn_sac: string,
    salePrice: number,
    salePriceInclusive: boolean,
    gstTaxPercent: number
  ) {
    super(id, name, "service", category, hsn_sac, salePrice, salePriceInclusive, gstTaxPercent);
  }
}

export class Product extends Item {
  constructor(
    id: string,
    name: string,
    category: Category,
    hsn_sac: string,
    salePrice: number,
    salePriceInclusive: boolean,
    gstTaxPercent: number,
    public purchasePrice: number,
    public purchasePriceInclusive: boolean,
    public unit: Unit,
    public openingQuantity: number,
    public openingStockDate: Date | null,
    public mfgDate: Date | null,
    public expDate: Date | null,
    public barcode?: string,
    public discount?: {
      value: number;
      type: "fixed" | "percent";
    },
    public lowStockAlert?: number
  ) {
    super(id, name, "product", category, hsn_sac, salePrice, salePriceInclusive, gstTaxPercent);
  }
}
