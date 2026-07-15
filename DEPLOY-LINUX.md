# PEYZAJDER Linux hosting kurulum planı

Bu uygulama statik site değil, Node.js 20+ ile çalışan bir web uygulamasıdır. Hosting panelinde “Node.js Application”, “Application Manager” veya eşdeğer bir özellik bulunmalıdır.

## 1. Alan adını taşımadan önce

1. Hostingde uygulama kökü olarak ana alan adından ayrı bir klasör oluşturun.
2. Git deposunu bu klasöre alın ve `npm install` çalıştırın.
3. Aşağıdaki ortam değişkenlerini hosting panelinden tanımlayın:

```text
NODE_ENV=production
PEYZAJDER_HOST=0.0.0.0
PEYZAJDER_ADMIN_USER=<yalnızca yöneticinin bildiği kullanıcı adı>
PEYZAJDER_ADMIN_PASSWORD=<uzun ve benzersiz parola>
PEYZAJDER_DATA_DIR=<uygulama dışında yedeklenen kalıcı klasör>/data
PEYZAJDER_UPLOAD_DIR=<uygulama dışında yedeklenen kalıcı klasör>/uploads
```

Ana alan adı için `PEYZAJDER_BASE_PATH` tanımlamayın. Alt klasör denemesinde örneğin `/new_web` değeri kullanılabilir.

## 2. Uygulamayı başlatma

- Başlangıç dosyası: `server.mjs`
- Başlatma komutu: `npm start`
- Uygulamanın yazma izni gereken iki klasörü: `data` ve `uploads`
- Sağlık kontrolü: `https://alan-adiniz/api/health`

Sağlık kontrolü `{"ok":true}` döndürmeden DNS değişikliği yapılmamalıdır.

## 3. Veri ve dosya güvenliği

- `data/cms.json` içerikler, üyeler, aidatlar ve panel kayıtlarını tutar.
- `data/cms.backup.json` otomatik önceki sürüm yedeğidir.
- `uploads/` kullanıcı belgeleri ve yönetim panelinden yüklenen dosyaları tutar.
- Bu iki klasör her gün hosting yedeğine dahil edilmelidir.
- Yeni sürüm yüklerken bu iki klasör silinmemeli veya Git dosyalarıyla ezilmemelidir.

## 4. Alan adı geçişi

1. Geçişten en az bir gün önce `peyzajder.org` DNS TTL değerini 300 saniyeye indirin.
2. Geçici hosting adresinde ana sayfa, içerik detayları, üye kaydı, giriş, admin ve dosya yükleme testlerini tamamlayın.
3. Alan adının A kaydını hosting IP adresine yönlendirin.
4. `peyzajder.org` ve `www.peyzajder.org` için SSL sertifikası oluşturun.
5. `www` adresini tek bir 301 yönlendirmeyle ana adrese yönlendirin; yönlendirme zinciri oluşturmayın.
6. Son olarak `/api/health`, ana sayfa ve yönetim girişi tekrar kontrol edilmelidir.

## 5. Yayın öncesi komutlar

```text
npm run clean:legacy-links
npm test
```

Bu kontroller başarısızsa yayın yapılmamalıdır. Eski siteye ait içerik kaynak adresleri temizlenir; derneğin `@peyzajder.org` e-posta hesapları ve `peyzajder.com` yarışma platformu bağlantıları korunur.
