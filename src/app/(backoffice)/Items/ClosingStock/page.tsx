// Example usage in an Invoice page
// pages/invoice/create.tsx
"use client"
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { FileText, Save, Send } from 'lucide-react';
import AddItemComponent from '@/components/items/AddItemComponent';

interface InvoiceData {
  customerName: string;
  customerEmail: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  terms: string;
  notes: string;
}

const CreateInvoicePage: React.FC = () => {
  const router = useRouter();
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    customerName: '',
    customerEmail: '',
    invoiceNumber: `INV-${Date.now()}`,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    terms: '',
    notes: ''
  });

  const [summary, setSummary] = useState({
    subTotal: 0,
    totalDiscount: 0,
    totalGST: 0,
    shipmentAmount: 0,
    roundOff: 0,
    grandTotal: 0,
    itemCount: 0
  });

  const [exporteditem, setexporteditem] = useState()
  const [items, setItems] = useState([]);
  const [isValid, setIsValid] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveInvoice = async () => {
    if (!isValid || items.length === 0) {
      return;
    }

    setIsSaving(true);
    try {
      const invoicePayload = {
        ...invoiceData,
        items: items,
        summary: summary,
        status: 'draft'
      };

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoicePayload),
      });

      if (response.ok) {
        const { invoice } = await response.json();
        router.push(`/invoices/${invoice.id}`);
      } else {
        console.error('Failed to save invoice');
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendInvoice = async () => {
    if (!isValid || items.length === 0) {
      return;
    }

    setIsSaving(true);
    try {
      const invoicePayload = {
        ...invoiceData,
        items: items,
        summary: summary,
        status: 'sent'
      };

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoicePayload),
      });

      if (response.ok) {
        const { invoice } = await response.json();
        // Send email notification
        await fetch(`/api/invoices/${invoice.id}/send`, {
          method: 'POST',
        });
        router.push(`/invoices/${invoice.id}`);
      } else {
        console.error('Failed to send invoice');
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Create Invoice
          </h1>
          <p className="text-gray-600 mt-1">Create a new invoice for your customer</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSaveInvoice}
            disabled={isSaving || !isValid || items.length === 0}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button
            onClick={handleSendInvoice}
            disabled={isSaving || !isValid || items.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4 mr-2" />
            Send Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Details */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={invoiceData.customerName}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="Enter customer name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="customerEmail">Customer Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={invoiceData.customerEmail}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, customerEmail: e.target.value }))}
                  placeholder="customer@example.com"
                />
              </div>
              
              <div>
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  value={invoiceData.invoiceNumber}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  placeholder="INV-001"
                />
              </div>
              
              <div>
                <Label htmlFor="invoiceDate">Invoice Date</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={invoiceData.invoiceDate}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={invoiceData.dueDate}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="terms">Terms & Conditions</Label>
                <textarea
                  id="terms"
                  value={invoiceData.terms}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, terms: e.target.value }))}
                  placeholder="Enter terms and conditions"
                  className="w-full p-2 border rounded-md resize-none"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={invoiceData.notes}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes"
                  className="w-full p-2 border rounded-md resize-none"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items Section */}
        <div className="lg:col-span-2">
          <AddItemComponent
            documentType="purchase_voucher"
            onSummaryChange={setSummary}
            onValidationChange={setIsValid}
            showSummary={true}
            onExportData={setexporteditem}
            className="space-y-6"
          />
        </div>
      </div>

      {/* Validation Summary */}
      {!isValid && validationErrors.length > 0 && (
        <div className="mt-6">
          <Card className="border-red-200">
            <CardContent className="p-4">
              <div className="text-red-600">
                <h3 className="font-medium mb-2">Please fix the following issues:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    <code>
      {exporteditem}
    </code>
      {/* Invoice Summary */}
      {summary.itemCount > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{summary.itemCount}</div>
                  <div className="text-sm text-gray-600">Items</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">₹{summary.subTotal.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Subtotal</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">₹{summary.totalGST.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Total GST</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">₹{summary.grandTotal.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Grand Total</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CreateInvoicePage;

// // API Route Example
// // app/api/items/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { Item, Product, Service } from '@/server/features/items/core/entities/Item';
// import { Category } from '@/server/features/items/core/entities/Category';
// import { Unit } from '@/server/features/items/core/entities/Unit';

// // Mock data for demonstration - replace with your actual database calls
// const mockItems: Item[] = [
//   new Product(
//     "1",
//     "Black Wheat (2kg)",
//     new Category("1", "Food Items"),
//     "38021000",
//     80.00,
//     false,
//     18,
//     70.00,
//     false,
//     new Unit("1", "PAC"),
//     100,
//     new Date(),
//     null,
//     null
//   ),
//   new Product(
//     "2",
//     "Black Wheat (5kg)",
//     new Category("1", "Food Items"),
//     "38021000",
//     240.00,
//     false,
//     0,
//     200.00,
//     false,
//     new Unit("1", "PAC"),
//     50,
//     new Date(),
//     null,
//     null
//   ),
//   new Service(
//     "3",
//     "Consulting Service",
//     new Category("2", "Services"),
//     "998314",
//     1000.00,
//     true,
//     18,
//     0,
//     false,
//     new Date(),
//     null,
//     null
//   ),
// ];

// export async function GET(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const category = searchParams.get('category');
//     const type = searchParams.get('type');
//     const search = searchParams.get('search');

//     let filteredItems = mockItems;

//     // Apply filters
//     if (category) {
//       filteredItems = filteredItems.filter(item => item.category.id === category);
//     }

//     if (type && type !== 'all') {
//       filteredItems = filteredItems.filter(item => 
//         type === 'product' ? item instanceof Product : item instanceof Service
//       );
//     }

//     if (search) {
//       filteredItems = filteredItems.filter(item =>
//         item.name.toLowerCase().includes(search.toLowerCase()) ||
//         item.hsn_sac.toLowerCase().includes(search.toLowerCase())
//       );
//     }

//     // Transform to API response format
//     const response = {
//       items: filteredItems.map(item => ({
//         id: item.id,
//         name: item.name,
//         category: {
//           id: item.category.id,
//           name: item.category.name
//         },
//         hsn_sac: item.hsn_sac,
//         salePrice: item.salePrice,
//         taxable: item.taxable,
//         gstRate: item.gstRate,
//         purchasePrice: item.purchasePrice,
//         gstIncluded: item.gstIncluded,
//         type: item instanceof Product ? 'product' : 'service',
//         ...(item instanceof Product && {
//           unit: {
//             id: item.unit.id,
//             label: item.unit.label
//           },
//           stock: item.stock
//         }),
//         createdAt: item.createdAt.toISOString(),
//         updatedAt: item.updatedAt?.toISOString() || null,
//         deletedAt: item.deletedAt?.toISOString() || null
//       })),
//       total: filteredItems.length,
//       pagination: {
//         page: 1,
//         limit: 50,
//         total: filteredItems.length,
//         totalPages: 1
//       }
//     };

//     return NextResponse.json(response);
//   } catch (error) {
//     console.error('Error fetching items:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
    
//     // Validate required fields
//     if (!body.name || !body.category || !body.hsn_sac) {
//       return NextResponse.json(
//         { error: 'Missing required fields' },
//         { status: 400 }
//       );
//     }

//     // Create new item (mock implementation)
//     const newItem = {
//       id: Date.now().toString(),
//       ...body,
//       createdAt: new Date().toISOString(),
//       updatedAt: null,
//       deletedAt: null
//     };

//     // In real implementation, save to database
//     mockItems.push(newItem as any);

//     return NextResponse.json(
//       { 
//         item: newItem,
//         message: 'Item created successfully' 
//       },
//       { status: 201 }
//     );
//   } catch (error) {
//     console.error('Error creating item:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

// // Store configuration example
// // store/store.ts
// import { configureStore } from '@reduxjs/toolkit';
// import itemsReducer from './slices/itemsSlice';

// export const store = configureStore({
//   reducer: {
//     items: itemsReducer,
//     // Add other reducers here
//   },
//   middleware: (getDefaultMiddleware) =>
//     getDefaultMiddleware({
//       serializableCheck: {
//         ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
//       },
//     }),
// });

// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;