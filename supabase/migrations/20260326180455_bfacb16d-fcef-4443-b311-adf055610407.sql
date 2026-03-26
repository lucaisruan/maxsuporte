
-- ==============================================
-- ONCENTER INTEGRATION TABLES
-- ==============================================

-- 1. oncenter_user_links: vínculo entre usuário interno e usuário Oncenter
CREATE TABLE public.oncenter_user_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  oncenter_user_id integer NOT NULL,
  oncenter_user_name text NOT NULL,
  oncenter_email text,
  oncenter_role text,
  oncenter_photo_url text,
  chat_status text DEFAULT 'offline',
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(oncenter_user_id)
);

ALTER TABLE public.oncenter_user_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage oncenter_user_links" ON public.oncenter_user_links FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own oncenter link" ON public.oncenter_user_links FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2. oncenter_contacts: cache de contatos/clientes da Oncenter
CREATE TABLE public.oncenter_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oncenter_contact_id integer NOT NULL UNIQUE,
  name text NOT NULL,
  phone text,
  email text,
  photo_url text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.oncenter_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view oncenter_contacts" ON public.oncenter_contacts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage oncenter_contacts" ON public.oncenter_contacts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. oncenter_client_links: vínculo entre cliente local e contato Oncenter
CREATE TABLE public.oncenter_client_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  oncenter_contact_id integer NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id),
  UNIQUE(oncenter_contact_id)
);

ALTER TABLE public.oncenter_client_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view oncenter_client_links" ON public.oncenter_client_links FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage oncenter_client_links" ON public.oncenter_client_links FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. oncenter_ticket_cache: cache resumido de tickets
CREATE TABLE public.oncenter_ticket_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oncenter_ticket_id integer NOT NULL UNIQUE,
  protocol text,
  status text NOT NULL,
  last_message text,
  oncenter_user_id integer,
  oncenter_contact_id integer,
  oncenter_department_id integer,
  department_name text,
  created_at_oncenter timestamptz,
  updated_at_oncenter timestamptz,
  finished_at_oncenter timestamptz,
  attended_at_oncenter timestamptz,
  finish_motive text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.oncenter_ticket_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view oncenter_ticket_cache" ON public.oncenter_ticket_cache FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage oncenter_ticket_cache" ON public.oncenter_ticket_cache FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. oncenter_user_status_history: histórico de status online/offline
CREATE TABLE public.oncenter_user_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oncenter_user_id integer NOT NULL,
  status text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.oncenter_user_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view status history" ON public.oncenter_user_status_history FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage status history" ON public.oncenter_user_status_history FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 6. demand_oncenter_links: vínculo entre demanda e ticket Oncenter
CREATE TABLE public.demand_oncenter_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid NOT NULL,
  oncenter_ticket_id integer NOT NULL,
  linked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(demand_id, oncenter_ticket_id)
);

ALTER TABLE public.demand_oncenter_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view demand_oncenter_links" ON public.demand_oncenter_links FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage demand_oncenter_links" ON public.demand_oncenter_links FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
