export interface DiscountInterface {
    value: number;
    type: 'percent' | 'fixed';
}

export interface GSTConfigInterface {
    rate: number;
    type: 'including' | 'excluding';
}

export interface ItemCategoryInterface {
    id: string;
    name: string;
    description?: string;
    parentCategory? : string;
}

export interface ItemUnitInterface {
    code: string;
    label: string;
}

export interface ItemInterface {
    id: string;
    name: string;
    type: 'product' | 'service';
    category: ItemCategoryInterface;
    hsn_sac: string;
    salePrice: number;
    salePriceInclusive: boolean;
    gstTaxPercent: number;
    purchasePrice?: number;
    purchasePriceInclusive?: boolean;
    unit?: ItemUnitInterface;
    openingQuantity?: number;
    openingStockDate?: Date;
    mfgDate?: Date;
    expDate?: Date;
    currentStock?: number;
    lastStockUpdate?: Date;
    barcode?: string;
    discount?: DiscountInterface;
    lowStockAlert?: number;
}

export interface LineCalculationsInterface {
    baseAmount: number;
    discountAmount: number;
    taxableAmount: number;
    gstAmount: number;
    lineTotal: number;
}

export interface PurchaseVoucherItemInterface {
    id: string;
    item: ItemInterface;
    quantity: number;
    unitPrice: number;
    discount: DiscountInterface;
    gstConfig: GSTConfigInterface;
    lineNumber: number;
    calculations: LineCalculationsInterface;
    purchasePrice?: number;
}

export interface PurchaseVoucherSummaryInterface {
    subTotal: number;
    totalDiscount: number;
    totalGST: number;
    shipmentAmount: number;
    roundOff: number;
    grandTotal: number;
}

export interface GSTBreakdownInterface {
    [rate: string]: {
        taxable: number;
        gst: number;
    };
}

export interface PurchaseVoucherInterface {
    id?: string;
    poNumber?: string;
    supplierVendorName: string;
    supplierVendorId?: string;
    partyInvoiceNumber: string;
    partyInvoiceDate: Date | string;
    supplierVendorBillingAddress: string;
    gstin?: string;
    items: PurchaseVoucherItemInterface[];
    summary: PurchaseVoucherSummaryInterface;
    gstBreakdown: GSTBreakdownInterface;
    documentType: 'purchase_voucher';
    fpoId: string;
    createdAt?: Date;
    updatedAt?: Date;
    createdBy?: string;
    status?: 'draft' | 'approved' | 'rejected';
    notes?: string;
}

export class PurchaseVoucher implements PurchaseVoucherInterface {
    public id?: string;
    public poNumber?: string;
    public supplierVendorName: string;
    public supplierVendorId?: string;
    public partyInvoiceNumber: string;
    public partyInvoiceDate: Date;
    public supplierVendorBillingAddress: string;
    public gstin?: string;
    public items: PurchaseVoucherItemInterface[];
    public summary: PurchaseVoucherSummaryInterface;
    public gstBreakdown: GSTBreakdownInterface;
    public documentType: 'purchase_voucher' = 'purchase_voucher' as const;
    public fpoId: string;
    public createdAt?: Date;
    public updatedAt?: Date;
    public createdBy?: string;
    public status?: 'draft' | 'approved' | 'rejected';
    public notes?: string;

    constructor(purchaseVoucherData: PurchaseVoucherInterface) {
        this.id = purchaseVoucherData.id;
        this.poNumber = purchaseVoucherData.poNumber;
        this.supplierVendorName = purchaseVoucherData.supplierVendorName;
        this.supplierVendorId = purchaseVoucherData.supplierVendorId;
        this.partyInvoiceNumber = purchaseVoucherData.partyInvoiceNumber;
        
        // Ensure partyInvoiceDate is a Date object
        this.partyInvoiceDate = purchaseVoucherData.partyInvoiceDate instanceof Date 
            ? purchaseVoucherData.partyInvoiceDate 
            : new Date(purchaseVoucherData.partyInvoiceDate);
            
        this.supplierVendorBillingAddress = purchaseVoucherData.supplierVendorBillingAddress;
        this.gstin = purchaseVoucherData.gstin;
        this.items = purchaseVoucherData.items;
        this.summary = purchaseVoucherData.summary;
        this.gstBreakdown = purchaseVoucherData.gstBreakdown;
        this.fpoId = purchaseVoucherData.fpoId;
        this.createdAt = purchaseVoucherData.createdAt;
        this.updatedAt = purchaseVoucherData.updatedAt;
        this.createdBy = purchaseVoucherData.createdBy;
        this.status = purchaseVoucherData.status || 'draft';
        this.notes = purchaseVoucherData.notes;
    }

    // Create from interface
    static fromInterface(data: PurchaseVoucherInterface): PurchaseVoucher {
        return new PurchaseVoucher(data);
    }

    // Create from database format
    static fromDbFormat(dbData: any): PurchaseVoucher {
        return new PurchaseVoucher({
            id: dbData.id,
            poNumber: dbData.po_number,
            supplierVendorName: dbData.supplier_vendor_name,
            supplierVendorId: dbData.supplier_vendor_id,
            partyInvoiceNumber: dbData.party_invoice_number,
            partyInvoiceDate: new Date(dbData.party_invoice_date),
            supplierVendorBillingAddress: dbData.supplier_vendor_billing_address,
            gstin: dbData.gstin,
            items: JSON.parse(dbData.items || '[]'),
            summary: JSON.parse(dbData.summary || '{}'),
            gstBreakdown: JSON.parse(dbData.gst_breakdown || '{}'),
            documentType: 'purchase_voucher',
            fpoId: dbData.fpo_id,
            createdAt: dbData.created_at ? new Date(dbData.created_at) : undefined,
            updatedAt: dbData.updated_at ? new Date(dbData.updated_at) : undefined,
            createdBy: dbData.created_by,
            status: dbData.status || 'draft',
            notes: dbData.notes
        });
    }

    // Convert to database format
 toDbFormat(): any {
    // Helper function to safely convert various date formats to ISO string
    const convertDateToISOString = (dateValue: any, fieldName: string): string => {
        if (!dateValue) {
            throw new Error(`${fieldName} is required`);
        }

        let dateObj: Date;

        // Handle different date formats
        if (dateValue instanceof Date) {
            dateObj = dateValue;
        } else if (typeof dateValue === 'string') {
            // Handle various string formats
            dateObj = new Date(dateValue);
        } else if (typeof dateValue === 'number') {
            // Handle timestamp (milliseconds or seconds)
            dateObj = new Date(dateValue);
        } else if (typeof dateValue === 'object' && dateValue !== null) {
            // Handle date objects from APIs (like moment.js, dayjs, or serialized dates)
            if (dateValue.toISOString && typeof dateValue.toISOString === 'function') {
                return dateValue.toISOString();
            } else if (dateValue.toDate && typeof dateValue.toDate === 'function') {
                dateObj = dateValue.toDate();
            } else if (dateValue._d instanceof Date) {
                // Handle moment.js objects
                dateObj = dateValue._d;
            } else if (dateValue.$d instanceof Date) {
                // Handle dayjs objects
                dateObj = dateValue.$d;
            } else {
                throw new Error(`Invalid ${fieldName} format: unsupported object type`);
            }
        } else {
            throw new Error(`Invalid ${fieldName} format: must be a date, string, number, or date object`);
        }

        // Validate the resulting Date object
        if (isNaN(dateObj.getTime())) {
            throw new Error(`Invalid ${fieldName} format: could not parse date`);
        }

        return dateObj.toISOString();
    };

    // Helper function for optional date fields
    const convertOptionalDateToISOString = (dateValue: any): string | undefined => {
        if (!dateValue) {
            return undefined;
        }

        try {
            return convertDateToISOString(dateValue, 'optional date');
        } catch (error) {
            return undefined;
        }
    };

    // Convert party invoice date (required field)
    const partyInvoiceDateString = convertDateToISOString(this.partyInvoiceDate, 'Party invoice date');

    return {
        id: this.id,
        po_number: this.poNumber,
        supplier_vendor_name: this.supplierVendorName,
        supplier_vendor_id: this.supplierVendorId,
        party_invoice_number: this.partyInvoiceNumber,
        party_invoice_date: partyInvoiceDateString,
        supplier_vendor_billing_address: this.supplierVendorBillingAddress,
        gstin: this.gstin,
        items: JSON.stringify(this.items),
        summary: JSON.stringify(this.summary),
        gst_breakdown: JSON.stringify(this.gstBreakdown),
        document_type: this.documentType,
        fpo_id: this.fpoId,
        created_at: convertOptionalDateToISOString(this.createdAt),
        updated_at: convertOptionalDateToISOString(this.updatedAt),
        created_by: this.createdBy,
        status: this.status,
        notes: this.notes
    };
}

    // Calculate totals (utility method)
    calculateTotals(): void {
        let subTotal = 0;
        let totalDiscount = 0;
        let totalGST = 0;
        const gstBreakdown: GSTBreakdownInterface = {};

        this.items.forEach(item => {
            subTotal += item.calculations.baseAmount;
            totalDiscount += item.calculations.discountAmount;
            totalGST += item.calculations.gstAmount;

            // Update GST breakdown
            const rate = item.gstConfig.rate.toString();
            if (!gstBreakdown[rate]) {
                gstBreakdown[rate] = { taxable: 0, gst: 0 };
            }
            gstBreakdown[rate].taxable += item.calculations.taxableAmount;
            gstBreakdown[rate].gst += item.calculations.gstAmount;
        });

        this.summary = {
            subTotal,
            totalDiscount,
            totalGST,
            shipmentAmount: this.summary?.shipmentAmount || 0,
            roundOff: this.summary?.roundOff || 0,
            grandTotal: subTotal - totalDiscount + totalGST + (this.summary?.shipmentAmount || 0) + (this.summary?.roundOff || 0)
        };

        this.gstBreakdown = gstBreakdown;
    }

    // Add item to purchase voucher
    addItem(item: PurchaseVoucherItemInterface): void {
        this.items.push(item);
        this.calculateTotals();
    }

    // Remove item from purchase voucher
    removeItem(itemId: string): void {
        this.items = this.items.filter(item => item.id !== itemId);
        this.calculateTotals();
    }

    // Update item in purchase voucher
    updateItem(itemId: string, updatedItem: PurchaseVoucherItemInterface): void {
        const index = this.items.findIndex(item => item.id === itemId);
        if (index !== -1) {
            this.items[index] = updatedItem;
            this.calculateTotals();
        }
    }

    // Get total items count
    getItemsCount(): number {
        return this.items.length;
    }

    // Get total quantity
    getTotalQuantity(): number {
        return this.items.reduce((total, item) => total + item.quantity, 0);
    }

    // Validate purchase voucher data
    validate(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.supplierVendorName.trim()) {
            errors.push('Supplier/Vendor name is required');
        }

        if (!this.partyInvoiceNumber.trim()) {
            errors.push('Party invoice number is required');
        }

        if (!this.partyInvoiceDate) {
            errors.push('Party invoice date is required');
        } else {
            // Validate that partyInvoiceDate is a valid Date
            const dateToValidate = this.partyInvoiceDate instanceof Date 
                ? this.partyInvoiceDate 
                : new Date(this.partyInvoiceDate);
            
            if (isNaN(dateToValidate.getTime())) {
                errors.push('Party invoice date must be a valid date');
            }
        }

        if (!this.supplierVendorBillingAddress.trim()) {
            errors.push('Supplier/Vendor billing address is required');
        }

        if (!this.fpoId) {
            errors.push('FPO ID is required');
        }

        if (this.items.length === 0) {
            errors.push('At least one item is required');
        }

        // Validate items
        this.items.forEach((item, index) => {
            if (!item.item.name.trim()) {
                errors.push(`Item ${index + 1}: Name is required`);
            }
            if (item.quantity <= 0) {
                errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
            }
            if (item.unitPrice < 0) {
                errors.push(`Item ${index + 1}: Unit price cannot be negative`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}