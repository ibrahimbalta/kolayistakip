-- Infinite Recursion Fix Script
-- Bu scripti Supabase SQL Editöründe çalıştırın

-- 1. Admin kontrolü için güvenli bir fonksiyon oluştur
-- SECURITY DEFINER: Bu fonksiyonu çağıranın yetkileriyle değil, fonksiyonu oluşturanın (admin) yetkileriyle çalışır.
-- Bu sayede RLS politikalarına takılmadan admin kontrolü yapılabilir.
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

-- 2. Mevcut problemli politikaları kaldır
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

DROP POLICY IF EXISTS "Admins can delete user tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can delete user employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can manage payments" ON public.payment_requests;

-- 3. Fonksiyonu kullanan yeni politikaları oluştur

-- USERS
CREATE POLICY "Admins can view all profiles" 
ON public.users FOR SELECT 
USING (public.get_is_admin());

CREATE POLICY "Admins can update all profiles" 
ON public.users FOR UPDATE 
USING (public.get_is_admin());

CREATE POLICY "Admins can delete users" 
ON public.users FOR DELETE 
USING (public.get_is_admin());

-- TASKS
CREATE POLICY "Admins can delete user tasks" 
ON public.tasks FOR DELETE 
USING (public.get_is_admin());

-- EMPLOYEES
CREATE POLICY "Admins can delete user employees" 
ON public.employees FOR DELETE 
USING (public.get_is_admin());

-- PAYMENT_REQUESTS
CREATE POLICY "Admins can manage payments" 
ON public.payment_requests FOR ALL 
USING (public.get_is_admin());
