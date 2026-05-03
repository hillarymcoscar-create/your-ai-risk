CREATE TABLE public.waitlist_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  email text NOT NULL,
  quiz_response_id uuid REFERENCES public.quiz_responses(id) ON DELETE SET NULL,
  occupation text,
  risk_score integer,
  source text NOT NULL DEFAULT 'results_page'
);

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist" ON public.waitlist_signups
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.get_waitlist_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.waitlist_signups;
$$;