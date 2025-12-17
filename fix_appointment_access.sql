-- Public Appointment Access Functions
-- These functions allow anonymous users to view available slots and book appointments

-- 1. Get Available Slots by Token (Public)
CREATE OR REPLACE FUNCTION public.get_calendar_slots_public(p_token UUID)
RETURNS TABLE (
    calendar_id UUID,
    slot_id UUID,
    slot_date DATE,
    slot_time TIME,
    status TEXT
) 
SECURITY DEFINER
AS $$
DECLARE
    v_calendar_id UUID;
BEGIN
    -- Get calendar ID from token
    SELECT id INTO v_calendar_id
    FROM public.appointment_calendars
    WHERE share_token = p_token AND is_active = true;

    IF v_calendar_id IS NULL THEN
        RETURN;
    END IF;

    -- Return available slots
    RETURN QUERY
    SELECT 
        s.calendar_id,
        s.id as slot_id,
        s.slot_date,
        s.slot_time,
        s.status
    FROM public.appointment_slots s
    WHERE s.calendar_id = v_calendar_id
    AND s.status = 'available'
    AND s.slot_date >= CURRENT_DATE
    ORDER BY s.slot_date ASC, s.slot_time ASC;
END;
$$ LANGUAGE plpgsql;

-- 2. Book Appointment (Public)
CREATE OR REPLACE FUNCTION public.book_appointment_public(
    p_slot_id UUID,
    p_name TEXT,
    p_phone TEXT,
    p_notes TEXT
)
RETURNS VOID
SECURITY DEFINER
AS $$
DECLARE
    v_current_status TEXT;
BEGIN
    -- Check if slot is still available
    SELECT status INTO v_current_status
    FROM public.appointment_slots
    WHERE id = p_slot_id;

    IF v_current_status != 'available' THEN
        RAISE EXCEPTION 'Bu randevu saati artık müsait değil.';
    END IF;

    -- Update slot
    UPDATE public.appointment_slots
    SET 
        status = 'reserved',
        customer_name = p_name,
        customer_phone = p_phone,
        customer_notes = p_notes,
        reserved_at = NOW(),
        approval_status = 'pending'
    WHERE id = p_slot_id;
END;
$$ LANGUAGE plpgsql;

-- Grant access to anon (public) role
GRANT EXECUTE ON FUNCTION public.get_calendar_slots_public(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.book_appointment_public(UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_calendar_slots_public(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.book_appointment_public(UUID, TEXT, TEXT, TEXT) TO authenticated;
