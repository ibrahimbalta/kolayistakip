-- Public Task Access Functions
-- These functions allow anonymous users (employees) to view and complete tasks
-- without exposing the entire database via RLS.

-- 1. Get Task Details (Public)
CREATE OR REPLACE FUNCTION public.get_task_details_public(p_task_id UUID)
RETURNS TABLE (
    id UUID,
    description TEXT,
    employee_name TEXT,
    completed BOOLEAN,
    company_name TEXT
) 
SECURITY DEFINER -- Runs with privileges of the creator (admin), bypassing RLS
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.description,
        t.employee_name,
        t.completed,
        u.company_name
    FROM public.tasks t
    LEFT JOIN public.users u ON t.user_id = u.id
    WHERE t.id = p_task_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Complete Task (Public)
CREATE OR REPLACE FUNCTION public.complete_task_public(p_task_id UUID)
RETURNS VOID
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.tasks
    SET 
        completed = true,
        completed_at = NOW()
    WHERE id = p_task_id;
END;
$$ LANGUAGE plpgsql;

-- Grant access to anon (public) role
GRANT EXECUTE ON FUNCTION public.get_task_details_public(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.complete_task_public(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_task_details_public(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_task_public(UUID) TO authenticated;
