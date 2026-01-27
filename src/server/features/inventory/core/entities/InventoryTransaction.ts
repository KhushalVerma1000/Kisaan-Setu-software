export type TransactionType = 'purchase' | 'sale' | 'adjustment' | 'opening';
export type DocumentType = 'invoice' | 'purchase_voucher' | 'quotation' | 'purchase_order' | 'adjustment' | 'opening';
export type PartyType = 'customer' | 'supplier' | 'internal';

export interface InventoryTransactionInterface {
    id?: string;
    fpoId: string;
    itemId: string;
    itemType: 'product' | 'service';
    transactionType: TransactionType;
    quantity: number;
    unitPrice: number;
    documentId?: string;
    documentType?: DocumentType;
    documentNumber?: string;
    partyType?: PartyType;
    partyName?: string;
    partyLedgerId?: string;
    transactionDate: Date;
    notes?: string;
    createdBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
    stockBefore: number;
    stockAfter: number;
}

export class InventoryTransaction implements InventoryTransactionInterface {
    public id?: string;
    public fpoId: string;
    public itemId: string;
    public itemType: 'product' | 'service';
    public transactionType: TransactionType;
    public quantity: number;
    public unitPrice: number;
    public documentId?: string;
    public documentType?: DocumentType;
    public documentNumber?: string;
    public partyType?: PartyType;
    public partyName?: string;
    public partyLedgerId?: string;
    public transactionDate: Date;
    public notes?: string;
    public createdBy?: string;
    public createdAt?: Date;
    public updatedAt?: Date;
    public stockBefore: number;
    public stockAfter: number;

    constructor(data: InventoryTransactionInterface) {
        this.fpoId = data.fpoId;
        this.itemId = data.itemId;
        this.itemType = data.itemType;
        this.transactionType = data.transactionType;
        this.quantity = data.quantity;
        this.unitPrice = data.unitPrice;
        this.documentId = data.documentId;
        this.documentType = data.documentType;
        this.documentNumber = data.documentNumber;
        this.partyType = data.partyType;
        this.partyName = data.partyName;
        this.partyLedgerId = data.partyLedgerId;
        this.transactionDate = data.transactionDate instanceof Date ? data.transactionDate : new Date(data.transactionDate);
        this.notes = data.notes;
        this.createdBy = data.createdBy;
        this.createdAt = data.createdAt ? new Date(data.createdAt) : undefined;
        this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : undefined;
        this.stockBefore = data.stockBefore;
        this.stockAfter = data.stockAfter;
        this.id = data.id;
    }

    // Static creator
    static fromInterface(data: InventoryTransactionInterface): InventoryTransaction {
        return new InventoryTransaction(data);
    }

    /**
     * Calculate stock after this transaction
     * @param currentStock - Current stock before this transaction
     */
    calculateStockAfter(currentStock: number): number {
        this.stockBefore = currentStock;

        // For service items, we just track the flow, so stock calculation is virtual/cumulative usage
        if (this.itemType === 'service') {
            if (this.transactionType === 'purchase' || this.transactionType === 'opening' || this.transactionType === 'adjustment') {
                this.stockAfter = currentStock + this.quantity;
            } else {
                this.stockAfter = currentStock - Math.abs(this.quantity);
            }
            return this.stockAfter;
        }

        switch (this.transactionType) {
            case 'purchase':
            case 'opening':
                // Positive quantity increases stock
                this.stockAfter = currentStock + Math.abs(this.quantity);
                break;
            case 'sale':
                // Negative quantity decreases stock
                this.stockAfter = currentStock - Math.abs(this.quantity);
                break;
            case 'adjustment':
                // Adjustment can be positive or negative
                this.stockAfter = currentStock + this.quantity;
                break;
            default:
                this.stockAfter = currentStock;
        }

        return this.stockAfter;
    }

    /**
     * Get the net effect on inventory (positive = increase, negative = decrease)
     */
    getNetEffect(): number {
        return this.stockAfter - this.stockBefore;
    }

    /**
     * Get the total value of this transaction
     */
    getTotalValue(): number {
        return Math.abs(this.quantity) * this.unitPrice;
    }

    /**
     * Validate transaction data
     */
    validate(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.fpoId) errors.push('FPO ID is required');
        if (!this.itemId) errors.push('Item ID is required');
        if (!this.transactionType) errors.push('Transaction type is required');
        if (this.quantity === 0) errors.push('Quantity cannot be zero');
        if (this.unitPrice < 0) errors.push('Unit price cannot be negative');
        if (!this.transactionDate) errors.push('Transaction date is required');
        if (this.stockBefore < 0 && this.itemType === 'product') errors.push('Stock before cannot be negative');

        // Services can have "negative stock" which just means total usage/sales exceeded purchases (common for services)
        if (this.stockAfter < 0 && this.itemType === 'product') errors.push('Stock after cannot be negative (would result in negative inventory)');

        // Additional validations based on transaction type
        if (this.transactionType === 'sale' && this.quantity > 0) {
            errors.push('Sale quantity should be negative');
        }
        if (this.transactionType === 'purchase' && this.quantity < 0) {
            errors.push('Purchase quantity should be positive');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static createSaleTransaction(params: {
        fpoId: string;
        itemId: string;
        itemType: 'product' | 'service';
        quantity: number;
        unitPrice: number;
        invoiceId: string;
        invoiceNumber: string;
        customerName: string;
        customerId?: string;
        transactionDate: Date;
        currentStock: number;
    }): InventoryTransaction {
        const transaction = new InventoryTransaction({
            fpoId: params.fpoId,
            itemId: params.itemId,
            itemType: params.itemType,
            transactionType: 'sale',
            quantity: -Math.abs(params.quantity), // Negative for sales
            unitPrice: params.unitPrice,
            documentId: params.invoiceId,
            documentType: 'invoice',
            documentNumber: params.invoiceNumber,
            partyType: 'customer',
            partyName: params.customerName,
            partyLedgerId: params.customerId,
            transactionDate: params.transactionDate,
            stockBefore: params.currentStock,
            stockAfter: params.currentStock - params.quantity
        });

        // Recalculate stock after allowing for service logic
        transaction.calculateStockAfter(params.currentStock);

        return transaction;
    }

    /**
     * Create a transaction for a purchase
     */
    static createPurchaseTransaction(params: {
        fpoId: string;
        itemId: string;
        itemType: 'product' | 'service';
        quantity: number;
        unitPrice: number;
        purchaseVoucherId: string;
        voucherNumber: string;
        supplierName: string;
        supplierId?: string;
        transactionDate: Date;
        currentStock: number;
    }): InventoryTransaction {
        const transaction = new InventoryTransaction({
            fpoId: params.fpoId,
            itemId: params.itemId,
            itemType: params.itemType,
            transactionType: 'purchase',
            quantity: Math.abs(params.quantity), // Positive for purchases
            unitPrice: params.unitPrice,
            documentId: params.purchaseVoucherId,
            documentType: 'purchase_voucher',
            documentNumber: params.voucherNumber,
            partyType: 'supplier',
            partyName: params.supplierName,
            partyLedgerId: params.supplierId,
            transactionDate: params.transactionDate,
            stockBefore: params.currentStock,
            stockAfter: params.currentStock + params.quantity
        });

        // Recalculate stock after allowing for service logic
        transaction.calculateStockAfter(params.currentStock);

        return transaction;
    }

    static fromDbFormat(dbData: any): InventoryTransaction {
        return new InventoryTransaction({
            id: dbData.id,
            fpoId: dbData.fpo_id,
            itemId: dbData.item_id,
            itemType: dbData.item_type,
            transactionType: dbData.transaction_type,
            quantity: Number(dbData.quantity),
            unitPrice: Number(dbData.unit_price),
            documentId: dbData.document_id,
            documentType: dbData.document_type,
            documentNumber: dbData.document_number,
            partyType: dbData.party_type,
            partyName: dbData.party_name,
            partyLedgerId: dbData.party_ledger_id,
            transactionDate: new Date(dbData.transaction_date),
            notes: dbData.notes,
            createdBy: dbData.created_by,
            createdAt: dbData.created_at,
            updatedAt: dbData.updated_at,
            stockBefore: Number(dbData.stock_before),
            stockAfter: Number(dbData.stock_after)
        });
    }

    toDbFormat(): any {
        const dbData: any = {
            fpo_id: this.fpoId,
            item_id: this.itemId,
            item_type: this.itemType,
            transaction_type: this.transactionType,
            quantity: this.quantity,
            unit_price: this.unitPrice,
            document_id: this.documentId,
            document_type: this.documentType,
            document_number: this.documentNumber,
            party_type: this.partyType,
            party_name: this.partyName,
            party_ledger_id: this.partyLedgerId,
            transaction_date: this.transactionDate.toISOString(),
            notes: this.notes,
            created_by: this.createdBy,
            stock_before: this.stockBefore,
            stock_after: this.stockAfter
        };

        if (this.id) {
            dbData.id = this.id;
        }

        return dbData;
    }
}
