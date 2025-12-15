-- Website Modülü için Eksik Tabloları Oluştur
-- Bu SQL'i Supabase SQL Editor'da çalıştırın

-- website_services tablosu
CREATE TABLE IF NOT EXISTS website_services (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- website_team tablosu
CREATE TABLE IF NOT EXISTS website_team (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    photo_url TEXT,
    bio TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- website_gallery tablosu
CREATE TABLE IF NOT EXISTS website_gallery (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    title TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- website_pages tablosu
CREATE TABLE IF NOT EXISTS website_pages (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content TEXT,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) Politikalarını Etkinleştir
ALTER TABLE website_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_pages ENABLE ROW LEVEL SECURITY;

-- website_services için RLS politikaları
CREATE POLICY "Users can view own services" ON website_services
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own services" ON website_services
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own services" ON website_services
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own services" ON website_services
    FOR DELETE USING (auth.uid() = user_id);

-- website_team için RLS politikaları
CREATE POLICY "Users can view own team" ON website_team
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own team" ON website_team
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own team" ON website_team
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own team" ON website_team
    FOR DELETE USING (auth.uid() = user_id);

-- website_gallery için RLS politikaları
CREATE POLICY "Users can view own gallery" ON website_gallery
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own gallery" ON website_gallery
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own gallery" ON website_gallery
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own gallery" ON website_gallery
    FOR DELETE USING (auth.uid() = user_id);

-- website_pages için RLS politikaları
CREATE POLICY "Users can view own pages" ON website_pages
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pages" ON website_pages
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pages" ON website_pages
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pages" ON website_pages
    FOR DELETE USING (auth.uid() = user_id);

-- Başarılı olup olmadığını kontrol et
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('website_services', 'website_team', 'website_gallery', 'website_pages');
