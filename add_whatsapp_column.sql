-- Add WhatsApp phone column to website_settings table
-- This column allows users to specify a separate WhatsApp number for their website
-- If not provided, the regular contact_phone will be used for WhatsApp

ALTER TABLE website_settings 
ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;

COMMENT ON COLUMN website_settings.whatsapp_phone IS 'Separate WhatsApp phone number. Falls back to contact_phone if not provided.';
