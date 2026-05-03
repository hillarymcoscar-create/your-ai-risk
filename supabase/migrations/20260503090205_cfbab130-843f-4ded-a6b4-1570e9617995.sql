
CREATE OR REPLACE FUNCTION public.get_landing_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  monthly_count integer;
  weekly_total integer;
  first_to_go jsonb;
  last_to_go jsonb;
BEGIN
  SELECT COUNT(*) INTO monthly_count
  FROM quiz_responses
  WHERE created_at >= date_trunc('month', now());

  SELECT COUNT(*) INTO weekly_total
  FROM quiz_responses
  WHERE created_at >= now() - interval '7 days'
    AND matched_occupation IS NOT NULL
    AND risk_score IS NOT NULL;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO first_to_go
  FROM (
    SELECT matched_occupation AS occupation, ROUND(AVG(risk_score))::int AS avg_score
    FROM quiz_responses
    WHERE created_at >= now() - interval '7 days'
      AND matched_occupation IS NOT NULL
      AND risk_score IS NOT NULL
    GROUP BY matched_occupation
    HAVING COUNT(*) >= 1
    ORDER BY AVG(risk_score) DESC
    LIMIT 3
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO last_to_go
  FROM (
    SELECT matched_occupation AS occupation, ROUND(AVG(risk_score))::int AS avg_score
    FROM quiz_responses
    WHERE created_at >= now() - interval '7 days'
      AND matched_occupation IS NOT NULL
      AND risk_score IS NOT NULL
    GROUP BY matched_occupation
    HAVING COUNT(*) >= 1
    ORDER BY AVG(risk_score) ASC
    LIMIT 3
  ) t;

  RETURN jsonb_build_object(
    'monthly_count', monthly_count,
    'weekly_total', weekly_total,
    'first_to_go', first_to_go,
    'last_to_go', last_to_go
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_landing_stats() TO anon, authenticated;
