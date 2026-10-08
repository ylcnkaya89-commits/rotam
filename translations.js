/**
 * ROTAM V2 - Internationalization (i18n) Engine & Translations
 * Supported Languages: Türkçe (tr), English (en)
 */

window.TRANSLATIONS = {
  tr: {
    // Brand & Slogan
    app_title: "Rotam | Profesyonel Seyahat, Rota ve Keşif Platformu",
    app_subtitle: "Seyahat, Rota & Keşif Platformu",
    slogan_title: "Yolculuğun sadece bir varış noktası değil.",
    slogan_desc: "Rotanı oluştur, keşfedilecek yerleri bul ve yolculuğunu unutulmaz hale getir.",
    splash_preparing: "Sistem hazırlanıyor...",
    splash_ready: "Harita ve seyahat motoru hazır!",
    splash_click_start: "Tıkla ve Başla",

    // Navigation Header
    nav_plan: "Rota Planla",
    nav_stream: "Keşif & Akış",
    nav_discover: "Türkiye'yi Keşfet",
    nav_nearby: "Yakınımda",
    nav_saved: "Rotalarım",
    nav_admin: "Yönetim",
    btn_save_route: "Rotayı Kaydet",
    btn_export_gpx: "GPX",
    btn_import_gpx: "Yükle",
    btn_gmaps: "Google Maps",
    btn_lang_toggle: "Dili Değiştir / Change Language",

    // Mobile Bottom Nav
    mobile_nav_plan: "Rota",
    mobile_nav_discover: "Keşfet",
    mobile_nav_nearby: "Yakınımda",
    mobile_nav_saved: "Rotalarım",
    mobile_nav_admin: "Yönetim",
    mobile_gmaps_start: "Google Maps ile Başlat",
    quick_label: "Hızlı:",
    mobile_pois_label: "Keşif",

    // Vehicles
    vehicle_title: "Yolculuk Türü",
    veh_car: "Otomobil",
    veh_car_short: "Oto",
    veh_moto: "Motosiklet",
    veh_moto_short: "Moto",
    veh_camper: "Karavan",
    veh_bicycle: "Bisiklet",
    veh_walk: "Yaya",

    // Preferences
    pref_question: "Nasıl bir yolculuk istiyorsun?",
    pref_fastest: "Hızlı",
    pref_scenic: "Manzaralı",
    pref_historic: "Tarihi",
    pref_nature: "Doğa",
    pref_photo: "Fotoğraf",
    pref_beach: "Sahil",
    pref_gastro: "Gastronomi",
    pref_twisty: "Virajlı",
    pref_discovery: "Keşif",
    pref_best: "En İyi Rota",

    // Hero Planner
    hero_from: "Nereden?",
    hero_to: "Nereye?",
    use_my_location: "Konumumu Kullan",
    hero_start_placeholder: "Başlangıç şehri (Örn: Ankara)",
    hero_end_placeholder: "Hedef şehir veya mekan (Örn: Antalya)",
    quick_start: "Hızlı Başlangıç:",
    popular_dest: "Popüler Hedefler:",
    popular_route: "Popüler Rota:",
    btn_create_route: "ROTAMI OLUŞTUR",
    hint_corridor: "50 km Koridor Analizi",
    hint_smart_stops: "Akıllı Mola & Sapma",
    hint_gpx: "GPX & Çevrimdışı PWA",

    // Sidebar & Waypoints
    sidebar_mobile_title: "Rota ve Duraklar",
    sidebar_see_map: "Haritayı Gör",
    waypoints_title: "Rota Durakları",
    btn_reverse_title: "Rotayı Ters Çevir",
    btn_clear_title: "Tümünü Temizle",
    wp_start_placeholder: "Başlangıç Noktası (Örn: İstanbul)",
    wp_end_placeholder: "Varış Noktası (Örn: Antalya)",
    wp_stop_prefix: "Ara Durak ",
    btn_add_waypoint: "Ara Durak Ekle",
    or_click_map: "veya haritaya tıkla",

    // Map Controls
    tile_dark: "Dark",
    tile_topo: "Topo",
    tile_street: "Sokak",
    tile_sat: "Uydu",
    map_hint: "Haritaya tıklayarak durak ekleyebilirsiniz.",
    btn_mobile_plan_route: "Rotanı Planla",

    // Cockpit & Stats
    route_summary: "Rota Özeti",
    metric_distance: "Mesafe",
    metric_duration: "Süre",
    score_curviness: "Viraj Puanı",
    score_comfort: "Konfor Skoru",
    score_camper: "Karavan Uyumu",
    score_bicycle: "Bisiklet Uyumu",
    score_walk: "Yürüyüş Uyumu",
    est_fuel_prefix: "Tahmini Yakıt:",
    suggested_breaks_prefix: "Önerilen Mola:",
    fuel_stops_suffix: "Durak",
    elevation_title: "Topografik Yükselti & Eğim Profili",
    weather_title: "Güzergah Canlı Hava Durumu",
    alternatives_title: "Rota Alternatifleri",
    recommended_badge: "⭐ ROTAM Öneriyor",
    source_scenic: "Manzaralı Bölge Yolları",
    source_highway: "Hızlı Otoyol Güzergahı",

    // Right Panel (Keşfet & Akış)
    btn_open_stream_text: "Keşif & Akış",
    tab_discover: "Rotada Keşfet",
    tab_timeline: "Yolculuk Akışı",
    corridor_title: "50 km Koridoru Analizi",
    corridor_desc: "Seçtiğin ana rotanın her iki tarafındaki 50 km genişliğindeki alanda yer alan tarihi, doğal ve gastronomi noktaları taranır.",
    smart_stops_title: "Akıllı Mola ve Keşif Önerileri",
    smart_stops_subtitle: "Rotanızdan en az sapma ile ulaşılabilecek en yüksek puanlı noktalar",
    btn_take_stop: "Mola Ver",
    btn_add_to_route: "Rotaya Ekle",
    btn_details: "Detaylar",
    btn_show_map: "Haritada Göster",
    btn_set_destination: "Hedef Yap",
    timeline_not_ready_title: "Yolculuk Akışı Hazır Değil",
    timeline_not_ready_desc: "Başlangıç ve varış noktalarınızı belirleyip rotanızı oluşturduğunuzda, sürüş sırasına göre tüm duraklar, mola önerileri ve etap süreleri bu akışta yer alacaktır.",
    timeline_set_stops_btn: "Durakları Belirle",
    timeline_summary_title: "Sürüş Özeti",
    timeline_points_count: "Nokta",
    timeline_start: "BAŞLANGIÇ NOKTASI",
    timeline_end: "VARIŞ NOKTASI",
    timeline_waypoint: "ARA DURAK",
    timeline_gmaps_btn: "Google Maps ile Sürüşü Başlat",

    // Modals
    modal_discover_title: "Türkiye'yi Keşfet",
    modal_discover_sub: "Antik kentler, doğa harikaları, kanyonlar, sahiller ve gastronomi durakları",
    search_discover_placeholder: "Yerin adı, şehir veya özellik ara (Örn: Sagalassos, Efes, Kaputaş, Urfa...)",
    region_all: "Tüm Bölgeler",
    region_aegean: "Ege",
    region_mediterranean: "Akdeniz",
    region_central: "İç Anadolu",
    region_marmara: "Marmara",
    region_blacksea: "Karadeniz",
    region_east: "Doğu & GD",
    cat_all: "Tümü",
    cat_historic: "🏛️ Tarih",
    cat_nature: "🌲 Doğa",
    cat_photography: "📸 Fotoğraf",
    cat_beach: "🌊 Sahil",
    cat_gastronomy: "🍴 Lezzet",
    cat_camping: "🚐 Karavan & Kamp",
    cat_ev_charge: "⚡ EV Şarj",
    btn_photo: "Fotoğraf",
    btn_target: "Hedef",
    btn_add_card: "Ekle",

    modal_nearby_title: "Yakınımda Ne Var?",
    nearby_radius_label: "Mesafe Yarıçapı:",
    nearby_scanning: "Konumunuz alınıyor ve yakındaki noktalar taranıyor...",
    btn_refresh: "Yenile",

    modal_saved_title: "Kayıtlı & Hazır Rotalar",
    no_saved_routes: "Henüz kayıtlı bir özel rota bulunmuyor.",
    saved_badge: "Kayıtlı Rota",
    btn_load_route: "Yükle",
    btn_delete_route: "Sil",
    tab_presets: "✨ Hazır Efsane Rotalar",
    tab_my_saved: "📁 Kaydettiğim Rotalar",
    nav_presets: "Hazır Rotalar",
    modal_presets_title: "Efsane Hazır Rotalar",
    modal_presets_sub: "Motosiklet ve seyahat tutkunları için özenle seçilmiş ikonik Türkiye güzergahları",
    btn_load_preset: "Rotayı Haritaya Yükle",
    presets_twistiness: "Viraj",
    presets_search_placeholder: "Hazır rota veya bölge ara (Örn: Kaş, Sakar, Bolu, Kapadokya...)",
    presets_filter_all: "Tümü",
    presets_filter_moto: "🏍️ Viraj",
    presets_filter_history: "🏛️ Tarih",
    presets_filter_nature: "🌲 Doğa",
    presets_filter_coast: "🌊 Sahil",
    sidebar_discover_presets: "Hazır Efsane Rotaları Keşfet",

    modal_save_title: "Rotayı Kaydet",
    save_route_title_label: "Rota Başlığı",
    save_route_title_placeholder: "Örn: 2026 Yaz Akdeniz & Likya Turu",
    save_route_desc_label: "Gezi Notları & Açıklama (İsteğe Bağlı)",
    save_route_desc_placeholder: "Örn: Gün batımı molaları, Kaputaş ve Sagalassos antik kenti ziyaretleri...",
    btn_save: "Kaydet",
    btn_cancel: "İptal",

    modal_admin_title: "Yönetim & Ayarlar Paneli",
    modal_admin_sub: "Keşif noktaları yönetimi, dil seçimi ve sistem ayarları",
    admin_tab_places: "Mekan Yönetimi",
    admin_tab_analytics: "Analitik & İstatistik",
    admin_tab_settings: "Dil & Ayarlar",
    admin_stat_total: "Toplam Mekan",
    admin_stat_historic: "Tarih & Antik",
    admin_stat_nature: "Doğa & Kanyon",
    admin_stat_gastro: "Gastronomi & Mola",
    admin_places_sub: "Veritabanındaki mekanları düzenleyin veya yenisini ekleyin:",
    admin_new_place_btn: "Yeni Mekan Ekle",
    admin_lang_title: "Uygulama Dili / App Language",
    admin_lang_desc: "Kullanıcı arayüzü ve içerik dili tercihini belirleyin.",
    admin_backup_download_title: "Veritabanı Yedeğini İndir (JSON Export)",
    admin_backup_download_desc: "Mevcut 870+ kayıtlı mekan ve kullanıcı tarafından eklenen tüm özel noktaları içeren tam veritabanını standart JSON formatında bilgisayarınıza yedekleyin.",
    admin_backup_download_btn: "rotam_places_backup.json İndir",
    admin_backup_restore_title: "Veritabanı Yedeğini Geri Yükle (JSON Import & Doğrulama)",
    admin_backup_restore_desc: "Daha önce aldığınız bir JSON yedeğini yükleyin. Yükleme öncesinde dosya şeması otomatik olarak doğrulanır; hatalı veya bozuk dosyalar sisteminizi bozmaz.",
    admin_backup_restore_btn: "JSON Dosyası Seç ve Geri Yükle",
    admin_auth_title: "Yönetici Girişi",
    admin_auth_sub: "Yönetim paneli ve sistem analitikleri şifre korumalıdır",
    admin_auth_pass_label: "Yönetici Şifresi",
    admin_auth_pass_placeholder: "Yönetici şifrenizi girin...",
    admin_auth_btn_login: "Giriş Yap",
    admin_auth_logout: "Çıkış Yap",
    admin_auth_change_pass: "Şifre Değiştir",
    admin_auth_err: "Hatalı yönetici şifresi!",
    admin_analytics_total_visits: "Toplam Ziyaret",
    admin_analytics_today: "Bugünkü Ziyaretçi",
    admin_analytics_routes: "Hesaplanan Rota",
    admin_analytics_stops: "Mola Eklemeleri",
    admin_analytics_top_routes: "En Çok Aranan Rotalar",
    admin_analytics_devices: "Cihaz Dağılımı",
    admin_analytics_reset: "Sıfırla",
    admin_analytics_export: "JSON İndir",
    admin_analytics_no_routes: "Henüz rota hesaplanmadı",
    admin_analytics_real_badge: "Gerçek Sayaç",
    modal_gpx_title: "GPX Rotası Yükle",
    gpx_drop_title: "GPX dosyasını buraya sürükleyin",
    gpx_drop_sub: "veya bilgisayarınızdan seçin (.gpx)",
    gpx_desc: "Yüklediğiniz GPX dosyasındaki koordinatlar ve duraklar otomatik olarak haritada çizilecek, mesafe ve yükseklik analizi yapılacaktır.",

    place_gmaps_photos_btn: "Google Maps'te Tüm Fotoğrafları & Yorumları Gör",
    place_gmaps_photos_sub: "360° sokak görünümleri, drone ve gezgin çekimleri",
    place_best_time: "En Uygun Zaman",
    place_suggested_stay: "Önerilen Mola",
    btn_add_to_route_full: "ROTAMA EKLE",
    btn_set_dest_full: "HEDEF YAP",

    // Time & Units
    hours_short: "sa",
    minutes_short: "dk",
    km: "km",
    points_suffix: "Nokta",
    discoveries_suffix: "Keşif",

    // Live Navigation & Ride Tracking Mode (#40)
    btn_start_live_ride: "CANLI SÜRÜŞÜ BAŞLAT",
    live_nav_title: "Canlı Sürüş Modu",
    live_nav_speed: "km/s",
    live_nav_speed_label: "HIZ",
    live_nav_next_stop: "Sonraki Hedef",
    live_nav_remaining: "Kalan",
    live_nav_recenter: "Ortala",
    live_nav_voice_on: "Ses Açık",
    live_nav_voice_off: "Ses Kapalı",
    live_nav_demo: "Demo Sürüş",
    live_nav_gps: "GPS Canlı",
    live_nav_stop_ride: "Sürüşü Bitir",
    live_nav_proximity: "Yaklaşıyorsunuz:",
    live_nav_wakelock_active: "Ekran açık tutuluyor",
    live_nav_gps_error: "GPS sinyali alınamadı. Simülasyon moduna geçiliyor.",
    live_nav_arrived: "Hedefe ulaştınız! Tebrikler!",

    // Toasts & Messages
    toast_fill_inputs: "Lütfen başlangıç ve varış noktalarını girin.",
    toast_loc_not_found: "konumu bulunamadı. Lütfen kontrol edip tekrar deneyin.",
    toast_route_success: "Rota başarıyla oluşturuldu!",
    toast_route_error: "Seçilen noktalar arasında uygun bir güzergah bulunamadı.",
    toast_need_2_points: "Lütfen en az başlangıç ve varış noktası girin veya haritadan 2 nokta seçin.",
    toast_stop_added: "rotanıza durak olarak eklendi!",
    toast_stop_removed: "rotadan kaldırıldı.",
    toast_route_saved: "Rotanız başarıyla kaydedildi!",
    toast_lang_changed: "Dil Türkçe olarak güncellendi.",
    toast_gps_success: "Mevcut konumunuz başlangıç noktası olarak ayarlandı.",
    toast_gps_error: "Konum alınamadı:"
  },

  en: {
    // Brand & Slogan
    app_title: "Rotam | Professional Travel, Route & Discovery Platform",
    app_subtitle: "Travel, Route & Discovery Platform",
    slogan_title: "The journey is more than just a destination.",
    slogan_desc: "Create your route, discover hidden spots, and make your trip unforgettable.",
    splash_preparing: "Preparing system...",
    splash_ready: "Map and travel engine ready!",
    splash_click_start: "Click to Start",

    // Navigation Header
    nav_plan: "Plan Route",
    nav_stream: "Discovery & Feed",
    nav_discover: "Discover Turkey",
    nav_nearby: "Near Me",
    nav_saved: "My Routes",
    nav_admin: "Settings",
    btn_save_route: "Save Route",
    btn_export_gpx: "GPX",
    btn_import_gpx: "Import",
    btn_gmaps: "Google Maps",
    btn_lang_toggle: "Change Language / Dili Değiştir",

    // Mobile Bottom Nav
    mobile_nav_plan: "Route",
    mobile_nav_discover: "Discover",
    mobile_nav_nearby: "Near Me",
    mobile_nav_saved: "Saved",
    mobile_nav_admin: "Settings",
    mobile_gmaps_start: "Start Google Maps",
    quick_label: "Quick:",
    mobile_pois_label: "Spots",

    // Vehicles
    vehicle_title: "Travel Mode",
    veh_car: "Car",
    veh_car_short: "Car",
    veh_moto: "Motorcycle",
    veh_moto_short: "Moto",
    veh_camper: "Camper",
    veh_bicycle: "Bicycle",
    veh_walk: "Walking",

    // Preferences
    pref_question: "What kind of journey do you want?",
    pref_fastest: "Fast",
    pref_scenic: "Scenic",
    pref_historic: "Historic",
    pref_nature: "Nature",
    pref_photo: "Photo",
    pref_beach: "Beach",
    pref_gastro: "Gastro",
    pref_twisty: "Twisty",
    pref_discovery: "Discovery",
    pref_best: "Best Route",

    // Hero Planner
    hero_from: "From?",
    hero_to: "To?",
    use_my_location: "Use My Location",
    hero_start_placeholder: "Starting city (e.g. Ankara)",
    hero_end_placeholder: "Destination city or spot (e.g. Antalya)",
    quick_start: "Quick Start:",
    popular_dest: "Popular Destinations:",
    popular_route: "Popular Routes:",
    btn_create_route: "CREATE ROUTE",
    hint_corridor: "50 km Corridor Analysis",
    hint_smart_stops: "Smart Stops & Detours",
    hint_gpx: "GPX & Offline PWA",

    // Sidebar & Waypoints
    sidebar_mobile_title: "Route & Waypoints",
    sidebar_see_map: "View Map",
    waypoints_title: "Route Stops",
    btn_reverse_title: "Reverse Route",
    btn_clear_title: "Clear All",
    wp_start_placeholder: "Start Point (e.g. Istanbul)",
    wp_end_placeholder: "Destination (e.g. Antalya)",
    wp_stop_prefix: "Stop ",
    btn_add_waypoint: "Add Stop",
    or_click_map: "or click on map",

    // Map Controls
    tile_dark: "Dark",
    tile_topo: "Topo",
    tile_street: "Street",
    tile_sat: "Satellite",
    map_hint: "Click on the map to add stops.",
    btn_mobile_plan_route: "Plan Route",

    // Cockpit & Stats
    route_summary: "Route Summary",
    metric_distance: "Distance",
    metric_duration: "Duration",
    score_curviness: "Twist Score",
    score_comfort: "Comfort Score",
    score_camper: "Camper Score",
    score_bicycle: "Bicycle Score",
    score_walk: "Walking Score",
    est_fuel_prefix: "Est. Fuel:",
    suggested_breaks_prefix: "Suggested Breaks:",
    fuel_stops_suffix: "Stops",
    elevation_title: "Topographic Elevation & Slope Profile",
    weather_title: "Live Route Weather Forecast",
    alternatives_title: "Route Alternatives",
    recommended_badge: "⭐ ROTAM Recommended",
    source_scenic: "Scenic Regional Roads",
    source_highway: "Fast Highway Route",

    // Right Panel (Keşfet & Akış)
    btn_open_stream_text: "Discovery & Feed",
    tab_discover: "Discover on Route",
    tab_timeline: "Journey Feed",
    corridor_title: "50 km Corridor Analysis",
    corridor_desc: "Historic sites, natural wonders, beaches and food spots within 50 km on both sides of your route are scanned.",
    smart_stops_title: "Smart Stops & Recommendations",
    smart_stops_subtitle: "Top-rated spots with minimal detour from your route",
    btn_take_stop: "Take Stop",
    btn_add_to_route: "Add to Route",
    btn_details: "Details",
    btn_show_map: "Show on Map",
    btn_set_destination: "Set Destination",
    timeline_not_ready_title: "Journey Feed Not Ready",
    timeline_not_ready_desc: "Once you set your starting point and destination, all stops, break suggestions, and stage times will appear here in chronological driving order.",
    timeline_set_stops_btn: "Set Waypoints",
    timeline_summary_title: "Drive Summary",
    timeline_points_count: "Points",
    timeline_start: "STARTING POINT",
    timeline_end: "DESTINATION POINT",
    timeline_waypoint: "STOP",
    timeline_gmaps_btn: "Start Driving with Google Maps",

    // Modals
    modal_discover_title: "Discover Turkey",
    modal_discover_sub: "Ancient cities, natural wonders, canyons, beaches and culinary gems",
    search_discover_placeholder: "Search by place name, city or feature (e.g. Sagalassos, Ephesus, Kaputas...)",
    region_all: "All Regions",
    region_aegean: "Aegean",
    region_mediterranean: "Mediterranean",
    region_central: "Central Anatolia",
    region_marmara: "Marmara",
    region_blacksea: "Black Sea",
    region_east: "Eastern & SE",
    cat_all: "All",
    cat_historic: "🏛️ Historic",
    cat_nature: "🌲 Nature",
    cat_photography: "📸 Photo",
    cat_beach: "🌊 Beach",
    cat_gastronomy: "🍴 Culinary",
    cat_camping: "🚐 Camper & Camp",
    cat_ev_charge: "⚡ EV Charge",
    btn_photo: "Photos",
    btn_target: "Target",
    btn_add_card: "Add",

    modal_nearby_title: "What's Near Me?",
    nearby_radius_label: "Radius:",
    nearby_scanning: "Acquiring your location and scanning nearby spots...",
    btn_refresh: "Refresh",

    modal_saved_title: "Saved & Curated Routes",
    no_saved_routes: "No custom saved routes found yet.",
    saved_badge: "Saved Route",
    btn_load_route: "Load",
    btn_delete_route: "Delete",
    tab_presets: "✨ Curated Scenic Routes",
    tab_my_saved: "📁 My Saved Routes",
    nav_presets: "Curated Routes",
    modal_presets_title: "Curated Scenic Routes",
    modal_presets_sub: "Handpicked scenic motorcycle and travel routes across Turkey",
    btn_load_preset: "Load Route to Map",
    presets_twistiness: "Curves",
    presets_search_placeholder: "Search curated route or region (e.g. Kas, Sakar, Bolu, Cappadocia...)",
    presets_filter_all: "All",
    presets_filter_moto: "🏍️ Curves",
    presets_filter_history: "🏛️ History",
    presets_filter_nature: "🌲 Nature",
    presets_filter_coast: "🌊 Coast",
    sidebar_discover_presets: "Explore Curated Scenic Routes",

    modal_save_title: "Save Route",
    save_route_title_label: "Route Title",
    save_route_title_placeholder: "e.g. 2026 Summer Mediterranean & Lycian Tour",
    save_route_desc_label: "Trip Notes & Description (Optional)",
    save_route_desc_placeholder: "e.g. Sunset stops, Kaputas Beach and Sagalassos ancient city visits...",
    btn_save: "Save",
    btn_cancel: "Cancel",

    modal_admin_title: "Settings & Admin Panel",
    modal_admin_sub: "Place management, language preferences and system settings",
    admin_tab_places: "Places",
    admin_tab_analytics: "Analytics",
    admin_tab_settings: "Language & Settings",
    admin_stat_total: "Total Places",
    admin_stat_historic: "Historic & Ancient",
    admin_stat_nature: "Nature & Canyon",
    admin_stat_gastro: "Gastro & Stops",
    admin_places_sub: "Manage existing places or add a new one:",
    admin_new_place_btn: "Add New Place",
    admin_lang_title: "Application Language / Uygulama Dili",
    admin_lang_desc: "Select your preferred user interface language.",
    admin_backup_download_title: "Download Database Backup (JSON Export)",
    admin_backup_download_desc: "Export the full database containing 870+ registered places and custom spots as a standard JSON backup file.",
    admin_backup_download_btn: "Download rotam_places_backup.json",
    admin_backup_restore_title: "Restore Database Backup (JSON Import & Validation)",
    admin_backup_restore_desc: "Upload a previously saved JSON backup. Schema is validated automatically to ensure system stability.",
    admin_backup_restore_btn: "Select JSON File to Restore",
    admin_auth_title: "Admin Login",
    admin_auth_sub: "Admin panel and system analytics are password protected",
    admin_auth_pass_label: "Admin Password",
    admin_auth_pass_placeholder: "Enter admin password...",
    admin_auth_btn_login: "Login",
    admin_auth_logout: "Logout",
    admin_auth_change_pass: "Change Password",
    admin_auth_err: "Incorrect admin password!",
    admin_analytics_total_visits: "Total Visits",
    admin_analytics_today: "Today's Visitors",
    admin_analytics_routes: "Routes Calculated",
    admin_analytics_stops: "Stops Added",
    admin_analytics_top_routes: "Most Searched Routes",
    admin_analytics_devices: "Device Breakdown",
    admin_analytics_reset: "Reset",
    admin_analytics_export: "Export JSON",
    admin_analytics_no_routes: "No routes calculated yet",
    admin_analytics_real_badge: "Live Counter",

    modal_gpx_title: "Import GPX Route",
    gpx_drop_title: "Drag and drop GPX file here",
    gpx_drop_sub: "or select from your device (.gpx)",
    gpx_desc: "Coordinates and stops in your GPX file will be rendered on the map, with automatic distance and elevation analysis.",

    place_gmaps_photos_btn: "View All Photos & Reviews on Google Maps",
    place_gmaps_photos_sub: "360° street views, drone and traveler photos",
    place_best_time: "Best Time to Visit",
    place_suggested_stay: "Suggested Stay",
    btn_add_to_route_full: "ADD TO ROUTE",
    btn_set_dest_full: "SET DESTINATION",

    // Time & Units
    hours_short: "h",
    minutes_short: "m",
    km: "km",
    points_suffix: "Points",
    discoveries_suffix: "Spots",

    // Live Navigation & Ride Tracking Mode (#40)
    btn_start_live_ride: "START LIVE RIDE",
    live_nav_title: "Live Ride Navigation",
    live_nav_speed: "km/h",
    live_nav_speed_label: "SPEED",
    live_nav_next_stop: "Next Stop",
    live_nav_remaining: "Remaining",
    live_nav_recenter: "Recenter",
    live_nav_voice_on: "Voice On",
    live_nav_voice_off: "Voice Off",
    live_nav_demo: "Demo Ride",
    live_nav_gps: "Live GPS",
    live_nav_stop_ride: "End Ride",
    live_nav_proximity: "Approaching:",
    live_nav_wakelock_active: "Screen kept awake",
    live_nav_gps_error: "GPS signal unavailable. Switching to demo simulation.",
    live_nav_arrived: "You have arrived at your destination!",

    // Toasts & Messages
    toast_fill_inputs: "Please enter both start and destination points.",
    toast_loc_not_found: "location could not be found. Please check and try again.",
    toast_route_success: "Route successfully generated!",
    toast_route_error: "No viable driving route found between selected points.",
    toast_need_2_points: "Please enter at least start and destination points or select 2 points on the map.",
    toast_stop_added: "added to your route as a stop!",
    toast_stop_removed: "removed from route.",
    toast_route_saved: "Route saved successfully!",
    toast_lang_changed: "Language updated to English.",
    toast_gps_success: "Your current location set as start point.",
    toast_gps_error: "Could not obtain location:"
  }
};

/**
 * Translation Helper Function
 */
function t(key, fallback = '') {
  const lang = (window.state && window.state.lang) || localStorage.getItem('rotam_lang') || 'tr';
  const dict = window.TRANSLATIONS[lang] || window.TRANSLATIONS.tr;
  return dict[key] !== undefined ? dict[key] : (fallback || key);
}

/**
 * Apply All Translations to DOM
 */
function applyTranslations() {
  const lang = (window.state && window.state.lang) || localStorage.getItem('rotam_lang') || 'tr';
  document.documentElement.lang = lang;

  // Update HTML elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const translation = t(key);
    if (translation) el.textContent = translation;
  });

  // Update HTML input placeholders with data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    const translation = t(key);
    if (translation) el.placeholder = translation;
  });

  // Update HTML tooltips / titles with data-i18n-title
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.dataset.i18nTitle;
    const translation = t(key);
    if (translation) el.title = translation;
  });

  // Update language toggle buttons in Header & Settings
  const langFlag = document.getElementById('lang-flag');
  const langCode = document.getElementById('lang-code');
  if (langFlag) langFlag.textContent = lang === 'en' ? '🇬🇧' : '🇹🇷';
  if (langCode) langCode.textContent = lang === 'en' ? 'EN' : 'TR';

  const sidebarFlag = document.getElementById('sidebar-lang-flag');
  const sidebarCode = document.getElementById('sidebar-lang-code');
  if (sidebarFlag) sidebarFlag.textContent = lang === 'en' ? '🇬🇧' : '🇹🇷';
  if (sidebarCode) sidebarCode.textContent = lang === 'en' ? 'EN' : 'TR';

  const langSelectRadios = document.querySelectorAll('input[name="app_lang_choice"]');
  langSelectRadios.forEach(radio => {
    radio.checked = radio.value === lang;
  });

  // Update document title
  document.title = t('app_title');

  // Trigger dynamic component updates
  if (typeof updateWaypointsListUI === 'function') updateWaypointsListUI();
  if (typeof selectVehicle === 'function' && window.state) selectVehicle(window.state.currentVehicle || 'car');
  if (typeof renderCorridorPoiList === 'function') renderCorridorPoiList();
  if (typeof renderJourneyTimeline === 'function') renderJourneyTimeline();
  if (typeof filterDiscoverPlaces === 'function') filterDiscoverPlaces();
  if (typeof initIcons === 'function') initIcons();
}

/**
 * Set Language & Persist
 */
function setLanguage(lang) {
  if (lang !== 'tr' && lang !== 'en') return;
  if (window.state) window.state.lang = lang;
  localStorage.setItem('rotam_lang', lang);
  applyTranslations();
  if (typeof showToast === 'function') {
    showToast(t('toast_lang_changed'), 'info');
  }
}

/**
 * Quick Toggle Between Turkish and English
 */
function toggleLanguage() {
  const current = (window.state && window.state.lang) || localStorage.getItem('rotam_lang') || 'tr';
  const target = current === 'tr' ? 'en' : 'tr';
  setLanguage(target);
}
