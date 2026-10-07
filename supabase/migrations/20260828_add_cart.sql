BEGIN;
CREATE TABLE IF NOT EXISTS public.cart_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,added_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,listing_id));
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS server_only_cart_items ON public.cart_items;
CREATE POLICY server_only_cart_items ON public.cart_items FOR ALL USING(false) WITH CHECK(false);
COMMIT;
