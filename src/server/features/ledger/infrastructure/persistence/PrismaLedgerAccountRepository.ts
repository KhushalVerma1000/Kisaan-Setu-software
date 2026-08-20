// @/server/features/ledger/infrastructure/persistence/PrismaLedgerAccountRepository.ts

import { prisma } from "@/utils/Prisma/Client";
import type { Prisma, ledger_account as LedgerAccountRow } from "@/generated/prisma/client";
import { LedgerAccount, BankDetails } from "../../core/entities/LedgerAccount";
import { LedgerAccountRepository } from "../../core/repositories/LedgerAccountRepository";
import { Result, ok, err, notFound, databaseError, RepositoryError } from "@/server/core/Result";

function isPrismaNotFoundError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "P2025";
}

function toDomain(row: LedgerAccountRow): LedgerAccount {
    return new LedgerAccount({
        id: row.id,
        name: row.name,
        groupName: row.group_name,
        openingBalance: Number(row.opening_balance),
        balanceType: row.balance_type,
        fpoId: row.fpo_id ?? undefined,
        bankDetails: (row.bank_details as unknown as BankDetails) ?? undefined,
        isSystemLedger: row.is_system_ledger ?? false,
        ledgerCode: row.ledger_code,
    });
}

function toWriteData(account: LedgerAccount): Omit<Prisma.ledger_accountUncheckedCreateInput, "id"> {
    return {
        name: account.name,
        group_name: account.groupName,
        opening_balance: account.openingBalance,
        balance_type: account.balanceType,
        fpo_id: account.fpoId,
        // Prisma's Json input type doesn't accept `undefined` — Prisma.JsonNull
        // is the explicit "set this JSON column to SQL NULL" value.
        bank_details: account.bankDetails ? (account.bankDetails as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        is_system_ledger: account.isSystemLedger,
        ledger_code: account.ledgerCode,
    };
}

export class PrismaLedgerAccountRepository implements LedgerAccountRepository {
    async findById(id: string): Promise<Result<LedgerAccount | null, RepositoryError>> {
        try {
            const row = await prisma.ledger_account.findUnique({ where: { id } });
            return ok(row ? toDomain(row) : null);
        } catch (error) {
            return err(databaseError("Failed to fetch ledger account", error));
        }
    }

    async findAllByFpo(fpoId: string, groupName?: string): Promise<Result<LedgerAccount[], RepositoryError>> {
        try {
            const rows = await prisma.ledger_account.findMany({
                where: { fpo_id: fpoId, ...(groupName ? { group_name: groupName } : {}) },
            });
            return ok(rows.map(toDomain));
        } catch (error) {
            return err(databaseError("Failed to fetch ledger accounts", error));
        }
    }

    async getNameById(id: string): Promise<Result<string | null, RepositoryError>> {
        try {
            const row = await prisma.ledger_account.findUnique({ where: { id }, select: { name: true } });
            return ok(row?.name ?? null);
        } catch (error) {
            return err(databaseError("Failed to fetch ledger account name", error));
        }
    }

    async create(account: LedgerAccount, tx?: Prisma.TransactionClient): Promise<Result<LedgerAccount, RepositoryError>> {
        try {
            const row = await (tx ?? prisma).ledger_account.create({ data: toWriteData(account) });
            return ok(toDomain(row));
        } catch (error) {
            return err(databaseError("Failed to create ledger account", error));
        }
    }

    async update(id: string, account: LedgerAccount, tx?: Prisma.TransactionClient): Promise<Result<LedgerAccount, RepositoryError>> {
        try {
            const row = await (tx ?? prisma).ledger_account.update({ where: { id }, data: toWriteData(account) });
            return ok(toDomain(row));
        } catch (error) {
            if (isPrismaNotFoundError(error)) {
                return err(notFound(`Ledger account ${id} not found`));
            }
            return err(databaseError("Failed to update ledger account", error));
        }
    }

    async delete(id: string, tx?: Prisma.TransactionClient): Promise<Result<void, RepositoryError>> {
        try {
            // Ledger entries for this account are deleted first, in the
            // same transaction, by the application service — this
            // repository method only removes the account itself. See
            // LedgerAccountService.deleteLedgerAccount for the orchestration.
            await (tx ?? prisma).ledger_account.delete({ where: { id } });
            return ok(undefined);
        } catch (error) {
            if (isPrismaNotFoundError(error)) {
                return err(notFound(`Ledger account ${id} not found`));
            }
            return err(databaseError("Failed to delete ledger account", error));
        }
    }

    async bulkDelete(ids: string[], tx?: Prisma.TransactionClient): Promise<Result<void, RepositoryError>> {
        try {
            await (tx ?? prisma).ledger_account.deleteMany({ where: { id: { in: ids } } });
            return ok(undefined);
        } catch (error) {
            return err(databaseError("Failed to bulk delete ledger accounts", error));
        }
    }
}