'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Edit3, 
  Download, 
  Printer, 
  Copy,
  Calendar,
  User,
  MapPin,
  Phone,
  FileText,
  Truck,
  Package,
  Receipt,
  Loader2
} from 'lucide-react';
import { InvoiceAPI } from '@/server/features/sales/invoice/infrastructure/apihelpers/invoiceApi';
import type { 
  InvoiceInterface, 
  InvoiceItemInterface
} from '@/server/features/sales/invoice/core/entities/invoice';

// Redux imports
import { useAppSelector } from '@/store/hooks';

const ViewInvoicePage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  
  // Get invoice ID from URL parameters
  const invoiceId = params?.id as string;
  
  // Redux state
  const user = useAppSelector((state) => state.user);
  const fpoIdOfUser = user?.fpoId;

  // Loading states
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceInterface | null>(null);

  // Fetch invoice data
  useEffect(() => {
    if (invoiceId && fpoIdOfUser) {
      fetchInvoiceData();
    } else if (!invoiceId) {
      toast.error('Invoice ID not found');
      router.push('/Sales/Invoice');
    }
  }, [invoiceId, fpoIdOfUser]);

  const fetchInvoiceData = async () => {
    try {
      setLoading(true);
      const invoiceData = await InvoiceAPI.getById(invoiceId);
      
      if (!invoiceData) {
        toast.error('Invoice not found');
        router.push('/Sales/Invoice');
        return;
      }

      setInvoice(invoiceData);
      console.log(invoiceData)
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Failed to load invoice data');
      router.push('/Sales/Invoice');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | Date | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '₹0.00';
    }
    return `₹${amount.toFixed(2)}`;
  };

  const handleEdit = () => {
    if (!invoice?.id) {
      toast.error('Invalid invoice ID');
      return;
    }
    router.push(`/Sales/Invoice/edit/${invoice.id}`);
  };

  const handleDownload = () => {
    // Implement PDF download functionality
    toast.info('Download functionality will be implemented');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleCopyInvoiceNumber = () => {
    const invoiceNumber = invoice?.invoiceNumber;
    if (invoiceNumber) {
      navigator.clipboard.writeText(invoiceNumber).then(() => {
        toast.success('Invoice number copied to clipboard');
      }).catch(() => {
        toast.error('Failed to copy invoice number');
      });
    } else {
      toast.error('Invoice number not available');
    }
  };

  const getStatusColor = (status: string | null | undefined) => {
    const statusLower = status?.toLowerCase() || '';
    switch (statusLower) {
      case 'sent':
        return 'text-blue-600 bg-blue-50';
      case 'paid':
        return 'text-green-600 bg-green-50';
      case 'draft':
        return 'text-gray-600 bg-gray-50';
      case 'overdue':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <div className="container mx-auto max-w-full">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading invoice...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto max-w-full">
        <div className="text-center py-20">
          <p className="text-gray-600">Invoice not found</p>
          <Button onClick={handleGoBack} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div className="flex items-center gap-3 mb-4 md:mb-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoBack}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                Invoice #{invoice.invoiceNumber || 'N/A'}
              </h1>
              {invoice.invoiceNumber && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyInvoiceNumber}
                  className="p-1 hover:bg-gray-100"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Badge className={`${getStatusColor(invoice.status)} border-0`}>
                {invoice.status?.toUpperCase() || 'DRAFT'}
              </Badge>
              <span className="text-gray-600 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(invoice.invoiceDate)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={handleEdit}>
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Invoice
          </Button>
        </div>
      </div>

      <div className="grid gap-6 print:gap-4">
        {/* Invoice Details Overview */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Invoice Date</span>
                </div>
                <p className="text-lg">{formatDate(invoice.invoiceDate)}</p>
              </div>
              
              {invoice.eWayBillNumber && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Receipt className="w-4 h-4" />
                    <span className="font-medium">E-Way Bill</span>
                  </div>
                  <p className="text-lg">{invoice.eWayBillNumber}</p>
                </div>
              )}
              
              {invoice.vehicleNumber && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Truck className="w-4 h-4" />
                    <span className="font-medium">Vehicle Number</span>
                  </div>
                  <p className="text-lg">{invoice.vehicleNumber}</p>
                </div>
              )}
              
              {invoice.poNumber && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Package className="w-4 h-4" />
                    <span className="font-medium">PO Number</span>
                  </div>
                  <p className="text-lg">{invoice.poNumber}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        {invoice.customer && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Billing Address */}
                <div>
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Billing Address
                  </h3>
                  <div className="space-y-2">
                    <p className="font-medium text-lg">{invoice.customer.name || 'N/A'}</p>
                    {invoice.customer.billingAddress?.address && (
                      <p className="text-gray-600 whitespace-pre-line">
                        {invoice.customer.billingAddress.address}
                      </p>
                    )}
                    {invoice.customer.billingAddress?.state && (
                      <p className="text-gray-600">{invoice.customer.billingAddress.state}</p>
                    )}
                    {invoice.customer.billingAddress?.phone && (
                      <p className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4" />
                        {invoice.customer.billingAddress.phone}
                      </p>
                    )}
                    {invoice.customer.gstin && (
                      <p className="text-gray-600">
                        <span className="font-medium">GSTIN:</span> {invoice.customer.gstin}
                      </p>
                    )}
                  </div>
                </div>

                {/* Shipping Address */}
                <div>
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Shipping Address
                    {invoice.customer.isSameAsBilling && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Same as Billing
                      </Badge>
                    )}
                  </h3>
                  <div className="space-y-2">
                    <p className="font-medium text-lg">{invoice.customer.name || 'N/A'}</p>
                    {invoice.customer.shippingAddress?.address && (
                      <p className="text-gray-600 whitespace-pre-line">
                        {invoice.customer.shippingAddress.address}
                      </p>
                    )}
                    {invoice.customer.shippingAddress?.state && (
                      <p className="text-gray-600">{invoice.customer.shippingAddress.state}</p>
                    )}
                    {invoice.customer.shippingAddress?.phone && (
                      <p className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4" />
                        {invoice.customer.shippingAddress.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoice Items */}
        {invoice.items && invoice.items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Invoice Items ({invoice.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-gray-700">Item</th>
                      <th className="text-center py-3 px-2 font-medium text-gray-700">Qty</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-700">Unit Price</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-700">Discount</th>
                      <th className="text-center py-3 px-2 font-medium text-gray-700">GST</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item: InvoiceItemInterface, index: number) => {
                      if (!item) return null;
                      
                      const quantity = item.quantity || 0;
                      const unitPrice = item.unitPrice || 0;
                      const discountValue = item.discount?.value || 0;
                      const discountType = item.discount?.type || 'fixed';
                      const gstRate = item.gstConfig?.rate || 0;
                      const gstType = item.gstConfig?.type || 'including';
                      
                      // Use calculations from API if available, otherwise calculate
                      const lineTotal = item.calculations?.lineTotal || 
                                      (item.gstConfig.type === 'including' ? quantity * unitPrice : 
                                       quantity * unitPrice * (1 + gstRate / 100));
                      
                      const baseAmount = item.calculations?.baseAmount || (quantity * unitPrice);
                      const discountAmount = item.calculations?.discountAmount || 
                                           (discountType === 'percent' ? (baseAmount * discountValue) / 100 : discountValue);

                      return (
                        <tr key={item.id || index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-2">
                            <div>
                              <p className="font-medium">{item.item?.name || 'Unknown Item'}</p>
                              {item.item?.category && (
                                <p className="text-sm text-gray-600">{item.item.category.name}</p>
                              )}
                              <p className="text-xs text-gray-500">
                                HSN: {item.item?.hsn_sac || 'N/A'} | 
                                Unit: {item.item?.unit?.label || item.item?.unit?.code || 'N/A'}
                              </p>
                            </div>
                          </td>
                          <td className="py-4 px-2 text-center">
                            {quantity}
                          </td>
                          <td className="py-4 px-2 text-right">
                            {formatCurrency(unitPrice)}
                          </td>
                          <td className="py-4 px-2 text-right">
                            {discountValue > 0 ? (
                              <span>
                                {discountType === 'percent' 
                                  ? `${discountValue}%` 
                                  : formatCurrency(discountValue)
                                }
                                <br />
                                <span className="text-sm text-gray-500">
                                  ({formatCurrency(discountAmount)})
                                </span>
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-4 px-2 text-center">
                            <div className="text-sm">
                              <div>{gstRate}%</div>
                              <div className="text-xs text-gray-500 capitalize">
                                {gstType}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-2 text-right font-medium">
                            {formatCurrency(lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Section */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Notes */}
          {invoice.notes && (
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-line">{invoice.notes}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Invoice Summary */}
          {invoice.summary && (
            <Card className={invoice.notes ? "" : "lg:col-span-3"}>
              <CardHeader>
                <CardTitle>Invoice Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sub Total:</span>
                    <span>{formatCurrency(invoice.summary.subTotal)}</span>
                  </div>
                  
                  {(invoice.summary.totalDiscount || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Discount:</span>
                      <span className="text-red-600">-{formatCurrency(invoice.summary.totalDiscount)}</span>
                    </div>
                  )}
                  
                  {(invoice.summary.totalCGST || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">CGST:</span>
                      <span>{formatCurrency(invoice.summary.totalCGST)}</span>
                    </div>
                  )}
                  
                  {(invoice.summary.totalSGST || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">SGST:</span>
                      <span>{formatCurrency(invoice.summary.totalSGST)}</span>
                    </div>
                  )}
                  
                  {(invoice.summary.totalIGST || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">IGST:</span>
                      <span>{formatCurrency(invoice.summary.totalIGST)}</span>
                    </div>
                  )}
                  
                  {(invoice.summary.shipmentAmount || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Shipment:</span>
                      <span>{formatCurrency(invoice.summary.shipmentAmount)}</span>
                    </div>
                  )}
                  
                  {invoice.summary.roundOff !== undefined && invoice.summary.roundOff !== 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Round Off:</span>
                      <span className={invoice.summary.roundOff > 0 ? 'text-green-600' : 'text-red-600'}>
                        {invoice.summary.roundOff > 0 ? '+' : ''}{formatCurrency(Math.abs(invoice.summary.roundOff))}
                      </span>
                    </div>
                  )}
                  
                  <Separator className="my-3" />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Grand Total:</span>
                    <span>{formatCurrency(invoice.summary.grandTotal)}</span>
                  </div>
                  
                  {invoice.summary.gstType && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 text-center">
                        GST Type: <span className="font-medium capitalize">{invoice.summary.gstType}</span>
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* GST Breakdown */}
        {invoice.gstBreakdown && Object.keys(invoice.gstBreakdown).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>GST Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium text-gray-700">GST Rate</th>
                      <th className="text-right py-2 font-medium text-gray-700">Taxable Value</th>
                      <th className="text-right py-2 font-medium text-gray-700">CGST</th>
                      <th className="text-right py-2 font-medium text-gray-700">SGST</th>
                      <th className="text-right py-2 font-medium text-gray-700">IGST</th>
                      <th className="text-right py-2 font-medium text-gray-700">Total GST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(invoice.gstBreakdown).map(([gstRate, breakdown]) => {
                      if (!breakdown || typeof breakdown !== 'object') return null;
                      
                      return (
                        <tr key={gstRate} className="border-b border-gray-100">
                          <td className="py-2">{gstRate}%</td>
                          <td className="py-2 text-right">{formatCurrency(breakdown.taxable)}</td>
                          <td className="py-2 text-right">{formatCurrency(breakdown.cgst)}</td>
                          <td className="py-2 text-right">{formatCurrency(breakdown.sgst)}</td>
                          <td className="py-2 text-right">{formatCurrency(breakdown.igst)}</td>
                          <td className="py-2 text-right font-medium">
                            {formatCurrency((breakdown.cgst || 0) + (breakdown.sgst || 0) + (breakdown.igst || 0))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoice Metadata */}
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>Update information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Created:</span>
                <span className="ml-2">{formatDate(invoice.createdAt)}</span>
              </div>
              <div>
                <span className="text-gray-600">Last Updated:</span>
                <span className="ml-2">{formatDate(invoice.updatedAt)}</span>
              </div>
            
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ViewInvoicePage;