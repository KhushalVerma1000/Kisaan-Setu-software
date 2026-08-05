-- CreateEnum
CREATE TYPE "balance_type" AS ENUM ('Dr', 'Cr');

-- CreateEnum
CREATE TYPE "entry_type" AS ENUM ('Dr', 'Cr');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255),
    "fpo_name" TEXT,
    "password_hash" TEXT,
    "email_verified_at" TIMESTAMPTZ(6),
    "reset_token" TEXT,
    "reset_token_expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "price" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_plans" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "cancelled_at" TIMESTAMPTZ(6),
    "payment_reference" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "active_transactions" (
    "id" UUID NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT DEFAULT 'active',
    "created_by" UUID,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "active_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_books" (
    "id" UUID NOT NULL,
    "bank_account_id" UUID NOT NULL,
    "fpo_id" UUID NOT NULL,
    "opening_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "opening_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "ledger_account_id" UUID,

    CONSTRAINT "bank_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_details" (
    "id" UUID NOT NULL,
    "fpo_id" UUID NOT NULL,
    "account_holder_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "ifsc_code" TEXT NOT NULL,
    "upi_id" TEXT,
    "is_primary" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "print_bank_details" BOOLEAN DEFAULT true,
    "print_upi_qr" BOOLEAN DEFAULT true,

    CONSTRAINT "bank_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_book_entries" (
    "id" UUID NOT NULL,
    "cash_book_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "type" VARCHAR(2) NOT NULL,
    "transaction_type" VARCHAR(50) NOT NULL,
    "document_id" UUID,
    "document_type" VARCHAR(50),
    "document_number" VARCHAR(100),
    "primary_description" TEXT NOT NULL,
    "secondary_description" TEXT,
    "reference_description" TEXT,
    "ledger_reference" VARCHAR(255),
    "is_opening_balance" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_book_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_books" (
    "id" UUID NOT NULL,
    "fpo_id" UUID NOT NULL,
    "opening_balance" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "opening_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "ledger_account_id" UUID,

    CONSTRAINT "cash_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "fpo_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "parent_category_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_number_sequences" (
    "id" UUID NOT NULL,
    "fpo_id" UUID NOT NULL,
    "document_type" VARCHAR(50) NOT NULL,
    "current_number" INTEGER NOT NULL DEFAULT 0,
    "prefix" TEXT,
    "start_number" INTEGER NOT NULL DEFAULT 1,
    "show_prefix" BOOLEAN NOT NULL DEFAULT true,
    "number_format" TEXT DEFAULT 'XXX',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_number_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fpo_profiles" (
    "id" UUID NOT NULL,
    "company_name" TEXT NOT NULL,
    "incorporation_date" DATE,
    "logo_url" TEXT,
    "ceo_name" TEXT,
    "phone_number" TEXT,
    "email" TEXT,
    "gst_number" TEXT,
    "address_line1" TEXT,
    "city" TEXT,
    "state" TEXT DEFAULT 'Uttar Pradesh',
    "pincode" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "invoice_email" TEXT,

    CONSTRAINT "fpo_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" UUID NOT NULL,
    "fpo_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unit_price" DECIMAL NOT NULL,
    "document_id" UUID,
    "document_type" TEXT,
    "document_number" TEXT,
    "party_type" TEXT,
    "party_name" TEXT,
    "party_ledger_id" UUID,
    "transaction_date" DATE NOT NULL,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "stock_before" DECIMAL NOT NULL,
    "stock_after" DECIMAL NOT NULL,
    "item_type" TEXT NOT NULL DEFAULT 'product',

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "line_number" INTEGER NOT NULL,
    "item_id" UUID NOT NULL,
    "item_name" TEXT NOT NULL,
    "item_type" TEXT NOT NULL,
    "hsn_sac" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unit_code" TEXT,
    "unit_price" DECIMAL NOT NULL,
    "discount_type" TEXT,
    "discount_value" DECIMAL DEFAULT 0,
    "discount_amount" DECIMAL DEFAULT 0,
    "gst_rate" DECIMAL NOT NULL DEFAULT 0,
    "gst_type" TEXT NOT NULL DEFAULT 'excluding',
    "base_amount" DECIMAL NOT NULL,
    "taxable_amount" DECIMAL NOT NULL,
    "gst_amount" DECIMAL NOT NULL,
    "line_total" DECIMAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_settings" (
    "fpo_id" UUID NOT NULL,
    "invoice_prefix" TEXT DEFAULT 'INV-',
    "default_terms" TEXT,
    "signature_url" TEXT,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "id" UUID NOT NULL,
    "start_number" INTEGER DEFAULT 1,
    "show_prefix" BOOLEAN DEFAULT false,

    CONSTRAINT "invoice_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "invoice_date" TIMESTAMPTZ(6) NOT NULL,
    "customer" JSONB NOT NULL,
    "eway_bill_number" VARCHAR(50),
    "vehicle_number" VARCHAR(50),
    "po_number" VARCHAR(50),
    "items" JSONB NOT NULL DEFAULT '[]',
    "summary" JSONB NOT NULL DEFAULT '{}',
    "gst_breakdown" JSONB NOT NULL DEFAULT '{}',
    "document_type" VARCHAR(20) NOT NULL DEFAULT 'invoice',
    "fpo_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "status" VARCHAR(20) DEFAULT 'draft',
    "notes" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" UUID NOT NULL,
    "fpo_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(10) NOT NULL,
    "category_id" UUID NOT NULL,
    "hsn_sac" VARCHAR(20) NOT NULL,
    "sale_price" DECIMAL(12,2) NOT NULL,
    "sale_price_inclusive" BOOLEAN NOT NULL DEFAULT false,
    "gst_tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "purchase_price" DECIMAL(12,2),
    "purchase_price_inclusive" BOOLEAN DEFAULT false,
    "unit_code" VARCHAR(10),
    "opening_quantity" DECIMAL(12,3) DEFAULT 0,
    "opening_stock_date" DATE,
    "mfg_date" DATE,
    "exp_date" DATE,
    "barcode" VARCHAR(100),
    "discount" JSONB,
    "low_stock_alert" DECIMAL(12,3),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "current_stock" DECIMAL(15,3) DEFAULT 0,
    "last_stock_update" TIMESTAMPTZ(6),

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_account" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "group_name" VARCHAR(255) NOT NULL,
    "opening_balance" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "balance_type" "balance_type" NOT NULL,
    "phone_number" VARCHAR(20),
    "address" TEXT,
    "fpo_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "gst_number" VARCHAR(15),
    "opening_date" DATE,
    "state" VARCHAR(100),
    "bank_details" JSONB,
    "is_system_ledger" BOOLEAN DEFAULT false,
    "ledger_code" VARCHAR(50),

    CONSTRAINT "ledger_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entry" (
    "id" UUID NOT NULL,
    "ledger_account_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "type" "entry_type" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "document_id" VARCHAR,
    "document_type" VARCHAR,
    "document_number" VARCHAR,
    "primary_description" VARCHAR NOT NULL DEFAULT '',
    "secondary_description" VARCHAR,
    "reference_description" VARCHAR,
    "ledger_reference" VARCHAR,
    "is_opening_balance" BOOLEAN DEFAULT false,

    CONSTRAINT "ledger_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_group" (
    "id" UUID NOT NULL,
    "group_name" VARCHAR(255) NOT NULL,
    "parent_group" VARCHAR(255),
    "fpo_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "is_default" BOOLEAN,

    CONSTRAINT "ledger_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_documents" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "document_type" TEXT NOT NULL,
    "total_document_amount" DECIMAL NOT NULL,
    "total_paid_amount" DECIMAL NOT NULL DEFAULT 0,
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "fpo_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "document_number" TEXT,

    CONSTRAINT "payment_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "payment_document_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "date" DATE NOT NULL,
    "party_ledger_account_id" UUID NOT NULL,
    "notes" TEXT NOT NULL,
    "reference_number" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'active',
    "reversal_payment_id" UUID,
    "fpo_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "cashbook_id" UUID,
    "bankbook_id" UUID,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_line_items" (
    "id" UUID NOT NULL,
    "purchase_voucher_id" UUID NOT NULL,
    "line_number" INTEGER NOT NULL,
    "item_id" UUID NOT NULL,
    "item_name" TEXT NOT NULL,
    "item_type" TEXT NOT NULL,
    "hsn_sac" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unit_code" TEXT,
    "unit_price" DECIMAL NOT NULL,
    "discount_type" TEXT,
    "discount_value" DECIMAL DEFAULT 0,
    "discount_amount" DECIMAL DEFAULT 0,
    "gst_rate" DECIMAL NOT NULL DEFAULT 0,
    "gst_type" TEXT NOT NULL DEFAULT 'excluding',
    "base_amount" DECIMAL NOT NULL,
    "taxable_amount" DECIMAL NOT NULL,
    "gst_amount" DECIMAL NOT NULL,
    "line_total" DECIMAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_line_items" (
    "id" UUID NOT NULL,
    "purchase_order_id" UUID NOT NULL,
    "line_number" INTEGER NOT NULL,
    "item_id" UUID NOT NULL,
    "item_name" TEXT NOT NULL,
    "item_type" TEXT NOT NULL,
    "hsn_sac" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unit_code" TEXT,
    "unit_price" DECIMAL NOT NULL,
    "discount_type" TEXT,
    "discount_value" DECIMAL DEFAULT 0,
    "discount_amount" DECIMAL DEFAULT 0,
    "gst_rate" DECIMAL NOT NULL DEFAULT 0,
    "gst_type" TEXT NOT NULL DEFAULT 'excluding',
    "base_amount" DECIMAL NOT NULL,
    "taxable_amount" DECIMAL NOT NULL,
    "gst_amount" DECIMAL NOT NULL,
    "line_total" DECIMAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL,
    "fpo_id" UUID NOT NULL,
    "po_number" TEXT NOT NULL,
    "po_date" DATE NOT NULL,
    "supplier" JSONB NOT NULL,
    "reference_number" TEXT,
    "delivery_date" DATE,
    "notes" TEXT,
    "summary" JSONB NOT NULL,
    "gst_breakdown" JSONB,
    "status" TEXT DEFAULT 'draft',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_vouchers" (
    "id" UUID NOT NULL,
    "po_number" VARCHAR(100),
    "supplier_vendor_name" VARCHAR(255),
    "supplier_vendor_id" UUID,
    "party_invoice_number" VARCHAR(100) NOT NULL,
    "party_invoice_date" DATE NOT NULL,
    "supplier_vendor_billing_address" TEXT NOT NULL,
    "gstin" VARCHAR(15),
    "items" JSONB NOT NULL DEFAULT '[]',
    "summary" JSONB NOT NULL DEFAULT '{}',
    "gst_breakdown" JSONB NOT NULL DEFAULT '{}',
    "document_type" VARCHAR(50) NOT NULL DEFAULT 'purchase_voucher',
    "fpo_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "notes" TEXT,
    "supplier_state" VARCHAR(100),
    "voucher_number" VARCHAR(50),

    CONSTRAINT "purchase_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_line_items" (
    "id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "line_number" INTEGER NOT NULL,
    "item_id" UUID NOT NULL,
    "item_name" TEXT NOT NULL,
    "item_type" TEXT NOT NULL,
    "hsn_sac" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unit_code" TEXT,
    "unit_price" DECIMAL NOT NULL,
    "discount_type" TEXT,
    "discount_value" DECIMAL DEFAULT 0,
    "discount_amount" DECIMAL DEFAULT 0,
    "gst_rate" DECIMAL NOT NULL DEFAULT 0,
    "gst_type" TEXT NOT NULL DEFAULT 'excluding',
    "base_amount" DECIMAL NOT NULL,
    "taxable_amount" DECIMAL NOT NULL,
    "gst_amount" DECIMAL NOT NULL,
    "line_total" DECIMAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotation_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" UUID NOT NULL,
    "fpo_id" UUID NOT NULL,
    "quotation_number" TEXT NOT NULL,
    "quotation_date" DATE NOT NULL,
    "customer" JSONB NOT NULL,
    "po_number" TEXT,
    "notes" TEXT,
    "summary" JSONB NOT NULL,
    "gst_breakdown" JSONB,
    "status" TEXT DEFAULT 'draft',
    "valid_until" DATE,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shareholders" (
    "id" UUID NOT NULL,
    "fpo_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "father_name" VARCHAR(255) NOT NULL,
    "mobile" VARCHAR(10) NOT NULL,
    "aadhaar" VARCHAR(12) NOT NULL,
    "gender" VARCHAR(10) DEFAULT 'male',
    "social_category" VARCHAR(10) DEFAULT 'General',
    "land_details" JSONB,
    "share_alloted" INTEGER NOT NULL,
    "face_value" INTEGER NOT NULL,
    "total_paid" INTEGER NOT NULL DEFAULT 0,
    "is_director" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "pond_details" JSONB DEFAULT '[]',
    "cattle_details" JSONB DEFAULT '[]',

    CONSTRAINT "shareholders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taxes" (
    "id" UUID NOT NULL,
    "fpo_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "rate_percent" DECIMAL(5,2) NOT NULL,
    "is_default" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "taxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "code" VARCHAR(10) NOT NULL,
    "fpo_id" UUID NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "units_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" UUID NOT NULL,
    "voucher_number" VARCHAR(50) NOT NULL,
    "voucher_type" VARCHAR(20) NOT NULL,
    "date" DATE NOT NULL,
    "fpo_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "is_reversal_entry" BOOLEAN DEFAULT false,
    "original_voucher_id" UUID,
    "ledger_entry_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- CreateIndex
CREATE INDEX "user_plans_user_id_idx" ON "user_plans"("user_id");

-- CreateIndex
CREATE INDEX "user_plans_expires_at_idx" ON "user_plans"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "active_transactions_transaction_id_key" ON "active_transactions"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_bank_books_bank_account" ON "bank_books"("bank_account_id");

-- CreateIndex
CREATE INDEX "idx_bank_books_bank_account_id" ON "bank_books"("bank_account_id");

-- CreateIndex
CREATE INDEX "idx_bank_books_fpo_id" ON "bank_books"("fpo_id");

-- CreateIndex
CREATE INDEX "idx_bank_books_ledger_account" ON "bank_books"("ledger_account_id");

-- CreateIndex
CREATE INDEX "idx_bank_books_opening_date" ON "bank_books"("opening_date");

-- CreateIndex
CREATE INDEX "idx_cash_book_entries_cash_book_id" ON "cash_book_entries"("cash_book_id");

-- CreateIndex
CREATE INDEX "idx_cash_book_entries_date" ON "cash_book_entries"("date");

-- CreateIndex
CREATE INDEX "idx_cash_book_entries_document" ON "cash_book_entries"("document_id", "document_type");

-- CreateIndex
CREATE INDEX "idx_cash_book_entries_transaction_type" ON "cash_book_entries"("transaction_type");

-- CreateIndex
CREATE INDEX "idx_cash_book_entries_type" ON "cash_book_entries"("type");

-- CreateIndex
CREATE UNIQUE INDEX "unique_fpo_cashbook" ON "cash_books"("fpo_id");

-- CreateIndex
CREATE INDEX "idx_cash_books_fpo_id" ON "cash_books"("fpo_id");

-- CreateIndex
CREATE INDEX "idx_cash_books_ledger_account" ON "cash_books"("ledger_account_id");

-- CreateIndex
CREATE INDEX "idx_categories_fpo_id" ON "categories"("fpo_id");

-- CreateIndex
CREATE INDEX "idx_categories_name" ON "categories"("name");

-- CreateIndex
CREATE INDEX "idx_categories_parent_id" ON "categories"("parent_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_fpo_id_name_key" ON "categories"("fpo_id", "name");

-- CreateIndex
CREATE INDEX "idx_document_sequences_fpo_id" ON "document_number_sequences"("fpo_id");

-- CreateIndex
CREATE INDEX "idx_document_sequences_fpo_type" ON "document_number_sequences"("fpo_id", "document_type");

-- CreateIndex
CREATE INDEX "idx_document_sequences_type" ON "document_number_sequences"("document_type");

-- CreateIndex
CREATE UNIQUE INDEX "unique_fpo_document_type" ON "document_number_sequences"("fpo_id", "document_type");

-- CreateIndex
CREATE INDEX "idx_fpo_profiles_id" ON "fpo_profiles"("id");

-- CreateIndex
CREATE INDEX "idx_inventory_transactions_date" ON "inventory_transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "idx_inventory_transactions_document" ON "inventory_transactions"("document_type", "document_id");

-- CreateIndex
CREATE INDEX "idx_inventory_transactions_fpo" ON "inventory_transactions"("fpo_id");

-- CreateIndex
CREATE INDEX "idx_inventory_transactions_item" ON "inventory_transactions"("item_id");

-- CreateIndex
CREATE INDEX "idx_inventory_transactions_party" ON "inventory_transactions"("party_ledger_id");

-- CreateIndex
CREATE INDEX "idx_inventory_transactions_type" ON "inventory_transactions"("item_type");

-- CreateIndex
CREATE INDEX "idx_invoice_line_items_invoice" ON "invoice_line_items"("invoice_id");

-- CreateIndex
CREATE INDEX "idx_invoice_line_items_item" ON "invoice_line_items"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_invoice_line_number" ON "invoice_line_items"("invoice_id", "line_number");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_settings_fpo_id_unique" ON "invoice_settings"("fpo_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "idx_invoices_created_at" ON "invoices"("created_at");

-- CreateIndex
CREATE INDEX "idx_invoices_fpo_id" ON "invoices"("fpo_id");

-- CreateIndex
CREATE INDEX "idx_invoices_fpo_status_date" ON "invoices"("fpo_id", "status", "invoice_date");

-- CreateIndex
CREATE INDEX "idx_invoices_invoice_date" ON "invoices"("invoice_date");

-- CreateIndex
CREATE INDEX "idx_invoices_invoice_number" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "idx_invoices_status" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_id_idx" ON "invoices"("id");

-- CreateIndex
CREATE INDEX "idx_items_barcode" ON "items"("barcode") WHERE (barcode IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_items_category_id" ON "items"("category_id");

-- CreateIndex
CREATE INDEX "idx_items_current_stock" ON "items"("current_stock");

-- CreateIndex
CREATE INDEX "idx_items_fpo_id" ON "items"("fpo_id");

-- CreateIndex
CREATE INDEX "idx_items_low_stock" ON "items"("current_stock", "low_stock_alert") WHERE ((type)::text = 'product'::text);

-- CreateIndex
CREATE INDEX "idx_items_name" ON "items"("name");

-- CreateIndex
CREATE INDEX "idx_items_out_of_stock" ON "items"("current_stock") WHERE (((type)::text = 'product'::text) AND (current_stock <= (0)::numeric));

-- CreateIndex
CREATE INDEX "idx_items_type" ON "items"("type");

-- CreateIndex
CREATE INDEX "idx_items_unit_code" ON "items"("unit_code");

-- CreateIndex
CREATE UNIQUE INDEX "items_fpo_id_name_key" ON "items"("fpo_id", "name");

-- CreateIndex
CREATE INDEX "idx_ledger_account_fpo" ON "ledger_account"("fpo_id");

-- CreateIndex
CREATE INDEX "idx_ledger_account_group" ON "ledger_account"("group_name");

-- CreateIndex
CREATE INDEX "idx_ledger_account_gst_number" ON "ledger_account"("gst_number");

-- CreateIndex
CREATE INDEX "idx_ledger_account_opening_date" ON "ledger_account"("opening_date");

-- CreateIndex
CREATE INDEX "idx_ledger_account_state" ON "ledger_account"("state");

-- CreateIndex
CREATE INDEX "idx_system_ledger_code" ON "ledger_account"("fpo_id", "ledger_code") WHERE (is_system_ledger = true);

-- CreateIndex
CREATE UNIQUE INDEX "ledger_account_ledger_code_fpo_unique" ON "ledger_account"("ledger_code", "fpo_id");

-- CreateIndex
CREATE INDEX "idx_ledger_entry_account" ON "ledger_entry"("ledger_account_id");

-- CreateIndex
CREATE INDEX "idx_ledger_entry_date" ON "ledger_entry"("date");

-- CreateIndex
CREATE INDEX "idx_ledger_entry_date_created" ON "ledger_entry"("date", "created_at");

-- CreateIndex
CREATE INDEX "idx_ledger_entry_document" ON "ledger_entry"("document_id", "document_type");

-- CreateIndex
CREATE INDEX "idx_ledger_entry_opening_balance" ON "ledger_entry"("ledger_account_id", "is_opening_balance");

-- CreateIndex
CREATE INDEX "idx_ledger_entry_type" ON "ledger_entry"("type");

-- CreateIndex
CREATE INDEX "ledger_entry_ledger_account_id_idx" ON "ledger_entry"("ledger_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_group_group_name_key" ON "ledger_group"("group_name");

-- CreateIndex
CREATE UNIQUE INDEX "payment_documents_document_id_document_type_fpo_id_key" ON "payment_documents"("document_id", "document_type", "fpo_id");

-- CreateIndex
CREATE INDEX "idx_purchase_line_items_item" ON "purchase_line_items"("item_id");

-- CreateIndex
CREATE INDEX "idx_purchase_line_items_voucher" ON "purchase_line_items"("purchase_voucher_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_purchase_line_number" ON "purchase_line_items"("purchase_voucher_id", "line_number");

-- CreateIndex
CREATE INDEX "idx_purchase_order_line_items_item" ON "purchase_order_line_items"("item_id");

-- CreateIndex
CREATE INDEX "idx_purchase_order_line_items_po" ON "purchase_order_line_items"("purchase_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_purchase_order_line_number" ON "purchase_order_line_items"("purchase_order_id", "line_number");

-- CreateIndex
CREATE INDEX "idx_purchase_orders_date" ON "purchase_orders"("po_date");

-- CreateIndex
CREATE INDEX "idx_purchase_orders_fpo" ON "purchase_orders"("fpo_id");

-- CreateIndex
CREATE INDEX "idx_purchase_orders_number" ON "purchase_orders"("po_number");

-- CreateIndex
CREATE INDEX "idx_purchase_orders_status" ON "purchase_orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "unique_po_number_per_fpo" ON "purchase_orders"("fpo_id", "po_number");

-- CreateIndex
CREATE INDEX "idx_purchase_vouchers_created_at" ON "purchase_vouchers"("created_at");

-- CreateIndex
CREATE INDEX "idx_purchase_vouchers_fpo_id" ON "purchase_vouchers"("fpo_id");

-- CreateIndex
CREATE INDEX "idx_purchase_vouchers_fpo_status" ON "purchase_vouchers"("fpo_id", "status");

-- CreateIndex
CREATE INDEX "idx_purchase_vouchers_gst_reporting" ON "purchase_vouchers"("fpo_id", "status", "party_invoice_date");

-- CreateIndex
CREATE INDEX "idx_purchase_vouchers_party_invoice_date" ON "purchase_vouchers"("party_invoice_date");

-- CreateIndex
CREATE INDEX "idx_purchase_vouchers_party_invoice_number" ON "purchase_vouchers"("party_invoice_number");

-- CreateIndex
CREATE INDEX "idx_purchase_vouchers_po_number" ON "purchase_vouchers"("po_number");

-- CreateIndex
CREATE INDEX "idx_purchase_vouchers_status" ON "purchase_vouchers"("status");

-- CreateIndex
CREATE INDEX "idx_purchase_vouchers_supplier_state" ON "purchase_vouchers"("supplier_state");

-- CreateIndex
CREATE INDEX "idx_purchase_vouchers_supplier_vendor_id" ON "purchase_vouchers"("supplier_vendor_id");

-- CreateIndex
CREATE INDEX "idx_purchase_vouchers_voucher_number" ON "purchase_vouchers"("voucher_number");

-- CreateIndex
CREATE INDEX "purchase_vouchers_id_idx" ON "purchase_vouchers"("id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_voucher_number_per_fpo" ON "purchase_vouchers"("fpo_id", "voucher_number");

-- CreateIndex
CREATE INDEX "idx_quotation_line_items_item" ON "quotation_line_items"("item_id");

-- CreateIndex
CREATE INDEX "idx_quotation_line_items_quotation" ON "quotation_line_items"("quotation_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_quotation_line_number" ON "quotation_line_items"("quotation_id", "line_number");

-- CreateIndex
CREATE INDEX "idx_quotations_date" ON "quotations"("quotation_date");

-- CreateIndex
CREATE INDEX "idx_quotations_fpo" ON "quotations"("fpo_id");

-- CreateIndex
CREATE INDEX "idx_quotations_number" ON "quotations"("quotation_number");

-- CreateIndex
CREATE INDEX "idx_quotations_status" ON "quotations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "unique_quotation_number_per_fpo" ON "quotations"("fpo_id", "quotation_number");

-- CreateIndex
CREATE INDEX "idx_shareholders_aadhaar" ON "shareholders"("aadhaar");

-- CreateIndex
CREATE INDEX "idx_shareholders_cattle_details" ON "shareholders" USING GIN ("cattle_details");

-- CreateIndex
CREATE INDEX "idx_shareholders_fpo_id" ON "shareholders"("fpo_id");

-- CreateIndex
CREATE INDEX "idx_shareholders_land_details" ON "shareholders" USING GIN ("land_details");

-- CreateIndex
CREATE INDEX "idx_shareholders_mobile" ON "shareholders"("mobile");

-- CreateIndex
CREATE INDEX "idx_shareholders_name" ON "shareholders"("name");

-- CreateIndex
CREATE INDEX "idx_shareholders_pond_details" ON "shareholders" USING GIN ("pond_details");

-- CreateIndex
CREATE UNIQUE INDEX "unique_aadhaar_per_fpo" ON "shareholders"("aadhaar", "fpo_id");

-- CreateIndex
CREATE INDEX "idx_units_fpo_id" ON "units"("fpo_id");

-- CreateIndex
CREATE INDEX "idx_units_label" ON "units"("label");

-- CreateIndex
CREATE UNIQUE INDEX "units_fpo_id_code_key" ON "units"("fpo_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_voucher_number_key" ON "vouchers"("voucher_number");

-- CreateIndex
CREATE INDEX "idx_vouchers_created_at" ON "vouchers"("created_at");

-- CreateIndex
CREATE INDEX "idx_vouchers_date" ON "vouchers"("date");

-- CreateIndex
CREATE INDEX "idx_vouchers_fpo_date_type" ON "vouchers"("fpo_id", "date" DESC, "voucher_type");

-- CreateIndex
CREATE INDEX "idx_vouchers_fpo_id" ON "vouchers"("fpo_id");

-- CreateIndex
CREATE INDEX "idx_vouchers_ledger_entries" ON "vouchers" USING GIN ("ledger_entry_ids");

-- CreateIndex
CREATE INDEX "idx_vouchers_ledger_entries_btree" ON "vouchers"("ledger_entry_ids");

-- CreateIndex
CREATE INDEX "idx_vouchers_number" ON "vouchers"("voucher_number");

-- CreateIndex
CREATE INDEX "idx_vouchers_original_voucher" ON "vouchers"("original_voucher_id") WHERE (original_voucher_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_vouchers_type" ON "vouchers"("voucher_type");

-- AddForeignKey
ALTER TABLE "user_plans" ADD CONSTRAINT "user_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_plans" ADD CONSTRAINT "user_plans_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "active_transactions" ADD CONSTRAINT "active_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bank_books" ADD CONSTRAINT "bank_books_ledger_account_id_fkey" FOREIGN KEY ("ledger_account_id") REFERENCES "ledger_account"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bank_books" ADD CONSTRAINT "fk_bank_books_bank_account" FOREIGN KEY ("bank_account_id") REFERENCES "bank_details"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bank_books" ADD CONSTRAINT "fk_bank_books_fpo" FOREIGN KEY ("fpo_id") REFERENCES "fpo_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bank_details" ADD CONSTRAINT "bank_details_fpo_id_fkey" FOREIGN KEY ("fpo_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bank_details" ADD CONSTRAINT "bank_details_fpo_id_fkey1" FOREIGN KEY ("fpo_id") REFERENCES "fpo_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_book_entries" ADD CONSTRAINT "cash_book_entries_cash_book_id_fkey" FOREIGN KEY ("cash_book_id") REFERENCES "cash_books"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cash_books" ADD CONSTRAINT "cash_books_ledger_account_id_fkey" FOREIGN KEY ("ledger_account_id") REFERENCES "ledger_account"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_fpo_id_fkey" FOREIGN KEY ("fpo_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "document_number_sequences" ADD CONSTRAINT "fk_document_sequences_fpo" FOREIGN KEY ("fpo_id") REFERENCES "fpo_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fpo_profiles" ADD CONSTRAINT "fpo_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_fpo_id_fkey" FOREIGN KEY ("fpo_id") REFERENCES "fpo_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_party_ledger_id_fkey" FOREIGN KEY ("party_ledger_id") REFERENCES "ledger_account"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoice_settings" ADD CONSTRAINT "invoice_settings_fpo_id_fkey" FOREIGN KEY ("fpo_id") REFERENCES "fpo_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_fpo_id_fkey" FOREIGN KEY ("fpo_id") REFERENCES "fpo_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_fpo_id_fkey" FOREIGN KEY ("fpo_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_account" ADD CONSTRAINT "ledger_account_fpo_id_fkey" FOREIGN KEY ("fpo_id") REFERENCES "fpo_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "fk_ledger_entry_account" FOREIGN KEY ("ledger_account_id") REFERENCES "ledger_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_group" ADD CONSTRAINT "fk_ledger_group_parent" FOREIGN KEY ("parent_group") REFERENCES "ledger_group"("group_name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bankbook_id_fkey" FOREIGN KEY ("bankbook_id") REFERENCES "bank_books"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_cashbook_id_fkey" FOREIGN KEY ("cashbook_id") REFERENCES "cash_books"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_fpo_id_fkey" FOREIGN KEY ("fpo_id") REFERENCES "fpo_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_document_id_fkey" FOREIGN KEY ("payment_document_id") REFERENCES "payment_documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_reversal_payment_id_fkey" FOREIGN KEY ("reversal_payment_id") REFERENCES "payments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_line_items" ADD CONSTRAINT "purchase_line_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_line_items" ADD CONSTRAINT "purchase_line_items_purchase_voucher_id_fkey" FOREIGN KEY ("purchase_voucher_id") REFERENCES "purchase_vouchers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_order_line_items" ADD CONSTRAINT "purchase_order_line_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_order_line_items" ADD CONSTRAINT "purchase_order_line_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_fpo_id_fkey" FOREIGN KEY ("fpo_id") REFERENCES "fpo_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_vouchers" ADD CONSTRAINT "fk_purchase_voucher_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_vouchers" ADD CONSTRAINT "fk_purchase_voucher_fpo" FOREIGN KEY ("fpo_id") REFERENCES "fpo_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_vouchers" ADD CONSTRAINT "fk_purchase_voucher_supplier" FOREIGN KEY ("supplier_vendor_id") REFERENCES "ledger_account"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quotation_line_items" ADD CONSTRAINT "quotation_line_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quotation_line_items" ADD CONSTRAINT "quotation_line_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_fpo_id_fkey" FOREIGN KEY ("fpo_id") REFERENCES "fpo_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "taxes" ADD CONSTRAINT "taxes_fpo_id_fkey" FOREIGN KEY ("fpo_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_fpo_id_fkey" FOREIGN KEY ("fpo_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_original_voucher_id_fkey" FOREIGN KEY ("original_voucher_id") REFERENCES "vouchers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
