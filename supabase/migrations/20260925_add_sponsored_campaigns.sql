BEGIN;

CREATE TABLE IF NOT EXISTS public.sponsored_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL CHECK (char_length(trim(company_name)) BETWEEN 2 AND 120),
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 160),
  description text NOT NULL CHECK (char_length(trim(description)) BETWEEN 2 AND 1000),
  image_url text NOT NULL CHECK (char_length(trim(image_url)) BETWEEN 8 AND 2000),
  target_url text NOT NULL CHECK (char_length(trim(target_url)) BETWEEN 8 AND 2000),
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 10000),
  is_active boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sponsored_campaigns_valid_schedule CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_sponsored_campaigns_public_order
  ON public.sponsored_campaigns (is_active, sort_order, starts_at, ends_at);

ALTER TABLE public.sponsored_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS block_direct_access_sponsored_campaigns ON public.sponsored_campaigns;
CREATE POLICY block_direct_access_sponsored_campaigns
  ON public.sponsored_campaigns FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

GRANT SELECT, INSERT, UPDATE ON TABLE public.sponsored_campaigns TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
