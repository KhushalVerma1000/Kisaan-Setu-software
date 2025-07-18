// src/hooks/useLineItemManager.ts
import { useState, useCallback, useEffect } from 'react';
import { LineItemManager, SelectedItem, ILineItemSummary, IDiscountConfig, IGSTConfig } from '@/server/features/items/core/entities/selecteditem';
import { Item, Product, Service } from '@/server/features/items/core/entities/Item';

export interface ILineItemHook {
  lineItemManager: LineItemManager;
  items: SelectedItem[];
  summary: ILineItemSummary;
  addItem: (item: Item, quantity?: number, unitPrice?: number) => SelectedItem;
  removeItem: (itemId: string) => boolean;
  updateItemQuantity: (itemId: string, quantity: number) => boolean;
  updateItemUnitPrice: (itemId: string, unitPrice: number) => boolean;
  updateItemDiscount: (itemId: string, discount: IDiscountConfig) => boolean;
  updateItemGSTConfig: (itemId: string, gstConfig: IGSTConfig) => boolean;
  setShipmentAmount: (amount: number) => void;
  setRoundOff: (amount: number) => void;
  clearAllItems: () => void;
  validateItems: () => { valid: boolean; errors: string[] };
  exportForDocument: (type: 'invoice' | 'purchase_voucher' | 'quotation') => any;
  importItems: (data: any[]) => void;
  isEmpty: boolean;
  itemCount: number;
  // New methods for better product/service handling
  getProductItems: () => SelectedItem[];
  getServiceItems: () => SelectedItem[];
  getProductsTotal: () => number;
  getServicesTotal: () => number;
  hasProducts: boolean;
  hasServices: boolean;
  checkStockAvailability: (productId: string, requestedQuantity: number) => { available: boolean; currentStock: number };
}

export const useLineItemManager = (
  initialItems?: any[], 
  documentType: 'invoice' | 'purchase_voucher' | 'quotation' = 'invoice'
): ILineItemHook => {
  const [lineItemManager] = useState(() => new LineItemManager());
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [summary, setSummary] = useState<ILineItemSummary>({
    subTotal: 0,
    totalDiscount: 0,
    totalGST: 0,
    shipmentAmount: 0,
    roundOff: 0,
    grandTotal: 0,
  });

  // Update local state when manager changes
  const refreshState = useCallback(() => {
    setItems(lineItemManager.getAllItems());
    setSummary(lineItemManager.getSummary());
  }, [lineItemManager]);

  // Initialize with data if provided
  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      lineItemManager.importItems(initialItems);
      refreshState();
    }
  }, [initialItems, lineItemManager, refreshState]);

  // Enhanced addItem with conditional stock validation for products
  const addItem = useCallback((item: Item, quantity: number = 1, unitPrice?: number): SelectedItem => {
    // Check stock availability for products (only for invoice, not for purchase_voucher or quotation)
    if (item.type === 'product' && documentType === 'invoice') {
      const product = item as Product;
      if (product.currentStock < quantity) {
        throw new Error(`Insufficient stock. Available: ${product.currentStock}, Requested: ${quantity}`);
      }
    }

    const selectedItem = lineItemManager.addItem(item, quantity, unitPrice);
    refreshState();
    return selectedItem;
  }, [lineItemManager, refreshState, documentType]);

  const removeItem = useCallback((itemId: string): boolean => {
    const result = lineItemManager.removeItem(itemId);
    refreshState();
    return result;
  }, [lineItemManager, refreshState]);

  // Enhanced quantity update with conditional stock validation
  const updateItemQuantity = useCallback((itemId: string, quantity: number): boolean => {
    const selectedItem = lineItemManager.getItem(itemId);
    if (!selectedItem) return false;

    // Check stock availability for products (only for invoice, not for purchase_voucher or quotation)
    if (selectedItem.item.type === 'product' && documentType === 'invoice') {
      const product = selectedItem.item as Product;
      if (product.currentStock < quantity) {
        throw new Error(`Insufficient stock. Available: ${product.currentStock}, Requested: ${quantity}`);
      }
    }

    const result = lineItemManager.updateItemQuantity(itemId, quantity);
    refreshState();
    return result;
  }, [lineItemManager, refreshState, documentType]);

  const updateItemUnitPrice = useCallback((itemId: string, unitPrice: number): boolean => {
    const result = lineItemManager.updateItemUnitPrice(itemId, unitPrice);
    refreshState();
    return result;
  }, [lineItemManager, refreshState]);

  const updateItemDiscount = useCallback((itemId: string, discount: IDiscountConfig): boolean => {
    const result = lineItemManager.updateItemDiscount(itemId, discount);
    refreshState();
    return result;
  }, [lineItemManager, refreshState]);

  const updateItemGSTConfig = useCallback((itemId: string, gstConfig: IGSTConfig): boolean => {
    const result = lineItemManager.updateItemGSTConfig(itemId, gstConfig);
    refreshState();
    return result;
  }, [lineItemManager, refreshState]);

  const setShipmentAmount = useCallback((amount: number): void => {
    lineItemManager.setShipmentAmount(amount);
    refreshState();
  }, [lineItemManager, refreshState]);

  const setRoundOff = useCallback((amount: number): void => {
    lineItemManager.setRoundOff(amount);
    refreshState();
  }, [lineItemManager, refreshState]);

  const clearAllItems = useCallback((): void => {
    lineItemManager.clearAllItems();
    refreshState();
  }, [lineItemManager, refreshState]);

  const validateItems = useCallback(() => {
    return lineItemManager.validateItems();
  }, [lineItemManager]);

  const exportForDocument = useCallback((type: 'invoice' | 'purchase_voucher' | 'quotation') => {
    switch (type) {
      case 'invoice':
        return lineItemManager.exportForInvoice();
      case 'purchase_voucher':
        return lineItemManager.exportForPurchaseVoucher();
      case 'quotation':
        return lineItemManager.exportForQuotation();
      default:
        return lineItemManager.exportForInvoice();
    }
  }, [lineItemManager]);

  const importItems = useCallback((data: any[]): void => {
    lineItemManager.importItems(data);
    refreshState();
  }, [lineItemManager, refreshState]);

  // New methods for better product/service handling
  const getProductItems = useCallback((): SelectedItem[] => {
    return items.filter(item => item.item.type === 'product');
  }, [items]);

  const getServiceItems = useCallback((): SelectedItem[] => {
    return items.filter(item => item.item.type === 'service');
  }, [items]);

  const getProductsTotal = useCallback((): number => {
    return getProductItems().reduce((total, item) => total + item.getLineTotal(), 0);
  }, [getProductItems]);

  const getServicesTotal = useCallback((): number => {
    return getServiceItems().reduce((total, item) => total + item.getLineTotal(), 0);
  }, [getServiceItems]);

  const checkStockAvailability = useCallback((productId: string, requestedQuantity: number) => {
    const selectedItem = items.find(item => item.item.id === productId);
    if (!selectedItem || selectedItem.item.type !== 'product') {
      return { available: false, currentStock: 0 };
    }

    const product = selectedItem.item as Product;
    return {
      available: product.currentStock >= requestedQuantity,
      currentStock: product.currentStock
    };
  }, [items]);

  // Computed properties
  const hasProducts = items.some(item => item.item.type === 'product');
  const hasServices = items.some(item => item.item.type === 'service');

  return {
    lineItemManager,
    items,
    summary,
    addItem,
    removeItem,
    updateItemQuantity,
    updateItemUnitPrice,
    updateItemDiscount,
    updateItemGSTConfig,
    setShipmentAmount,
    setRoundOff,
    clearAllItems,
    validateItems,
    exportForDocument,
    importItems,
    isEmpty: items.length === 0,
    itemCount: items.length,
    // New methods
    getProductItems,
    getServiceItems,
    getProductsTotal,
    getServicesTotal,
    hasProducts,
    hasServices,
    checkStockAvailability,
  };
};

// Enhanced validation hook with product/service specific validations
export const useLineItemValidation = (lineItemHook: ILineItemHook, documentType: 'invoice' | 'purchase_voucher' | 'quotation' = 'invoice') => {
  const [errors, setErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    const validation = lineItemHook.validateItems();
    const additionalErrors: string[] = [];

    // Additional validation for products (only for invoice)
    if (documentType === 'invoice') {
      lineItemHook.getProductItems().forEach((item, index) => {
        const product = item.item as Product;
        
        // Check stock availability
        if (product.currentStock < item.quantity) {
          additionalErrors.push(`Product ${index + 1}: Insufficient stock (Available: ${product.currentStock}, Required: ${item.quantity})`);
        }

        // Check for low stock warning
        if (product.isLowStock()) {
          additionalErrors.push(`Product ${index + 1}: Low stock warning (Current: ${product.currentStock}, Alert Level: ${product.lowStockAlert})`);
        }

        // Check for out of stock
        if (product.isOutOfStock()) {
          additionalErrors.push(`Product ${index + 1}: Out of stock`);
        }
      });
    }

    const allErrors = [...validation.errors, ...additionalErrors];
    setErrors(allErrors);
    setIsValid(allErrors.length === 0);
  }, [lineItemHook.items, lineItemHook.validateItems, lineItemHook.getProductItems, documentType]);

  return { errors, isValid };
};

// Hook for auto-calculating totals
export const useAutoCalculation = (lineItemHook: ILineItemHook, onSummaryChange?: (summary: ILineItemSummary) => void) => {
  useEffect(() => {
    if (onSummaryChange) {
      onSummaryChange(lineItemHook.summary);
    }
  }, [lineItemHook.summary, onSummaryChange]);
};

// Enhanced document type config with product/service considerations
export const useDocumentTypeConfig = (documentType: 'invoice' | 'purchase_voucher' | 'quotation') => {
  const config = {
    invoice: {
      showShipment: true,
      showRoundOff: true,
      showGST: true,
      showDiscount: true,
      readOnly: false,
      showStockInfo: true, // Show stock information for products
      validateStock: true, // Validate stock before adding items
    },
    purchase_voucher: {
      showShipment: true,
      showRoundOff: true,
      showGST: true,
      showDiscount: true,
      readOnly: false,
      showStockInfo: true,
      validateStock: false, // Don't validate stock for purchases
    },
    quotation: {
      showShipment: false,
      showRoundOff: false,
      showGST: false,
      showDiscount: true,
      readOnly: false,
      showStockInfo: false, // Don't show stock info in quotations
      validateStock: false, // Don't validate stock for quotations
    },
  };

  return config[documentType];
};

// Hook for managing item-specific behavior
export const useItemTypeManager = (lineItemHook: ILineItemHook) => {
  const getItemDisplayInfo = useCallback((selectedItem: SelectedItem) => {
    const baseInfo = selectedItem.getItemDetails();
    
    if (selectedItem.item.type === 'product') {
      const product = selectedItem.item as Product;
      return {
        ...baseInfo,
        unit: product.unit,
        barcode: product.barcode,
        currentStock: product.currentStock,
        isLowStock: product.isLowStock(),
        isOutOfStock: product.isOutOfStock(),
        stockValue: product.getStockValue(),
      };
    } else {
      return {
        ...baseInfo,
        unit: null,
        barcode: null,
        currentStock: null,
        isLowStock: false,
        isOutOfStock: false,
        stockValue: 0,
      };
    }
  }, []);

  const canUpdateQuantity = useCallback((selectedItem: SelectedItem, newQuantity: number, documentType: 'invoice' | 'purchase_voucher' | 'quotation' = 'invoice') => {
    if (selectedItem.item.type === 'service') {
      return true; // Services can have any quantity
    }
    
    // For purchase vouchers and quotations, don't validate stock
    if (documentType === 'purchase_voucher' || documentType === 'quotation') {
      return true;
    }
    
    // For invoices, validate stock availability
    const product = selectedItem.item as Product;
    return product.currentStock >= newQuantity;
  }, []);

  return {
    getItemDisplayInfo,
    canUpdateQuantity,
  };
};