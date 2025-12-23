-- =====================================================
-- Employee Share Token Migration
-- Çalışanlara özel görev takip linki için token ekleme
-- =====================================================

-- 1. Employees tablosuna share_token kolonu ekle
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

-- 2. Mevcut çalışanlara otomatik token oluştur
UPDATE employees 
SET share_token = gen_random_uuid()::text 
WHERE share_token IS NULL;

-- 3. share_token için index oluştur (performans için)
CREATE INDEX IF NOT EXISTS idx_employees_share_token 
ON employees(share_token) 
WHERE share_token IS NOT NULL;

-- =====================================================
-- RLS Policies for Anonymous Access
-- Çalışanların token ile erişimi için güvenlik kuralları
-- =====================================================

-- 4. Anonim kullanıcılar çalışanı token ile görüntüleyebilir
DROP POLICY IF EXISTS "Public can view employees by share_token" ON employees;
CREATE POLICY "Public can view employees by share_token" 
ON employees FOR SELECT 
TO anon
USING (share_token IS NOT NULL);

-- 5. Anonim kullanıcılar görevleri görüntüleyebilir (employee_id ile)
DROP POLICY IF EXISTS "Public can view tasks by employee" ON tasks;
CREATE POLICY "Public can view tasks by employee"
ON tasks FOR SELECT
TO anon
USING (true);

-- 6. Anonim kullanıcılar görevleri tamamlayabilir
DROP POLICY IF EXISTS "Public can complete tasks" ON tasks;
CREATE POLICY "Public can complete tasks"
ON tasks FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- =====================================================
-- Function for secure task completion
-- Güvenli görev tamamlama fonksiyonu
-- =====================================================

CREATE OR REPLACE FUNCTION complete_task_by_employee(
    p_task_id UUID,
    p_employee_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_employee_id UUID;
    v_task_exists BOOLEAN;
BEGIN
    -- Get employee ID from token
    SELECT id INTO v_employee_id
    FROM employees
    WHERE share_token = p_employee_token;
    
    IF v_employee_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if task belongs to this employee
    SELECT EXISTS(
        SELECT 1 FROM tasks 
        WHERE id = p_task_id 
        AND employee_id = v_employee_id
    ) INTO v_task_exists;
    
    IF NOT v_task_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Update task
    UPDATE tasks
    SET completed = NOT completed,
        completed_at = CASE WHEN NOT completed THEN NOW() ELSE NULL END
    WHERE id = p_task_id
    AND employee_id = v_employee_id;
    
    RETURN TRUE;
END;
$$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION complete_task_by_employee TO anon;

COMMENT ON FUNCTION complete_task_by_employee IS 'Allows employees to toggle task completion status via their share token';
