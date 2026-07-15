# PEYZAJDER New Web

Node.js 20+ üzerinde çalışan PEYZAJDER web sitesi, içerik yönetimi ve üye paneli.

## Yerel çalıştırma

```text
npm start
```

Varsayılan adres `http://127.0.0.1:4173` olur. Canlı ortamda yönetici kullanıcı adı ve şifresi mutlaka ortam değişkenleriyle tanımlanmalıdır.

## Linux hosting

- Uygulama başlangıç dosyası: `server.mjs`
- Başlatma komutu: `npm start`
- Node.js sürümü: 20 veya üzeri
- Sağlık kontrolü: `/api/health`
- Kalıcı veri dizini: `PEYZAJDER_DATA_DIR`
- Kalıcı yükleme dizini: `PEYZAJDER_UPLOAD_DIR`
- Ana alan adında çalıştırırken `PEYZAJDER_BASE_PATH` boş bırakılır.

Ayrıntılı kurulum ve alan adı geçiş sırası için `DEPLOY-LINUX.md` dosyasını izleyin.

## Güvence kontrolleri

```text
npm test
npm run clean:legacy-links
```

Testler UTF-8/Türkçe karakterleri, eski `peyzajder.org` kaynak yönlendirmelerini, API’yi, veri kalıcılığını ve temel üyelik akışlarını denetler. Görsel yükleme alanları WebP kabul edecek şekilde kurgulanmıştır.
