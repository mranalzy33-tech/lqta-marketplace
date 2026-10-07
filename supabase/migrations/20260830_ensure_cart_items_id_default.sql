BEGIN;
-- Defense-in-depth for a reported "null value in column id of relation
-- cart_items violates not-null constraint" error. The table definition in
-- this repository (20260828_add_cart.sql) already declares
-- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, so this should not be
-- reachable from the current migrations — but a live database that had this
-- table created before that default existed (or created manually) could be
-- missing it. This migration is safe to run whether or not that's the case.

-- Required for gen_random_uuid(); no-op if already enabled (it is, by
-- 0000_initial_schema.sql, on any database that ran the full migration set).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Backfill any existing row that somehow has a NULL id before adding the
-- default (a NOT NULL PRIMARY KEY can't already contain NULLs, so this is
-- only relevant if the column was NOT NULL without being the primary key
-- on some divergent live schema).
UPDATE public.cart_items SET id = gen_random_uuid() WHERE id IS NULL;

ALTER TABLE public.cart_items ALTER COLUMN id SET DEFAULT gen_random_uuid();
COMMIT;
