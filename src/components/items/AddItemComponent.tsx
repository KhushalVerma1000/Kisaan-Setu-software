// components/AddItemComponent.tsx
"use client"
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, X, Package, ShoppingCart, Calculator, Download, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useLineItemManager, useLineItemValidation } from '@/hooks/useLineItemManager';
import { Item, Product, Service } from '@/server/features/items/core/entities/Item';
import { Category } from '@/server/features/items/core/entities/Category';
import { Unit } from '@/server/features/items/core/entities/Unit';
import { 
  fetchItemsAsync, 
  selectAllItems, 
  selectItemsLoading, 
  selectItemsError,
  clearError 
} from '@/store/slices/itemsSlice';
import { RootState } from '@/store/store';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { SelectedItem } from '@/server/features/items/core/entities/selecteditem';

interface AddItemComponentProps {
  documentType: 'invoice' | 'purchase_voucher' | 'quotation';
  initialItems?: any[];
  onSummaryChange?: (summary: LineItemSummary) => void;
  onItemsChange?: (items: LineItem[]) => void;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
  onExportData?: (data: any) => void;
  className?: string;
  readOnly?: boolean;
  showSummary?: boolean;
  compact?: boolean;
}

interface LineItemSummary {
  subTotal: number;
  totalDiscount: number;
  totalGST: number;
  shipmentAmount: number;
  roundOff: number;
  grandTotal: number;
  itemCount: number;
}

export interface LineItem {
  id: string;
  item: Item;
  quantity: number;
  unitPrice: number;
  discount: { value: number; type: 'fixed' | 'percent' };
  gstConfig: { rate: number; type: 'exempt' | 'excluding' | 'including' };
  getLineTotal(): number;
  isProduct(): boolean;
}

const GST_RATES = [0, 3, 5, 12, 18, 28];

const AddItemComponent: React.FC<AddItemComponentProps> = ({
  documentType,
  initialItems,
  onSummaryChange,
  onItemsChange,
  onValidationChange,
  onExportData,
  className = '',
  readOnly = false,
  showSummary = true,
  compact = false
}) => {
  const dispatch = useAppDispatch();
  const itemsData = useAppSelector(selectAllItems);
  const itemsLoading = useAppSelector(selectItemsLoading);
  const itemsError = useAppSelector(selectItemsError);
  
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedGSTRate, setSelectedGSTRate] = useState<number>(18);
  
  const createItemInstance = useCallback((item: any): Item => {
    const category = new Category(
      item.category?.id || 'default',
      item.category?.name || 'General',
      item.category?.description
    );

    const unit = item.unit ? new Unit(item.unit.code || item.unit.value, item.unit.label) : new Unit('NOS', 'Numbers');

    if (item.type === 'product') {
      return new Product(
        item.id, item.name, category, item.hsn_sac || '', item.salePrice || 0,
        item.salePriceInclusive || false, item.gstTaxPercent || 0, item.purchasePrice || 0,
        item.purchasePriceInclusive || false, unit, item.openingQuantity || 0,
        item.openingStockDate ? new Date(item.openingStockDate) : null,
        item.mfgDate ? new Date(item.mfgDate) : null,
        item.expDate ? new Date(item.expDate) : null,
        item.currentStock || item.openingQuantity || 0,
        item.lastStockUpdate ? new Date(item.lastStockUpdate) : null,
        item.barcode, item.discount, item.lowStockAlert
      );
    } else if (item.type === 'service') {
      return new Service(
        item.id, item.name, category, item.hsn_sac || '', item.salePrice || 0,
        item.salePriceInclusive || false, item.gstTaxPercent || 0
      );
    } else {
      return new Product(
        item.id, item.name, category, item.hsn_sac || '', item.salePrice || 0,
        item.salePriceInclusive || false, item.gstTaxPercent || 0, item.purchasePrice || 0,
        item.purchasePriceInclusive || false, unit, item.openingQuantity || 0,
        item.openingStockDate ? new Date(item.openingStockDate) : null,
        item.mfgDate ? new Date(item.mfgDate) : null,
        item.expDate ? new Date(item.expDate) : null,
        item.currentStock || item.openingQuantity || 0,
        item.lastStockUpdate ? new Date(item.lastStockUpdate) : null,
        item.barcode, item.discount, item.lowStockAlert || 5
      );
    }
  }, []);
  
  const items = useMemo(() => {
    if (!itemsData || !Array.isArray(itemsData)) return [];
    return itemsData.map(createItemInstance);
  }, [itemsData, createItemInstance]);
  
  const lineItemHook = useLineItemManager(initialItems, documentType);
  const { errors, isValid } = useLineItemValidation(lineItemHook, documentType);

  useEffect(() => {
    if (itemsData.length === 0 && !itemsLoading && !itemsError) {
      dispatch(fetchItemsAsync());
    }
  }, [dispatch, itemsData.length, itemsLoading, itemsError]);

  useEffect(() => {
    if (onSummaryChange) {
      onSummaryChange({
        subTotal: lineItemHook.summary.subTotal,
        totalDiscount: lineItemHook.summary.totalDiscount,
        totalGST: lineItemHook.summary.totalGST,
        shipmentAmount: lineItemHook.summary.shipmentAmount,
        roundOff: lineItemHook.summary.roundOff,
        grandTotal: lineItemHook.summary.grandTotal,
        itemCount: lineItemHook.itemCount
      });
    }
  }, [lineItemHook.summary, lineItemHook.itemCount, onSummaryChange]);

  useEffect(() => {
    if (onItemsChange) {
      onItemsChange(lineItemHook.items);
    }
  }, [lineItemHook.items, onItemsChange]);

  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(isValid, errors);
    }
  }, [isValid, errors, onValidationChange]);

  const handleAddItem = useCallback(() => {
    const selectedItem = items?.find(item => item.id === selectedItemId);
    if (selectedItem && quantity > 0) {
      try {
        lineItemHook.addItem(selectedItem, quantity);
        setSelectedItemId('');
        setQuantity(1);
      } catch (error) {
        console.error('Error adding item:', error);
      }
    }
  }, [selectedItemId, quantity, items, lineItemHook]);

  const handleRemoveItem = useCallback((itemId: string) => {
    lineItemHook.removeItem(itemId);
  }, [lineItemHook]);

  const handleQuantityChange = useCallback((itemId: string, newQuantity: number) => {
    if (newQuantity > 0) {
      try {
        lineItemHook.updateItemQuantity(itemId, newQuantity);
      } catch (error) {
        console.error('Error updating quantity:', error);
      }
    }
  }, [lineItemHook]);

  const handleUnitPriceChange = useCallback((itemId: string, newPrice: number) => {
    if (newPrice >= 0) {
      lineItemHook.updateItemUnitPrice(itemId, newPrice);
    }
  }, [lineItemHook]);

  const handleDiscountChange = useCallback((itemId: string, discount: { value: number; type: 'fixed' | 'percent' }) => {
    lineItemHook.updateItemDiscount(itemId, discount);
  }, [lineItemHook]);

  const handleGSTConfigChange = useCallback((itemId: string, gstConfig: { rate: number; type: 'exempt' | 'excluding' | 'including' }) => {
    lineItemHook.updateItemGSTConfig(itemId, gstConfig);
  }, [lineItemHook]);

  const handleRetry = useCallback(() => {
    dispatch(clearError());
    dispatch(fetchItemsAsync());
  }, [dispatch]);

  const handleExportData = useCallback(() => {
    const exportData = lineItemHook.exportForDocument(documentType);
    
    if (onExportData) {
      onExportData(exportData);
    }
    
    console.log(`Export data for ${documentType}:`, exportData);
  }, [lineItemHook, documentType, onExportData]);

  // Loading state
  if (itemsLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">Loading items...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (itemsError) {
    return (
      <Card className={className}>
        <CardContent className="p-4 sm:p-6">
          <Alert variant="destructive">
            <AlertDescription>
              Error loading items: {itemsError}
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2"
                onClick={handleRetry}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!itemsData || !Array.isArray(itemsData)) {
    return (
      <Card className={className}>
        <CardContent className="p-4 sm:p-6">
          <Alert>
            <AlertDescription>
              No items data available. Please try refreshing the page.
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2"
                onClick={handleRetry}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {/* Add Item Form */}
      {!readOnly && (
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              Add Items
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4">
              {/* Item Selection */}
              <div className="sm:col-span-2 lg:col-span-5">
                <Label htmlFor="item-select" className="text-sm">Select Item</Label>
                <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose an item..." />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{item.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              HSN: {item.hsn_sac}
                              {item instanceof Product && (
                                <span className="ml-2">Stock: {item.currentStock}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right mt-1 sm:mt-0 sm:ml-4 flex-shrink-0">
                            <div className="font-medium text-sm">₹{item.salePrice.toFixed(2)}</div>
                            <Badge variant="secondary" className="text-xs mt-1">
                              {item instanceof Product ? 'Product' : 'Service'}
                            </Badge>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity */}
              <div className="sm:col-span-1 lg:col-span-2">
                <Label htmlFor="quantity" className="text-sm">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  min="1"
                  className="w-full"
                />
              </div>

              {/* GST Rate */}
              <div className="sm:col-span-1 lg:col-span-2">
                <Label htmlFor="gst-rate" className="text-sm">GST Rate (%)</Label>
                <Select value={selectedGSTRate.toString()} onValueChange={(value) => setSelectedGSTRate(Number(value))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="GST Rate" />
                  </SelectTrigger>
                  <SelectContent>
                    {GST_RATES.map(rate => (
                      <SelectItem key={rate} value={rate.toString()}>
                        {rate}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add Button */}
              <div className="sm:col-span-2 lg:col-span-3 flex items-end">
                <Button
                  onClick={handleAddItem}
                  disabled={!selectedItemId || quantity <= 0}
                  className="bg-green-600 hover:bg-green-700 w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Errors */}
      {!isValid && errors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <div className="font-medium mb-2">Please fix the following errors:</div>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Items Table */}
      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
            Items ({lineItemHook.itemCount})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {lineItemHook.isEmpty ? (
            <div className="text-center py-8 sm:py-12">
              <Package className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-sm sm:text-base">No items added yet</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Select an item above to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-3">
                {lineItemHook.items.map((item) => (
                  <Card key={item.id} className="p-3 border">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{item.item.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            HSN: {item.item.hsn_sac} • {item.isProduct() ? 'Product' : 'Service'}
                          </div>
                        </div>
                        {!readOnly && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                            className="ml-2 h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-gray-500">Quantity</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.id, Number(e.target.value))}
                            min="1"
                            className="text-sm h-8"
                            disabled={readOnly}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Unit Price</Label>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleUnitPriceChange(item.id, Number(e.target.value))}
                            min="0"
                            step="0.01"
                            className="text-sm h-8"
                            disabled={readOnly}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-gray-500">Discount</Label>
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              value={item.discount.value}
                              onChange={(e) => handleDiscountChange(item.id, {
                                ...item.discount,
                                value: Number(e.target.value)
                              })}
                              min="0"
                              step="0.01"
                              className="text-sm h-8"
                              disabled={readOnly}
                            />
                            <Select
                              value={item.discount.type}
                              onValueChange={(value: 'fixed' | 'percent') => 
                                handleDiscountChange(item.id, {
                                  ...item.discount,
                                  type: value
                                })
                              }
                              disabled={readOnly}
                            >
                              <SelectTrigger className="w-12 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fixed">₹</SelectItem>
                                <SelectItem value="percent">%</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">GST</Label>
                          <div className="flex gap-1">
                            <Select
                              value={item.gstConfig.rate.toString()}
                              onValueChange={(value) => handleGSTConfigChange(item.id, {
                                ...item.gstConfig,
                                rate: Number(value)
                              })}
                              disabled={readOnly}
                            >
                              <SelectTrigger className="w-14 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {GST_RATES.map(rate => (
                                  <SelectItem key={rate} value={rate.toString()}>
                                    {rate}%
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={item.gstConfig.type}
                              onValueChange={(value: 'exempt' | 'excluding' | 'including') => 
                                handleGSTConfigChange(item.id, {
                                  ...item.gstConfig,
                                  type: value
                                })
                              }
                              disabled={readOnly}
                            >
                              <SelectTrigger className="w-16 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="exempt">Ex</SelectItem>
                                <SelectItem value="excluding">Ex</SelectItem>
                                <SelectItem value="including">In</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-xs text-gray-500">Total:</span>
                        <span className="font-medium text-sm">₹{item.getLineTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 sm:p-3 font-medium text-sm">Item</th>
                      <th className="text-left p-2 sm:p-3 font-medium text-sm">HSN/SAC</th>
                      <th className="text-left p-2 sm:p-3 font-medium text-sm">Qty</th>
                      <th className="text-left p-2 sm:p-3 font-medium text-sm">Unit</th>
                      <th className="text-left p-2 sm:p-3 font-medium text-sm">Price</th>
                      <th className="text-left p-2 sm:p-3 font-medium text-sm">Discount</th>
                      <th className="text-left p-2 sm:p-3 font-medium text-sm">GST</th>
                      <th className="text-left p-2 sm:p-3 font-medium text-sm">Total</th>
                      {!readOnly && <th className="text-left p-2 sm:p-3 font-medium text-sm">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {lineItemHook.items.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 sm:p-3">
                          <div className="font-medium text-sm">{item.item.name}</div>
                          <div className="text-xs text-gray-500">
                            {item.isProduct() ? 'Product' : 'Service'}
                          </div>
                        </td>
                        <td className="p-2 sm:p-3 text-sm">{item.item.hsn_sac}</td>
                        <td className="p-2 sm:p-3">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.id, Number(e.target.value))}
                            min="1"
                            className="w-16 sm:w-20 text-sm"
                            disabled={readOnly}
                          />
                        </td>
                        <td className="p-2 sm:p-3 text-sm">
                          {item.isProduct() ? (item.item as Product).unit.label : 'N/A'}
                        </td>
                        <td className="p-2 sm:p-3">
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleUnitPriceChange(item.id, Number(e.target.value))}
                            min="0"
                            step="0.01"
                            className="w-20 sm:w-24 text-sm"
                            disabled={readOnly}
                          />
                        </td>
                        <td className="p-2 sm:p-3">
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              value={item.discount.value}
                              onChange={(e) => handleDiscountChange(item.id, {
                                ...item.discount,
                                value: Number(e.target.value)
                              })}
                              min="0"
                              step="0.01"
                              className="w-16 sm:w-20 text-sm"
                              disabled={readOnly}
                            />
                            <Select
                              value={item.discount.type}
                              onValueChange={(value: 'fixed' | 'percent') => 
                                handleDiscountChange(item.id, {
                                  ...item.discount,
                                  type: value
                                })
                              }
                              disabled={readOnly}
                            >
                              <SelectTrigger className="w-12 sm:w-16">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fixed">₹</SelectItem>
                                <SelectItem value="percent">%</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </td>
                        <td className="p-2 sm:p-3">
                          <div className="flex gap-1">
                            <Select
                              value={item.gstConfig.rate.toString()}
                              onValueChange={(value) => handleGSTConfigChange(item.id, {
                                ...item.gstConfig,
                                rate: Number(value)
                              })}
                              disabled={readOnly}
                            >
                              <SelectTrigger className="w-14 sm:w-16">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {GST_RATES.map(rate => (
                                  <SelectItem key={rate} value={rate.toString()}>
                                    {rate}%
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={item.gstConfig.type}
                              onValueChange={(value: 'exempt' | 'excluding' | 'including') => 
                                handleGSTConfigChange(item.id, {
                                  ...item.gstConfig,
                                  type: value
                                })
                              }
                              disabled={readOnly}
                            >
                              <SelectTrigger className="w-16 sm:w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="exempt">Exempt</SelectItem>
                                <SelectItem value="excluding">Excl</SelectItem>
                                <SelectItem value="including">Incl</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </td>
                        <td className="p-2 sm:p-3 font-medium text-sm">
                          ₹{item.getLineTotal().toFixed(2)}
                        </td>
                        {!readOnly && (
                          <td className="p-2 sm:p-3">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id)}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Section */}
      {showSummary && !lineItemHook.isEmpty && (
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600">Sub Total:</span>
                  <span className="font-medium">₹{lineItemHook.summary.subTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600">Total Discount:</span>
                  <span className="font-medium text-red-600">-₹{lineItemHook.summary.totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600">Total GST:</span>
                  <span className="font-medium">₹{lineItemHook.summary.totalGST.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm sm:text-base">
                  <span className="text-gray-600">Shipment Amount:</span>
                  <Input
                    type="number"
                    value={lineItemHook.summary.shipmentAmount}
                    onChange={(e) => lineItemHook.setShipmentAmount(Number(e.target.value))}
                    min="0"
                    step="0.01"
                    className="w-20 sm:w-24 text-right text-sm"
                    disabled={readOnly}
                  />
                </div>
                <div className="flex justify-between items-center text-sm sm:text-base">
                  <span className="text-gray-600">Round Off:</span>
                  <Input
                    type="number"
                    value={lineItemHook.summary.roundOff}
                    onChange={(e) => lineItemHook.setRoundOff(Number(e.target.value))}
                    step="0.01"
                    className="w-20 sm:w-24 text-right text-sm"
                    disabled={readOnly}
                  />
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-base sm:text-lg">Grand Total:</span>
                  <span className="font-bold text-base sm:text-lg text-green-600">
                    ₹{lineItemHook.summary.grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3 text-sm sm:text-base">GST Breakdown:</h4>
                <div className="space-y-2">
                  {Object.entries(lineItemHook.lineItemManager.getGSTBreakdown()).map(([rate, breakdown]) => (
                    <div key={rate} className="flex justify-between text-sm">
                      <span className="text-gray-600">GST {rate}%:</span>
                      <span>₹{breakdown.gst.toFixed(2)} (on ₹{breakdown.taxable.toFixed(2)})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-2">
          {!readOnly && !lineItemHook.isEmpty && (
            <Button
              variant="outline"
              onClick={lineItemHook.clearAllItems}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              Clear All Items
            </Button>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {!lineItemHook.isEmpty && onExportData && (
            <Button
              onClick={handleExportData}
              className="bg-purple-600 hover:bg-purple-700 text-sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddItemComponent;