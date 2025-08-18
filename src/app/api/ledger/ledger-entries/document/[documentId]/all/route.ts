import { getLedgerEntriesByDocumentId } from "@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase";

// /api/ledger/ledger-entries/document/[documentId]/all/route.ts
export async function GET(
    request: Request,
    { params }: { params: Promise<{ documentId: string }> }
) {
    try {
        const { documentId } = await params;
        
        if (!documentId) {
            return Response.json(
                { error: 'Document ID is required' },
                { status: 400 }
            );
        }

        const entries = await getLedgerEntriesByDocumentId(documentId);
        
        return Response.json({ 
            entries,
            count: entries.length
        });
    } catch (error) {
        console.error('Error in GET /api/ledger/ledger-entries/document/[documentId]/all:', error);
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
