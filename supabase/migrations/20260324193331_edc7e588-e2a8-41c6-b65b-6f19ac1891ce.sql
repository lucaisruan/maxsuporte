
CREATE TABLE public.episode_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  edited_by uuid NOT NULL,
  field_changed text NOT NULL,
  old_value text,
  new_value text,
  edited_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.episode_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON public.episode_audit_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can insert audit logs"
  ON public.episode_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (edited_by = auth.uid());
