
  // API Route usage (app/api/documents/preview/route.ts)
  import { DocumentNumberService } from '@/server/services/document-number-service'
import { NextResponse } from "next/server";
  
  export async function POST(request: Request) {
    const service = await DocumentNumberService.create();
    const { fpoId, documentType } = await request.json();
    
    const preview = await service.previewNext(fpoId, documentType);
    
    return NextResponse.json(preview);
  }