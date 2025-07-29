// File: /api/shareholder/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
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

    console.log('Fetching shareholder with ID:', id); // Debug log

    const result = await getShareholderById(id);
    console.log("this is result at the api of shareholder by id ", result)
    
    if (!result) {
      return NextResponse.json({ error: "Shareholder not found" }, { status: 404 });
    }

    // Use toDisplayObject() instead of letting NextResponse.json() call toJSON()
    return NextResponse.json(result.toDisplayObject());
  } catch (error) {
    console.error('Error in GET /api/shareholder/[id]:', error); // Debug log
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
    const body: Shareholder = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing id in URL' }, { status: 400 });
    }

    console.log('Updating shareholder with ID:', id); // Debug log

    const result = await updateShareholder(id, body);
    
    // Use toDisplayObject() for consistent camelCase response
    return NextResponse.json(result?.toDisplayObject());
  } catch (error) {
    console.error('Error in PUT /api/shareholder/[id]:', error); // Debug log
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

    console.log('Deleting shareholder with ID:', id); // Debug log

    const result = await deleteShareholder(id);
    
    // For delete, you might want to return a simple success message
    // or use toDisplayObject() if you're returning the deleted record
    return NextResponse.json({ 
      success: true, 
      message: 'Shareholder deleted successfully',
      deletedRecord: result ? result : null 
    });
  } catch (error) {
    console.error('Error in DELETE /api/shareholder/[id]:', error); // Debug log
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}