import { NextRequest, NextResponse } from "next/server";
import { getUserContext } from '@/contexts/getUserContext'
import { 
  checkItemsStockAvailability, 
  checkSingleItemStock,
  validateStockRequirements 
} from '@/server/features/items/infrastructure/persistence/stockSupabase'

export async function POST(request: NextRequest) {
  try {
    // Get current user and validate authentication
    const user = await getUserContext()
    if (!user || !user.fpoId) {
      return NextResponse.json(
        { error: 'Unauthorized or missing FPO ID' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type = 'basic', itemIds, itemId, itemChecks } = body

    // Validate request based on type
    switch (type) {
      case 'basic': {
        // Basic stock check for multiple items (Compatible with stockManagementHelper.ts)
        if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
          return NextResponse.json(
            { error: 'itemIds array is required for basic stock check' },
            { status: 400 }
          )
        }

        const stockStatus = await checkItemsStockAvailability(itemIds, user.fpoId)
        
        if (stockStatus === null) {
          return NextResponse.json(
            { error: 'Failed to check stock availability' },
            { status: 500 }
          )
        }

        // Transform to match stockManagementHelper.ts expected format
        const compatibleFormat: {
          [itemId: string]: {
            currentStock: number;
            available: boolean;
            itemName?: string;
          }
        } = {}

        Object.keys(stockStatus).forEach(itemId => {
          const item = stockStatus[itemId]
          compatibleFormat[itemId] = {
            currentStock: item.currentStock,
            available: item.available,
            itemName: item.itemName
          }
        })

        return NextResponse.json(compatibleFormat)
      }

      case 'single': {
        // Single item stock check
        if (!itemId || typeof itemId !== 'string') {
          return NextResponse.json(
            { error: 'itemId is required for single stock check' },
            { status: 400 }
          )
        }

        const stockStatus = await checkSingleItemStock(itemId, user.fpoId)
        
        if (stockStatus === null) {
          return NextResponse.json(
            { error: 'Failed to check stock for item' },
            { status: 500 }
          )
        }

        return NextResponse.json({ [itemId]: stockStatus })
      }

      case 'validate': {
        // Validate stock requirements with quantities
        if (!itemChecks || !Array.isArray(itemChecks) || itemChecks.length === 0) {
          return NextResponse.json(
            { error: 'itemChecks array is required for stock validation' },
            { status: 400 }
          )
        }

        // Validate itemChecks structure
        const isValidItemChecks = itemChecks.every(check => 
          check && 
          typeof check.itemId === 'string' && 
          typeof check.requiredQuantity === 'number' &&
          check.requiredQuantity >= 0
        )

        if (!isValidItemChecks) {
          return NextResponse.json(
            { error: 'Each itemCheck must have itemId (string) and requiredQuantity (number >= 0)' },
            { status: 400 }
          )
        }

        const validationResult = await validateStockRequirements(itemChecks, user.fpoId)
        
        if (validationResult === null) {
          return NextResponse.json(
            { error: 'Failed to validate stock requirements' },
            { status: 500 }
          )
        }

        return NextResponse.json(validationResult)
      }

      default: {
        return NextResponse.json(
          { error: 'Invalid type. Supported types: basic, single, validate' },
          { status: 400 }
        )
      }
    }

  } catch (error) {
    console.error('Stock check API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get current user and validate authentication
    const user = await getUserContext()
    if (!user || !user.fpoId) {
      return NextResponse.json(
        { error: 'Unauthorized or missing FPO ID' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const itemIds = searchParams.get('itemIds')
    const itemId = searchParams.get('itemId')

    if (itemId) {
      // Single item check via GET
      const stockStatus = await checkSingleItemStock(itemId, user.fpoId)
      
      if (stockStatus === null) {
        return NextResponse.json(
          { error: 'Failed to check stock for item' },
          { status: 500 }
        )
      }

      return NextResponse.json({ [itemId]: stockStatus })
    }

    if (itemIds) {
      // Multiple items check via GET
      const itemIdsArray = itemIds.split(',').map(id => id.trim()).filter(id => id.length > 0)
      
      if (itemIdsArray.length === 0) {
        return NextResponse.json(
          { error: 'No valid item IDs provided' },
          { status: 400 }
        )
      }

      const stockStatus = await checkItemsStockAvailability(itemIdsArray, user.fpoId)
      
      if (stockStatus === null) {
        return NextResponse.json(
          { error: 'Failed to check stock availability' },
          { status: 500 }
        )
      }

      return NextResponse.json(stockStatus)
    }

    return NextResponse.json(
      { error: 'Either itemId or itemIds parameter is required' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Stock check API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}