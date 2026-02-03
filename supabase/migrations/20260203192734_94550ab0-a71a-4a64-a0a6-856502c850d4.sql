-- =============================================
-- Fase 1: Evolução do Módulo de Comissões
-- =============================================

-- 1.1 Criar tabela commission_types para tipos customizáveis
CREATE TABLE public.commission_types (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    value NUMERIC NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT commission_types_name_unique UNIQUE (name)
);

-- 1.2 Criar tabela implementation_commissions para múltiplas comissões por implantação
CREATE TABLE public.implementation_commissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    implementation_id UUID NOT NULL REFERENCES public.implementations(id) ON DELETE CASCADE,
    commission_type_id UUID REFERENCES public.commission_types(id) ON DELETE SET NULL,
    commission_name TEXT NOT NULL,
    commission_value NUMERIC NOT NULL,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índice para performance nas buscas por implantação
CREATE INDEX idx_implementation_commissions_implementation_id 
ON public.implementation_commissions(implementation_id);

-- 1.3 Habilitar RLS em ambas as tabelas
ALTER TABLE public.commission_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.implementation_commissions ENABLE ROW LEVEL SECURITY;

-- 1.4 Políticas RLS para commission_types (apenas admins)
CREATE POLICY "Admins can view commission types"
ON public.commission_types
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert commission types"
ON public.commission_types
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update commission types"
ON public.commission_types
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete commission types"
ON public.commission_types
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 1.5 Políticas RLS para implementation_commissions (apenas admins)
CREATE POLICY "Admins can view implementation commissions"
ON public.implementation_commissions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert implementation commissions"
ON public.implementation_commissions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update implementation commissions"
ON public.implementation_commissions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete implementation commissions"
ON public.implementation_commissions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 1.6 Trigger para updated_at em commission_types
CREATE TRIGGER update_commission_types_updated_at
BEFORE UPDATE ON public.commission_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 1.7 Migrar dados existentes de commission_rules para commission_types
INSERT INTO public.commission_types (name, description, value, is_active, created_by, created_at, updated_at)
SELECT 
    CASE implementation_type
        WHEN 'web' THEN 'Implantação Web'
        WHEN 'manager' THEN 'Implantação Manager'
        WHEN 'basic' THEN 'Implantação Basic'
    END as name,
    CASE implementation_type
        WHEN 'web' THEN 'Implantação completa do sistema Web'
        WHEN 'manager' THEN 'Implantação do sistema Manager'
        WHEN 'basic' THEN 'Implantação básica do sistema'
    END as description,
    commission_value as value,
    is_active,
    created_by,
    created_at,
    updated_at
FROM public.commission_rules
ON CONFLICT (name) DO NOTHING;