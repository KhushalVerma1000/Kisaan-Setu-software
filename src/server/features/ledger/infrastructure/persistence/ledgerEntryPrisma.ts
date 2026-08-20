// @/server/features/ledger/infrastructure/persistence/ledgerEntryPrisma.ts
//
// Prisma port of the CORE ledger_entry functions — the 13 read/write
// functions that vouchers, reports, and the ledger-entries API routes
// actually call. Same function names and signatures as the Supabase
// version; only the import path changes at call sites (see the bottom of
// this comment).
//
// Deliberately NOT ported here (still in ledgerEntrySupabase.ts):
//   - createSalesInvoiceEntry / createPurchaseVoucherEntry — these are
//     the flagged one-sided posting functions on the roadmap for
//     replacement (proper double-entry via the vouchers table), not just
//     a client swap. Converting them now means writing them twice.
//   - createLedgerEntryFromPaymentOperation,
//     createLedgerEntriesFromPaymentOperations,
//     createPaymentLedgerEntryWithFullContext,
//     createGenericTransactionEntry — zero callers anywhere in the
//     codebase (confirmed by grep). Dead code; not worth porting until
//     something actually calls them, and worth considering for deletion
//     instead.
//
// Two real bugs fixed while porting, not just an ORM swap:
//   1. getAllLedgerEntries had `awa` instead of `await supabase` in the
//      original — a ReferenceError waiting to happen on every call. Not
//      hit yet only because nothing currently calls it in the running
//      app; still broken code.
//   2. getLedgerEntriesByVoucherType joined `ledger_account` selecting
//      account_name/account_code/account_type — none of which exist as
//      columns on ledger_account (real columns are name/ledger_code/
//      group_name). The join silently returned nulls and the joined data
//      was never actually used downstream (LedgerEntry.fromDbFormat only
//      reads flat ledger_entry fields), so it's dropped here rather than
//      fixed — it wasn't doing anything.
//
// Migration notes — update the import path in these 13 files from
// '.../persistence/ledgerEntrySupabase' to '.../persistence/ledgerEntryPrisma':
//   src/server/features/vouchers/infrastructure/persistence/voucherPrisma.ts
//     (already points here if you used the file from the vouchers pass —
//      if not, update it now)
//   src/server/features/bankbookSystm/infrastructure/persistence/BankBookEntrySystem.ts
//   src/server/features/cashbookSystem/infrastructure/persistence/CashBookEntrySupabase.ts
//   src/app/api/cashbook/report/route.ts
//   src/app/api/ledger/ledger-entries/bulk-delete/route.ts
//   src/app/api/ledger/ledger-entries/route.ts
//   src/app/api/ledger/ledger-entries/opening-balance/route.ts
//   src/app/api/ledger/ledger-entries/by-document-type/route.ts
//   src/app/api/ledger/ledger-entries/document/[documentId]/route.ts
//   src/app/api/ledger/ledger-entries/document/[documentId]/all/route.ts
//   src/app/api/ledger/ledger-entries/[id]/route.ts
//   src/app/api/ledger/ledger-entries/balance/route.ts
//   src/app/api/ledger/ledger-entries/statement/route.ts
//
// Leave these two pointed at ledgerEntrySupabase.ts — they use the
// deferred functions:
//   src/app/api/ledger/ledger-entries/transactions/sales/route.ts
//   src/app/api/ledger/ledger-entries/transactions/purchase/route.ts

import { prisma } from "@/utils/Prisma/Client";
import type { Prisma } from "@/generated/prisma/client";
import {
    Ledger,
    LedgerAccount,
    LedgerEntry,
    LedgerEntryInterface,
    createOpeningBalanceEntry as buildOpeningBalanceEntry,
} from "../../core/entities/Ledger";

// ============================================================================
// INTERNAL HELPERS — Decimal coercion + db-row mapping at the Prisma boundary
// ============================================================================

// ledger_entry.amount and ledger_account.opening_balance are both
// @db.Decimal columns. Prisma returns those as Prisma.Decimal instances,
// not plain numbers, unlike Supabase/PostgREST which handed back plain
// JSON numbers. LedgerEntry.fromDbFormat does arithmetic directly on
// amount (`entry.amount + x`), so coerce here rather than touching the
// entity class.
function toLedgerEntry(row: Record<string, unknown>): LedgerEntry {
    return LedgerEntry.fromDbFormat({ ...row, amount: Number(row.amount) });
}

// LedgerAccount no longer has fromDbFormat baked in (see the Party/
// LedgerAccount split — proper domain/persistence separation means db-row
// mapping lives in the infrastructure layer, not on the entity). This
// mirrors the mapper in PrismaLedgerAccountRepository.toDomain — kept
// duplicated here rather than importing the repository, since this file
// only needs a read-only mapper, not the full repository surface.
function toLedgerAccount(row: {
    id: string;
    name: string;
    group_name: string;
    opening_balance: unknown;
    balance_type: 'Dr' | 'Cr';
    fpo_id: string | null;
    bank_details: unknown;
    is_system_ledger: boolean | null;
    ledger_code: string | null;
}): LedgerAccount {
    return new LedgerAccount({
        id: row.id,
        name: row.name,
        groupName: row.group_name,
        openingBalance: Number(row.opening_balance),
        balanceType: row.balance_type,
        fpoId: row.fpo_id ?? undefined,
        bankDetails: (row.bank_details as any) ?? undefined,
        isSystemLedger: row.is_system_ledger ?? false,
        ledgerCode: row.ledger_code,
    });
}

// ============================================================================
// BASIC CRUD OPERATIONS
// ============================================================================

export async function getAllLedgerEntries(ledgerAccountId: string): Promise<LedgerEntry[]> {
    try {
        const rows = await prisma.ledger_entry.findMany({
            where: { ledger_account_id: ledgerAccountId },
            orderBy: { date: "desc" },
        });

        return rows.map(toLedgerEntry);
    } catch (error) {
        console.error('Error fetching ledger entries:', error);
        throw error;
    }
}

export async function getLedgerEntryById(entryId: string): Promise<LedgerEntry | null> {
    try {
        const row = await prisma.ledger_entry.findUnique({ where: { id: entryId } });
        return row ? toLedgerEntry(row) : null;
    } catch (error) {
        console.error('Error fetching ledger entry by ID:', error);
        throw error;
    }
}

export async function getLedgerEntriesByIds(entryIds: string[]): Promise<LedgerEntry[]> {
    if (!entryIds || entryIds.length === 0) {
        return [];
    }

    try {
        const rows = await prisma.ledger_entry.findMany({
            where: { id: { in: entryIds } },
            orderBy: { type: "asc" }, // Dr before Cr
        });

        return rows.map(toLedgerEntry);
    } catch (error) {
        throw new Error(`Failed to fetch ledger entries: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function getLedgerEntryByDocumentId(documentId: string): Promise<LedgerEntry | null> {
    try {
        const row = await prisma.ledger_entry.findFirst({ where: { document_id: documentId } });
        return row ? toLedgerEntry(row) : null;
    } catch (error) {
        console.error('Error fetching ledger entry by document ID:', error);
        throw error;
    }
}

export async function getLedgerEntriesByDocumentId(documentId: string): Promise<LedgerEntry[]> {
    try {
        const rows = await prisma.ledger_entry.findMany({
            where: { document_id: documentId },
            orderBy: { date: "desc" },
        });

        return rows.map(toLedgerEntry);
    } catch (error) {
        console.error('Error fetching ledger entries by document ID:', error);
        throw error;
    }
}

export async function getLedgerEntriesByDocumentType(
    documentType: string,
    limit?: number
): Promise<LedgerEntry[]> {
    try {
        const rows = await prisma.ledger_entry.findMany({
            where: { document_type: documentType },
            orderBy: { date: "desc" },
            ...(limit ? { take: limit } : {}),
        });

        return rows.map(toLedgerEntry);
    } catch (error) {
        console.error('Error fetching ledger entries by document type:', error);
        throw error;
    }
}

export async function createLedgerEntry(entryData: LedgerEntryInterface): Promise<LedgerEntry> {
    try {
        const newEntry = new LedgerEntry(
            entryData.ledgerAccountId,
            entryData.date,
            entryData.amount,
            entryData.type,
            entryData.primaryDescription,
            entryData.id,
            entryData.documentId,
            entryData.documentType,
            entryData.documentNumber,
            entryData.secondaryDescription,
            entryData.referenceDescription,
            entryData.ledgerReference,
            entryData.isOpeningBalance || false
        );

        const { id, ...createFields } = newEntry.toDbFormat();

        const row = await prisma.ledger_entry.create({ data: createFields });
        return toLedgerEntry(row);
    } catch (error) {
        console.error('Error in createLedgerEntry:', error);
        throw error;
    }
}

export async function updateLedgerEntry(entryId: string, entryData: LedgerEntryInterface): Promise<LedgerEntry> {
    try {
        const updatedEntry = new LedgerEntry(
            entryData.ledgerAccountId,
            entryData.date,
            entryData.amount,
            entryData.type,
            entryData.primaryDescription,
            entryId,
            entryData.documentId,
            entryData.documentType,
            entryData.documentNumber,
            entryData.secondaryDescription,
            entryData.referenceDescription,
            entryData.ledgerReference,
            entryData.isOpeningBalance || false
        );

        const { id, ...updateFields } = updatedEntry.toDbFormat();

        const row = await prisma.ledger_entry.update({
            where: { id: entryId },
            data: updateFields,
        });

        return toLedgerEntry(row);
    } catch (error) {
        console.error('Error in updateLedgerEntry:', error);
        throw error;
    }
}

export async function deleteLedgerEntry(entryId: string): Promise<void> {
    try {
        await prisma.ledger_entry.delete({ where: { id: entryId } });
        console.log(`Ledger entry ${entryId} deleted successfully`);
    } catch (error) {
        console.error('Error in deleteLedgerEntry:', error);
        throw error;
    }
}

// ============================================================================
// STATEMENTS AND BALANCES
// ============================================================================

export async function getLedgerWithStatement(
    ledgerAccountId: string,
    startDate?: Date,
    endDate?: Date
): Promise<{
    ledgerAccount: LedgerAccount;
    statement: Array<{
        entry: LedgerEntry;
        runningBalance: number;
        runningBalanceType: 'Dr' | 'Cr';
    }>;
    currentBalance: { balance: number; balanceType: 'Dr' | 'Cr' };
}> {
    try {
        const accountRow = await prisma.ledger_account.findUnique({ where: { id: ledgerAccountId } });
        if (!accountRow) {
            throw new Error('Ledger account not found');
        }

        const ledgerAccount = toLedgerAccount(accountRow);

        // openingDate moved to Party with the Party/LedgerAccount split —
        // system ledgers (no linked party) simply have none, which
        // Ledger.getStatementWithRunningBalance already handles (treats
        // undefined openingDate as "opening balance never included when a
        // startDate filter is applied", same as the old behavior for
        // ledgers that had no stored opening_date).
        const partyRow = await prisma.party.findUnique({
            where: { ledger_account_id: ledgerAccountId },
            select: { opening_date: true },
        });

        const entryRows = await prisma.ledger_entry.findMany({
            where: {
                ledger_account_id: ledgerAccountId,
                ...(startDate && endDate ? { date: { gte: startDate, lte: endDate } } : {}),
            },
            orderBy: { date: "asc" },
        });

        const ledgerEntries = entryRows.map(toLedgerEntry);

        const ledger = new Ledger(ledgerAccount, ledgerEntries, partyRow?.opening_date ?? undefined);
        const statement = ledger.getStatementWithRunningBalance(startDate, endDate);
        const currentBalance = ledger.getCurrentBalance();

        return { ledgerAccount, statement, currentBalance };
    } catch (error) {
        console.error('Error getting ledger with statement:', error);
        throw error;
    }
}

export async function getLedgerBalance(ledgerAccountId: string): Promise<{ balance: number; balanceType: 'Dr' | 'Cr' }> {
    try {
        const accountRow = await prisma.ledger_account.findUnique({ where: { id: ledgerAccountId } });
        if (!accountRow) {
            throw new Error('Ledger account not found');
        }

        const entryRows = await prisma.ledger_entry.findMany({ where: { ledger_account_id: ledgerAccountId } });

        const ledgerAccount = toLedgerAccount(accountRow);
        const ledgerEntries = entryRows.map(toLedgerEntry);

        const ledger = new Ledger(ledgerAccount, ledgerEntries);
        return ledger.getCurrentBalance();
    } catch (error) {
        console.error('Error calculating ledger balance:', error);
        throw error;
    }
}

export async function createOpeningBalanceEntry(ledgerAccountId: string): Promise<LedgerEntry> {
    try {
        const accountRow = await prisma.ledger_account.findUnique({ where: { id: ledgerAccountId } });
        if (!accountRow) {
            throw new Error('Ledger account not found');
        }

        // Same reasoning as getLedgerWithStatement above — opening date
        // now lives on Party, not LedgerAccount.
        const partyRow = await prisma.party.findUnique({
            where: { ledger_account_id: ledgerAccountId },
            select: { opening_date: true },
        });

        const ledgerAccount = toLedgerAccount(accountRow);
        const openingEntry = buildOpeningBalanceEntry(ledgerAccount, partyRow?.opening_date ?? undefined);

        const { id, ...createFields } = openingEntry.toDbFormat();

        const row = await prisma.ledger_entry.create({ data: createFields });
        return toLedgerEntry(row);
    } catch (error) {
        console.error('Error in createOpeningBalanceEntry:', error);
        throw error;
    }
}

export async function bulkDeleteLedgerEntries(entryIds: string[]): Promise<void> {
    try {
        if (!entryIds || entryIds.length === 0) {
            throw new Error('No entry IDs provided for deletion');
        }

        const result = await prisma.ledger_entry.deleteMany({ where: { id: { in: entryIds } } });
        console.log(`${result.count} ledger entries deleted successfully`);
    } catch (error) {
        console.error('Error in bulkDeleteLedgerEntries:', error);
        throw error;
    }
}

export async function getLedgerEntriesByVoucherType(
    fpoId: string,
    voucherType: 'payment' | 'receipt' | 'contra' | 'journal',
    startDate: Date,
    endDate: Date
): Promise<LedgerEntry[]> {
    try {
        // NOTE: the original also joined ledger_account selecting
        // account_name/account_code/account_type — none of which exist
        // as columns on ledger_account, and the joined data was never
        // read downstream. Dropped rather than ported.
        const rows = await prisma.ledger_entry.findMany({
            where: {
                document_type: `${voucherType}_voucher`,
                date: { gte: startDate, lte: endDate },
            },
            orderBy: [{ date: "desc" }, { created_at: "desc" }],
        });

        return rows.map(toLedgerEntry);
    } catch (error) {
        console.error('Error in getLedgerEntriesByVoucherType:', error);
        throw error;
    }
}

export async function validateVoucherBalance(voucherId: string): Promise<{
    isBalanced: boolean;
    totalDebits: number;
    totalCredits: number;
    difference: number;
}> {
    try {
        const entries = await prisma.ledger_entry.findMany({
            where: { document_id: voucherId },
            select: { amount: true, type: true },
        });

        if (entries.length === 0) {
            return { isBalanced: true, totalDebits: 0, totalCredits: 0, difference: 0 };
        }

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
        console.error('Error in validateVoucherBalance:', error);
        throw error;
    }
}