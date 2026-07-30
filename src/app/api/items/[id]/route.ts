import { NextRequest, NextResponse } from "next/server";
import { getItemById , deleteItem, updateItem } from '@/server/features/items/infrastructure/persistence/ItemSupabase'
import { Category } from '@/server/features/items/core/entities/Category'
import { Unit } from '@/server/features/items/core/entities/Unit'

// Next.js 15+ - params is a Promise
export async function GET(
  req: Request,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const params = await segmentData.params
    const item = await getItemById(params.id)
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    return NextResponse.json(item)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const params = await segmentData.params
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    const success = await deleteItem(id)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete item' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Item deleted successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error in DELETE /api/items/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
export async function PUT(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const params = await segmentData.params
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    const data = await req.json()
    
    // Validate that data is not empty
    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'Update data is required' },
        { status: 400 }
      )
    }

    const result = await updateItem(id, data)
    
    if (!result) {
      return NextResponse.json(
        { error: 'Item not found or update failed' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { 
        message: 'Item updated successfully',
        data: result 
      },
      { status: 200 }
    )

  } catch (error: any) {
    console.error('Error in PUT /api/items/[id]:', error)
    
    // Handle specific error types
    if (error.message?.includes('Unit with code') && error.message?.includes('does not exist')) {
      return NextResponse.json(
        { error: 'Invalid unit code provided' },
        { status: 400 }
      )
    }
    
    if (error.message?.includes('Foreign key constraint violation')) {
      return NextResponse.json(
        { error: 'Invalid category or reference provided' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}