DROP POLICY IF EXISTS "Anyone can insert a quiz response" ON public.quiz_responses;
DROP POLICY IF EXISTS "Anyone can attach an email to a quiz response" ON public.quiz_responses;

CREATE POLICY "Public can insert quiz response"
  ON public.quiz_responses
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update quiz response email"
  ON public.quiz_responses
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);