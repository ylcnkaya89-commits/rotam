# 🏍️ Rotam - Motosiklet ve Araç Gezi Rotası Planlayıcı (Masaüstü & SQLite)

Motosiklet ve sürüş tutkunları için özel olarak tasarlanmış, virajlı ve manzaralı gezi rotası planlayan **yerel macOS Masaüstü Uygulaması (Native Desktop App)** ve **SQLite Veritabanı Mimarisi**.

---

## 🗄️ Veritabanı Yapısı (SQLite - `rotam.db`)

Uygulamanın tüm verileri taşınabilir ve hızlı tek dosya SQLite veritabanında tutulur:
📁 `/Users/yalcin/.gemini/antigravity/scratch/moto-route-planner/rotam.db`

### Tablolar ve Veri Şeması:
1. **`routes` (Kayıtlı Rotalar)**:
   - `id`, `title`, `description`, `mode` (`twisty`, `scenic`, `fastest`)
   - `distance_km`, `duration_seconds`, `curviness_score`, `ascent_meters`, `descent_meters`
   - `waypoints_json` (Başlangıç, duraklar ve varış noktaları koordinat ve isimleri)
   - `geometry_geojson` (Harita rota çizgisi koordinatları)
   - `is_favorite` (Favori bayrağı)
   - `created_at`, `updated_at`

2. **`favorite_places` (Favori Noktalar & Mola Yerleri)**:
   - `id`, `name`, `category` (`viewpoint`, `mountain_pass`, `cafe`, `fuel`, `camp_hotel`)
   - `lat`, `lon`, `description`, `rating` (1-5 yıldız)
   - *(Varsayılan olarak Sakar Geçidi, Kaputaş, Bolu Dağı Zirvesi, Ovit Dağı 2640m vb. yüklü gelir)*

3. **`vehicles` (Garaj / Araç Profilleri)**:
   - `id`, `name`, `type` (`motorcycle` veya `car`)
   - `fuel_consumption` (100 km'de ortalama yakıt tüketimi - Litre)
   - `tank_capacity` (Depo hacmi)
   - *(Varsayılan olarak BMW R1250GS, Yamaha MT-07, Mazda MX-5 kayıtlıdır)*

4. **`trip_logs` (Sürüş Günlüğü)**:
   - `id`, `route_id`, `trip_date`, `actual_distance_km`, `actual_duration_min`, `notes`

---

## 🖥️ Masaüstü Uygulamasını Başlatma

Uygulama Apple'ın yerel **Cocoa + WebKit** mimarisiyle derlenmiş bir macOS `.app` paketidir.

### 1. Terminalden Başlatma
```bash
cd /Users/yalcin/.gemini/antigravity/scratch/moto-route-planner
open Rotam.app
```

### 2. SQLite REST API Sunucusu ile Birlikte Çalıştırma (Önerilen)
Veritabanı API'sini aktif olarak kullanmak için:
```bash
python3 server.py
```
Bu komut hem SQLite REST API'sini (`/api/routes`, `/api/places`, `/api/vehicles`) hem de web arayüzünü canlı tutar.

### 3. Finder Üzerinden
`/Users/yalcin/.gemini/antigravity/scratch/moto-route-planner` klasöründeki **`Rotam.app`** simgesine çift tıklayabilirsiniz.

---

## 🌟 Temel Özellikler
- 🏛️ **Tüm Türkiye Tarihi Yerler & Saklı Antik Kentler Keşfi (140+ Mekan)**:
  - Yalnızca popüler yerler değil; dağ geçitlerinde, kanyonlarda ve vadilerde unutulmuş antik kentler, kaleler, kaya manastırları ve mezarlar (Labranda, Sagalassos, Kibyra, Blaundos, Termessos, Şeytan Kalesi, Uzuncaburç, Midas Anıtı, Çavuştepe, Zerzevan vb.).
  - 7 bölgeye göre filtrelenebilir (Ege, Akdeniz, İç Anadolu, Marmara, Karadeniz, Doğu ve Güneydoğu Anadolu).
  - Canlı harita entegrasyonu (OpenStreetMap & Overpass): Veritabanında olmayan herhangi bir yerel kalıntı veya kale anında taranabilir.
  - Tek tıkla rotaya **Başlangıç**, **Ara Durak** veya **Varış Noktası** olarak eklenebilir.
- 🏍️ **Viraj & Manzara Algoritması**: Otoyollardan kaçınan, virajlı tali ve dağ yollarını önceliklendiren sürüş profilleri.
- 🌀 **Viraj Puanı (1-100)**: Rota geometrisindeki dönüş açılarını km başına analiz ederek viraj yoğunluğu puanı çıkarır.
- ⛰️ **Yükseklik Profili**: Rota boyunca tırmanış/iniş (m) ve tepe noktalarını interaktif canvas grafiğiyle gösterir.
- 💾 **Rotaları Kaydet & Geri Yükle**: Planlanan rotaları başlık ve notlarla SQLite veritabanına kaydeder, tek tıkla haritaya geri çağırır.
- 📥 **GPX İndir**: Calimoto, Garmin, Rever, OsmAnd ve BMW Motorrad cihazlarına tam uyumlu GPX çıktısı.
- 🗺️ **Google Maps Entegrasyonu**: Tüm duraklarla birlikte Google Haritalar navigasyonuna anında aktarır.
- 🌙 **Çoklu Harita Katmanları**: Karanlık Mod, Topografik Harita, Standart Sokak ve Uydu görünümü.
