CREATE TABLE public.email_captures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT NOT NULL,
  occupation TEXT,
  score INTEGER,
  agent_tier TEXT,
  segment_tag TEXT,
  nz_region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_captures_email ON public.email_captures (email);
CREATE INDEX idx_email_captures_source ON public.email_captures (source);

ALTER TABLE public.email_captures ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can insert a lead — this is a public capture form.
CREATE POLICY "Anyone can submit an email capture"
ON public.email_captures
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- No SELECT/UPDATE/DELETE policies — table is read-only via service role.