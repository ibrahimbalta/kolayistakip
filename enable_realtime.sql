-- =====================================================
-- Supabase Realtime Aktivasyonu
-- =====================================================
-- Bu SQL dosyasını Supabase SQL Editor'da çalıştırın
-- Bu, appointment_slots tablosu için realtime güncellemeleri aktif eder

-- Realtime'ı appointment_slots tablosu için etkinleştir
ALTER PUBLICATION supabase_realtime ADD TABLE appointment_slots;

-- Not: Bu komutu çalıştırdıktan sonra realtime güncellemeleri aktif olacaktır.
-- Dashboard'da randevular modülünü açıp beklerken, yeni randevu geldiğinde 
-- otomatik olarak bekleyen onaylar listesine düşecektir.
