// @/server/features/ledger/application/LedgerAccountService.ts
//
// Composes LedgerAccountRepository + PartyRepository + TaxConfigurationRepository
// via constructor injection — this is the layer that used to be one flat
// file (ledgerAccountSupabase.ts) mixing persistence calls directly with
// business rules. Now: repositories only know how to read/write their own
// table: this service is where "creating a customer ledger also means
// creating a party, atomically" lives.
//
// Unwraps Result -> throw at this boundary, deliberately. The repository
// layer uses Result<T, RepositoryError> so callers can distinguish
// not-found/validation/conflict/database errors without parsing messages
// — but every existing consumer (API routes, UI pages) expects thrown
// errors and try/catch, same as the old ledgerAccountSupabase.ts. Rather
// than force all ~15 consumer files to switch error-handling styles in
// the same pass as this split, this service still throws at its outer
// boundary. Worth extending Result further out later if it proves useful.

import { prisma } from "@/utils/Prisma/Client";
import { LedgerAccount, BankDetails } from "../core/entities/LedgerAccount";
import { createOpeningBalanceEntry as buildOpeningBalanceEntry } from "../core/entities/Ledger";
import { Party, PartyType } from "../core/entities/Party";
import { TaxConfiguration, TaxType, TaxDirection } from "../core/entities/TaxConfiguration";
import { LedgerAccountRepository } from "../core/repositories/LedgerAccountRepository";
import { PartyRepository } from "../core/repositories/PartyRepository";
import { TaxConfigurationRepository } from "../core/repositories/TaxConfigurationRepository";
import { PrismaLedgerAccountRepository } from "../infrastructure/persistence/PrismaLedgerAccountRepository";
import { PrismaPartyRepository } from "../infrastructure/persistence/PrismaPartyRepository";
import { PrismaTaxConfigurationRepository } from "../infrastructure/persistence/PrismaTaxConfigurationRepository";
import { unwrap } from "@/server/core/Result";
import {
    getLedgerWithStatement as fetchLedgerWithStatement,
    getLedgerBalance as fetchLedgerBalance,
    createOpeningBalanceEntry as createOpeningLedgerEntry,
} from "../infrastructure/persistence/ledgerEntryPrisma";

export interface PartyInput {
    partyType: PartyType;
    phoneNumber?: string;
    address?: string;
    gstNumber?: string;   // if provided, state is auto-derived — don't also pass state
    state?: string;        // only used when gstNumber is absent (unregistered/consumer parties)
    openingDate?: Date;
}

export interface TaxConfigurationInput {
    taxType: TaxType;
    direction: TaxDirection;
    rate?: number;
}

export interface CreateLedgerAccountInput {
    name: string;
    groupName: string;
    openingBalance: number;
    balanceType: 'Dr' | 'Cr';
    fpoId: string;
    ledgerCode?: string;
    isSystemLedger?: boolean;
    bankDetails?: BankDetails;
    // A ledger is a party, a tax ledger, or neither — never both. Passing
    // both throws.
    party?: PartyInput;
    taxConfiguration?: TaxConfigurationInput;
}

export type UpdateLedgerAccountInput = Partial<Omit<CreateLedgerAccountInput, 'fpoId'>>;

export interface LedgerAccountWithDetails {
    account: LedgerAccount;
    party: Party | null;
    taxConfiguration: TaxConfiguration | null;
}

function buildParty(ledgerAccountId: string, fpoId: string, input: PartyInput): Party {
    let party = new Party({
        ledgerAccountId,
        partyType: input.partyType,
        phoneNumber: input.phoneNumber,
        address: input.address,
        fpoId,
        openingDate: input.openingDate,
    });

    if (input.gstNumber) {
        party = party.assignGstin(input.gstNumber);
    } else if (input.state) {
        party = party.assignManualState(input.state);
    }

    return party;
}

export class LedgerAccountService {
    constructor(
        private ledgerAccountRepo: LedgerAccountRepository,
        private partyRepo: PartyRepository,
        private taxConfigRepo: TaxConfigurationRepository
    ) {}

    async getLedgerAccountById(id: string): Promise<LedgerAccountWithDetails | null> {
        const account = unwrap(await this.ledgerAccountRepo.findById(id));
        if (!account) return null;

        const [party, taxConfiguration] = await Promise.all([
            unwrap(await this.partyRepo.findByLedgerAccountId(id)),
            unwrap(await this.taxConfigRepo.findByLedgerAccountId(id)),
        ]);

        return { account, party, taxConfiguration };
    }

    async getLedgerNameById(id: string): Promise<string | null> {
        return unwrap(await this.ledgerAccountRepo.getNameById(id));
    }

    async getAllLedgerAccounts(fpoId: string, groupName?: string): Promise<LedgerAccount[]> {
        return unwrap(await this.ledgerAccountRepo.findAllByFpo(fpoId, groupName));
    }

    /** Same as getAllLedgerAccounts, but joins each account's Party inline — closer to what the old flat ledger_account row gave UI list views for free. */
    async getAllLedgerAccountsWithDetails(fpoId: string, groupName?: string): Promise<LedgerAccountWithDetails[]> {
        const accounts = unwrap(await this.ledgerAccountRepo.findAllByFpo(fpoId, groupName));

        return Promise.all(
            accounts.map(async (account) => {
                const party = unwrap(await this.partyRepo.findByLedgerAccountId(account.id!));
                const taxConfiguration = unwrap(await this.taxConfigRepo.findByLedgerAccountId(account.id!));
                return { account, party, taxConfiguration };
            })
        );
    }

    /** Replaces the old getSupplierStateById. */
    async getPartyStateByLedgerAccountId(ledgerAccountId: string): Promise<string | null> {
        return unwrap(await this.partyRepo.getStateByLedgerAccountId(ledgerAccountId));
    }

    /** The core GST/TDS/TCS posting lookup — "give me the ledger for CGST output on this FPO." */
    async resolveTaxLedger(fpoId: string, taxType: TaxType, direction: TaxDirection): Promise<string | null> {
        return unwrap(await this.taxConfigRepo.findLedgerAccountId(fpoId, taxType, direction));
    }

    /** Batch version — one round trip for e.g. all GST output ledgers needed to post a sales invoice. */
    async resolveTaxLedgers(fpoId: string, lookups: Array<{ taxType: TaxType; direction: TaxDirection }>): Promise<Map<string, string>> {
        return unwrap(await this.taxConfigRepo.findLedgerAccountIds(fpoId, lookups));
    }

    async createLedgerAccount(input: CreateLedgerAccountInput): Promise<LedgerAccountWithDetails> {
        if (input.party && input.taxConfiguration) {
            throw new Error('A ledger account cannot be both a party and a tax configuration');
        }

        const account = new LedgerAccount({
            name: input.name,
            groupName: input.groupName,
            openingBalance: input.openingBalance,
            balanceType: input.balanceType,
            fpoId: input.fpoId,
            bankDetails: input.bankDetails,
            isSystemLedger: input.isSystemLedger,
            ledgerCode: input.ledgerCode,
        });

        const result = await prisma.$transaction(async (tx) => {
            const createdAccount = unwrap(await this.ledgerAccountRepo.create(account, tx));

            let party: Party | null = null;
            let taxConfiguration: TaxConfiguration | null = null;

            if (input.party) {
                const partyEntity = buildParty(createdAccount.id!, input.fpoId, input.party);
                party = unwrap(await this.partyRepo.create(partyEntity, tx));
            }

            if (input.taxConfiguration) {
                const taxEntity = new TaxConfiguration({
                    ledgerAccountId: createdAccount.id!,
                    taxType: input.taxConfiguration.taxType,
                    direction: input.taxConfiguration.direction,
                    rate: input.taxConfiguration.rate,
                    fpoId: input.fpoId,
                });
                taxConfiguration = unwrap(await this.taxConfigRepo.create(taxEntity, tx));
            }

            // Non-zero opening balance gets its opening_balance ledger
            // entry created in the same transaction — matches the old
            // createNewLedgerAccount behavior, but atomic now instead of
            // "create account, then separately try to create the entry
            // and just warn on failure."
            if (createdAccount.openingBalance !== 0) {
                const openingEntry = buildOpeningBalanceEntry(createdAccount, input.party?.openingDate);
                const { id: _unused, ...entryData } = openingEntry.toDbFormat();
                await tx.ledger_entry.create({ data: entryData });
            }

            return { account: createdAccount, party, taxConfiguration };
        });

        return result;
    }

    async updateLedgerAccount(id: string, input: UpdateLedgerAccountInput): Promise<LedgerAccountWithDetails> {
        if (input.party && input.taxConfiguration) {
            throw new Error('A ledger account cannot be both a party and a tax configuration');
        }

        const existing = unwrap(await this.ledgerAccountRepo.findById(id));
        if (!existing) {
            throw new Error(`Ledger account ${id} not found`);
        }

        const existingParty = unwrap(await this.partyRepo.findByLedgerAccountId(id));
        const existingTaxConfig = unwrap(await this.taxConfigRepo.findByLedgerAccountId(id));

        const updatedAccount = new LedgerAccount({
            id,
            name: input.name ?? existing.name,
            groupName: input.groupName ?? existing.groupName,
            openingBalance: input.openingBalance ?? existing.openingBalance,
            balanceType: input.balanceType ?? existing.balanceType,
            fpoId: existing.fpoId,
            bankDetails: input.bankDetails ?? existing.bankDetails,
            isSystemLedger: existing.isSystemLedger,
            ledgerCode: existing.ledgerCode,
        });

        const openingBalanceChanged = updatedAccount.openingBalance !== existing.openingBalance;

        const result = await prisma.$transaction(async (tx) => {
            const savedAccount = unwrap(await this.ledgerAccountRepo.update(id, updatedAccount, tx));

            let party = existingParty;
            if (input.party) {
                const partyEntity = buildParty(id, existing.fpoId!, input.party);
                party = existingParty
                    ? unwrap(await this.partyRepo.update(existingParty.id!, partyEntity, tx))
                    : unwrap(await this.partyRepo.create(partyEntity, tx));
            }

            let taxConfiguration = existingTaxConfig;
            if (input.taxConfiguration) {
                const taxEntity = new TaxConfiguration({
                    ledgerAccountId: id,
                    taxType: input.taxConfiguration.taxType,
                    direction: input.taxConfiguration.direction,
                    rate: input.taxConfiguration.rate,
                    fpoId: existing.fpoId,
                });
                taxConfiguration = existingTaxConfig
                    ? unwrap(await this.taxConfigRepo.update(existingTaxConfig.id!, taxEntity, tx))
                    : unwrap(await this.taxConfigRepo.create(taxEntity, tx));
            }

            // If opening balance changed, replace the opening_balance
            // entry: delete the old one, create a fresh one. Matches the
            // old fixOpeningBalanceEntry/updateLedgerAccount behavior, now
            // atomic with the account update itself instead of a
            // best-effort follow-up step.
            if (openingBalanceChanged) {
                await tx.ledger_entry.deleteMany({
                    where: { ledger_account_id: id, is_opening_balance: true },
                });

                if (savedAccount.openingBalance !== 0) {
                    const openingDate = party?.openingDate ?? existingParty?.openingDate;
                    const openingEntry = buildOpeningBalanceEntry(savedAccount, openingDate);
                    const { id: _unused, ...entryData } = openingEntry.toDbFormat();
                    await tx.ledger_entry.create({ data: entryData });
                }
            }

            return { account: savedAccount, party, taxConfiguration };
        });

        return result;
    }

    /**
     * Deletion is trivial now, deliberately — ledger_entry, party, and
     * tax_configuration all have onDelete: Cascade on their FK to
     * ledger_account, so removing the account removes everything linked
     * to it in a single atomic database operation. The old code manually
     * deleted ledger entries first and warned (didn't fail) if that step
     * errored — a real gap this closes structurally rather than needing
     * more careful application code.
     */
    async deleteLedgerAccount(id: string): Promise<{ success: boolean; message: string }> {
        const name = unwrap(await this.ledgerAccountRepo.getNameById(id));
        unwrap(await this.ledgerAccountRepo.delete(id));
        return { success: true, message: `Ledger account "${name ?? id}" deleted successfully` };
    }

    async bulkDeleteLedgerAccounts(ids: string[]): Promise<{ success: boolean; message: string }> {
        unwrap(await this.ledgerAccountRepo.bulkDelete(ids));
        return { success: true, message: `${ids.length} ledger account(s) deleted successfully` };
    }

    async getLedgerAccountWithBalance(id: string) {
        return fetchLedgerWithStatement(id);
    }

    async getLedgerBalance(id: string) {
        return fetchLedgerBalance(id);
    }

    async fixOpeningBalanceEntry(id: string) {
        await prisma.ledger_entry.deleteMany({ where: { ledger_account_id: id, is_opening_balance: true } });
        return createOpeningLedgerEntry(id);
    }
}

// Default composition — everything wired to the real Prisma repositories.
// Existing consumer files import from this singleton, same shape as the
// old flat function exports, just as methods on one object instead of
// separate top-level functions. See LEDGER_ACCOUNT_MIGRATION.md for the
// exact per-file import changes.
export const ledgerAccountService = new LedgerAccountService(
    new PrismaLedgerAccountRepository(),
    new PrismaPartyRepository(),
    new PrismaTaxConfigurationRepository()
);