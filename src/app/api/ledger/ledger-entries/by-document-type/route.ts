import { getLedgerEntriesByDocumentType } from "@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase";

// /api/ledger/ledger-entries/by-document-type/route.ts
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const documentType = searchParams.get('documentType');
        const limit = searchParams.get('limit');
        
        if (!documentType) {
            return Response.json(
                { error: 'Document type is required' },
                { status: 400 }
            );
        }

        const entries = await getLedgerEntriesByDocumentType(
            documentType,
            limit ? parseInt(limit) : undefined
        );
        
        return Response.json({ 
            entries,
            count: entries.length,
            documentType
        });
    } catch (error) {
        console.error('Error in GET /api/ledger/ledger-entries/by-document-type:', error);
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}