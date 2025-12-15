-- Website Products Tablo Güncelleme
-- Bu SQL'i Supabase SQL Editor'da çalıştırın

-- website_products tablosuna category sütunu ekle
ALTER TABLE website_products 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Başarılı olup olmadığını kontrol et
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'website_products';
