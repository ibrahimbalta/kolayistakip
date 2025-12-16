-- ===================================================
-- Website Tablolarının RLS (Row Level Security) Politikaları
-- ===================================================
-- Bu dosyayı Supabase SQL Editor'de çalıştırın

-- 1. Website Settings
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own website settings" ON public.website_settings;
DROP POLICY IF EXISTS "Public can view published websites" ON public.website_settings;

CREATE POLICY "Users can manage own website settings"
ON public.website_settings FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Public can view published websites"
ON public.website_settings FOR SELECT
USING (is_published = true);

-- 2. Website Products
ALTER TABLE public.website_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own products" ON public.website_products;
DROP POLICY IF EXISTS "Public can view active products" ON public.website_products;

CREATE POLICY "Users can manage own products"
ON public.website_products FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Public can view active products"
ON public.website_products FOR SELECT
USING (is_active = true);

-- 3. Website Services
ALTER TABLE public.website_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own services" ON public.website_services;
DROP POLICY IF EXISTS "Public can view active services" ON public.website_services;

CREATE POLICY "Users can manage own services"
ON public.website_services FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Public can view active services"
ON public.website_services FOR SELECT
USING (is_active = true);

-- 4. Website Team
ALTER TABLE public.website_team ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own team" ON public.website_team;
DROP POLICY IF EXISTS "Public can view team members" ON public.website_team;

CREATE POLICY "Users can manage own team"
ON public.website_team FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Public can view team members"
ON public.website_team FOR SELECT
USING (true);

-- 5. Website Gallery
ALTER TABLE public.website_gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own gallery" ON public.website_gallery;
DROP POLICY IF EXISTS "Public can view gallery" ON public.website_gallery;

CREATE POLICY "Users can manage own gallery"
ON public.website_gallery FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Public can view gallery"
ON public.website_gallery FOR SELECT
USING (true);

-- 6. Website Pages
ALTER TABLE public.website_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own pages" ON public.website_pages;
DROP POLICY IF EXISTS "Public can view published pages" ON public.website_pages;

CREATE POLICY "Users can manage own pages"
ON public.website_pages FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Public can view published pages"
ON public.website_pages FOR SELECT
USING (is_published = true);

-- 7. Website Messages
ALTER TABLE public.website_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own messages" ON public.website_messages;
DROP POLICY IF EXISTS "Public can send messages" ON public.website_messages;

CREATE POLICY "Users can view own messages"
ON public.website_messages FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own messages"
ON public.website_messages FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
ON public.website_messages FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Public can send messages"
ON public.website_messages FOR INSERT
WITH CHECK (true);

-- ===================================================
-- Audit Log Tablosu (Opsiyonel - Güvenlik İzleme)
-- ===================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Sadece adminler audit log görebilir
CREATE POLICY "Admins can view audit logs"
ON audit_logs FOR SELECT
USING (public.get_is_admin());

-- ===================================================
-- Güvenlik Fonksiyonları
-- ===================================================

-- Rate limiting için son giriş zamanını kontrol eden fonksiyon
CREATE OR REPLACE FUNCTION check_login_attempts(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    attempt_count INTEGER;
BEGIN
    -- Son 15 dakikadaki başarısız giriş denemelerini say
    SELECT COUNT(*) INTO attempt_count
    FROM audit_logs
    WHERE action = 'failed_login'
    AND new_data->>'email' = user_email
    AND created_at > NOW() - INTERVAL '15 minutes';
    
    -- 5'ten fazla başarısız deneme varsa false döndür
    RETURN attempt_count < 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Güvenlik başarıyla yapılandırıldı mesajı
DO $$
BEGIN
    RAISE NOTICE 'Website RLS politikaları başarıyla oluşturuldu!';
END $$;
