// services/pdf/StatementPDFService.ts

import { BasePDFService, HeaderLayoutOptions } from '../shared/BasePDFService';
import autoTable from 'jspdf-autotable';
import { UserOptions } from 'jspdf-autotable';






interface CashBookEntry {
  entry: {
    id: string;
    cashBookId: string;
    date: string;
    amount: number;
    type: 'Dr' | 'Cr';
    transactionType: string;
    primaryDescription: string;
    documentNumber?: string;
    secondaryDescription?: string;
    referenceDescription?: string;
    createdAt: string;
  };
  runningBalance: number;
  isNegativeBalance: boolean;
}

interface CashBookStatement {
  reportType: string;
  period: {
    startDate: string;
    endDate: string;
  };
  openingBalance: number;
  currentBalance: number;
  isNegativeBalance: boolean;
  totalCashIn: number;
  totalCashOut: number;
  netCashFlow: number;
  entryCount: number;
  statement: CashBookEntry[];
}

interface BankBookEntry {
  id: string;
  bankBookId: string;
  date: string;
  amount: number;
  type: 'Dr' | 'Cr';
  transactionType: string;
  primaryDescription: string;
  paymentMethod?: string;
  documentNumber?: string;
  secondaryDescription?: string;
  referenceDescription?: string;
  referenceNumber?: string;
  runningBalance: number;
  balanceType: 'Dr' | 'Cr';
  createdAt: string;
}

interface BankBookStatement {
  entries: BankBookEntry[];
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
}

export class StatementPDFService extends BasePDFService {
  
  /**
   * Generate Cash Book Statement PDF
   */
  async generateCashBookStatementPDF(
    statementData: CashBookStatement, 
    fpoId?: string
  ): Promise<void> {
    try {
      // Fetch FPO Profile
      const fpoProfile = await this.fetchFPOProfile(fpoId);
      
      let currentY = 20;

      // Header configuration for cash book statement
      const headerOptions: HeaderLayoutOptions = {
        layout: 'side-by-side',
        logoSettings: {
          width: 35,
          height: 26,
          spacing: 42
        },
        companySettings: {
          nameSize: 16,
          detailsSize: 9,
          lineSpacing: 4,
          showAddress: true,
          showContact: true,
          showGSTIN: true
        },
        rightContent: {
          title: 'CASH BOOK STATEMENT',
          titleSize: 16,
          titleColor: [0, 102, 204],
          details: [
            `Period: ${this.formatDate(statementData.period.startDate)} to ${this.formatDate(statementData.period.endDate)}`,
            `Generated: ${this.formatDate(new Date().toISOString())}`,
            `Total Entries: ${statementData.entryCount}`
          ],
          detailsSize: 9
        },
        spacing: {
          afterHeader: 15
        }
      };

      // Add universal header
      currentY = await this.addUniversalHeader(fpoProfile, currentY, headerOptions);

      // Add statement summary
      currentY = this.addStatementSummary(
        statementData.openingBalance,
        statementData.currentBalance,
        statementData.totalCashIn,
        statementData.totalCashOut,
        statementData.netCashFlow,
        currentY,
        'CASH'
      );

      // Add statement entries table
      this.addCashBookEntriesTable(statementData.statement, currentY);

      // Add footer
      this.addStatementFooter();

      // Generate filename
      const startDate = new Date(statementData.period.startDate).toLocaleDateString('en-IN');
      const endDate = new Date(statementData.period.endDate).toLocaleDateString('en-IN');
      const filename = `CashBook_Statement_${startDate.replace(/\//g, '-')}_to_${endDate.replace(/\//g, '-')}.pdf`;
      
      this.doc.save(filename);
    } catch (error) {
      console.error('Error generating cash book statement PDF:', error);
      throw new Error('Failed to generate cash book statement PDF');
    }
  }

  /**
   * Generate Bank Book Statement PDF
   */
  async generateBankBookStatementPDF(
    statementData: BankBookStatement,
    bankBookId: string,
    startDate: string,
    endDate: string,
    fpoId?: string
  ): Promise<void> {
    try {
      // Fetch FPO Profile
      const fpoProfile = await this.fetchFPOProfile(fpoId);
      
      let currentY = 20;

      // Header configuration for bank book statement
      const headerOptions: HeaderLayoutOptions = {
        layout: 'side-by-side',
        logoSettings: {
          width: 35,
          height: 26,
          spacing: 42
        },
        companySettings: {
          nameSize: 16,
          detailsSize: 9,
          lineSpacing: 4,
          showAddress: true,
          showContact: true,
          showGSTIN: true
        },
        rightContent: {
          title: 'BANK STATEMENT',
          titleSize: 16,
          titleColor: [0, 102, 204],
          details: [
            `Period: ${this.formatDate(startDate)} to ${this.formatDate(endDate)}`,
            `Generated: ${this.formatDate(new Date().toISOString())}`,
            `Total Entries: ${statementData.entries.length}`
          ],
          detailsSize: 9
        },
        spacing: {
          afterHeader: 15
        }
      };

      // Add universal header
      currentY = await this.addUniversalHeader(fpoProfile, currentY, headerOptions);

      // Add statement summary
      const netFlow = statementData.totalDebit - statementData.totalCredit;
      currentY = this.addStatementSummary(
        statementData.openingBalance,
        statementData.closingBalance,
        statementData.totalDebit,
        statementData.totalCredit,
        netFlow,
        currentY,
        'BANK'
      );

      // Add statement entries table
      this.addBankBookEntriesTable(statementData.entries, currentY);

      // Add footer
      this.addStatementFooter();

      // Generate filename
      const startDateFormatted = new Date(startDate).toLocaleDateString('en-IN');
      const endDateFormatted = new Date(endDate).toLocaleDateString('en-IN');
      const filename = `BankStatement_${startDateFormatted.replace(/\//g, '-')}_to_${endDateFormatted.replace(/\//g, '-')}.pdf`;
      
      this.doc.save(filename);
    } catch (error) {
      console.error('Error generating bank statement PDF:', error);
      throw new Error('Failed to generate bank statement PDF');
    }
  }

  /**
   * Add statement summary section
   */
  private addStatementSummary(
    openingBalance: number,
    closingBalance: number,
    totalIn: number,
    totalOut: number,
    netFlow: number,
    currentY: number,
    type: 'CASH' | 'BANK'
  ): number {
    // Check if summary box will fit on current page
    const summaryHeight = 35;
    const bottomMargin = 60; // Reserve space for footer and page numbers
    
    if (currentY + summaryHeight > this.pageHeight - bottomMargin) {
      this.doc.addPage();
      currentY = 20;
    }

    // Summary box
    this.doc.setDrawColor(200, 200, 200);
    this.doc.setFillColor(248, 249, 250);
    this.doc.rect(this.margin, currentY, this.pageWidth - 2 * this.margin, summaryHeight, 'FD');

    // Summary title
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(`${type} BOOK SUMMARY`, this.margin + 5, currentY + 8);

    // Summary details in two columns
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    
    const leftColumn = this.margin + 5;
    const rightColumn = this.pageWidth / 2 + 10;
    const detailY = currentY + 16;

    // Left column
    this.doc.text(`Opening Balance: ${this.formatCurrency(Math.abs(openingBalance))}`, leftColumn, detailY);
    this.doc.text(`Total ${type === 'CASH' ? 'Cash In' : 'Debit'}: ${this.formatCurrency(totalIn)}`, leftColumn, detailY + 5);
    this.doc.text(`Net Flow: ${this.formatCurrency(Math.abs(netFlow))} ${netFlow >= 0 ? '(In)' : '(Out)'}`, leftColumn, detailY + 10);

    // Right column  
    this.doc.text(`Closing Balance: ${this.formatCurrency(Math.abs(closingBalance))}`, rightColumn, detailY);
    this.doc.text(`Total ${type === 'CASH' ? 'Cash Out' : 'Credit'}: ${this.formatCurrency(totalOut)}`, rightColumn, detailY + 5);

    return currentY + summaryHeight + 10;
  }

  /**
   * Calculate available space for table on current page
   */
  private getAvailablePageHeight(): number {
    const bottomMargin = 60; // Reserve space for footer and page numbers
    const currentPageInfo = this.doc.getCurrentPageInfo();
    return this.pageHeight - bottomMargin;
  }

  /**
   * Check if we need a new page for the table
   */
  private needsNewPageForTable(startY: number, minRowsToShow: number = 5): boolean {
    const rowHeight = 8; // Approximate row height
    const headerHeight = 15; // Table header height
    const minTableHeight = headerHeight + (minRowsToShow * rowHeight);
    const availableHeight = this.getAvailablePageHeight();
    
    return (startY + minTableHeight) > availableHeight;
  }

  /**
   * Add cash book entries table with improved page break handling
   */
  private addCashBookEntriesTable(entries: CashBookEntry[], startY: number): void {
    // Check if we need a new page before starting the table
    if (this.needsNewPageForTable(startY)) {
      this.doc.addPage();
      startY = 20;
    }

    const tableData = entries.map(item => [
      this.formatDate(item.entry.date),
      this.truncateText(item.entry.primaryDescription, 35),
      item.entry.documentNumber || '-',
      item.entry.type === 'Dr' ? this.formatCurrency(item.entry.amount) : '-',
      item.entry.type === 'Cr' ? this.formatCurrency(item.entry.amount) : '-',
      `${this.formatCurrency(Math.abs(item.runningBalance))} ${item.isNegativeBalance ? '(Cr)' : '(Dr)'}`
    ]);

    const tableOptions: UserOptions = {
      head: [['Date', 'Description', 'Doc No.', 'Cash In', 'Cash Out', 'Balance']],
      body: tableData,
      startY: startY,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 25 }, // Date
        1: { cellWidth: 65 }, // Description
        2: { cellWidth: 25 }, // Doc No
        3: { cellWidth: 25, halign: 'right' }, // Cash In
        4: { cellWidth: 25, halign: 'right' }, // Cash Out
        5: { cellWidth: 25, halign: 'right' }  // Balance
      },
      margin: { 
        left: this.margin, 
        right: this.margin, 
        top: 20,
        bottom: 60 // Increased bottom margin for footer space
      },
      pageBreak: 'auto',
      showHead: 'everyPage',
      tableLineWidth: 0.1,
      tableLineColor: [200, 200, 200],
      didDrawPage: (data: any) => {
        this.addPageNumberAndFooter();
      },
      // Enhanced page break configuration
      horizontalPageBreakBehaviour: 'immediately',
      rowPageBreak: 'auto'
    };

    // Use autoTable with enhanced configuration
    autoTable(this.doc, tableOptions);
  }

  /**
   * Add bank book entries table with improved page break handling
   */
  private addBankBookEntriesTable(entries: BankBookEntry[], startY: number): void {
    // Check if we need a new page before starting the table
    if (this.needsNewPageForTable(startY)) {
      this.doc.addPage();
      startY = 20;
    }

    const tableData = entries.map(entry => [
      this.formatDate(entry.date),
      this.truncateText(entry.primaryDescription, 35),
      entry.referenceNumber || entry.documentNumber || '-',
      entry.type === 'Dr' ? this.formatCurrency(entry.amount) : '-',
      entry.type === 'Cr' ? this.formatCurrency(entry.amount) : '-',
      `${this.formatCurrency(Math.abs(entry.runningBalance))} (${entry.balanceType})`
    ]);

    const tableOptions: UserOptions = {
      head: [['Date', 'Description', 'Ref No.', 'Debit', 'Credit', 'Balance']],
      body: tableData,
      startY: startY,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 25 }, // Date
        1: { cellWidth: 65 }, // Description
        2: { cellWidth: 25 }, // Ref No
        3: { cellWidth: 25, halign: 'right' }, // Debit
        4: { cellWidth: 25, halign: 'right' }, // Credit
        5: { cellWidth: 25, halign: 'right' }  // Balance
      },
      margin: { 
        left: this.margin, 
        right: this.margin, 
        top: 20,
        bottom: 60 // Increased bottom margin for footer space
      },
      pageBreak: 'auto',
      showHead: 'everyPage',
      tableLineWidth: 0.1,
      tableLineColor: [200, 200, 200],
      didDrawPage: (data: any) => {
        this.addPageNumberAndFooter();
      },
      // Enhanced page break configuration
      horizontalPageBreakBehaviour: 'immediately',
      rowPageBreak: 'auto'
    };

    // Use autoTable with enhanced configuration
    autoTable(this.doc, tableOptions);
  }

  /**
   * Add page numbers and footer information
   */
  private addPageNumberAndFooter(): void {
    const pageCount = this.doc.getNumberOfPages();
    const pageNumber = this.doc.getCurrentPageInfo().pageNumber;
    
    // Save current text color
    const currentTextColor = this.doc.getTextColor();
    
    // Add page number
    this.doc.setFontSize(8);
    this.doc.setTextColor(100, 100, 100);
    this.doc.text(
      `Page ${pageNumber} of ${pageCount}`, 
      this.pageWidth - this.margin - 20, 
      this.pageHeight - 15
    );
    
    // Add generation timestamp on first page only
    if (pageNumber === 1) {
      this.doc.text(
        `Generated: ${new Date().toLocaleString('en-IN')}`,
        this.margin,
        this.pageHeight - 15
      );
    }
    
    // Restore text color
    this.doc.setTextColor(currentTextColor);
  }

  /**
   * Add statement footer
   */
  private addStatementFooter(): void {
    // Get the final Y position after the table
    const finalY = (this.doc as any).lastAutoTable?.finalY || this.pageHeight - 80;
    
    // Check if we need space for footer
    const footerHeight = 40;
    const bottomMargin = 60;
    
    if (finalY + footerHeight > this.pageHeight - bottomMargin) {
      this.doc.addPage();
    }
    
    const footerStartY = Math.max(finalY + 20, this.pageHeight - 50);
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(100, 100, 100);
    
    // Add separator line
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margin, footerStartY - 5, this.pageWidth - this.margin, footerStartY - 5);
    
    this.doc.text(
      'This is a computer generated statement and does not require signature.',
      this.margin,
      footerStartY + 5
    );
    
    // Reset text color
    this.doc.setTextColor(0, 0, 0);
  }

  /**
   * Utility method to truncate text with better handling
   */
  private truncateText(text: string, maxLength: number): string {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Implementation of abstract method from BasePDFService
   */
  async generatePDF(documentId: string): Promise<void> {
    throw new Error('Use generateCashBookStatementPDF or generateBankBookStatementPDF instead');
  }
}

// Export utility functions for easy use
export const StatementPDFUtils = {
  
  /**
   * Generate Cash Book Statement PDF - Static method for easy access
   */
  async generateCashBookPDF(statementData: CashBookStatement, fpoId?: string): Promise<void> {
    const service = new StatementPDFService();
    await service.generateCashBookStatementPDF(statementData, fpoId);
  },

  /**
   * Generate Bank Book Statement PDF - Static method for easy access
   */
  async generateBankBookPDF(
    statementData: BankBookStatement,
    bankBookId: string,
    startDate: string,
    endDate: string,
    fpoId?: string
  ): Promise<void> {
    const service = new StatementPDFService();
    await service.generateBankBookStatementPDF(statementData, bankBookId, startDate, endDate, fpoId);
  }
};