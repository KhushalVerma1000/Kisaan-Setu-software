// /api/documents/detail/route.ts
import { getPurchaseVoucherById } from '@/server/features/purchase/infrastructure/persistence/purchaseVoucherSupabase';
import { getInvoiceById } from '@/server/features/sales/invoice/infrastructure/persistence/inviceSupabase';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const documentId = url.searchParams.get('documentId');
  const documentType = url.searchParams.get('documentType');

  if (!documentId || !documentType) {
    return Response.json({ 
      error: 'documentId and documentType are required' 
    }, { status: 400 });
  }

  try {
    let result;
    
    // Determine which function to call based on document type
    switch (documentType) {
      case 'invoice':
        result = await getInvoiceById(documentId)();
        break;
      
      case 'purchase_voucher':
        result = await getPurchaseVoucherById(documentId);
        break;
      
      case 'sales_order':
        // result = await getFullSalesOrder(documentId);
        // break;
      
      case 'purchase_order':
        // result = await getFullPurchaseOrder(documentId);
        // break;
      
      default:
        return Response.json({ 
          error: `Unsupported document type: ${documentType}` 
        }, { status: 400 });
    }

    // Check if document was found
    // if (result.error) {
    //   return Response.json({ 
    //     error: result.error.message 
    //   }, { status: 500 });
    // }

    if (!result) {
      return Response.json({ 
        error: 'Document not found' 
      }, { status: 404 });
    }

    return Response.json({ 
      document: result 
    });

  } catch (error) {
    console.error('Error fetching document details:', error);
    return Response.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
