"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, Save, ArrowLeft, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import AddItemComponent from '@/components/items/AddItemComponent';
import { PurchaseVoucherAPI } from '@/server/features/purchase/infrastructure/apihelpers/purchaseVoucher/purchaseVoucherApi';
import { toast } from 'react-toastify';
import { ILineItemSummary } from '@/server/features/items/core/entities/selecteditem';
import { GSTBreakdownInterface, PurchaseVoucherInterface, PurchaseVoucherItemInterface, PurchaseVoucherSummaryInterface } from '@/server/features/purchase/core/entities/PurchaseVoucher';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { 
  fetchLedgerAccountsAsync, 
  selectAllLedgerAccounts, 
  selectLedgerAccountsLoading, 
  selectLedgerAccountsError 
} from '@/store/slices/ledgerAccountSlice';

// Use the correct LineItemSummary from SelectedItem
type LineItemSummary = ILineItemSummary;

interface LineItem {
  id: string;
  productId: string;
  productName: string;
  hsn: string;
  quantity: number;
  unit: string;
  price: number;
  discount: number;
  taxRate: number;
  amount: number;
}

interface PurchaseVoucherFormData {
  poNumber: string;
  supplierId: string;
  supplierName: string;
  partyInvoiceNo: string;
  partyInvoiceDate: Date | null;
  billingAddress: string;
  gstin: string;
  items: LineItem[];
  summary: LineItemSummary;
  shipmentAmount: number;
  notes: string;
  status: 'draft' | 'approved' | 'rejected';
}

const AddPurchaseVoucherPage: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isFormValid, setIsFormValid] = useState(false);
  
  // New state to store the exported data from AddItemComponent
  const [exportedItemsData, setExportedItemsData] = useState<any>(null);
  
  // Redux state
  const user = useAppSelector((state) => state.user);
  const ledgerAccounts = useAppSelector(selectAllLedgerAccounts);
  const ledgerAccountsLoading = useAppSelector(selectLedgerAccountsLoading);
  const ledgerAccountsError = useAppSelector(selectLedgerAccountsError);
  
  const fpoIdOfUser = user.fpoId;

  const [formData, setFormData] = useState<PurchaseVoucherFormData>({
    poNumber: '',
    supplierId: '',
    supplierName: '',
    partyInvoiceNo: '',
    partyInvoiceDate: null,
    billingAddress: '',
    gstin: '',
    items: [],
    summary: {
      subTotal: 0,
      totalGST: 0,
      grandTotal: 0,
      totalDiscount: 0,
      shipmentAmount: 0,
      roundOff: 0
    },
    shipmentAmount: 0,
    notes: '',
    status: 'draft'
  });

  // Fetch ledger accounts on component mount
  useEffect(() => {
    if (fpoIdOfUser && ledgerAccounts.length === 0) {
      dispatch(fetchLedgerAccountsAsync());
    }
  }, [dispatch, fpoIdOfUser, ledgerAccounts.length]);

  // Mock data for PO dropdown - replace with actual API calls
  const mockPOs = [
    { id: '1', number: 'PO-2024-001', date: '2024-01-15' },
    { id: '2', number: 'PO-2024-002', date: '2024-01-20' },
    { id: '3', number: 'PO-2024-003', date: '2024-01-25' }
  ];

  const handleInputChange = (field: keyof PurchaseVoucherFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSupplierChange = (supplierId: string) => {
    const supplier = ledgerAccounts.find(account => account.id === supplierId);
    if (supplier) {
      setFormData(prev => ({
        ...prev,
        supplierId,
        supplierName: supplier.name,
        gstin: supplier.gstNumber || '',
        billingAddress: supplier.address || ''
      }));
      
      // Show info toast when supplier is selected
      toast.info(`Supplier "${supplier.name}" selected successfully`, {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  const handleSummaryChange = useCallback((summary: LineItemSummary) => {
    setFormData(prev => ({
      ...prev,
      summary: {
        ...summary,
        shipmentAmount: prev.shipmentAmount // Preserve existing shipment amount
      }
    }));
  }, []);

  const handleValidationChange = useCallback((isValid: boolean, validationErrors: string[]) => {
    setIsFormValid(isValid);
    setErrors(validationErrors);
  }, []);

  // Modified handleExportData to save data to useState
  const handleExportData = useCallback(async (itemsData: any) => {
    // Save the exported data to state
    setExportedItemsData(itemsData);
    
    // Show success toast to indicate data has been captured
    toast.success('Item data captured successfully!', {
      position: "top-right",
      autoClose: 2000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }, []);

  // Function to prepare and save data to API
  const saveToAPI = async (status: 'draft' | 'approved') => {
    const toastId = toast.loading(`Saving purchase voucher as ${status}...`, {
      position: "top-right",
    });

    try {
      setLoading(true);
      
      // Validate form
      if (!formData.supplierId || !formData.partyInvoiceNo) {
        toast.update(toastId, {
          render: 'Please fill in all required fields',
          type: 'error',
          isLoading: false,
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        return;
      }
      
      if (!fpoIdOfUser) {
        toast.update(toastId, {
          render: 'Something went wrong. Please try refreshing the page.',
          type: 'error',
          isLoading: false,
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        return;
      }
      
      // Validate required date field
      if (!formData.partyInvoiceDate) {
        toast.update(toastId, {
          render: 'Party Invoice Date is required',
          type: 'error',
          isLoading: false,
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        return;
      }

      if (!isFormValid) {
        toast.update(toastId, {
          render: 'Please fix item validation errors before saving',
          type: 'error',
          isLoading: false,
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        return;
      }

      // Check if we have exported items data
      if (!exportedItemsData || !exportedItemsData.items || exportedItemsData.items.length === 0) {
        toast.update(toastId, {
          render: 'Please add items before saving',
          type: 'error',
          isLoading: false,
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        return;
      }

      // Use the exported data from AddItemComponent
      const itemsToProcess = exportedItemsData.items;

      // Convert items from AddItemComponent format to PurchaseVoucherItemInterface format
      const convertedItems: PurchaseVoucherItemInterface[] = itemsToProcess.map((item: any, index: number) => {
        // Handle the structure from AddItemComponent export
        const itemData = item.item || item; // item.item exists in exported data
        const calculations = item.calculations || {};
        const discount = item.discount || { value: 0, type: 'fixed' };
        const gstConfig = item.gstConfig || { rate: 0, type: 'including' };
        console.log(itemData)
        
        return {
          id: item.id || `item-${index}`,
          item: {
            id: itemData.id || '',
            name: itemData.name || '',
            type: itemData.type || 'product',
            category: {
              id: itemData.category?.id || '',
              name: itemData.category?.name || '',
              description: itemData.category?.description || ''
            },
            hsn_sac: itemData.hsn_sac || '',
            salePrice: itemData.salePrice || item.unitPrice || 0,
            salePriceInclusive: itemData.salePriceInclusive || true,
            gstTaxPercent: itemData.gstTaxPercent || gstConfig.rate || 0,
            purchasePrice: itemData.purchasePrice || 0,
            purchasePriceInclusive: itemData.purchasePriceInclusive || false,
            unit: {
              code: itemData.unit?.code || 'PCS',
              label: itemData.unit?.label || 'Pieces'
            },
            openingQuantity: itemData.openingQuantity || 0,
            openingStockDate: itemData.openingStockDate || null,
            mfgDate: itemData.mfgDate || null,
            expDate: itemData.expDate || null,
            currentStock: itemData.currentStock || 0,
            lastStockUpdate: itemData.lastStockUpdate || null,
            barcode: itemData.barcode || '',
            lowStockAlert: itemData.lowStockAlert || 0
          },
          quantity: item.quantity || 0,
          unitPrice: item.unitPrice || 0,
          discount: {
            value: discount.value || 0,
            type: discount.type || 'fixed'
          },
          gstConfig: {
            rate: gstConfig.rate || 0,
            type: gstConfig.type || 'including'
          },
          lineNumber: item.lineNumber || index + 1,
          calculations: {
            baseAmount: calculations.baseAmount || ((item.quantity || 0) * (item.unitPrice || 0)),
            discountAmount: calculations.discountAmount || 0,
            taxableAmount: calculations.taxableAmount || 0,
            gstAmount: calculations.gstAmount || 0,
            lineTotal: calculations.lineTotal || 0
          },
          purchasePrice: item.purchasePrice || itemData.purchasePrice || 0
        };
      });

      // Calculate GST breakdown using the exported data structure
      const gstBreakdown: GSTBreakdownInterface = {};
      
      // Use the gstBreakdown from exported data
      if (exportedItemsData.gstBreakdown) {
        Object.keys(exportedItemsData.gstBreakdown).forEach(rate => {
          gstBreakdown[rate] = {
            taxable: exportedItemsData.gstBreakdown[rate].taxable,
            gst: exportedItemsData.gstBreakdown[rate].gst
          };
        });
      } else {
        // Fallback: calculate from converted items
        convertedItems.forEach(item => {
          const rate = item.gstConfig.rate.toString();
          if (!gstBreakdown[rate]) {
            gstBreakdown[rate] = { taxable: 0, gst: 0 };
          }
          gstBreakdown[rate].taxable += item.calculations.taxableAmount;
          gstBreakdown[rate].gst += item.calculations.gstAmount;
        });
      }

      // Create summary using the exported data structure
      const voucherSummary: PurchaseVoucherSummaryInterface = {
        subTotal: exportedItemsData.summary?.subTotal || formData.summary.subTotal,
        totalDiscount: exportedItemsData.summary?.totalDiscount || formData.summary.totalDiscount,
        totalGST: exportedItemsData.summary?.totalGST || formData.summary.totalGST,
        shipmentAmount: exportedItemsData.summary?.shipmentAmount || formData.shipmentAmount,
        roundOff: exportedItemsData.summary?.roundOff || formData.summary.roundOff,
        grandTotal: exportedItemsData.summary?.grandTotal || (formData.summary.grandTotal + formData.shipmentAmount)
      };

      // Prepare data for API - match PurchaseVoucherInterface structure 
      const voucherData: PurchaseVoucherInterface = {
        poNumber: formData.poNumber,
        supplierVendorName: formData.supplierName,
        supplierVendorId: formData.supplierId,
        partyInvoiceNumber: formData.partyInvoiceNo,
        partyInvoiceDate: formData.partyInvoiceDate,
        supplierVendorBillingAddress: formData.billingAddress,
        gstin: formData.gstin,
        items: convertedItems,
        summary: voucherSummary,
        gstBreakdown: gstBreakdown,
        documentType: exportedItemsData.documentType || 'purchase_voucher',
        fpoId: fpoIdOfUser,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: status,
        notes: formData.notes
      };

      const response = await PurchaseVoucherAPI.create(voucherData);
      
      // Update the loading toast to success
      toast.update(toastId, {
        render: `Purchase voucher ${status === 'draft' ? 'saved as draft' : 'submitted for approval'} successfully!`,
        type: 'success',
        isLoading: false,
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      // Show additional success info
      toast.success(`Total amount: ₹${voucherSummary.grandTotal.toFixed(2)}`, {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      // Optional: Redirect after a short delay
      setTimeout(() => {
        router.push('/Purchases/PurchaseVoucher');
      }, 1500);
      
    } catch (error) {
      console.error('Error creating purchase voucher:', error);
      
      // Update the loading toast to error
      toast.update(toastId, {
        render: 'Failed to create purchase voucher. Please try again.',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsDraft = async () => {
    // Show info toast about draft status
    toast.info('Preparing to save as draft...', {
      position: "top-right",
      autoClose: 2000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
    
    await saveToAPI('draft');
  };

  const handleSubmitForApproval = async () => {
    // Show info toast about approval submission
    toast.info('Preparing to submit for approval...', {
      position: "top-right",
      autoClose: 2000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
    
    await saveToAPI('approved');
  };

  const calculateFinalTotal = () => {
    return formData.summary.grandTotal + formData.shipmentAmount;
  };

  // Show warning toast when ledger accounts fail to load
  useEffect(() => {
    if (ledgerAccountsError) {
      toast.warn(`Failed to load ledger accounts: ${ledgerAccountsError}`, {
        position: "top-right",
        autoClose: 7000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  }, [ledgerAccountsError]);

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add Purchase Voucher</h1>
              <p className="text-sm text-gray-600">Create a new purchase voucher for your FPO</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-blue-600 border-blue-200">
              {user.fpoName?.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Validation Errors */}
        {errors.length > 0 && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="font-medium mb-1">Please fix the following errors:</div>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Ledger Accounts Loading/Error */}
        {ledgerAccountsError && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Failed to load ledger accounts: {ledgerAccountsError}
            </AlertDescription>
          </Alert>
        )}

        {/* Updated Layout Structure */}
        <div className="space-y-6">
          {/* Two-column layout for basic info and summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Basic Information - Takes 2/3 width */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="poNumber">
                        PO Number
                        {/* <span className="text-red-500">*</span> */}
                      </Label>
                      <Select value={formData.poNumber} onValueChange={(value) => handleInputChange('poNumber', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select PO" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockPOs.map(po => (
                            <SelectItem key={po.id} value={po.number}>
                              {po.number} - {po.date}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="supplier">
                        Supplier/Vendor <span className="text-red-500">*</span>
                      </Label>
                      <Select 
                        value={formData.supplierId} 
                        onValueChange={handleSupplierChange}
                        disabled={ledgerAccountsLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={
                            ledgerAccountsLoading ? "Loading accounts..." : "Select Supplier"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {ledgerAccountsLoading ? (
                            <SelectItem value="loading" disabled>
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading accounts...
                              </div>
                            </SelectItem>
                          ) : ledgerAccounts.length === 0 ? (
                            <SelectItem value="no-accounts" disabled>
                              No ledger accounts found
                            </SelectItem>
                          ) : (
                            ledgerAccounts.map(account => (
                              <SelectItem key={account.id} value={account.id || ''}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{account.name}</span>
                                  <span className="text-xs text-gray-500">{account.groupName}</span>
                                  {account.gstNumber && (
                                    <span className="text-xs text-gray-400">GST: {account.gstNumber}</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="partyInvoiceNo">
                        Party Invoice No <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="partyInvoiceNo"
                        value={formData.partyInvoiceNo}
                        onChange={(e) => handleInputChange('partyInvoiceNo', e.target.value)}
                        placeholder="Enter invoice number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="partyInvoiceDate">
                        Party Invoice Date <span className="text-red-500">*</span>
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.partyInvoiceDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.partyInvoiceDate ? (
                              format(formData.partyInvoiceDate, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.partyInvoiceDate || undefined}
                            onSelect={(date) => handleInputChange('partyInvoiceDate', date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="billingAddress">Supplier/Vendor Billing Address</Label>
                    <Textarea
                      id="billingAddress"
                      value={formData.billingAddress}
                      onChange={(e) => handleInputChange('billingAddress', e.target.value)}
                      placeholder="Enter billing address"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gstin">GSTIN</Label>
                    <Input
                      id="gstin"
                      value={formData.gstin}
                      onChange={(e) => handleInputChange('gstin', e.target.value)}
                      placeholder="Enter GSTIN"
                    />
                  </div>
                </CardContent>
              </Card>

                 {/* Full Width Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Enter any additional notes..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
            </div>

            {/* Summary Sidebar - Takes 1/3 width */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">₹{formData.summary.subTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Discount:</span>
                      <span className="font-medium text-green-600">-₹{formData.summary.totalDiscount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total GST:</span>
                      <span className="font-medium">₹{formData.summary.totalGST.toFixed(2)}</span>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="shipmentAmount">Shipment Amount</Label>
                      <Input
                        id="shipmentAmount"
                        type="number"
                        value={formData.shipmentAmount}
                        onChange={(e) => handleInputChange('shipmentAmount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>

                    <Separator />

                    <div className="flex justify-between font-semibold text-lg">
                      <span>Grand Total:</span>
                      <span className="text-blue-600">₹{calculateFinalTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4">
                    <Badge variant="outline" className="w-full justify-center py-2">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      {formData.items.length} Items Added
                    </Badge>
                    <Badge variant="outline" className="w-full justify-center py-2">
                      Total Items: {formData.items.reduce((sum, item) => sum + item.quantity, 0)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={handleSaveAsDraft}
                    variant="outline"
                    className="w-full"
                    disabled={loading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save as Draft
                  </Button>
                  <Button
                    onClick={handleSubmitForApproval}
                    className="w-full"
                    disabled={loading || !isFormValid}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : 'Save & Submit'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Full Width Items Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AddItemComponent
                documentType="purchase_voucher"
                onSummaryChange={handleSummaryChange}
              
                onValidationChange={handleValidationChange}
                onExportData={handleExportData}
                readOnly={false}
                showSummary={false}
              />
            </CardContent>
          </Card>

       
        </div>
      </div>
    </div>
  );
};

export default AddPurchaseVoucherPage;