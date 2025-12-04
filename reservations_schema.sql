-- Rezervasyon/Alan Yönetimi Tablosu
CREATE TABLE IF NOT EXISTS reservations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    alan_no TEXT NOT NULL,
    alan_tipi TEXT NOT NULL CHECK (alan_tipi IN ('stand', 'toplanti', 'masa', 'kort', 'loca')),
    alan_buyukluk TEXT,
    fiyat_tipi TEXT NOT NULL CHECK (fiyat_tipi IN ('saatlik', 'gunluk', 'tek_fiyat')),
    fiyat_miktar DECIMAL(10, 2) NOT NULL,
    para_birimi TEXT DEFAULT 'TRY' CHECK (para_birimi IN ('TRY', 'USD', 'EUR')),
    durum TEXT DEFAULT 'bos' CHECK (durum IN ('bos', 'opsiyonda', 'rezerve')),
    kroki_url TEXT,
    -- Müşteri rezervasyon bilgileri
    reserved_by_company TEXT,
    reserved_by_name TEXT,
    reserved_by_phone TEXT,
    reserved_by_email TEXT,
    special_requests TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Users can view their own reservations
CREATE POLICY "Users can view their own reservations"
    ON reservations FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own reservations
CREATE POLICY "Users can insert their own reservations"
    ON reservations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own reservations
CREATE POLICY "Users can update their own reservations"
    ON reservations FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own reservations
CREATE POLICY "Users can delete their own reservations"
    ON reservations FOR DELETE
    USING (auth.uid() = user_id);

-- PUBLIC: Anyone can view available reservations (for customer reservation page)
CREATE POLICY "Anyone can view available reservations"
    ON reservations FOR SELECT
    USING (true);

-- PUBLIC: Anyone can update to reserve an area (customer reservation)
CREATE POLICY "Anyone can reserve available areas"
    ON reservations FOR UPDATE
    USING (durum IN ('bos', 'opsiyonda'))
    WITH CHECK (durum = 'rezerve');

-- Create index for better performance
CREATE INDEX IF NOT EXISTS reservations_user_id_idx ON reservations(user_id);
CREATE INDEX IF NOT EXISTS reservations_durum_idx ON reservations(durum);
