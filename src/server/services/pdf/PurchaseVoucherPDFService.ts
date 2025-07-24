
// services/pdf/PurchaseVoucherPDFService.ts
import { PurchaseVoucherInterface } from '../../features/purchase/core/entities/PurchaseVoucher';
import { BasePDFService } from './shared/BasePDFService';
import { FpoProfile } from '../../features/fpo/core/entities/FpoProfile';

export class PurchaseVoucherPDFService extends BasePDFService {
  
  async generatePDF(voucherId: string): Promise<void> {
    try {
      const voucherData = await this.fetchPurchaseVoucherData(voucherId);
      const fpoProfile = await this.fetchFPOProfile(voucherData.fpoId);

      await this.createPurchaseVoucherPDF(voucherData, fpoProfile);
      this.doc.save(`${voucherData.partyInvoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating purchase voucher PDF:', error);
      throw new Error('Failed to generate purchase voucher PDF');
    }
  }

  private async createPurchaseVoucherPDF(voucher: PurchaseVoucherInterface, fpoProfile: FpoProfile): Promise<void> {
    let currentY = this.margin;

    // Add company logo if enabled - USING COMMON METHOD
    if (fpoProfile.invoiceSettings.showPrefix && fpoProfile.logoUrl) {
      currentY = await this.addCompanyLogo(fpoProfile.logoUrl, currentY);
    }

    // Add company header - USING COMMON METHOD
    currentY = this.addCompanyHeader(fpoProfile, currentY);

    // Add purchase voucher specific header - VOUCHER SPECIFIC
    currentY = this.addVoucherHeader(voucher, currentY);

    // Add vendor address - VOUCHER SPECIFIC (different from customer)
    currentY = this.addVendorAddress(voucher, currentY);

    // Add purchase items table - VOUCHER SPECIFIC (different structure than invoice)
    currentY = this.addPurchaseItemsTable(voucher, currentY);

    // Add purchase GST breakdown if applicable - VOUCHER SPECIFIC
    if (Object.keys(voucher.gstBreakdown).length > 0) {
      currentY = this.addPurchaseGSTBreakdown(voucher.gstBreakdown, currentY);
    }

    // Bank details might not be needed for purchase vouchers
    // Terms and conditions might be different
    
    // Add signatures section with different labels - USING COMMON METHOD WITH PARAMS
    this.addSignatureSection('Vendor Signature', 'Received By');

    // Add notes if any - USING COMMON METHOD
    if (voucher.notes) {
      this.addNotes(voucher.notes);
    }
  }

  // PURCHASE VOUCHER SPECIFIC METHODS
  private addVoucherHeader(voucher: PurchaseVoucherInterface, currentY: number): number {
    // Different header for purchase voucher
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(16);
    this.doc.text('PURCHASE VOUCHER', this.pageWidth - this.margin - 50, currentY, { align: 'right' });
    
    // Voucher specific details...
    return currentY + 20;
  }

  private addVendorAddress(voucher: PurchaseVoucherInterface, currentY: number): number {
    // Vendor address format (different from customer)
    // Implementation...
    return currentY + 30;
  }

  private addPurchaseItemsTable(voucher: PurchaseVoucherInterface, currentY: number): number {
    // Purchase items table (different columns than invoice)
    // Might have fields like: Item, Purchase Rate, MRP, Batch, Expiry, etc.
    // Implementation...
    return currentY + 50;
  }

  private addPurchaseGSTBreakdown(gstBreakdown: any, currentY: number): number {
    // Purchase specific GST breakdown
    // Might be formatted differently than invoice GST breakdown
    // Implementation...
    return currentY + 30;
  }

  private async fetchPurchaseVoucherData(voucherId: string): Promise<PurchaseVoucherInterface> {
    const response = await fetch(`/api/purchase-vouchers/${voucherId}`);
    if (!response.ok) throw new Error('Failed to fetch purchase voucher data');
    return response.json();
  }
}
