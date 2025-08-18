"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, Save, ArrowLeft, AlertCircle, CheckCircle, Loader2, Edit, Trash2, Copy, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import AddItemComponent from '@/components/items/AddItemComponent';
import { PurchaseVoucherAPI } from '@/server/features/purchase/infrastructure/apihelpers/purchaseVoucher/purchaseVoucherApi';
import { toast } from 'react-toastify';
import {
  GSTBreakdownInterface,
  PurchaseVoucherInterface,
  PurchaseVoucherItemInterface,
  PurchaseVoucherSummaryInterface,
  ItemInterface,
  DiscountInterface,
  GSTConfigInterface,
  LineCalculationsInterface
} from '@/server/features/purchase/core/entities/PurchaseVoucher';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  fetchLedgerAccountsAsync,
  selectAllLedgerAccounts,
  selectLedgerAccountsLoading,
  selectLedgerAccountsError
} from '@/store/slices/ledgerAccountSlice';
import { SelectedItem, ILineItemSummary } from '@/server/features/items/core/entities/selecteditem';

// Interfaces
interface EditPurchaseVoucherPageProps {
  params: Promise<{ id: string }>;
}

interface PurchaseVoucherFormData {
  voucherNumber?: string; // Added voucher number - readonly field
  poNumber: string;
  supplierId: string;
  supplierName: string;
  supplierState: string;
  partyInvoiceNo: string;
  partyInvoiceDate: Date | null;
  billingAddress: string;
  gstin: string;
  items: SelectedItem[];
  summary: ILineItemSummary;
  notes: string;
  status: 'draft' | 'approved' | 'rejected';
}

// Mock data for PO numbers
const mockPOs = [
  { id: '1', number: 'PO-2024-001', date: '2024-01-15' },
  { id: '2', number: 'PO-2024-002', date: '2024-01-20' },
  { id: '3', number: 'PO-2024-003', date: '2024-01-25' }
];

const EditPurchaseVoucherPage: React.FC<EditPurchaseVoucherPageProps> = ({ params }) => {
  const router = useRouter();
  const { id } = React.use(params);

  // Redux state
  const user = useAppSelector((state) => state.user);
  const ledgerAccounts = useAppSelector(selectAllLedgerAccounts);
  const ledgerAccountsLoading = useAppSelector(selectLedgerAccountsLoading);
  const ledgerAccountsError = useAppSelector(selectLedgerAccountsError);
  const dispatch = useAppDispatch();
  const fpoIdOfUser = user.fpoId;

  // Component state
  const [isLoading, setIsLoading] = useState(true);
  const [originalData, setOriginalData] = useState<PurchaseVoucherInterface | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isFormValid, setIsFormValid] = useState(false);
  const [gstBreakdown, setGstBreakdown] = useState<GSTBreakdownInterface>({});
  const [addItemComponentKey, setAddItemComponentKey] = useState(0);
  
  // State for managing items and calculations - similar to invoice approach
  const [currentItems, setCurrentItems] = useState<SelectedItem[]>([]);
  const [exportedData, setExportedData] = useState<any>(null);
  const [itemsDataReady, setItemsDataReady] = useState(false);

  // Form data initialization
  const [formData, setFormData] = useState<PurchaseVoucherFormData>({
    voucherNumber: '', // Added voucher number field
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
      totalDiscount: 0,
      totalGST: 0,
      shipmentAmount: 0,
      roundOff: 0,
      grandTotal: 0,
      itemCount: 0
    },
    notes: '',
    status: 'draft'
  });

  // Critical null checks for fpoId
  useEffect(() => {
    if (!fpoIdOfUser) {
      toast.error('FPO ID not found. Please login again.', {
        position: "top-right",
        autoClose: 5000,
      });
      router.push('/Login');
      return;
    }
  }, [fpoIdOfUser, router]);

  // Fetch ledger accounts on component mount
  useEffect(() => {
    if (fpoIdOfUser && ledgerAccounts.length === 0) {
      dispatch(fetchLedgerAccountsAsync());
    }
  }, [dispatch, fpoIdOfUser, ledgerAccounts.length]);

  // Handle ledger account errors
  useEffect(() => {
    if (ledgerAccountsError) {
      toast.warn(`Failed to load ledger accounts: ${ledgerAccountsError}`, {
        position: "top-right",
        autoClose: 7000,
      });
    }
  }, [ledgerAccountsError]);

// Convert PurchaseVoucherItem to SelectedItem for AddItemComponent
const convertToSelectedItems = useCallback((purchaseItems: PurchaseVoucherItemInterface[]): SelectedItem[] => {
  return purchaseItems.map((pvItem, index) => ({
    id: pvItem.id,
    item: pvItem.item, // Just use the item directly - it already has the correct structure
    quantity: pvItem.quantity,
    unitPrice: pvItem.unitPrice,
    discount: pvItem.discount || { value: 0, type: 'fixed' },
    gstConfig: pvItem.gstConfig || { rate: pvItem.item.gstTaxPercent || 0, type: 'excluding' },
    lineNumber: pvItem.lineNumber || index + 1
  })) as SelectedItem[];
}, []);

// Convert SelectedItem to PurchaseVoucherItem for API
const convertToPurchaseVoucherItems = useCallback((selectedItems: SelectedItem[]): PurchaseVoucherItemInterface[] => {
  return selectedItems.map((selectedItem, index) => {
    // Calculate line totals (these will be recalculated on backend)
    const baseAmount = selectedItem.quantity * selectedItem.unitPrice;
    const discountAmount = selectedItem.discount.type === 'percent' 
      ? (baseAmount * selectedItem.discount.value / 100)
      : selectedItem.discount.value;
    const taxableAmount = baseAmount - discountAmount;
    
    // Basic GST calculation (backend will handle the proper CGST/SGST/IGST split)
    const gstAmount = selectedItem.gstConfig.type === 'including'
      ? (taxableAmount * selectedItem.gstConfig.rate / (100 + selectedItem.gstConfig.rate))
      : (taxableAmount * selectedItem.gstConfig.rate / 100);
    
    const calculations: LineCalculationsInterface = {
      baseAmount,
      discountAmount,
      taxableAmount,
      cgstAmount: 0, // Backend will calculate
      sgstAmount: 0, // Backend will calculate
      igstAmount: 0, // Backend will calculate
      totalGstAmount: gstAmount,
      lineTotal: taxableAmount + gstAmount
    };

    return {
      id: selectedItem.id || `item-${index + 1}`,
      item: selectedItem.item, // Just use the item directly - no conversion needed
      quantity: selectedItem.quantity,
      unitPrice: selectedItem.unitPrice,
      discount: selectedItem.discount,
      gstConfig: selectedItem.gstConfig,
      lineNumber: selectedItem.lineNumber || index + 1,
      calculations
    };
  });
}, []);

  // Load voucher data
  useEffect(() => {
    const loadVoucherData = async () => {
      try {
        setIsLoading(true);
        const voucherDataApi = await PurchaseVoucherAPI.getById(id);
        const voucherData = voucherDataApi.data;
        console.log(voucherData)
        setOriginalData(voucherData);

        // Convert items to SelectedItem format for AddItemComponent
        const convertedItems = convertToSelectedItems(voucherData.items || []);

        // Convert summary to ILineItemSummary format (only with properties that exist)
        const convertedSummary: ILineItemSummary = {
          subTotal: voucherData.summary?.subTotal || 0,
          totalDiscount: voucherData.summary?.totalDiscount || 0,
          totalGST: voucherData.summary?.totalGST || 0,
          shipmentAmount: voucherData.summary?.shipmentAmount || 0,
          roundOff: voucherData.summary?.roundOff || 0,
          grandTotal: voucherData.summary?.grandTotal || 0,
          itemCount: convertedItems.length
        };

        // Set form data - including voucher number
        setFormData({
          voucherNumber: voucherData.voucherNumber || '', // Set voucher number from API response
          poNumber: voucherData.poNumber || '',
          supplierId: voucherData.supplierVendorId || '',
          supplierName: voucherData.supplierVendorName || '',
          supplierState: voucherData.supplierState || '',
          partyInvoiceNo: voucherData.partyInvoiceNumber || '',
          partyInvoiceDate: voucherData.partyInvoiceDate ? new Date(voucherData.partyInvoiceDate) : null,
          billingAddress: voucherData.supplierVendorBillingAddress || '',
          gstin: voucherData.gstin || '',
          items: convertedItems,
          summary: convertedSummary,
          notes: voucherData.notes || '',
          status: voucherData.status || 'draft'
        });

        setGstBreakdown(voucherData.gstBreakdown || {});
        
        // Set current items and exported data similar to invoice approach
        setCurrentItems(convertedItems);
        
        const summaryData = {
          subTotal: voucherData.summary?.subTotal || 0,
          totalDiscount: voucherData.summary?.totalDiscount || 0,
          totalGST: voucherData.summary?.totalGST || 0,
          shipmentAmount: voucherData.summary?.shipmentAmount || 0,
          roundOff: voucherData.summary?.roundOff || 0,
          grandTotal: voucherData.summary?.grandTotal || 0,
          gstType: voucherData.summary?.gstType || 'intrastate'
        };

        setExportedData({
          items: convertedItems,
          summary: summaryData,
          gstBreakdown: voucherData.gstBreakdown || {}
        });
        
        setItemsDataReady(true);
        
        // Force re-render of AddItemComponent with new data
        setAddItemComponentKey(prev => prev + 1);

      } catch (error) {
        console.error('Error loading voucher:', error);
        toast.error('Failed to load purchase voucher. Please try again.', {
          position: "top-right",
          autoClose: 5000,
        });
        router.push('/Purchases/PurchaseVoucher');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      loadVoucherData();
    }
  }, [id, router, convertToSelectedItems]);

  // Handle supplier change with state lookup
  const handleSupplierChange = useCallback((supplierId: string) => {
    const supplier = ledgerAccounts.find(account => account.id === supplierId);
    if (supplier) {
      setFormData(prev => ({
        ...prev,
        supplierId,
        supplierName: supplier.name,
        gstin: supplier.gstNumber || '',
        billingAddress: supplier.address || '',
        supplierState: supplier.state || ''
      }));

      setHasChanges(true);

      toast.info(`Supplier "${supplier.name}" selected successfully`, {
        position: "top-right",
        autoClose: 2000,
      });
    }
  }, [ledgerAccounts]);

  // Handle input changes
  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  }, []);

  // Handle summary change from AddItemComponent
  const handleSummaryChange = useCallback((summary: ILineItemSummary) => {
    setFormData(prev => ({
      ...prev,
      summary: summary
    }));
    setHasChanges(true);
  }, []);

  // Handle validation change
  const handleValidationChange = useCallback((isValid: boolean, validationErrors: string[]) => {
    setIsFormValid(isValid);
    setErrors(validationErrors);
  }, []);

  // Handle items change from AddItemComponent - similar to invoice approach
  const handleItemsChange = useCallback((items: SelectedItem[]) => {
    console.log('Items changed:', items);
    setCurrentItems(items);
    setFormData(prev => ({
      ...prev,
      items: items
    }));
    setItemsDataReady(false); // Disable buttons when items change
    setHasChanges(true);
  }, []);

  // Handle export data from AddItemComponent - similar to invoice approach
  const handleExportData = useCallback((data: any) => {
    console.log('Export data received:', data);
    setExportedData(data);
    if (data.gstBreakdown) {
      setGstBreakdown(data.gstBreakdown);
    }
    setItemsDataReady(true); // Enable buttons when data is exported
    setHasChanges(true);
  }, []);

  // Save to API
  const saveToAPI = async (status: 'draft' | 'approved') => {
    const toastId = toast.loading(`Updating purchase voucher as ${status}...`, {
      position: "top-right",
    });

    try {
      setLoading(true);

      if (!fpoIdOfUser) {
        toast.update(toastId, {
          render: 'FPO ID not found. Please login again.',
          type: 'error',
          isLoading: false,
          autoClose: 5000,
        });
        return;
      }

      if (!itemsDataReady || !exportedData || !exportedData.items || exportedData.items.length === 0) {
        toast.update(toastId, {
          render: 'Please add items and save them using the "Save Items" button in the items section.',
          type: 'error',
          isLoading: false,
          autoClose: 5000,
        });
        return;
      }

      // Convert SelectedItems to PurchaseVoucherItems
      const convertedItems = convertToPurchaseVoucherItems(exportedData.items);

      // Convert summary back to PurchaseVoucherSummary format (backend will recalculate)
      const convertedSummary: PurchaseVoucherSummaryInterface = {
        subTotal: exportedData.summary.subTotal || 0,
        totalDiscount: exportedData.summary.totalDiscount || 0,
        totalCGST: 0, // Backend will calculate
        totalSGST: 0, // Backend will calculate
        totalIGST: 0, // Backend will calculate
        totalGST: exportedData.summary.totalGST || 0,
        shipmentAmount: exportedData.summary.shipmentAmount || 0,
        roundOff: exportedData.summary.roundOff || 0,
        grandTotal: exportedData.summary.grandTotal || 0,
        gstType: exportedData.summary.gstType || 'intrastate'
      };

      const voucherData: PurchaseVoucherInterface = {
        id: originalData?.id,
        // Note: voucherNumber is not included as it's read-only and shouldn't be sent to API
        poNumber: formData.poNumber,
        supplierVendorName: formData.supplierName,
        supplierVendorId: formData.supplierId,
        supplierState: formData.supplierState,
        partyInvoiceNumber: formData.partyInvoiceNo,
        partyInvoiceDate: formData.partyInvoiceDate || new Date(),
        supplierVendorBillingAddress: formData.billingAddress,
        gstin: formData.gstin,
        items: convertedItems,
        summary: convertedSummary,
        gstBreakdown: exportedData.gstBreakdown || gstBreakdown,
        documentType: 'purchase_voucher',
        fpoId: fpoIdOfUser,
        createdAt: originalData?.createdAt ? new Date(originalData.createdAt) : new Date(),
        updatedAt: new Date(),
        status: status,
        notes: formData.notes
      };

      await PurchaseVoucherAPI.update(voucherData);

      toast.update(toastId, {
        render: `Purchase voucher updated successfully!`,
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      });

      setHasChanges(false);

      setTimeout(() => {
        router.push('/Purchases/PurchaseVoucher');
      }, 1500);

    } catch (error) {
      console.error('Error updating purchase voucher:', error);
      toast.update(toastId, {
        render: 'Failed to update purchase voucher. Please try again.',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this purchase voucher? This action cannot be undone.')) {
      return;
    }

    const toastId = toast.loading('Deleting purchase voucher...', {
      position: "top-right",
    });

    try {
      setLoading(true);
      await PurchaseVoucherAPI.delete(id);

      toast.update(toastId, {
        render: 'Purchase voucher deleted successfully!',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      });

      setTimeout(() => {
        router.push('/Purchases/PurchaseVoucher');
      }, 1500);

    } catch (error) {
      console.error('Error deleting purchase voucher:', error);
      toast.update(toastId, {
        render: 'Failed to delete purchase voucher. Please try again.',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle save as copy
  const handleSaveAsCopy = () => {
    if (!exportedData || !exportedData.items || exportedData.items.length === 0) {
      toast.error('Please add at least one item before creating a copy.', {
        position: "top-right",
        autoClose: 5000,
      });
      return;
    }

    // Convert SelectedItems to a serializable format - using plain object structure
    const serializedItems = exportedData.items.map((item: SelectedItem) => ({
      id: item.id,
      item: item.item,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      gstConfig: item.gstConfig,
      lineNumber: item.lineNumber
    }));

    // Navigate to add page with pre-filled data
    const queryParams = new URLSearchParams({
      copy: 'true',
      supplierId: formData.supplierId,
      supplierName: formData.supplierName,
      supplierState: formData.supplierState,
      gstin: formData.gstin,
      billingAddress: formData.billingAddress,
      notes: formData.notes,
      items: JSON.stringify(serializedItems)
    });

    router.push(`/Purchases/PurchaseVoucher/AddNewPurchaseVoucher?${queryParams.toString()}`);
  };

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-40 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if save buttons should be disabled
  const isSaveDisabled = loading || !itemsDataReady;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        {/* Left Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2 w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Edit Purchase Voucher
              {/* Display voucher number in header if available */}
              {formData.voucherNumber && (
                <span className="text-lg text-blue-600 ml-2">
                  #{formData.voucherNumber}
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-600">
              Modify purchase voucher details for your FPO
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <Badge variant="outline" className="text-blue-600 border-blue-200 flex items-center">
            <Building2 className="h-3 w-3 mr-1" />
            {user.fpoName?.toUpperCase()}
          </Badge>
          <Badge variant={formData.status === 'approved' ? 'default' : 'secondary'}>
            {formData.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <Alert className="mb-6 border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            You have unsaved changes. Make sure to save before leaving this page.
          </AlertDescription>
        </Alert>
      )}

      {/* Info message when buttons are disabled */}
      {!itemsDataReady && (
        <Alert className="mb-4 border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Note:</strong> Please add items and click the "Save Items" button in the Items section below to enable the voucher update buttons.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Messages */}
      {errors.length > 0 && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Show Voucher Number field only if it exists */}
              {formData.voucherNumber && (
                <div>
                  <Label htmlFor="voucherNumber">Voucher Number</Label>
                  <Input
                    id="voucherNumber"
                    value={formData.voucherNumber}
                    readOnly
                    className="bg-gray-50 font-medium text-blue-900"
                    placeholder="Auto-generated"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-generated voucher number
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="poNumber">Purchase Order Number</Label>
                <Select
                  value={formData.poNumber}
                  onValueChange={(value) => handleInputChange('poNumber', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select PO Number" />
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

              <div>
                <Label htmlFor="supplier">Supplier *</Label>
                <Select
                  value={formData.supplierId}
                  onValueChange={handleSupplierChange}
                  disabled={ledgerAccountsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      ledgerAccountsLoading ? "Loading suppliers..." : "Select Supplier"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {ledgerAccountsLoading ? (
                      <SelectItem value="loading" disabled>
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading suppliers...
                        </div>
                      </SelectItem>
                    ) : ledgerAccounts.length === 0 ? (
                      <SelectItem value="no-suppliers" disabled>
                        No suppliers found
                      </SelectItem>
                    ) : (
                      ledgerAccounts.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id || ''}>
                          <div className="flex flex-col">
                            <span className="font-medium">{supplier.name}</span>
                            <span className="text-xs text-gray-500">{supplier.groupName}</span>
                            {supplier.gstNumber && (
                              <span className="text-xs text-gray-400">GST: {supplier.gstNumber}</span>
                            )}
                            {supplier.state && (
                              <span className="text-xs text-gray-400">State: {supplier.state}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="supplierState">Supplier State</Label>
                <Input
                  id="supplierState"
                  value={formData.supplierState}
                  readOnly
                  className="bg-gray-50"
                  placeholder="Auto-filled from supplier"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Auto-filled from selected supplier
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="partyInvoiceNo">Party Invoice Number *</Label>
                <Input
                  id="partyInvoiceNo"
                  value={formData.partyInvoiceNo}
                  onChange={(e) => handleInputChange('partyInvoiceNo', e.target.value)}
                  placeholder="Enter party invoice number"
                />
              </div>

              <div>
                <Label htmlFor="partyInvoiceDate">Party Invoice Date *</Label>
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
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.partyInvoiceDate || undefined}
                      onSelect={(date) => handleInputChange('partyInvoiceDate', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  value={formData.gstin}
                  onChange={(e) => handleInputChange('gstin', e.target.value)}
                  placeholder="Enter GSTIN"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="billingAddress">Billing Address</Label>
                <Textarea
                  id="billingAddress"
                  value={formData.billingAddress}
                  onChange={(e) => handleInputChange('billingAddress', e.target.value)}
                  placeholder="Enter billing address"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Enter any additional notes"
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Section - Full Width */}
        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
            {!itemsDataReady && (
              <p className="text-sm text-blue-600">
                Add items below and click "Save Items" to enable voucher update buttons.
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="w-full">
              <AddItemComponent
                key={addItemComponentKey}
                documentType="purchase_voucher"
                initialItems={currentItems}
                onSummaryChange={handleSummaryChange}
                onValidationChange={handleValidationChange}
                onItemsChange={handleItemsChange}
                onExportData={handleExportData}
                readOnly={false}
                showSummary={true}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions Section */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                onClick={() => saveToAPI('draft')}
                disabled={isSaveDisabled}
                variant="outline"
                title={!itemsDataReady ? "Please save items first using the 'Save Items' button above" : ""}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save as Draft
                  </>
                )}
              </Button>
              <Button
                onClick={handleDelete}
                disabled={loading || formData.status === 'approved'}
                variant="destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Voucher
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={() => saveToAPI('approved')}
                disabled={isSaveDisabled}
                title={!itemsDataReady ? "Please save items first using the 'Save Items' button above" : ""}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Save & Approve
                  </>
                )}
              </Button>
            </div>

            {/* Status indicator */}
            <div className="mt-4 p-3 rounded-md" style={{
              backgroundColor: itemsDataReady ? '#f0f9ff' : '#fef3c7',
              borderColor: itemsDataReady ? '#0ea5e9' : '#f59e0b',
              borderWidth: '1px'
            }}>
              <p className="text-sm font-medium" style={{
                color: itemsDataReady ? '#0369a1' : '#92400e'
              }}>
                Status: {itemsDataReady ? '✅ Items saved - Ready to update voucher' : '⏳ Please save items first'}
              </p>
            </div>

            {/* Status and Metadata */}
            <div className="pt-4 border-t">
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge variant={formData.status === 'approved' ? 'default' : 'secondary'}>
                    {formData.status.toUpperCase()}
                  </Badge>
                </div>
                {/* Display voucher number in metadata section if available */}
                {formData.voucherNumber && (
                  <div className="flex justify-between">
                    <span>Voucher Number:</span>
                    <span className="font-medium text-blue-900">{formData.voucherNumber}</span>
                  </div>
                )}
                {originalData?.createdAt && (
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{format(new Date(originalData.createdAt), 'MMM dd, yyyy')}</span>
                  </div>
                )}
                {originalData?.updatedAt && (
                  <div className="flex justify-between">
                    <span>Updated:</span>
                    <span>{format(new Date(originalData.updatedAt), 'MMM dd, yyyy')}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditPurchaseVoucherPage;