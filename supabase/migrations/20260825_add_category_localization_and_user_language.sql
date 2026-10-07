-- Preserve the existing categories.name value as the established Arabic/legacy label.
-- English labels are intentionally nullable while existing categories are translated by an administrator.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS name_en text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'ar';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_preferred_language_check'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_preferred_language_check
      CHECK (preferred_language IN ('ar', 'en'));
  END IF;
END $$;

COMMENT ON COLUMN public.categories.name_en IS 'Optional English category name. Existing categories retain their name as the Arabic/legacy source label until translated.';
COMMENT ON COLUMN public.users.preferred_language IS 'Saved default UI language for the signed-in account: ar or en.';
