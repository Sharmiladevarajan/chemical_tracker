-- Optional seed data — run after 01_create_tables.sql
-- Safe defaults for development; adjust or remove in production.

INSERT INTO chemicals (name, unit, default_can_size)
VALUES
    ('Acetic Acid', 'liter', NULL),
    ('Caustic Soda', 'kg', NULL),
    ('Industrial Solvent', 'cane', 45);

INSERT INTO customers (name, contact, balance)
VALUES
    ('Sample Buyer A', '9000000001', 0),
    ('Sample Buyer B', '9000000002', 0);



INSERT INTO chemicals (name, unit, default_can_size)
VALUES
    ('Nitric Acid', 'kg', NULL),
    ('Hydrochloric Acid(HCL)', 'liter', 60),
    ('Sulfuric Acid', 'kg', 50);

INSERT INTO customers (name, contact, balance)
VALUES
    ('Head Balan', '9000000001', 0),
    ('Thirumoorthi', '9000000002', 0);

