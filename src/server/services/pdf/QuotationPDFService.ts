
// // services/pdf/QuotationPDFService.ts (Example - No GST breakdown needed)
// import { QuotationInterface } from '../../features/sales/quotation/core/entities/quotation';
// import { BasePDFService } from './shared/BasePDFService';
// import { FpoProfile } from '../../features/fpo/core/entities/FpoProfile';

// export class QuotationPDFService extends BasePDFService {
  
//   async generatePDF(quotationId: string): Promise<void> {
//     try {
//       const quotationData = await this.fetchQuotationData(quotationId);
//       const fpoProfile = await this.fetchFPOProfile(quotationData.fpoId);

//       await this.createQuotationPDF(quotationData, fpoProfile);
//       this.doc.save(`${quotationData.quotationNumber}.pdf`);
//     } catch (error) {
//       console.error('Error generating quotation PDF:', error);
//       throw new Error('Failed to generate quotation PDF');
//     }
//   }

//   private async createQuotationPDF(quotation: QuotationInterface, fpoProfile: FpoProfile): Promise<void> {
//     let currentY = this.margin;

//     // Add company logo - USING COMMON METHOD
//     if (fpoProfile.invoiceSettings.showPrefix && fpoProfile.logoUrl) {
//       currentY = await this.addCompanyLogo(fpoProfile.logoUrl, currentY);
//     }

//     // Add company header - USING COMMON METHOD
//     currentY = this.addCompanyHeader(fpoProfile, currentY);

//     // Add quotation header - QUOTATION SPECIFIC
//     currentY = this.addQuotationHeader(quotation, currentY);

//     // Add customer address - QUOTATION SPECIFIC
//     currentY = this.addQuotationCustomerAddress(quotation, currentY);

//     // Add quotation items - QUOTATION SPECIFIC (no GST calculations)
//     currentY = this.addQuotationItemsTable(quotation, currentY);

//     // NO GST breakdown for quotations
//     // NO bank details for quotations

//     // Add terms and conditions - USING COMMON METHOD
//     if (fpoProfile.invoiceSettings.defaultTerms) {
//       currentY = this.addTermsAndConditions(fpoProfile.invoiceSettings.defaultTerms, currentY);
//     }

//     // Add signatures - USING COMMON METHOD
//     this.addSignatureSection('Customer Signature', 'Prepared By');

//     // Add notes - USING COMMON METHOD
//     if (quotation.notes) {
//       this.addNotes(quotation.notes);
//     }
//   }

//   // QUOTATION SPECIFIC METHODS
//   private addQuotationHeader(quotation: QuotationInterface, currentY: number): number {
//     this.doc.setFont('helvetica', 'bold');
//     this.doc.setFontSize(16);
//     this.doc.text('QUOTATION', this.pageWidth - this.margin - 50, currentY, { align: 'right' });
//     // Implementation...
//     return currentY + 20;
//   }

//   private addQuotationCustomerAddress(quotation: QuotationInterface, currentY: number): number {
//     // Customer address for quotation
//     // Implementation...
//     return currentY + 30;
//   }

//   private addQuotationItemsTable(quotation: QuotationInterface, currentY: number): number {
//     // Simple items table without GST calculations
//     // Implementation...
//     return currentY + 50;
//   }

//   private async fetchQuotationData(quotationId: string): Promise<QuotationInterface> {
//     const response = await fetch(`/api/quotations/${quotationId}`);
//     if (!response.ok) throw new Error('Failed to fetch quotation data');
//     return response.json();
//   }
// }