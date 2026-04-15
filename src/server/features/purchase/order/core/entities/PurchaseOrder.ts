import { GSTBreakdownInterface, PurchaseVoucherItemInterface, PurchaseVoucherSummaryInterface } from "@/server/features/purchase/core/entities/PurchaseVoucher";

// Reusing PurchaseVoucher interfaces as they align well (Supplier, Items, Summary)

export type PurchaseOrderStatus = 'draft' | 'sent' | 'confirmed' | 'partial' | 'received' | 'cancelled';

export interface PurchaseOrderInterface {
    id?: string;
    poNumber: string;
    poDate: Date | string;
    supplier: any; // Using 'any' or defining SupplierInterface properly. PurchaseVoucher uses specific fields (supplierVendorName, etc) flatly.
    // Migration says 'supplier' column is JSONB. So likely an object.

    // We should define a SupplierInterface for this JSON structure.

    referenceNumber?: string;
    deliveryDate?: Date | string;
    items: PurchaseVoucherItemInterface[];
    summary: PurchaseVoucherSummaryInterface;
    gstBreakdown: GSTBreakdownInterface;
    documentType: 'purchase_order';
    fpoId: string;
    createdAt?: Date;
    updatedAt?: Date;
    createdBy?: string;
    status?: PurchaseOrderStatus;
    notes?: string;
}

export interface SupplierDetails {
    id?: string;
    name: string;
    billingAddress: string;
    state: string;
    gstin?: string;
    email?: string;
    phone?: string;
}

export class PurchaseOrder implements PurchaseOrderInterface {
    public id?: string;
    public poNumber: string;
    public poDate: Date;
    public supplier: SupplierDetails;
    public referenceNumber?: string;
    public deliveryDate?: Date;
    public items: PurchaseVoucherItemInterface[];
    public summary: PurchaseVoucherSummaryInterface;
    public gstBreakdown: GSTBreakdownInterface;
    public documentType: 'purchase_order' = 'purchase_order' as const;
    public fpoId: string;
    public createdAt?: Date;
    public updatedAt?: Date;
    public createdBy?: string;
    public status?: PurchaseOrderStatus;
    public notes?: string;

    constructor(data: PurchaseOrderInterface) {
        this.id = data.id;
        this.poNumber = data.poNumber;
        this.poDate = data.poDate instanceof Date ? data.poDate : new Date(data.poDate);
        this.supplier = data.supplier;
        this.referenceNumber = data.referenceNumber;
        this.deliveryDate = data.deliveryDate ? (data.deliveryDate instanceof Date ? data.deliveryDate : new Date(data.deliveryDate)) : undefined;
        this.items = data.items;
        this.summary = data.summary;
        this.gstBreakdown = data.gstBreakdown;
        this.fpoId = data.fpoId;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
        this.createdBy = data.createdBy;
        this.status = data.status || 'draft';
        this.notes = data.notes;
    }

    static fromInterface(data: PurchaseOrderInterface): PurchaseOrder {
        return new PurchaseOrder(data);
    }

    static fromDbFormat(dbData: any): PurchaseOrder {
        return new PurchaseOrder({
            id: dbData.id,
            poNumber: dbData.po_number,
            poDate: new Date(dbData.po_date),
            supplier: dbData.supplier,
            referenceNumber: dbData.reference_number,
            deliveryDate: dbData.delivery_date ? new Date(dbData.delivery_date) : undefined,
            items: dbData.items || [], // Often line items fetched separately
            summary: dbData.summary,
            gstBreakdown: dbData.gst_breakdown,
            documentType: 'purchase_order',
            fpoId: dbData.fpo_id,
            createdAt: dbData.created_at ? new Date(dbData.created_at) : undefined,
            updatedAt: dbData.updated_at ? new Date(dbData.updated_at) : undefined,
            createdBy: dbData.created_by,
            status: dbData.status || 'draft',
            notes: dbData.notes
        });
    }

    toDbFormat(): any {
        return {
            id: this.id,
            po_number: this.poNumber,
            po_date: this.poDate.toISOString(),
            supplier: this.supplier,
            reference_number: this.referenceNumber,
            delivery_date: this.deliveryDate?.toISOString(),
            summary: this.summary,
            gst_breakdown: this.gstBreakdown,
            document_type: this.documentType,
            fpo_id: this.fpoId,
            created_at: this.createdAt?.toISOString(),
            updated_at: this.updatedAt?.toISOString(),
            created_by: this.createdBy,
            status: this.status,
            notes: this.notes
        };
    }
}
