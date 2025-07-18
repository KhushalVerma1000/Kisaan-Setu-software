// src/models/SelectedItem.ts
import { Item, Product, Service } from "./Item";

// Interface for component props
export interface IAddItemComponentProps {
  lineItemManager: LineItemManager;
  availableItems: Item[];
  onItemsChange?: (summary: ILineItemSummary) => void;
  onValidationError?: (errors: string[]) => void;
  documentType?: "invoice" | "purchase_voucher" | "quotation";
  readOnly?: boolean;
  showShipment?: boolean;
  showRoundOff?: boolean;
}

// Interface for item row component
export interface IItemRowProps {
  selectedItem: SelectedItem;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onUnitPriceChange: (itemId: string, price: number) => void;
  onDiscountChange: (itemId: string, discount: IDiscountConfig) => void;
  onGSTChange: (itemId: string, gstConfig: IGSTConfig) => void;
  onRemove: (itemId: string) => void;
  readOnly?: boolean;
}

export interface IDiscountConfig {
  value: number;
  type: "fixed" | "percent";
}

export interface IGSTConfig {
  rate: number;
  type: "exempt" | "excluding" | "including";
}

export interface ILineItemSummary {
  subTotal: number;
  totalDiscount: number;
  totalGST: number;
  shipmentAmount: number;
  roundOff: number;
  grandTotal: number;
}

export class SelectedItem {
  public id: string;
  public item: Item;
  public quantity: number;
  public unitPrice: number;
  public discount: IDiscountConfig;
  public gstConfig: IGSTConfig;
  public lineNumber: number;

  constructor(
    item: Item,
    quantity: number = 1,
    unitPrice?: number,
    discount?: IDiscountConfig,
    gstConfig?: IGSTConfig,
    lineNumber: number = 0
  ) {
    this.id = `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.item = item;
    this.quantity = quantity;
    this.unitPrice = unitPrice || item.salePrice;
    this.discount = discount || { value: 0, type: "fixed" };
    this.gstConfig = gstConfig || { 
      rate: item.gstTaxPercent, 
      type: item.salePriceInclusive ? "including" : "excluding" 
    };
    this.lineNumber = lineNumber;
  }

  // Get the base amount (price * quantity)
  getBaseAmount(): number {
    return this.unitPrice * this.quantity;
  }

  // Get discount amount
  getDiscountAmount(): number {
    const baseAmount = this.getBaseAmount();
    if (this.discount.type === "percent") {
      return baseAmount * (this.discount.value / 100);
    }
    return this.discount.value;
  }

  // Get amount after discount
  getAmountAfterDiscount(): number {
    return this.getBaseAmount() - this.getDiscountAmount();
  }

  // Get GST amount based on configuration
  getGSTAmount(): number {
    if (this.gstConfig.type === "exempt") {
      return 0;
    }

    const amountAfterDiscount = this.getAmountAfterDiscount();
    
    if (this.gstConfig.type === "including") {
      // GST is included in the price, so we need to extract it
      return amountAfterDiscount - (amountAfterDiscount / (1 + this.gstConfig.rate / 100));
    } else {
      // GST is excluding, so we add it
      return amountAfterDiscount * (this.gstConfig.rate / 100);
    }
  }

  // Get the taxable amount (for GST calculation)
  getTaxableAmount(): number {
    const amountAfterDiscount = this.getAmountAfterDiscount();
    
    if (this.gstConfig.type === "including") {
      return amountAfterDiscount - this.getGSTAmount();
    }
    return amountAfterDiscount;
  }

  // Get final line total
  getLineTotal(): number {
    const amountAfterDiscount = this.getAmountAfterDiscount();
    
    if (this.gstConfig.type === "including") {
      return amountAfterDiscount;
    } else if (this.gstConfig.type === "excluding") {
      return amountAfterDiscount + this.getGSTAmount();
    }
    return amountAfterDiscount; // exempt
  }

  // Update quantity
  updateQuantity(newQuantity: number): void {
    if (newQuantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }
    this.quantity = newQuantity;
  }

  // Update unit price
  updateUnitPrice(newPrice: number): void {
    if (newPrice < 0) {
      throw new Error("Unit price cannot be negative");
    }
    this.unitPrice = newPrice;
  }

  // Update discount
  updateDiscount(discount: IDiscountConfig): void {
    this.discount = discount;
  }

  // Update GST configuration
  updateGSTConfig(gstConfig: IGSTConfig): void {
    this.gstConfig = gstConfig;
  }

  // Check if item is a product
  isProduct(): boolean {
    return this.item instanceof Product;
  }

  // Check if item is a service
  isService(): boolean {
    return this.item instanceof Service;
  }

  // Get item details for display
  getItemDetails() {
    return {
      id: this.item.id,
      name: this.item.name,
      type: this.item.type,
      hsn_sac: this.item.hsn_sac,
      category: this.item.category,
      unit: this.isProduct() ? (this.item as Product).unit : null,
      barcode: this.isProduct() ? (this.item as Product).barcode : null,
    };
  }

  // Convert to plain object for serialization
  toJSON() {
    return {
      id: this.id,
      item: this.item,
      quantity: this.quantity,
      unitPrice: this.unitPrice,
      discount: this.discount,
      gstConfig: this.gstConfig,
      lineNumber: this.lineNumber,
      calculations: {
        baseAmount: this.getBaseAmount(),
        discountAmount: this.getDiscountAmount(),
        taxableAmount: this.getTaxableAmount(),
        gstAmount: this.getGSTAmount(),
        lineTotal: this.getLineTotal(),
      },
    };
  }
}

// Line Item Manager Class
export class LineItemManager {
  private items: SelectedItem[] = [];
  private shipmentAmount: number = 0;
  private roundOff: number = 0;

  constructor() {}

  // Add item to the list
  addItem(item: Item, quantity: number = 1, unitPrice?: number): SelectedItem {
    const lineNumber = this.items.length + 1;
    const selectedItem = new SelectedItem(item, quantity, unitPrice, undefined, undefined, lineNumber);
    this.items.push(selectedItem);
    this.recalculateLineNumbers();
    return selectedItem;
  }

  // Remove item by ID
  removeItem(itemId: string): boolean {
    const index = this.items.findIndex(item => item.id === itemId);
    if (index !== -1) {
      this.items.splice(index, 1);
      this.recalculateLineNumbers();
      return true;
    }
    return false;
  }

  // Get item by ID
  getItem(itemId: string): SelectedItem | undefined {
    return this.items.find(item => item.id === itemId);
  }

  // Get all items
  getAllItems(): SelectedItem[] {
    return [...this.items];
  }

  // Update item quantity
  updateItemQuantity(itemId: string, quantity: number): boolean {
    const item = this.getItem(itemId);
    if (item) {
      item.updateQuantity(quantity);
      return true;
    }
    return false;
  }

  // Update item unit price
  updateItemUnitPrice(itemId: string, unitPrice: number): boolean {
    const item = this.getItem(itemId);
    if (item) {
      item.updateUnitPrice(unitPrice);
      return true;
    }
    return false;
  }

  // Update item discount
  updateItemDiscount(itemId: string, discount: IDiscountConfig): boolean {
    const item = this.getItem(itemId);
    if (item) {
      item.updateDiscount(discount);
      return true;
    }
    return false;
  }

  // Update item GST config
  updateItemGSTConfig(itemId: string, gstConfig: IGSTConfig): boolean {
    const item = this.getItem(itemId);
    if (item) {
      item.updateGSTConfig(gstConfig);
      return true;
    }
    return false;
  }

  // Clear all items
  clearAllItems(): void {
    this.items = [];
  }

  // Get item count
  getItemCount(): number {
    return this.items.length;
  }

  // Check if list is empty
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  // Recalculate line numbers
  private recalculateLineNumbers(): void {
    this.items.forEach((item, index) => {
      item.lineNumber = index + 1;
    });
  }

  // Set shipment amount
  setShipmentAmount(amount: number): void {
    this.shipmentAmount = Math.max(0, amount);
  }

  // Get shipment amount
  getShipmentAmount(): number {
    return this.shipmentAmount;
  }

  // Set round off amount
  setRoundOff(amount: number): void {
    this.roundOff = amount;
  }

  // Get round off amount
  getRoundOff(): number {
    return this.roundOff;
  }

  // Calculate subtotal (sum of all taxable amounts)
  getSubTotal(): number {
    return this.items.reduce((sum, item) => sum + item.getTaxableAmount(), 0);
  }

  // Calculate total discount
  getTotalDiscount(): number {
    return this.items.reduce((sum, item) => sum + item.getDiscountAmount(), 0);
  }

  // Calculate total GST
  getTotalGST(): number {
    return this.items.reduce((sum, item) => sum + item.getGSTAmount(), 0);
  }

  // Calculate grand total
  getGrandTotal(): number {
    const itemsTotal = this.items.reduce((sum, item) => sum + item.getLineTotal(), 0);
    return itemsTotal + this.shipmentAmount + this.roundOff;
  }

  // Get complete summary
  getSummary(): ILineItemSummary {
    return {
      subTotal: this.getSubTotal(),
      totalDiscount: this.getTotalDiscount(),
      totalGST: this.getTotalGST(),
      shipmentAmount: this.shipmentAmount,
      roundOff: this.roundOff,
      grandTotal: this.getGrandTotal(),
    };
  }

  // Get GST breakdown by rate
  getGSTBreakdown(): { [rate: string]: { taxable: number; gst: number } } {
    const breakdown: { [rate: string]: { taxable: number; gst: number } } = {};
    
    this.items.forEach(item => {
      if (item.gstConfig.type !== "exempt") {
        const rate = item.gstConfig.rate.toString();
        if (!breakdown[rate]) {
          breakdown[rate] = { taxable: 0, gst: 0 };
        }
        breakdown[rate].taxable += item.getTaxableAmount();
        breakdown[rate].gst += item.getGSTAmount();
      }
    });

    return breakdown;
  }

  // Validate all items
  validateItems(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    this.items.forEach((item, index) => {
      if (item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
      }
      if (item.unitPrice < 0) {
        errors.push(`Item ${index + 1}: Unit price cannot be negative`);
      }
      if (item.discount.type === "percent" && item.discount.value > 100) {
        errors.push(`Item ${index + 1}: Percentage discount cannot exceed 100%`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Export data for different document types
  exportForInvoice() {
    return {
      items: this.items.map(item => item.toJSON()),
      summary: this.getSummary(),
      gstBreakdown: this.getGSTBreakdown(),
      documentType: "invoice",
    };
  }

  exportForPurchaseVoucher() {
    return {
      items: this.items.map(item => ({
        ...item.toJSON(),
        purchasePrice: item.isProduct() ? (item.item as Product).purchasePrice : null,
      })),
      summary: this.getSummary(),
      gstBreakdown: this.getGSTBreakdown(),
      documentType: "purchase_voucher",
    };
  }

  exportForQuotation() {
    return {
      items: this.items.map(item => item.toJSON()),
      summary: this.getSummary(),
      documentType: "quotation",
    };
  }

  // Import data from external source
  importItems(data: any[]): void {
    this.clearAllItems();
    data.forEach(itemData => {
      const selectedItem = new SelectedItem(
        itemData.item,
        itemData.quantity,
        itemData.unitPrice,
        itemData.discount,
        itemData.gstConfig
      );
      this.items.push(selectedItem);
    });
    this.recalculateLineNumbers();
  }
}