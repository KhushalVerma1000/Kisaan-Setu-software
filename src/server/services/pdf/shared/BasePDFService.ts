// services/pdf/shared/BasePDFService.ts

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { FpoProfile } from '../../../features/fpo/core/entities/FpoProfile';
import { BankDetail } from '../../../features/fpo/core/entities/BankDetail';

export interface HeaderLayoutOptions {
  layout: 'side-by-side' | 'logo-top' | 'company-only';
  logoSettings?: {
    width?: number;
    height?: number;
    spacing?: number; // Gap between logo and company info
  };
  companySettings?: {
    nameSize?: number;
    detailsSize?: number;
    lineSpacing?: number;
    showAddress?: boolean;
    showContact?: boolean;
    showGSTIN?: boolean;
  };
  rightContent?: {
    title?: string;
    titleSize?: number;
    titleColor?: [number, number, number];
    details?: string[];
    detailsSize?: number;
  };
  spacing?: {
    afterHeader?: number;
  };
}

export abstract class BasePDFService {
  protected doc: jsPDF;
  protected pageWidth: number;
  protected pageHeight: number;
  protected margin: number;

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.width;
    this.pageHeight = this.doc.internal.pageSize.height;
    this.margin = 10;
  }

  /**
   * Universal header method that can handle different layouts
   */
  protected async addUniversalHeader(
    fpoProfile: FpoProfile, 
    currentY: number,
    options: HeaderLayoutOptions
  ): Promise<number> {
    const startY = currentY;
    let headerEndY = currentY;

    switch (options.layout) {
      case 'side-by-side':
        headerEndY = await this.addSideBySideHeader(fpoProfile, currentY, options);
        break;
      case 'logo-top':
        headerEndY = await this.addLogoTopHeader(fpoProfile, currentY, options);
        break;
      case 'company-only':
        headerEndY = await this.addCompanyOnlyHeader(fpoProfile, currentY, options);
        break;
    }

    return headerEndY + (options.spacing?.afterHeader || 8);
  }

  /**
   * Side-by-side layout: Logo + Company Info | Right Content
   */
  private async addSideBySideHeader(
    fpoProfile: FpoProfile, 
    currentY: number, 
    options: HeaderLayoutOptions
  ): Promise<number> {
    const logoSettings = {
      width: 32,
      height: 24,
      spacing: 38,
      ...options.logoSettings
    };

    const companySettings = {
      nameSize: 14,
      detailsSize: 8,
      lineSpacing: 3.5,
      showAddress: true,
      showContact: true,
      showGSTIN: true,
      ...options.companySettings
    };

    let logoHeight = 0;
    let companyInfoY = currentY;
    
    // Company info X position (next to logo or from margin)
    const companyInfoX = fpoProfile.logoUrl ? this.margin + logoSettings.spacing : this.margin;

    // Add logo if available
    if (fpoProfile.logoUrl) {
      try {
        const { imageData, format } = await this.loadImage(fpoProfile.logoUrl);
        logoHeight = logoSettings.height;
        this.doc.addImage(imageData, format, this.margin, companyInfoY, logoSettings.width, logoSettings.height);
      } catch (error) {
        console.error('❌ Failed to load logo:', error);
        logoHeight = 0;
      }
    }

    // Add company information
    companyInfoY = this.addCompanyInfo(fpoProfile, companyInfoX, companyInfoY, companySettings);

    // Add right content if provided
    let rightContentEndY = currentY;
    if (options.rightContent) {
      rightContentEndY = this.addRightContent(options.rightContent, currentY);
    }

    return Math.max(currentY + logoHeight, companyInfoY, rightContentEndY);
  }

  /**
   * Logo-top layout: Logo on top, then company info below
   */
  private async addLogoTopHeader(
    fpoProfile: FpoProfile, 
    currentY: number, 
    options: HeaderLayoutOptions
  ): Promise<number> {
    const logoSettings = {
      width: 40,
      height: 30,
      spacing: 10,
      ...options.logoSettings
    };

    const companySettings = {
      nameSize: 16,
      detailsSize: 10,
      lineSpacing: 5,
      showAddress: true,
      showContact: true,
      showGSTIN: true,
      ...options.companySettings
    };

    let headerY = currentY;

    // Add logo if available
    if (fpoProfile.logoUrl) {
      try {
        const { imageData, format } = await this.loadImage(fpoProfile.logoUrl);
        this.doc.addImage(imageData, format, this.margin, headerY, logoSettings.width, logoSettings.height);
        headerY += logoSettings.height + logoSettings.spacing;
      } catch (error) {
        console.error('❌ Failed to load logo:', error);
      }
    }

    // Add company information below logo
    headerY = this.addCompanyInfo(fpoProfile, this.margin, headerY, companySettings);

    // Add right content if provided
    let rightContentEndY = currentY;
    if (options.rightContent) {
      rightContentEndY = this.addRightContent(options.rightContent, currentY);
    }

    return Math.max(headerY, rightContentEndY);
  }

  /**
   * Company-only layout: Just company information, no logo
   */
  private addCompanyOnlyHeader(
    fpoProfile: FpoProfile, 
    currentY: number, 
    options: HeaderLayoutOptions
  ): Promise<number> {
    const companySettings = {
      nameSize: 18,
      detailsSize: 10,
      lineSpacing: 5,
      showAddress: true,
      showContact: true,
      showGSTIN: true,
      ...options.companySettings
    };

    // Add company information
    const companyInfoEndY = this.addCompanyInfo(fpoProfile, this.margin, currentY, companySettings);

    // Add right content if provided
    let rightContentEndY = currentY;
    if (options.rightContent) {
      rightContentEndY = this.addRightContent(options.rightContent, currentY);
    }

    return Promise.resolve(Math.max(companyInfoEndY, rightContentEndY));
  }

  /**
   * Add company information with flexible settings
   */
  private addCompanyInfo(
    fpoProfile: FpoProfile, 
    startX: number, 
    startY: number, 
    settings: Required<Exclude<HeaderLayoutOptions['companySettings'], undefined>>
  ): number {
    let currentY = startY;

    // Company name
  
  // Company name with text wrapping
  this.doc.setFont('helvetica', 'bold');
  this.doc.setFontSize(settings.nameSize);
  
  // Calculate max width for company name (leaving space for right content)
  const maxWidth = this.pageWidth - startX - 70;
  
  // Split company name into lines if it's too long
  const companyNameLines = this.doc.splitTextToSize(
    fpoProfile.companyName || 'COMPANY NAME',
    maxWidth
  );

  // Add each line of company name
  companyNameLines.forEach((line: string, index: number) => {
    this.doc.text(line, startX, currentY + (index * (settings.nameSize / 2)));
  });

  // Update Y position based on number of lines
  currentY += (companyNameLines.length * (settings.nameSize / 2)) ;

    // Company details
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(settings.detailsSize);
    
    // Address
    if (settings.showAddress && (fpoProfile.addressLine1 || fpoProfile.city || fpoProfile.state)) {
      const addressParts = [
        fpoProfile.addressLine1,
        fpoProfile.city,
        fpoProfile.state,
        fpoProfile.pincode
      ].filter(Boolean);
      
      const addressText = addressParts.join(', ');
      const maxWidth = this.pageWidth - startX - 90;
      const addressLines = this.doc.splitTextToSize(addressText, maxWidth);
      
      addressLines.forEach((line: string, index: number) => {
        this.doc.text(line, startX, currentY + (index * settings.lineSpacing));
      });
      currentY += addressLines.length * settings.lineSpacing;
    }

    // Contact info
    if (settings.showContact) {
      const contactParts = [];
      if (fpoProfile.invoiceEmail) contactParts.push(`Email: ${fpoProfile.invoiceEmail}`);
      if (fpoProfile.phoneNumber) contactParts.push(`Phone: ${fpoProfile.phoneNumber}`);
      
      if (contactParts.length > 0) {
        this.doc.text(contactParts.join(' | '), startX, currentY);
        currentY += settings.lineSpacing;
      }
    }

    // GST Number
    if (settings.showGSTIN && fpoProfile.gstNumber) {
      this.doc.text(`GSTN: ${fpoProfile.gstNumber}`, startX, currentY);
      currentY += settings.lineSpacing;
    }

    return currentY;
  }

  /**
   * Add right-aligned content (like invoice details)
   */
  private addRightContent(
    rightContent: HeaderLayoutOptions['rightContent'], 
    startY: number
  ): number {
    if (!rightContent) return startY;

    const rightX = this.pageWidth - this.margin;
    let currentY = startY;

    // Title (like "INVOICE")
    if (rightContent.title) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(rightContent.titleSize || 18);
      
      if (rightContent.titleColor) {
        this.doc.setTextColor(...rightContent.titleColor);
      }
      
      this.doc.text(rightContent.title, rightX, currentY, { align: 'right' });
      this.doc.setTextColor(0, 0, 0); // Reset to black
      currentY += (rightContent.titleSize || 18) > 16 ? 8 : 6;
    }

    // Details
    if (rightContent.details && rightContent.details.length > 0) {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(rightContent.detailsSize || 9);

      rightContent.details.forEach(detail => {
        this.doc.text(detail, rightX, currentY, { align: 'right' });
        currentY += 4;
      });
    }

    return currentY;
  }

  /**
   * Add company logo - COMMON across all documents
   */
  protected async addCompanyLogo(logoUrl: string, currentY: number, width: number = 40, height: number = 30): Promise<number> {
    try {
      console.log('🔍 Loading logo from URL:', logoUrl);
      const { imageData, format } = await this.loadImage(logoUrl);
      
      console.log('✅ Logo loaded successfully, format:', format);
      this.doc.addImage(imageData, format, this.margin, currentY, width, height);
      return currentY + height;
    } catch (error) {
      console.error('❌ Failed to load logo:', error);
      console.log('📝 Continuing without logo...');
      return currentY;
    }
  }

  /**
   * Add company header - COMMON across all documents with customization options
   */
  protected addCompanyHeader(
    fpoProfile: FpoProfile, 
    currentY: number,
    options: {
      showCompanyName?: boolean;
      companyNameSize?: number;
      showAddress?: boolean;
      showContact?: boolean;
      showGSTIN?: boolean;
      logoWidth?: number;
      spacing?: number;
    } = {}
  ): number {
    const {
      showCompanyName = true,
      companyNameSize = 20,
      showAddress = true,
      showContact = true,
      showGSTIN = true,
      spacing = 5
    } = options;

    let headerY = currentY;

    // Company name
    if (showCompanyName) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(companyNameSize);
      this.doc.text(fpoProfile.companyName || 'Company Name', this.margin, headerY);
      headerY += companyNameSize > 16 ? 12 : 8;
    }

    // Company details
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    
    const companyDetails = [];
    
    // Address - Enhanced formatting
    if (showAddress && (fpoProfile.addressLine1 || fpoProfile.city || fpoProfile.state || fpoProfile.pincode)) {
      const addressParts = [
        fpoProfile.addressLine1,
        fpoProfile.city,
        fpoProfile.state,
        fpoProfile.pincode
      ].filter(Boolean);
      
      // Format address properly
      const addressLine = addressParts.join(', ');
      companyDetails.push(addressLine);
    }

    // Contact info
    if (showContact) {
      const contactParts = [];
      if (fpoProfile.invoiceEmail) contactParts.push(`Email : ${fpoProfile.invoiceEmail}`);
      if (fpoProfile.phoneNumber) contactParts.push(`Phone : ${fpoProfile.phoneNumber}`);
      
      if (contactParts.length > 0) {
        companyDetails.push(contactParts.join(' | '));
      }
    }

    // GST Number
    if (showGSTIN && fpoProfile.gstNumber) {
      companyDetails.push(`GSTN: ${fpoProfile.gstNumber}`);
    }

    companyDetails.forEach(detail => {
      this.doc.text(detail, this.margin, headerY);
      headerY += spacing;
    });

    return headerY + 10;
  }

  /**
   * Add bank details - COMMON across all documents (when needed)
   */
  protected addBankDetails(bankDetail: BankDetail, currentY: number): number {
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.text('Bank Detail:', this.margin, currentY);
    currentY += 8;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);

    const bankInfo = [
      `Account Holder Name: ${bankDetail.accountHolderName}`,
      `Bank Name: ${bankDetail.bankName}`,
      `Account Number: ${bankDetail.accountNumber}`,
      `IFSC Code: ${bankDetail.ifscCode}`
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

  /**
   * Add terms and conditions - COMMON across all documents (when needed)
   */
  protected addTermsAndConditions(terms: string, currentY: number): number {
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.text('Terms & Conditions', this.margin, currentY);
    currentY += 8;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);

    const lines = this.doc.splitTextToSize(terms, this.pageWidth - 2 * this.margin);
    this.doc.text(lines, this.margin, currentY);

    return currentY + lines.length * 4 + 10;
  }

  /**
   * Add notes - COMMON across all documents (when needed)
   */
  protected addNotes(notes: string): void {
    const notesY = this.pageHeight - 60;
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.text('Notes:', this.margin, notesY);
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    const lines = this.doc.splitTextToSize(notes, this.pageWidth - 2 * this.margin);
    this.doc.text(lines, this.margin, notesY + 5);
  }

  /**
   * Add signature section - COMMON but can be overridden
   */
  protected addSignatureSection(
    leftLabel: string = 'Customer Signature', 
    rightLabel: string = 'Authorized Signatory'
  ): void {
    const signatureY = this.pageHeight - 40;
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    
    this.doc.text(leftLabel, this.margin, signatureY);
    this.doc.text(rightLabel, this.pageWidth - this.margin - 80, signatureY);
    
    // Add signature lines
    this.doc.line(this.margin, signatureY + 5, this.margin + 60, signatureY + 5);
    this.doc.line(this.pageWidth - this.margin - 80, signatureY + 5, this.pageWidth - this.margin, signatureY + 5);
  }

  /**
   * Utility methods - COMMON across all documents
   */
  protected async loadImage(url: string): Promise<{ imageData: string; format: string }> {
    console.log('🔄 loadImage() called with URL:', url);
    
    return new Promise((resolve, reject) => {
      console.log('🔍 Starting image load process...');
      
      // Handle data URLs (base64 images)
      if (url.startsWith('data:')) {
        console.log('📊 Processing data URL...');
        try {
          const format = this.getImageFormatFromDataUrl(url);
          console.log('✅ Data URL processed, format:', format);
          resolve({ imageData: url, format });
        } catch (error) {
          console.error('❌ Error processing data URL:', error);
          reject(error);
        }
        return;
      }

      // Handle regular URLs
      console.log('🌐 Loading image from URL:', url);
      const img = new Image();
      
      // Set up error handling
      img.onerror = (error) => {
        console.error('❌ Image load error event:', error);
        console.error('❌ Failed URL:', url);
        reject(new Error(`Failed to load image from URL: ${url}`));
      };

      // Set up success handling
      img.onload = () => {
        try {
          console.log('✅ Image onload event fired');
          console.log('📏 Image dimensions:', img.width, 'x', img.height);
          
          if (img.naturalWidth === 0 || img.naturalHeight === 0) {
            throw new Error('Image loaded but has zero dimensions');
          }
          
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('Could not get canvas context');
          }

          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          
          console.log('🎨 Drawing image to canvas...');
          ctx.drawImage(img, 0, 0);
          
          // Determine format from URL or default to JPEG
          const format = this.getImageFormatFromUrl(url);
          const mimeType = format === 'PNG' ? 'image/png' : 'image/jpeg';
          const quality = format === 'JPEG' ? 0.92 : undefined;
          
          console.log('🔄 Converting canvas to data URL...');
          const dataUrl = canvas.toDataURL(mimeType, quality);
          
          console.log('✅ Canvas conversion successful, format:', format);
          resolve({ imageData: dataUrl, format });
        } catch (error) {
          console.error('❌ Canvas conversion error:', error);
          reject(error);
        }
      };

      // Configure image loading
      console.log('⚙️ Setting up image configuration...');
      img.crossOrigin = 'anonymous';
      
      // Add timeout for loading
      const timeout = setTimeout(() => {
        console.error('⏰ Image load timeout after 15 seconds');
        reject(new Error('Image load timeout after 15 seconds'));
      }, 15000);

      // Wrap original handlers to clear timeout
      const originalOnload = img.onload;
      const originalOnError = img.onerror;
      
      img.onload = (event) => {
        clearTimeout(timeout);
        if (originalOnload) originalOnload.call(img, event);
      };

      img.onerror = (error) => {
        clearTimeout(timeout);
        if (originalOnError) originalOnError.call(img, error);
      };

      // Start loading
      console.log('🚀 Setting image src to start loading...');
      img.src = url;
    });
  }

  /**
   * Get image format from URL extension
   */
  private getImageFormatFromUrl(url: string): string {
    const extension = url.toLowerCase().split('.').pop()?.split('?')[0];
    console.log('🔍 Detected file extension:', extension);
    
    switch (extension) {
      case 'png':
        return 'PNG';
      case 'jpg':
      case 'jpeg':
        return 'JPEG';
      case 'webp':
        return 'PNG'; // jsPDF doesn't support WebP, convert to PNG
      case 'gif':
        return 'PNG'; // jsPDF doesn't support GIF, convert to PNG
      default:
        console.log('⚠️ Unknown extension, defaulting to JPEG');
        return 'JPEG';
    }
  }

  /**
   * Get image format from data URL
   */
  private getImageFormatFromDataUrl(dataUrl: string): string {
    if (dataUrl.startsWith('data:image/png')) {
      return 'PNG';
    } else if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
      return 'JPEG';
    } else if (dataUrl.startsWith('data:image/webp')) {
      return 'PNG'; // Convert WebP to PNG for jsPDF
    } else if (dataUrl.startsWith('data:image/gif')) {
      return 'PNG'; // Convert GIF to PNG for jsPDF
    } else {
      console.log('⚠️ Unknown data URL format, defaulting to JPEG');
      return 'JPEG';
    }
  }

  protected formatDate(dateString: Date | string): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',  
      year: 'numeric'
    });
  }

  protected formatCurrency(amount: number): string {
    // Use "Rs" prefix for better PDF compatibility instead of rupee symbol
    return `Rs ${amount.toFixed(2)}`;
  }

  /**
   * Common method to fetch FPO Profile - COMMON across all documents
   */
  protected async fetchFPOProfile(fpoId?: string): Promise<FpoProfile> {
    const response = await fetch(`/api/fpo/profile?fpoId=${fpoId ? `${fpoId}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch FPO profile');
    return response.json();
  }

  /**
   * Abstract methods - Each document type implements its own
   */
  abstract generatePDF(documentId: string): Promise<void>;
}