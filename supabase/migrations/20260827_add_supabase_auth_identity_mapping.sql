-- Link each marketplace profile to the verified Supabase Auth user that signs
-- in with the same email address, without changing existing marketplace data.
BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS supabase_auth_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS users_supabase_auth_id_key
  ON public.users (supabase_auth_id)
  WHERE supabase_auth_id IS NOT NULL;

COMMENT ON COLUMN public.users.supabase_auth_id IS
  'Verified Supabase Auth user identifier used by the marketplace deployment.';

COMMIT;
