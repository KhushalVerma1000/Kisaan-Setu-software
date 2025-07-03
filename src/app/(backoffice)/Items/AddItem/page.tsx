"use client"
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserDetails } from "@/contexts/UserDetailsContext";

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

// Types from your models
interface Category {
  id: string;
  name: string;
  description?: string;
  parentCategory?: Category;
}

interface Unit {
  code: string;
  label: string;
}

interface ItemFormData {
  id?: string;
  name: string;
  type: "product" | "service";
  category: string;
  hsn_sac: string;
  salePrice: number;
  salePriceInclusive: boolean;
  gstTaxPercent: number;
  purchasePrice?: number;
  purchasePriceInclusive?: boolean;
  unit?: string;
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
const GST_RATES = [0, 3, 5, 12, 18, 28];

export default function ItemAddPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const { profile } = useUserDetails();

  // Dialog states
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showUnitDialog, setShowUnitDialog] = useState(false);
  
  // New category/unit form states
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [newUnit, setNewUnit] = useState({ code: "", label: "" });

  const [formData, setFormData] = useState<ItemFormData>({
    name: "",
    type: "product",
    category: "",
    hsn_sac: "",
    salePrice: 0,
    salePriceInclusive: false,
    gstTaxPercent: 18,
    purchasePrice: 0,
    purchasePriceInclusive: false,
    unit: "",
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
    loadCategories();
    loadUnits();
  }, []);

  const loadCategories = async () => {
    try {
      // Replace with your API call
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
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
      // Replace with your API call
      const response = await fetch('/api/units');
      if (response.ok) {
        const data = await response.json();
        setUnits(data);
      }
    } catch (error) {
      console.error('Error loading units:', error);
      // Fallback to default units
      setUnits([
        { code: "PCS", label: "Pieces" },
        { code: "KGS", label: "Kilograms" },
        { code: "LTR", label: "Liters" },
        { code: "BAG", label: "Bags" },
        { code: "BOX", label: "Box" },
        { code: "QTL", label: "Quintal" },
      ]);
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
    
    if (!formData.name.trim()) {
      toast.error("Item name is required");
      return;
    }
    
    if (!formData.category) {
      toast.error("Please select a category");
      return;
    }
    
    if (!formData.hsn_sac.trim()) {
      toast.error("HSN/SAC code is required");
      return;
    }

    if (formData.type === "product" && !formData.unit) {
      toast.error("Please select a unit for the product");
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formData, fpo_id: profile?.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to create item');
      }

      toast.success("Item created successfully!");
      router.push('/items'); // Adjust route as needed
    } catch (error) {
      console.error('Error creating item:', error);
      toast.error("Failed to create item");
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
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory),
      });

      if (response.ok) {
        const category = await response.json();
        setCategories(prev => [...prev, category]);
        setFormData(prev => ({ ...prev, category: category.id }));
        setNewCategory({ name: "", description: "" });
        setShowCategoryDialog(false);
        toast.success("Category added successfully!");
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
      const response = await fetch('/api/units', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUnit),
      });

      if (response.ok) {
        const unit = await response.json();
        setUnits(prev => [...prev, unit]);
        setFormData(prev => ({ ...prev, unit: unit.code }));
        setNewUnit({ code: "", label: "" });
        setShowUnitDialog(false);
        toast.success("Unit added successfully!");
      }
    } catch (error) {
      console.error('Error adding unit:', error);
      toast.error("Failed to add unit");
    }
  };

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
                    value={formData.category}
                    onValueChange={(value) => handleInputChange("category", value)}
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
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Category</DialogTitle>
                        <DialogDescription>
                          Create a new category for your items
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="categoryName">Category Name</Label>
                          <Input
                            id="categoryName"
                            value={newCategory.name}
                            onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter category name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="categoryDesc">Description (Optional)</Label>
                          <Textarea
                            id="categoryDesc"
                            value={newCategory.description}
                            onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Enter category description"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowCategoryDialog(false)}>
                          Cancel
                        </Button>
                        <Button type="button" onClick={handleAddCategory}>
                          Add Category
                        </Button>
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
                <Label htmlFor="purchasePrice">Purchase Price</Label>
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
                      value={formData.unit}
                      onValueChange={(value) => handleInputChange("unit", value)}
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