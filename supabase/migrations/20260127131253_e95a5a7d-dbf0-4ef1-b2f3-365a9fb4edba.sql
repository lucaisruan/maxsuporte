-- Create a function to validate status updates
-- Only admins can set status to 'concluida'
CREATE OR REPLACE FUNCTION public.validate_implementation_status_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If status is being changed to 'concluida', only allow if user is admin
    IF NEW.status = 'concluida' AND OLD.status != 'concluida' THEN
        IF NOT has_role(auth.uid(), 'admin') THEN
            RAISE EXCEPTION 'Apenas administradores podem concluir implantações';
        END IF;
        -- Set end_date when concluding
        NEW.end_date := now();
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger to run before update on implementations
DROP TRIGGER IF EXISTS validate_status_update ON public.implementations;
CREATE TRIGGER validate_status_update
    BEFORE UPDATE ON public.implementations
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_implementation_status_update();