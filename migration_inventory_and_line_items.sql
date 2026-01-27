-- ============================================================================
-- Migration: Inventory Transaction System & Line Items Refactoring
-- Description: Creates inventory_transactions table and refactors line items
--              from JSONB to dedicated tables for invoices, purchase vouchers,
--              quotations, and purchase orders
-- ============================================================================

-- ============================================================================
-- PART 1: INVENTORY TRANSACTIONS TABLE
-- ============================================================================

-- Create inventory_transactions table
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fpo_id uuid NOT NULL REFERENCES public.fpo_profiles(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'product' CHECK (item_type IN ('product', 'service')),
  
  -- Transaction details
  transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'sale', 'adjustment', 'opening')),
  quantity numeric NOT NULL CHECK (quantity != 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  
  -- Reference to source document (will cascade delete when document is deleted)
  document_id uuid,
  document_type text CHECK (document_type IN ('invoice', 'purchase_voucher', 'quotation', 'purchase_order', 'adjustment', 'opening')),
  document_number text,
  
  -- Party information (who bought/sold)
  party_type text CHECK (party_type IN ('customer', 'supplier', 'internal')),
  party_name text,
  party_ledger_id uuid REFERENCES public.ledger_account(id) ON DELETE SET NULL,
  
  -- Transaction date and metadata
  transaction_date date NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Calculated running stock
  stock_before numeric NOT NULL,
  stock_after numeric NOT NULL
);

-- Ensure item_type column exists (in case table was created before this column was added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'inventory_transactions' 
      AND column_name = 'item_type'
  ) THEN
    ALTER TABLE public.inventory_transactions 
    ADD COLUMN item_type text NOT NULL DEFAULT 'product' CHECK (item_type IN ('product', 'service'));
  END IF;
END $$;

-- Create indexes for inventory_transactions
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(item_type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_fpo ON inventory_transactions(fpo_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON inventory_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_document ON inventory_transactions(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_party ON inventory_transactions(party_ledger_id);

-- Add comment to table
COMMENT ON TABLE public.inventory_transactions IS 'Tracks all inventory movements (purchases, sales, adjustments) with full audit trail';

-- ============================================================================
-- PART 2: QUOTATIONS AND PURCHASE ORDERS TABLES
-- ============================================================================

-- Create quotations table
CREATE TABLE IF NOT EXISTS public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fpo_id uuid NOT NULL REFERENCES public.fpo_profiles(id) ON DELETE CASCADE,
  quotation_number text NOT NULL,
  quotation_date date NOT NULL,
  
  -- Customer information (JSONB for flexibility)
  customer jsonb NOT NULL,
  
  -- Document details
  po_number text,
  notes text,
  
  -- Amounts (JSONB for flexibility with summary data)
  summary jsonb NOT NULL,
  gst_breakdown jsonb,
  
  -- Metadata
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'converted', 'expired')),
  valid_until date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_quotation_number_per_fpo UNIQUE(fpo_id, quotation_number)
);

-- Create indexes for quotations
CREATE INDEX IF NOT EXISTS idx_quotations_fpo ON quotations(fpo_id);
CREATE INDEX IF NOT EXISTS idx_quotations_number ON quotations(quotation_number);
CREATE INDEX IF NOT EXISTS idx_quotations_date ON quotations(quotation_date);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);

-- Add comment to quotations table
COMMENT ON TABLE public.quotations IS 'Customer quotations with line items in separate table';

-- Create purchase_orders table  
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fpo_id uuid NOT NULL REFERENCES public.fpo_profiles(id) ON DELETE CASCADE,
  po_number text NOT NULL,
  po_date date NOT NULL,
  
  -- Supplier information (JSONB for flexibility)
  supplier jsonb NOT NULL,
  
  -- Document details
  reference_number text,
  delivery_date date,
  notes text,
  
  -- Amounts (JSONB for flexibility with summary data)
  summary jsonb NOT NULL,
  gst_breakdown jsonb,
  
  -- Metadata
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_po_number_per_fpo UNIQUE(fpo_id, po_number)
);

-- Create indexes for purchase_orders
CREATE INDEX IF NOT EXISTS idx_purchase_orders_fpo ON purchase_orders(fpo_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_number ON purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(po_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

-- Add comment to purchase_orders table
COMMENT ON TABLE public.purchase_orders IS 'Purchase orders to suppliers with line items in separate table';

-- ============================================================================
-- PART 3: LINE ITEMS TABLES
-- ============================================================================

-- Create invoice_line_items table
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  
  -- Item reference
  item_id uuid NOT NULL REFERENCES public.items(id),
  item_name text NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('product', 'service')),
  hsn_sac text NOT NULL,
  
  -- Pricing
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_code text,
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  
  -- Discount
  discount_type text CHECK (discount_type IN ('fixed', 'percent')),
  discount_value numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  
  -- GST
  gst_rate numeric NOT NULL DEFAULT 0,
  gst_type text NOT NULL DEFAULT 'excluding' CHECK (gst_type IN ('exempt', 'excluding', 'including')),
  
  -- Calculated amounts
  base_amount numeric NOT NULL,
  taxable_amount numeric NOT NULL,
  gst_amount numeric NOT NULL,
  line_total numeric NOT NULL,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_invoice_line_number UNIQUE(invoice_id, line_number)
);

-- Create indexes for invoice_line_items
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_item ON invoice_line_items(item_id);

-- Create purchase_line_items table
CREATE TABLE IF NOT EXISTS public.purchase_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_voucher_id uuid NOT NULL REFERENCES public.purchase_vouchers(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  
  -- Item reference
  item_id uuid NOT NULL REFERENCES public.items(id),
  item_name text NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('product', 'service')),
  hsn_sac text NOT NULL,
  
  -- Pricing
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_code text,
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  
  -- Discount
  discount_type text CHECK (discount_type IN ('fixed', 'percent')),
  discount_value numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  
  -- GST
  gst_rate numeric NOT NULL DEFAULT 0,
  gst_type text NOT NULL DEFAULT 'excluding' CHECK (gst_type IN ('exempt', 'excluding', 'including')),
  
  -- Calculated amounts
  base_amount numeric NOT NULL,
  taxable_amount numeric NOT NULL,
  gst_amount numeric NOT NULL,
  line_total numeric NOT NULL,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_purchase_line_number UNIQUE(purchase_voucher_id, line_number)
);

-- Create indexes for purchase_line_items
CREATE INDEX IF NOT EXISTS idx_purchase_line_items_voucher ON purchase_line_items(purchase_voucher_id);
CREATE INDEX IF NOT EXISTS idx_purchase_line_items_item ON purchase_line_items(item_id);

-- Create quotation_line_items table
CREATE TABLE IF NOT EXISTS public.quotation_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  
  -- Item reference
  item_id uuid NOT NULL REFERENCES public.items(id),
  item_name text NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('product', 'service')),
  hsn_sac text NOT NULL,
  
  -- Pricing
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_code text,
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  
  -- Discount
  discount_type text CHECK (discount_type IN ('fixed', 'percent')),
  discount_value numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  
  -- GST
  gst_rate numeric NOT NULL DEFAULT 0,
  gst_type text NOT NULL DEFAULT 'excluding' CHECK (gst_type IN ('exempt', 'excluding', 'including')),
  
  -- Calculated amounts
  base_amount numeric NOT NULL,
  taxable_amount numeric NOT NULL,
  gst_amount numeric NOT NULL,
  line_total numeric NOT NULL,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_quotation_line_number UNIQUE(quotation_id, line_number)
);

-- Create indexes for quotation_line_items
CREATE INDEX IF NOT EXISTS idx_quotation_line_items_quotation ON quotation_line_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_line_items_item ON quotation_line_items(item_id);

-- Create purchase_order_line_items table
CREATE TABLE IF NOT EXISTS public.purchase_order_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  
  -- Item reference
  item_id uuid NOT NULL REFERENCES public.items(id),
  item_name text NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('product', 'service')),
  hsn_sac text NOT NULL,
  
  -- Pricing
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_code text,
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  
  -- Discount
  discount_type text CHECK (discount_type IN ('fixed', 'percent')),
  discount_value numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  
  -- GST
  gst_rate numeric NOT NULL DEFAULT 0,
  gst_type text NOT NULL DEFAULT 'excluding' CHECK (gst_type IN ('exempt', 'excluding', 'including')),
  
  -- Calculated amounts
  base_amount numeric NOT NULL,
  taxable_amount numeric NOT NULL,
  gst_amount numeric NOT NULL,
  line_total numeric NOT NULL,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_purchase_order_line_number UNIQUE(purchase_order_id, line_number)
);

-- Create indexes for purchase_order_line_items
CREATE INDEX IF NOT EXISTS idx_purchase_order_line_items_po ON purchase_order_line_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_line_items_item ON purchase_order_line_items(item_id);

-- ============================================================================
-- PART 4: HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate current stock from inventory transactions
CREATE OR REPLACE FUNCTION public.get_current_stock_from_transactions(p_item_id uuid, p_fpo_id uuid)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_stock numeric;
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN transaction_type IN ('purchase', 'opening') THEN quantity
      WHEN transaction_type = 'sale' THEN -ABS(quantity)
      WHEN transaction_type = 'adjustment' THEN quantity
      ELSE 0
    END
  ), 0)
  INTO v_stock
  FROM public.inventory_transactions
  WHERE item_id = p_item_id
    AND fpo_id = p_fpo_id;
    
  RETURN v_stock;
END;
$$;

-- Function to recalculate and update current_stock for an item
CREATE OR REPLACE FUNCTION public.recalculate_item_stock(p_item_id uuid, p_fpo_id uuid)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_stock numeric;
BEGIN
  -- Calculate stock from transactions
  v_new_stock := public.get_current_stock_from_transactions(p_item_id, p_fpo_id);
  
  -- Update the items table
  UPDATE public.items
  SET current_stock = v_new_stock,
      last_stock_update = now()
  WHERE id = p_item_id
    AND fpo_id = p_fpo_id;
    
  RETURN v_new_stock;
END;
$$;

-- ============================================================================
-- PART 5: COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.invoice_line_items IS 'Line items for invoices - replaces JSONB items column';
COMMENT ON TABLE public.purchase_line_items IS 'Line items for purchase vouchers - replaces JSONB items column';
COMMENT ON TABLE public.quotation_line_items IS 'Line items for quotations';
COMMENT ON TABLE public.purchase_order_line_items IS 'Line items for purchase orders';

COMMENT ON FUNCTION public.get_current_stock_from_transactions IS 'Calculates current stock for an item based on transaction history';
COMMENT ON FUNCTION public.recalculate_item_stock IS 'Recalculates and updates the current_stock field for an item';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
