import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Receipt, CreditCard } from 'lucide-react';

// Type definitions
type DocumentType = 'invoice' | 'purchase_voucher' | 'quotation';

interface DocumentCardProps {
  document: {
    documentType: DocumentType;
    id: string;
    invoiceNumber?: string;
    voucherNumber?: string;
    quotationNumber?: string;
    invoiceDate?: string;
    partyInvoiceNumber?: string;
    partyInvoiceDate?: string;
    supplierVendorName?: string;
    customer?: {
      name: string;
    };
    summary: {
      grandTotal: number;
    };
    status?: string;
  } | null | undefined;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ document }) => {
  // Early return if document is null or undefined
  if (!document) {
    return null;
  }

  // Helper functions
  const getDocumentNumber = () => {
    switch (document.documentType) {
      case 'invoice':
        return document.invoiceNumber || 'N/A';
      case 'purchase_voucher':
        return document.voucherNumber || 'N/A';
      case 'quotation':
        return document.quotationNumber || 'N/A';
      default:
        return 'N/A';
    }
  };

  const getDocumentIcon = () => {
    switch (document.documentType) {
      case 'invoice':
        return <Receipt className="w-3 h-3" />;
      case 'purchase_voucher':
        return <CreditCard className="w-3 h-3" />;
      case 'quotation':
        return <FileText className="w-3 h-3" />;
      default:
        return <FileText className="w-3 h-3" />;
    }
  };

  const getDocumentTypeLabel = () => {
    switch (document.documentType) {
      case 'invoice':
        return 'Invoice';
      case 'purchase_voucher':
        return 'Purchase Voucher';
      case 'quotation':
        return 'Quotation';
      default:
        return 'Document';
    }
  };

  const getLedgerName = () => {
    if (document.documentType === 'invoice') {
      return document.customer?.name || 'N/A';
    } else if (document.documentType === 'purchase_voucher') {
      return document.supplierVendorName || 'N/A';
    }
    return 'N/A';
  };

  const getDocumentDate = () => {
    let dateStr: string | undefined;
    
    // Get the appropriate date field based on document type
    switch (document.documentType) {
      case 'purchase_voucher':
        dateStr = document.partyInvoiceDate;
        break;
      case 'invoice':
      case 'quotation':
      default:
        dateStr = document.invoiceDate;
        break;
    }
    
    if (!dateStr) return 'N/A';
    
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatAmount = (amount: number) => {
    // Add null check for amount
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '₹0';
    }
    
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'sent':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'paid':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const getDocumentNumberLabel = () => {
    switch (document.documentType) {
      case 'invoice':
        return 'Invoice Number';
      case 'purchase_voucher':
        return 'Voucher Number';
      case 'quotation':
        return 'Quotation Number';
      default:
        return 'Doc. Number';
    }
  };

  const getDocumentDateLabel = () => {
    switch (document.documentType) {
      case 'invoice':
        return 'Invoice Date';
      case 'purchase_voucher':
        return 'Party Inv. Date';
      case 'quotation':
        return 'Quotation Date';
      default:
        return 'Date';
    }
  };

  const getReferenceInfo = () => {
    if (document.documentType === 'purchase_voucher' && document.partyInvoiceNumber) {
      return {
        hasReference: true,
        refNumber: document.partyInvoiceNumber,
        refDate: document.partyInvoiceDate ? new Date(document.partyInvoiceDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }) : 'N/A'
      };
    }
    return { hasReference: false, refNumber: '', refDate: '' };
  };

  const referenceInfo = getReferenceInfo();

  // Table rows data - dynamic based on document type
  const getTableRows = () => {
    const baseRows = [
      { label: getDocumentNumberLabel(), value: getDocumentNumber() }
    ];

    // Add reference info for purchase vouchers
    if (referenceInfo.hasReference) {
      baseRows.push(
        { label: 'Party Inv. No.', value: referenceInfo.refNumber },
        { label: 'Party Inv. Date', value: referenceInfo.refDate }
      );
    }

    // Add document date and ledger
    baseRows.push(
      { label: getDocumentDateLabel(), value: getDocumentDate() },
      { label: 'Ledger', value: getLedgerName() },
      { label: 'Amount', value: formatAmount(document.summary?.grandTotal) }
    );

    return baseRows;
  };

  const tableRows = getTableRows();

  return (
    <Card className="w-full h-full flex flex-col shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <CardHeader className="pb-2 px-3 pt-3 flex-shrink-0 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {getDocumentIcon()}
            <span className="text-xs font-semibold text-gray-700 truncate">
              {getDocumentTypeLabel()}
            </span>
          </div>
          {document.status && (
            <Badge 
              variant="secondary" 
              className={`text-xs px-2 py-0.5 ${getStatusColor(document.status)}`}
            >
              {document.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      {/* Table Content */}
      <CardContent className="px-0 pb-0 pt-0 flex-1">
        <div className="divide-y divide-gray-100">
          {tableRows.map((row, index) => (
            <div 
              key={index} 
              className={`flex ${row.label === 'Amount' ? 'bg-gray-50 font-semibold' : ''}`}
            >
              {/* Label Column */}
              <div className="w-2/5 px-3 py-2 text-xs text-gray-600 font-medium bg-gray-50 border-r border-gray-100">
                {row.label}
              </div>
              {/* Value Column */}
              <div className={`w-3/5 px-3 py-2 text-xs ${
                row.label === 'Amount' 
                  ? 'font-bold text-gray-900 text-sm' 
                  : 'text-gray-800'
              }`}>
                <div className="truncate" title={row.value}>
                  {row.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentCard;