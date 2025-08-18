// services/pdf/PurchaseVoucherPDFService.ts
import { PurchaseVoucherInterface } from '../../features/purchase/core/entities/PurchaseVoucher';
import { BasePDFService, HeaderLayoutOptions } from './shared/BasePDFService';
import { FpoProfile } from '../../features/fpo/core/entities/FpoProfile';
import autoTable from 'jspdf-autotable';
import { UserOptions, ThemeType } from 'jspdf-autotable';
import { PurchaseVoucherAPI } from '@/server/features/purchase/infrastructure/apihelpers/purchaseVoucher/purchaseVoucherApi';

export interface PurchaseVoucherPDFConfig {
  // Page settings
  pageSize?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  margin?: number;
  
  // Header configuration
  headerLayout?: 'side-by-side' | 'logo-top' | 'company-only';
  logoSettings?: {
    width?: number;
    height?: number;
    spacing?: number;
  };
  
  // Table configuration
  tableConfig?: {
    headerHeight?: number;
    rowHeight?: number;
    fontSize?: number;
    headerFontSize?: number;
    columnWidths?: {
      serial?: number;
      description?: number;
      qty?: number;
      rate?: number;
      amount?: number;
      gst?: number;
      discount?: number;
      total?: number;
    };
    colors?: {
      headerBg?: [number, number, number];
      headerText?: [number, number, number];
      borderColor?: [number, number, number];
    };
  };
  
  // Content spacing
  spacing?: {
    afterHeader?: number;
    afterAddresses?: number;
    afterTable?: number;
    beforeSignature?: number;
  };
  
  // Font settings
  fonts?: {
    companyName?: number;
    sectionHeaders?: number;
    normalText?: number;
    smallText?: number;
  };
}

export class PurchaseVoucherPDFService extends BasePDFService {
  private config: PurchaseVoucherPDFConfig;
  
  constructor(config: PurchaseVoucherPDFConfig = {}) {
    super();
    this.config = {
      // Default configuration
      margin: 20,
      headerLayout: 'side-by-side',
      logoSettings: {
        width: 32,
        height: 32,
        spacing: 38
      },
      tableConfig: {
        headerHeight: 10,
        rowHeight: 8,
        fontSize: 8,
        headerFontSize: 9,
        columnWidths: {
          serial: 12,
          description: 50,
          qty: 22,
          rate: 22,
          amount: 22,
          gst: 16,
          discount: 22,
          total: 24
        },
        colors: {
          headerBg: [240, 240, 240],
          headerText: [0, 0, 0],
          borderColor: [128, 128, 128]
        }
      },
      spacing: {
        afterHeader: 8,
        afterAddresses: 8,
        afterTable: 10,
        beforeSignature: 20
      },
      fonts: {
        companyName: 18,
        sectionHeaders: 12,
        normalText: 10,
        smallText: 8
      },
      ...config
    };
    
    // Apply custom margin if provided
    if (config.margin) {
      this.margin = config.margin;
    }
  }

  async generatePDF(voucherId: string): Promise<void> {
    try {
      console.log('🚀 Starting PDF generation for purchase voucher:', voucherId);
      
      const voucherData = await this.fetchPurchaseVoucherData(voucherId);
      console.log('📄 Purchase voucher data fetched:', voucherData.partyInvoiceNumber);
      
      const fpoProfile = await this.fetchFPOProfile(voucherData.fpoId);
      console.log('🏢 FPO profile fetched:', fpoProfile.companyName);

      await this.createPurchaseVoucherPDF(voucherData, fpoProfile);
      this.doc.save(`Purchase-Voucher-${voucherData.partyInvoiceNumber}.pdf`);
      
      console.log('✅ PDF generation completed successfully');
    } catch (error) {
      console.error('❌ Error generating purchase voucher PDF:', error);
      throw new Error('Failed to generate purchase voucher PDF');
    }
  }

  private async createPurchaseVoucherPDF(voucher: PurchaseVoucherInterface, fpoProfile: FpoProfile): Promise<void> {
    console.log('📋 Starting createPurchaseVoucherPDF...');
    let currentY = this.margin;

    // Use the universal header from BasePDFService
    console.log('🏢 Adding header section...');
    currentY = await this.addUniversalHeader(fpoProfile, currentY, this.getHeaderOptions(voucher));

    // Add supplier/vendor address
    console.log('📍 Adding supplier address...');
    currentY = this.addSupplierAddress(voucher, currentY);
    currentY += this.config.spacing!.afterAddresses!;

    // Add purchase order reference if available
    if (voucher.poNumber) {
      console.log('📄 Adding PO reference...');
      currentY = this.addPOReference(voucher, currentY);
      currentY += 5;
    }

    // Add items table
    console.log('📊 Adding items table...');
    currentY = this.addPurchaseItemsTable(voucher, currentY);
    currentY += this.config.spacing!.afterTable!;

    // Check if we need a new page before adding remaining content
    if (currentY > this.pageHeight - 100) {
      this.doc.addPage();
      currentY = this.margin;
    }

    // Add terms & conditions and totals side by side
    console.log('📋 Adding terms and totals...');
    currentY = this.addTermsAndTotalsSection(voucher, fpoProfile, currentY);

    // // Add GST breakdown if exists
    // if (Object.keys(voucher.gstBreakdown).length > 0) {
    //   console.log('💰 Adding GST breakdown...');
    //   currentY = this.addPurchaseGSTBreakdown(voucher.gstBreakdown, currentY);
    // }

    // Check if we need a new page for remaining content
    if (currentY > this.pageHeight - 80) {
      this.doc.addPage();
      currentY = this.margin;
    }

    // Add notes if any - use BasePDFService method
    if (voucher.notes) {
      console.log('📝 Adding notes...');
      currentY = this.addNotesSection(voucher.notes, currentY);
    }

    // Add bank details if enabled - use BasePDFService method
    const primaryBankDetail = fpoProfile.bankDetails?.find(bd => bd.isPrimary) || fpoProfile.bankDetails?.[0];
    if (primaryBankDetail && primaryBankDetail.printBankDetails) {
      console.log('🏦 Adding bank details...');
      currentY = this.addBankDetails(primaryBankDetail, currentY);
    }

    // Add signature section - use BasePDFService method with custom labels
    console.log('✍️ Adding signature section...');
    this.addSignatureSection('Supplier Signature', 'Authorised Signature');

    // Add footer
    this.addFooter();

    console.log('✅ Purchase voucher PDF creation completed');
  }

  private getHeaderOptions(voucher: PurchaseVoucherInterface): HeaderLayoutOptions {
    return {
      layout: this.config.headerLayout!,
      logoSettings: this.config.logoSettings,
      companySettings: {
        nameSize: this.config.fonts!.companyName,
        detailsSize: this.config.fonts!.smallText,
        lineSpacing: 3.5,
        showAddress: true,
        showContact: true,
        showGSTIN: true
      },
      rightContent: {
        title: 'PURCHASE VOUCHER',
        titleSize: 16,
        titleColor: [34, 139, 34], // Green color for purchase documents
        details: [
          `Party Invoice #: ${voucher.partyInvoiceNumber}`,
          `Date: ${this.formatDate(voucher.partyInvoiceDate)}`,
          ...(voucher.poNumber ? [`PO #: ${voucher.poNumber}`] : []),
          ...(voucher.status ? [`Status: ${voucher.status.toUpperCase()}`] : [])
        ],
        detailsSize: 9
      },
      spacing: {
        afterHeader: this.config.spacing!.afterHeader
      }
    };
  }

  // Override formatDate method to handle string dates properly
  protected formatDate(dateString: Date | string): string {
    if (!dateString) {
      return 'N/A';
    }
    
    let date: Date;
    
    if (typeof dateString === 'string') {
      date = new Date(dateString);
    } else if (dateString instanceof Date) {
      date = dateString;
    } else {
      return 'Invalid Date';
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',  
      year: 'numeric'
    });
  }

  private addSupplierAddress(voucher: PurchaseVoucherInterface, currentY: number): number {
    // Add a line separator
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, currentY, this.pageWidth - this.margin, currentY);
    currentY += 8;

    // Headers
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(this.config.fonts!.normalText!);
    this.doc.text('Supplier/Vendor Details:', this.margin, currentY);
    currentY += 6;

    // Supplier name with null/undefined check
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(this.config.fonts!.normalText!);
    const supplierName = voucher.supplierVendorName || 'N/A';
    this.doc.text(supplierName.toUpperCase(), this.margin, currentY);
    currentY += 5;

    // Address with null/undefined check
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(this.config.fonts!.smallText!);

    const billingAddress = voucher.supplierVendorBillingAddress || 'Address not provided';
    const addressLines = this.doc.splitTextToSize(
      billingAddress, 
      this.pageWidth - 2 * this.margin
    );

    addressLines.forEach((line: string) => {
      this.doc.text(line, this.margin, currentY);
      currentY += 3.5;
    });

    currentY += 3;

    // Additional details section
    const additionalDetails = [];
    
    if (voucher.gstin) {
      additionalDetails.push(`GSTIN: ${voucher.gstin}`);
    }
    
    if (voucher.supplierState) {
      additionalDetails.push(`State: ${voucher.supplierState}`);
    }

    if (additionalDetails.length > 0) {
      additionalDetails.forEach(detail => {
        this.doc.text(detail, this.margin, currentY);
        currentY += 4;
      });
    }

    return currentY + 8;
  }

  private addPOReference(voucher: PurchaseVoucherInterface, currentY: number): number {
    if (!voucher.poNumber) return currentY;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(this.config.fonts!.smallText!);
    this.doc.text(`Purchase Order Reference: ${voucher.poNumber}`, this.margin, currentY);
    
    return currentY + 5;
  }

  private addPurchaseItemsTable(voucher: PurchaseVoucherInterface, currentY: number): number {
    const tableData = voucher.items.map((item, index) => {
      const calculations = item.calculations;
      return [
        (index + 1).toString(),
        `${item.item.name}${item.item.hsn_sac ? ` (${item.item.hsn_sac})` : ''}`,
        `${item.quantity.toFixed(2)} ${item.item.unit?.code || 'PAC'}`,
        this.formatCurrency(item.unitPrice),
        this.formatCurrency(calculations.baseAmount),
        `${item.gstConfig.rate}%`,
        calculations.discountAmount > 0 ? this.formatCurrency(calculations.discountAmount) : '-',
        this.formatCurrency(calculations.lineTotal)
      ];
    });

    const tableConfig = this.config.tableConfig!;
    const columnWidths = tableConfig.columnWidths!;

    const tableOptions: UserOptions = {
      startY: currentY,
      head: [['#', 'Item ', 'Qty/Unit', 'Rate', 'Amount', 'GST', 'Discount', 'Total']],
      body: tableData,
      theme: 'grid' as ThemeType,
      headStyles: {
        fillColor: tableConfig.colors!.headerBg,
        textColor: tableConfig.colors!.headerText,
        fontStyle: 'bold',
        fontSize: tableConfig.headerFontSize,
        halign: 'center',
        cellPadding: 3,
        minCellHeight: tableConfig.headerHeight
      },
      bodyStyles: {
        fontSize: tableConfig.fontSize,
        cellPadding: 2,
        valign: 'middle',
        minCellHeight: tableConfig.rowHeight
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: columnWidths.serial },
        1: { halign: 'left', cellWidth: columnWidths.description },
        2: { halign: 'center', cellWidth: columnWidths.qty },
        3: { halign: 'right', cellWidth: columnWidths.rate },
        4: { halign: 'right', cellWidth: columnWidths.amount },
        5: { halign: 'center', cellWidth: columnWidths.gst },
        6: { halign: 'right', cellWidth: columnWidths.discount },
        7: { halign: 'right', cellWidth: columnWidths.total }
      },
      margin: { left: this.margin, right: this.margin },
      tableWidth: 'auto',
      showHead: 'everyPage',
      styles: {
        lineColor: tableConfig.colors!.borderColor,
        lineWidth: 0.1,
        cellPadding: 2
      }
    };

    autoTable(this.doc, tableOptions);
    return (this.doc as any).lastAutoTable.finalY + 3;
  }

  private addTermsAndTotalsSection(voucher: PurchaseVoucherInterface, fpoProfile: FpoProfile, currentY: number): number {
    const leftColumn = this.margin;
    const rightColumn = this.pageWidth / 2 + 20;
    let leftY = currentY;
    let rightY = currentY;

    // Add Terms & Conditions on the left (if available) - use BasePDFService method
    if (fpoProfile.invoiceSettings?.defaultTerms) {
      leftY = this.addTermsAndConditions(fpoProfile.invoiceSettings.defaultTerms, leftY);
    }

    // Add totals on the right with clean formatting
    const summary = voucher.summary;
    
    // Create totals data array
    const totalsData = [
      ['Subtotal:', this.formatCurrency(summary.subTotal)]
    ];

    if (summary.totalDiscount > 0) {
      totalsData.push(['Discount:', `-${this.formatCurrency(summary.totalDiscount)}`]);
    }

    // Add GST based on type
    if (summary.gstType === 'intrastate') {
      if (summary.totalCGST > 0) {
        totalsData.push(['CGST:', this.formatCurrency(summary.totalCGST)]);
      }
      if (summary.totalSGST > 0) {
        totalsData.push(['SGST:', this.formatCurrency(summary.totalSGST)]);
      }
    } else {
      if (summary.totalIGST > 0) {
        totalsData.push(['IGST:', this.formatCurrency(summary.totalIGST)]);
      }
    }

    if (summary.shipmentAmount > 0) {
      totalsData.push(['Freight/Shipping:', this.formatCurrency(summary.shipmentAmount)]);
    }

    if (summary.roundOff !== 0) {
      totalsData.push(['Round Off:', this.formatCurrency(summary.roundOff)]);
    }

    // Create totals table for better alignment
    const totalsTableOptions: UserOptions = {
      startY: rightY,
      body: totalsData,
      theme: 'plain' as ThemeType,
      bodyStyles: {
        fontSize: this.config.fonts!.normalText,
        cellPadding: 2
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 40 },
        1: { halign: 'right', cellWidth: 30 }
      },
      margin: { left: rightColumn, right: this.margin },
      tableWidth: 70,
      styles: {
        lineWidth: 0
      }
    };

    autoTable(this.doc, totalsTableOptions);
    rightY = (this.doc as any).lastAutoTable.finalY + 3;

    // Grand Total with emphasis
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(this.config.fonts!.sectionHeaders!);
    
    // Draw a line above grand total
    this.doc.setLineWidth(0.5);
    this.doc.line(rightColumn, rightY, rightColumn + 70, rightY);
    rightY += 6;
    
    this.doc.text('Grand Total:', rightColumn, rightY);
    this.doc.text(this.formatCurrency(summary.grandTotal), rightColumn + 70, rightY, { align: 'right' });

    return Math.max(leftY, rightY + 8) + 10;
  }

  private addPurchaseGSTBreakdown(gstBreakdown: any, currentY: number): number {
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(this.config.fonts!.sectionHeaders!);
    this.doc.text('GST Breakdown:', this.margin, currentY);
    currentY += 8;

    const gstTableData = Object.entries(gstBreakdown).map(([rate, breakdown]: [string, any]) => {
      const row = [
        `${rate}%`,
        this.formatCurrency(breakdown.taxable)
      ];

      if (breakdown.cgst !== undefined && breakdown.cgst > 0) {
        row.push(this.formatCurrency(breakdown.cgst));
        row.push(this.formatCurrency(breakdown.sgst));
      } else {
        row.push(this.formatCurrency(breakdown.igst || 0));
        row.push('-');
      }

      row.push(this.formatCurrency(breakdown.totalGst));
      return row;
    });

    const hasIntrastate = Object.values(gstBreakdown).some((b: any) => (b.cgst !== undefined && b.cgst > 0));
    const headers = hasIntrastate
      ? ['GST Rate', 'Taxable Amount', 'CGST', 'SGST', 'Total GST']
      : ['GST Rate', 'Taxable Amount', 'IGST', 'SGST', 'Total GST'];

    const gstTableOptions: UserOptions = {
      startY: currentY,
      head: [headers],
      body: gstTableData,
      theme: 'grid' as ThemeType,
      headStyles: {
        fillColor: this.config.tableConfig!.colors!.headerBg,
        textColor: this.config.tableConfig!.colors!.headerText,
        fontStyle: 'bold',
        fontSize: this.config.tableConfig!.headerFontSize,
        halign: 'center',
        cellPadding: 3
      },
      bodyStyles: {
        fontSize: this.config.tableConfig!.fontSize,
        halign: 'right',
        cellPadding: 3
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 25 },
        1: { halign: 'right', cellWidth: 35 },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 30 },
        4: { halign: 'right', cellWidth: 30 }
      },
      margin: { left: this.margin, right: this.margin },
      tableWidth: 'auto',
      styles: {
        lineColor: this.config.tableConfig!.colors!.borderColor,
        lineWidth: 0.1
      }
    };

    autoTable(this.doc, gstTableOptions);
    return (this.doc as any).lastAutoTable.finalY + 10;
  }

  private addNotesSection(notes: string, currentY: number): number {
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(this.config.fonts!.normalText!);
    this.doc.text('Notes:', this.margin, currentY);
    currentY += 6;
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(this.config.fonts!.smallText!);
    const lines = this.doc.splitTextToSize(notes, this.pageWidth - 2 * this.margin);
    this.doc.text(lines, this.margin, currentY);
    
    return currentY + lines.length * 4 + 8;
  }

  private addFooter(): void {
    const footerY = this.pageHeight - 15;
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(this.config.fonts!.smallText!);
    this.doc.setTextColor(128, 128, 128);
    
    const footerText = 'www.sukrshinfotech.in | +91-7820038781 | kisaansetu@sukrshinfotech.com';
    this.doc.text(footerText, this.pageWidth / 2, footerY, { align: 'center' });
    
    // Reset text color
    this.doc.setTextColor(0, 0, 0);
  }

  private async fetchPurchaseVoucherData(voucherId: string): Promise<PurchaseVoucherInterface> {
    const response = await PurchaseVoucherAPI.getById(voucherId);
    if (!response) throw new Error('Failed to fetch purchase voucher data');
    console.log(response)
    return response.data;
  }
}