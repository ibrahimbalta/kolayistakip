-- Customers table schema
-- This table stores customer information for the CRM system

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    sector TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Aktif',
    share_token TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can only see their own customers
CREATE POLICY "Users can view own customers"
    ON customers FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own customers
CREATE POLICY "Users can insert own customers"
    ON customers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own customers
CREATE POLICY "Users can update own customers"
    ON customers FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own customers
CREATE POLICY "Users can delete own customers"
    ON customers FOR DELETE
    USING (auth.uid() = user_id);

-- Public can read customers with share token
CREATE POLICY "Public can read customers with share token"
    ON customers FOR SELECT
    USING (share_token IS NOT NULL);

-- Public can update customer status with share token
CREATE POLICY "Public can update customer status with share token"
    ON customers FOR UPDATE
    USING (share_token IS NOT NULL)
    WITH CHECK (share_token IS NOT NULL);


-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_customers_updated_at();
