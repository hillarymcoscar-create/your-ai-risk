CREATE TABLE public.quiz_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  job_title TEXT,
  matched_occupation TEXT,
  industry TEXT,
  computer_usage TEXT,
  ai_usage TEXT,
  location_country TEXT,
  location_nz_region TEXT,
  risk_score INTEGER,
  risk_band TEXT,
  email TEXT
);

ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert a quiz response"
ON public.quiz_responses
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can attach an email to a quiz response"
ON public.quiz_responses
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);