
ALTER TABLE public.demand_template_steps ADD COLUMN image_path TEXT;

-- Storage policy already exists for demand-evidences bucket, reuse it for template step images
