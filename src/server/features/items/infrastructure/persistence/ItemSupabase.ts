import { Item, Product, Service } from '@/server/features/items/core/entities/Item'
import { Category } from '@/server/features/items/core/entities/Category'
import { Unit } from '@/server/features/items/core/entities/Unit'
import { createClient } from '@/utils/supabase/server'

// Helper function to convert database row to Category
function dbRowToCategoryProps(data: any): Category {
  return new Category(
    data.id,
    data.name,
    data.description,
    data.parent_category_id ? new Category(data.parent_category_id, '', '') : undefined
  );
}

// Helper function to convert database row to Unit
function dbRowToUnitProps(data: any): Unit {
  return new Unit(data.code, data.label);
}

// Helper function to convert database row to Item props
function dbRowToItemProps(data: any, category: Category, unit?: Unit): Product | Service {
  const baseProps = {
    id: data.id,
    name: data.name,
    type: data.type as "product" | "service",
    category: category,
    hsn_sac: data.hsn_sac,
    salePrice: data.sale_price,
    salePriceInclusive: data.sale_price_inclusive,
    gstTaxPercent: data.gst_tax_percent
  };

  if (data.type === 'product' && unit) {
    return new Product(
      baseProps.id,
      baseProps.name,
      baseProps.category,
      baseProps.hsn_sac,
      baseProps.salePrice,
      baseProps.salePriceInclusive,
      baseProps.gstTaxPercent,
      data.purchase_price || 0,
      data.purchase_price_inclusive || false,
      unit,
      data.opening_quantity || 0,
      data.opening_stock_date ? new Date(data.opening_stock_date) : null,
      data.mfg_date ? new Date(data.mfg_date) : null,
      data.exp_date ? new Date(data.exp_date) : null,
      data.barcode,
      data.discount ? {
        value: data.discount.value,
        type: data.discount.type
      } : undefined,
      data.low_stock_alert
    );
  } else {
    return new Service(
      baseProps.id,
      baseProps.name,
      baseProps.category,
      baseProps.hsn_sac,
      baseProps.salePrice,
      baseProps.salePriceInclusive,
      baseProps.gstTaxPercent
    );
  }
}

// ============ CATEGORY FUNCTIONS ============

export async function createCategory(category: Category, fpo_id: string): Promise<Category | null> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([{
        id: category.id,
        fpo_id: fpo_id,
        name: category.name,
        description: category.description,
        parent_category_id: category.parentCategory?.id
      }])
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return dbRowToCategoryProps(data)
  } catch (error) {
    console.error('Error creating category:', error)
    return null
  }
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<Category | null> {
  const supabase = await createClient()
  
  const updateData: any = {}
  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.parentCategory !== undefined) updateData.parent_category_id = updates.parentCategory?.id

  try {
    const { data, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return dbRowToCategoryProps(data)
  } catch (error) {
    console.error('Error updating category:', error)
    return null
  }
}

export async function getAllCategories(fpo_id: string): Promise<Category[] | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('fpo_id', fpo_id)
      .order('name', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return data ? data.map(row => dbRowToCategoryProps(row)) : []
  } catch (error) {
    console.error('Error fetching categories:', error)
    return null
  }
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data ? dbRowToCategoryProps(data) : null
  } catch (error) {
    console.error('Error fetching category by ID:', error)
    return null
  }
}

export async function deleteCategory(id: string): Promise<boolean> {
  const supabase = await createClient()
  
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }

    return true
  } catch (error) {
    console.error('Error deleting category:', error)
    return false
  }
}

// ============ UNIT FUNCTIONS ============

export async function createUnit(unit: Unit, fpo_id: string): Promise<Unit | null> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('units')
      .insert([{
        code: unit.code,
        fpo_id: fpo_id,
        label: unit.label
      }])
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return dbRowToUnitProps(data)
  } catch (error) {
    console.error('Error creating unit:', error)
    return null
  }
}

export async function updateUnit(code: string, updates: Partial<Unit>): Promise<Unit | null> {
  const supabase = await createClient()
  
  const updateData: any = {}
  if (updates.label !== undefined) updateData.label = updates.label

  try {
    const { data, error } = await supabase
      .from('units')
      .update(updateData)
      .eq('code', code)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return dbRowToUnitProps(data)
  } catch (error) {
    console.error('Error updating unit:', error)
    return null
  }
}

export async function getAllUnits(fpo_id: string): Promise<Unit[] | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('fpo_id', fpo_id)
      .order('label', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return data ? data.map(row => dbRowToUnitProps(row)) : []
  } catch (error) {
    console.error('Error fetching units:', error)
    return null
  }
}

export async function getUnitByCode(code: string): Promise<Unit | null> {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('code', code)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data ? dbRowToUnitProps(data) : null
  } catch (error) {
    console.error('Error fetching unit by code:', error)
    return null
  }
}

export async function deleteUnit(code: string): Promise<boolean> {
  const supabase = await createClient()
  
  try {
    const { error } = await supabase
      .from('units')
      .delete()
      .eq('code', code)

    if (error) {
      throw new Error(error.message)
    }

    return true
  } catch (error) {
    console.error('Error deleting unit:', error)
    return false
  }
}

// Initialize default units for a new FPO
export async function initializeDefaultUnits(fpo_id: string): Promise<Unit[] | null> {
  const defaultUnits = Unit.defaultUnits()
  const createdUnits: Unit[] = []

  for (const unit of defaultUnits) {
    const created = await createUnit(unit, fpo_id)
    if (created) {
      createdUnits.push(created)
    }
  }

  return createdUnits.length > 0 ? createdUnits : null
}

// ============ ITEM FUNCTIONS ============

export async function createItem(item: Product | Service, fpo_id: string): Promise<Product | Service | null> {
  const supabase = await createClient()

  try {
    const baseData = {
      id: item.id,
      fpo_id: fpo_id,
      name: item.name,
      type: item.type,
      category_id: item.category.id,
      hsn_sac: item.hsn_sac,
      sale_price: item.salePrice,
      sale_price_inclusive: item.salePriceInclusive,
      gst_tax_percent: item.gstTaxPercent
    }

    let insertData: any = baseData

    if (item instanceof Product) {
      insertData = {
        ...baseData,
        purchase_price: item.purchasePrice,
        purchase_price_inclusive: item.purchasePriceInclusive,
        unit_code: item.unit.code,
        opening_quantity: item.openingQuantity,
        opening_stock_date: item.openingStockDate?.toISOString(),
        mfg_date: item.mfgDate?.toISOString(),
        exp_date: item.expDate?.toISOString(),
        barcode: item.barcode,
        discount: item.discount,
        low_stock_alert: item.lowStockAlert
      }
    }

    const { data, error } = await supabase
      .from('items')
      .insert([insertData])
      .select(`
        *,
        categories!inner(id, name, description, parent_category_id),
        units(code, label)
      `)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const category = dbRowToCategoryProps(data.categories)
    const unit = data.units ? dbRowToUnitProps(data.units) : undefined
    
    return dbRowToItemProps(data, category, unit)
  } catch (error) {
    console.error('Error creating item:', error)
    return null
  }
}

export async function updateItem(id: string, updates: Partial<Product | Service>): Promise<Product | Service | null> {
  const supabase = await createClient()
  
  const updateData: any = {}
  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.category !== undefined) updateData.category_id = updates.category.id
  if (updates.hsn_sac !== undefined) updateData.hsn_sac = updates.hsn_sac
  if (updates.salePrice !== undefined) updateData.sale_price = updates.salePrice
  if (updates.salePriceInclusive !== undefined) updateData.sale_price_inclusive = updates.salePriceInclusive
  if (updates.gstTaxPercent !== undefined) updateData.gst_tax_percent = updates.gstTaxPercent

  // Product-specific updates
  const productUpdates = updates as Partial<Product>
  if (productUpdates.purchasePrice !== undefined) updateData.purchase_price = productUpdates.purchasePrice
  if (productUpdates.purchasePriceInclusive !== undefined) updateData.purchase_price_inclusive = productUpdates.purchasePriceInclusive
  if (productUpdates.unit !== undefined) updateData.unit_code = productUpdates.unit.code
  if (productUpdates.openingQuantity !== undefined) updateData.opening_quantity = productUpdates.openingQuantity
  if (productUpdates.openingStockDate !== undefined) updateData.opening_stock_date = productUpdates.openingStockDate?.toISOString()
  if (productUpdates.mfgDate !== undefined) updateData.mfg_date = productUpdates.mfgDate?.toISOString()
  if (productUpdates.expDate !== undefined) updateData.exp_date = productUpdates.expDate?.toISOString()
  if (productUpdates.barcode !== undefined) updateData.barcode = productUpdates.barcode
  if (productUpdates.discount !== undefined) updateData.discount = productUpdates.discount
  if (productUpdates.lowStockAlert !== undefined) updateData.low_stock_alert = productUpdates.lowStockAlert

  try {
    const { data, error } = await supabase
      .from('items')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        categories!inner(id, name, description, parent_category_id),
        units(code, label)
      `)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const category = dbRowToCategoryProps(data.categories)
    const unit = data.units ? dbRowToUnitProps(data.units) : undefined
    
    return dbRowToItemProps(data, category, unit)
  } catch (error) {
    console.error('Error updating item:', error)
    return null
  }
}

export async function getAllItems(fpo_id: string): Promise<(Product | Service)[] | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('items')
      .select(`
        *,
        categories!inner(id, name, description, parent_category_id),
        units(code, label)
      `)
      .eq('fpo_id', fpo_id)
      .order('name', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return data ? data.map(row => {
      const category = dbRowToCategoryProps(row.categories)
      const unit = row.units ? dbRowToUnitProps(row.units) : undefined
      return dbRowToItemProps(row, category, unit)
    }) : []
  } catch (error) {
    console.error('Error fetching items:', error)
    return null
  }
}

export async function getItemById(id: string): Promise<Product | Service | null> {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('items')
      .select(`
        *,
        categories!inner(id, name, description, parent_category_id),
        units(code, label)
      `)
      .eq('id', id)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    if (!data) return null

    const category = dbRowToCategoryProps(data.categories)
    const unit = data.units ? dbRowToUnitProps(data.units) : undefined
    
    return dbRowToItemProps(data, category, unit)
  } catch (error) {
    console.error('Error fetching item by ID:', error)
    return null
  }
}

export async function getItemsByCategory(categoryId: string, fpo_id: string): Promise<(Product | Service)[] | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('items')
      .select(`
        *,
        categories!inner(id, name, description, parent_category_id),
        units(code, label)
      `)
      .eq('fpo_id', fpo_id)
      .eq('category_id', categoryId)
      .order('name', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return data ? data.map(row => {
      const category = dbRowToCategoryProps(row.categories)
      const unit = row.units ? dbRowToUnitProps(row.units) : undefined
      return dbRowToItemProps(row, category, unit)
    }) : []
  } catch (error) {
    console.error('Error fetching items by category:', error)
    return null
  }
}

export async function deleteItem(id: string): Promise<boolean> {
  const supabase = await createClient()
  
  try {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }

    return true
  } catch (error) {
    console.error('Error deleting item:', error)
    return false
  }
}

// Bulk operations
export async function bulkUpsertItems(items: (Product | Service)[], fpo_id: string): Promise<{
  success: (Product | Service)[];
  failed: { data: Product | Service; error: string }[];
}> {
  const supabase = await createClient()
  const success: (Product | Service)[] = []
  const failed: { data: Product | Service; error: string }[] = []

  const batchSize = 50
  const batches = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize))
  }

  for (const batch of batches) {
    for (const item of batch) {
      try {
        const result = await createItem(item, fpo_id)
        if (result) {
          success.push(result)
        } else {
          failed.push({ data: item, error: 'Failed to create item' })
        }
      } catch (error) {
        failed.push({ 
          data: item, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }
  }

  return { success, failed }
}