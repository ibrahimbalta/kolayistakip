-- =====================================================
-- Randevu Onay/Red ve Kapasite Sistemi
-- =====================================================
-- Bu SQL dosyasını Supabase SQL Editor'da çalıştırın

-- 1. Onay durumu sütunu (pending/approved/rejected)
ALTER TABLE appointment_slots 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending';

-- 2. Kapasite sütunu (opsiyonel - null ise tek kişilik slot)
ALTER TABLE appointment_slots 
ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT NULL;

-- 3. Mevcut rezervasyon sayısı
ALTER TABLE appointment_slots 
ADD COLUMN IF NOT EXISTS current_bookings INTEGER DEFAULT 0;

-- 4. Red sebebi
ALTER TABLE appointment_slots 
ADD COLUMN IF NOT EXISTS rejected_reason TEXT DEFAULT NULL;

-- 5. Onay/red tarihi
ALTER TABLE appointment_slots 
ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP DEFAULT NULL;

-- Mevcut rezerve edilmiş slotları "approved" olarak güncelle (geriye dönük uyumluluk)
UPDATE appointment_slots 
SET approval_status = 'approved' 
WHERE status = 'reserved' AND approval_status IS NULL;

-- ÖNCEKİ FONKSİYONLARI SİL (return type değiştiği için gerekli)
DROP FUNCTION IF EXISTS book_appointment_public(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_calendar_slots_public(UUID);

-- Public booking fonksiyonunu güncelle (kapasite desteği ile)
CREATE OR REPLACE FUNCTION book_appointment_public(
    p_slot_id UUID,
    p_name TEXT,
    p_phone TEXT,
    p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
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
    
    -- Kapasite kontrolü
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public slots view'ını güncelle (kapasite bilgisi ile)
CREATE OR REPLACE FUNCTION get_calendar_slots_public(p_token UUID)
RETURNS TABLE (
    slot_id UUID,
    slot_date DATE,
    slot_time TIME,
    duration_minutes INTEGER,
    status VARCHAR,
    capacity INTEGER,
    current_bookings INTEGER,
    available_spots INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as slot_id,
        s.slot_date,
        s.slot_time,
        s.duration_minutes,
        s.status,
        s.capacity,
        s.current_bookings,
        CASE 
            WHEN s.capacity IS NULL THEN 
                CASE WHEN s.status = 'available' THEN 1 ELSE 0 END
            ELSE 
                s.capacity - s.current_bookings
        END as available_spots
    FROM appointment_slots s
    JOIN appointment_calendars c ON s.calendar_id = c.id
    WHERE c.share_token = p_token
    AND c.is_active = true
    AND s.slot_date >= CURRENT_DATE
    ORDER BY s.slot_date, s.slot_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
