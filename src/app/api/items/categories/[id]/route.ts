
// app/api/categories/[id]/route.ts
import { Category } from '@/server/features/items/core/entities/Category'
import { NextRequest, NextResponse } from 'next/server'
import { 
  updateCategory, 
  deleteCategory, 
  getCategoryById 
} from '@/server/features/items/infrastructure/persistence/ItemSupabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const category = await getCategoryById(params.id)
    
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Error fetching category:', error)
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, description, parentCategoryId } = body

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (parentCategoryId !== undefined) {
      updates.parentCategory = parentCategoryId ? new Category(parentCategoryId, '', '') : undefined
    }

    const updatedCategory = await updateCategory(params.id, updates)
    
    if (!updatedCategory) {
      return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
    }

    return NextResponse.json({ category: updatedCategory })
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await deleteCategory(params.id)
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}