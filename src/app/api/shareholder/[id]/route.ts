import { NextRequest, NextResponse } from "next/server";
import { getShareholderById, updateShareholder, deleteShareholder } from '@/server/features/ShareHolder/infrastructure/persistence/ShareHolderSupabase';
import { Shareholder } from '@/server/features/ShareHolder/core/entities/ShareHolder';

export async function GET(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const params = await segmentData.params;
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "ID parameter is required" }, { status: 400 });
    }

    console.log('Fetching shareholder with ID:', id);

    const result = await getShareholderById(id);
    console.log("Fetched shareholder result:", result?.toDisplayObject());
    
    if (!result) {
      return NextResponse.json({ error: "Shareholder not found" }, { status: 404 });
    }

    // Use toDisplayObject() for consistent camelCase response with new structure
    return NextResponse.json(result.toDisplayObject());
  } catch (error) {
    console.error('Error in GET /api/shareholder/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const params = await segmentData.params;
    const { id } = params;
    const body = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing id in URL' }, { status: 400 });
    }

    console.log('Updating shareholder with ID:', id);
    console.log('Update data:', body);

    const result = await updateShareholder(id, body);
    
    if (!result) {
      return NextResponse.json({ error: 'Failed to update shareholder' }, { status: 500 });
    }

    // Use toDisplayObject() for consistent camelCase response
    return NextResponse.json(result.toDisplayObject());
  } catch (error) {
    console.error('Error in PUT /api/shareholder/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const params = await segmentData.params;
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Missing shareholder id in URL' }, { status: 400 });
    }

    console.log('Deleting shareholder with ID:', id);

    const result = await deleteShareholder(id);
    
    if (!result) {
      return NextResponse.json({ error: 'Failed to delete shareholder' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Shareholder deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/shareholder/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}