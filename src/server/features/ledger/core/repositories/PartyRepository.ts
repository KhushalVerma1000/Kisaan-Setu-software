// @/server/features/ledger/core/repositories/PartyRepository.ts
//
// Interface only — see LedgerAccountRepository.ts for the reasoning
// behind the port/adapter split.

import { Party } from "../entities/Party";
import { Result, RepositoryError } from "@/server/core/Result";
import type { Prisma } from "@/generated/prisma/client";

export interface PartyRepository {
    findById(id: string): Promise<Result<Party | null, RepositoryError>>;
    findByLedgerAccountId(ledgerAccountId: string): Promise<Result<Party | null, RepositoryError>>;
    create(party: Party, tx?: Prisma.TransactionClient): Promise<Result<Party, RepositoryError>>;
    update(id: string, party: Party, tx?: Prisma.TransactionClient): Promise<Result<Party, RepositoryError>>;
    delete(id: string, tx?: Prisma.TransactionClient): Promise<Result<void, RepositoryError>>;
    deleteByLedgerAccountId(ledgerAccountId: string, tx?: Prisma.TransactionClient): Promise<Result<void, RepositoryError>>;

    /** Replaces the old getSupplierStateById — reads party.state via the ledger_account bridge. */
    getStateByLedgerAccountId(ledgerAccountId: string): Promise<Result<string | null, RepositoryError>>;
}