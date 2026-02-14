
-- 1. Create implementation_analysts pivot table for N:N relationship
CREATE TABLE public.implementation_analysts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  implementation_id uuid NOT NULL REFERENCES public.implementations(id) ON DELETE CASCADE,
  analyst_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(implementation_id, analyst_id)
);

ALTER TABLE public.implementation_analysts ENABLE ROW LEVEL SECURITY;

-- RLS for pivot table
CREATE POLICY "Admins can manage implementation_analysts"
ON public.implementation_analysts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Analysts can view their own assignments"
ON public.implementation_analysts
FOR SELECT
USING (analyst_id = auth.uid());

-- 2. Migrate existing implementer_id data to pivot table
INSERT INTO public.implementation_analysts (implementation_id, analyst_id)
SELECT id, implementer_id FROM public.implementations WHERE implementer_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. Fix episodes INSERT policy - allow admins to create episodes
DROP POLICY IF EXISTS "Implementers can insert episodes" ON public.episodes;
CREATE POLICY "Users can insert episodes"
ON public.episodes
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.implementation_analysts ia
    WHERE ia.implementation_id = episodes.implementation_id
    AND ia.analyst_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.implementations i
    WHERE i.id = episodes.implementation_id
    AND i.implementer_id = auth.uid()
  )
);

-- 4. Update implementations SELECT to include pivot table
DROP POLICY IF EXISTS "Users can view implementations" ON public.implementations;
CREATE POLICY "Users can view implementations"
ON public.implementations
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  implementer_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.implementation_analysts ia
    WHERE ia.implementation_id = id
    AND ia.analyst_id = auth.uid()
  )
);

-- 5. Update implementations UPDATE policy
DROP POLICY IF EXISTS "Admins can update all, implementers their own" ON public.implementations;
CREATE POLICY "Admins can update all, implementers their own"
ON public.implementations
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  implementer_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.implementation_analysts ia
    WHERE ia.implementation_id = id
    AND ia.analyst_id = auth.uid()
  )
);

-- 6. Update checklist policies to include pivot table
DROP POLICY IF EXISTS "Users can view checklist items" ON public.checklist_items;
CREATE POLICY "Users can view checklist items"
ON public.checklist_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM implementations i
    WHERE i.id = checklist_items.implementation_id
    AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      i.implementer_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.implementation_analysts ia
        WHERE ia.implementation_id = i.id AND ia.analyst_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "Users can update checklist items" ON public.checklist_items;
CREATE POLICY "Users can update checklist items"
ON public.checklist_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM implementations i
    WHERE i.id = checklist_items.implementation_id
    AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      i.implementer_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.implementation_analysts ia
        WHERE ia.implementation_id = i.id AND ia.analyst_id = auth.uid()
      )
    )
  )
);

-- 7. Update episodes view/update/delete policies
DROP POLICY IF EXISTS "Users can view episodes" ON public.episodes;
CREATE POLICY "Users can view episodes"
ON public.episodes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM implementations i
    WHERE i.id = episodes.implementation_id
    AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      i.implementer_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.implementation_analysts ia
        WHERE ia.implementation_id = i.id AND ia.analyst_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "Implementers can update own episodes" ON public.episodes;
CREATE POLICY "Users can update episodes"
ON public.episodes
FOR UPDATE
USING (
  created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Implementers can delete own episodes" ON public.episodes;
CREATE POLICY "Users can delete episodes"
ON public.episodes
FOR DELETE
USING (
  created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);
