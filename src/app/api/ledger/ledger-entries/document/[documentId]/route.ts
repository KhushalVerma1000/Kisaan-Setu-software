import { bulkDeleteLedgerEntries, getLedgerEntriesByDocumentId, getLedgerEntryByDocumentId } from "@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase";

// /api/ledger/ledger-entries/document/[documentId]/route.ts
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

        const entry = await getLedgerEntryByDocumentId(documentId);
        
        if (!entry) {
            return Response.json(
                { error: 'Ledger entry not found for this document' },
                { status: 404 }
            );
        }

        return Response.json({ entry });
    } catch (error) {
        console.error('Error in GET /api/ledger/ledger-entries/document/[documentId]:', error);
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
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

        // Get all entries for this document first
        const entries = await getLedgerEntriesByDocumentId(documentId);
        
        if (entries.length === 0) {
            return Response.json(
                { message: 'No ledger entries found for this document', deletedCount: 0 }
            );
        }

        // Delete all entries for this document
        const entryIds = entries.map(entry => entry.id!);
        await bulkDeleteLedgerEntries(entryIds);

        return Response.json({ 
            message: `${entries.length} ledger entries deleted successfully`,
            deletedCount: entries.length,
            deletedEntries: entries
        });
    } catch (error) {
        console.error('Error in DELETE /api/ledger/ledger-entries/document/[documentId]:', error);
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}