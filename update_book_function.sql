-- =====================================================
-- Sadece book_appointment_public Fonksiyonunu Güncelle
-- =====================================================
-- Bu SQL'i Supabase SQL Editor'da çalıştırın
-- Bu fonksiyon rezervasyon yapıldığında approval_status = 'pending' ayarlar

-- Önce mevcut fonksiyonu sil
DROP FUNCTION IF EXISTS public.book_appointment_public(UUID, TEXT, TEXT, TEXT);

-- Yeni fonksiyonu oluştur (approval_status eklendi)
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
    v_slot appointment_slots%ROWTYPE;
BEGIN
    -- Slot'u kilitle ve al
    SELECT * INTO v_slot 
    FROM appointment_slots 
    WHERE id = p_slot_id 
    FOR UPDATE;
    
    -- Slot var mı kontrol et
    IF v_slot.id IS NULL THEN
        RAISE EXCEPTION 'Slot bulunamadı';
    END IF;
    
    -- Kapasite kontrolü (toplu randevu için)
    IF v_slot.capacity IS NOT NULL THEN
        -- Kapasiteli slot
        IF v_slot.current_bookings >= v_slot.capacity THEN
            RAISE EXCEPTION 'Bu slot dolu';
        END IF;
        
        -- Rezervasyonu ekle
        UPDATE appointment_slots 
        SET 
            current_bookings = current_bookings + 1,
            status = CASE WHEN current_bookings + 1 >= capacity THEN 'reserved' ELSE status END,
            customer_name = COALESCE(customer_name || ', ', '') || p_name,
            customer_phone = COALESCE(customer_phone || ', ', '') || p_phone,
            customer_notes = COALESCE(customer_notes || ' | ', '') || COALESCE(p_notes, ''),
            approval_status = 'pending'
        WHERE id = p_slot_id;
    ELSE
        -- Normal tek kişilik slot
        IF v_slot.status = 'reserved' THEN
            RAISE EXCEPTION 'Bu saat dolu';
        END IF;
        
        UPDATE appointment_slots 
        SET 
            status = 'reserved',
            customer_name = p_name,
            customer_phone = p_phone,
            customer_notes = p_notes,
            approval_status = 'pending'
        WHERE id = p_slot_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Yetkileri ver
GRANT EXECUTE ON FUNCTION public.book_appointment_public(UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.book_appointment_public(UUID, TEXT, TEXT, TEXT) TO authenticated;
