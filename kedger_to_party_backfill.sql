BEGIN;

CREATE TYPE party_type AS ENUM ('customer', 'vendor', 'farmer', 'shareholder', 'employee', 'other');

CREATE TABLE party (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ledger_account_id  uuid NOT NULL UNIQUE REFERENCES ledger_account(id) ON DELETE CASCADE,
    party_type         party_type NOT NULL,
    phone_number       varchar(20),
    address            text,
    gst_number         varchar(15),
    state              varchar(100),
    opening_date       date,
    fpo_id             uuid REFERENCES fpo_profiles(id) ON DELETE CASCADE,
    created_at         timestamptz DEFAULT now(),
    updated_at         timestamptz DEFAULT now()
);

CREATE INDEX idx_party_fpo ON party(fpo_id);
CREATE INDEX idx_party_gst_number ON party(gst_number);
CREATE INDEX idx_party_state ON party(state);
CREATE INDEX idx_party_type ON party(party_type);

COMMIT;

