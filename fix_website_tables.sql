-- Supabase Tablo Doğrulama ve Düzeltme
-- Bu SQL'i Supabase SQL Editor'da çalıştırın

-- 1. Önce mevcut tabloları kontrol et
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'website%';

-- 2. website_services tablosunun kolonlarını kontrol et
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'website_services';

-- 3. Eğer tablo yoksa veya yanlışsa, önce sil ve yeniden oluştur
DROP TABLE IF EXISTS website_services CASCADE;
DROP TABLE IF EXISTS website_team CASCADE;
DROP TABLE IF EXISTS website_gallery CASCADE;
DROP TABLE IF EXISTS website_pages CASCADE;

-- 4. Tabloları yeniden oluştur
CREATE TABLE website_services (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE website_team (
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

CREATE TABLE website_gallery (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    title TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE website_pages (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content TEXT,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RLS Politikalarını Etkinleştir
ALTER TABLE website_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_pages ENABLE ROW LEVEL SECURITY;

-- 6. RLS Politikalarını ekle (website_services)
CREATE POLICY "website_services_select" ON website_services FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "website_services_insert" ON website_services FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "website_services_update" ON website_services FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "website_services_delete" ON website_services FOR DELETE USING (auth.uid() = user_id);

-- 7. RLS Politikalarını ekle (website_team)
CREATE POLICY "website_team_select" ON website_team FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "website_team_insert" ON website_team FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "website_team_update" ON website_team FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "website_team_delete" ON website_team FOR DELETE USING (auth.uid() = user_id);

-- 8. RLS Politikalarını ekle (website_gallery)
CREATE POLICY "website_gallery_select" ON website_gallery FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "website_gallery_insert" ON website_gallery FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "website_gallery_update" ON website_gallery FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "website_gallery_delete" ON website_gallery FOR DELETE USING (auth.uid() = user_id);

-- 9. RLS Politikalarını ekle (website_pages)
CREATE POLICY "website_pages_select" ON website_pages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "website_pages_insert" ON website_pages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "website_pages_update" ON website_pages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "website_pages_delete" ON website_pages FOR DELETE USING (auth.uid() = user_id);

-- 10. Son kontrol - tüm tabloları ve kolonları göster
SELECT 
    t.table_name,
    array_agg(c.column_name ORDER BY c.ordinal_position) as columns
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
AND t.table_name IN ('website_services', 'website_team', 'website_gallery', 'website_pages')
GROUP BY t.table_name;
