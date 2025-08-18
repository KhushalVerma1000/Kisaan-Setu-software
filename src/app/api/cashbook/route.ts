// /app/api/cashbook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCashBook, createCashBook, upsertCashBook } from '@/server/features/cashbookSystem/infrastructure/persistence/CashBookSupabase';
import { CashBook } from '@/server/features/cashbookSystem/core/entities/CashbookSystem';

// GET /api/cashbook - Get cashbook for current user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fpoId = searchParams.get('fpoId');

    const cashbook = await getCashBook()(fpoId || undefined);
    
    if (!cashbook) {
      return NextResponse.json(
        { error: 'Cashbook not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: cashbook 
    });
  } catch (error) {
    console.error('Error in GET /api/cashbook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/cashbook - Create new cashbook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fpoId, openingBalance, openingDate } = body;

    // Validation
    if (!fpoId || openingBalance === undefined || !openingDate) {
      return NextResponse.json(
        { error: 'Missing required fields: fpoId, openingBalance, openingDate' },
        { status: 400 }
      );
    }

    // Create CashBook instance
    const cashBook = new CashBook(
      fpoId,
      Number(openingBalance),
      new Date(openingDate)
    );

    const createdCashBook = await createCashBook(cashBook)();
    
    if (!createdCashBook) {
      return NextResponse.json(
        { error: 'Failed to create cashbook' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: createdCashBook 
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/cashbook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/cashbook - Update/Create cashbook (upsert)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { fpoId, openingBalance, openingDate, id } = body;

    // Validation
    if (!fpoId || openingBalance === undefined || !openingDate) {
      return NextResponse.json(
        { error: 'Missing required fields: fpoId, openingBalance, openingDate' },
        { status: 400 }
      );
    }

    // Create CashBook instance
    const cashBook = new CashBook(
      fpoId,
      Number(openingBalance),
      new Date(openingDate),
      id // Include ID if updating
    );

    const updatedCashBook = await upsertCashBook(cashBook)();
    
    if (!updatedCashBook) {
      return NextResponse.json(
        { error: 'Failed to update cashbook' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedCashBook 
    });
  } catch (error) {
    console.error('Error in PUT /api/cashbook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}