// app/api/shareholders/bulk-upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { bulkUpsertShareholders, validateShareholdersBeforeUpsert } from '@/server/features/ShareHolder/infrastructure/persistence/ShareHolderSupabase';
import { ShareholderProps } from '@/server/features/ShareHolder/core/entities/ShareHolder';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shareholders } = body;

    if (!shareholders || !Array.isArray(shareholders)) {
      return NextResponse.json({ error: 'Invalid shareholders data' }, { status: 400 });
    }

    if (shareholders.length === 0) {
      return NextResponse.json({ error: 'No shareholders provided' }, { status: 400 });
    }

    // Validate shareholders before processing
    const validation = await validateShareholdersBeforeUpsert(shareholders);
    
    if (validation.invalid.length > 0) {
      console.warn('Invalid shareholders found:', validation.invalid);
    }

    // Process valid shareholders
    if (validation.valid.length === 0) {
      return NextResponse.json({ 
        error: 'No valid shareholders to process',
        invalid: validation.invalid 
      }, { status: 400 });
    }

    const result = await bulkUpsertShareholders(validation.valid);

    return NextResponse.json({
      success: result.success,
      failed: [...result.failed, ...validation.invalid.map(inv => ({
        data: inv.data,
        error: inv.errors.join(', ')
      }))],
      summary: {
        total: shareholders.length,
        successful: result.success.length,
        failed: result.failed.length + validation.invalid.length
      }
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error during bulk upload" },
      { status: 500 }
    );
  }
}