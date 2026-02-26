
-- Add FK from visitas.analista_id to profiles table via user_id
-- We can't directly FK to profiles.user_id since it's not the PK, so we reference auth.users
-- Actually, let's just add a proper FK for join purposes
ALTER TABLE public.visitas ADD CONSTRAINT visitas_analista_id_fkey FOREIGN KEY (analista_id) REFERENCES auth.users(id);
