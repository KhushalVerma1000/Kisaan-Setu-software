import { NextRequest, NextResponse } from "next/server";
import { 
  getAllCategories, 
  createCategory, 
   
} from '@/server/features/items/infrastructure/persistence/ItemSupabase'
import { Category } from '@/server/features/items/core/entities/Category'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fpo_id = searchParams.get('fpo_id')
    
    if (!fpo_id) {
      return NextResponse.json({ error: 'FPO ID is required' }, { status: 400 })
    }

    let categories = await getAllCategories(fpo_id)
    
    // If no categories found, initialize with default "General" category
    if (!categories || categories.length === 0) {
      const defaultCategory = new Category(
        crypto.randomUUID(),
        'General',
        'Default general category for items'
      )
      
      const createdCategory = await createCategory(defaultCategory, fpo_id)
      categories = createdCategory ? [createdCategory] : []
    }

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, parentCategoryId, fpo_id } = body

    if (!name || !fpo_id) {
      return NextResponse.json({ error: 'Name and FPO ID are required' }, { status: 400 })
    }

    let parentCategory = undefined
    if (parentCategoryId) {
      parentCategory = new Category(parentCategoryId, '', '')
    }

    const category = new Category(
      crypto.randomUUID(),
      name,
      description,
      parentCategory
    )

    const createdCategory = await createCategory(category, fpo_id)
    
    if (!createdCategory) {
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
    }

    return NextResponse.json({ category: createdCategory })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
