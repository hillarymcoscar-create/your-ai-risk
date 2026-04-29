DROP POLICY IF EXISTS "Anyone can submit an email capture" ON public.email_captures;

CREATE POLICY "Anyone can submit a valid email capture"
ON public.email_captures
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(email) <= 254
  AND source IN ('agent_watch_gate', 'results_email_plan', 'upskill_pack')
);