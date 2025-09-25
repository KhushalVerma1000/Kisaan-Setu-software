import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, RefreshCw, FileText, Calendar, DollarSign, Receipt, ShoppingCart, Calculator, CheckCircle, Clock } from "lucide-react";
import { PaymentDocument, PaymentStatus } from '@/server/features/Payment/core/entities/PaymentDocument';
import { paymentDocumentApi, PaymentDocumentApiError } from '@/server/features/Payment/infrastructure/apiHelper/paymentDocumentAi';

// Document interfaces
interface Invoice {
  documentType: 'invoice';
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customer: {
    id: string;
    name: string;
    gstin: string;
    billingAddress: any;
    shippingAddress: any;
  };
  summary: {
    grandTotal: number;
    subTotal: number;
    totalGST: number;
    totalDiscount: number;
    shipmentAmount: number;
    roundOff: number;
  };
  fpoId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface PurchaseVoucher {
  documentType: 'purchase_voucher';
  id: string;
  voucherNumber: string;
  supplierVendorName: string;
  supplierVendorId: string;
  partyInvoiceNumber: string;
  partyInvoiceDate: string;
  summary: {
    grandTotal: number;
    subTotal: number;
    totalGST: number;
    totalDiscount: number;
    shipmentAmount: number;
    roundOff: number;
  };
  fpoId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

type DocumentType = Invoice | PurchaseVoucher;

// Enhanced interfaces for data separation
interface ApiPaymentData {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: PaymentStatus;
  progressPercentage: number;
  lastUpdated?: string;
}

interface ProvisionalPaymentData {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: PaymentStatus;
  progressPercentage: number;
  payingAmount: number;
  newPaidAmount: number;
  newRemainingAmount: number;
  newStatus: PaymentStatus;
  newProgressPercentage: number;
}

interface PaymentDocumentInfoProps {
  document: DocumentType | null;
  onUpdate?: (paymentDocument: PaymentDocument) => void;
  onRemainingBalanceChange?: (remainingBalance: number) => void;
  payingAmount?: number;
  className?: string;
}

export const PaymentDocumentInfo: React.FC<PaymentDocumentInfoProps> = ({
  document,
  onUpdate,
  onRemainingBalanceChange,
  payingAmount = 0,
  className
}) => {
  const [paymentDocument, setPaymentDocument] = useState<PaymentDocument | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [hasNoPaymentDocument, setHasNoPaymentDocument] = useState(false);

  // Background fetch function
  const fetchPaymentDocument = async () => {
    if (!document?.id || !document?.documentType || !document?.fpoId) return;

    setPaymentLoading(true);
    setPaymentError(null);
    setHasNoPaymentDocument(false);

    try {
      const paymentDoc = await paymentDocumentApi.getPaymentDocumentByDocument(
        document.id, 
        document.documentType, 
        document.fpoId
      );
      
      const paymentDocumentInstance = PaymentDocument.fromInterface(paymentDoc);
      setPaymentDocument(paymentDocumentInstance);
      setHasNoPaymentDocument(false);
    } catch (err) {
      console.error('Error fetching payment document:', err);
      
      const is404Error = 
        (err instanceof PaymentDocumentApiError && (
          err.message.includes('404') || 
          err.message.toLowerCase().includes('not found')
        )) ||
        (err instanceof Error && (
          err.message.includes('404') ||
          err.message.toLowerCase().includes('not found')
        )) ||
        (err && typeof err === 'object' && 'status' in err && err.status === 404);

      if (is404Error) {
        console.log('No payment document found (404) - this is expected for new documents');
        setHasNoPaymentDocument(true);
        setPaymentDocument(null);
        setPaymentError(null);
      } else {
        const errorMessage = err instanceof PaymentDocumentApiError 
          ? err.message 
          : err instanceof Error 
          ? err.message 
          : 'Failed to fetch payment document';
        
        setPaymentError(errorMessage);
        setHasNoPaymentDocument(false);
        setPaymentDocument(null);
      }
    } finally {
      setPaymentLoading(false);
    }
  };

  // Background fetch on mount/document change
  useEffect(() => {
    if (document?.id && document?.documentType && document?.fpoId) {
      setPaymentDocument(null);
      setPaymentError(null);
      setHasNoPaymentDocument(false);
      fetchPaymentDocument();
    } else {
      setPaymentDocument(null);
      setPaymentError(null);
      setHasNoPaymentDocument(false);
      setPaymentLoading(false);
    }
  }, [document?.id, document?.documentType, document?.fpoId]);

  // Separate API data calculation
  const getApiPaymentData = (): ApiPaymentData | null => {
    if (!document) return null;

    if (hasNoPaymentDocument) {
      return {
        totalAmount: document.summary.grandTotal,
        paidAmount: 0,
        remainingAmount: document.summary.grandTotal,
        status: 'pending' as PaymentStatus,
        progressPercentage: 0,
      };
    } else if (paymentDocument) {
      const progress = paymentDocument.getPaymentProgress();
      return {
        totalAmount: progress.totalAmount,
        paidAmount: progress.paidAmount,
        remainingAmount: progress.remainingAmount,
        status: paymentDocument.paymentStatus,
        progressPercentage: progress.totalAmount > 0 ? (progress.paidAmount / progress.totalAmount) * 100 : 0,
        lastUpdated: paymentDocument.updatedAt?.toLocaleString()
      };
    }

    return null;
  };

  // Separate provisional data calculation
  const getProvisionalPaymentData = (): ProvisionalPaymentData | null => {
    const apiData = getApiPaymentData();
    if (!apiData || !payingAmount) return null;

    const newPaidAmount = apiData.paidAmount + payingAmount;
    const newRemainingAmount = Math.max(0, apiData.remainingAmount - payingAmount);
    const newProgressPercentage = apiData.totalAmount > 0 ? (newPaidAmount / apiData.totalAmount) * 100 : 0;
    
    let newStatus: PaymentStatus;
    if (newRemainingAmount <= 0) {
      newStatus = 'completed';
    } else if (newPaidAmount > 0) {
      newStatus = 'partial';
    } else {
      newStatus = 'pending';
    }

    return {
      ...apiData,
      payingAmount,
      newPaidAmount,
      newRemainingAmount,
      newStatus,
      newProgressPercentage,
    };
  };

  // Calculate and notify parent of remaining balance
  useEffect(() => {
    if (!document || !onRemainingBalanceChange) return;

    const apiData = getApiPaymentData();
    if (!apiData) return;

    const remainingBalance = Math.max(0, apiData.remainingAmount - payingAmount);
    onRemainingBalanceChange(remainingBalance);
  }, [document, paymentDocument, hasNoPaymentDocument, payingAmount, paymentLoading, paymentError, onRemainingBalanceChange]);

  // Update payment document
  const updatePaymentDocument = async (updatedDocument: PaymentDocument) => {
    if (!updatedDocument.id) {
      setPaymentError('Cannot update document without ID');
      return;
    }

    try {
      const result = await paymentDocumentApi.updatePaymentDocument(
        updatedDocument.id,
        {
          totalDocumentAmount: updatedDocument.totalDocumentAmount,
          totalPaidAmount: updatedDocument.totalPaidAmount,
          paymentStatus: updatedDocument.paymentStatus
        }
      );
      
      const paymentDocumentInstance = result instanceof PaymentDocument 
        ? result 
        : PaymentDocument.fromInterface(result);
      
      setPaymentDocument(paymentDocumentInstance);
      onUpdate?.(paymentDocumentInstance);
    } catch (err) {
      const errorMessage = err instanceof PaymentDocumentApiError 
        ? err.message 
        : err instanceof Error 
        ? err.message 
        : 'Failed to update payment document';
      setPaymentError(errorMessage);
      throw err;
    }
  };

  // Get document display information
  const getDocumentInfo = () => {
    if (!document) return null;
    
    if (document.documentType === 'invoice') {
      return {
        title: 'Invoice Payment Info',
        number: document.invoiceNumber,
        date: document.invoiceDate,
        party: document.customer.name,
        icon: Receipt,
        amountLabel: 'Received Amount',
        balanceLabel: 'Amount Receivable'
      };
    } else {
      return {
        title: 'Purchase Voucher Payment Info',
        number: document.voucherNumber,
        date: document.partyInvoiceDate,
        party: document.supplierVendorName,
        icon: ShoppingCart,
        amountLabel: 'Paid Amount',
        balanceLabel: 'Amount Payable'
      };
    }
  };

  // Format date safely
  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-IN');
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Check if payment is overdue
  const isOverdue = (document: PaymentDocument): boolean => {
    if (document.paymentStatus === 'completed') return false;
    const createdDate = document.createdAt;
    if (!createdDate) return false;
    
    try {
      const dateObj = typeof createdDate === 'string' ? new Date(createdDate) : createdDate;
      if (isNaN(dateObj.getTime())) return false;
      const daysDiff = Math.floor((Date.now() - dateObj.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff > 30;
    } catch (error) {
      return false;
    }
  };

  // Get API status with clear distinction
  const getApiStatus = (): { status: string; isFromApi: boolean } => {
    if (paymentLoading) return { status: 'loading', isFromApi: false };
    if (paymentError) return { status: 'error', isFromApi: false };
    
    if (hasNoPaymentDocument) {
      return { status: 'no_payment', isFromApi: true };
    } else if (paymentDocument) {
      const isOverdueStatus = isOverdue(paymentDocument) && paymentDocument.paymentStatus !== 'completed';
      return { 
        status: isOverdueStatus ? 'overdue' : paymentDocument.paymentStatus, 
        isFromApi: true 
      };
    }
    
    return { status: 'unknown', isFromApi: false };
  };

  // Get provisional status
  const getProvisionalStatus = (): { status: string; isProvisional: boolean } | null => {
    const provisionalData = getProvisionalPaymentData();
    if (!provisionalData) return null;

    return {
      status: provisionalData.newStatus,
      isProvisional: true
    };
  };

  // Render payment section with clear data separation
  const renderPaymentSection = () => {
    if (!document) return null;

    const documentInfo = getDocumentInfo();
    if (!documentInfo) return null;

    // Show loading state
    if (paymentLoading) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm font-medium">Payment Summary</span>
            <Loader2 className="h-3 w-3 animate-spin ml-2 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Loading payment data...</span>
              <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="h-2 rounded-full bg-gray-300 animate-pulse w-1/3" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-muted-foreground">Loading...</div>
                <div className="h-4 w-16 bg-gray-200 animate-pulse rounded mx-auto mt-1" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Show error state
    if (paymentError) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm font-medium">Payment Summary</span>
          </div>
          
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-red-500">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span className="text-sm">{paymentError}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPaymentDocument}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      );
    }

    const apiData = getApiPaymentData();
    const provisionalData = getProvisionalPaymentData();

    if (!apiData) return null;

    const isPaymentInProgress = !!provisionalData;
    const displayData = provisionalData || apiData;
    const apiStatus = getApiStatus();
    const provisionalStatus = getProvisionalStatus();

    return (
      <div className="space-y-4">
        {/* Header with payment status */}
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          <span className="text-sm font-medium">Payment Progress</span>
          
          {/* Status indicators for user clarity */}
          {provisionalStatus && (
            <Badge variant="outline" className="bg-amber-50 text-amber-600 text-xs border-amber-200">
              Processing Payment
            </Badge>
          )}
        </div>

        {/* Progress visualization with clear separation */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress: {displayData.progressPercentage.toFixed(1)}%</span>
            <span>
              {isPaymentInProgress ? (
                <span className="flex items-center gap-1">
                  <span className="text-gray-600">
                    {formatCurrency(apiData.paidAmount)}
                  </span>
                  <span className="text-blue-600 font-medium border-b border-dashed border-blue-300">
                    +{formatCurrency(payingAmount)}
                  </span>
                  <span className="text-gray-500">/ {formatCurrency(apiData.totalAmount)}</span>
                </span>
              ) : (
                <span>
                  {formatCurrency(apiData.paidAmount)} / {formatCurrency(apiData.totalAmount)}
                </span>
              )}
            </span>
          </div>
          
          {/* Enhanced progress bar with separation */}
          <div className="w-full bg-gray-200 rounded-full h-2 relative">
            {/* Base progress */}
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                apiStatus.status === 'overdue' ? 'bg-red-500' : 
                apiData.status === 'partial' ? 'bg-blue-500' : 
                apiData.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
              }`}
              style={{ width: `${Math.min(100, apiData.progressPercentage)}%` }}
            />
            
            {/* Provisional overlay */}
            {isPaymentInProgress && (
              <div 
                className="absolute top-0 h-2 rounded-r-full bg-amber-400 opacity-70 transition-all duration-300"
                style={{ 
                  left: `${apiData.progressPercentage}%`,
                  width: `${Math.min(100 - apiData.progressPercentage, (payingAmount / apiData.totalAmount) * 100)}%`,
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)'
                }}
              />
            )}
          </div>
        </div>

        {/* Payment calculation breakdown when paying */}
        {isPaymentInProgress && provisionalData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Payment Summary</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              {/* Current State */}
              <div className="space-y-2">
                <div className="text-blue-700 font-medium border-b border-blue-200 pb-1">
                  Current Status
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-mono">{apiData.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid:</span>
                    <span className="font-mono">{formatCurrency(apiData.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Remaining:</span>
                    <span className="font-mono">{formatCurrency(apiData.remainingAmount)}</span>
                  </div>
                </div>
              </div>
              
              {/* After Payment */}
              <div className="space-y-2">
                <div className="text-amber-700 font-medium border-b border-amber-200 pb-1">
                  After Payment (+{formatCurrency(payingAmount)})
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={`font-mono ${provisionalData.newStatus !== apiData.status ? 'text-amber-700 font-bold' : ''}`}>
                      {provisionalData.newStatus}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid:</span>
                    <span className={`font-mono ${provisionalData.newPaidAmount !== apiData.paidAmount ? 'text-amber-700 font-bold' : ''}`}>
                      {formatCurrency(provisionalData.newPaidAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Remaining:</span>
                    <span className={`font-mono ${provisionalData.newRemainingAmount !== apiData.remainingAmount ? 'text-amber-700 font-bold' : ''}`}>
                      {formatCurrency(provisionalData.newRemainingAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Status Change Alert */}
            {provisionalData.newStatus !== apiData.status && (
              <div className="mt-3 p-2 bg-amber-100 border border-amber-300 rounded">
                <div className="text-sm text-amber-800">
                  <strong>Payment will change status:</strong> {apiData.status} → {provisionalData.newStatus}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-muted-foreground">Total Amount</div>
            <div className="font-semibold">{formatCurrency(apiData.totalAmount)}</div>
          </div>
          
          <div className={`text-center p-3 rounded-lg ${isPaymentInProgress ? 'bg-blue-50 border border-blue-200' : 'bg-blue-50'}`}>
            <div className="text-muted-foreground">{documentInfo.amountLabel}</div>
            <div className="space-y-1">
              <div className="font-semibold text-blue-600">
                {formatCurrency(isPaymentInProgress ? provisionalData!.newPaidAmount : apiData.paidAmount)}
              </div>
              {isPaymentInProgress && (
                <div className="text-xs text-blue-600">
                  <span>{formatCurrency(apiData.paidAmount)}</span>
                  <span className="mx-1">+</span>
                  <span className="border-b border-dashed border-blue-400">{formatCurrency(payingAmount)}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-muted-foreground">{documentInfo.balanceLabel}</div>
            <div className="space-y-1">
              <div className={`font-semibold ${(isPaymentInProgress ? provisionalData!.newRemainingAmount : apiData.remainingAmount) <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                {formatCurrency(isPaymentInProgress ? provisionalData!.newRemainingAmount : apiData.remainingAmount)}
              </div>
              {isPaymentInProgress && (
                <div className="text-xs text-orange-600">
                  After Payment
                </div>
              )}
            </div>
          </div>
        </div>

        {!hasNoPaymentDocument && (isPaymentInProgress ? provisionalData!.newRemainingAmount : apiData.remainingAmount) > 0 && paymentDocument?.canAcceptPayment((isPaymentInProgress ? provisionalData!.newRemainingAmount : apiData.remainingAmount)) && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-700">
              <strong>Can accept:</strong> Up to {formatCurrency(isPaymentInProgress ? provisionalData!.newRemainingAmount : apiData.remainingAmount)} more
            </div>
          </div>
        )}

        {/* Confirmation message about what will happen after payment */}
        {isPaymentInProgress && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="space-y-2">
                <div className="text-sm font-medium text-green-800">
                  Payment Confirmation Preview
                </div>
                <div className="text-sm text-green-700 space-y-1">
                  <p>
                    After processing this payment of <strong>{formatCurrency(payingAmount)}</strong>:
                  </p>
                  <ul className="ml-4 space-y-1 list-disc">
                    <li>
                      Total paid will be <strong>{formatCurrency(provisionalData!.newPaidAmount)}</strong>
                    </li>
                    {provisionalData!.newRemainingAmount > 0 ? (
                      <li>
                        Remaining balance will be <strong>{formatCurrency(provisionalData!.newRemainingAmount)}</strong>
                      </li>
                    ) : (
                      <li className="text-green-800 font-medium">
                        This {document.documentType} will be <strong>fully paid</strong>
                      </li>
                    )}
                    <li>
                      Payment status will be updated to <strong>
                        {provisionalData!.newRemainingAmount <= 0 ? 'Completed' : 'Partial'}
                      </strong>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {hasNoPaymentDocument && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {isPaymentInProgress ? 'Processing first payment' : 'No payments made yet'}
              </span>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              {isPaymentInProgress 
                ? `Processing ${formatCurrency(payingAmount)} will leave ${formatCurrency(provisionalData!.newRemainingAmount)} ${document.documentType === 'invoice' ? 'receivable' : 'payable'}.`
                : `The full amount of ${formatCurrency(apiData.totalAmount)} is still ${document.documentType === 'invoice' ? 'receivable' : 'payable'}.`
              }
            </p>
          </div>
        )}

        {apiStatus.status === 'overdue' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                This payment is overdue. Please process immediately.
              </span>
            </div>
          </div>
        )}

        {(isPaymentInProgress ? provisionalData!.newStatus === 'completed' : apiData.status === 'completed') && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {isPaymentInProgress ? 'Payment will be completed after processing' : 'Payment is completed'}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Early return for null document
  if (!document) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Payment Info
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No document selected</p>
            <p className="text-sm">Please select a document to view payment information</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const documentInfo = getDocumentInfo();
  if (!documentInfo) return null;

  const IconComponent = documentInfo.icon;
  const apiStatus = getApiStatus();
  const provisionalStatus = getProvisionalStatus();

  // Main render
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <IconComponent className="h-5 w-5" />
            {documentInfo.title}
          </CardTitle>
          
          {/* Status badges for normal users */}
          <div className="flex items-center gap-2">
            {/* Loading Status */}
            {apiStatus.status === 'loading' && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Loading...
              </Badge>
            )}
            
            {/* Error Status */}
            {apiStatus.status === 'error' && (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Error
              </Badge>
            )}
            
            {/* Current Status Badge */}
            {apiStatus.isFromApi && (
              <Badge variant="outline" className={`${
                apiStatus.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                apiStatus.status === 'overdue' ? 'bg-red-50 text-red-700 border-red-200' :
                apiStatus.status === 'partial' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                apiStatus.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                'bg-gray-50 text-gray-700 border-gray-200'
              }`}>
                {apiStatus.status === 'no_payment' ? 'No Payment' : 
                 apiStatus.status === 'overdue' ? 'Overdue' :
                 apiStatus.status === 'completed' ? 'Completed' :
                 apiStatus.status === 'partial' ? 'Partial' :
                 apiStatus.status === 'pending' ? 'Pending' : 
                 apiStatus.status.charAt(0).toUpperCase() + apiStatus.status.slice(1)}
              </Badge>
            )}
            
            {/* Provisional Status Badge - only shows when payment is in progress */}
            {provisionalStatus && provisionalStatus.status !== apiStatus.status && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Will become: {provisionalStatus.status === 'completed' ? 'Completed' :
                              provisionalStatus.status === 'partial' ? 'Partial' :
                              provisionalStatus.status === 'pending' ? 'Pending' : 
                              provisionalStatus.status.charAt(0).toUpperCase() + provisionalStatus.status.slice(1)}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Document Details - Always visible immediately */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Document Number</div>
            <div className="font-mono text-sm">{documentInfo.number}</div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Document Type</div>
            <div className="text-sm capitalize">{document.documentType.replace('_', ' ')}</div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              {document.documentType === 'invoice' ? 'Customer' : 'Supplier'}
            </div>
            <div className="text-sm">{documentInfo.party}</div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Date</div>
            <div className="text-sm">{formatDate(documentInfo.date)}</div>
          </div>
        </div>

        {/* Payment Section - Dynamic based on state */}
        {renderPaymentSection()}

        {/* Timestamps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {paymentDocument ? 'Payment Created:' : 'Document Created:'}
            </span>
            <span>{formatDate(paymentDocument?.createdAt || document.createdAt)}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Last Updated:</span>
            <span>{formatDate(paymentDocument?.updatedAt || document.updatedAt)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPaymentDocument}
            disabled={paymentLoading}
          >
            {paymentLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          
          {/* Show completion status */}
          {apiStatus.status === 'completed' && !provisionalStatus && (
            <Button
              variant="outline"
              size="sm"
              className="text-green-600 border-green-200 bg-green-50"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Completed
            </Button>
          )}
          
          {/* Show provisional completion status */}
          {provisionalStatus?.status === 'completed' && (
            <Button
              variant="outline"
              size="sm"
              className="text-amber-600 border-amber-200 bg-amber-50"
            >
              <Clock className="h-4 w-4 mr-1" />
              Will Complete
            </Button>
          )}
        </div>

        {/* Debug info (can be removed in production) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="text-xs text-gray-500 border-t pt-4">
            <summary className="cursor-pointer mb-2">Debug Info (Dev Only)</summary>
            <div className="space-y-1 font-mono">
              <div>Current Status: {apiStatus.status}</div>
              <div>Has Payment Document: {String(!hasNoPaymentDocument)}</div>
              <div>Payment Loading: {String(paymentLoading)}</div>
              <div>Payment Error: {paymentError || 'None'}</div>
              <div>Paying Amount: {payingAmount}</div>
              {provisionalStatus && (
                <div>Provisional Status: {provisionalStatus.status}</div>
              )}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentDocumentInfo;