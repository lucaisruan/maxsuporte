-- Create commission_rules table for storing commission configuration per implementation type
CREATE TABLE public.commission_rules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    implementation_type public.implementation_type NOT NULL,
    commission_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT unique_active_rule_per_type UNIQUE (implementation_type, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Add commission fields to implementations table
ALTER TABLE public.implementations 
ADD COLUMN commission_value DECIMAL(10, 2) DEFAULT NULL,
ADD COLUMN commission_paid BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN commission_paid_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Enable RLS on commission_rules
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for commission_rules - Only admins can manage
CREATE POLICY "Admins can view commission rules"
ON public.commission_rules
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert commission rules"
ON public.commission_rules
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update commission rules"
ON public.commission_rules
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete commission rules"
ON public.commission_rules
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_commission_rules_updated_at
BEFORE UPDATE ON public.commission_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get active commission value for a type
CREATE OR REPLACE FUNCTION public.get_active_commission(impl_type public.implementation_type)
RETURNS DECIMAL(10, 2)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT commission_value 
    FROM public.commission_rules 
    WHERE implementation_type = impl_type 
    AND is_active = true 
    LIMIT 1
$$;

-- Create function to set commission when implementation is completed
CREATE OR REPLACE FUNCTION public.set_implementation_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only set commission when status changes to 'concluida' and commission is not already set
    IF NEW.status = 'concluida' AND OLD.status != 'concluida' AND NEW.commission_value IS NULL THEN
        NEW.commission_value := get_active_commission(NEW.implementation_type);
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger to automatically set commission when implementation is completed
CREATE TRIGGER set_commission_on_completion
BEFORE UPDATE ON public.implementations
FOR EACH ROW
EXECUTE FUNCTION public.set_implementation_commission();

-- Insert default commission rules (inactive by default, admin will activate)
INSERT INTO public.commission_rules (implementation_type, commission_value, is_active)
VALUES 
    ('web', 150.00, true),
    ('manager', 250.00, true),
    ('basic', 100.00, true);