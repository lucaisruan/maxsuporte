
-- Add negotiated_time_minutes column to implementations
ALTER TABLE public.implementations 
ADD COLUMN negotiated_time_minutes integer NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.implementations.negotiated_time_minutes IS 'Tempo total negociado com o cliente em minutos. Exclui migração de dados do cálculo.';
