// File: /api/shareholder/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getShareholderById, updateShareholder, deleteShareholder } from '@/server/features/ShareHolder/infrastructure/persistence/ShareHolderSupabase';
import { Shareholder } from '@/server/features/ShareHolder/core/entities/ShareHolder';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "ID parameter is required" }, { status: 400 });
    }

    console.log('Fetching shareholder with ID:', id); // Debug log

    const result = await getShareholderById(id);
    
    if (!result) {
      return NextResponse.json({ error: "Shareholder not found" }, { status: 404 });
    }

    return NextResponse.json(result);
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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body: Shareholder = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing id in URL' }, { status: 400 });
    }

    console.log('Updating shareholder with ID:', id); // Debug log

    const result = await updateShareholder(id, body);
    return NextResponse.json(result);
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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Missing shareholder id in URL' }, { status: 400 });
    }

    console.log('Deleting shareholder with ID:', id); // Debug log

    const result = await deleteShareholder(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in DELETE /api/shareholder/[id]:', error); // Debug log
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}