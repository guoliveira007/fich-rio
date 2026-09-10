-- import_claims: explicit deny-all for client roles
REVOKE ALL ON public.import_claims FROM anon, authenticated;
GRANT ALL ON public.import_claims TO service_role;
ALTER TABLE public.import_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_claims FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "import_claims_no_client_access" ON public.import_claims;
CREATE POLICY "import_claims_no_client_access"
  ON public.import_claims
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- user_roles: explicit deny for client-side writes
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

DROP POLICY IF EXISTS "user_roles_no_client_insert" ON public.user_roles;
CREATE POLICY "user_roles_no_client_insert"
  ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "user_roles_no_client_update" ON public.user_roles;
CREATE POLICY "user_roles_no_client_update"
  ON public.user_roles
  AS RESTRICTIVE
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "user_roles_no_client_delete" ON public.user_roles;
CREATE POLICY "user_roles_no_client_delete"
  ON public.user_roles
  AS RESTRICTIVE
  FOR DELETE
  TO anon, authenticated
  USING (false);