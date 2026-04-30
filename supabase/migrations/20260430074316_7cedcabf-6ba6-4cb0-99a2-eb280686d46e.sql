CREATE OR REPLACE FUNCTION public.whoami()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'current_user', current_user,
    'session_user', session_user,
    'role', current_setting('role', true),
    'jwt_role', current_setting('request.jwt.claim.role', true),
    'jwt_claims', current_setting('request.jwt.claims', true)
  );
$$;
GRANT EXECUTE ON FUNCTION public.whoami() TO anon, authenticated, public;