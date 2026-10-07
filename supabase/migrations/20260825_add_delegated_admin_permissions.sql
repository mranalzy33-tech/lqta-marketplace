-- Delegated administrator access is intentionally separate from users.role.
-- The existing role enum remains compatible, while the service layer grants
-- only the selected capabilities to registered marketplace users.

BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_permissions (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  permissions text[] NOT NULL,
  granted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_permissions_not_empty CHECK (cardinality(permissions) > 0),
  CONSTRAINT admin_permissions_known_values CHECK (
    permissions <@ ARRAY[
      'admin.dashboard.view',
      'admin.users.read',
      'admin.users.manage',
      'admin.listings.read',
      'admin.listings.manage',
      'admin.auctions.read',
      'admin.auctions.manage',
      'admin.categories.read',
      'admin.categories.manage'
    ]::text[]
  )
);

CREATE INDEX IF NOT EXISTS admin_permissions_granted_by_idx
  ON public.admin_permissions (granted_by);

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_permissions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_permissions TO service_role;

CREATE POLICY block_direct_access_admin_permissions
  ON public.admin_permissions FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

COMMIT;
