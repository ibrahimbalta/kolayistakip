-- =============================================
-- Department Management System Schema
-- =============================================
-- Created: 2025-12-01
-- Purpose: Add department management and manager assignment features

-- 1. Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, name) -- Prevent duplicate department names per user
);

-- 2. Add columns to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_manager BOOLEAN DEFAULT FALSE;

-- 3. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(is_manager) WHERE is_manager = TRUE;
CREATE INDEX IF NOT EXISTS idx_departments_user ON departments(user_id);

-- 4. Row Level Security (RLS) Policies for departments
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own departments
CREATE POLICY "Users can view own departments"
    ON departments FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own departments
CREATE POLICY "Users can insert own departments"
    ON departments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own departments
CREATE POLICY "Users can update own departments"
    ON departments FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own departments
CREATE POLICY "Users can delete own departments"
    ON departments FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Comments for documentation
COMMENT ON TABLE departments IS 'Stores department information for each user';
COMMENT ON COLUMN departments.user_id IS 'Reference to the user who owns this department';
COMMENT ON COLUMN departments.name IS 'Department name (unique per user)';
COMMENT ON COLUMN departments.description IS 'Optional department description';
COMMENT ON COLUMN employees.department_id IS 'Reference to department (optional)';
COMMENT ON COLUMN employees.is_manager IS 'Whether this employee is a manager';
