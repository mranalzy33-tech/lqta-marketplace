-- Additive category hierarchy: existing categories and listings remain valid.
CREATE TABLE IF NOT EXISTS public.subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_en text,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category_id, slug)
);
CREATE INDEX IF NOT EXISTS subcategories_category_idx ON public.subcategories(category_id);

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES public.subcategories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS listings_subcategory_idx ON public.listings(subcategory_id);

COMMENT ON TABLE public.subcategories IS 'Optional second-level categories owned by a top-level category.';
COMMENT ON COLUMN public.listings.subcategory_id IS 'Optional second-level category; null preserves legacy listings without a subcategory.';
