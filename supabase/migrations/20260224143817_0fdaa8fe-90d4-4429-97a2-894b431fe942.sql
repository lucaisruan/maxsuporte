
-- 1. Add has_data_migration column to implementations
ALTER TABLE public.implementations ADD COLUMN has_data_migration boolean NOT NULL DEFAULT false;

-- 2. Add "Instalação do sistema" to existing implementations that don't have it
INSERT INTO public.checklist_items (implementation_id, title, description, order_index)
SELECT i.id, 'Instalação do sistema', 'Instalação e configuração inicial do sistema no ambiente do cliente', 7
FROM public.implementations i
WHERE NOT EXISTS (
  SELECT 1 FROM public.checklist_items ci 
  WHERE ci.implementation_id = i.id AND ci.title = 'Instalação do sistema'
);

-- 3. Reorder "Treinamentos" to order_index 8 for existing implementations
UPDATE public.checklist_items 
SET order_index = 8 
WHERE title = 'Treinamentos' AND order_index = 7;

-- 4. Update create_default_checklist function to include new step
CREATE OR REPLACE FUNCTION public.create_default_checklist(impl_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.checklist_items (implementation_id, title, description, order_index, parent_id) VALUES
  (impl_id, 'Migração de Dados', 'Migração de dados do sistema anterior (opcional)', 1, NULL),
  (impl_id, 'Cadastro dos dados da empresa', 'Cadastro dos dados da empresa do Cliente no Sistema', 2, NULL),
  (impl_id, 'Configuração Tributária (CFOP)', 'Configuração de CFOPs e regime tributário', 3, NULL),
  (impl_id, 'Alinhamento Fiscal e Contábil', 'Configurações fiscais e contábeis', 4, NULL),
  (impl_id, 'Identidade Visual', 'Logo e papel de parede do cliente', 5, NULL),
  (impl_id, 'Parametrizações do Sistema', 'Regras, bloqueios e fluxo de venda', 6, NULL),
  (impl_id, 'Instalação do sistema', 'Instalação e configuração inicial do sistema no ambiente do cliente', 7, NULL),
  (impl_id, 'Treinamentos', 'Treinamentos dos módulos do sistema', 8, NULL);
END;
$function$;

-- 5. FIX RLS bug on implementations - the subquery references ia.id instead of implementations.id
DROP POLICY IF EXISTS "Users can view implementations" ON public.implementations;
CREATE POLICY "Users can view implementations" ON public.implementations
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (implementer_id = auth.uid()) 
  OR (EXISTS (
    SELECT 1 FROM implementation_analysts ia
    WHERE ia.implementation_id = implementations.id AND ia.analyst_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Admins can update all, implementers their own" ON public.implementations;
CREATE POLICY "Admins can update all, implementers their own" ON public.implementations
FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (implementer_id = auth.uid()) 
  OR (EXISTS (
    SELECT 1 FROM implementation_analysts ia
    WHERE ia.implementation_id = implementations.id AND ia.analyst_id = auth.uid()
  ))
);

-- 6. Allow implantadores to view commission_types (needed for reports)
DROP POLICY IF EXISTS "Admins can view commission types" ON public.commission_types;
CREATE POLICY "Authenticated users can view commission types" ON public.commission_types
FOR SELECT USING (true);

-- 7. Allow implantadores to view implementation_commissions for their own implementations
DROP POLICY IF EXISTS "Admins can view implementation commissions" ON public.implementation_commissions;
CREATE POLICY "Users can view implementation commissions" ON public.implementation_commissions
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR EXISTS (
    SELECT 1 FROM implementations i
    WHERE i.id = implementation_commissions.implementation_id 
    AND (i.implementer_id = auth.uid() OR EXISTS (
      SELECT 1 FROM implementation_analysts ia
      WHERE ia.implementation_id = i.id AND ia.analyst_id = auth.uid()
    ))
  )
);
