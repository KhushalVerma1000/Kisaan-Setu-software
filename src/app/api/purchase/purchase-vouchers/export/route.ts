
import { NextRequest, NextResponse } from "next/server";
import { getAllFpoPurchaseVouchers } from '@/server/features/purchase/infrastructure/persistence/purchaseVoucherSupabase';

// GET /api/purchase-vouchers/export
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const fpoId = searchParams.get('fpoId');
        const format = searchParams.get('format') || 'json';

        if (!fpoId) {
            return NextResponse.json(
                { error: 'FPO ID is required' },
                { status: 400 }
            );
        }

        const vouchers = await getAllFpoPurchaseVouchers(fpoId);

        if (format === 'csv') {
            // Convert to CSV format
            const csvHeaders = [
                'ID', 'PO Number', 'Supplier Name', 'Invoice Number', 'Invoice Date',
                'Billing Address', 'GSTIN', 'Items Count', 'Sub Total', 'Total GST',
                'Grand Total', 'Status', 'Created At'
            ];

            const csvRows = vouchers.map(voucher => [
                voucher.id || '',
                voucher.poNumber || '',
                voucher.supplierVendorName,
                voucher.partyInvoiceNumber,
                voucher.partyInvoiceDate.toISOString().split('T')[0],
                voucher.supplierVendorBillingAddress,
                voucher.gstin || '',
                voucher.getItemsCount(),
                voucher.summary.subTotal,
                voucher.summary.totalGST,
                voucher.summary.grandTotal,
                voucher.status || 'draft',
                voucher.createdAt?.toISOString().split('T')[0] || ''
            ]);

            const csvContent = [csvHeaders, ...csvRows]
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n');

            return new Response(csvContent, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="purchase_vouchers_${fpoId}.csv"`
                }
            });
        }

        return NextResponse.json({ data: vouchers });

    } catch (error) {
        console.error('Error in GET /api/purchase-vouchers/export:', error);
        return NextResponse.json(
            { error: 'Failed to export purchase vouchers' },
            { status: 500 }
        );
    }
}