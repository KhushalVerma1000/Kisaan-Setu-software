export interface DiscountInterface {
    value: number;
    type: 'percent' | 'fixed';
}

export interface GSTConfigInterface {
    rate: number;
    type: 'including' | 'excluding' | 'exempt';
}

export interface ItemCategoryInterface {
    id: string;
    name: string;
    description?: string;
    parentCategory? : ItemCategoryInterface;
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
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalGstAmount: number;
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
}

export interface PurchaseVoucherSummaryInterface {
    subTotal: number;
    totalDiscount: number;
    totalCGST: number;
    totalSGST: number;
    totalIGST: number;
    totalGST: number;
    shipmentAmount: number;
    roundOff: number;
    grandTotal: number;
    gstType: 'intrastate' | 'interstate'; // CGST+SGST vs IGST
}

export interface GSTBreakdownInterface {
    [rate: string]: {
        taxable: number;
        cgst?: number;
        sgst?: number;
        igst?: number;
        totalGst: number;
    };
}

export interface PurchaseVoucherInterface {
    id?: string;
    voucherNumber?: string; // NEW: Auto-generated voucher number

    poNumber?: string;
    supplierVendorName: string;
    supplierVendorId?: string;
    supplierState: string; // NEW: Store supplier state for GST calculation
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
    public voucherNumber?: string; // NEW: Auto-generated voucher number

    public poNumber?: string;
    public supplierVendorName: string;
    public supplierVendorId?: string;
    public supplierState: string; // NEW: Store supplier state
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
        this.voucherNumber = purchaseVoucherData.voucherNumber; // NEW: Auto-generated voucher number
        this.poNumber = purchaseVoucherData.poNumber;
        this.supplierVendorName = purchaseVoucherData.supplierVendorName;
        this.supplierVendorId = purchaseVoucherData.supplierVendorId;
        this.supplierState = purchaseVoucherData.supplierState;
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
        voucherNumber: dbData.voucher_number,
        poNumber: dbData.po_number,
        supplierVendorName: dbData.supplier_vendor_name,
        supplierVendorId: dbData.supplier_vendor_id,
        supplierState: dbData.supplier_state,
        partyInvoiceNumber: dbData.party_invoice_number,
        partyInvoiceDate: new Date(dbData.party_invoice_date),
        supplierVendorBillingAddress: dbData.supplier_vendor_billing_address,
        gstin: dbData.gstin,
        items: dbData.items,           // ✅ Direct assignment (no parsing)
        summary: dbData.summary,       // ✅ Direct assignment (no parsing)
        gstBreakdown: dbData.gst_breakdown, // ✅ Direct assignment (no parsing)
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
        supplier_state: this.supplierState,
        party_invoice_number: this.partyInvoiceNumber,
        party_invoice_date: partyInvoiceDateString,
        supplier_vendor_billing_address: this.supplierVendorBillingAddress,
        gstin: this.gstin,
        items: this.items,           // ✅ Direct object assignment
        summary: this.summary,       // ✅ Direct object assignment
        gst_breakdown: this.gstBreakdown, // ✅ Direct object assignment
        document_type: this.documentType,
        fpo_id: this.fpoId,
        created_at: convertOptionalDateToISOString(this.createdAt),
        updated_at: convertOptionalDateToISOString(this.updatedAt),
        created_by: this.createdBy,
        status: this.status,
        notes: this.notes
    };
    }

    // Calculate line item GST based on purchase voucher GST type and GST config
    private calculateLineItemGST(item: PurchaseVoucherItemInterface, isInterstate: boolean): LineCalculationsInterface {
        const baseAmount = item.quantity * item.unitPrice;
        
        let discountAmount = 0;
        if (item.discount.type === 'percent') {
            discountAmount = (baseAmount * item.discount.value) / 100;
        } else {
            discountAmount = item.discount.value;
        }
        
        const amountAfterDiscount = baseAmount - discountAmount;
        const gstRate = item.gstConfig.rate / 100;
        
        let taxableAmount: number;
        let totalGstAmount: number;
        
        // Handle GST calculation based on GST config type
        if (item.gstConfig.type === 'exempt') {
            // GST exempt items - no GST applicable
            taxableAmount = amountAfterDiscount;
            totalGstAmount = 0;
        } else if (item.gstConfig.type === 'including') {
            // Price includes GST - need to extract GST from the discounted amount
            taxableAmount = amountAfterDiscount / (1 + gstRate);
            totalGstAmount = amountAfterDiscount - taxableAmount;
        } else {
            // Price excludes GST - add GST to the discounted amount
            taxableAmount = amountAfterDiscount;
            totalGstAmount = taxableAmount * gstRate;
        }
        
        let cgstAmount = 0;
        let sgstAmount = 0;
        let igstAmount = 0;
        
        // Only split GST if not exempt
        if (item.gstConfig.type !== 'exempt' && totalGstAmount > 0) {
            if (isInterstate) {
                // Interstate: IGST only
                igstAmount = totalGstAmount;
            } else {
                // Intrastate: CGST + SGST (split equally)
                cgstAmount = totalGstAmount / 2;
                sgstAmount = totalGstAmount / 2;
            }
        }
        
        // Line total calculation
        let lineTotal: number;
        if (item.gstConfig.type === 'exempt') {
            // For exempt items, line total is just the discounted amount
            lineTotal = amountAfterDiscount;
        } else if (item.gstConfig.type === 'including') {
            // If GST is included in price, line total is the discounted amount
            lineTotal = amountAfterDiscount;
        } else {
            // If GST is excluded from price, add GST to get line total
            lineTotal = taxableAmount + totalGstAmount;
        }
        
        return {
            baseAmount: Math.round(baseAmount * 100) / 100,
            discountAmount: Math.round(discountAmount * 100) / 100,
            taxableAmount: Math.round(taxableAmount * 100) / 100,
            cgstAmount: Math.round(cgstAmount * 100) / 100,
            sgstAmount: Math.round(sgstAmount * 100) / 100,
            igstAmount: Math.round(igstAmount * 100) / 100,
            totalGstAmount: Math.round(totalGstAmount * 100) / 100,
            lineTotal: Math.round(lineTotal * 100) / 100
        };
    }

    // Updated calculateTotals method to handle GST type properly
    async calculateTotals(fpoState?: string): Promise<void> {
        // Determine if interstate based on supplier state vs FPO state
        const isInterstate = fpoState ? this.supplierState !== fpoState : false;
        let subTotal = 0;
        let totalDiscount = 0;
        let totalCGST = 0;
        let totalSGST = 0;
        let totalIGST = 0;
        const gstBreakdown: GSTBreakdownInterface = {};

        // Calculate each line item
        this.items.forEach(item => {
            const calculations = this.calculateLineItemGST(item, isInterstate);
            
            // Update item calculations
            item.calculations = calculations;
            
            // Add to totals
            subTotal += calculations.baseAmount;
            totalDiscount += calculations.discountAmount;
            totalCGST += calculations.cgstAmount;
            totalSGST += calculations.sgstAmount;
            totalIGST += calculations.igstAmount;

            // Update GST breakdown - only add to breakdown if not exempt
            const rate = item.gstConfig.rate.toString();
            
            // Only create GST breakdown entries for non-exempt items
            if (item.gstConfig.type !== 'exempt') {
                if (!gstBreakdown[rate]) {
                    gstBreakdown[rate] = { 
                        taxable: 0, 
                        cgst: 0, 
                        sgst: 0, 
                        igst: 0, 
                        totalGst: 0 
                    };
                }
                
                gstBreakdown[rate].taxable += calculations.taxableAmount;
                
                if (isInterstate) {
                    gstBreakdown[rate].igst! += calculations.igstAmount;
                } else {
                    gstBreakdown[rate].cgst! += calculations.cgstAmount;
                    gstBreakdown[rate].sgst! += calculations.sgstAmount;
                }
                
                gstBreakdown[rate].totalGst += calculations.totalGstAmount;
            }
        });

        const totalGST = totalCGST + totalSGST + totalIGST;

        // Calculate grand total
        const shipmentAmount = this.summary?.shipmentAmount || 0;
        const roundOff = this.summary?.roundOff || 0;
        
        // For mixed inclusive/exclusive items, we sum up line totals
        const totalLineAmount = this.items.reduce((sum, item) => sum + item.calculations.lineTotal, 0);
        const grandTotalCalculation = totalLineAmount + shipmentAmount + roundOff;

        this.summary = {
            subTotal: Math.round(subTotal * 100) / 100,
            totalDiscount: Math.round(totalDiscount * 100) / 100,
            totalCGST: Math.round(totalCGST * 100) / 100,
            totalSGST: Math.round(totalSGST * 100) / 100,
            totalIGST: Math.round(totalIGST * 100) / 100,
            totalGST: Math.round(totalGST * 100) / 100,
            shipmentAmount: shipmentAmount,
            roundOff: roundOff,
            grandTotal: Math.round(grandTotalCalculation * 100) / 100,
            gstType: isInterstate ? 'interstate' : 'intrastate'
        };

        // Round GST breakdown values
        Object.keys(gstBreakdown).forEach(rate => {
            gstBreakdown[rate].taxable = Math.round(gstBreakdown[rate].taxable * 100) / 100;
            if (gstBreakdown[rate].cgst !== undefined) {
                gstBreakdown[rate].cgst = Math.round(gstBreakdown[rate].cgst! * 100) / 100;
            }
            if (gstBreakdown[rate].sgst !== undefined) {
                gstBreakdown[rate].sgst = Math.round(gstBreakdown[rate].sgst! * 100) / 100;
            }
            if (gstBreakdown[rate].igst !== undefined) {
                gstBreakdown[rate].igst = Math.round(gstBreakdown[rate].igst! * 100) / 100;
            }
            gstBreakdown[rate].totalGst = Math.round(gstBreakdown[rate].totalGst * 100) / 100;
        });

        this.gstBreakdown = gstBreakdown;
    }

    // Add item to purchase voucher
    async addItem(item: PurchaseVoucherItemInterface, fpoState?: string): Promise<void> {
        this.items.push(item);
        await this.calculateTotals(fpoState);
    }

    // Remove item from purchase voucher
    async removeItem(itemId: string, fpoState?: string): Promise<void> {
        this.items = this.items.filter(item => item.id !== itemId);
        await this.calculateTotals(fpoState);
    }

    // Update item in purchase voucher
    async updateItem(itemId: string, updatedItem: PurchaseVoucherItemInterface, fpoState?: string): Promise<void> {
        const index = this.items.findIndex(item => item.id === itemId);
        if (index !== -1) {
            this.items[index] = updatedItem;
            await this.calculateTotals(fpoState);
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

        if (!this.supplierState.trim()) {
            errors.push('Supplier state is required for GST calculation');
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