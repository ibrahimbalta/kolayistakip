-- Create storage bucket for company logos
-- Run this in Supabase SQL Editor

-- Create the logos bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the logos bucket

-- Allow authenticated users to upload their logo
CREATE POLICY "Users can upload own logo" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view their own logo
CREATE POLICY "Users can view own logo" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their logo
CREATE POLICY "Users can update own logo" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their logo
CREATE POLICY "Users can delete own logo" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to view logos (for PDF sharing)
CREATE POLICY "Public can view logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'logos');
