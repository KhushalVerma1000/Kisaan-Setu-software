import { NextRequest, NextResponse } from 'next/server'
import { getItemById , deleteItem, updateItem } from '@/server/features/items/infrastructure/persistence/ItemSupabase'
import { Category } from '@/server/features/items/core/entities/Category'
import { Unit } from '@/server/features/items/core/entities/Unit'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const item = await getItemById(params.id)
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    return NextResponse.json(item)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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


// export async function PUT(
//   request: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const { id } = params
//     const body = await request.json()

//     if (!id) {
//       return NextResponse.json(
//         { error: 'Item ID is required' },
//         { status: 400 }
//       )
//     }

//     // Prepare update data
//     const updateData: any = {}

//     if (body.name !== undefined) updateData.name = body.name
//     if (body.hsn_sac !== undefined) updateData.hsn_sac = body.hsn_sac
//     if (body.sale_price !== undefined) updateData.salePrice = body.sale_price
//     if (body.sale_price_inclusive !== undefined) updateData.salePriceInclusive = body.sale_price_inclusive
//     if (body.gst_tax_percent !== undefined) updateData.gstTaxPercent = body.gst_tax_percent

//     // Category update
//     if (body.category_id) {
//       updateData.category = new Category(body.category_id, '', '')
//     }

//     // Product-specific updates
//     if (body.purchase_price !== undefined) updateData.purchasePrice = body.purchase_price
//     if (body.purchase_price_inclusive !== undefined) updateData.purchasePriceInclusive = body.purchase_price_inclusive
//     if (body.unit_code) {
//       updateData.unit = new Unit(body.unit_code, body.unit_label || '')
//     }
//     if (body.opening_quantity !== undefined) updateData.openingQuantity = body.opening_quantity
//     if (body.opening_stock_date !== undefined) {
//       updateData.openingStockDate = body.opening_stock_date ? new Date(body.opening_stock_date) : null
//     }
//     if (body.mfg_date !== undefined) {
//       updateData.mfgDate = body.mfg_date ? new Date(body.mfg_date) : null
//     }
//     if (body.exp_date !== undefined) {
//       updateData.expDate = body.exp_date ? new Date(body.exp_date) : null
//     }
//     if (body.barcode !== undefined) updateData.barcode = body.barcode
//     if (body.discount !== undefined) updateData.discount = body.discount
//     if (body.low_stock_alert !== undefined) updateData.lowStockAlert = body.low_stock_alert

//     const updatedItem = await updateItem(id, updateData)
    
//     if (!updatedItem) {
//       return NextResponse.json(
//         { error: 'Failed to update item' },
//         { status: 500 }
//       )
//     }

//     return NextResponse.json({
//       data: updatedItem,
//       message: 'Item updated successfully'
//     })

//   } catch (error) {
//     console.error('Error in PUT /api/items/[id]:', error)
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     )
//   }
// }


export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    
    const data = await req.json();
    const result = await updateItem(params.id, data);
    return NextResponse.json({ data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
