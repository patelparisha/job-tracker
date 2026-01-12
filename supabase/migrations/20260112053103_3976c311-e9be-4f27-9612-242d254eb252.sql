-- Add application_link column to applications table
ALTER TABLE public.applications 
ADD COLUMN application_link text;