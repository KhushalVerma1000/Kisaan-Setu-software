// services/pdf/BalanceSheetPDFService.ts

import { BasePDFService, HeaderLayoutOptions } from './shared/BasePDFService';
import { LedgerReportsAPI } from '@/server/features/ledger/infrastructure/apiHelper/reports/reportApi';
import { BalanceSheetData, BalanceSheetEntry, BalanceSheetSection } from '@/server/features/ledger/infrastructure/persistence/ledgerReportsSupabase';

export interface BalanceSheetPDFOptions {
  fpoId: string;
  asOfDate?: Date;
  title?: string;
  showLogo?: boolean;
  headerLayout?: 'side-by-side' | 'logo-top' | 'company-only';
}

export class BalanceSheetPDFService extends BasePDFService {
  private balanceSheetData: BalanceSheetData | null = null;
  private options: BalanceSheetPDFOptions;

  constructor(options: BalanceSheetPDFOptions) {
    super();
    this.options = options;
  }

  /**
   * Main method to generate Balance Sheet PDF
   */
  async generatePDF(documentId?: string): Promise<void> {
    try {
      // Fetch FPO profile
      const fpoProfile = await this.fetchFPOProfile(this.options.fpoId);
      
      // Fetch balance sheet data
      const balanceSheetResponse = await LedgerReportsAPI.generateBalanceSheet(
        this.options.fpoId,
        this.options.asOfDate
      );

      if (!balanceSheetResponse.status) {
        throw new Error(balanceSheetResponse.message);
      }

      this.balanceSheetData = balanceSheetResponse.data;

      let currentY = 20;

      // Add header with company information
      currentY = await this.addBalanceSheetHeader(fpoProfile, currentY);

      // Add balance sheet title and period
      currentY = this.addBalanceSheetTitle(currentY);

      // Add balance sheet content (assets and liabilities)
      currentY = await this.addBalanceSheetContent(currentY);

      // Add footer with totals and balance check
      this.addBalanceSheetFooter();

      // Save the PDF
      const fileName = `balance-sheet-${this.options.fpoId}-${this.formatDate(this.options.asOfDate || new Date())}.pdf`;
      this.doc.save(fileName);

    } catch (error) {
      console.error('Error generating Balance Sheet PDF:', error);
      throw error;
    }
  }

  /**
   * Add header section with company info
   */
  private async addBalanceSheetHeader(fpoProfile: any, currentY: number): Promise<number> {
    const headerOptions: HeaderLayoutOptions = {
      layout: this.options.headerLayout || 'side-by-side',
      logoSettings: {
        width: 32,
        height: 24,
        spacing: 38
      },
      companySettings: {
        nameSize: 14,
        detailsSize: 8,
        lineSpacing: 3.5,
        showAddress: true,
        showContact: true,
        showGSTIN: true
      },
      spacing: {
        afterHeader: 8
      }
    };

    return await this.addUniversalHeader(fpoProfile, currentY, headerOptions);
  }

  /**
   * Add balance sheet title and date range
   */
  private addBalanceSheetTitle(currentY: number): number {
    const title = this.options.title || 'Balance Sheet';
    const asOfDateStr = this.formatDate(this.options.asOfDate || new Date());

    // Main title
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(16);
    this.doc.text(title, this.pageWidth / 2, currentY, { align: 'center' });
    currentY += 12;

    // Date range
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(12);
    this.doc.text(`As at ${asOfDateStr}`, this.pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    return currentY;
  }

  /**
   * Add the main balance sheet content with assets and liabilities
   */
  private async addBalanceSheetContent(currentY: number): Promise<number> {
    if (!this.balanceSheetData) {
      throw new Error('No balance sheet data available');
    }

    const startY = currentY;
    const middleX = this.pageWidth / 2;
    const leftColumnX = this.margin;
    const rightColumnX = middleX + 5;
    const columnWidth = (this.pageWidth - 2 * this.margin - 10) / 2;

    // Column headers
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    
    // Liabilities header
    this.doc.text('Liabilities', leftColumnX, currentY);
    
    // Assets header  
    this.doc.text('Assets', rightColumnX, currentY);
    
    currentY += 8;

    // Draw line under headers
    this.doc.line(leftColumnX, currentY, leftColumnX + columnWidth, currentY);
    this.doc.line(rightColumnX, currentY, rightColumnX + columnWidth, currentY);
    currentY += 5;

    // Track Y positions for both columns
    let leftY = currentY;
    let rightY = currentY;

    // Add Liabilities
    leftY = this.addBalanceSheetSection(
      this.balanceSheetData.liabilities,
      leftColumnX,
      leftY,
      columnWidth,
      'Liabilities'
    );

    // Add Assets  
    rightY = this.addBalanceSheetSection(
      this.balanceSheetData.assets,
      rightColumnX,
      rightY,
      columnWidth,
      'Assets'
    );

    // Return the maximum Y position
    const maxY = Math.max(leftY, rightY);
    
    // Add totals
    return this.addBalanceSheetTotals(maxY + 10, leftColumnX, rightColumnX, columnWidth);
  }

  /**
   * Add a section (assets or liabilities) to the balance sheet
   */
  private addBalanceSheetSection(
    section: BalanceSheetSection,
    startX: number,
    startY: number,
    columnWidth: number,
    sectionType: 'Assets' | 'Liabilities'
  ): number {
    let currentY = startY;
    const valueX = startX + columnWidth - 10;

    // Iterate through each group in the section
    for (const [groupName, entries] of Object.entries(section)) {
      if (entries.length === 0) continue;

      // Group header
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(10);
      this.doc.text(groupName, startX, currentY);
      currentY += 6;

      // Group entries
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(9);

      for (const entry of entries) {
        // Check if we need a new page
        if (currentY > this.pageHeight - 50) {
          this.doc.addPage();
          currentY = 30;
        }

        // Ledger name (truncate if too long)
        const maxLedgerWidth = columnWidth - 70;
        const ledgerText = this.doc.splitTextToSize(entry.ledger, maxLedgerWidth);
        
        if (Array.isArray(ledgerText)) {
          // Multi-line ledger name
          ledgerText.forEach((line: string, index: number) => {
            this.doc.text(line, startX + 10, currentY + (index * 4));
          });
          // Amount on the last line
          this.doc.text(entry.amount, valueX, currentY + ((ledgerText.length - 1) * 4), { align: 'right' });
          currentY += ledgerText.length * 4;
        } else {
          // Single line
          this.doc.text(ledgerText, startX + 10, currentY);
          this.doc.text(entry.amount, valueX, currentY, { align: 'right' });
          currentY += 4;
        }
      }

      currentY += 3; // Space between groups
    }

    return currentY;
  }

  /**
   * Add totals section at the bottom
   */
  private addBalanceSheetTotals(
    startY: number,
    leftColumnX: number,
    rightColumnX: number,
    columnWidth: number
  ): number {
    if (!this.balanceSheetData) return startY;

    let currentY = startY;

    // Draw separator lines
    this.doc.line(leftColumnX, currentY, leftColumnX + columnWidth, currentY);
    this.doc.line(rightColumnX, currentY, rightColumnX + columnWidth, currentY);
    currentY += 8;

    // Totals
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);

    // Total Liabilities
    this.doc.text('Total Liabilities', leftColumnX, currentY);
    this.doc.text(this.balanceSheetData.total_liabilities, leftColumnX + columnWidth - 10, currentY, { align: 'right' });

    // Total Assets
    this.doc.text('Total Assets', rightColumnX, currentY);
    this.doc.text(this.balanceSheetData.total_assets, rightColumnX + columnWidth - 10, currentY, { align: 'right' });

    currentY += 10;

    // Balance check
    if (this.balanceSheetData.is_balanced) {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(10);
      this.doc.setTextColor(0, 128, 0); // Green color
      this.doc.text('Balance Sheet is balanced', this.pageWidth / 2, currentY, { align: 'center' });
    } else {
      this.doc.setTextColor(255, 0, 0); // Red color
      this.doc.text('Balance Sheet is not balanced', this.pageWidth / 2, currentY, { align: 'center' });
    }

    this.doc.setTextColor(0, 0, 0); // Reset to black
    return currentY + 10;
  }

  /**
   * Add footer with generation info
   */
  private addBalanceSheetFooter(): void {
    const footerY = this.pageHeight - 25;
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(128, 128, 128); // Gray color

    // Generation info
    const generatedText = `Generated on ${this.formatDate(new Date())} | www.sukrshinfotech.in | kisaansetu@sukrshinfotech.com`;
    this.doc.text(generatedText, this.pageWidth / 2, footerY, { align: 'center' });

    // Page number
    const pageCount = this.doc.getNumberOfPages();
    this.doc.text(`Page ${pageCount}`, this.pageWidth - this.margin, footerY, { align: 'right' });

    this.doc.setTextColor(0, 0, 0); // Reset to black
  }

  /**
   * Helper method to check if balance sheet data is available
   */
  public hasData(): boolean {
    return this.balanceSheetData !== null;
  }

  /**
   * Get balance sheet summary
   */
  public getBalanceSheetSummary() {
    if (!this.balanceSheetData) return null;

    return {
      totalAssets: this.balanceSheetData.total_assets,
      totalLiabilities: this.balanceSheetData.total_liabilities,
      isBalanced: this.balanceSheetData.is_balanced,
      assetGroups: Object.keys(this.balanceSheetData.assets).length,
      liabilityGroups: Object.keys(this.balanceSheetData.liabilities).length
    };
  }
}

// Usage example:
/*
const balanceSheetService = new BalanceSheetPDFService({
  fpoId: 'your-fpo-id',
  asOfDate: new Date(),
  title: 'Balance Sheet',
  showLogo: true,
  headerLayout: 'side-by-side'
});

await balanceSheetService.generatePDF();
*/