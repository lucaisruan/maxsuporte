-- Add commission_type_id to implementations table to link mode of implementation to commission type
ALTER TABLE public.implementations 
ADD COLUMN commission_type_id uuid REFERENCES public.commission_types(id);

-- Create index for better performance
CREATE INDEX idx_implementations_commission_type_id ON public.implementations(commission_type_id);

-- Migrate existing data: map old implementation_type enum values to commission_types
-- First, ensure commission types exist for the legacy enum values
INSERT INTO public.commission_types (name, description, value, is_active)
SELECT 
  CASE 
    WHEN t.type = 'web' THEN 'Web'
    WHEN t.type = 'manager' THEN 'Manager'
    WHEN t.type = 'basic' THEN 'Basic'
  END as name,
  CASE 
    WHEN t.type = 'web' THEN 'Implantação Web'
    WHEN t.type = 'manager' THEN 'Implantação Manager'
    WHEN t.type = 'basic' THEN 'Implantação Basic'
  END as description,
  COALESCE(cr.commission_value, 0) as value,
  true as is_active
FROM (
  SELECT unnest(ARRAY['web', 'manager', 'basic']) as type
) t
LEFT JOIN public.commission_rules cr ON cr.implementation_type::text = t.type AND cr.is_active = true
WHERE NOT EXISTS (
  SELECT 1 FROM public.commission_types ct 
  WHERE LOWER(ct.name) = t.type OR LOWER(ct.name) = 
    CASE 
      WHEN t.type = 'web' THEN 'web'
      WHEN t.type = 'manager' THEN 'manager'
      WHEN t.type = 'basic' THEN 'basic'
    END
);

-- Update existing implementations to link to commission_types based on implementation_type
UPDATE public.implementations i
SET commission_type_id = ct.id
FROM public.commission_types ct
WHERE i.implementation_type IS NOT NULL
  AND i.commission_type_id IS NULL
  AND (
    (i.implementation_type = 'web' AND LOWER(ct.name) = 'web')
    OR (i.implementation_type = 'manager' AND LOWER(ct.name) = 'manager')
    OR (i.implementation_type = 'basic' AND LOWER(ct.name) = 'basic')
  );