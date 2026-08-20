// @/server/features/ledger/core/services/GSTStateResolver.ts
//
// GST state derivation is not actually a "fetch" in any sense — a GSTIN's
// first two digits are a fixed, government-issued state code. This is a
// pure lookup, computed instantly from a substring, no network call
// involved either way.
//
// The real design question is compute-once-and-store vs. compute-on-every-
// read, and the answer used here (and by every GST-compliant platform —
// Tally, Zoho Books, ClearTax, Vyapar) is both, for two different reasons:
//
//   1. Party.state is derived and OVERWRITTEN whenever gstNumber changes —
//      this is "current known state," used to default new documents. It's
//      not optional to store: parties without a GSTIN (unregistered
//      dealers, consumers, composition-scheme parties) have nothing to
//      derive from and need a manually-assignable state instead. A
//      derive-on-every-read approach with no persisted fallback breaks
//      for exactly the parties who need a state the most.
//
//   2. Every posted document (invoice, purchase voucher) SNAPSHOTS
//      party.state at the moment of posting, onto the document itself,
//      never recomputed afterward. This is the audit-immutability
//      requirement: if a party's GSTIN is later amended (rare, but real),
//      historical documents must not retroactively change their recorded
//      state. Only a per-document snapshot protects that — caching on the
//      party alone isn't enough.
//
// This file only contains the derivation logic itself. Where it's called
// (Party.setGstNumber, and again at document-posting time) is what
// satisfies both requirements above — see Party.ts and the invoice/
// purchase-voucher posting flows.

// Official GST state/UT codes (first 2 digits of a GSTIN).
// Source: CBIC state code list. Update if new UTs are added.
const GST_STATE_CODES: Record<string, string> = {
    "01": "Jammu and Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "25": "Daman and Diu",
    "26": "Dadra and Nagar Haveli",
    "27": "Maharashtra",
    "28": "Andhra Pradesh (Old)",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman and Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh",
    "38": "Ladakh",
    "97": "Other Territory",
};

// 15-char GSTIN: 2-digit state code + 10-char PAN + 1 entity code + 'Z' + 1 checksum
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function isValidGstinFormat(gstin: string): boolean {
    return GSTIN_PATTERN.test(gstin.trim().toUpperCase());
}

/**
 * Derives the registered state from a GSTIN's state code prefix.
 * Returns null for an invalid/malformed GSTIN or an unrecognized code —
 * callers should treat null the same as "no GSTIN provided" (fall back to
 * a manually-assigned state, don't silently default to something).
 */
export function deriveStateFromGstin(gstin: string): string | null {
    const normalized = gstin.trim().toUpperCase();

    if (!isValidGstinFormat(normalized)) {
        return null;
    }

    const stateCode = normalized.substring(0, 2);
    return GST_STATE_CODES[stateCode] ?? null;
}