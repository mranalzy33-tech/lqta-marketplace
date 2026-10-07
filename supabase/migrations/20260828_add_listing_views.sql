BEGIN;
CREATE TABLE IF NOT EXISTS public.listing_views(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,viewed_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS server_only_listing_views ON public.listing_views;
CREATE POLICY server_only_listing_views ON public.listing_views FOR ALL USING(false) WITH CHECK(false);
CREATE INDEX IF NOT EXISTS idx_listing_views_user ON public.listing_views(user_id,viewed_at DESC);
COMMIT;
