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
import { CalendarIcon, Save, ArrowLeft, AlertCircle, CheckCircle, Loader2, Edit, Trash2, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import AddItemComponent from '@/components/items/AddItemComponent';
import { PurchaseVoucherAPI } from '@/server/features/purchase/infrastructure/apihelpers/purchaseVoucher/purchaseVoucherApi';
import { toast } from 'react-toastify';
import { ILineItemSummary } from '@/server/features/items/core/entities/selecteditem';
import {
  GSTBreakdownInterface,
  PurchaseVoucherInterface,
  PurchaseVoucherItemInterface,
  PurchaseVoucherSummaryInterface
} from '@/server/features/purchase/core/entities/PurchaseVoucher';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  fetchLedgerAccountsAsync,
  selectAllLedgerAccounts,
  selectLedgerAccountsLoading,
  selectLedgerAccountsError
} from '@/store/slices/ledgerAccountSlice';

// Interfaces
interface EditPurchaseVoucherPageProps {
  params: Promise<{ id: string }>;
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

type LineItemSummary = ILineItemSummary;

// Mock data
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
  const [exportedItemsData, setExportedItemsData] = useState<any>(null);
  const [voucherSummary, setVoucherSummary] = useState<ILineItemSummary>({
    subTotal: 0,
    totalDiscount: 0,
    totalGST: 0,
    shipmentAmount: 0,
    roundOff: 0,
    grandTotal: 0
  });
  const [gstBreakdown, setGstBreakdown] = useState<GSTBreakdownInterface>({});

  // Form data initialization
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

  // Critical null checks for fpoId
  useEffect(() => {
    if (!fpoIdOfUser) {
      toast.error('FPO ID not found. Please login again.', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      router.push('/login');
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
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  }, [ledgerAccountsError]);

  // Load voucher data
  useEffect(() => {
    const loadVoucherData = async () => {
      try {
        setIsLoading(true);
        const voucherDataApi = await PurchaseVoucherAPI.getById(id);
        const voucherData = voucherDataApi.data;
        setOriginalData(voucherData);
        console.log("this is voucherdata",voucherData)
        // Map API data to form data
        setFormData({
          poNumber: voucherData.poNumber || '',
          supplierId: voucherData.supplierVendorId || '',
          supplierName: voucherData.supplierVendorName || '',
          partyInvoiceNo: voucherData.partyInvoiceNumber || '',
          partyInvoiceDate: voucherData.partyInvoiceDate ? new Date(voucherData.partyInvoiceDate) : null,
          billingAddress: voucherData.supplierVendorBillingAddress || '',
          gstin: voucherData.gstin || '',
          items: [],
          summary: voucherData.summary || {
            subTotal: 0,
            totalGST: 0,
            grandTotal: 0,
            totalDiscount: 0,
            shipmentAmount: 0,
            roundOff: 0,
            itemCount: 0
          },
          shipmentAmount: voucherData.summary?.shipmentAmount || 0,
          notes: voucherData.notes || '',
          status: voucherData.status || 'draft'
        });

        // Set summary states
        setVoucherSummary(voucherData.summary || {
          subTotal: 0,
          totalDiscount: 0,
          totalGST: 0,
          shipmentAmount: 0,
          roundOff: 0,
          grandTotal: 0
        });

        setGstBreakdown(voucherData.gstBreakdown || {});

        // Set items data for AddItemComponent
        setExportedItemsData({
          items: voucherData.items || [],
          summary: voucherData.summary || {},
          gstBreakdown: voucherData.gstBreakdown || {}
        });

      } catch (error) {
        console.error('Error loading voucher:', error);
        toast.error('Failed to load purchase voucher. Please try again.', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        router.push('/Purchases/PurchaseVoucher');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      loadVoucherData();
    }
  }, [id, router]);

  // Handle supplier change
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

      setHasChanges(true);

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

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  // Handle summary change from AddItemComponent
  const handleSummaryChange = useCallback((summary: ILineItemSummary) => {
    setVoucherSummary(summary);
    setFormData(prev => ({
      ...prev,
      summary
    }));
    setHasChanges(true);
  }, []);

  // Handle validation change
  const handleValidationChange = useCallback((isValid: boolean, validationErrors: string[]) => {
    setIsFormValid(isValid);
    setErrors(validationErrors);
  }, []);

  // Handle export data from AddItemComponent
  const handleExportData = useCallback((data: any) => {
    setExportedItemsData(data);
    setGstBreakdown(data.gstBreakdown || {});
    setHasChanges(true);
  }, []);

  // Calculate final total
  const calculateFinalTotal = () => {
    return voucherSummary.grandTotal + formData.shipmentAmount;
  };

  // Save to API
  const saveToAPI = async (status: 'draft' | 'approved') => {
    const toastId = toast.loading(`Updating purchase voucher as ${status}...`, {
      position: "top-right",
    });

    try {
      setLoading(true);

      // Validation checks with fpoId null check
      if (!fpoIdOfUser) {
        toast.update(toastId, {
          render: 'FPO ID not found. Please login again.',
          type: 'error',
          isLoading: false,
          autoClose: 5000,
        });
        return;
      }

      if (!exportedItemsData || !exportedItemsData.items || exportedItemsData.items.length === 0) {
        toast.update(toastId, {
          render: 'Please add at least one item to the purchase voucher.',
          type: 'error',
          isLoading: false,
          autoClose: 5000,
        });
        return;
      }

      // Convert items from AddItemComponent format to PurchaseVoucherItemInterface format
      const convertedItems: PurchaseVoucherItemInterface[] = exportedItemsData.items.map((item: any, index: number) => {
        // Handle the structure from AddItemComponent export
        const itemData = item.item || item; // item.item exists in exported data
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
            gstAmount: calculations.gstAmount || 0,
            lineTotal: calculations.lineTotal || 0
          },
          purchasePrice: item.purchasePrice || itemData.purchasePrice || 0
        };
      });

      const voucherData: PurchaseVoucherInterface = {
        id: originalData?.id,
        poNumber: formData.poNumber,
        supplierVendorName: formData.supplierName,
        supplierVendorId: formData.supplierId,
        partyInvoiceNumber: formData.partyInvoiceNo,
        partyInvoiceDate: formData.partyInvoiceDate || new Date(),
        supplierVendorBillingAddress: formData.billingAddress,
        gstin: formData.gstin,
        items: convertedItems,
        summary: voucherSummary,
        gstBreakdown: gstBreakdown,
        documentType: 'purchase_voucher',
        fpoId: fpoIdOfUser,
        createdAt: originalData?.createdAt ? new Date(originalData.createdAt) : new Date(),
        updatedAt: new Date(),
        status: status,
        notes: formData.notes
      };

      const response = await PurchaseVoucherAPI.update(id, voucherData);

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
    if (!exportedItemsData || !exportedItemsData.items || exportedItemsData.items.length === 0) {
      toast.error('Please add at least one item before creating a copy.', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return;
    }

    // Navigate to add page with pre-filled data
    const queryParams = new URLSearchParams({
      copy: 'true',
      supplierId: formData.supplierId,
      supplierName: formData.supplierName,
      gstin: formData.gstin,
      billingAddress: formData.billingAddress,
      shipmentAmount: formData.shipmentAmount.toString(),
      notes: formData.notes,
      items: JSON.stringify(exportedItemsData.items)
    });

    router.push(`/Purchases/PurchaseVoucher/add?${queryParams.toString()}`);
  };

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
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
            <h1 className="text-2xl font-bold text-gray-900">Edit Purchase Voucher</h1>
            <p className="text-sm text-gray-600">
              Modify purchase voucher details for your FPO
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-blue-600 border-blue-200">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </CardContent>
          </Card>

          {/* Items Section */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <AddItemComponent
                documentType="purchase_voucher"
                initialItems={exportedItemsData?.items || []}
                onSummaryChange={handleSummaryChange}
                onValidationChange={handleValidationChange}
                onExportData={handleExportData}
                readOnly={false}
                showSummary={false}
              />
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{voucherSummary.subTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Discount:</span>
                  <span>₹{voucherSummary.totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total GST:</span>
                  <span>₹{voucherSummary.totalGST.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipment Amount:</span>
                  <Input
                    type="number"
                    value={formData.shipmentAmount}
                    onChange={(e) => handleInputChange('shipmentAmount', parseFloat(e.target.value) || 0)}
                    className="w-20 h-8 text-right"
                    step="0.01"
                  />
                </div>
                <div className="flex justify-between">
                  <span>Round Off:</span>
                  <span>₹{voucherSummary.roundOff.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Grand Total:</span>
                  <span>₹{calculateFinalTotal().toFixed(2)}</span>
                </div>
              </div>

              {/* GST Breakdown */}
              {Object.keys(gstBreakdown).length > 0 && (
                <div className="space-y-2">
                  <Separator />
                  <h4 className="font-semibold">GST Breakdown</h4>
                 
              {Object.entries(gstBreakdown).map(([rate, amount]) => (
  <div key={rate} className="flex justify-between text-sm">
    <span>{rate}% GST:</span>
    <span>₹{typeof amount.gst === 'number' ? amount.gst.toFixed(2) : '0.00'}</span>
  </div>
))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-4">
                <Button
                  onClick={() => saveToAPI('draft')}
                  disabled={loading || !isFormValid}
                  className="w-full"
                  variant="outline"
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
                  onClick={() => saveToAPI('approved')}
                  disabled={loading || !isFormValid}
                  className="w-full"
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

                <Separator className="my-4" />

                <Button
                  onClick={handleSaveAsCopy}
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Save as Copy
                </Button>

                <Button
                  onClick={handleDelete}
                  disabled={loading || formData.status === 'approved'}
                  className="w-full"
                  variant="destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Voucher
                </Button>
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
                  <div className="flex justify-between">
                    <span>Items:</span>
                    <span>{exportedItemsData?.items?.length || 0}</span> 
                  </div>
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
    </div>
  );
};

export default EditPurchaseVoucherPage;