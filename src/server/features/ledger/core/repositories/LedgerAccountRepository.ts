// @/server/features/ledger/core/repositories/LedgerAccountRepository.ts
//
// Interface only. The application service (LedgerAccountService) depends
// on this, not on Prisma directly — the Prisma implementation
// (PrismaLedgerAccountRepository) is an adapter plugged in at the
// composition point (see application/LedgerAccountService.ts's exported
// singleton). Swappable for tests (a fake in-memory repository) or a
// future persistence change without touching the service layer.

import { LedgerAccount } from "../entities/LedgerAccount";
import { Result, RepositoryError } from "@/server/core/Result";
import type { Prisma } from "@/generated/prisma/client";

// Write methods accept an optional Prisma transaction client so the
// application service layer can compose multiple repositories into one
// atomic prisma.$transaction() — e.g. creating a LedgerAccount and its
// Party or TaxConfiguration together, with a real rollback if either
// write fails. Falls back to the global prisma client when omitted.
export interface LedgerAccountRepository {
    findById(id: string): Promise<Result<LedgerAccount | null, RepositoryError>>;
    findAllByFpo(fpoId: string, groupName?: string): Promise<Result<LedgerAccount[], RepositoryError>>;
    getNameById(id: string): Promise<Result<string | null, RepositoryError>>;
    create(account: LedgerAccount, tx?: Prisma.TransactionClient): Promise<Result<LedgerAccount, RepositoryError>>;
    update(id: string, account: LedgerAccount, tx?: Prisma.TransactionClient): Promise<Result<LedgerAccount, RepositoryError>>;
    delete(id: string, tx?: Prisma.TransactionClient): Promise<Result<void, RepositoryError>>;
    bulkDelete(ids: string[], tx?: Prisma.TransactionClient): Promise<Result<void, RepositoryError>>;
}