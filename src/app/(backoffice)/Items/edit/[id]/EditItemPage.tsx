'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { 
  ArrowLeft, 
  Save, 
  Package, 
  Wrench, 
  CalendarIcon, 
  AlertCircle,
  Plus,
  X,
  Loader2
} from 'lucide-react'
import { toast } from 'react-toastify'
import { Unit } from '@/server/features/items/core/entities/Unit'
import { useAppDispatch, useAppSelector } from '@/store/hooks'

interface EditItemPageProps {
  itemId: string
}

interface Category {
  id: string;
  name: string;
  description?: string;
  parentCategory?: Category;
}

interface FormData {
  name: string
  category: Category | null
  hsn_sac: string
  salePrice: number
  salePriceInclusive: boolean
  gstTaxPercent: number
  // Product specific fields
  purchasePrice?: number
  purchasePriceInclusive?: boolean
  unit?: { code: string; name: string; label: string } | null
  openingQuantity?: number
  openingStockDate?: Date
  mfgDate?: Date
  expDate?: Date
  barcode?: string
  discount?: number
  lowStockAlert?: number
  currentStock?: number
  lastStockUpdate?: Date
}

// GST rates array
const GST_RATES = [
  { value: 0, label: '0% - Exempt' },
  { value: 3, label: '3% - Essential goods' },
  { value: 5, label: '5% - Household necessities' },
  { value: 12, label: '12% - Standard rate' },
  { value: 18, label: '18% - Standard rate' },
  { value: 28, label: '28% - Luxury goods' },
]

export default function EditItemPage({ itemId }: EditItemPageProps) {
  const router = useRouter()
  const user = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();
  
  const fpoId = user.fpoId;
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [itemType, setItemType] = useState<'product' | 'service'>('product')
  const [formData, setFormData] = useState<FormData>({
    name: '',
    category: null,
    hsn_sac: '',
    salePrice: 0,
    salePriceInclusive: false,
    gstTaxPercent: 18,
    purchasePrice: 0,
    purchasePriceInclusive: false,
    unit: null,
    openingQuantity: 0,
    discount: 0,
    lowStockAlert: 0,
    currentStock: 0,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<Unit[]>([])

  useEffect(() => {
    loadItem()
    loadCategories()
    loadUnits()
  }, [itemId])

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

  const loadItem = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/items/${itemId}`)
      
      if (!response.ok) {
        throw new Error('Failed to load item')
      }
      
      const item = await response.json()
      
      if (!item) {
        router.push('/Items/ItemList')
        toast.error('Item not found')
        return
      }
      
      console.log('Loaded item:', item)
      
      // Determine item type based on properties
      const isProduct = item.purchasePrice !== undefined || item.unit !== undefined
      setItemType(isProduct ? 'product' : 'service')

      // Set form data
      setFormData({
        name: item.name || '',
        category: item.category || null,
        hsn_sac: item.hsn_sac || '',
        salePrice: item.salePrice || 0,
        salePriceInclusive: item.salePriceInclusive || false,
        gstTaxPercent: item.gstTaxPercent || 18,
        ...(isProduct && {
          purchasePrice: item.purchasePrice || 0,
          purchasePriceInclusive: item.purchasePriceInclusive || false,
          unit: item.unit || null,
          openingQuantity: item.openingQuantity || 0,
          openingStockDate: item.openingStockDate ? new Date(item.openingStockDate) : undefined,
          mfgDate: item.mfgDate ? new Date(item.mfgDate) : undefined,
          expDate: item.expDate ? new Date(item.expDate) : undefined,
          barcode: item.barcode || '',
          discount: item.discount || 0,
          lowStockAlert: item.lowStockAlert || 0,
          currentStock: item.currentStock || 0,
          lastStockUpdate: item.lastStockUpdate ? new Date(item.lastStockUpdate) : undefined,
        })
      })
    } catch (error) {
      console.error('Error loading item:', error)
      toast.error('Failed to load item')
      router.push('/Items/ItemList')
    } finally {
      setLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required'
    }

    if (!formData.category) {
      newErrors.category = 'Category is required'
    }

    if (!formData.hsn_sac.trim()) {
      newErrors.hsn_sac = 'HSN/SAC code is required'
    }

    if (formData.salePrice <= 0) {
      newErrors.salePrice = 'Sale price must be greater than 0'
    }

    if (itemType === 'product') {
      if (!formData.unit) {
        newErrors.unit = 'Unit is required for products'
      }
      
      if ((formData.purchasePrice || 0) <= 0) {
        newErrors.purchasePrice = 'Purchase price must be greater than 0'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      setSaving(true)
      
      const updates: any = {
        name: formData.name,
        category: formData.category!,
        hsn_sac: formData.hsn_sac,
        salePrice: formData.salePrice,
        salePriceInclusive: formData.salePriceInclusive,
        gstTaxPercent: formData.gstTaxPercent,
      }

      // Add product-specific fields only if it's a product
      if (itemType === 'product') {
        updates.purchasePrice = formData.purchasePrice
        updates.purchasePriceInclusive = formData.purchasePriceInclusive
        updates.unit = formData.unit
        updates.openingQuantity = formData.openingQuantity
        updates.openingStockDate = formData.openingStockDate
        updates.mfgDate = formData.mfgDate
        updates.expDate = formData.expDate
        updates.barcode = formData.barcode
        updates.discount = formData.discount
        updates.lowStockAlert = formData.lowStockAlert
        updates.currentStock = formData.currentStock
        updates.lastStockUpdate = formData.lastStockUpdate
      }

      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update item')
      }

      toast.success('Item updated successfully')
      router.push('/Items/ItemList')
    } catch (error) {
      console.error('Error updating item:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update item')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center space-x-2">
                {itemType === 'product' ? (
                  <Package className="w-5 h-5 text-blue-600" />
                ) : (
                  <Wrench className="w-5 h-5 text-green-600" />
                )}
                <h1 className="text-xl font-semibold text-gray-900">
                  Edit {itemType === 'product' ? 'Product' : 'Service'}
                </h1>
                <Badge variant={itemType === 'product' ? 'default' : 'secondary'}>
                  {itemType}
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => router.back()}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Item Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter item name"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.category?.id || ''}
                    onValueChange={(value) => {
                      const category = categories.find(c => c.id === value)
                      handleInputChange('category', category || null)
                    }}
                  >
                    <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-red-500 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.category}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hsn_sac">
                  HSN/SAC Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="hsn_sac"
                  value={formData.hsn_sac}
                  onChange={(e) => handleInputChange('hsn_sac', e.target.value)}
                  placeholder="Enter HSN/SAC code"
                  className={errors.hsn_sac ? 'border-red-500' : ''}
                />
                {errors.hsn_sac && (
                  <p className="text-sm text-red-500 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.hsn_sac}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Tax */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Tax</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="salePrice">
                    Sale/Service Price <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      ₹
                    </span>
                    <Input
                      id="salePrice"
                      type="number"
                      value={formData.salePrice}
                      onChange={(e) => handleInputChange('salePrice', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className={`pl-8 ${errors.salePrice ? 'border-red-500' : ''}`}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="salePriceInclusive"
                      checked={formData.salePriceInclusive}
                      onCheckedChange={(checked) => handleInputChange('salePriceInclusive', checked)}
                    />
                    <Label htmlFor="salePriceInclusive" className="text-sm">
                      Price inclusive of tax
                    </Label>
                  </div>
                  {errors.salePrice && (
                    <p className="text-sm text-red-500 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.salePrice}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstTax">
                    GST Tax <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.gstTaxPercent.toString()}
                    onValueChange={(value) => handleInputChange('gstTaxPercent', parseFloat(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select GST rate" />
                    </SelectTrigger>
                    <SelectContent>
                      {GST_RATES.map((rate) => (
                        <SelectItem key={rate.value} value={rate.value.toString()}>
                          {rate.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {itemType === 'product' && (
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">
                    Purchase Price <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      ₹
                    </span>
                    <Input
                      id="purchasePrice"
                      type="number"
                      value={formData.purchasePrice || 0}
                      onChange={(e) => handleInputChange('purchasePrice', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className={`pl-8 ${errors.purchasePrice ? 'border-red-500' : ''}`}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="purchasePriceInclusive"
                      checked={formData.purchasePriceInclusive || false}
                      onCheckedChange={(checked) => handleInputChange('purchasePriceInclusive', checked)}
                    />
                    <Label htmlFor="purchasePriceInclusive" className="text-sm">
                      Price inclusive of tax
                    </Label>
                  </div>
                  {errors.purchasePrice && (
                    <p className="text-sm text-red-500 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.purchasePrice}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Details - Only show for products */}
          {itemType === 'product' && (
            <Card>
              <CardHeader>
                <CardTitle>Product Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="unit">
                      Item Units <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.unit?.code || ''}
                      onValueChange={(value) => {
                        const unit = units.find(u => u.code === value)
                        handleInputChange('unit', unit || null)
                      }}
                    >
                      <SelectTrigger className={errors.unit ? 'border-red-500' : ''}>
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
                    {errors.unit && (
                      <p className="text-sm text-red-500 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.unit}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="openingQuantity">Opening Quantity</Label>
                    <Input
                      id="openingQuantity"
                      type="number"
                      value={formData.openingQuantity || 0}
                      onChange={(e) => handleInputChange('openingQuantity', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentStock">Current Stock</Label>
                    <Input
                      id="currentStock"
                      type="number"
                      value={formData.currentStock || 0}
                      onChange={(e) => handleInputChange('currentStock', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openingStockDate">Opening Stock Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.openingStockDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.openingStockDate ? format(formData.openingStockDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.openingStockDate}
                        onSelect={(date) => handleInputChange('openingStockDate', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="mfgDate">Manufacturing Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.mfgDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.mfgDate ? format(formData.mfgDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.mfgDate}
                          onSelect={(date) => handleInputChange('mfgDate', date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expDate">Expiry Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.expDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.expDate ? format(formData.expDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.expDate}
                          onSelect={(date) => handleInputChange('expDate', date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Barcode/Serial No</Label>
                    <Input
                      id="barcode"
                      value={formData.barcode || ''}
                      onChange={(e) => handleInputChange('barcode', e.target.value)}
                      placeholder="Enter barcode or serial number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discount">Discount on Sale</Label>
                    <div className="relative">
                      <Input
                        id="discount"
                        type="number"
                        value={formData.discount || 0}
                        onChange={(e) => handleInputChange('discount', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="pr-8"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        %
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lowStockAlert">
                      Set Low Stock Alert
                      <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                    </Label>
                    <Input
                      id="lowStockAlert"
                      type="number"
                      value={formData.lowStockAlert || 0}
                      onChange={(e) => handleInputChange('lowStockAlert', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}