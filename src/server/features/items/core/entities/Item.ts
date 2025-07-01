// src/models/Item.ts
import { Category } from "./Category"

export class Item {
  constructor(
    public id: string,
    public name: string,
    public type: "product" | "service",
    public category: Category,
    public hsn_sac: string,
    public salePrice: number,
    public salePriceInclusive: boolean,
    public gstTaxPercent: number,
    public purchasePrice: number,
    public purchasePriceInclusive: boolean,
    public unit: string,
    public openingQuantity: number,
    public openingStockDate: Date | null,
    public mfgDate: Date | null,
    public expDate: Date | null,
    public barcode?: string,
    public discount?: {
      value: number
      type: "fixed" | "percent"
    },
    public lowStockAlert?: number
  ) {}
}
