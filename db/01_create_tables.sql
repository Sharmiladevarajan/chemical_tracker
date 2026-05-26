-- Chemical Business Tracker — PostgreSQL schema
-- Requires PostgreSQL 13+ (uses gen_random_uuid()).

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
CREATE TYPE chemical_unit AS ENUM ('liter', 'kg', 'cane');

CREATE TYPE ledger_type AS ENUM ('credit', 'debit');

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------
CREATE TABLE chemicals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    unit            chemical_unit NOT NULL,
    default_can_size NUMERIC(14, 4),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customers (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(200) NOT NULL,
    contact    VARCHAR(300),
    balance    NUMERIC(14, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Purchases (header + line items)
-- ---------------------------------------------------------------------------
CREATE TABLE purchases (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expense_food NUMERIC(14, 2) NOT NULL DEFAULT 0,
    expense_auto NUMERIC(14, 2) NOT NULL DEFAULT 0,
    expense_labour NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_cost   NUMERIC(14, 2) NOT NULL
);

CREATE TABLE purchase_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES purchases (id) ON DELETE CASCADE,
    chemical_id UUID NOT NULL REFERENCES chemicals (id),
    amount      NUMERIC(14, 4) NOT NULL,
    rate        NUMERIC(14, 4) NOT NULL,
    unit        chemical_unit NOT NULL,
    can_size    NUMERIC(14, 4),
    subtotal    NUMERIC(14, 2) NOT NULL
);

-- ---------------------------------------------------------------------------
-- Sales (header + line items)
-- ---------------------------------------------------------------------------
CREATE TABLE sales (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    customer_id   UUID NOT NULL REFERENCES customers (id),
    total         NUMERIC(14, 2) NOT NULL,
    paid          BOOLEAN NOT NULL DEFAULT false,
    expense_food  NUMERIC(14, 2) NOT NULL DEFAULT 0,
    expense_auto  NUMERIC(14, 2) NOT NULL DEFAULT 0,
    expense_labour NUMERIC(14, 2) NOT NULL DEFAULT 0
);

CREATE TABLE sale_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id     UUID NOT NULL REFERENCES sales (id) ON DELETE CASCADE,
    chemical_id UUID NOT NULL REFERENCES chemicals (id),
    quantity    NUMERIC(14, 4) NOT NULL,
    rate        NUMERIC(14, 4) NOT NULL,
    unit        chemical_unit NOT NULL,
    can_size    NUMERIC(14, 4),
    subtotal    NUMERIC(14, 2) NOT NULL
);

-- ---------------------------------------------------------------------------
-- Customer ledger (payments = credit; unpaid sales = debit)
-- ---------------------------------------------------------------------------
CREATE TABLE ledger_transactions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id   UUID NOT NULL REFERENCES customers (id),
    type          ledger_type NOT NULL,
    amount        NUMERIC(14, 2) NOT NULL,
    occurred_at   TIMESTAMPTZ NOT NULL,
    balance_after NUMERIC(14, 2) NOT NULL,
    comment       TEXT,
    CONSTRAINT ledger_amount_positive CHECK (amount > 0)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_purchase_items_purchase ON purchase_items (purchase_id);
CREATE INDEX idx_purchase_items_chemical ON purchase_items (chemical_id);
CREATE INDEX idx_sale_items_sale ON sale_items (sale_id);
CREATE INDEX idx_sales_customer ON sales (customer_id);
CREATE INDEX idx_sales_occurred ON sales (occurred_at DESC);
CREATE INDEX idx_purchases_occurred ON purchases (occurred_at DESC);
CREATE INDEX idx_ledger_customer_time ON ledger_transactions (customer_id, occurred_at DESC);
