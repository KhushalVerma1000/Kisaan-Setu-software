
import { NextRequest, NextResponse } from 'next/server';
import { createShareholder, updateShareholder, deleteShareholder, getShareholdersByFpoId, upsertShareholder } from '@/server/features/ShareHolder/infrastructure/persistence/ShareHolderSupabase';
import { Shareholder } from '@/server/features/ShareHolder/core/entities/ShareHolder';

export async function GET() {



  const result = await getShareholdersByFpoId();

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
  
    const result = await upsertShareholder(body);

    if (!result) {
      return NextResponse.json({ error: "Failed to create shareholder" }, { status: 500 });
    }

    return NextResponse.json({ success: true, shareholder: result });
  } catch (error) {
    // Always return a JSON error response
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
export async function PUT(req: NextRequest) {
  const body: Shareholder = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const result = await updateShareholder( body.id,body);
  return NextResponse.json(result);
}
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing shareholder id' }, { status: 400 });
    }

    const result = await deleteShareholder(id);
   
    return NextResponse.json(result);
  } catch (error) {
    // Handle JSON parsing errors
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

