# Teklif Yönetimi Özelliği

Yeni "Teklifler" modülü başarıyla eklendi. Bu özellik sayesinde müşterilerinize hızlıca teklif oluşturabilir, WhatsApp üzerinden paylaşabilir ve durumlarını takip edebilirsiniz.

## 1. Kurulum (ÖNEMLİ)

Bu özelliğin çalışması için veritabanında yeni bir tablo oluşturulması gerekmektedir.

1.  Supabase panelinize gidin.
2.  **SQL Editor** bölümünü açın.
3.  Proje ana dizinindeki `proposals_schema.sql` dosyasının içeriğini kopyalayın.
4.  SQL Editörüne yapıştırın ve **RUN** butonuna basarak çalıştırın.

## 2. Özellikler

### Firma Paneli (Dashboard)
- **Teklif Oluşturma:** Müşteri adı, telefon, başlık, tutar ve detayları girerek teklif oluşturabilirsiniz.
- **Listeleme:** Oluşturulan tüm teklifleri ve durumlarını (Bekliyor, Onaylandı, Reddedildi vb.) görebilirsiniz.
- **WhatsApp Paylaşımı:** Teklifin yanındaki WhatsApp ikonuna tıklayarak müşterinize otomatik olarak teklif linkini gönderebilirsiniz.
- **Link Kopyalama:** Teklif linkini kopyalayarak SMS veya e-posta ile de gönderebilirsiniz.

### Müşteri Ekranı (Teklif Linki)
- Müşteri linke tıkladığında özel bir teklif sayfası görür.
- Teklif detaylarını ve tutarını inceler.
- **Onaylıyorum / Reddediyorum** butonları ile yanıt verebilir.
- **Teklif Yüksek / Daha Uygun Bekliyorum** seçenekleri ile geri bildirimde bulunabilir.
- Müşterinin verdiği yanıt anında panelinizde güncellenir (sayfayı yenilediğinizde).

## 3. Dosyalar

- `proposals_schema.sql`: Veritabanı tablosu için SQL kodu.
- `teklif.html`: Müşterinin göreceği teklif sayfası.
- `proposals.js`: Teklif yönetimi için JavaScript kodları.
- `dashboard.html`: Arayüz güncellemeleri.
- `app.js`: Yönlendirme mantığı güncellemeleri.
