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
    public currentStock: number = openingQuantity, // 🟢 NEW: Current stock defaults to opening quantity
    public lastStockUpdate: Date | null = openingStockDate, // 🟢 NEW: Defaults to opening stock date
    public barcode?: string,
    public discount?: {
      value: number;
      type: "fixed" | "percent";
    },
    public lowStockAlert?: number
  ) {
    super(id, name, "product", category, hsn_sac, salePrice, salePriceInclusive, gstTaxPercent);
  }

  // 🟢 NEW: Check if product is low in stock
  isLowStock(): boolean {
    return this.lowStockAlert !== undefined && this.currentStock <= this.lowStockAlert;
  }

  // 🟢 NEW: Check if product is out of stock
  isOutOfStock(): boolean {
    return this.currentStock <= 0;
  }

  // 🟢 NEW: Update current stock (typically called after sales/purchases)
  updateStock(quantity: number, operation: 'add' | 'subtract' = 'add'): void {
    if (operation === 'add') {
      this.currentStock += quantity;
    } else {
      this.currentStock -= quantity;
    }
    this.lastStockUpdate = new Date();
  }

  // 🟢 NEW: Get stock value (current stock * purchase price)
  getStockValue(): number {
    return this.currentStock * this.purchasePrice;
  }
}