-- Create storage bucket for contract files
-- Run this in Supabase SQL Editor

-- Create the bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the contracts bucket

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload contracts" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'contracts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view their own files
CREATE POLICY "Users can view own contracts" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'contracts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own contracts" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'contracts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to view contracts (for sharing)
CREATE POLICY "Public can view contracts"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'contracts');
