// @/server/features/ledger/core/repositories/TaxConfigurationRepository.ts

import { TaxConfiguration, TaxType, TaxDirection } from "../entities/TaxConfiguration";
import { Result, RepositoryError } from "@/server/core/Result";
import type { Prisma } from "@/generated/prisma/client";

export interface TaxConfigurationRepository {
    findByLedgerAccountId(ledgerAccountId: string): Promise<Result<TaxConfiguration | null, RepositoryError>>;
    create(config: TaxConfiguration, tx?: Prisma.TransactionClient): Promise<Result<TaxConfiguration, RepositoryError>>;
    update(id: string, config: TaxConfiguration, tx?: Prisma.TransactionClient): Promise<Result<TaxConfiguration, RepositoryError>>;
    delete(id: string, tx?: Prisma.TransactionClient): Promise<Result<void, RepositoryError>>;
    deleteByLedgerAccountId(ledgerAccountId: string, tx?: Prisma.TransactionClient): Promise<Result<void, RepositoryError>>;

    /**
     * The core lookup GST/TDS/TCS posting needs: "give me the ledger
     * account id for CGST output for this FPO." Enforced unique at the
     * database level (fpo_id, tax_type, direction), so this can never
     * return an ambiguous result — either exactly one ledger or none.
     * Replaces getSystemLedger/getGSTOutputLedgers/getGSTInputLedgers
     * from systemLedgerService.ts, which did the equivalent lookup by
     * string-matching ledger_code instead of a structured column.
     */
    findLedgerAccountId(fpoId: string, taxType: TaxType, direction: TaxDirection): Promise<Result<string | null, RepositoryError>>;

    /** Batch version — one round trip for e.g. "all GST output ledgers for posting a sales invoice." */
    findLedgerAccountIds(fpoId: string, lookups: Array<{ taxType: TaxType; direction: TaxDirection }>): Promise<Result<Map<string, string>, RepositoryError>>;
}