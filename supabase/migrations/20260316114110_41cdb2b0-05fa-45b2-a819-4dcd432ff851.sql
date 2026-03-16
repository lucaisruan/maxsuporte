
-- Enum for demand step response types
CREATE TYPE public.demand_step_response_type AS ENUM ('ok_falha', 'sim_nao', 'texto_livre');

-- Enum for demand status
CREATE TYPE public.demand_status AS ENUM ('pendente', 'em_andamento', 'concluida', 'atrasada');

-- Demand templates (POP models)
CREATE TABLE public.demand_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  base_score INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Demand template steps
CREATE TABLE public.demand_template_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.demand_templates(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT,
  response_type demand_step_response_type NOT NULL DEFAULT 'ok_falha',
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Demands (instances created from templates)
CREATE TABLE public.demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.demand_templates(id),
  title TEXT NOT NULL,
  description TEXT,
  status demand_status NOT NULL DEFAULT 'pendente',
  deadline TIMESTAMPTZ,
  total_score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Demand analysts (N:N relationship)
CREATE TABLE public.demand_analysts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
  analyst_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(demand_id, analyst_id)
);

-- Demand steps (execution instances)
CREATE TABLE public.demand_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
  template_step_id UUID NOT NULL REFERENCES public.demand_template_steps(id),
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT,
  response_type demand_step_response_type NOT NULL DEFAULT 'ok_falha',
  score INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  result TEXT, -- 'ok', 'falha', 'sim', 'nao', or free text
  observation TEXT,
  corrective_action TEXT,
  earned_score INTEGER NOT NULL DEFAULT 0,
  completed_by UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Demand step evidences (images)
CREATE TABLE public.demand_step_evidences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_step_id UUID NOT NULL REFERENCES public.demand_steps(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User module permissions
CREATE TABLE public.user_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  module TEXT NOT NULL,
  has_access BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, module)
);

-- RLS for demand_templates
ALTER TABLE public.demand_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view active templates" ON public.demand_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can insert templates" ON public.demand_templates FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can update templates" ON public.demand_templates FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete templates" ON public.demand_templates FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- RLS for demand_template_steps
ALTER TABLE public.demand_template_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view template steps" ON public.demand_template_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can insert template steps" ON public.demand_template_steps FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can update template steps" ON public.demand_template_steps FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete template steps" ON public.demand_template_steps FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- RLS for demands
ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view assigned demands" ON public.demands FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'admin') OR 
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.demand_analysts da WHERE da.demand_id = demands.id AND da.analyst_id = auth.uid())
);
CREATE POLICY "Admins can insert demands" ON public.demands FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins and assigned analysts can update demands" ON public.demands FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'admin') OR
  EXISTS (SELECT 1 FROM public.demand_analysts da WHERE da.demand_id = demands.id AND da.analyst_id = auth.uid())
);
CREATE POLICY "Only admins can delete demands" ON public.demands FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- RLS for demand_analysts
ALTER TABLE public.demand_analysts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view demand analysts" ON public.demand_analysts FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'admin') OR analyst_id = auth.uid()
);
CREATE POLICY "Only admins can manage demand analysts" ON public.demand_analysts FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete demand analysts" ON public.demand_analysts FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- RLS for demand_steps
ALTER TABLE public.demand_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view demand steps" ON public.demand_steps FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.demands d WHERE d.id = demand_steps.demand_id AND (
    has_role(auth.uid(), 'admin') OR d.created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.demand_analysts da WHERE da.demand_id = d.id AND da.analyst_id = auth.uid())
  ))
);
CREATE POLICY "Admins can insert demand steps" ON public.demand_steps FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Assigned users can update demand steps" ON public.demand_steps FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.demands d WHERE d.id = demand_steps.demand_id AND (
    has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM public.demand_analysts da WHERE da.demand_id = d.id AND da.analyst_id = auth.uid())
  ))
);

-- RLS for demand_step_evidences
ALTER TABLE public.demand_step_evidences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view evidences" ON public.demand_step_evidences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert evidences" ON public.demand_step_evidences FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Only admins can delete evidences" ON public.demand_step_evidences FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- RLS for user_module_permissions
ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own permissions" ON public.user_module_permissions FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR has_role(auth.uid(), 'admin')
);
CREATE POLICY "Only admins can insert permissions" ON public.user_module_permissions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can update permissions" ON public.user_module_permissions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete permissions" ON public.user_module_permissions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE TRIGGER update_demand_templates_updated_at BEFORE UPDATE ON public.demand_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_demands_updated_at BEFORE UPDATE ON public.demands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_module_permissions_updated_at BEFORE UPDATE ON public.user_module_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket for demand evidences
INSERT INTO storage.buckets (id, name, public) VALUES ('demand-evidences', 'demand-evidences', false);

-- Storage policies
CREATE POLICY "Authenticated users can upload evidences" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'demand-evidences');
CREATE POLICY "Authenticated users can view evidences" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'demand-evidences');
CREATE POLICY "Users can delete own evidences" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'demand-evidences' AND (auth.uid())::text = (storage.foldername(name))[1]);
