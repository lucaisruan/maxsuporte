
-- Tighten visita_interacoes INSERT: user must be auth.uid() or service_role for IA
DROP POLICY "Users can insert interactions" ON public.visita_interacoes;
CREATE POLICY "Users can insert interactions"
  ON public.visita_interacoes FOR INSERT TO authenticated
  WITH CHECK (
    (origem = 'usuario' AND usuario_id = auth.uid())
    OR (origem = 'ia' AND has_role(auth.uid(), 'admin'::app_role))
  );

-- Tighten recomendacoes_visita INSERT: only admins or system
DROP POLICY "System can insert recommendations" ON public.recomendacoes_visita;
CREATE POLICY "Admins can insert recommendations"
  ON public.recomendacoes_visita FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
