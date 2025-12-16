-- Add banner_url column to website_settings table
ALTER TABLE public.website_settings 
ADD COLUMN IF NOT EXISTS banner_url text;
