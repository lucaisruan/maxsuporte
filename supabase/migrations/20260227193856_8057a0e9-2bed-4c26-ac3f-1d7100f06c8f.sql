
-- Enum for recommendation status
CREATE TYPE public.recommendation_status AS ENUM ('generated', 'validated', 'corrected', 'rolled_back');

-- Enum for feedback rating
CREATE TYPE public.feedback_rating AS ENUM ('useful', 'partially_useful', 'irrelevant', 'incorrect');

-- Table: ia_recommendations
CREATE TABLE public.ia_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id UUID REFERENCES public.visitas(id) ON DELETE CASCADE NOT NULL,
  implantacao_id UUID REFERENCES public.implementations(id) ON DELETE SET NULL,
  generated_text TEXT NOT NULL,
  structured_output JSONB,
  confidence_score DECIMAL,
  status recommendation_status NOT NULL DEFAULT 'generated',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_version INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE public.ia_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view recommendations" ON public.ia_recommendations FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert recommendations" ON public.ia_recommendations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update recommendations" ON public.ia_recommendations FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Table: ia_recommendation_versions
CREATE TABLE public.ia_recommendation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID REFERENCES public.ia_recommendations(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  edited_by UUID NOT NULL,
  edit_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ia_recommendation_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view versions" ON public.ia_recommendation_versions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert versions" ON public.ia_recommendation_versions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Table: ia_feedback
CREATE TABLE public.ia_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID REFERENCES public.ia_recommendations(id) ON DELETE CASCADE NOT NULL,
  rating feedback_rating NOT NULL,
  feedback_comment TEXT,
  suggested_correction TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ia_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view feedback" ON public.ia_feedback FOR SELECT USING (true);
CREATE POLICY "Users can insert own feedback" ON public.ia_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own feedback" ON public.ia_feedback FOR UPDATE USING (auth.uid() = user_id);

-- Table: ia_training_dataset
CREATE TABLE public.ia_training_dataset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_context JSONB NOT NULL,
  original_output TEXT NOT NULL,
  corrected_output TEXT NOT NULL,
  error_type TEXT,
  validated_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ia_training_dataset ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view training data" ON public.ia_training_dataset FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can insert training data" ON public.ia_training_dataset FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Function: calculate_ai_quality_score
CREATE OR REPLACE FUNCTION public.calculate_ai_quality_score()
RETURNS TABLE(
  total_recommendations BIGINT,
  useful_pct DECIMAL,
  partially_useful_pct DECIMAL,
  irrelevant_pct DECIMAL,
  incorrect_pct DECIMAL,
  correction_rate DECIMAL,
  avg_score DECIMAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH feedback_stats AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE rating = 'useful') AS useful_count,
      COUNT(*) FILTER (WHERE rating = 'partially_useful') AS partial_count,
      COUNT(*) FILTER (WHERE rating = 'irrelevant') AS irrelevant_count,
      COUNT(*) FILTER (WHERE rating = 'incorrect') AS incorrect_count,
      SUM(CASE
        WHEN rating = 'useful' THEN 2
        WHEN rating = 'partially_useful' THEN 1
        WHEN rating = 'irrelevant' THEN -1
        WHEN rating = 'incorrect' THEN -2
      END) AS weighted_sum
    FROM public.ia_feedback
  ),
  rec_stats AS (
    SELECT
      COUNT(*) AS total_recs,
      COUNT(*) FILTER (WHERE status = 'corrected') AS corrected_count
    FROM public.ia_recommendations
  )
  SELECT
    rs.total_recs AS total_recommendations,
    CASE WHEN fs.total > 0 THEN ROUND(fs.useful_count::decimal / fs.total * 100, 1) ELSE 0 END AS useful_pct,
    CASE WHEN fs.total > 0 THEN ROUND(fs.partial_count::decimal / fs.total * 100, 1) ELSE 0 END AS partially_useful_pct,
    CASE WHEN fs.total > 0 THEN ROUND(fs.irrelevant_count::decimal / fs.total * 100, 1) ELSE 0 END AS irrelevant_pct,
    CASE WHEN fs.total > 0 THEN ROUND(fs.incorrect_count::decimal / fs.total * 100, 1) ELSE 0 END AS incorrect_pct,
    CASE WHEN rs.total_recs > 0 THEN ROUND(rs.corrected_count::decimal / rs.total_recs * 100, 1) ELSE 0 END AS correction_rate,
    CASE WHEN fs.total > 0 THEN ROUND(fs.weighted_sum::decimal / fs.total, 2) ELSE 0 END AS avg_score
  FROM feedback_stats fs, rec_stats rs;
$$;
