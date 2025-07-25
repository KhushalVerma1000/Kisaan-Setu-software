'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Calendar, Save, X, FileText, Plus, Loader2, ArrowLeft } from 'lucide-react';
import { InvoiceAPI } from '@/server/features/sales/invoice/infrastructure/apihelpers/invoiceApi';
import type { 
  InvoiceInterface, 
  InvoiceItemInterface, 
  CustomerInterface,
  InvoiceSummaryInterface,
  GSTBreakdownInterface,
  LineCalculationsInterface,
  AddressInterface
} from '@/server/features/sales/invoice/core/entities/invoice';
import { SelectedItem } from '@/server/features/items/core/entities/selecteditem';
import AddItemComponent from '@/components/items/AddItemComponent';

// Redux imports
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectAllLedgerAccounts, selectLedgerAccountsLoading, selectLedgerAccountsError } from '@/store/slices/ledgerAccountSlice';
import { fetchLedgerAccountsAsync } from '@/store/slices/ledgerAccountSlice';
import { Item } from '@/server/features/items/core/entities/Item';

interface FormData {
  customerId: string;
  invoiceNumber: string;
  invoiceDate: string;
  eWayBillNumber: string;
  vehicleNumber: string;
  poNumber: string;
  notes: string;
  sameAsBillingAddress: boolean;
  billingAddress: {
    address: string;
    state: string;
    phone: string;
    gstin: string;
  };
  shippingAddress: {
    address: string;
    state: string;
    phone: string;
  };
}

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

const EditInvoicePage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  
  // Get invoice ID from URL parameters
  const invoiceId = params.id as string;
  
  // Redux state
  const user = useAppSelector((state) => state.user);
  const ledgerAccounts = useAppSelector(selectAllLedgerAccounts);
  const ledgerAccountsLoading = useAppSelector(selectLedgerAccountsLoading);
  const ledgerAccountsError = useAppSelector(selectLedgerAccountsError);
  
  const fpoIdOfUser = user.fpoId;

  // Loading states
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [originalInvoice, setOriginalInvoice] = useState<InvoiceInterface | null>(null);
  
  // State for managing items and calculations
  const [currentItems, setCurrentItems] = useState<any>([]);
  const [exportedData, setExportedData] = useState<any>(null);
  const [itemsDataReady, setItemsDataReady] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    customerId: '',
    invoiceNumber: '',
    invoiceDate: '',
    eWayBillNumber: '',
    vehicleNumber: '',
    poNumber: '',
    notes: '',
    sameAsBillingAddress: true,
    billingAddress: {
      address: '',
      state: '',
      phone: '',
      gstin: ''
    },
    shippingAddress: {
      address: '',
      state: '',
      phone: ''
    }
  });

  const formatDateForInput = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};
  // Fetch ledger accounts on component mount
  useEffect(() => {
    if (fpoIdOfUser && ledgerAccounts.length === 0) {
      dispatch(fetchLedgerAccountsAsync());
    }
  }, [dispatch, fpoIdOfUser, ledgerAccounts.length]);

  // Fetch invoice data
  useEffect(() => {
    if (invoiceId && fpoIdOfUser) {
      fetchInvoiceData();
    }
  }, [invoiceId, fpoIdOfUser]);

  const fetchInvoiceData = async () => {
    try {
      setInitialLoading(true);
      const invoice = await InvoiceAPI.getById(invoiceId);
      
      if (!invoice) {
        toast.error('Invoice not found');
        router.push('/Sales/Invoice');
        return;
      }
      console.log("your invoice is " , invoice)
      console.log("iem data is here" , invoice.items)
      setOriginalInvoice(invoice);
      
      // Populate form data
      setFormData({
        customerId: invoice.customer.id,
        invoiceNumber: invoice.invoiceNumber,
invoiceDate: formatDateForInput(invoice.invoiceDate),
        eWayBillNumber: invoice.eWayBillNumber || '',
        vehicleNumber: invoice.vehicleNumber || '',
        poNumber: invoice.poNumber || '',
        notes: invoice.notes || '',
        sameAsBillingAddress: invoice.customer.isSameAsBilling,
        billingAddress: {
          address: invoice.customer.billingAddress.address,
          state: invoice.customer.billingAddress.state,
          phone: invoice.customer.billingAddress.phone,
          gstin: invoice.customer.gstin || ''
        },
        shippingAddress: {
          address: invoice.customer.shippingAddress.address,
          state: invoice.customer.shippingAddress.state,
          phone: invoice.customer.shippingAddress.phone
        }
      });

      // Find and set selected customer
      const customer = invoice?.customer || ledgerAccounts.find(account => account?.id === invoice.customer?.id)  ;
      if (customer) {
        console.log(customer)
        setSelectedCustomer(customer);
      }

      // Convert InvoiceItemInterface to SelectedItem for the AddItemComponent
      const convertedItems: SelectedItem[] = invoice.items.map((item:InvoiceItemInterface, index:number) => ({
        id: item.id,
        item: item.item,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        gstConfig: item.gstConfig,
        lineNumber: item.lineNumber || index + 1
        
      }));
      // console.log("the converted item is this",convertedItems)

      setCurrentItems(convertedItems);
      
      // Prepare exported data structure that matches what AddItemComponent expects
      const summaryData = {
        subTotal: invoice.summary.subTotal,
        totalDiscount: invoice.summary.totalDiscount,
        totalCGST: invoice.summary.totalCGST,
        totalSGST: invoice.summary.totalSGST,
        totalIGST: invoice.summary.totalIGST,
        totalGST: invoice.summary.totalGST,
        shipmentAmount: invoice.summary.shipmentAmount,
        roundOff: invoice.summary.roundOff,
        grandTotal: invoice.summary.grandTotal,
        gstType: invoice.summary.gstType
      };

      setExportedData({
        items: convertedItems,
        summary: summaryData,
        gstBreakdown: invoice.gstBreakdown
      });
      
      setItemsDataReady(true);
      
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('Failed to load invoice data');
      router.push('/Sales/Invoice');
    } finally {
      setInitialLoading(false);
    }
  };

const handleCustomerSelect = (customerId: string) => {
    const customer = ledgerAccounts.find(account => account.id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
      setFormData(prev => {
        const newBillingAddress = {
          address: customer.address || '',
          state: customer.state || '',
          phone: customer.phoneNumber || '',
          gstin: customer.gstNumber || ''
        };

        return {
          ...prev,
          customerId,
          billingAddress: newBillingAddress,
          shippingAddress: prev.sameAsBillingAddress
            ? {
                address: customer.address || '',
                state: customer.state || '',
                phone: customer.phoneNumber || ''
              }
            : prev.shippingAddress
        };
      });
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (type: 'billingAddress' | 'shippingAddress', field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value }
    }));
  };

  const handleSameAsBilling = (checked: boolean) => {
    setFormData(prev => {
      const newFormData = {
        ...prev,
        sameAsBillingAddress: checked
      };

      if (checked) {
        newFormData.shippingAddress = {
          address: prev.billingAddress.address,
          state: prev.billingAddress.state,
          phone: prev.billingAddress.phone
        };
      }
      
      return newFormData;
    });
  };

  // Handle items change with useCallback as required
  const handleItemsChange = useCallback((items: SelectedItem[]) => {
    console.log('Items changed:', items);
    setCurrentItems(items);
    setItemsDataReady(false); // Disable buttons when items change
  }, []);

  // Handle exported data
  const handleExportData = useCallback((data: any) => {
    console.log('Export data received:', data);
    setExportedData(data);
    setItemsDataReady(true); // Enable buttons when data is exported
  }, []);

  const validateForm = (): boolean => {
    if (!formData.customerId) {
      toast.error('Please select a customer');
      return false;
    }
    if (!formData.invoiceNumber) {
      toast.error('Invoice number is required');
      return false;
    }
    if (!formData.invoiceDate) {
      toast.error('Invoice date is required');
      return false;
    }
    if (!itemsDataReady || !exportedData || !exportedData.items || exportedData.items.length === 0) {
      toast.error('Please add items and save them using the "Save Items" button in the items section');
      return false;
    }
    return true;
  };

  // Helper function to calculate line calculations from SelectedItem
  // const calculateLineCalculations = (selectedItem: SelectedItem): LineCalculationsInterface => {
  //   const baseAmount = selectedItem.quantity * selectedItem.unitPrice;
    
  //   // Calculate discount
  //   let discountAmount = 0;
  //   if (selectedItem.discount.value > 0) {
  //     if (selectedItem.discount.type === 'percent') {
  //       discountAmount = (baseAmount * selectedItem.discount.value) / 100;
  //     } else {
  //       discountAmount = selectedItem.discount.value;
  //     }
  //   }

  //   const taxableAmount = baseAmount - discountAmount;
    
  //   // Calculate GST amounts
  //   let gstRate = selectedItem.gstConfig.rate;
  //   let cgstAmount = 0;
  //   let sgstAmount = 0;
  //   let igstAmount = 0;

  //   // Determine if it's intrastate or interstate based on customer state
  //   // For now, we'll assume intrastate (CGST + SGST)
  //   // You might want to add logic to compare customer state with company state
  //   const isIntrastate = true; // This should be determined based on your business logic

  //   if (selectedItem.gstConfig.type === 'including') {
  //     // GST is included in the unit price
  //     if (isIntrastate) {
  //       cgstAmount = (taxableAmount * gstRate) / (200 + gstRate); // Divide by 2 for CGST
  //       sgstAmount = cgstAmount; // Same as CGST for intrastate
  //     } else {
  //       igstAmount = (taxableAmount * gstRate) / (100 + gstRate);
  //     }
  //   } else {
  //     // GST is excluding from the unit price
  //     if (isIntrastate) {
  //       cgstAmount = (taxableAmount * gstRate) / 200; // Divide by 2 for CGST
  //       sgstAmount = cgstAmount; // Same as CGST for intrastate
  //     } else {
  //       igstAmount = (taxableAmount * gstRate) / 100;
  //     }
  //   }

  //   const totalGstAmount = cgstAmount + sgstAmount + igstAmount;
  //   const lineTotal = selectedItem.gstConfig.type === 'including' 
  //     ? taxableAmount 
  //     : taxableAmount + totalGstAmount;

  //   return {
  //     baseAmount,
  //     discountAmount,
  //     taxableAmount,
  //     cgstAmount,
  //     sgstAmount,
  //     igstAmount,
  //     totalGstAmount,
  //     lineTotal
  //   };
  // };

  const handleUpdate = async (status?: 'draft' | 'sent') => {
    if (!validateForm()) return;
    if (!fpoIdOfUser || !originalInvoice) {
      toast.error('Invalid invoice data');
      return;
    }

    setLoading(true);
    try {
      // Map SelectedItem to InvoiceItemInterface with proper calculations
      const invoiceItems: InvoiceItemInterface[] = exportedData.items.map((selectedItem: SelectedItem) => {
        // const calculations = calculateLineCalculations(selectedItem);
        
        return {
          id: selectedItem.id,
          item: selectedItem.item,
          quantity: selectedItem.quantity,
          unitPrice: selectedItem.unitPrice,
          discount: selectedItem.discount,
          gstConfig: selectedItem.gstConfig,
          lineNumber: selectedItem.lineNumber,
         
        };
      });

      // Create customer object with updated interface structure
      const billingAddress: AddressInterface = {
        address: formData.billingAddress.address,
        phone: formData.billingAddress.phone,
        state: formData.billingAddress.state
      };

      const shippingAddress: AddressInterface = formData.sameAsBillingAddress 
        ? billingAddress 
        : {
            address: formData.shippingAddress.address,
            phone: formData.shippingAddress.phone,
            state: formData.shippingAddress.state
          };

      const customer: CustomerInterface = {
        id: formData.customerId,
        name: selectedCustomer?.name || '',
        billingAddress,
        shippingAddress,
        gstin: formData.billingAddress.gstin,
        isSameAsBilling: formData.sameAsBillingAddress
      };

      // Create summary with updated interface structure
      const invoiceSummary: InvoiceSummaryInterface = {
        subTotal: exportedData.summary.subTotal || 0,
        totalDiscount: exportedData.summary.totalDiscount || 0,
        totalCGST: exportedData.summary.totalCGST || 0,
        totalSGST: exportedData.summary.totalSGST || 0,
        totalIGST: exportedData.summary.totalIGST || 0,
        totalGST: exportedData.summary.totalGST || 0,
        shipmentAmount: exportedData.summary.shipmentAmount || 0,
        roundOff: exportedData.summary.roundOff || 0,
        grandTotal: exportedData.summary.grandTotal || 0,
        gstType: exportedData.summary.gstType || 'intrastate'
      };

      // Create GST breakdown from exported data
      const gstBreakdown: GSTBreakdownInterface = exportedData.gstBreakdown || {};

      const updatedInvoiceData: InvoiceInterface = {
        id: originalInvoice.id,
        invoiceNumber: formData.invoiceNumber,
        invoiceDate: formData.invoiceDate,
        customer,
        eWayBillNumber: formData.eWayBillNumber,
        vehicleNumber: formData.vehicleNumber,
        poNumber: formData.poNumber,
        items: invoiceItems,
        summary: invoiceSummary,
        gstBreakdown,
        documentType: 'invoice',
        fpoId: fpoIdOfUser,
        status: status || originalInvoice.status,
        notes: formData.notes,
        createdAt: originalInvoice.createdAt,
        updatedAt: new Date()
      };

      await InvoiceAPI.update( updatedInvoiceData);
      toast.success('Invoice updated successfully!');
      router.push('/Sales/Invoice');
    } catch (error) {
      toast.error('Failed to update invoice');
      console.error('Invoice update error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/Sales/Invoice');
  };

  const handleGoBack = () => {
    router.back();
  };

  // Show loading spinner while fetching initial data
  if (initialLoading) {
    return (
      <div className="container mx-auto max-w-full">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading invoice data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Filter ledger accounts that are customers
  const customerAccounts = ledgerAccounts;

  // Check if save buttons should be disabled
  const isSaveDisabled = loading || !itemsDataReady;

  return (
    <div className="container mx-auto max-w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between md:mb-6">
        <div className="max-md:w-full max-md:px-4 px-6">
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoBack}
              className="p-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Invoice</h1>
              <p className="text-gray-600 mt-1">
                Editing Invoice #{originalInvoice?.invoiceNumber}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleUpdate('draft')} 
            disabled={isSaveDisabled}
            title={!itemsDataReady ? "Please save items first using the 'Save Items' button below" : ""}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Update as Draft
          </Button>
          <Button 
            onClick={() => handleUpdate('sent')} 
            disabled={isSaveDisabled}
            title={!itemsDataReady ? "Please save items first using the 'Save Items' button below" : ""}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            Update Invoice
          </Button>
        </div>
      </div>

      {/* Info message when buttons are disabled */}
      {!itemsDataReady && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md max-w-4xl">
          <p className="text-blue-800 text-sm">
            <strong>Note:</strong> Please add items and click the "Save Items" button in the Items section below to enable the invoice update buttons.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* Top Section: Customer Info and Invoice Details in 2-column layout */}
        <div className="grid gap-6 xl:grid-cols-3 lg:grid-cols-2">
          {/* Customer Information - Takes 2 columns on xl screens */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>Customer Information</span>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Customer
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customer">Customer *</Label>
                <Select value={formData.customerId} onValueChange={handleCustomerSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      ledgerAccountsLoading 
                        ? "Loading customers..." 
                        : "-- Select Customer --"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {customerAccounts.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id || ''}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {ledgerAccountsError && (
                  <p className="text-red-500 text-sm mt-1">
                    Error loading customers: {ledgerAccountsError}
                  </p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Billing Address */}
                <div>
                  <h3 className="font-medium mb-3">Billing Address</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="billingAddress">Address</Label>
                      <Textarea
                        id="billingAddress"
                        value={formData.billingAddress.address}
                        onChange={(e) => handleAddressChange('billingAddress', 'address', e.target.value)}
                        placeholder="Enter billing address"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="billingState">State *</Label>
                      <Select 
                        value={formData.billingAddress.state} 
                        onValueChange={(value) => handleAddressChange('billingAddress', 'state', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="-- Select State --" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATES.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="billingGstn">GSTN</Label>
                      <Input
                        id="billingGstn"
                        value={formData.billingAddress.gstin}
                        onChange={(e) => handleAddressChange('billingAddress', 'gstin', e.target.value)}
                        placeholder="Enter GSTN"
                      />
                    </div>
                    <div>
                      <Label htmlFor="billingPhone">Phone</Label>
                      <Input
                        id="billingPhone"
                        value={formData.billingAddress.phone}
                        onChange={(e) => handleAddressChange('billingAddress', 'phone', e.target.value)}
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Shipping Address</h3>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sameAsBilling"
                        checked={formData.sameAsBillingAddress}
                        onCheckedChange={handleSameAsBilling}
                      />
                      <Label htmlFor="sameAsBilling" className="text-sm">
                        Same as Billing Address
                      </Label>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="shippingAddress">Address</Label>
                      <Textarea
                        id="shippingAddress"
                        value={formData.shippingAddress.address}
                        onChange={(e) => handleAddressChange('shippingAddress', 'address', e.target.value)}
                        placeholder="Enter shipping address"
                        rows={3}
                        disabled={formData.sameAsBillingAddress}
                      />
                    </div>
                    <div>
                      <Label htmlFor="shippingState">State</Label>
                      <Select 
                        value={formData.shippingAddress.state} 
                        onValueChange={(value) => handleAddressChange('shippingAddress', 'state', value)}
                        disabled={formData.sameAsBillingAddress}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="-- Select State --" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATES.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="shippingPhone">Phone</Label>
                      <Input
                        id="shippingPhone"
                        value={formData.shippingAddress.phone}
                        onChange={(e) => handleAddressChange('shippingAddress', 'phone', e.target.value)}
                        placeholder="Enter phone number"
                        disabled={formData.sameAsBillingAddress}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Details Sidebar */}
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                <Input
                  id="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                  placeholder="INV-0001"
                />
              </div>

              <div>
                <Label htmlFor="invoiceDate">Invoice Date *</Label>
                <div className="relative">
                  <Input
                    id="invoiceDate"
                    type="date"
                    value={formData.invoiceDate}
                    onChange={(e) => handleInputChange('invoiceDate', e.target.value)}
                  />
                  <Calendar className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div>
                <Label htmlFor="eWayBillNumber">E-Way Bill Number</Label>
                <Input
                  id="eWayBillNumber"
                  value={formData.eWayBillNumber}
                  onChange={(e) => handleInputChange('eWayBillNumber', e.target.value)}
                  placeholder="Enter E-Way Bill Number"
                />
              </div>

              <div>
                <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                <Input
                  id="vehicleNumber"
                  value={formData.vehicleNumber}
                  onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
                  placeholder="Enter Vehicle Number"
                />
              </div>

              <div>
                <Label htmlFor="poNumber">PO Number</Label>
                <Input
                  id="poNumber"
                  value={formData.poNumber}
                  onChange={(e) => handleInputChange('poNumber', e.target.value)}
                  placeholder="Enter PO Number"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Full Width Items Section */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Items</CardTitle>
            {!itemsDataReady && (
              <p className="text-sm text-blue-600">
                Add items below and click "Save Items" to enable invoice update buttons.
              </p>
            )}
          </CardHeader>
          <CardContent>
            <AddItemComponent
              documentType="invoice"
              initialItems={currentItems}
              onItemsChange={handleItemsChange}
              onExportData={handleExportData}
              showSummary={true}
            />
          </CardContent>
        </Card>

        {/* Bottom Summary Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Empty space or additional content can go here */}
          <div></div>
          
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {exportedData && exportedData.summary ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Sub Total:</span>
                    <span>₹{exportedData.summary.subTotal?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Discount:</span>
                    <span>₹{exportedData.summary.totalDiscount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total GST:</span>
                    <span>₹{exportedData.summary.totalGST?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipment Amount:</span>
                    <span>₹{exportedData.summary.shipmentAmount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Round Off:</span>
                    <span>₹{exportedData.summary.roundOff?.toFixed(2) || '0.00'}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Grand Total:</span>
                    <span>₹{exportedData.summary.grandTotal?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-sm text-center py-4">
                  Summary will appear here after saving items
                </div>
              )}
              
              {/* Status indicator */}
              <div className="mt-4 p-3 rounded-md" style={{
                backgroundColor: itemsDataReady ? '#f0f9ff' : '#fef3c7',
                borderColor: itemsDataReady ? '#0ea5e9' : '#f59e0b',
                borderWidth: '1px'
              }}>
                <p className="text-sm font-medium" style={{
                  color: itemsDataReady ? '#0369a1' : '#92400e'
                }}>
                  Status: {itemsDataReady ? '✅ Items saved - Ready to update invoice' : '⏳ Please save items first'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EditInvoicePage;