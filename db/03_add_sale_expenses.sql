-- Migration: expenses on each SALE (not purchase) for customer profit.
--
-- Profit formula per customer:
--   revenue (sale line items)
--   - cost (qty × average purchase rate per chemical)
--   - food + auto + labour entered on each sale row
--
-- Purchase table expenses are for buying stock only; they are NOT used in customer profit.
--
-- Run once on an existing DB:
--   psql -U postgres -d chemical_tracker -f db/03_add_sale_expenses.sql
--
-- New installs: columns are already in db/01_create_tables.sql

ALTER TABLE sales
    ADD COLUMN IF NOT EXISTS expense_food   NUMERIC(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS expense_auto   NUMERIC(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS expense_labour NUMERIC(14, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN sales.expense_food IS 'Food/overhead for this sale (profit only, not billed to customer)';
COMMENT ON COLUMN sales.expense_auto IS 'Auto/transport for this sale (profit only)';
COMMENT ON COLUMN sales.expense_labour IS 'Labour for this sale (profit only)';
