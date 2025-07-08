import { NextRequest, NextResponse } from 'next/server'
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
    const data = await req.json();
    const result = await updateItem(params.id, data);
    return NextResponse.json({ data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}