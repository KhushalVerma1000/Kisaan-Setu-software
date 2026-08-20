// @/server/features/ledger/infrastructure/persistence/PrismaPartyRepository.ts

import { prisma } from "@/utils/Prisma/Client";
import type { Prisma, party as PartyRow } from "@/generated/prisma/client";
import { Party, PartyType } from "../../core/entities/Party";
import { PartyRepository } from "../../core/repositories/PartyRepository";
import { Result, ok, err, notFound, databaseError, RepositoryError } from "@/server/core/Result";

function isPrismaNotFoundError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "P2025";
}

function toDomain(row: PartyRow): Party {
    return new Party({
        id: row.id,
        ledgerAccountId: row.ledger_account_id,
        partyType: row.party_type as PartyType,
        phoneNumber: row.phone_number ?? undefined,
        address: row.address ?? undefined,
        gstNumber: row.gst_number ?? undefined,
        state: row.state ?? undefined,
        openingDate: row.opening_date ?? undefined,
        fpoId: row.fpo_id ?? undefined,
        createdAt: row.created_at ?? undefined,
        updatedAt: row.updated_at ?? undefined,
    });
}

function toWriteData(party: Party): Omit<Prisma.partyUncheckedCreateInput, "id"> {
    return {
        ledger_account_id: party.ledgerAccountId,
        party_type: party.partyType,
        phone_number: party.phoneNumber,
        address: party.address,
        gst_number: party.gstNumber,
        state: party.state,
        opening_date: party.openingDate,
        fpo_id: party.fpoId,
    };
}

export class PrismaPartyRepository implements PartyRepository {
    async findById(id: string): Promise<Result<Party | null, RepositoryError>> {
        try {
            const row = await prisma.party.findUnique({ where: { id } });
            return ok(row ? toDomain(row) : null);
        } catch (error) {
            return err(databaseError("Failed to fetch party", error));
        }
    }

    async findByLedgerAccountId(ledgerAccountId: string): Promise<Result<Party | null, RepositoryError>> {
        try {
            const row = await prisma.party.findUnique({ where: { ledger_account_id: ledgerAccountId } });
            return ok(row ? toDomain(row) : null);
        } catch (error) {
            return err(databaseError("Failed to fetch party by ledger account", error));
        }
    }

    async create(party: Party, tx?: Prisma.TransactionClient): Promise<Result<Party, RepositoryError>> {
        try {
            const row = await (tx ?? prisma).party.create({ data: toWriteData(party) });
            return ok(toDomain(row));
        } catch (error) {
            return err(databaseError("Failed to create party", error));
        }
    }

    async update(id: string, party: Party, tx?: Prisma.TransactionClient): Promise<Result<Party, RepositoryError>> {
        try {
            const row = await (tx ?? prisma).party.update({ where: { id }, data: toWriteData(party) });
            return ok(toDomain(row));
        } catch (error) {
            if (isPrismaNotFoundError(error)) {
                return err(notFound(`Party ${id} not found`));
            }
            return err(databaseError("Failed to update party", error));
        }
    }

    async delete(id: string, tx?: Prisma.TransactionClient): Promise<Result<void, RepositoryError>> {
        try {
            await (tx ?? prisma).party.delete({ where: { id } });
            return ok(undefined);
        } catch (error) {
            if (isPrismaNotFoundError(error)) {
                return err(notFound(`Party ${id} not found`));
            }
            return err(databaseError("Failed to delete party", error));
        }
    }

    async deleteByLedgerAccountId(ledgerAccountId: string, tx?: Prisma.TransactionClient): Promise<Result<void, RepositoryError>> {
        try {
            // deleteMany, not delete — succeeds as a no-op if this ledger
            // account never had a party row (system ledgers never do),
            // rather than treating "nothing to delete" as an error.
            await (tx ?? prisma).party.deleteMany({ where: { ledger_account_id: ledgerAccountId } });
            return ok(undefined);
        } catch (error) {
            return err(databaseError("Failed to delete party by ledger account", error));
        }
    }

    async getStateByLedgerAccountId(ledgerAccountId: string): Promise<Result<string | null, RepositoryError>> {
        try {
            const row = await prisma.party.findUnique({
                where: { ledger_account_id: ledgerAccountId },
                select: { state: true },
            });
            return ok(row?.state ?? null);
        } catch (error) {
            return err(databaseError("Failed to fetch party state", error));
        }
    }
}