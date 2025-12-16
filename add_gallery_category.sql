-- Add category column to website_gallery table for grouping images
ALTER TABLE public.website_gallery 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'Genel';
