-- Mevcut kısıtlamayı kaldır
ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_status_check;

-- Yeni kısıtlamayı ekle ('waiting' durumunu dahil et)
ALTER TABLE proposals ADD CONSTRAINT proposals_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'negotiating', 'waiting'));
