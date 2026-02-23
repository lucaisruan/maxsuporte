
-- Create webhook_logs table
CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view webhook logs
CREATE POLICY "Admins can view webhook logs"
ON public.webhook_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow service role / edge functions to insert (via anon key with admin check or service role)
CREATE POLICY "Authenticated users can insert webhook logs"
ON public.webhook_logs
FOR INSERT
WITH CHECK (true);

-- Admins can delete webhook logs
CREATE POLICY "Admins can delete webhook logs"
ON public.webhook_logs
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
