
-- Enum for visit types
CREATE TYPE public.visit_type AS ENUM ('visita_tecnica', 'duvida', 'diagnostico', 'oportunidade');

-- Enum for visit status
CREATE TYPE public.visit_status AS ENUM ('aberta', 'analisada', 'resolvida');

-- Enum for knowledge base categories
CREATE TYPE public.knowledge_category AS ENUM ('produto', 'treinamento', 'comportamento', 'processo', 'comercial');

-- Enum for interaction origin
CREATE TYPE public.interaction_origin AS ENUM ('usuario', 'ia');

-- Enum for recommendation type
CREATE TYPE public.recommendation_type AS ENUM ('resposta_ia', 'sugestao_servico', 'decisao');

-- Enum for recommendation origin
CREATE TYPE public.recommendation_origin AS ENUM ('ia', 'base_conhecimento');

-- Table: visitas
CREATE TABLE public.visitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clients(id),
  implantacao_id UUID REFERENCES public.implementations(id),
  analista_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  descricao_situacao TEXT NOT NULL,
  tipo visit_type NOT NULL,
  status visit_status NOT NULL DEFAULT 'aberta',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_visitas_updated_at
  BEFORE UPDATE ON public.visitas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- All authenticated users can view visits (collaborative)
CREATE POLICY "Authenticated users can view visitas"
  ON public.visitas FOR SELECT TO authenticated
  USING (true);

-- Implantadores and admins can create visits
CREATE POLICY "Authenticated users can create visitas"
  ON public.visitas FOR INSERT TO authenticated
  WITH CHECK (analista_id = auth.uid());

-- Admins can update any visit, analysts their own
CREATE POLICY "Users can update visitas"
  ON public.visitas FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR analista_id = auth.uid());

-- Only admins can delete
CREATE POLICY "Only admins can delete visitas"
  ON public.visitas FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Table: visita_interacoes
CREATE TABLE public.visita_interacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id UUID NOT NULL REFERENCES public.visitas(id) ON DELETE CASCADE,
  usuario_id UUID,
  mensagem TEXT NOT NULL,
  origem interaction_origin NOT NULL DEFAULT 'usuario',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.visita_interacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view interactions"
  ON public.visita_interacoes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert interactions"
  ON public.visita_interacoes FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() OR origem = 'ia');

CREATE POLICY "Only admins can delete interactions"
  ON public.visita_interacoes FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Table: base_conhecimento_ia
CREATE TABLE public.base_conhecimento_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  contexto TEXT NOT NULL,
  diretriz_decisao TEXT,
  sugestao_servico TEXT,
  perfil_cliente TEXT,
  categoria knowledge_category NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.base_conhecimento_ia ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_base_conhecimento_updated_at
  BEFORE UPDATE ON public.base_conhecimento_ia
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- All authenticated can view active entries
CREATE POLICY "Authenticated users can view knowledge base"
  ON public.base_conhecimento_ia FOR SELECT TO authenticated
  USING (true);

-- Only admins can manage
CREATE POLICY "Only admins can insert knowledge base"
  ON public.base_conhecimento_ia FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update knowledge base"
  ON public.base_conhecimento_ia FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete knowledge base"
  ON public.base_conhecimento_ia FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Table: recomendacoes_visita
CREATE TABLE public.recomendacoes_visita (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id UUID NOT NULL REFERENCES public.visitas(id) ON DELETE CASCADE,
  tipo recommendation_type NOT NULL,
  conteudo TEXT NOT NULL,
  origem recommendation_origin NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recomendacoes_visita ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view recommendations"
  ON public.recomendacoes_visita FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System can insert recommendations"
  ON public.recomendacoes_visita FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Only admins can delete recommendations"
  ON public.recomendacoes_visita FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
