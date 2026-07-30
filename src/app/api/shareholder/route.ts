import { NextRequest, NextResponse } from "next/server";
import { createShareholder, updateShareholder, deleteShareholder, getShareholdersByFpoId } from '@/server/features/ShareHolder/infrastructure/persistence/ShareHolderSupabase';
import { Shareholder } from '@/server/features/ShareHolder/core/entities/ShareHolder';

export async function GET() {
  try {
    const result = await getShareholdersByFpoId();

    if (!result) {
      return NextResponse.json({ error: "Failed to fetch shareholders" }, { status: 500 });
    }

    // Return the display objects for consistent camelCase response
    const displayResults = result.map(shareholder => shareholder.toDisplayObject());
    return NextResponse.json(displayResults);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
  
    const result = await createShareholder(body);

    if (!result) {
      return NextResponse.json({ error: "Failed to create shareholder" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      shareholder: result.toDisplayObject() 
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body: Partial<Shareholder> = await req.json();
    
    if (!body.id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const result = await updateShareholder(body.id, body);
    
    if (!result) {
      return NextResponse.json({ error: 'Failed to update shareholder' }, { status: 500 });
    }

    return NextResponse.json(result.toDisplayObject());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing shareholder id' }, { status: 400 });
    }

    const result = await deleteShareholder(id);
   
    if (!result) {
      return NextResponse.json({ error: 'Failed to delete shareholder' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Shareholder deleted successfully' 
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request or deletion failed" },
      { status: 400 }
    );
  }
}