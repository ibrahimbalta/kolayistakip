-- Migration: Add payment tracking and contract management fields to reservations table
-- Created: 2025-12-19
-- Description: Adds columns for tracking payments, payment history, and contract documents

-- Add new columns to reservations table
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS contract_file_url TEXT,
ADD COLUMN IF NOT EXISTS contract_file_name TEXT,
ADD COLUMN IF NOT EXISTS payment_history JSONB DEFAULT '[]'::jsonb;

-- Create index on payment status for faster queries
CREATE INDEX IF NOT EXISTS idx_reservations_payment_status 
ON reservations ((paid_amount >= total_amount)) 
WHERE total_amount > 0;

-- Create index on contract status
CREATE INDEX IF NOT EXISTS idx_reservations_has_contract 
ON reservations (contract_file_url) 
WHERE contract_file_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN reservations.total_amount IS 'Total amount to be paid for this reservation';
COMMENT ON COLUMN reservations.paid_amount IS 'Total amount already paid';
COMMENT ON COLUMN reservations.contract_file_url IS 'URL to the contract file in Supabase Storage';
COMMENT ON COLUMN reservations.contract_file_name IS 'Original filename of the uploaded contract';
COMMENT ON COLUMN reservations.payment_history IS 'JSON array of payment records with id, amount, date, note, created_by';

-- Update existing reservations to set total_amount equal to fiyat_miktar
UPDATE reservations 
SET total_amount = fiyat_miktar 
WHERE total_amount = 0 AND fiyat_miktar > 0;
