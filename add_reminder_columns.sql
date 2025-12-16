-- =============================================
-- Add Reminder Columns to Appointment Slots
-- =============================================
-- Run this in Supabase SQL Editor

-- Add reminder_sent column to track if reminder was sent
ALTER TABLE public.appointment_slots 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Add reminder_sent_at column to track when reminder was sent
ALTER TABLE public.appointment_slots 
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Create an index for faster reminder queries
CREATE INDEX IF NOT EXISTS idx_appointment_slots_reminder 
ON public.appointment_slots (slot_date, status, reminder_sent);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Reminder columns added successfully!';
END $$;
