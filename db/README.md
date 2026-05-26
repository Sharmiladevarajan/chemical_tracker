# Database setup

## New database

```bash
psql -U postgres -d chemical_tracker -f db/01_create_tables.sql
psql -U postgres -d chemical_tracker -f db/02_insert_seed.sql   # optional
```

`01_create_tables.sql` already includes **sale expense columns** (`expense_food`, `expense_auto`, `expense_labour` on `sales`).

## Existing database (created before sale expenses)

Run the migration once:

```bash
psql -U postgres -d chemical_tracker -f db/03_add_sale_expenses.sql
```

## Profit calculation

- **Purchase** expenses (food / auto / labour on `purchases`) → stock cost tracking only; **not** used in customer profit.
- **Sale** expenses (on each `sales` row) → subtracted from profit for that customer’s sales.

Enter food, auto, and labour on each sale in the Sales screen (or edit an existing sale).
