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
import { CalendarIcon, Save, ArrowLeft, AlertCircle, CheckCircle, Loader2, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import AddItemComponent from '@/components/items/AddItemComponent';
import { PurchaseVoucherAPI } from '@/server/features/purchase/infrastructure/apihelpers/purchaseVoucher/purchaseVoucherApi';
import { toast } from 'react-toastify';
import { ILineItemSummary } from '@/server/features/items/core/entities/selecteditem';
import { PurchaseVoucherInterface, PurchaseVoucherItemInterface, PurchaseVoucherSummaryInterface } from '@/server/features/purchase/core/entities/PurchaseVoucher';
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

// Enhanced form data interface with voucherNumber
interface PurchaseVoucherFormData {
  voucherNumber: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  supplierState: string;
  partyInvoiceNo: string;
  partyInvoiceDate: Date | null;
  billingAddress: string;
  gstin: string;
  items: LineItem[];
  summary: LineItemSummary;
  notes: string;
  status: 'draft' | 'approved' | 'rejected';
}

const AddPurchaseVoucherPage: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [voucherNumberLoading, setVoucherNumberLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [isFormValid, setIsFormValid] = useState(false);

  const [hasExportedData, setHasExportedData] = useState(false);
  // New state to store the exported data from AddItemComponent
  const [exportedItemsData, setExportedItemsData] = useState<any>(null);

  // Redux state
  const user = useAppSelector((state) => state.user);
  const ledgerAccounts = useAppSelector(selectAllLedgerAccounts);
  const ledgerAccountsLoading = useAppSelector(selectLedgerAccountsLoading);
  const ledgerAccountsError = useAppSelector(selectLedgerAccountsError);

  const fpoIdOfUser = user.fpoId;

  // Enhanced initial form data with voucherNumber
  const [formData, setFormData] = useState<PurchaseVoucherFormData>({
    voucherNumber: '',
    poNumber: '',
    supplierId: '',
    supplierName: '',
    supplierState: '',
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
        supplierState: supplier.state || '',
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

  // Enhanced previewDocumentNumber function
  const previewDocumentNumber = async () => {
    try {
      setVoucherNumberLoading(true);
      
      const response = await fetch('/api/document-number/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fpoId: fpoIdOfUser,
          documentType: 'purchase_voucher',
        }),
      });

      if (!response.ok) {
        console.error('Failed to fetch next voucher number', response);
        toast.warn('Failed to generate voucher number. Please refresh the page.', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        return;
      }

      const result = await response.json();
      const documentNumber = result.data;
      
      console.log("The new purchase voucher number from the fetch api is", documentNumber);
      
      // Update form data with the voucher number
      setFormData(prev => ({
        ...prev,
        voucherNumber: documentNumber
      }));

      // // Show success toast
      // toast.success(`Voucher number generated: ${documentNumber}`, {
      //   position: "top-right",
      //   autoClose: 3000,
      //   hideProgressBar: false,
      //   closeOnClick: true,
      //   pauseOnHover: true,
      //   draggable: true,
      // });

    } catch (error) {
      console.error('Error fetching voucher number:', error);
      toast.error('Error generating voucher number. Please refresh the page.', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setVoucherNumberLoading(false);
    }
  };

  const handleSummaryChange = useCallback((summary: LineItemSummary) => {
    setFormData(prev => ({
      ...prev,
      summary: summary
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

    // Set the flag to enable action buttons
    setHasExportedData(true);
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

      // Validate voucher number
      if (!formData.voucherNumber) {
        toast.update(toastId, {
          render: 'Voucher number is missing. Please refresh the page.',
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

      if (!formData.supplierState) {
        toast.update(toastId, {
          render: 'Please select a supplier with valid state information',
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
        const itemData = item.item || item;
        const calculations = item.calculations || {};
        const discount = item.discount || { value: 0, type: 'fixed' };
        const gstConfig = item.gstConfig || { rate: 0, type: 'including' };

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
            cgstAmount: calculations.cgstAmount || 0,
            sgstAmount: calculations.sgstAmount || 0,
            igstAmount: calculations.igstAmount || 0,
            totalGstAmount: calculations.totalGstAmount || 0,
            lineTotal: calculations.lineTotal || 0
          },
          purchasePrice: item.purchasePrice || itemData.purchasePrice || 0
        };
      });

      // Create simplified summary for API - let backend handle GST breakdown
      const voucherSummary: PurchaseVoucherSummaryInterface = {
        subTotal: exportedItemsData.summary?.subTotal || formData.summary.subTotal,
        totalDiscount: exportedItemsData.summary?.totalDiscount || formData.summary.totalDiscount,
        totalCGST: 0, // Backend will calculate
        totalSGST: 0, // Backend will calculate
        totalIGST: 0, // Backend will calculate
        totalGST: exportedItemsData.summary?.totalGST || formData.summary.totalGST,
        shipmentAmount: exportedItemsData.summary?.shipmentAmount || formData.summary.shipmentAmount,
        roundOff: exportedItemsData.summary?.roundOff || formData.summary.roundOff,
        grandTotal: exportedItemsData.summary?.grandTotal || formData.summary.grandTotal,
        gstType: 'intrastate' // Backend will determine correct type
      };

      // Enhanced data for API - include voucherNumber
      const voucherData: PurchaseVoucherInterface = {
        voucherNumber: formData.voucherNumber, // Add voucher number
        poNumber: formData.poNumber,
        supplierVendorName: formData.supplierName,
        supplierVendorId: formData.supplierId,
        supplierState: formData.supplierState,
        partyInvoiceNumber: formData.partyInvoiceNo,
        partyInvoiceDate: formData.partyInvoiceDate,
        supplierVendorBillingAddress: formData.billingAddress,
        gstin: formData.gstin,
        items: convertedItems,
        summary: voucherSummary,
        gstBreakdown: {}, // Backend will calculate
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
        render: `Purchase voucher ${formData.voucherNumber} ${status === 'draft' ? 'saved as draft' : 'submitted for approval'} successfully!`,
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
    // toast.info('Preparing to submit for approval...', {
    //   position: "top-right",
    //   autoClose: 2000,
    //   hideProgressBar: false,
    //   closeOnClick: true,
    //   pauseOnHover: true,
    //   draggable: true,
    // });

    await saveToAPI('approved');
  };

  // Fetch voucher number on component mount
  useEffect(() => {
    if (fpoIdOfUser) {
      previewDocumentNumber();
    }
  }, [fpoIdOfUser]);

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
            {/* Voucher Number Badge */}
            {formData.voucherNumber && (
              <Badge variant="default" className="text-white bg-green-600">
                <Hash className="h-3 w-3 mr-1" />
                {formData.voucherNumber}
              </Badge>
            )}
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

        {/* Voucher Number Loading Alert */}
        {voucherNumberLoading && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
            <AlertDescription className="text-blue-800">
              Generating voucher number...
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

        {/* Layout Structure */}
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Voucher Number Field */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="voucherNumber" className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Voucher Number
                  </Label>
                  <div className="relative">
                    <Input
                      id="voucherNumber"
                      value={formData.voucherNumber}
                      placeholder={voucherNumberLoading ? "Generating..." : "Voucher number will appear here"}
                      readOnly
                      className="bg-gray-50 cursor-not-allowed font-mono font-medium"
                    />
                    {voucherNumberLoading && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Auto-generated voucher number for this purchase voucher
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="poNumber">PO Number</Label>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div className="space-y-2">
                  <Label htmlFor="supplierState">
                    Supplier State <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="supplierState"
                    value={formData.supplierState}
                    placeholder="State will be auto-filled from supplier selection"
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500">
                    State is automatically set based on supplier selection
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
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

          {/* Items Section with AddItemComponent */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Items & Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AddItemComponent
                documentType="purchase_voucher"
                onSummaryChange={handleSummaryChange}
                onValidationChange={handleValidationChange}
                onExportData={handleExportData}
                readOnly={false}
                showSummary={true}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button
                onClick={handleSaveAsDraft}
                variant="outline"
                className="flex-1"
                disabled={loading || !isFormValid || !hasExportedData || voucherNumberLoading}
              >
                <Save className="h-4 w-4 mr-2" />
                Save as Draft
              </Button>
              <Button
                onClick={handleSubmitForApproval}
                className="flex-1"
                disabled={loading || !isFormValid || !hasExportedData || voucherNumberLoading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save & Submit'}
              </Button>
            </CardContent>
            {(!hasExportedData || voucherNumberLoading) && (
              <div className="px-6 py-4 bg-purple-50">
                <p className="text-sm text-purple-800 text-center">
                  {voucherNumberLoading ? 
                    "🔄 Generating voucher number..." : 
                    "➕ Please add items and click save to proceed"
                  }
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AddPurchaseVoucherPage;