-- Tüm tablolarda RLS (Satır Düzeyinde Güvenlik) etkinleştir
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- Eğer yoksa is_admin sütununu ekle
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_admin') THEN
        ALTER TABLE public.users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Çakışmaları önlemek için mevcut politikaları temizle
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

DROP POLICY IF EXISTS "Users can manage own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can delete user tasks" ON public.tasks;

DROP POLICY IF EXISTS "Users can manage own employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can delete user employees" ON public.employees;

DROP POLICY IF EXISTS "Users can view own payments" ON public.payment_requests;
DROP POLICY IF EXISTS "Users can create payments" ON public.payment_requests;
DROP POLICY IF EXISTS "Admins can manage payments" ON public.payment_requests;

-- --- POLİTİKALAR ---

-- Admin kontrolü için güvenli fonksiyon (Infinite Recursion Fix)
CREATE OR REPLACE FUNCTION public.get_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- USERS (Kullanıcılar) Tablosu
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.users FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.users FOR SELECT 
USING (public.get_is_admin());

CREATE POLICY "Admins can update all profiles" 
ON public.users FOR UPDATE 
USING (public.get_is_admin());

CREATE POLICY "Admins can delete users" 
ON public.users FOR DELETE 
USING (public.get_is_admin());

-- TASKS (Görevler) Tablosu
CREATE POLICY "Users can manage own tasks" 
ON public.tasks FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete user tasks" 
ON public.tasks FOR DELETE 
USING (public.get_is_admin());

-- EMPLOYEES (Çalışanlar) Tablosu
CREATE POLICY "Users can manage own employees" 
ON public.employees FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete user employees" 
ON public.employees FOR DELETE 
USING (public.get_is_admin());

-- PAYMENT_REQUESTS (Ödeme Talepleri) Tablosu
CREATE POLICY "Users can view own payments" 
ON public.payment_requests FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create payments" 
ON public.payment_requests FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage payments" 
ON public.payment_requests FOR ALL 
USING (public.get_is_admin());

-- is_admin sütununu koruma (Kullanıcıların kendilerini admin yapmasını engelle)
-- RLS UPDATE işlemlerinde sütun bazlı filtreleme yapmadığı için Trigger kullanıyoruz
CREATE OR REPLACE FUNCTION public.prevent_admin_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Eğer kullanıcı is_admin değerini true yapmaya çalışıyorsa
  IF NEW.is_admin = TRUE AND OLD.is_admin = FALSE THEN
    -- İşlemi yapan kişi admin değilse engelle
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE) THEN
        RAISE EXCEPTION 'Sadece yöneticiler kullanıcıları yönetici yapabilir.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_admin_escalation ON public.users;
CREATE TRIGGER check_admin_escalation
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_admin_escalation();

-- İlk kullanıcıyı admin yapma fonksiyonu (Kurulum için)
-- Gerektiğinde manuel çalıştırın: SELECT make_admin('mail-adresiniz@ornek.com');
CREATE OR REPLACE FUNCTION public.make_admin(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
  target_id UUID;
BEGIN
  SELECT id INTO target_id FROM auth.users WHERE email = user_email;
  
  IF target_id IS NOT NULL THEN
    UPDATE public.users SET is_admin = TRUE WHERE id = target_id;
    RETURN 'Kullanıcı ' || user_email || ' artık bir yönetici.';
  ELSE
    RETURN 'Kullanıcı bulunamadı.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
