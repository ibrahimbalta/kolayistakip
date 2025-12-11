-- Migration: Update get_task_details_public function to include deadline
-- This script drops the existing function and recreates it with the new deadline field

-- First, drop the existing function
DROP FUNCTION IF EXISTS public.get_task_details_public(UUID);

-- Recreate the function with deadline field
CREATE OR REPLACE FUNCTION public.get_task_details_public(p_task_id UUID)
RETURNS TABLE (
    id UUID,
    description TEXT,
    employee_name TEXT,
    completed BOOLEAN,
    company_name TEXT,
    deadline DATE
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.description,
        t.employee_name,
        t.completed,
        u.company_name,
        t.deadline
    FROM public.tasks t
    LEFT JOIN public.users u ON t.user_id = u.id
    WHERE t.id = p_task_id;
END;
$$ LANGUAGE plpgsql;

-- Grant access to anon (public) role
GRANT EXECUTE ON FUNCTION public.get_task_details_public(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_task_details_public(UUID) TO authenticated;
