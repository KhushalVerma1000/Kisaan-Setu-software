-- ============================================================================
-- Data Migration Script: Backfill Line Items and Inventory Transactions
-- Description: Migrates existing JSONB line items to dedicated tables and
--              creates historical inventory transactions
-- ============================================================================

-- IMPORTANT: Run this AFTER running migration_inventory_and_line_items.sql

-- ============================================================================
-- PART 1: MIGRATE INVOICE LINE ITEMS
-- ============================================================================

-- Disable negative stock check during migration (historical data might cause issues)
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS check_current_stock_non_negative;

DO $$
DECLARE
  invoice_record RECORD;
  line_item JSONB;
  line_num INTEGER;
BEGIN
  RAISE NOTICE 'Starting invoice line items migration...';
  
  FOR invoice_record IN 
    SELECT id, invoice_number, fpo_id, items, invoice_date, customer
    FROM public.invoices
    WHERE items IS NOT NULL AND jsonb_array_length(items) > 0
  LOOP
    line_num := 1;
    
    FOR line_item IN SELECT * FROM jsonb_array_elements(invoice_record.items)
    LOOP
      -- Insert line item
      INSERT INTO public.invoice_line_items (
        invoice_id,
        line_number,
        item_id,
        item_name,
        item_type,
        hsn_sac,
        quantity,
        unit_code,
        unit_price,
        discount_type,
        discount_value,
        discount_amount,
        gst_rate,
        gst_type,
        base_amount,
        taxable_amount,
        gst_amount,
        line_total
      ) VALUES (
        invoice_record.id,
        line_num,
        COALESCE((line_item->'item'->>'id')::uuid, (line_item->>'itemId')::uuid, (line_item->>'item_id')::uuid),
        COALESCE(line_item->'item'->>'name', line_item->>'itemName', line_item->>'item_name'),
        COALESCE(line_item->'item'->>'type', line_item->>'itemType', line_item->>'item_type', 'product'),
        COALESCE(line_item->'item'->>'hsn_sac', line_item->>'hsnSac', line_item->>'hsn_sac'),
        COALESCE((line_item->>'quantity')::numeric, 0),
        COALESCE(line_item->'item'->'unit'->>'code', line_item->>'unitCode', line_item->>'unit_code'),
        COALESCE((line_item->>'unitPrice')::numeric, (line_item->>'unit_price')::numeric, 0),
        COALESCE(line_item->'discount'->>'type', line_item->>'discountType', line_item->>'discount_type'),
        COALESCE((line_item->'discount'->>'value')::numeric, (line_item->>'discountValue')::numeric, (line_item->>'discount_value')::numeric, 0),
        COALESCE((line_item->'calculations'->>'discountAmount')::numeric, (line_item->>'discountAmount')::numeric, (line_item->>'discount_amount')::numeric, 0),
        COALESCE((line_item->'gstConfig'->>'rate')::numeric, (line_item->>'gstRate')::numeric, (line_item->>'gst_rate')::numeric, 0),
        COALESCE(line_item->'gstConfig'->>'type', line_item->>'gstType', line_item->>'gst_type', 'excluding'),
        COALESCE((line_item->'calculations'->>'baseAmount')::numeric, (line_item->>'baseAmount')::numeric, (line_item->>'base_amount')::numeric, 0),
        COALESCE((line_item->'calculations'->>'taxableAmount')::numeric, (line_item->>'taxableAmount')::numeric, (line_item->>'taxable_amount')::numeric, 0),
        COALESCE((line_item->'calculations'->>'gstAmount')::numeric, (line_item->>'gstAmount')::numeric, (line_item->>'gst_amount')::numeric, 0),
        COALESCE((line_item->'calculations'->>'lineTotal')::numeric, (line_item->>'lineTotal')::numeric, (line_item->>'line_total')::numeric, 0)
      );
      
      -- Create inventory transaction (for products AND services now)
      DECLARE
        current_stock numeric := 0;
        customer_name text;
        v_item_id uuid;
        v_item_type text;
      BEGIN
        v_item_id := COALESCE((line_item->'item'->>'id')::uuid, (line_item->>'itemId')::uuid, (line_item->>'item_id')::uuid);
        v_item_type := COALESCE(line_item->'item'->>'type', line_item->>'itemType', line_item->>'item_type', 'product');
        
        -- Get current stock before this sale (only relevant for products)
        IF v_item_type = 'product' THEN
          SELECT public.get_current_stock_from_transactions(
            v_item_id, 
            invoice_record.fpo_id
          ) INTO current_stock;
        END IF;
        
        -- Extract customer name from JSONB
        customer_name := invoice_record.customer->>'name';
        
        -- Insert inventory transaction
        INSERT INTO public.inventory_transactions (
          fpo_id,
          item_id,
          item_type,
          transaction_type,
          quantity,
          unit_price,
          document_id,
          document_type,
          document_number,
          party_type,
          party_name,
          transaction_date,
          stock_before,
          stock_after,
          notes
        ) VALUES (
          invoice_record.fpo_id,
          v_item_id,
          v_item_type,
          'sale',
          -(COALESCE((line_item->>'quantity')::numeric, 0)), -- Negative for sales
          COALESCE((line_item->>'unitPrice')::numeric, (line_item->>'unit_price')::numeric, 0),
          invoice_record.id,
          'invoice',
          invoice_record.invoice_number,
          'customer',
          customer_name,
          invoice_record.invoice_date::date,
          current_stock,
          current_stock - COALESCE((line_item->>'quantity')::numeric, 0), -- For services, this tracks cumulative usage (negative)
          'Migrated from invoice'
        );
      END;
      
      line_num := line_num + 1;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Invoice line items migration completed';
END $$;

-- ============================================================================
-- PART 2: MIGRATE PURCHASE VOUCHER LINE ITEMS
-- ============================================================================

DO $$
DECLARE
  purchase_record RECORD;
  line_item JSONB;
  line_num INTEGER;
BEGIN
  RAISE NOTICE 'Starting purchase voucher line items migration...';
  
  FOR purchase_record IN 
    SELECT id, voucher_number, fpo_id, items, party_invoice_date, supplier_vendor_name
    FROM public.purchase_vouchers
    WHERE items IS NOT NULL AND jsonb_array_length(items) > 0
  LOOP
    line_num := 1;
    
    FOR line_item IN SELECT * FROM jsonb_array_elements(purchase_record.items)
    LOOP
      -- Insert line item
      INSERT INTO public.purchase_line_items (
        purchase_voucher_id,
        line_number,
        item_id,
        item_name,
        item_type,
        hsn_sac,
        quantity,
        unit_code,
        unit_price,
        discount_type,
        discount_value,
        discount_amount,
        gst_rate,
        gst_type,
        base_amount,
        taxable_amount,
        gst_amount,
        line_total
      ) VALUES (
        purchase_record.id,
        line_num,
        COALESCE((line_item->'item'->>'id')::uuid, (line_item->>'itemId')::uuid, (line_item->>'item_id')::uuid),
        COALESCE(line_item->'item'->>'name', line_item->>'itemName', line_item->>'item_name'),
        COALESCE(line_item->'item'->>'type', line_item->>'itemType', line_item->>'item_type', 'product'),
        COALESCE(line_item->'item'->>'hsn_sac', line_item->>'hsnSac', line_item->>'hsn_sac'),
        COALESCE((line_item->>'quantity')::numeric, 0),
        COALESCE(line_item->'item'->'unit'->>'code', line_item->>'unitCode', line_item->>'unit_code'),
        COALESCE((line_item->>'unitPrice')::numeric, (line_item->>'unit_price')::numeric, 0),
        COALESCE(line_item->'discount'->>'type', line_item->>'discountType', line_item->>'discount_type'),
        COALESCE((line_item->'discount'->>'value')::numeric, (line_item->>'discountValue')::numeric, (line_item->>'discount_value')::numeric, 0),
        COALESCE((line_item->'calculations'->>'discountAmount')::numeric, (line_item->>'discountAmount')::numeric, (line_item->>'discount_amount')::numeric, 0),
        COALESCE((line_item->'gstConfig'->>'rate')::numeric, (line_item->>'gstRate')::numeric, (line_item->>'gst_rate')::numeric, 0),
        COALESCE(line_item->'gstConfig'->>'type', line_item->>'gstType', line_item->>'gst_type', 'excluding'),
        COALESCE((line_item->'calculations'->>'baseAmount')::numeric, (line_item->>'baseAmount')::numeric, (line_item->>'base_amount')::numeric, 0),
        COALESCE((line_item->'calculations'->>'taxableAmount')::numeric, (line_item->>'taxableAmount')::numeric, (line_item->>'taxable_amount')::numeric, 0),
        COALESCE((line_item->'calculations'->>'gstAmount')::numeric, (line_item->>'gstAmount')::numeric, (line_item->>'gst_amount')::numeric, 0),
        COALESCE((line_item->'calculations'->>'lineTotal')::numeric, (line_item->>'lineTotal')::numeric, (line_item->>'line_total')::numeric, 0)
      );
      
      -- Create inventory transaction (for products AND services now)
      DECLARE
        current_stock numeric := 0;
        v_item_id uuid;
        v_item_type text;
      BEGIN
        v_item_id := COALESCE((line_item->'item'->>'id')::uuid, (line_item->>'itemId')::uuid, (line_item->>'item_id')::uuid);
        v_item_type := COALESCE(line_item->'item'->>'type', line_item->>'itemType', line_item->>'item_type', 'product');
        
        -- Get current stock before this purchase (only relevant for products)
        IF v_item_type = 'product' THEN
          SELECT public.get_current_stock_from_transactions(
            v_item_id, 
            purchase_record.fpo_id
          ) INTO current_stock;
        END IF;
        
        -- Insert inventory transaction
        INSERT INTO public.inventory_transactions (
          fpo_id,
          item_id,
          item_type,
          transaction_type,
          quantity,
          unit_price,
          document_id,
          document_type,
          document_number,
          party_type,
          party_name,
          transaction_date,
          stock_before,
          stock_after,
          notes
        ) VALUES (
          purchase_record.fpo_id,
          v_item_id,
          v_item_type,
          'purchase',
          COALESCE((line_item->>'quantity')::numeric, 0), -- Positive for purchases
          COALESCE((line_item->>'unitPrice')::numeric, (line_item->>'unit_price')::numeric, 0),
          purchase_record.id,
          'purchase_voucher',
          purchase_record.voucher_number,
          'supplier',
          purchase_record.supplier_vendor_name,
          purchase_record.party_invoice_date::date,
          current_stock,
          current_stock + COALESCE((line_item->>'quantity')::numeric, 0), -- For services, this tracks cumulative usage (positive)
          'Migrated from purchase voucher'
        );
      END;
      
      line_num := line_num + 1;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Purchase voucher line items migration completed';
END $$;

-- ============================================================================
-- PART 3: RECALCULATE ALL ITEM STOCKS
-- ============================================================================

DO $$
DECLARE
  item_record RECORD;
  new_stock numeric;
BEGIN
  RAISE NOTICE 'Recalculating stock for all items...';
  
  FOR item_record IN 
    SELECT id, fpo_id, name, current_stock as old_stock
    FROM public.items
    WHERE type = 'product'
  LOOP
    -- Recalculate stock from transactions
    new_stock := public.recalculate_item_stock(item_record.id, item_record.fpo_id);
    
    RAISE NOTICE 'Item: % | Old Stock: % | New Stock: %', 
      item_record.name, item_record.old_stock, new_stock;
  END LOOP;
  
  RAISE NOTICE 'Stock recalculation completed';
END $$;

-- ============================================================================
-- PART 4: VERIFICATION QUERIES
-- ============================================================================

-- Count migrated line items
SELECT 
  'Invoice Line Items' as table_name,
  COUNT(*) as count
FROM public.invoice_line_items
UNION ALL
SELECT 
  'Purchase Line Items' as table_name,
  COUNT(*) as count
FROM public.purchase_line_items
UNION ALL
SELECT 
  'Inventory Transactions' as table_name,
  COUNT(*) as count
FROM public.inventory_transactions;

-- Show sample of inventory transactions
SELECT 
  it.transaction_type,
  it.document_type,
  it.document_number,
  i.name as item_name,
  it.quantity,
  it.stock_before,
  it.stock_after,
  it.party_name,
  it.transaction_date
FROM public.inventory_transactions it
JOIN public.items i ON it.item_id = i.id
ORDER BY it.transaction_date DESC
LIMIT 10;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- 
-- NEXT STEPS:
-- 1. Verify the migrated data using the verification queries above
-- 2. Once verified, you can optionally remove the JSONB 'items' columns:
--    ALTER TABLE public.invoices DROP COLUMN IF EXISTS items;
--    ALTER TABLE public.purchase_vouchers DROP COLUMN IF EXISTS items;
-- 
-- NOTE: Keep the JSONB columns for a while as backup before dropping them!
-- ============================================================================
