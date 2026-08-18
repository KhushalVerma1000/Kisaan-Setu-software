// @/server/features/vouchers/infrastructure/persistence/voucherPrisma.ts
//
// Prisma replacement for voucherSupabase.ts. Same exported function names
// and signatures as the old file — only the two import sites need updating
// (see the migration notes at the bottom of this comment block), nothing
// else in the vouchers module changes.
//
// The one real behavioral difference (not just a swap): createVoucher,
// updateVoucher, and deleteVoucher now run inside prisma.$transaction().
// The old Supabase version inserted ledger entries, then inserted the
// voucher, and on voucher-insert failure issued a *second*, separate
// delete call to clean up the ledger entries it had already committed.
// That's not a rollback — it's a best-effort cleanup with its own failure
// mode (if the process crashes between the two calls, or the cleanup call
// itself fails, you're left with orphaned ledger entries that don't
// belong to any voucher). $transaction() makes the whole sequence atomic:
// either all of it lands, or none of it does, even across a crash.
//
// Also fixes a real bug found while porting: getVouchersByFpo was calling
// getLedgerEntriesByIds([voucherRow.ledger_entry_ids]) — wrapping the ids
// array in another array — which silently returned no ledger entries for
// list views. Fixed below (single array, not nested).
//
// Migration notes:
//   1. Update the import in VoucherService.ts from
//      '.../persistence/voucherSupabase' to '.../persistence/voucherPrisma'
//   2. Update the import in src/app/api/vouchers/[id]/route.ts the same way
//   3. Once both are switched and tested, delete voucherSupabase.ts
//
// Known limitation carried over unchanged from the original: voucher
// number generation (generateVoucherNumber) reads the last number then
// computes next+1 outside of a lock, so two concurrent requests for the
// same fpo_id/voucher_type/period can generate the same number — the
// second one will fail on the voucher_number unique constraint rather
// than silently duplicating, but it's a race, not a hard guarantee. Worth
// revisiting alongside the same fix planned for invoice numbering.

import { prisma } from "@/utils/Prisma/Client";
import type { Prisma } from "@/generated/prisma/client";
import {
    Voucher,
    JournalVoucher,
    VoucherFactory,
    VoucherLineItem,
} from "../../core/entities/VoucherSystem";
import { LedgerEntry } from "@/server/features/ledger/core/entities/Ledger";
import { getLedgerEntriesByIds } from "@/server/features/ledger/infrastructure/persistence/ledgerEntrySupabase";

// ============================================================================
// TYPES AND INTERFACES (unchanged from voucherSupabase.ts)
// ============================================================================

export interface CreateVoucherParams {
    voucherNumber: string;
    voucherType: 'payment' | 'receipt' | 'contra' | 'journal';
    date: Date;
    fpoId: string;
    description: string;
    notes?: string;
    lineItems: VoucherLineItem[];
    createdBy?: string;
}

export interface VoucherWithEntries {
    voucher: Voucher;
    ledgerEntries: LedgerEntry[];
}

export interface VoucherOperationResult {
    voucher: Voucher;
    ledgerEntries: LedgerEntry[];
    success: boolean;
    message: string;
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

// Prisma's Decimal fields (ledger_entry.amount) come back as Prisma.Decimal
// instances, not plain numbers — the entity layer (LedgerEntry, and every
// consumer that does `entry.amount + x`) expects a plain number, same as
// what Supabase/PostgREST was handing it before. Coerce at the boundary so
// nothing downstream of this file needs to know Prisma is involved.
function toLedgerEntry(row: {
    id: string;
    ledger_account_id: string;
    date: Date;
    amount: Prisma.Decimal | number;
    type: string;
    primary_description: string;
    document_id: string | null;
    document_type: string | null;
    document_number: string | null;
    secondary_description: string | null;
    reference_description: string | null;
    ledger_reference?: string | null;
    is_opening_balance?: boolean | null;
}): LedgerEntry {
    return LedgerEntry.fromDbFormat({
        ...row,
        amount: Number(row.amount),
    });
}

// Accepts either the top-level prisma client or a $transaction's tx client —
// both implement the same model API, so reads used inside and outside a
// transaction can share this one implementation.
async function fetchVoucherWithEntries(
    client: Prisma.TransactionClient | typeof prisma,
    voucherId: string
): Promise<VoucherWithEntries | null> {
    const voucherRow = await client.vouchers.findUnique({ where: { id: voucherId } });
    if (!voucherRow) return null;

    const voucher = VoucherFactory.fromDbFormat(voucherRow);
    const ledgerEntries = await getLedgerEntriesByIds(voucherRow.ledger_entry_ids);

    return { voucher, ledgerEntries };
}

// ============================================================================
// BASIC VOUCHER CRUD OPERATIONS
// ============================================================================

export async function getVoucherById(voucherId: string): Promise<VoucherWithEntries | null> {
    try {
        return await fetchVoucherWithEntries(prisma, voucherId);
    } catch (error) {
        console.error('Error fetching voucher by ID:', error);
        throw error;
    }
}

export async function getVoucherByNumber(voucherNumber: string): Promise<VoucherWithEntries | null> {
    try {
        const voucherRow = await prisma.vouchers.findUnique({ where: { voucher_number: voucherNumber } });
        if (!voucherRow) return null;

        const voucher = VoucherFactory.fromDbFormat(voucherRow);
        const ledgerEntries = await getLedgerEntriesByIds(voucherRow.ledger_entry_ids);

        return { voucher, ledgerEntries };
    } catch (error) {
        console.error('Error fetching voucher by number:', error);
        throw error;
    }
}

export async function getVouchersByFpo(params: {
    fpoId: string;
    voucherType?: 'payment' | 'receipt' | 'contra' | 'journal';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}): Promise<VoucherWithEntries[]> {
    try {
        const where: Prisma.vouchersWhereInput = {
            fpo_id: params.fpoId,
            ...(params.voucherType ? { voucher_type: params.voucherType } : {}),
            ...(params.startDate || params.endDate
                ? {
                    date: {
                        ...(params.startDate ? { gte: params.startDate } : {}),
                        ...(params.endDate ? { lte: params.endDate } : {}),
                    },
                }
                : {}),
        };

        const voucherRows = await prisma.vouchers.findMany({
            where,
            orderBy: [{ date: "desc" }, { created_at: "desc" }],
            ...(params.limit ? { take: params.limit } : {}),
            ...(params.offset ? { skip: params.offset } : {}),
        });

        // NOTE: fixed from the original, which called
        // getLedgerEntriesByIds([voucherRow.ledger_entry_ids]) — an extra
        // array wrapper that made every list view return zero ledger
        // entries per voucher.
        const vouchersWithEntries = await Promise.all(
            voucherRows.map(async (voucherRow) => {
                const voucher = VoucherFactory.fromDbFormat(voucherRow);
                const ledgerEntries = await getLedgerEntriesByIds(voucherRow.ledger_entry_ids);
                return { voucher, ledgerEntries };
            })
        );

        return vouchersWithEntries;
    } catch (error) {
        console.error('Error fetching vouchers by FPO:', error);
        throw error;
    }
}

export async function getVouchersByDateRange(
    fpoId: string,
    startDate: Date,
    endDate: Date
): Promise<VoucherWithEntries[]> {
    return getVouchersByFpo({ fpoId, startDate, endDate });
}

// ============================================================================
// CREATE VOUCHER WITH LEDGER ENTRIES
// ============================================================================

export async function createVoucher(params: CreateVoucherParams): Promise<VoucherOperationResult> {
    try {
        // 1. Create voucher instance based on type (unchanged business logic)
        let voucher: Voucher;

        switch (params.voucherType) {
            case 'payment':
                voucher = VoucherFactory.createPaymentVoucher({
                    voucherNumber: params.voucherNumber,
                    date: params.date,
                    fpoId: params.fpoId,
                    description: params.description,
                    notes: params.notes,
                });
                break;
            case 'receipt':
                voucher = VoucherFactory.createReceiptVoucher({
                    voucherNumber: params.voucherNumber,
                    date: params.date,
                    fpoId: params.fpoId,
                    description: params.description,
                    notes: params.notes,
                });
                break;
            case 'contra':
                voucher = VoucherFactory.createContraVoucher({
                    voucherNumber: params.voucherNumber,
                    date: params.date,
                    fpoId: params.fpoId,
                    description: params.description,
                    notes: params.notes,
                });
                break;
            case 'journal':
                voucher = VoucherFactory.createJournalVoucher({
                    voucherNumber: params.voucherNumber,
                    date: params.date,
                    fpoId: params.fpoId,
                    description: params.description,
                    notes: params.notes,
                });
                break;
            default:
                throw new Error(`Invalid voucher type: ${params.voucherType}`);
        }

        // 2. Add line items to voucher
        params.lineItems.forEach(item => voucher.addLineItem(item));

        // 3. Validate voucher (Dr/Cr balance, type-specific rules)
        voucher.validate();

        // 4. Build ledger entries from line items
        const ledgerEntriesDbFormat = params.lineItems.map(item => ({
            ledger_account_id: item.ledgerAccountId,
            date: params.date,
            amount: item.amount,
            type: item.type,
            primary_description: `${params.voucherType.charAt(0).toUpperCase() + params.voucherType.slice(1)} Voucher #${params.voucherNumber}`,
            secondary_description: item.description,
            reference_description: params.description,
            document_type: `${params.voucherType}_voucher`,
            document_number: params.voucherNumber,
            ledger_reference: item.ledgerReference,
            is_opening_balance: false,
        }));

        // 5-8. Everything below used to be four separate Supabase calls
        // with a manual "delete the ledger entries if the voucher insert
        // fails" rollback. Now it's one transaction — if any step throws,
        // Postgres rolls back everything automatically, no cleanup code
        // needed.
        const { createdVoucher, createdLedgerEntries } = await prisma.$transaction(async (tx) => {
            const createdLedgerEntries = await tx.ledger_entry.createManyAndReturn({
                data: ledgerEntriesDbFormat,
            });

            voucher.ledgerEntryIds = createdLedgerEntries.map(entry => entry.id);

            const createdVoucher = await tx.vouchers.create({
                data: {
                    ...voucher.toDbFormat(),
                    created_by: params.createdBy,
                },
            });

            await tx.ledger_entry.updateMany({
                where: { id: { in: voucher.ledgerEntryIds } },
                data: { document_id: createdVoucher.id },
            });

            return { createdVoucher, createdLedgerEntries };
        });

        // 9. Return complete result
        const finalVoucher = VoucherFactory.fromDbFormat(createdVoucher);
        const finalLedgerEntries = createdLedgerEntries.map(toLedgerEntry);

        console.log(`✓ Created ${params.voucherType} voucher #${params.voucherNumber} with ${finalLedgerEntries.length} ledger entries`);

        return {
            voucher: finalVoucher,
            ledgerEntries: finalLedgerEntries,
            success: true,
            message: `${params.voucherType.charAt(0).toUpperCase() + params.voucherType.slice(1)} voucher #${params.voucherNumber} created successfully`,
        };
    } catch (error) {
        console.error('Error creating voucher:', error);
        throw error;
    }
}

// ============================================================================
// UPDATE VOUCHER
// ============================================================================

export async function updateVoucher(
    voucherId: string,
    updates: {
        description?: string;
        notes?: string;
        lineItems?: VoucherLineItem[];
    }
): Promise<VoucherOperationResult> {
    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Fetch existing voucher (inside the tx, so this read is
            // part of the same atomic sequence as the writes below)
            const existingVoucher = await fetchVoucherWithEntries(tx, voucherId);
            if (!existingVoucher) {
                throw new Error('Voucher not found');
            }

            let ledgerEntryIds = existingVoucher.voucher.ledgerEntryIds;

            // 2. If updating line items, delete old ledger entries and create new ones
            if (updates.lineItems) {
                await tx.ledger_entry.deleteMany({
                    where: { id: { in: existingVoucher.voucher.ledgerEntryIds } },
                });

                existingVoucher.voucher.lineItems = [];
                updates.lineItems.forEach(item => existingVoucher.voucher.addLineItem(item));
                existingVoucher.voucher.validate();

                const newLedgerEntries = existingVoucher.voucher.createLedgerEntries();
                const ledgerEntriesDbFormat = newLedgerEntries.map(entry => ({
                    ledger_account_id: entry.ledgerAccountId!,
                    date: entry.date!,
                    amount: entry.amount!,
                    type: entry.type!,
                    primary_description: entry.primaryDescription!,
                    secondary_description: entry.secondaryDescription,
                    reference_description: entry.referenceDescription,
                    document_id: voucherId,
                    document_type: entry.documentType,
                    document_number: entry.documentNumber,
                    is_opening_balance: false,
                }));

                const createdEntries = await tx.ledger_entry.createManyAndReturn({
                    data: ledgerEntriesDbFormat,
                });

                ledgerEntryIds = createdEntries.map(e => e.id);
            }

            // 3. Update voucher record
            const updatedVoucher = await tx.vouchers.update({
                where: { id: voucherId },
                data: {
                    updated_at: new Date(),
                    ...(updates.description !== undefined ? { description: updates.description } : {}),
                    ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
                    ...(updates.lineItems ? { ledger_entry_ids: ledgerEntryIds } : {}),
                },
            });

            return updatedVoucher;
        });

        // 4. Fetch updated ledger entries (outside the tx — read-only, no
        // need to hold the transaction open for this)
        const ledgerEntries = await getLedgerEntriesByIds(result.ledger_entry_ids);

        return {
            voucher: VoucherFactory.fromDbFormat(result),
            ledgerEntries,
            success: true,
            message: `Voucher #${result.voucher_number} updated successfully`,
        };
    } catch (error) {
        console.error('Error updating voucher:', error);
        throw error;
    }
}

// ============================================================================
// DELETE VOUCHER
// ============================================================================

export async function deleteVoucher(voucherId: string): Promise<{ success: boolean; message: string }> {
    try {
        const voucherNumber = await prisma.$transaction(async (tx) => {
            const voucher = await tx.vouchers.findUnique({
                where: { id: voucherId },
                select: { ledger_entry_ids: true, voucher_number: true },
            });

            if (!voucher) {
                throw new Error('Voucher not found');
            }

            if (voucher.ledger_entry_ids && voucher.ledger_entry_ids.length > 0) {
                await tx.ledger_entry.deleteMany({
                    where: { id: { in: voucher.ledger_entry_ids } },
                });
            }

            await tx.vouchers.delete({ where: { id: voucherId } });

            return voucher.voucher_number;
        });

        return {
            success: true,
            message: `Voucher #${voucherNumber} deleted successfully`,
        };
    } catch (error) {
        console.error('Error deleting voucher:', error);
        throw error;
    }
}

// ============================================================================
// REVERSAL OPERATIONS
// ============================================================================

export async function createReversalVoucher(
    originalVoucherId: string,
    reversalDate: Date,
    reversalDescription?: string,
    createdBy?: string
): Promise<VoucherOperationResult> {
    try {
        const originalVoucher = await getVoucherById(originalVoucherId);
        if (!originalVoucher) {
            throw new Error('Original voucher not found');
        }

        if (originalVoucher.voucher.voucherType !== 'journal') {
            throw new Error('Only journal vouchers can be reversed');
        }

        const journalVoucher = originalVoucher.voucher as JournalVoucher;
        const reversalVoucherNumber = await generateVoucherNumber('journal', reversalDate, originalVoucher.voucher.fpoId);

        const reversalVoucher = journalVoucher.createReversalVoucher(
            reversalVoucherNumber,
            reversalDate,
            reversalDescription
        );

        // Delegates to createVoucher, which opens its own $transaction —
        // no nested transaction needed here.
        return await createVoucher({
            voucherNumber: reversalVoucher.voucherNumber,
            voucherType: 'journal',
            date: reversalVoucher.date,
            fpoId: reversalVoucher.fpoId,
            description: reversalVoucher.description,
            notes: reversalVoucher.notes,
            lineItems: reversalVoucher.lineItems,
            createdBy,
        });
    } catch (error) {
        console.error('Error creating reversal voucher:', error);
        throw error;
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export async function generateVoucherNumber(
    voucherType: 'payment' | 'receipt' | 'contra' | 'journal',
    date: Date,
    fpoId: string
): Promise<string> {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    const prefixes = {
        payment: 'PAY',
        receipt: 'REC',
        contra: 'CON',
        journal: 'JRN',
    };

    const prefix = `${prefixes[voucherType]}/${year}${month}/`;

    const lastVoucher = await prisma.vouchers.findFirst({
        where: {
            fpo_id: fpoId,
            voucher_type: voucherType,
            voucher_number: { startsWith: prefix },
        },
        orderBy: { voucher_number: "desc" },
        select: { voucher_number: true },
    });

    let nextSequence = 1;

    if (lastVoucher) {
        const lastSequence = parseInt(lastVoucher.voucher_number.split('/').pop() || '0');
        nextSequence = lastSequence + 1;
    }

    return `${prefix}${String(nextSequence).padStart(4, '0')}`;
}

export async function validateVoucherBalance(voucherId: string): Promise<{
    isBalanced: boolean;
    totalDebits: number;
    totalCredits: number;
    difference: number;
}> {
    try {
        const voucher = await prisma.vouchers.findUnique({
            where: { id: voucherId },
            select: { ledger_entry_ids: true },
        });

        if (!voucher) {
            throw new Error('Voucher not found');
        }

        if (!voucher.ledger_entry_ids || voucher.ledger_entry_ids.length === 0) {
            return { isBalanced: true, totalDebits: 0, totalCredits: 0, difference: 0 };
        }

        const entries = await prisma.ledger_entry.findMany({
            where: { id: { in: voucher.ledger_entry_ids } },
            select: { amount: true, type: true },
        });

        const totalDebits = entries
            .filter(entry => entry.type === 'Dr')
            .reduce((sum, entry) => sum + Number(entry.amount), 0);

        const totalCredits = entries
            .filter(entry => entry.type === 'Cr')
            .reduce((sum, entry) => sum + Number(entry.amount), 0);

        const difference = Math.abs(totalDebits - totalCredits);
        const isBalanced = difference < 0.01;

        return { isBalanced, totalDebits, totalCredits, difference };
    } catch (error) {
        console.error('Error validating voucher balance:', error);
        throw error;
    }
}

export async function getVoucherSummary(params: {
    fpoId: string;
    startDate: Date;
    endDate: Date;
}): Promise<{
    totalVouchers: number;
    byType: {
        payment: number;
        receipt: number;
        contra: number;
        journal: number;
    };
    totalAmount: {
        payment: number;
        receipt: number;
    };
}> {
    try {
        const vouchers = await prisma.vouchers.findMany({
            where: {
                fpo_id: params.fpoId,
                date: { gte: params.startDate, lte: params.endDate },
            },
            select: { voucher_type: true, ledger_entry_ids: true },
        });

        const summary = {
            totalVouchers: vouchers.length,
            byType: { payment: 0, receipt: 0, contra: 0, journal: 0 },
            totalAmount: { payment: 0, receipt: 0 },
        };

        vouchers.forEach(v => {
            summary.byType[v.voucher_type as keyof typeof summary.byType]++;
        });

        for (const voucher of vouchers) {
            if (voucher.voucher_type === 'payment' || voucher.voucher_type === 'receipt') {
                const entries = await getLedgerEntriesByIds(voucher.ledger_entry_ids);
                const amount = entries.reduce((sum, entry) => sum + entry.amount, 0) / 2; // Divide by 2 since Dr=Cr

                if (voucher.voucher_type === 'payment') {
                    summary.totalAmount.payment += amount;
                } else {
                    summary.totalAmount.receipt += amount;
                }
            }
        }

        return summary;
    } catch (error) {
        console.error('Error getting voucher summary:', error);
        throw error;
    }
}