// server/features/fpo/core/entities/InvoiceSettings.ts
export class InvoiceSettings {
    public readonly id: string; // DB PK (uuid)
    public readonly fpoId: string; // Foreign key to FPO
    public invoicePrefix: string;
    public defaultTerms: string;
    public signatureUrl?: string;

    constructor(props: {
        id: string;
        fpoId: string;
        invoicePrefix?: string;
        defaultTerms?: string;
        signatureUrl?: string;
    }) {
        this.id = props.id;
        this.fpoId = props.fpoId;
        this.invoicePrefix = props.invoicePrefix ?? 'INV-';
        this.defaultTerms = props.defaultTerms ?? '';
        this.signatureUrl = props.signatureUrl;
    }
}