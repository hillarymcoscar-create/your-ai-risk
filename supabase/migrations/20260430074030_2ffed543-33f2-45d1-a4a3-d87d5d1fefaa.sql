DROP POLICY IF EXISTS "Anyone can insert a quiz response" ON public.quiz_responses;
CREATE POLICY "Anyone can insert a quiz response"
  ON public.quiz_responses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);