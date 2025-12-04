-- Deneme Süresi Sistemi - Mevcut Verileri Koruyarak Güncelleme
-- 7 gün deneme süresi

-- 1. Yeni sütunları ekle (eğer yoksa)
DO $$ 
BEGIN 
    -- trial_start_date sütunu
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'trial_start_date') THEN
        ALTER TABLE public.users ADD COLUMN trial_start_date TIMESTAMP DEFAULT NOW();
        -- Mevcut kullanıcılar için kayıt tarihini kullan
        UPDATE public.users SET trial_start_date = created_at WHERE trial_start_date IS NULL;
    END IF;

    -- trial_end_date sütunu (7 gün)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'trial_end_date') THEN
        ALTER TABLE public.users ADD COLUMN trial_end_date TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days');
        -- Mevcut kullanıcılar için 7 gün ekle
        UPDATE public.users SET trial_end_date = created_at + INTERVAL '7 days' WHERE trial_end_date IS NULL;
    END IF;

    -- subscription_status sütunu
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'subscription_status') THEN
        ALTER TABLE public.users ADD COLUMN subscription_status TEXT DEFAULT 'trial';
        -- Mevcut kullanıcıları trial olarak işaretle
        UPDATE public.users SET subscription_status = 'trial' WHERE subscription_status IS NULL;
    END IF;

    -- subscription_plan sütunu
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'subscription_plan') THEN
        ALTER TABLE public.users ADD COLUMN subscription_plan TEXT DEFAULT 'free';
    END IF;

    -- subscription_end_date sütunu
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'subscription_end_date') THEN
        ALTER TABLE public.users ADD COLUMN subscription_end_date TIMESTAMP;
    END IF;
END $$;

-- 2. Ödeme onaylandığında aboneliği aktif etme fonksiyonu
CREATE OR REPLACE FUNCTION activate_subscription(user_id_param UUID, plan_type TEXT, months INTEGER)
RETURNS TEXT AS $$
DECLARE
    end_date TIMESTAMP;
BEGIN
    -- Bitiş tarihini hesapla
    end_date := NOW() + (months || ' months')::INTERVAL;
    
    -- Kullanıcı aboneliğini güncelle (hem yeni hem eski sistem için)
    UPDATE public.users 
    SET 
        subscription_status = 'active',
        subscription_plan = plan_type,
        subscription_end_date = end_date,
        is_premium = true  -- Eski sistem ile uyumluluk için
    WHERE id = user_id_param;
    
    RETURN 'Abonelik aktif edildi. Bitiş tarihi: ' || end_date::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kullanım örneği:
-- SELECT activate_subscription('user-uuid-buraya', 'monthly', 1);  -- Aylık için
-- SELECT activate_subscription('user-uuid-buraya', 'yearly', 12);  -- Yıllık için

COMMENT ON FUNCTION activate_subscription IS 'Ödeme onaylandığında kullanıcı aboneliğini aktif eder';
