#!/usr/bin/env python3
"""
Rotam - SQLite Veritabanı Yöneticisi
Motosiklet ve Araç Rotaları, Favori Noktalar, Araç Profilleri ve Sürüş Günlüğü
"""
import sqlite3
import json
import os
from datetime import datetime

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rotam.db")

class Database:
    def __init__(self, db_path=DB_FILE):
        self.db_path = db_path
        self.init_db()

    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def init_db(self):
        """Veritabanı tablolarını ve indekslerini oluşturur."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # 1. Rotalar Tablosu
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS routes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                mode TEXT DEFAULT 'twisty',
                distance_km REAL DEFAULT 0.0,
                duration_seconds INTEGER DEFAULT 0,
                curviness_score INTEGER DEFAULT 0,
                ascent_meters INTEGER DEFAULT 0,
                descent_meters INTEGER DEFAULT 0,
                waypoints_json TEXT NOT NULL,
                geometry_geojson TEXT,
                is_favorite INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)

            # 2. Favori Noktalar & Mola Yerleri Tablosu
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS favorite_places (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL, -- 'viewpoint', 'mountain_pass', 'fuel', 'cafe', 'camp_hotel', 'mechanic'
                lat REAL NOT NULL,
                lon REAL NOT NULL,
                description TEXT,
                rating INTEGER DEFAULT 5,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)

            # 3. Araç Profilleri (Garaj) Tablosu
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS vehicles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT DEFAULT 'motorcycle', -- 'motorcycle', 'car'
                fuel_consumption REAL DEFAULT 5.0, -- L / 100km
                tank_capacity REAL DEFAULT 16.0,   -- Litre
                is_default INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)

            # 4. Sürüş Günlüğü (Tamamlanan Geziler) Tablosu
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS trip_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                route_id INTEGER,
                trip_date TEXT DEFAULT (DATE('now')),
                actual_distance_km REAL,
                actual_duration_min INTEGER,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL
            );
            """)

            # İndeksler
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_routes_favorite ON routes(is_favorite);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_places_category ON favorite_places(category);")

            conn.commit()

        # Varsayılan başlangıç verilerini kontrol et ve ekle
        self.seed_initial_data()

    def seed_initial_data(self):
        """Varsayılan mola noktalarını ve araçları yükler."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Araç kontrolü
            cursor.execute("SELECT COUNT(*) as cnt FROM vehicles;")
            if cursor.fetchone()['cnt'] == 0:
                vehicles = [
                    ('BMW R 1250 GS (Macera Motoru)', 'motorcycle', 4.9, 20.0, 1),
                    ('Yamaha MT-07 (Naked Motor)', 'motorcycle', 4.3, 14.0, 0),
                    ('Mazda MX-5 Miata (Spor Gezi)', 'car', 6.9, 45.0, 0)
                ]
                cursor.executemany("""
                    INSERT INTO vehicles (name, type, fuel_consumption, tank_capacity, is_default)
                    VALUES (?, ?, ?, ?, ?);
                """, vehicles)

            # Favori mola yerleri ve Kapsamlı Türkiye Tarihi Yerleri
            cursor.execute("SELECT COUNT(*) as cnt FROM favorite_places;")
            if cursor.fetchone()['cnt'] < 500:
                places_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "places_data.js")
                if os.path.exists(places_file):
                    try:
                        with open(places_file, 'r', encoding='utf-8') as pf:
                            p_text = pf.read()
                        s_idx = p_text.find('[')
                        e_idx = p_text.rfind(']') + 1
                        loaded_places = json.loads(p_text[s_idx:e_idx])
                        for lp in loaded_places:
                            cursor.execute('''
                                INSERT OR IGNORE INTO favorite_places (name, category, lat, lon, description, rating)
                                VALUES (?, ?, ?, ?, ?, ?);
                            ''', (lp['name'], lp['category'], lp['lat'], lp['lon'], lp.get('description', ''), lp.get('rating', 5)))
                        conn.commit()
                    except Exception as pe:
                        sys.stderr.write(f"Error loading places_data.js: {pe}\n")
                places = [
                    # --- VİRAJLI GEÇİTLER & MANZARA NOKTALARI ---
                    ('Sakar Geçidi Seyir Terası', 'viewpoint', 37.0678, 28.3412, 'Muğla Akyaka; Gökova Körfezi manzarası, gün batımı için efsane motorcu durağı.', 5),
                    ('Kaputaş Kanyonu & Seyir Noktası', 'viewpoint', 36.2287, 29.4491, 'Kaş-Kalkan; Turkuaz deniz ve uçurum virajlarının kesişimindeki fotoğraf noktası.', 5),
                    ('Bolu Dağı Eski Geçit Zirvesi', 'mountain_pass', 40.7421, 31.4285, 'Düzce-Bolu; Tarihi virajlar, sisli çam ormanları ve motorcu dinlenme tesisleri.', 5),
                    ('Ovit Dağı Zirve Geçidi (2640m)', 'mountain_pass', 40.6315, 40.7891, 'Rize-İspir; Türkiye\'nin en yüksek rakımlı ve en heyecanlı viraj geçitlerinden biri.', 5),
                    ('Akyaka Azmak Kıyısı Mola Yeri', 'cafe', 37.0545, 28.3242, 'Muğla; Soğuk su nehir kenarında çay & kahve molası.', 5),

                    # --- EGE BÖLGESİ (KARİA, İYONYA, LİKYA, LİDYA) ---
                    ('Efes Antik Kenti & Celsus Kütüphanesi', 'historic', 37.9392, 27.3409, 'İzmir Selçuk; Dünyanın en iyi korunmuş Roma metropollerinden biri.', 5),
                    ('Bergama Akropolü & Dik Tiyatro', 'historic', 39.1325, 27.1842, 'İzmir Bergama; Helenistik dönemin en dik yamaç tiyatrosu ve kütüphanesi.', 5),
                    ('Assos Athena Tapınağı & Behramkale', 'historic', 39.4912, 26.3364, 'Çanakkale Ayvacık; Ege Denizi ve Midilli manzaralı antik tapınak ve taş köy.', 5),
                    ('Hierapolis Antik Kenti & Travertenler', 'historic', 37.9259, 29.1238, 'Denizli Pamukkale; Beyaz travertenler, Kleopatra havuzu ve antik tiyatro.', 5),
                    ('Afrodisias Antik Kenti & Devasa Stadyum', 'historic', 37.7089, 28.7239, 'Aydın Karacasu; UNESCO korumasındaki heykeltıraşlık okulu ve 30.000 kişilik stadyum.', 5),
                    ('Knidos Antik Kenti & Deveboynu Feneri', 'historic', 36.6858, 27.3742, 'Muğla Datça; Ege ile Akdeniz\'in birleştiği en uç noktada gün batımı ve antik liman.', 5),
                    ('Labranda Dağ Kutsal Alanı', 'historic', 37.4189, 27.8189, 'Muğla Milas; Çam ormanları içinde 700m rakımlı Zeus Labraundos tapınak terasları.', 5),
                    ('Herakleia & Latmos Kaya Resimleri', 'historic', 37.5028, 27.5256, 'Muğla Kapıkırı; Bafa Gölü kıyısında granit kayalar arasına gizlenmiş antik kent.', 5),
                    ('Stratonikeia Gladyatörler Kenti', 'historic', 37.3139, 28.0642, 'Muğla Yatağan; Dünyanın en büyük mermer kentlerinden, antik ve Osmanlı iç içe.', 5),
                    ('Lagina Hekate Kutsal Alanı', 'historic', 37.3789, 28.0417, 'Muğla Yatağan; Antik çağın ay ve kehanet tanrıçası Hekate adına yapılan en büyük tapınak.', 5),
                    ('Alinda Antik Kenti & Kraliçe Ada Kalesi', 'historic', 37.5606, 27.8286, 'Aydın Karpuzlu; Devasa agora duvarları ve Büyük İskender ile Kraliçe Ada\'nın buluşma yeri.', 5),
                    ('Nysa Antik Kenti & Kütüphanesi', 'historic', 37.9014, 28.1481, 'Aydın Sultanhisar; Bir kanyonun iki yakasına kurulmuş amfi ve antik kütüphane.', 5),
                    ('Priene Helenistik Şehri', 'historic', 37.6594, 27.2972, 'Aydın Söke Güllübahçe; Samsun Dağları eteğinde ızgara planlı rüzgarlı kent.', 5),
                    ('Milet Antik Kenti & Faustina Hamamı', 'historic', 37.5303, 27.2781, 'Aydın Didim yolu; Felsefenin doğduğu liman kenti ve görkemli Roma tiyatrosu.', 5),
                    ('Didyma Apollon Kehanet Tapınağı', 'historic', 37.3847, 27.2567, 'Aydın Didim; Antik dünyanın en büyük kehanet merkezlerinden devasa sütunlar.', 5),
                    ('Sardes Lidya Başkenti & Artemis Tapınağı', 'historic', 38.4883, 28.0403, 'Manisa Salihli; Paranın ilk basıldığı yer, altın nehir Paktolos ve sinagog.', 5),
                    ('Aizanoi Antik Kenti & Zeus Tapınağı', 'historic', 39.2017, 29.6108, 'Kütahya Çavdarhisar; Dünyanın ilk ticaret borsası ve en sağlam kalmış Zeus tapınağı.', 5),
                    ('Blaundos Kanyon Antik Kenti', 'historic', 38.3589, 29.2181, 'Uşak Ulubey Kanyonu; Üç tarafı derin kanyonla çevrili rüzgarlı yarımada kenti.', 5),
                    ('Clandras Tarihi Su Kemeri', 'historic', 38.3756, 29.4897, 'Uşak Karahallı; Frigya döneminden kalma kanyon üzerindeki görkemli taş kemer.', 5),
                    ('Kaunos Antik Kenti & Dalyan Kaya Mezarları', 'historic', 36.8267, 28.6225, 'Muğla Ortaca; Dalyan deltası sazlıkları ve dağa oyulmuş kral mezarları.', 5),
                    ('Tlos Antik Kenti & Kronos Tapınağı', 'historic', 36.5539, 29.3533, 'Muğla Seydikemer; Likya\'nın spor kenti, kaya akropolü ve kanatlı at Pegasus efsanesi.', 5),
                    ('Pinara Antik Kenti & Arı Kovanı Mezarları', 'historic', 36.4889, 29.2611, 'Muğla Fethiye Babadağ etekleri; Dikey kayalara oyulmuş yüzlerce petek mezar.', 5),
                    ('Erythrai Antik Kenti', 'historic', 38.3828, 26.4789, 'İzmir Çeşme Ildırı; Sakin balıkçı köyü virajlarında antik akropol ve adalar manzarası.', 5),
                    ('Klazomenai Zeytinyağı İşliği', 'historic', 38.3619, 26.7725, 'İzmir Urla İskelesi; Dünyanın bilinen en eski (MÖ 6. yy) zeytinyağı üretim tesisi.', 5),

                    # --- AKDENİZ BÖLGESİ (PİSİDYA, PAMFİLYA, KİLİKYA, LİKYA) ---
                    ('Sagalassos Antik Dağ Kenti', 'historic', 37.6766, 30.5218, 'Burdur Ağlasun; 1700m rakımda Antoninler Çeşmesi ve kıvrımlı dağ virajları.', 5),
                    ('Kibyra Antik Kenti & Medusa Mozaiği', 'historic', 37.1558, 29.4881, 'Burdur Gölhisar; Gladyatörler kenti, 10.000 kişilik odeon ve renkli Medusa.', 5),
                    ('Termessos Kartal Yuvası Antik Kenti', 'historic', 36.9822, 30.4639, 'Antalya Güllük Dağı; 1050m zirvede Büyük İskender\'in fethedemediği sarp dağ kenti.', 5),
                    ('Adada Antik Kenti & Kral Yolu', 'historic', 37.5858, 30.9856, 'Isparta Sütçüler; Çam ormanları içinde tertemiz taş döşeli antik caddeler.', 5),
                    ('Antiochia ad Pisidiam (Yalvaç)', 'historic', 38.3056, 31.1897, 'Isparta Yalvaç; Aziz Pavlus\'un vaaz verdiği Pisidya metropolü.', 5),
                    ('Selge Antik Kenti & Adam Kayalar', 'historic', 37.2289, 31.1278, 'Antalya Manavgat; Köprülü Kanyon virajlarının zirvesinde fantastik taş kuleler.', 5),
                    ('Arykanda Antik Kenti', 'historic', 36.5147, 30.0594, 'Antalya Finike-Elmalı dağ yolu; Şahinkaya yamacına teras teras kurulu antik cennet.', 5),
                    ('Patara Antik Kenti & Meclis Binası', 'historic', 36.2608, 29.3142, 'Antalya Kaş; Likya Birliği başkenti, kum tepeleri ve antik deniz feneri.', 5),
                    ('Xanthos Likya Başkenti', 'historic', 36.3567, 29.3183, 'Antalya Kınık; Bağımsızlıkları uğruna iki kez topluca can veren Likya başkenti.', 5),
                    ('Letoon Kutsal Alanı', 'historic', 36.3325, 29.2906, 'Muğla Seydikemer; Leto, Apollon ve Artemis adına yapılan Likya\'nın din merkezi.', 5),
                    ('Myra Antik Kenti & Aziz Nikola Kilisesi', 'historic', 36.2597, 29.9850, 'Antalya Demre; Kaya mezarları ve Noel Baba olarak bilinen Aziz Nikola.', 5),
                    ('Phaselis Antik Kenti & 3 Liman', 'historic', 36.5255, 30.5528, 'Antalya Kemer; Çam ağaçlarının denizle buluştuğu korunaklı antik limanlar.', 5),
                    ('Aspendos Antik Tiyatrosu', 'historic', 36.9389, 31.1724, 'Antalya Serik; Akdeniz havzasının akustiği en kusursuz Roma tiyatrosu.', 5),
                    ('Simena Kalesi & Batık Şehir Kekova', 'historic', 36.1906, 29.8617, 'Antalya Demre/Üçağız; Karayolu bulunmayan, deniz içindeki lahitler ve kale.', 5),
                    ('Anemurium Antik Kenti', 'historic', 36.0242, 32.8028, 'Mersin Anamur; Türkiye\'nin en güney burnunda denize inen surlar ve nekropol.', 5),
                    ('Mamure Kalesi', 'historic', 36.0817, 32.8981, 'Mersin Anamur; Deniz kıyısında 39 kulesiyle Akdeniz\'in en görkemli kalelerinden biri.', 5),
                    ('Kanlıdivane (Kanytellis) Obruk Kenti', 'historic', 36.5244, 34.1783, 'Mersin Erdemli; 60m derinliğindeki dev obruk etrafında Helenistik kuleler.', 5),
                    ('Uzuncaburç (Diokaesareia) Antik Kenti', 'historic', 36.5842, 33.9189, 'Mersin Silifke; Toros dağlarında 1200m rakımlı Zeus Olbios Tapınağı ve 5 katlı kule.', 5),
                    ('Kızkalesi & Korykos Deniz Kalesi', 'historic', 36.4639, 34.1486, 'Mersin Erdemli; Kıyıdan 600m açıkta adaya inşa edilmiş efsanevi deniz kalesi.', 5),
                    ('Cennet & Cehennem Obrukları', 'historic', 36.5217, 34.1067, 'Mersin Narlıkuyu; Yeraltı nehri, Meryem Ana Kilisesi ve mitolojik çöküntüler.', 5),
                    ('Anavarza Antik Kenti & Kaya Kalesi', 'historic', 37.2517, 35.8322, 'Adana Kozan; Devasa zafer takı, sütunlu cadde ve ovanın ortasındaki dik kaya.', 5),
                    ('Yılankale (Şahmaran Kalesi)', 'historic', 37.0142, 35.8089, 'Adana Ceyhan; İpek yolu üzerinde sarp bir kayalığa tünemiş Orta Çağ hisarı.', 5),
                    ('Karatepe-Aslantaş Hitit Açık Hava Müzesi', 'historic', 37.2956, 36.2467, 'Osmaniye Kadirli; Çam ormanları ve baraj gölü kenarında Hitit hiyeroglif yazıtları.', 5),
                    ('Titus Tüneli & Beşikli Kaya Mağarası', 'historic', 36.1219, 35.9286, 'Hatay Samandağ; Roma döneminde dağın içi el işçiliğiyle oyularak açılan dev su tüneli.', 5),
                    ('Aziz Piyer (St. Pierre) Mağara Kilisesi', 'historic', 36.2089, 36.1781, 'Hatay Antakya; Hristiyanlık adının tarihte ilk kez kullanıldığı mağara tapınağı.', 5),

                    # --- İÇ ANADOLU (HİTİT, FRİGYA, KAPADOKYA, SELÇUKLU) ---
                    ('Göreme Tarihi Milli Parkı & Peri Bacaları', 'historic', 38.6431, 34.8298, 'Nevşehir; Tüf kayalara oyulmuş manastırlar ve UNESCO dünya mirası vadiler.', 5),
                    ('Midas Anıtı (Yazılıkaya) & Frig Vadisi', 'historic', 39.2003, 30.7136, 'Eskişehir Han dağ yolu; 17 metre yüksekliğinde devasa kaya cephesi tapınağı.', 5),
                    ('Ayazini Kaya Evleri & Metropolisi', 'historic', 39.0142, 30.6558, 'Afyonkarahisar İhsaniye; Kayalara oyulmuş çok katlı yerleşimler ve kiliseler.', 5),
                    ('Pessinus Antik Kenti & Kybele Tapınağı', 'historic', 39.3364, 31.5858, 'Eskişehir Sivrihisar; Ana Tanrıça Kybele\'nin gökten düşen göktaşı kutsal mekanı.', 5),
                    ('Sivrihisar Ulu Camii (Ahşap Direkli)', 'historic', 39.4489, 31.5367, 'Eskişehir Sivrihisar; 67 adet ardıç ağacı direğiyle ayakta duran 800 yıllık şaheser.', 5),
                    ('Hattuşa Hitit Başkenti & Aslanlı Kapı', 'historic', 40.0197, 34.6153, 'Çorum Boğazkale; MÖ 17. yüzyıl Hitit İmparatorluğu\'nun devasa başkenti.', 5),
                    ('Alacahöyük Sfenksli Kapı', 'historic', 40.2333, 34.6972, 'Çorum Alaca; Hatti ve Hitit prens mezarları ile çift başlı kartal kabartmaları.', 5),
                    ('Gordion Kral Midas Tümülüsü', 'historic', 39.6508, 31.9839, 'Ankara Polatlı; Frigya başkenti, Gordion düğümü ve ahşap mezar odası.', 5),
                    ('Çatalhöyük Neolitik Kenti', 'historic', 37.6675, 32.8283, 'Konya Çumra; 9000 yıl önceki insanlığın ilk şehirleşme deneyimi.', 5),
                    ('Ihlara Vadisi & Selime Katedrali', 'historic', 38.2436, 34.2981, 'Aksaray; Melendiz Çayı kanyonunda kayalara oyulmuş onlarca freskli kilise.', 5),
                    ('Derinkuyu & Kaymaklı Yeraltı Şehirleri', 'historic', 38.3736, 34.7347, 'Nevşehir; 8 kat derinliğinde 20.000 kişinin saklanabildiği havalandırmalı yeraltı sığınakları.', 5),
                    ('Soğanlı Vadisi Kubbeli Kaya Kiliseleri', 'historic', 38.3442, 34.9817, 'Kayseri Yeşilhisar; Güvercinlikler ve kayadan oyma taç kubbeli manastırlar.', 5),
                    ('Kültepe Kaniş Karum', 'historic', 38.8506, 35.6339, 'Kayseri; Anadolu\'da yazılı tarihin ve ticaretin başladığı çivi yazılı tabletler kenti.', 5),
                    ('Sultanhanı Kervansarayı', 'historic', 38.2458, 33.5467, 'Aksaray; Tarihi İpek Yolu üzerindeki en büyük ve en süslü Selçuklu kervansarayı.', 5),
                    ('Alahan Manastırı', 'historic', 36.7903, 33.3528, 'Mersin-Karaman sınırı; Toros Dağları\'nda 1300m uçurum kenarında Doğu Roma şaheseri.', 5),
                    ('Binbirkilise (Karadağ Volkanı)', 'historic', 37.4089, 33.1558, 'Karaman Karadağ; Sönmüş volkan tepesine saçılmış düzinelerce erken Hristiyanlık bazilikası.', 5),
                    ('Taşkale Tarihi Tahıl Ambarları', 'historic', 37.3328, 33.6231, 'Karaman; 40 metre yüksekliğindeki dik tüf kayaya oyulmuş 250 adet ambar.', 5),
                    ('Eflatunpınar Hitit Kutsal Su Anıtı', 'historic', 37.8189, 31.6706, 'Konya Beyşehir; 3200 yıllık tanrılar ve su perileri kabartmalı kutsal gölet.', 5),
                    ('Kilistra Antik Kaya Kenti', 'historic', 37.6658, 32.2289, 'Konya Meram Gökyurt; Kapadokya benzeri kaya şapelleri ve sığınaklar.', 5),
                    ('Divriği Ulu Camii & Darüşşifası', 'historic', 39.3736, 38.1189, 'Sivas Divriği; Taş işçiliğinin dünyadaki zirvesi "Anadolu\'nun El-Hamrası".', 5),

                    # --- MARMARA & TRAKYA (TROAS, BİTİNYA, OSMANLI) ---
                    ('Gelibolu Tarihi Alanı & Şehitlikler', 'historic', 40.0954, 26.2307, 'Çanakkale Eceabat; Çanakkale Savaşları anıtları, 57. Alay ve Conkbayırı.', 5),
                    ('Truva (Troya) Antik Kenti & Müzesi', 'historic', 39.9575, 26.2389, 'Çanakkale Tevfikiye; Homeros\'un İlyada Destanı\'na konu olan 4000 yıllık efsane.', 5),
                    ('Aleksandreia Troas Antik Limanı', 'historic', 39.7539, 26.1556, 'Çanakkale Ezine Dalyan; Roma döneminin devasa granit sütunları ve kaplıcaları.', 5),
                    ('Parion Antik Kenti', 'historic', 40.4178, 27.0694, 'Çanakkale Biga Kemer; Marmara Denizi kıyısında antik liman kenti ve odeon.', 5),
                    ('Kyzikos Antik Kenti & Hadrianus Tapınağı', 'historic', 40.3842, 27.8767, 'Balıkesir Erdek; Antik dünyanın sekizinci harikası sayılan dev mermer tapınak.', 5),
                    ('Daskyleion Antik Kenti (Pers Satraplığı)', 'historic', 40.2039, 28.0536, 'Balıkesir Bandırma; Manyas Kuş Gölü kıyısında Anadolu\'daki tek Pers valilik merkezi.', 5),
                    ('Apolyont (Gölyazı) Tarihi Yarımadası', 'historic', 40.1656, 28.6781, 'Bursa Nilüfer Uluabat Gölü; Antik surlar, Ağlayan Çınar ve göl içi adacıklar.', 5),
                    ('Tirilye (Zeytinbağı) Taş Mektep & Fatih Camii', 'historic', 40.3922, 28.7956, 'Bursa Mudanya sahil yolu; Tarihi ahşap Rum evleri ve Bizans kiliseleri.', 5),
                    ('İznik Tarihi Surları & Lefke Kapısı', 'historic', 40.4286, 29.7214, 'Bursa İznik; Dört yanı çevreleyen 5 km uzunluğunda Roma-Bizans-Osmanlı surları.', 5),
                    ('Cumalıkızık 700 Yıllık Osmanlı Köyü', 'historic', 40.1764, 29.1706, 'Bursa Yıldırım; Uludağ eteklerinde korunan Arnavut kaldırımlı yaşayan tarih.', 5),
                    ('Justinianus (Sangarios) Taş Köprüsü', 'historic', 40.7381, 30.3708, 'Sakarya Serdivan; MS 562 yılında Bizans İmparatoru Justinianus\'un yaptırdığı 429m köprü.', 5),
                    ('Prusias ad Hypium Antik Tiyatrosu', 'historic', 40.9039, 31.1506, 'Düzce Konuralp; Batı Karadeniz\'in en iyi korunmuş antik Roma tiyatrosu.', 5),
                    ('Edirne Selimiye Camii & Külliyesi', 'historic', 41.6781, 26.5594, 'Edirne; Mimar Sinan\'ın "Ustalık Eserim" dediği dünya mimarlık şaheseri.', 5),
                    ('Uzunköprü Tarihi Taş Köprüsü (174 Kemer)', 'historic', 41.2725, 26.6806, 'Edirne Uzunköprü; Ergene Nehri üzerinde 1392m boyuyla dünyanın en uzun taş köprüsü.', 5),
                    ('Kıyıköy Aya Nikola Kaya Manastırı', 'historic', 41.6342, 28.0933, 'Kırklareli Vize Kıyıköy; Karadeniz kıyısında yekpare kayanın içine oyulmuş manastır.', 5),

                    # --- KARADENİZ BÖLGESİ (PONTUS, PAFLAGONYA, KOLHİS) ---
                    ('Sümela Manastırı & Altındere Vadisi', 'historic', 40.6903, 39.6583, 'Trabzon Maçka; Karadağ\'ın 300m sarp kayalıklarına oyulmuş 1600 yıllık manastır.', 5),
                    ('Vazelon Manastırı & Çam Ormanları', 'historic', 40.7606, 39.5447, 'Trabzon Maçka vadisi; Sümela\'dan bile daha eski (MS 270) gizli manastır.', 5),
                    ('Zilkale Kalesi & Fırtına Vadisi', 'historic', 40.9298, 40.9614, 'Rize Çamlıhemşin; Bulut denizinin üzerinde Fırtına Deresi\'ne bakan kartal yuvası.', 5),
                    ('Şenyuva Tarihi Taş Kemere Köprüsü', 'historic', 40.9881, 40.9842, 'Rize Çamlıhemşin; 1696 yapımı fırtına deresi üzerindeki efsanevi tek gözlü kemer köprü.', 5),
                    ('Santa Harabeleri (Dumanlı Yaylası)', 'historic', 40.6128, 39.7347, 'Gümüşhane-Trabzon yayla sınırı; Sisler arasında 7 ayrı mahalleden oluşan taş Rum kenti.', 5),
                    ('İmera Manastırı & Krom Vadisi', 'historic', 40.4858, 39.6381, 'Gümüşhane Olucak; Dağların arasında sağlam kubbesiyle ayakta duran görkemli manastır.', 5),
                    ('Kuşkayası Yol Anıtı & Roma Kartalı', 'historic', 41.7214, 32.3556, 'Bartın-Amasra eski dağ yolu; Roma askerlerinin dinlenmesi için kayaya oyulmuş çeşme ve anıt.', 5),
                    ('Amasra Ceneviz Kalesi & Kemere Köprüsü', 'historic', 41.7503, 32.3867, 'Bartın Amasra; İki koyu birbirine bağlayan tarihi taş köprü ve ada kalesi.', 5),
                    ('Hadrianapolis Antik Kenti & Mozaikler', 'historic', 41.0328, 32.5517, 'Karabük Eskipazar; "Karadeniz\'in Zeugması" sayılan hayvan figürlü taban mozaikleri.', 5),
                    ('Safranbolu Tarihi Konakları & Cinci Han', 'historic', 41.2458, 32.6936, 'Karabük Safranbolu; UNESCO korumasında ahşap işçilikli Osmanlı evleri.', 5),
                    ('Mahmut Bey Camii (Çivisiz Cami)', 'historic', 41.4806, 33.6842, 'Kastamonu Kasaba Köyü; 1366 yılından beri tek bir metal çivi çakılmadan ayakta.', 5),
                    ('Boyabat Tarihi Kalesi & Yeraltı Tünelleri', 'historic', 41.4689, 34.7672, 'Sinop Boyabat; Gökırmak Vadisi\'ne hakim sarp kayalıkta nehre inen gizli merdivenler.', 5),
                    ('Sinop Tarihi Cezaevi & Surları', 'historic', 42.0231, 35.1481, 'Sinop; Karadeniz\'in hırçın dalgalarıyla çevrili üç yanı deniz kale cezaevi.', 5),
                    ('Amasya Krallar Vadisi Kaya Mezarları', 'historic', 40.6534, 35.8331, 'Amasya; Harşena Dağı kireçtaşı kayalıklarına oyulmuş Pontus kralları anıt mezarları.', 5),
                    ('Yason Burnu & Yason Kilisesi', 'historic', 41.1308, 37.6833, 'Ordu Perşembe sahil yolu; Altın Post peşindeki Argonotlar Efsanesi\'nin geçtiği burun.', 5),
                    ('Şavşat Kalesi & Tibeti Kilisesi', 'historic', 41.2436, 42.3689, 'Artvin Şavşat; Dağ virajları arasında Gürcü Bagratlı krallarının kartal hisarları.', 5),
                    ('İşhan (İshani) Manastırı', 'historic', 40.7761, 41.7247, 'Artvin Yusufeli; Çoruh Vadisi tepelerinde kızıl taştan haç planlı dev katedral.', 5),

                    # --- DOĞU ANADOLU (URARTU, ERMENİ, SELÇUKLU, SALTUKLU) ---
                    ('Şeytan Kalesi (Karaçay Kanyonu)', 'historic', 41.1089, 43.1428, 'Ardahan Çıldır; Üç tarafı yüzlerce metrelik uçurumla çevrili nefes kesici kale.', 5),
                    ('Ani Antik Kenti (1001 Kiliseli Şehir)', 'historic', 40.5075, 43.5728, 'Kars Arpaçay; Türkiye-Ermenistan sınırında İpek Yolu üzerindeki katedral ve surlar.', 5),
                    ('Kars Kalesi & Kümbet Camii (12 Havariler)', 'historic', 40.6178, 43.0911, 'Kars; Rus ve Osmanlı mimarisinin birleştiği kale etekleri.', 5),
                    ('İshak Paşa Sarayı', 'historic', 39.5211, 44.1294, 'Ağrı Doğubayazıt; Ağrı Dağı manzaralı, dünyada ilk kalorifer sistemli saray kompleksi.', 5),
                    ('Öşk Vank (Öşvank) Katedrali', 'historic', 40.5986, 41.5367, 'Erzurum Uzundere; Tortum Gölü yolu üzerinde 10. yüzyıldan kalma devasa taş kubbe.', 5),
                    ('Çobandede Tarihi İpek Yolu Köprüsü', 'historic', 39.9725, 41.8842, 'Erzurum Köprüköy; Aras ve Kargapazarı nehirlerinin kesiştiği 7 kemerli köprü.', 5),
                    ('Erzurum Çifte Minareli Medrese & Kale', 'historic', 39.9056, 41.2778, 'Erzurum; Selçuklu çinileri ve taş kabartmalı taç kapı.', 5),
                    ('Kemaliye (Eğin) Karanlık Kanyon Taş Yolu', 'historic', 39.2617, 38.4972, 'Erzincan Kemaliye; Fırat Nehri kanyonunda dağların içi 132 yılda oyularak açılan tüneller yolu.', 5),
                    ('Mama Hatun Külliyesi & Kervansarayı', 'historic', 39.7758, 40.3897, 'Erzincan Tercan; Saltuklu Prensesi Mama Hatun adına yapılan dairesel türbe mimarisi.', 5),
                    ('Van Kalesi & Tuşpa Urartu Krallığı', 'historic', 38.5028, 43.3403, 'Van; 3000 yıl önce Urartu krallarının yaptırdığı devasa kaya kalesi ve çivi yazıları.', 5),
                    ('Çavuştepe (Sardurihinili) Kalesi', 'historic', 38.3517, 43.4589, 'Van Gürpınar; Urartu Tanrısı Haldi tapınağı ve bazalt taş bloklar.', 5),
                    ('Hoşap Kalesi (Kartal Yuvası)', 'historic', 38.3189, 43.8017, 'Van Güzelsu; Van-Hakkari dağ yolu üzerinde dik kayalığa tünemiş Orta Çağ şatosu.', 5),
                    ('Ayanis Urartu Kalesi & Tapınağı', 'historic', 38.7067, 43.2106, 'Van Tuşba; Van Gölü kıyısında en iyi korunmuş fildişi ve bronz süslemeli tapınak.', 5),
                    ('Akdamar Adası Kutsal Haç Kilisesi', 'historic', 38.3411, 43.0367, 'Van Gevaş; Van Gölü içindeki adada dış cephesi Tevrat ve İncil kabartmalarıyla dolu kilise.', 5),
                    ('Ahlat Selçuklu Meydan Mezarlığı', 'historic', 38.7481, 42.4842, 'Bitlis Ahlat; Dünyanın en büyük tarihi İslam mezarlığı, devasa işlemeli taşlar.', 5),
                    ('Nemrut Krater Gölü & Kalderası', 'historic', 38.6258, 42.2356, 'Bitlis Tatvan; Dünyanın ikinci büyük krater kalderasında buhar bacaları ve göller.', 5),
                    ('Harput Tarihi Kalesi & Eğri Minare', 'historic', 38.7036, 39.2558, 'Elazığ Harput; Pisa kulesinden daha eğik minare ve MÖ Urartu Süt Kalesi.', 5),
                    ('Palu Kalesi & Urartu Çivi Yazıtı', 'historic', 38.6947, 39.9328, 'Elazığ Palu; Murat Nehri kanyonuna hakim sarp zirvede Kral Menua yazıtı.', 5),

                    # --- GÜNEYDOĞU ANADOLU (MEZOPOTAMYA, ASUR, KOMMAGENE) ---
                    ('Göbeklitepe Tarihin Sıfır Noktası', 'historic', 37.2232, 38.9224, 'Şanlıurfa; 12.000 yıllık T biçimli dikilitaşlar, insanlık tarihinin bilinen ilk tapınağı.', 5),
                    ('Karahantepe Neolitik Kült Merkezi', 'historic', 37.0789, 39.3106, 'Şanlıurfa Tektek Dağları; Göbeklitepe ile çağdaş kayaya oyulmuş dev insan başı.', 5),
                    ('Harran Kümbet Evleri & İlk İslam Üniversitesi', 'historic', 36.8617, 39.0308, 'Şanlıurfa Harran; Konik kubbeli kerpiç evler ve rasathane kalıntıları.', 5),
                    ('Şuayb Şehri & Soğmatar Harabeleri', 'historic', 36.9856, 39.4678, 'Şanlıurfa Harran çöl yolu; Gezegen tanrılarına adanmış kaya tapınakları.', 5),
                    ('Halfeti Batık Köy & Rumkale', 'historic', 37.2472, 37.8683, 'Şanlıurfa-Gaziantep sınırı; Fırat Nehri kanyonunda sular altında minare ve yarımada kalesi.', 5),
                    ('Zeugma Antik Kenti & Belkıs Harabeleri', 'historic', 37.0589, 37.8667, 'Gaziantep Nizip; Fırat kıyısında Çingene Kızı mozaiğinin çıkarıldığı Roma villaları.', 5),
                    ('Yesemek Taş Ocağı ve Heykel Atölyesi', 'historic', 36.9017, 36.7558, 'Gaziantep İslahiye; MÖ 900\'lerden kalma yüzlerce sfenks ve aslan heykel taslağı.', 5),
                    ('Nemrut Dağı Dev Tanrı Heykelleri (2150m)', 'historic', 37.9806, 38.7408, 'Adıyaman Kâhta; Kommagene Krallığı I. Antiochos\'un dev tanrı heykelleri ve gün doğumu.', 5),
                    ('Cendere Tarihi Roma Köprüsü', 'historic', 37.9317, 38.6056, 'Adıyaman Sincik; 1800 yıllık harçsız tek kemerli devasa Roma taş köprüsü.', 5),
                    ('Kâhta Yeni Kale & Arsemia', 'historic', 37.9467, 38.6578, 'Adıyaman Kâhta; Kommagene başkenti, Herakles ile Antiochos tokalaşma kabartması.', 5),
                    ('Perre Antik Nekropol Kenti & Mozaik', 'historic', 37.7958, 38.2917, 'Adıyaman Merkez; Kayalara oyulmuş yüzlerce oda mezar ve Roma çeşmesi.', 5),
                    ('Dara Antik Kenti & Dev Su Sarnıçları', 'historic', 37.1772, 40.9417, 'Mardin Nusaybin yolu; Doğu Roma\'nın Sasani sınırındaki kaya garnizon şehri ve zindan.', 5),
                    ('Deyrulumur (Mor Gabriel) Manastırı', 'historic', 37.3189, 41.5367, 'Mardin Midyat; MS 397 yılında kurulan, dünyada aralıksız ibadet edilen en eski Süryani manastırı.', 5),
                    ('Mor Evgin (St. Eugenius) Manastırı', 'historic', 37.1681, 41.2217, 'Mardin Nusaybin Bagok Dağları; Mezopotamya ovasına bakan 800m uçurum kartal yuvası.', 5),
                    ('Diyarbakır Tarihi Surları & Hevsel Bahçeleri', 'historic', 37.9139, 40.2408, 'Diyarbakır; Çin Seddi\'nden sonra dünyanın en uzun ve sağlam bazalt taş surları.', 5),
                    ('Zerzevan Kalesi & Mithras Gizem Tapınağı', 'historic', 37.6083, 40.4992, 'Diyarbakır Çınar; Roma\'nın doğu sınır karakolu ve yerin altında keşfedilen Mithras tapınağı.', 5),
                    ('On Gözlü Köprü & Dicle Vadisi', 'historic', 37.8925, 40.2367, 'Diyarbakır; Dicle Nehri üzerinde 1065 yapımı siyah bazalt kemerli tarihi köprü.', 5),
                    ('Malabadi Köprüsü', 'historic', 38.1539, 41.2017, 'Diyarbakır-Batman sınırı; Artuklu döneminden kalma dünyanın en geniş sivri taş kemeri.', 5),
                    ('Hasankeyf Tarihi Mağara Kenti & Kalesi', 'historic', 37.7128, 41.4153, 'Batman; Dicle Nehri kıyısında binlerce yıllık kaya yerleşimleri ve türbeler.', 5),
                    ('Finik Kalesi & Kaya Kabartmaları', 'historic', 37.4589, 42.0833, 'Şırnak Güçlükonak; Dicle Boğazı\'nda sarp kireçtaşı kayalıklarına oyulmuş hisar ve rölyefler.', 5),
                    ('Cizre Kırmızı Medrese & Mem û Zîn Türbesi', 'historic', 37.3278, 42.1867, 'Şırnak Cizre; 14. yüzyıl kızıl tuğla mimarisi ve ünlü Doğu aşk destanı mekanı.', 5)
                ]
                cursor.executemany("""
                    INSERT INTO favorite_places (name, category, lat, lon, description, rating)
                    VALUES (?, ?, ?, ?, ?, ?);
                """, places)

            conn.commit()

    # --- ROTA İŞLEMLERİ ---
    def get_all_routes(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM routes ORDER BY is_favorite DESC, created_at DESC;")
            rows = cursor.fetchall()
            return [dict(r) for r in rows]

    def get_route_by_id(self, route_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM routes WHERE id = ?;", (route_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def save_route(self, data):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO routes (
                    title, description, mode, distance_km, duration_seconds,
                    curviness_score, ascent_meters, descent_meters,
                    waypoints_json, geometry_geojson, is_favorite
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                data.get('title', 'İsimsiz Rota'),
                data.get('description', ''),
                data.get('mode', 'twisty'),
                float(data.get('distance_km', 0.0)),
                int(data.get('duration_seconds', 0)),
                int(data.get('curviness_score', 0)),
                int(data.get('ascent_meters', 0)),
                int(data.get('descent_meters', 0)),
                json.dumps(data.get('waypoints', [])),
                json.dumps(data.get('geometry', [])),
                1 if data.get('is_favorite') else 0
            ))
            conn.commit()
            return cursor.lastrowid

    def delete_route(self, route_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM routes WHERE id = ?;", (route_id,))
            conn.commit()
            return cursor.rowcount > 0

    def toggle_favorite_route(self, route_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE routes SET is_favorite = (1 - is_favorite) WHERE id = ?;", (route_id,))
            conn.commit()
            return True

    # --- FAVORİ NOKTALAR / MOLA YERLERİ ---
    def get_all_places(self, category=None):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if category:
                cursor.execute("SELECT * FROM favorite_places WHERE category = ? ORDER BY created_at DESC;", (category,))
            else:
                cursor.execute("SELECT * FROM favorite_places ORDER BY created_at DESC;")
            return [dict(r) for r in cursor.fetchall()]

    def add_place(self, name, category, lat, lon, description="", rating=5):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO favorite_places (name, category, lat, lon, description, rating)
                VALUES (?, ?, ?, ?, ?, ?);
            """, (name, category, float(lat), float(lon), description, int(rating)))
            conn.commit()
            return cursor.lastrowid

    def delete_place(self, place_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM favorite_places WHERE id = ?;", (place_id,))
            conn.commit()
            return cursor.rowcount > 0

    # --- ARAÇLAR / GARAJ ---
    def get_all_vehicles(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM vehicles ORDER BY is_default DESC, id ASC;")
            return [dict(r) for r in cursor.fetchall()]

    def add_vehicle(self, name, vehicle_type='motorcycle', fuel_consumption=5.0, tank_capacity=15.0, is_default=0):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO vehicles (name, type, fuel_consumption, tank_capacity, is_default)
                VALUES (?, ?, ?, ?, ?);
            """, (name, vehicle_type, float(fuel_consumption), float(tank_capacity), int(is_default)))
            conn.commit()
            return cursor.lastrowid

    # --- SÜRÜŞ GÜNLÜĞÜ ---
    def get_all_trips(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT t.*, r.title as route_title 
                FROM trip_logs t 
                LEFT JOIN routes r ON t.route_id = r.id 
                ORDER BY t.trip_date DESC;
            """)
            return [dict(r) for r in cursor.fetchall()]

    def add_trip_log(self, route_id, actual_distance_km, actual_duration_min, notes=""):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO trip_logs (route_id, actual_distance_km, actual_duration_min, notes)
                VALUES (?, ?, ?, ?);
            """, (route_id, float(actual_distance_km), int(actual_duration_min), notes))
            conn.commit()
            return cursor.lastrowid

if __name__ == "__main__":
    db = Database()
    print("=" * 60)
    print("🏍️  Rotam SQLite Veritabanı Başarıyla Hazırlandı!")
    print(f"📁  Veritabanı Dosyası: {DB_FILE}")
    print(f"📍  Varsayılan Mola Noktaları: {len(db.get_all_places())} adet")
    print(f"🏍️  Kayıtlı Araç Profilleri: {len(db.get_all_vehicles())} adet")
    print(f"🗺️  Kayıtlı Rotalar: {len(db.get_all_routes())} adet")
    print("=" * 60)
