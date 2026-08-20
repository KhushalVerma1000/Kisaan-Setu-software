// @/server/features/ledger/core/entities/Party.ts
//
// The master-data half of what used to be a single, conflated
// ledger_account row. A Party always has exactly one LedgerAccount (the
// bridge is ledgerAccountId, enforced unique at the db level) — this
// entity holds the things that only make sense for an actual counterparty
// (customer/vendor/farmer/shareholder), not for a system ledger like Cash
// or GST Payable.
//
// GST state handling: see GSTStateResolver.ts for the full reasoning.
// Short version — assignGstin() is the only way state gets set when a
// GSTIN exists (never manually, matches how every GST-compliant platform
// handles it); assignManualState() exists for the parties who genuinely
// have no GSTIN (unregistered dealers, consumers, composition-scheme
// parties) and still need a place-of-supply state assigned by hand.

import { deriveStateFromGstin, isValidGstinFormat } from "../services/GSTStateResolver";

export type PartyType = 'customer' | 'vendor' | 'farmer' | 'shareholder' | 'employee' | 'other';

export interface PartyProps {
    id?: string;
    ledgerAccountId: string;
    partyType: PartyType;
    phoneNumber?: string;
    address?: string;
    gstNumber?: string;
    state?: string;
    openingDate?: Date;
    fpoId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export class Party {
    readonly id?: string;
    readonly ledgerAccountId: string;
    readonly partyType: PartyType;
    readonly phoneNumber?: string;
    readonly address?: string;
    readonly gstNumber?: string;
    readonly state?: string;
    readonly openingDate?: Date;
    readonly fpoId?: string;
    readonly createdAt?: Date;
    readonly updatedAt?: Date;

    constructor(props: PartyProps) {
        this.id = props.id;
        this.ledgerAccountId = props.ledgerAccountId;
        this.partyType = props.partyType;
        this.phoneNumber = props.phoneNumber;
        this.address = props.address;
        this.gstNumber = props.gstNumber;
        this.state = props.state;
        this.openingDate = props.openingDate;
        this.fpoId = props.fpoId;
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
    }

    hasGstin(): boolean {
        return !!this.gstNumber;
    }

    /**
     * Assigns a GSTIN and derives state from it in the same step — state
     * is never independently settable once a GSTIN exists. Returns a new
     * Party (immutable pattern, matches LedgerAccount).
     */
    assignGstin(gstin: string): Party {
        const normalized = gstin.trim().toUpperCase();

        if (!isValidGstinFormat(normalized)) {
            throw new Error(`Invalid GSTIN format: ${gstin}`);
        }

        const derivedState = deriveStateFromGstin(normalized);
        if (!derivedState) {
            // Structurally valid pattern but an unrecognized state code —
            // extremely unlikely (would mean the state-code table is out
            // of date) but don't silently accept a GSTIN we can't place.
            throw new Error(`Could not derive a state from GSTIN ${gstin} — unrecognized state code`);
        }

        return new Party({ ...this, gstNumber: normalized, state: derivedState });
    }

    /**
     * For parties with no GSTIN (unregistered dealers, consumers,
     * composition-scheme parties) who still need a place-of-supply state.
     * Deliberately blocked once a GSTIN is set — state stops being a
     * manually-editable field the moment there's a GSTIN to derive it from.
     */
    assignManualState(state: string): Party {
        if (this.hasGstin()) {
            throw new Error('Cannot manually set state — this party has a GSTIN, which determines state automatically. Remove the GSTIN first if the state genuinely needs to change.');
        }

        return new Party({ ...this, state });
    }

    /** Clears the GSTIN, e.g. when converting a party to unregistered status. State is left as-is — becomes manually editable again via assignManualState. */
    clearGstin(): Party {
        return new Party({ ...this, gstNumber: undefined });
    }
}