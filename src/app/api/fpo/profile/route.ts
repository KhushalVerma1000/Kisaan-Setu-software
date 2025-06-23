import { NextResponse } from 'next/server';
import { SupabaseFPORepository } from '@/server/features/fpo/infrastructure/persistence/SupabaseFPORepository';
import { FPOService } from '@/server/features/fpo/application/FPOService';
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'


const repo = new SupabaseFPORepository();
const service = new FPOService(repo);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

  try {
    const fpo = await service.getFPOById(id);
    return NextResponse.json({ success: true, data: fpo });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  const repo = new SupabaseFPORepository()
  const service = new FPOService(repo)

  const fpo = await service.createFPO({
    ...body,
    id: user.id, // 🟢 user.id becomes fpo.id
  })

  return NextResponse.json({ success: true, data: fpo })
}

export async function PUT(req: Request) {
  const body = await req.json();
  try {
    const fpo = await service.updateFPO(body.id, body);
    return NextResponse.json({ success: true, data: fpo });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
