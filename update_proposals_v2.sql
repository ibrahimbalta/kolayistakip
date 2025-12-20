-- proposals tablosuna yeni özellikler için gerekli sütunları ekleme
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id),
ADD COLUMN IF NOT EXISTS valid_until date;

-- Not: Eğer tablo kısıtlamaları (RLS vb.) zaten varsa, bu komut sadece eksik sütünları güvenli bir şekilde ekleyecektir.
