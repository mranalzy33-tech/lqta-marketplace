ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS listings_featured_active_idx
  ON public.listings (updated_at DESC, created_at DESC)
  WHERE is_featured = true AND status = 'active';
