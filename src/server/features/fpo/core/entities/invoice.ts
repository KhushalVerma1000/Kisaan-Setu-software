// export class Invoice {
//     id: string;
//     date: Date;
//     customerName: string;
//     items: InvoiceItem[];
//     totalAmount: number;
//     status: 'pending' | 'paid' | 'cancelled';

//     constructor(
//         id: string,
//         date: Date,
//         customerName: string,
//         items: InvoiceItem[],
//         status: 'pending' | 'paid' | 'cancelled' = 'pending'
//     ) {
//         this.id = id;
//         this.date = date;
//         this.customerName = customerName;
//         this.items = items;
//         this.totalAmount = this.calculateTotal();
//         this.status = status;
//     }

//     private calculateTotal(): number {
//         return this.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
//     }
// }

// export interface InvoiceItem {
//     description: string;
//     quantity: number;
//     unitPrice: number;
// }


