// /api/documents/list/route.ts or similar
import { getInvoicesList } from '@/server/features/sales/invoice/infrastructure/persistence/invoiceQueries';
import { getPurchaseVouchersList } from '@/server/features/purchase/infrastructure/persistence/purchaseVoucherSupabase';

interface DocumentListItem {
  id: string;
  displayName: string;
}

interface DocumentResult {
  data: any[] | null;
  error: any;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const documentType = url.searchParams.get('documentType');
  const ledgerId = url.searchParams.get('ledgerId');
  const status = url.searchParams.get('status');

  if (!documentType || !ledgerId) {
    return Response.json({ error: 'documentType and ledgerId are required' }, { status: 400 });
  }

  try {
    let result: DocumentResult | undefined;
    let displayNameField: string;

    // Convert null to undefined for status parameter
    const statusParam = status ?? undefined;

    // Determine which function to call based on document type
    switch (documentType) {
      case 'invoice':
        result = await getInvoicesList(ledgerId, statusParam);
        displayNameField = 'invoiceNumber';
        break;
      
      case 'purchase_voucher':
        result = await getPurchaseVouchersList(ledgerId, statusParam);
        displayNameField = 'voucherNumber';
        break;
      
      case 'sales_order':
        // result = await getSalesOrdersList(ledgerId, statusParam);
        // displayNameField = 'orderNumber';
        // break;
      
      default:
        return Response.json({ error: `Unsupported document type: ${documentType}` }, { status: 400 });
    }

    // Check if result exists and handle errors
    if (!result) {
      return Response.json({ error: 'No handler found for document type' }, { status: 400 });
    }

    if (result.error) {
      return Response.json({ error: result.error.message }, { status: 500 });
    }

    // Transform to consistent format
    const documents: DocumentListItem[] = result.data?.map((doc: any) => ({
      id: doc.id,
      displayName: doc[displayNameField] || 'Unnamed Document'
    })) || [];

    return Response.json({ documents });

  } catch (error) {
    console.error('Error fetching documents:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}