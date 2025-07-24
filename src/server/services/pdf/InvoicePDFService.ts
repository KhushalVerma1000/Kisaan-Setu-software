// services/pdf/InvoicePDFService.ts
import { InvoiceInterface } from '../../features/sales/invoice/core/entities/invoice';
import { BasePDFService } from './shared/BasePDFService';
import { FpoProfile } from '../../features/fpo/core/entities/FpoProfile';
import { InvoiceAPI } from '@/server/features/sales/invoice/infrastructure/apihelpers/invoiceApi';
import autoTable from 'jspdf-autotable';
import { UserOptions, ThemeType } from 'jspdf-autotable';

export class InvoicePDFService extends BasePDFService {
  
  async generatePDF(invoiceId: string): Promise<void> {
    try {
      console.log('🚀 Starting PDF generation for invoice:', invoiceId);
      
      const invoiceData = await this.fetchInvoiceData(invoiceId);
      console.log('📄 Invoice data fetched:', invoiceData.invoiceNumber);
      
      const fpoProfile = await this.fetchFPOProfile(invoiceData.fpoId);
      console.log('🏢 FPO profile fetched:', fpoProfile.companyName);

      await this.createInvoicePDF(invoiceData, fpoProfile);
      this.doc.save(`Invoice - ${invoiceData.invoiceNumber}.pdf`);
      
      console.log('✅ PDF generation completed successfully');
    } catch (error) {
      console.error('❌ Error generating invoice PDF:', error);
      throw new Error('Failed to generate invoice PDF');
    }
  }

  private async createInvoicePDF(invoice: InvoiceInterface, fpoProfile: FpoProfile): Promise<void> {
    console.log('📋 Starting createInvoicePDF...');
    let currentY = this.margin;

    // Add company logo if enabled
    if (fpoProfile.logoUrl) {
      console.log('✅ Adding company logo...');
      currentY = await this.addCompanyLogo(fpoProfile.logoUrl, currentY);
    }

    // Add company header with invoice title on same line
    console.log('🏢 Adding company header with invoice title...');
    currentY = this.addCompanyHeaderWithInvoiceTitle(fpoProfile, invoice, currentY);

    // Add invoice details (right aligned)
    console.log('📄 Adding invoice details...');
    currentY = this.addInvoiceDetails(invoice, currentY);

    // Add customer addresses
    console.log('📍 Adding customer addresses...');
    currentY = this.addCustomerAddresses(invoice, currentY);

    // Add items table
    console.log('📊 Adding items table...');
    currentY = this.addInvoiceItemsTable(invoice, currentY);

    // Check if we need a new page before adding remaining content
    if (currentY > this.pageHeight - 100) {
      this.doc.addPage();
      currentY = this.margin;
    }

    // Add terms & conditions and totals side by side
    console.log('📋 Adding terms and totals...');
    currentY = this.addTermsAndTotalsSection(invoice, fpoProfile, currentY);

    // Add GST breakdown
    if (Object.keys(invoice.gstBreakdown).length > 0) {
      console.log('💰 Adding GST breakdown...');
      currentY = this.addInvoiceGSTBreakdown(invoice.gstBreakdown, currentY);
    }

    // Check if we need a new page for remaining content
    if (currentY > this.pageHeight - 80) {
      this.doc.addPage();
      currentY = this.margin;
    }

    // Add notes if any
    if (invoice.notes) {
      console.log('📝 Adding notes...');
      currentY = this.addNotesSection(invoice.notes, currentY);
    }

    // Add bank details if enabled
    const primaryBankDetail = fpoProfile.bankDetails?.find(bd => bd.isPrimary) || fpoProfile.bankDetails?.[0];
    if (primaryBankDetail && primaryBankDetail.printBankDetails) {
      console.log('🏦 Adding bank details...');
      currentY = this.addBankDetailsSection(primaryBankDetail, currentY);
    }

    // Add signature section
    console.log('✍️ Adding signature section...');
    this.addSignatureSection('Customer Signature', 'Authorized Signature');

    // Add footer
    this.addFooter();

    console.log('✅ Invoice PDF creation completed');
  }

  private addCompanyHeaderWithInvoiceTitle(fpoProfile: FpoProfile, invoice: InvoiceInterface, currentY: number): number {
    // Company name on left, INVOICE on right
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(18);
    this.doc.text(fpoProfile.companyName || 'COMPANY NAME', this.margin, currentY);
    
    // INVOICE title on right
    this.doc.setFontSize(20);
    this.doc.setTextColor(220, 53, 69); // Red color for invoice
    this.doc.text('INVOICE', this.pageWidth - this.margin, currentY, { align: 'right' });
    this.doc.setTextColor(0, 0, 0); // Reset to black
    
    currentY += 12;

    // Company details
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    
    // Address line
    if (fpoProfile.addressLine1 || fpoProfile.city || fpoProfile.state) {
      const addressParts = [
        fpoProfile.addressLine1,
        fpoProfile.city,
        fpoProfile.state,
        fpoProfile.pincode
      ].filter(Boolean);
      
      const addressText = addressParts.join(', ');
      this.doc.text(addressText, this.margin, currentY);
      currentY += 4;
    }

    // Contact info
    const contactParts = [];
    if (fpoProfile.invoiceEmail) contactParts.push(`Email : ${fpoProfile.invoiceEmail}`);
    if (fpoProfile.phoneNumber) contactParts.push(`Phone : ${fpoProfile.phoneNumber}`);
    
    if (contactParts.length > 0) {
      this.doc.text(contactParts.join(' | '), this.margin, currentY);
      currentY += 4;
    }

    // GST Number
    if (fpoProfile.gstNumber) {
      this.doc.text(`GSTN: ${fpoProfile.gstNumber}`, this.margin, currentY);
      currentY += 4;
    }

    return currentY + 15;
  }

  private addInvoiceDetails(invoice: InvoiceInterface, currentY: number): number {
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);

    const invoiceDetails = [
      `# ${invoice.invoiceNumber}`,
      `Date: ${this.formatDate(invoice.invoiceDate)}`
    ];

    if (invoice.status) {
      invoiceDetails.push(`Status: ${invoice.status.toUpperCase()}`);
    }

    let detailY = currentY - 30; // Position near the INVOICE title
    invoiceDetails.forEach(detail => {
      this.doc.text(detail, this.pageWidth - this.margin, detailY, { align: 'right' });
      detailY += 5;
    });

    return currentY;
  }

  private addCustomerAddresses(invoice: InvoiceInterface, currentY: number): number {
    const customer = invoice.customer;
    const leftColumn = this.margin;
    const rightColumn = this.pageWidth / 2 + 10;

    // Add a line separator
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, currentY, this.pageWidth - this.margin, currentY);
    currentY += 8;

    // Headers
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.text('Bill To:', leftColumn, currentY);
    this.doc.text('Shipped To:', rightColumn, currentY);
    currentY += 8;

    // Customer name
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.text(customer.name.toUpperCase(), leftColumn, currentY);
    this.doc.text(customer.name.toUpperCase(), rightColumn, currentY);
    currentY += 6;

    // Addresses
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);

    const billingLines = this.doc.splitTextToSize(customer.billingAddress.address, (this.pageWidth / 2) - 30);
    billingLines.forEach((line: string, index: number) => {
      this.doc.text(line, leftColumn, currentY + (index * 4));
    });

    const shippingAddress = customer.isSameAsBilling || !customer.shippingAddress 
      ? customer.billingAddress 
      : customer.shippingAddress;

    const shippingLines = this.doc.splitTextToSize(shippingAddress.address, (this.pageWidth / 2) - 30);
    shippingLines.forEach((line: string, index: number) => {
      this.doc.text(line, rightColumn, currentY + (index * 4));
    });

    currentY += Math.max(billingLines.length, shippingLines.length) * 4 + 4;

    // GSTIN if available
    if (customer.gstin) {
      this.doc.text(`GSTN: ${customer.gstin}`, leftColumn, currentY);
      this.doc.text(`GSTN: ${customer.gstin}`, rightColumn, currentY);
      currentY += 4;
    }

    // Phone numbers
    this.doc.text(`Phone: ${customer.billingAddress.phone}`, leftColumn, currentY);
    this.doc.text(`Phone: ${shippingAddress.phone}`, rightColumn, currentY);
    currentY += 12;

    return currentY;
  }

  private addInvoiceItemsTable(invoice: InvoiceInterface, currentY: number): number {
    const tableData = invoice.items.map((item, index) => {
      const calculations = item.calculations;
      return [
        (index + 1).toString(),
        `${item.item.name}${item.item.unit ? ` (${item.item.unit.label})` : ''}`,
        `${item.quantity.toFixed(2)}${item.item.unit?.code || 'PAC'}`,
        this.formatCurrencyPlain(item.unitPrice),
        this.formatCurrencyPlain(calculations.baseAmount),
        `${item.gstConfig.rate}%`,
        this.formatCurrencyPlain(calculations.discountAmount),
        this.formatCurrencyPlain(calculations.lineTotal)
      ];
    });

    const tableOptions: UserOptions = {
      startY: currentY,
      head: [['#', 'Item', 'Qty/Unit', 'Rate', 'Amount', 'GST', 'Discount', 'Total']],
      body: tableData,
      theme: 'grid' as ThemeType,
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center',
        cellPadding: 3
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3,
        valign: 'middle'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'left', cellWidth: 60 },
        2: { halign: 'center', cellWidth: 22 },
        3: { halign: 'right', cellWidth: 22 },
        4: { halign: 'right', cellWidth: 22 },
        5: { halign: 'center', cellWidth: 18 },
        6: { halign: 'right', cellWidth: 22 },
        7: { halign: 'right', cellWidth: 22 }
      },
      margin: { left: this.margin, right: this.margin },
      tableWidth: 'auto',
      showHead: 'everyPage',
      styles: {
        lineColor: [128, 128, 128],
        lineWidth: 0.1,
        cellPadding: 3
      }
    };

    autoTable(this.doc, tableOptions);
    return (this.doc as any).lastAutoTable.finalY + 10;
  }

  private addTermsAndTotalsSection(invoice: InvoiceInterface, fpoProfile: FpoProfile, currentY: number): number {
    const leftColumn = this.margin;
    const rightColumn = this.pageWidth / 2 + 20;
    let leftY = currentY;
    let rightY = currentY;

    // Add Terms & Conditions on the left
    if (fpoProfile.invoiceSettings?.defaultTerms) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(11);
      this.doc.text('Terms & Conditions', leftColumn, leftY);
      leftY += 6;

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(9);
      const termsLines = this.doc.splitTextToSize(fpoProfile.invoiceSettings.defaultTerms, (this.pageWidth / 2) - 30);
      termsLines.forEach((line: string, index: number) => {
        this.doc.text(line, leftColumn, leftY + (index * 4));
      });
      leftY += termsLines.length * 4;
    }

    // Add totals on the right
    const summary = invoice.summary;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);

    const totalsData = [
      ['Subtotal:', this.formatCurrencyPlain(summary.subTotal)]
    ];

    if (summary.totalDiscount > 0) {
      totalsData.push(['Discount:', `-${this.formatCurrencyPlain(summary.totalDiscount)}`]);
    }

    if (summary.gstType === 'intrastate') {
      if (summary.totalCGST > 0) {
        totalsData.push(['CGST:', this.formatCurrencyPlain(summary.totalCGST)]);
      }
      if (summary.totalSGST > 0) {
        totalsData.push(['SGST:', this.formatCurrencyPlain(summary.totalSGST)]);
      }
    } else {
      if (summary.totalIGST > 0) {
        totalsData.push(['IGST:', this.formatCurrencyPlain(summary.totalIGST)]);
      }
    }

    if (summary.shipmentAmount > 0) {
      totalsData.push(['Shipment Amount:', this.formatCurrencyPlain(summary.shipmentAmount)]);
    }

    if (summary.roundOff !== 0) {
      totalsData.push(['Round Off:', this.formatCurrencyPlain(summary.roundOff)]);
    }

    // Regular totals
    totalsData.forEach(([label, value]) => {
      this.doc.text(label, rightColumn, rightY);
      this.doc.text(value, this.pageWidth - this.margin, rightY, { align: 'right' });
      rightY += 5;
    });

    // Grand Total with emphasis
    rightY += 2;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.text('Grand Total:', rightColumn, rightY);
    this.doc.text(this.formatCurrencyPlain(summary.grandTotal), this.pageWidth - this.margin, rightY, { align: 'right' });

    return Math.max(leftY, rightY) + 15;
  }

  private addInvoiceGSTBreakdown(gstBreakdown: any, currentY: number): number {
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.text('GST Breakdown:', this.margin, currentY);
    currentY += 8;

    const gstTableData = Object.entries(gstBreakdown).map(([rate, breakdown]: [string, any]) => {
      const row = [
        `${rate}%`,
        this.formatCurrencyPlain(breakdown.taxable)
      ];

      if (breakdown.cgst !== undefined) {
        row.push(this.formatCurrencyPlain(breakdown.cgst));
        row.push(this.formatCurrencyPlain(breakdown.sgst));
      } else {
        row.push(this.formatCurrencyPlain(breakdown.igst));
        row.push('-');
      }

      row.push(this.formatCurrencyPlain(breakdown.totalGst));
      return row;
    });

    const hasIntrastate = Object.values(gstBreakdown).some((b: any) => b.cgst !== undefined);
    const headers = hasIntrastate
      ? ['GST Rate', 'Taxable Amount', 'CGST', 'SGST', 'Total GST']
      : ['GST Rate', 'Taxable Amount', 'IGST', 'SGST', 'Total GST'];

    const gstTableOptions: UserOptions = {
      startY: currentY,
      head: [headers],
      body: gstTableData,
      theme: 'grid' as ThemeType,
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center',
        cellPadding: 3
      },
      bodyStyles: {
        fontSize: 9,
        halign: 'right',
        cellPadding: 3
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 25 },
        1: { halign: 'right', cellWidth: 40 },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 30 },
        4: { halign: 'right', cellWidth: 35 }
      },
      margin: { left: this.margin, right: this.margin },
      tableWidth: 'auto',
      styles: {
        lineColor: [128, 128, 128],
        lineWidth: 0.1
      }
    };

    autoTable(this.doc, gstTableOptions);
    return (this.doc as any).lastAutoTable.finalY + 15;
  }

  private addNotesSection(notes: string, currentY: number): number {
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.text('Notes:', this.margin, currentY);
    currentY += 6;
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    const lines = this.doc.splitTextToSize(notes, this.pageWidth - 2 * this.margin);
    this.doc.text(lines, this.margin, currentY);
    
    return currentY + lines.length * 4 + 10;
  }

  private addBankDetailsSection(bankDetail: any, currentY: number): number {
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.text('Bank Detail:', this.margin, currentY);
    currentY += 8;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);

    const bankInfo = [
      `Account Holder Name: ${bankDetail.accountHolderName || 'N/A'}`,
      `Bank Name: ${bankDetail.bankName || 'N/A'}`,
      `Account Number: ${bankDetail.accountNumber || 'N/A'}`,
      `IFSC Code: ${bankDetail.ifscCode || 'N/A'}`
    ];

    if (bankDetail.upiId) {
      bankInfo.push(`UPI ID: ${bankDetail.upiId}`);
    }

    bankInfo.forEach(info => {
      this.doc.text(info, this.margin, currentY);
      currentY += 5;
    });

    return currentY + 10;
  }

  private addFooter(): void {
    const footerY = this.pageHeight - 20;
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(128, 128, 128);
    
    const footerText = 'www.sukrshinfotech.com | +91-7820038781 | kisaansetu@sukrshinfotech.com';
    this.doc.text(footerText, this.pageWidth / 2, footerY, { align: 'center' });
    
    // Reset text color
    this.doc.setTextColor(0, 0, 0);
  }

  protected formatDate(dateString: Date | string): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // Use plain text instead of rupee symbol to avoid font issues
  private formatCurrencyPlain(amount: number): string {
    return `Rs ${amount.toFixed(2)}`;
  }

  private async fetchInvoiceData(invoiceId: string): Promise<InvoiceInterface> {
    const response = await InvoiceAPI.getById(invoiceId);
    if (!response) throw new Error('Failed to fetch invoice data');
    return response;
  }
}