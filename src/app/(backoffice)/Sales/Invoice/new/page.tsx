"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useHeaderButtons } from "@/hooks/useHeaderButtons";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Calendar, User, FileText } from "lucide-react";

// Interface definitions
interface InvoiceItem {
  id: string;
  productName: string;
  hsn: string;
  quantity: number;
  unit: string;
  price: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  gst: number;
  gstType: 'exempt' | 'included' | 'excluded';
  totalAmount: number;
}

interface Customer {
  id: string;
  name: string;
  billingAddress: string;
  shippingAddress: string;
  phone: string;
  gstin: string;
  state: string;
}

interface InvoiceFormData {
  customer: Customer | null;
  invoiceNumber: string;
  invoiceDate: string;
  ewayBillNumber: string;
  vehicleNumber: string;
  poNumber: string;
  notes: string;
  sameAsBilling: boolean;
  shippingAddress: {
    address: string;
    state: string;
    phone: string;
  };
  billingAddress: { // <-- add this
    address: string;
    state: string;
    phone: string;
  };
  items: InvoiceItem[];
}

// Sample customers data
const sampleCustomers: Customer[] = [
  {
    id: "1",
    name: "ABC Farm Supplies",
    billingAddress: "123 Farm Street, Rural Area, Village-123456",
    shippingAddress: "123 Farm Street, Rural Area, Village-123456",
    phone: "+91 9876543210",
    gstin: "24AABCU9603R1ZM",
    state: "Gujarat"
  },
  {
    id: "2",
    name: "Green Valley Co-op",
    billingAddress: "456 Valley Road, Green Valley, City-789012",
    shippingAddress: "456 Valley Road, Green Valley, City-789012",
    phone: "+91 9876543211",
    gstin: "27AABCU9603R1ZN",
    state: "Maharashtra"
  },
  {
    id: "3",
    name: "Farmers United Ltd",
    billingAddress: "789 Farmers Lane, United District, Town-345678",
    shippingAddress: "789 Farmers Lane, United District, Town-345678",
    phone: "+91 9876543212",
    gstin: "29AABCU9603R1ZO",
    state: "Karnataka"
  }
];

// Sample products data
const sampleProducts = [
  { id: "1", name: "Organic Fertilizer", hsn: "31010000", unit: "Kg", price: 50 },
  { id: "2", name: "Wheat Seeds", hsn: "10019900", unit: "Kg", price: 75 },
  { id: "3", name: "Pesticide Spray", hsn: "38089390", unit: "Liter", price: 200 },
  { id: "4", name: "Farm Tools Set", hsn: "82010000", unit: "Set", price: 1500 },
  { id: "5", name: "Irrigation Pipe", hsn: "39172990", unit: "Meter", price: 25 }
];

const states = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const units = ["Kg", "Liter", "Meter", "Piece", "Set", "Box", "Packet", "Quintal", "Ton"];

export default function AddNewInvoicePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
 const [formData, setFormData] = useState<InvoiceFormData>({
  customer: null,
  invoiceNumber: `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
  invoiceDate: new Date().toISOString().split('T')[0],
  ewayBillNumber: "",
  vehicleNumber: "",
  poNumber: "",
  notes: "",
  sameAsBilling: true,
  shippingAddress: {
    address: "",
    state: "",
    phone: ""
  },
  billingAddress: {
    address: "",
    state: "",
    phone: ""
  }, // <-- ADD THIS
  items: []
});

  // Add new item to the invoice
  const addNewItem = useCallback(() => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      productName: "",
      hsn: "",
      quantity: 1,
      unit: "Kg",
      price: 0,
      discount: 0,
      discountType: 'percentage',
      gst: 18,
      gstType: 'excluded',
      totalAmount: 0
    };
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  }, []);

  // Remove item from invoice
  const removeItem = useCallback((itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  }, []);

  // Update item in the invoice
  const updateItem = useCallback((itemId: string, field: keyof InvoiceItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          
          // Recalculate total amount
          const baseAmount = updatedItem.quantity * updatedItem.price;
          const discountAmount = updatedItem.discountType === 'percentage' 
            ? (baseAmount * updatedItem.discount) / 100 
            : updatedItem.discount;
          const discountedAmount = baseAmount - discountAmount;
          
          if (updatedItem.gstType === 'excluded') {
            updatedItem.totalAmount = discountedAmount + (discountedAmount * updatedItem.gst) / 100;
          } else if (updatedItem.gstType === 'included') {
            updatedItem.totalAmount = discountedAmount;
          } else {
            updatedItem.totalAmount = discountedAmount;
          }
          
          return updatedItem;
        }
        return item;
      })
    }));
  }, []);

  // Handle customer selection
  const handleCustomerChange = useCallback((customerId: string) => {
    const customer = sampleCustomers.find(c => c.id === customerId) || null;
    setFormData(prev => ({
      ...prev,
      customer,
      shippingAddress: customer && prev.sameAsBilling ? {
        address: customer.billingAddress,
        state: customer.state,
        phone: customer.phone
      } : prev.shippingAddress
    }));
  }, []);

  // Handle same as billing checkbox
  const handleSameAsBillingChange = useCallback((checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      sameAsBilling: checked,
      shippingAddress: checked && prev.customer ? {
        address: prev.customer.billingAddress,
        state: prev.customer.state,
        phone: prev.customer.phone
      } : prev.shippingAddress
    }));
  }, []);

  // Handle product selection
  const handleProductSelect = useCallback((itemId: string, productId: string) => {
    const product = sampleProducts.find(p => p.id === productId);
    if (product) {
      updateItem(itemId, 'productName', product.name);
      updateItem(itemId, 'hsn', product.hsn);
      updateItem(itemId, 'unit', product.unit);
      updateItem(itemId, 'price', product.price);
    }
  }, [updateItem]);

  // Calculate totals
  const calculations = useMemo(() => {
    const subTotal = formData.items.reduce((sum, item) => {
      const baseAmount = item.quantity * item.price;
      const discountAmount = item.discountType === 'percentage' 
        ? (baseAmount * item.discount) / 100 
        : item.discount;
      return sum + (baseAmount - discountAmount);
    }, 0);

    const totalGST = formData.items.reduce((sum, item) => {
      if (item.gstType === 'excluded') {
        const baseAmount = item.quantity * item.price;
        const discountAmount = item.discountType === 'percentage' 
          ? (baseAmount * item.discount) / 100 
          : item.discount;
        const discountedAmount = baseAmount - discountAmount;
        return sum + (discountedAmount * item.gst) / 100;
      }
      return sum;
    }, 0);

    const grandTotal = subTotal + totalGST;

    return {
      subTotal,
      totalGST,
      grandTotal,
      roundOff: Math.round(grandTotal) - grandTotal
    };
  }, [formData.items]);

  // Handle form submission
  const handleSubmit = useCallback(async (status: 'draft' | 'sent') => {
    if (!formData.customer) {
      alert('Please select a customer');
      return;
    }

    if (formData.items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const invoiceData = {
        ...formData,
        status,
        subTotal: calculations.subTotal,
        totalGST: calculations.totalGST,
        grandTotal: calculations.grandTotal,
        roundOff: calculations.roundOff
      };
      
      console.log('Invoice data:', invoiceData);
      
      // Redirect to invoice list
      router.push('/dashboard/invoices');
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Error creating invoice. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [formData, calculations, router]);

  // Header buttons
  const headerButtons = useMemo(() => [
    { 
      label: isLoading ? "Saving..." : "Save as Draft", 
      onClick: () => handleSubmit('draft'),
      variant: "outline" as const
    },
    { 
      label: isLoading ? "Generating..." : "Generate Invoice", 
      onClick: () => handleSubmit('sent')
    }
  ], [handleSubmit, isLoading]);

  useHeaderButtons(headerButtons);

  // Initialize with one empty item
  useEffect(() => {
    if (formData.items.length === 0) {
      addNewItem();
    }
  }, [formData.items.length, addNewItem]);

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/sales">Sale</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/invoices">Invoices</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Add New Invoice</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Selection */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label htmlFor="customer" className="text-sm font-medium">
                  Customer <span className="text-red-500">*</span>
                </Label>
                <Button variant="outline" size="sm" className="text-xs">
                  Add Ledger
                </Button>
              </div>
              
              <Select value={formData.customer?.id || ""} onValueChange={handleCustomerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="--Select Customer--" />
                </SelectTrigger>
                <SelectContent>
                  {sampleCustomers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Billing Address */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Billing Address</Label>
                <div className="p-3 bg-gray-50 rounded-md border">
                  {formData.customer ? (
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">{formData.customer.name}</p>
                     <div className="space-y-4">
  <div>
    <Label htmlFor="billingAddress" className="text-sm font-medium">Address</Label>
    <Textarea
      id="billingAddress"
      placeholder="Enter billing address"
      value={formData.billingAddress.address}
      onChange={(e) => setFormData(prev => ({
        ...prev,
        billingAddress: { ...prev.billingAddress, address: e.target.value }
      }))}
    />
  </div>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <Label htmlFor="billingState" className="text-sm font-medium">State</Label>
      <Select
        value={formData.billingAddress.state}
        onValueChange={(value) => setFormData(prev => ({
          ...prev,
          billingAddress: { ...prev.billingAddress, state: value }
        }))}
      >
        <SelectTrigger>
          <SelectValue placeholder="--Select State--" />
        </SelectTrigger>
        <SelectContent>
          {states.map((state) => (
            <SelectItem key={state} value={state}>{state}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div>
      <Label htmlFor="billingPhone" className="text-sm font-medium">Phone</Label>
      <Input
        id="billingPhone"
        type="tel"
        placeholder="Enter phone number"
        value={formData.billingAddress.phone}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          billingAddress: { ...prev.billingAddress, phone: e.target.value }
        }))}
      />
    </div>
  </div>
</div>

                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Select a customer to view billing address</p>
                  )}
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Shipping Address</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sameAsBilling"
                    checked={formData.sameAsBilling}
                    onCheckedChange={handleSameAsBillingChange}
                  />
                  <Label htmlFor="sameAsBilling" className="text-sm">
                    Same as Billing Address
                  </Label>
                </div>
              </div>

              {formData.sameAsBilling ? (
                <div className="p-3 bg-gray-50 rounded-md border">
                  {formData.customer ? (
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">{formData.customer.name}</p>
                      <p>{formData.customer.billingAddress}</p>
                      <p>Phone: {formData.customer.phone}</p>
                      <p>State: {formData.customer.state}</p>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Select a customer to view shipping address</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="shippingAddress" className="text-sm font-medium">Address</Label>
                    <Textarea
                      id="shippingAddress"
                      placeholder="Enter shipping address"
                      value={formData.shippingAddress.address}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        shippingAddress: { ...prev.shippingAddress, address: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shippingState" className="text-sm font-medium">State</Label>
                      <Select
                        value={formData.shippingAddress.state}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          shippingAddress: { ...prev.shippingAddress, state: value }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="--Select State--" />
                        </SelectTrigger>
                        <SelectContent>
                          {states.map((state) => (
                            <SelectItem key={state} value={state}>{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="shippingPhone" className="text-sm font-medium">Phone</Label>
                      <Input
                        id="shippingPhone"
                        type="tel"
                        placeholder="Enter phone number"
                        value={formData.shippingAddress.phone}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          shippingAddress: { ...prev.shippingAddress, phone: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="invoiceNumber" className="text-sm font-medium">
                Invoice Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                placeholder="Invoice number"
              />
            </div>

            <div>
              <Label htmlFor="invoiceDate" className="text-sm font-medium">
                Invoice Date <span className="text-red-500">*</span>
              </Label>
              <Input className=" w-fit"
                id="invoiceDate"
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => setFormData(prev => ({ ...prev, invoiceDate: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="ewayBillNumber" className="text-sm font-medium">E-Way Bill Number</Label>
              <Input
                id="ewayBillNumber"
                value={formData.ewayBillNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, ewayBillNumber: e.target.value }))}
                placeholder="E-Way Bill Number"
              />
            </div>

            <div>
              <Label htmlFor="vehicleNumber" className="text-sm font-medium">Vehicle Number</Label>
              <Input
                id="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                placeholder="Vehicle Number"
              />
            </div>

            <div>
              <Label htmlFor="poNumber" className="text-sm font-medium">PO Number</Label>
              <Input
                id="poNumber"
                value={formData.poNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, poNumber: e.target.value }))}
                placeholder="PO Number"
              />
            </div>

            <div>
              <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
                className="min-h-[80px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Items */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Invoice Items</CardTitle>
            <Button onClick={addNewItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Product</TableHead>
                  <TableHead className="w-[100px]">HSN/SAC</TableHead>
                  <TableHead className="w-[80px]">Qty</TableHead>
                  <TableHead className="w-[80px]">Unit</TableHead>
                  <TableHead className="w-[100px]">Price</TableHead>
                  <TableHead className="w-[80px]">Disc</TableHead>
                  <TableHead className="w-[80px]">GST</TableHead>
                  <TableHead className="w-[120px]">Total</TableHead>
                  <TableHead className="w-[60px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Select
                        value={item.productName}
                        onValueChange={(value) => {
                          const product = sampleProducts.find(p => p.name === value);
                          if (product) {
                            handleProductSelect(item.id, product.id);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="--Select Product--" />
                        </SelectTrigger>
                        <SelectContent>
                          {sampleProducts.map((product) => (
                            <SelectItem key={product.id} value={product.name}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.hsn}
                        onChange={(e) => updateItem(item.id, 'hsn', e.target.value)}
                        placeholder="HSN/SAC"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.unit}
                        onValueChange={(value) => updateItem(item.id, 'unit', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((unit) => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          value={item.discount}
                          onChange={(e) => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="w-16"
                        />
                        <Select
                          value={item.discountType}
                          onValueChange={(value) => updateItem(item.id, 'discountType', value)}
                        >
                          <SelectTrigger className="w-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">%</SelectItem>
                            <SelectItem value="fixed">₹</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          value={item.gst}
                          onChange={(e) => updateItem(item.id, 'gst', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="w-16"
                        />
                        <Select
                          value={item.gstType}
                          onValueChange={(value) => updateItem(item.id, 'gstType', value)}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="exempt">Exempt</SelectItem>
                            <SelectItem value="included">Incl</SelectItem>
                            <SelectItem value="excluded">Excl</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        ₹{item.totalAmount.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4 p-4">
            {formData.items.map((item, index) => (
              <Card key={item.id} className="p-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Product</Label>
                      <Select
                        value={item.productName}
                        onValueChange={(value) => {
                          const product = sampleProducts.find(p => p.name === value);
                          if (product) {
                            handleProductSelect(item.id, product.id);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="--Select Product--" />
                        </SelectTrigger>
                        <SelectContent>
                          {sampleProducts.map((product) => (
                            <SelectItem key={product.id} value={product.name}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">HSN/SAC</Label>
                      <Input
                        value={item.hsn}
                        onChange={(e) => updateItem(item.id, 'hsn', e.target.value)}
                        placeholder="HSN/SAC"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Quantity</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Unit</Label>
                      <Select
                        value={item.unit}
                        onValueChange={(value) => updateItem(item.id, 'unit', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                                                    {units.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Price</Label>
                      <Input
                        type="number"
                        value={item.price}
                        onChange={(e) =>
                          updateItem(item.id, 'price', parseFloat(e.target.value) || 0)
                        }
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Discount</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={item.discount}
                          onChange={(e) =>
                            updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)
                          }
                          min="0"
                          step="0.01"
                          className="w-1/2"
                        />
                        <Select
                          value={item.discountType}
                          onValueChange={(value) =>
                            updateItem(item.id, 'discountType', value)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">%</SelectItem>
                            <SelectItem value="fixed">₹</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">GST</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={item.gst}
                          onChange={(e) =>
                            updateItem(item.id, 'gst', parseFloat(e.target.value) || 0)
                          }
                          min="0"
                          step="0.01"
                          className="w-1/2"
                        />
                        <Select
                          value={item.gstType}
                          onValueChange={(value) =>
                            updateItem(item.id, 'gstType', value)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="exempt">Exempt</SelectItem>
                            <SelectItem value="included">Incl</SelectItem>
                            <SelectItem value="excluded">Excl</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Total</Label>
                      <div className="font-medium">
                        ₹{item.totalAmount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₹{calculations.subTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Total GST</span>
            <span>₹{calculations.totalGST.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Round Off</span>
            <span>₹{calculations.roundOff.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold text-base">
            <span>Grand Total</span>
            <span>₹{(calculations.grandTotal + calculations.roundOff).toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
