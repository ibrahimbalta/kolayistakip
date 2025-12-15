-- Add new columns to website_settings table for social media and quick links
-- Run this in Supabase SQL Editor

-- Appointment and Reservation Links
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS appointment_link TEXT;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS reservation_link TEXT;

-- Social Media Links
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS twitter_url TEXT;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS tiktok_url TEXT;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'website_settings' 
ORDER BY ordinal_position;
