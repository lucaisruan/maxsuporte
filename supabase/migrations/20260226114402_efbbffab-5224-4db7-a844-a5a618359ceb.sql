
-- Create enum for conclusion request status
CREATE TYPE public.conclusion_request_status AS ENUM ('pending', 'approved', 'rejected');

-- Create table
CREATE TABLE public.conclusion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  implementation_id UUID NOT NULL REFERENCES public.implementations(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  status conclusion_request_status NOT NULL DEFAULT 'pending',
  requester_observation TEXT,
  admin_observation TEXT,
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Only one pending request per implementation
CREATE UNIQUE INDEX idx_one_pending_per_implementation 
  ON public.conclusion_requests (implementation_id) 
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.conclusion_requests ENABLE ROW LEVEL SECURITY;

-- Implantadores can create requests for implementations they're assigned to
CREATE POLICY "Assigned users can create conclusion requests"
  ON public.conclusion_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_id = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM implementations i WHERE i.id = implementation_id AND i.implementer_id = auth.uid())
      OR EXISTS (SELECT 1 FROM implementation_analysts ia WHERE ia.implementation_id = conclusion_requests.implementation_id AND ia.analyst_id = auth.uid())
    )
  );

-- Users can view their own requests, admins can view all
CREATE POLICY "Users can view conclusion requests"
  ON public.conclusion_requests
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR requester_id = auth.uid()
  );

-- Only admins can update (approve/reject)
CREATE POLICY "Admins can update conclusion requests"
  ON public.conclusion_requests
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Admins can delete conclusion requests"
  ON public.conclusion_requests
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_conclusion_requests_updated_at
  BEFORE UPDATE ON public.conclusion_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
