"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { ArrowLeft, Save, X, Plus, Package, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from 'react-toastify';
import { Unit } from "@/server/features/items/core/entities/Unit";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Gst } from "@/server/features/items/core/entities/Gst";

// Types from your models
interface Category {
  id: string;
  name: string;
  description?: string;
  parentCategory?: Category;
}

interface ItemFormData {
  id?: string;
  name: string;
  type: "product" | "service";
  category_id: string; // Updated to match API
  hsn_sac: string;
  salePrice: number;
  salePriceInclusive: boolean;
  gstTaxPercent: number;
  purchasePrice?: number;
  purchasePriceInclusive?: boolean;
  unit_code?: string; // Updated to match API
  openingQuantity?: number;
  openingStockDate?: string;
  mfgDate?: string;
  expDate?: string;
  barcode?: string;
  discount?: {
    value: number;
    type: "fixed" | "percent";
  };
  lowStockAlert?: number;
}

// GST rates commonly used in India
const GST_RATES = Gst.defaultGsts().map(gst => gst.rate);

export default function ItemAddPage() {
  // using fpoid from redux store 
  const user = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();

  const fpoId = user.fpoId;

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  // Dialog states
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showUnitDialog, setShowUnitDialog] = useState(false);

  // New category/unit form states
  const [newCategory, setNewCategory] = useState({ name: "", description: "", parentCategoryId: "" });
  const [newUnit, setNewUnit] = useState({ code: "", label: "" });

  const [formData, setFormData] = useState<ItemFormData>({
    name: "",
    type: "product",
    category_id: "", // Updated field name
    hsn_sac: "",
    salePrice: 0,
    salePriceInclusive: false,
    gstTaxPercent: 18,
    purchasePrice: 0,
    purchasePriceInclusive: false,
    unit_code: "", // Updated field name
    openingQuantity: 0,
    openingStockDate: "",
    mfgDate: "",
    expDate: "",
    barcode: "",
    discount: {
      value: 0,
      type: "percent"
    },
    lowStockAlert: 0
  });

  // Load initial data
  useEffect(() => {
    if (fpoId) {
      loadCategories();
      loadUnits();
    }
  }, [fpoId]);

  const loadCategories = async () => {
    try {
      const response = await fetch(`/api/items/categories?fpo_id=${fpoId}`);
      if (response.ok) {
        const data = await response.json();
        const categorylist = data.categories || [];

        setCategories(categorylist);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      // Fallback data
      setCategories([
        { id: "1", name: "General", description: "General items" },
        { id: "2", name: "Fertilizers", description: "Agricultural fertilizers" },
        { id: "3", name: "Seeds", description: "Agricultural seeds" },
      ]);
    }
  };

  const loadUnits = async () => {
    try {
      const response = await fetch(`/api/items/units?fpo_id=${fpoId}`);
      if (response.ok) {
        const data = await response.json();

        setUnits([...data.units]);
      }
    } catch (error) {
      console.error('Error loading units:', error);
      // Fallback to default units
      const unitlist = Unit.defaultUnits();
      setUnits(unitlist);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDiscountChange = (field: "value" | "type", value: any) => {
    setFormData(prev => ({
      ...prev,
      discount: {
        ...prev.discount!,
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error("Item name is required");
      return;
    }

    if (!formData.category_id) {
      toast.error("Please select a category");
      return;
    }

    if (!formData.hsn_sac.trim()) {
      toast.error("HSN/SAC code is required");
      return;
    }

    if (formData.type === "product" && !formData.unit_code) {
      toast.error("Please select a unit for the product");
      return;
    }

    if (!fpoId) {
      toast.error("FPO ID is missing");
      return;
    }

    setLoading(true);

    try {
      // Prepare data according to API expectations
      const requestData: any = {
        name: formData.name.trim(),
        type: formData.type,
        category_id: formData.category_id, // Updated field name
        hsn_sac: formData.hsn_sac.trim(),
        salePrice: Number(formData.salePrice),
        salePriceInclusive: formData.salePriceInclusive,
        gstTaxPercent: Number(formData.gstTaxPercent),
        fpo_id: fpoId,
      };

      // Add product-specific fields
      if (formData.type === "product") {
        Object.assign(requestData, {
          unit_code: formData.unit_code, // Updated field name
          purchasePrice: Number(formData.purchasePrice) || 0,
          purchasePriceInclusive: formData.purchasePriceInclusive || false,
          openingQuantity: Number(formData.openingQuantity) || 0,
          openingStockDate: formData.openingStockDate || null,
          mfgDate: formData.mfgDate || null,
          expDate: formData.expDate || null,
          barcode: formData.barcode?.trim() || null,
          lowStockAlert: Number(formData.lowStockAlert) || 0
        });

        // Add discount if provided
        if (formData.discount && formData.discount.value > 0) {
          requestData.discount = {
            value: Number(formData.discount.value),
            type: formData.discount.type
          };
        }
      }

      console.log('Sending request data:', requestData);

      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      if (result.error) {
        throw new Error(result.error);
      }

      console.log('Item created successfully:', result);
      toast.success(result.message || "Item created successfully!");

      // Reset form after successful creation
      setFormData({
        name: "",
        type: "product",
        category_id: "",
        hsn_sac: "",
        salePrice: 0,
        salePriceInclusive: false,
        gstTaxPercent: 18,
        purchasePrice: 0,
        purchasePriceInclusive: false,
        unit_code: "",
        openingQuantity: 0,
        openingStockDate: "",
        mfgDate: "",
        expDate: "",
        barcode: "",
        discount: {
          value: 0,
          type: "percent"
        },
        lowStockAlert: 0
      });

      // Optionally navigate back to items list
      // router.push('/Items/ItemList');

    } catch (error) {
      console.error('Error creating item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create item';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      const response = await fetch('/api/items/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newCategory,
          fpo_id: fpoId
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const category = result.data || result;
        loadCategories()
        setFormData(prev => ({ ...prev, category_id: category.id })); // Updated field name
        setNewCategory({ name: "", description: "", parentCategoryId: "" });
        setShowCategoryDialog(false);
        toast.success("Category added successfully!");
      } else {
        throw new Error('Failed to add category');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error("Failed to add category");
    }
  };

  const handleAddUnit = async () => {
    if (!newUnit.code.trim() || !newUnit.label.trim()) {
      toast.error("Both unit code and label are required");
      return;
    }

    try {
      const response = await fetch('/api/items/units', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newUnit,
          fpo_id: fpoId
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const unit = result.data || result;
        loadUnits()
        setFormData(prev => ({ ...prev, unit_code: unit.code })); // Updated field name
        setNewUnit({ code: "", label: "" });
        setShowUnitDialog(false);
        toast.success("Unit added successfully!");
      } else {
        throw new Error('Unit already exists');
      }
    } catch (error) {
      console.error('Error adding unit:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add unit';
      toast.error(errorMessage);
    }
  };

  // Show loading or error state if fpoId is not available
  if (!fpoId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">FPO ID Required</h2>
          <p className="text-muted-foreground">Please ensure you are logged in with a valid FPO account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Add New Item</h1>
            <p className="text-muted-foreground">Create a new product or service</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <X className="mr-2 w-4 h-4" />
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            <Save className="mr-2 w-4 h-4" />
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Item Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Item Type</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.type}
              onValueChange={(value) => handleInputChange("type", value)}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="product" id="product" />
                <Label htmlFor="product" className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Product
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="service" id="service" />
                <Label htmlFor="service" className="flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Service
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Item Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter item name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">
                  Category <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => handleInputChange("category_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="icon">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Add New Category</DialogTitle>
                        <DialogDescription>
                          Create a new category to organize your items.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="categoryName">Category Name *</Label>
                          <Input
                            id="categoryName"
                            value={newCategory.name}
                            onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter category name"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="categoryDesc">Description</Label>
                          <Textarea
                            id="categoryDesc"
                            value={newCategory.description}
                            onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Enter category description (optional)"
                            rows={3}
                          />
                        </div>

                        <div>
                          <Label htmlFor="parentCategory">Parent Category</Label>
                          <Select
                            value={newCategory.parentCategoryId || "__root__"}
                            onValueChange={(value) =>
                              setNewCategory(prev => ({
                                ...prev,
                                parentCategoryId: value === "__root__" ? "" : value
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select parent category (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__root__">None (Root Category)</SelectItem>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => setShowCategoryDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddCategory}>Add Category</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hsn_sac">
                HSN/SAC Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="hsn_sac"
                value={formData.hsn_sac}
                onChange={(e) => handleInputChange("hsn_sac", e.target.value)}
                placeholder="Enter HSN/SAC code"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing Information */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing & Tax</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salePrice">
                  Sale/Service Price <span className="text-red-500">*</span>
                </Label>
                <div className="flex">
                  <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted">
                    ₹
                  </div>
                  <Input
                    id="salePrice"
                    type="number"
                    value={formData.salePrice}
                    onChange={(e) => handleInputChange("salePrice", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="rounded-l-none"
                    min="0"
                    step="0.01"
                    required
                  />
                  <Select
                    value={formData.salePriceInclusive ? "including" : "excluding"}
                    onValueChange={(value) => handleInputChange("salePriceInclusive", value === "including")}
                  >
                    <SelectTrigger className="w-32 rounded-l-none border-l-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excluding">Excluding</SelectItem>
                      <SelectItem value="including">Including</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gstTax">
                  GST Tax <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.gstTaxPercent.toString()}
                  onValueChange={(value) => handleInputChange("gstTaxPercent", parseFloat(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GST_RATES.map((rate) => (
                      <SelectItem key={rate} value={rate.toString()}>
                        {rate}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.type === "product" && (
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">
                  Purchase Price <span className="text-red-500">*</span>
                </Label>
                <div className="flex">
                  <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted">
                    ₹
                  </div>
                  <Input
                    id="purchasePrice"
                    type="number"
                    value={formData.purchasePrice}
                    onChange={(e) => handleInputChange("purchasePrice", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="rounded-l-none"
                    min="0"
                    step="0.01"
                    required
                  />
                  <Select
                    value={formData.purchasePriceInclusive ? "including" : "excluding"}
                    onValueChange={(value) => handleInputChange("purchasePriceInclusive", value === "including")}
                  >
                    <SelectTrigger className="w-32 rounded-l-none border-l-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excluding">Excluding</SelectItem>
                      <SelectItem value="including">Including</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Specific Fields */}
        {formData.type === "product" && (
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">
                    Item Units <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.unit_code}
                      onValueChange={(value) => handleInputChange("unit_code", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit.code} value={unit.code}>
                            {unit.label} ({unit.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Dialog open={showUnitDialog} onOpenChange={setShowUnitDialog}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="icon">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Unit</DialogTitle>
                          <DialogDescription>
                            Create a new unit of measurement
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="unitCode">Unit Code</Label>
                            <Input
                              id="unitCode"
                              value={newUnit.code}
                              onChange={(e) => setNewUnit(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                              placeholder="e.g., KG, PCS"
                            />
                          </div>
                          <div>
                            <Label htmlFor="unitLabel">Unit Label</Label>
                            <Input
                              id="unitLabel"
                              value={newUnit.label}
                              onChange={(e) => setNewUnit(prev => ({ ...prev, label: e.target.value }))}
                              placeholder="e.g., Kilograms, Pieces"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setShowUnitDialog(false)}>
                            Cancel
                          </Button>
                          <Button type="button" onClick={handleAddUnit}>
                            Add Unit
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openingQuantity">Opening Quantity</Label>
                  <Input
                    id="openingQuantity"
                    type="number"
                    value={formData.openingQuantity}
                    onChange={(e) => handleInputChange("openingQuantity", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openingStockDate">Opening Stock Date</Label>
                  <Input
                    id="openingStockDate"
                    type="date"
                    value={formData.openingStockDate}
                    onChange={(e) => handleInputChange("openingStockDate", e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mfgDate">Manufacturing Date</Label>
                  <Input
                    id="mfgDate"
                    type="date"
                    value={formData.mfgDate}
                    onChange={(e) => handleInputChange("mfgDate", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expDate">Expiry Date</Label>
                  <Input
                    id="expDate"
                    type="date"
                    value={formData.expDate}
                    onChange={(e) => handleInputChange("expDate", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode/Serial No</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => handleInputChange("barcode", e.target.value)}
                    placeholder="Enter barcode or serial number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lowStockAlert">
                    Set Low Stock Alert
                    <Badge variant="secondary" className="ml-2">Optional</Badge>
                  </Label>
                  <Input
                    id="lowStockAlert"
                    type="number"
                    value={formData.lowStockAlert}
                    onChange={(e) => handleInputChange("lowStockAlert", parseFloat(e.target.value) || 0)}
                    placeholder="Alert when stock is below..."
                    min="0"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Discount on Sale</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.discount?.value}
                    onChange={(e) => handleDiscountChange("value", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                  />
                  <Select
                    value={formData.discount?.type}
                    onValueChange={(value) => handleDiscountChange("type", value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Final Actions */}
        <div className="flex justify-end gap-2 pt-6">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 w-4 h-4" />
            {loading ? "Saving..." : "Save Item"}
          </Button>
        </div>
      </form>
    </div>
  );
}