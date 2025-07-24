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
    parentCategory?: string;
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

export interface InvoiceItemInterface {
    id: string;
    item: ItemInterface;
    quantity: number;
    unitPrice: number;
    discount: DiscountInterface;
    gstConfig: GSTConfigInterface;
    lineNumber: number;
    calculations: LineCalculationsInterface;
}

export interface InvoiceSummaryInterface {
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

// Updated Address Interface
export interface AddressInterface {
    address: string;
    phone: string;
    state: string;
}

// Updated Customer Interface
export interface CustomerInterface {
    id?: string;
    name: string;
    billingAddress: AddressInterface;
    shippingAddress?: AddressInterface;
    gstin?: string;
    isSameAsBilling?: boolean;
}

export interface InvoiceInterface {
    id?: string;
    invoiceNumber: string;
    invoiceDate: Date | string;
    customer: CustomerInterface;
    eWayBillNumber?: string;
    vehicleNumber?: string;
    poNumber?: string;
    items: InvoiceItemInterface[];
    summary: InvoiceSummaryInterface;
    gstBreakdown: GSTBreakdownInterface;
    documentType: 'invoice';
    fpoId: string;
    createdAt?: Date;
    updatedAt?: Date;
    createdBy?: string;
    status?: 'draft' | 'sent' | 'paid' | 'cancelled';
    notes?: string;
}

export class Invoice implements InvoiceInterface {
    public id?: string;
    public invoiceNumber: string;
    public invoiceDate: Date;
    public customer: CustomerInterface;
    public eWayBillNumber?: string;
    public vehicleNumber?: string;
    public poNumber?: string;
    public items: InvoiceItemInterface[];
    public summary: InvoiceSummaryInterface;
    public gstBreakdown: GSTBreakdownInterface;
    public documentType: 'invoice' = 'invoice' as const;
    public fpoId: string;
    public createdAt?: Date;
    public updatedAt?: Date;
    public createdBy?: string;
    public status?: 'draft' | 'sent' | 'paid' | 'cancelled';
    public notes?: string;

    constructor(invoiceData: InvoiceInterface) {
        this.id = invoiceData.id;
        this.invoiceNumber = invoiceData.invoiceNumber;
        
        // Ensure invoiceDate is a Date object
        this.invoiceDate = invoiceData.invoiceDate instanceof Date 
            ? invoiceData.invoiceDate 
            : new Date(invoiceData.invoiceDate);
            
        this.customer = invoiceData.customer;
        this.eWayBillNumber = invoiceData.eWayBillNumber;
        this.vehicleNumber = invoiceData.vehicleNumber;
        this.poNumber = invoiceData.poNumber;
        this.items = invoiceData.items;
        this.summary = invoiceData.summary;
        this.gstBreakdown = invoiceData.gstBreakdown;
        this.fpoId = invoiceData.fpoId;
        this.createdAt = invoiceData.createdAt;
        this.updatedAt = invoiceData.updatedAt;
        this.createdBy = invoiceData.createdBy;
        this.status = invoiceData.status || 'draft';
        this.notes = invoiceData.notes;
    }

    // Create from interface
    static fromInterface(data: InvoiceInterface): Invoice {
        return new Invoice(data);
    }

    // Create from database format
    static fromDbFormat(dbData: any): Invoice {
        return new Invoice({
            id: dbData.id,
            invoiceNumber: dbData.invoice_number,
            invoiceDate: new Date(dbData.invoice_date),
            customer: JSON.parse(dbData.customer || '{}'),
            eWayBillNumber: dbData.eway_bill_number,
            vehicleNumber: dbData.vehicle_number,
            poNumber: dbData.po_number,
            items: JSON.parse(dbData.items || '[]'),
            summary: JSON.parse(dbData.summary || '{}'),
            gstBreakdown: JSON.parse(dbData.gst_breakdown || '{}'),
            documentType: 'invoice',
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

        // Convert invoice date (required field)
        const invoiceDateString = convertDateToISOString(this.invoiceDate, 'Invoice date');

        return {
            id: this.id,
            invoice_number: this.invoiceNumber,
            invoice_date: invoiceDateString,
            customer: JSON.stringify(this.customer),
            eway_bill_number: this.eWayBillNumber,
            vehicle_number: this.vehicleNumber,
            po_number: this.poNumber,
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

// Calculate line item GST based on invoice GST type and GST config
private calculateLineItemGST(item: InvoiceItemInterface, isInterstate: boolean): LineCalculationsInterface {
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
    // Determine if interstate based on shipping address
    const shippingState = this.customer.shippingAddress?.state || this.customer.billingAddress.state;
    const isInterstate = fpoState ? shippingState !== fpoState : false;
    
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
    // let grandTotalCalculation: number;
    const shipmentAmount = this.summary?.shipmentAmount || 0;
    const roundOff = this.summary?.roundOff || 0;
    
    // For mixed inclusive/exclusive items, we sum up line totals
    const totalLineAmount = this.items.reduce((sum, item) => sum + item.calculations.lineTotal, 0);
  const  grandTotalCalculation = totalLineAmount + shipmentAmount + roundOff;

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
    // Add item to invoice
    async addItem(item: InvoiceItemInterface, fpoState?: string): Promise<void> {
        this.items.push(item);
        await this.calculateTotals(fpoState);
    }

    // Remove item from invoice
    async removeItem(itemId: string, fpoState?: string): Promise<void> {
        this.items = this.items.filter(item => item.id !== itemId);
        await this.calculateTotals(fpoState);
    }

    // Update item in invoice
    async updateItem(itemId: string, updatedItem: InvoiceItemInterface, fpoState?: string): Promise<void> {
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

    // Generate next invoice number (utility method)
    static generateInvoiceNumber(prefix: string = 'INV', lastNumber: number = 0): string {
        const nextNumber = lastNumber + 1;
        return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
    }

    // Validate invoice data
    validate(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.invoiceNumber.trim()) {
            errors.push('Invoice number is required');
        }

        if (!this.invoiceDate) {
            errors.push('Invoice date is required');
        } else {
            // Validate that invoiceDate is a valid Date
            const dateToValidate = this.invoiceDate instanceof Date 
                ? this.invoiceDate 
                : new Date(this.invoiceDate);
            
            if (isNaN(dateToValidate.getTime())) {
                errors.push('Invoice date must be a valid date');
            }
        }

        if (!this.customer.name.trim()) {
            errors.push('Customer name is required');
        }

        if (!this.customer.billingAddress.address.trim()) {
            errors.push('Customer billing address is required');
        }

        if (!this.customer.billingAddress.state.trim()) {
            errors.push('Customer billing address state is required');
        }

        // Validate shipping address if provided and not same as billing
        if (!this.customer.isSameAsBilling && this.customer.shippingAddress) {
            if (!this.customer.shippingAddress.address.trim()) {
                errors.push('Customer shipping address is required');
            }
            if (!this.customer.shippingAddress.state.trim()) {
                errors.push('Customer shipping address state is required');
            }
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

    // Check if invoice is overdue (utility method)
    isOverdue(daysOverdue: number = 30): boolean {
        if (this.status === 'paid' || this.status === 'cancelled') {
            return false;
        }

        const currentDate = new Date();
        const invoiceDate = new Date(this.invoiceDate);
        const daysDiff = Math.floor((currentDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return daysDiff > daysOverdue;
    }

    // Mark invoice as paid
    markAsPaid(): void {
        this.status = 'paid';
        this.updatedAt = new Date();
    }

    // Mark invoice as sent
    markAsSent(): void {
        this.status = 'sent';
        this.updatedAt = new Date();
    }

    // Cancel invoice
    cancel(): void {
        this.status = 'cancelled';
        this.updatedAt = new Date();
    }
}