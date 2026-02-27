
-- Tighten UPDATE on ia_recommendations: only creator or admin can update
DROP POLICY "Authenticated users can update recommendations" ON public.ia_recommendations;
CREATE POLICY "Creator or admin can update recommendations" ON public.ia_recommendations 
  FOR UPDATE USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'));

-- Tighten INSERT on ia_recommendations to auth.uid() = created_by
DROP POLICY "Authenticated users can insert recommendations" ON public.ia_recommendations;
CREATE POLICY "Users can insert own recommendations" ON public.ia_recommendations 
  FOR INSERT WITH CHECK (auth.uid() = created_by);
