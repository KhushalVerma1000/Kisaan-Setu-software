// @/server/features/ledger/infrastructure/persistence/PrismaTaxConfigurationRepository.ts

import { prisma } from "@/utils/Prisma/Client";
import type { Prisma, tax_configuration as TaxConfigurationRow } from "@/generated/prisma/client";
import { TaxConfiguration, TaxType, TaxDirection } from "../../core/entities/TaxConfiguration";
import { TaxConfigurationRepository } from "../../core/repositories/TaxConfigurationRepository";
import { Result, ok, err, notFound, databaseError, RepositoryError } from "@/server/core/Result";

function isPrismaNotFoundError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "P2025";
}

function toDomain(row: TaxConfigurationRow): TaxConfiguration {
    return new TaxConfiguration({
        id: row.id,
        ledgerAccountId: row.ledger_account_id,
        taxType: row.tax_type as TaxType,
        direction: row.direction as TaxDirection,
        rate: row.rate !== null ? Number(row.rate) : undefined,
        fpoId: row.fpo_id ?? undefined,
        createdAt: row.created_at ?? undefined,
        updatedAt: row.updated_at ?? undefined,
    });
}

function toWriteData(config: TaxConfiguration): Omit<Prisma.tax_configurationUncheckedCreateInput, "id"> {
    return {
        ledger_account_id: config.ledgerAccountId,
        tax_type: config.taxType,
        direction: config.direction,
        rate: config.rate,
        fpo_id: config.fpoId,
    };
}

export class PrismaTaxConfigurationRepository implements TaxConfigurationRepository {
    async findByLedgerAccountId(ledgerAccountId: string): Promise<Result<TaxConfiguration | null, RepositoryError>> {
        try {
            const row = await prisma.tax_configuration.findUnique({ where: { ledger_account_id: ledgerAccountId } });
            return ok(row ? toDomain(row) : null);
        } catch (error) {
            return err(databaseError("Failed to fetch tax configuration", error));
        }
    }

    async create(config: TaxConfiguration, tx?: Prisma.TransactionClient): Promise<Result<TaxConfiguration, RepositoryError>> {
        try {
            const row = await (tx ?? prisma).tax_configuration.create({ data: toWriteData(config) });
            return ok(toDomain(row));
        } catch (error) {
            if (isUniqueConstraintError(error)) {
                return err({
                    type: "conflict",
                    message: `A ${config.taxType} ${config.direction} ledger already exists for this FPO`,
                });
            }
            return err(databaseError("Failed to create tax configuration", error));
        }
    }

    async update(id: string, config: TaxConfiguration, tx?: Prisma.TransactionClient): Promise<Result<TaxConfiguration, RepositoryError>> {
        try {
            const row = await (tx ?? prisma).tax_configuration.update({ where: { id }, data: toWriteData(config) });
            return ok(toDomain(row));
        } catch (error) {
            if (isPrismaNotFoundError(error)) {
                return err(notFound(`Tax configuration ${id} not found`));
            }
            return err(databaseError("Failed to update tax configuration", error));
        }
    }

    async delete(id: string, tx?: Prisma.TransactionClient): Promise<Result<void, RepositoryError>> {
        try {
            await (tx ?? prisma).tax_configuration.delete({ where: { id } });
            return ok(undefined);
        } catch (error) {
            if (isPrismaNotFoundError(error)) {
                return err(notFound(`Tax configuration ${id} not found`));
            }
            return err(databaseError("Failed to delete tax configuration", error));
        }
    }

    async deleteByLedgerAccountId(ledgerAccountId: string, tx?: Prisma.TransactionClient): Promise<Result<void, RepositoryError>> {
        try {
            await (tx ?? prisma).tax_configuration.deleteMany({ where: { ledger_account_id: ledgerAccountId } });
            return ok(undefined);
        } catch (error) {
            return err(databaseError("Failed to delete tax configuration by ledger account", error));
        }
    }

    async findLedgerAccountId(fpoId: string, taxType: TaxType, direction: TaxDirection): Promise<Result<string | null, RepositoryError>> {
        try {
            const row = await prisma.tax_configuration.findUnique({
                where: { fpo_id_tax_type_direction: { fpo_id: fpoId, tax_type: taxType, direction } },
                select: { ledger_account_id: true },
            });
            return ok(row?.ledger_account_id ?? null);
        } catch (error) {
            return err(databaseError(`Failed to resolve ${taxType} ${direction} ledger`, error));
        }
    }

    async findLedgerAccountIds(
        fpoId: string,
        lookups: Array<{ taxType: TaxType; direction: TaxDirection }>
    ): Promise<Result<Map<string, string>, RepositoryError>> {
        try {
            const rows = await prisma.tax_configuration.findMany({
                where: {
                    fpo_id: fpoId,
                    OR: lookups.map(l => ({ tax_type: l.taxType, direction: l.direction })),
                },
                select: { tax_type: true, direction: true, ledger_account_id: true },
            });

            const result = new Map<string, string>();
            for (const row of rows) {
                result.set(`${row.tax_type}:${row.direction}`, row.ledger_account_id);
            }
            return ok(result);
        } catch (error) {
            return err(databaseError("Failed to resolve tax ledgers", error));
        }
    }
}

function isUniqueConstraintError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "P2002";
}