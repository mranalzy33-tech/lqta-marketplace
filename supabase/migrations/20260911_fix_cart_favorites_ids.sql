BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Existing installations may have created these tables without the defaults.
-- Keep inserts server-side and let PostgreSQL own UUID generation.
ALTER TABLE public.cart_items ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.favorites ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Idempotent indexes preserve the one-row-per-user/listing invariant.
CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_listing_uidx ON public.cart_items(user_id, listing_id);
CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_listing_uidx ON public.favorites(user_id, listing_id);
COMMIT;
