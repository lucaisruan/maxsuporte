-- Add implementation_type enum
CREATE TYPE public.implementation_type AS ENUM ('web', 'manager', 'basic');

-- Add status 'agendada' to implementation_status enum
ALTER TYPE public.implementation_status ADD VALUE 'agendada';

-- Add is_active column to profiles for user blocking feature
ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Add implementation_type to implementations table
ALTER TABLE public.implementations ADD COLUMN implementation_type implementation_type;

-- Add scheduled_start_date to implementations for scheduling feature
-- start_date will be the planned start, we need to track when it actually started
ALTER TABLE public.implementations ADD COLUMN actual_start_date TIMESTAMP WITH TIME ZONE;

-- Create function to auto-update scheduled implementations to em_andamento
CREATE OR REPLACE FUNCTION public.update_scheduled_implementations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.implementations
  SET status = 'em_andamento',
      actual_start_date = now()
  WHERE status = 'agendada'
    AND start_date <= now();
END;
$$;

-- Update RLS policies to consider is_active for profiles
-- Users should still be able to view inactive profiles, but login should be blocked at app level