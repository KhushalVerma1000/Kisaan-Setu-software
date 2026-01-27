// src/server/features/items/core/entities/LineItemBase.ts

/**
 * Base interface for all line items across different document types
 * Provides consistency across invoice, purchase, quotation, and purchase order line items
 */
export interface ILineItemBase {
    id: string;
    lineNumber: number;

    // Item reference
    itemId: string;
    itemName: string;
    itemType: 'product' | 'service';
    hsnSac: string;

    // Pricing
    quantity: number;
    unitCode?: string;
    unitPrice: number;

    // Discount
    discountType?: 'fixed' | 'percent';
    discountValue?: number;
    discountAmount: number;

    // GST
    gstRate: number;
    gstType: 'exempt' | 'excluding' | 'including';

    // Calculated amounts
    baseAmount: number;
    taxableAmount: number;
    gstAmount: number;
    lineTotal: number;

    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Base class for line items with common calculation logic
 */
export abstract class LineItemBase implements ILineItemBase {
    id: string;
    lineNumber: number;

    itemId: string;
    itemName: string;
    itemType: 'product' | 'service';
    hsnSac: string;

    quantity: number;
    unitCode?: string;
    unitPrice: number;

    discountType?: 'fixed' | 'percent';
    discountValue?: number;
    discountAmount: number;

    gstRate: number;
    gstType: 'exempt' | 'excluding' | 'including';

   baseAmount!: number;
taxableAmount!: number;
gstAmount!: number;
lineTotal!: number;

    createdAt?: Date;
    updatedAt?: Date;

    constructor(data: Partial<ILineItemBase>) {
        this.id = data.id || '';
        this.lineNumber = data.lineNumber || 0;

        this.itemId = data.itemId || '';
        this.itemName = data.itemName || '';
        this.itemType = data.itemType || 'product';
        this.hsnSac = data.hsnSac || '';

        this.quantity = data.quantity || 0;
        this.unitCode = data.unitCode;
        this.unitPrice = data.unitPrice || 0;

        this.discountType = data.discountType;
        this.discountValue = data.discountValue || 0;
        this.discountAmount = data.discountAmount || 0;

        this.gstRate = data.gstRate || 0;
        this.gstType = data.gstType || 'excluding';

        // Calculate amounts if not provided
        if (data.baseAmount !== undefined) {
            this.baseAmount = data.baseAmount;
            this.taxableAmount = data.taxableAmount || 0;
            this.gstAmount = data.gstAmount || 0;
            this.lineTotal = data.lineTotal || 0;
        } else {
            this.calculateAmounts();
        }

        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }

    /**
     * Calculate all amounts for this line item
     */
    protected calculateAmounts(): void {
        // Base amount = quantity * unit price
        this.baseAmount = this.quantity * this.unitPrice;

        // Calculate discount amount
        if (this.discountType === 'percent' && this.discountValue) {
            this.discountAmount = (this.baseAmount * this.discountValue) / 100;
        } else if (this.discountType === 'fixed' && this.discountValue) {
            this.discountAmount = this.discountValue;
        } else {
            this.discountAmount = 0;
        }

        // Amount after discount
        const amountAfterDiscount = this.baseAmount - this.discountAmount;

        // Calculate GST based on type
        if (this.gstType === 'exempt') {
            this.taxableAmount = amountAfterDiscount;
            this.gstAmount = 0;
            this.lineTotal = amountAfterDiscount;
        } else if (this.gstType === 'including') {
            // GST is included in the price
            this.lineTotal = amountAfterDiscount;
            this.gstAmount = (amountAfterDiscount * this.gstRate) / (100 + this.gstRate);
            this.taxableAmount = amountAfterDiscount - this.gstAmount;
        } else {
            // GST excluding (default)
            this.taxableAmount = amountAfterDiscount;
            this.gstAmount = (amountAfterDiscount * this.gstRate) / 100;
            this.lineTotal = amountAfterDiscount + this.gstAmount;
        }

        // Round to 2 decimal places
        this.baseAmount = Math.round(this.baseAmount * 100) / 100;
        this.discountAmount = Math.round(this.discountAmount * 100) / 100;
        this.taxableAmount = Math.round(this.taxableAmount * 100) / 100;
        this.gstAmount = Math.round(this.gstAmount * 100) / 100;
        this.lineTotal = Math.round(this.lineTotal * 100) / 100;
    }

    /**
     * Recalculate amounts when values change
     */
    recalculate(): void {
        this.calculateAmounts();
    }

    /**
     * Validate line item data
     */
    validate(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.itemId) errors.push('Item ID is required');
        if (!this.itemName) errors.push('Item name is required');
        if (!this.hsnSac) errors.push('HSN/SAC code is required');
        if (this.quantity <= 0) errors.push('Quantity must be greater than 0');
        if (this.unitPrice < 0) errors.push('Unit price cannot be negative');
        if (this.gstRate < 0 || this.gstRate > 100) errors.push('GST rate must be between 0 and 100');

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Convert to database format (snake_case)
     */
    toDatabase(): any {
        return {
            line_number: this.lineNumber,
            item_id: this.itemId,
            item_name: this.itemName,
            item_type: this.itemType,
            hsn_sac: this.hsnSac,
            quantity: this.quantity,
            unit_code: this.unitCode,
            unit_price: this.unitPrice,
            discount_type: this.discountType,
            discount_value: this.discountValue,
            discount_amount: this.discountAmount,
            gst_rate: this.gstRate,
            gst_type: this.gstType,
            base_amount: this.baseAmount,
            taxable_amount: this.taxableAmount,
            gst_amount: this.gstAmount,
            line_total: this.lineTotal
        };
    }

    /**
     * Convert to JSON for API response
     */
    toJSON(): ILineItemBase {
        return {
            id: this.id,
            lineNumber: this.lineNumber,
            itemId: this.itemId,
            itemName: this.itemName,
            itemType: this.itemType,
            hsnSac: this.hsnSac,
            quantity: this.quantity,
            unitCode: this.unitCode,
            unitPrice: this.unitPrice,
            discountType: this.discountType,
            discountValue: this.discountValue,
            discountAmount: this.discountAmount,
            gstRate: this.gstRate,
            gstType: this.gstType,
            baseAmount: this.baseAmount,
            taxableAmount: this.taxableAmount,
            gstAmount: this.gstAmount,
            lineTotal: this.lineTotal,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Create from database row (snake_case to camelCase)
     */
    static fromDatabase(data: any): Partial<ILineItemBase> {
        return {
            id: data.id,
            lineNumber: data.line_number,
            itemId: data.item_id,
            itemName: data.item_name,
            itemType: data.item_type,
            hsnSac: data.hsn_sac,
            quantity: Number(data.quantity),
            unitCode: data.unit_code,
            unitPrice: Number(data.unit_price),
            discountType: data.discount_type,
            discountValue: data.discount_value ? Number(data.discount_value) : undefined,
            discountAmount: Number(data.discount_amount || 0),
            gstRate: Number(data.gst_rate),
            gstType: data.gst_type,
            baseAmount: Number(data.base_amount),
            taxableAmount: Number(data.taxable_amount),
            gstAmount: Number(data.gst_amount),
            lineTotal: Number(data.line_total),
            createdAt: data.created_at ? new Date(data.created_at) : undefined,
            updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
        };
    }
}
