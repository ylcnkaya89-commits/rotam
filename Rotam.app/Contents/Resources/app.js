window.API_BASE = "";// TODO: Android icin buraya bulut sunucu adresinizi yazin (ornek: "https://rotam.onrender.com")
/**
 * Rotam - Motosiklet & Araç Gezi Rotası Planlayıcı
 * Gelişmiş Açık Kaynak Rota, Viraj Analizi ve Yükseklik Profili Motoru
 */

// Global State
const state = {
  currentProfile: 'twisty', // 'twisty' | 'scenic' | 'fastest'
  waypoints: [
    { id: 'start', type: 'start', name: '', lat: null, lon: null, marker: null },
    { id: 'end', type: 'end', name: '', lat: null, lon: null, marker: null }
  ],
  routeData: null,
  elevationData: [],
  elevationHoverMarker: null,
  activeTileLayer: null,
  poiMarkers: [],
  activePoiTypes: new Set(),
  fuelConsumption: 5.0, // Litre / 100km (Ortalama motor/araba)
  fuelPricePerLiter: 45.0 // TL
};

// Preset Efsane Rotalar
const PRESET_ROUTES = [
  {
    id: 'kas-kalkan-fethiye',
    title: 'Kaş - Kalkan - Fethiye Sahil Yolu (D400)',
    category: 'Motosiklet & Deniz Manzarası',
    description: 'Turkuaz deniz manzaralı, keskin uçurum virajları ve Kaputaş Plajı geçişiyle Türkiye\'nin en popüler sürüş rotası.',
    difficulty: 'Orta / İleri',
    twistiness: 94,
    points: [
      { name: 'Kaş Marina', lat: 36.1993, lon: 29.6377 },
      { name: 'Kaputaş Kanyonu & Plajı', lat: 36.2287, lon: 29.4491 },
      { name: 'Kalkan Seyir Tepesi', lat: 36.2625, lon: 29.4146 },
      { name: 'Fethiye Ölüdeniz', lat: 36.5498, lon: 29.1256 }
    ]
  },
  {
    id: 'bolu-abant-yedigoller',
    title: 'Bolu Dağı Eski Geçit & Abant Virajları',
    category: 'Dağ & Orman Virajları',
    description: 'Otoyol yerine eski Bolu Dağı geçidi ve Abant çam ormanları arasındaki teknik virajlar.',
    difficulty: 'Orta',
    twistiness: 88,
    points: [
      { name: 'Düzce Kaynaşlı', lat: 40.7781, lon: 31.3094 },
      { name: 'Bolu Dağı Eski Geçit Zirve', lat: 40.7421, lon: 31.4285 },
      { name: 'Abant Tabiat Parkı', lat: 40.6053, lon: 31.2828 }
    ]
  },
  {
    id: 'sakar-gecidi-akyaka',
    title: 'Muğla Sakar Geçidi & Akyaka - Datça',
    category: 'Efsane Saç Tokası Virajlar',
    description: '670 metreden deniz seviyesine inen meşhur Sakar Geçidi virajları ve Gökova Körfezi panoraması.',
    difficulty: 'İleri',
    twistiness: 96,
    points: [
      { name: 'Muğla Merkez', lat: 37.2153, lon: 28.3636 },
      { name: 'Sakar Geçidi Seyir Terası', lat: 37.0678, lon: 28.3412 },
      { name: 'Akyaka Azmak', lat: 37.0545, lon: 28.3242 },
      { name: 'Datça Yarımadası', lat: 36.7262, lon: 27.6841 }
    ]
  },
  {
    id: 'canakkale-gelibolu',
    title: 'Çanakkale Boğazı & Gelibolu Tarihi Rota',
    category: 'Tarih & Rüzgarlı Sahil',
    description: 'Eceabat, Kabatepe ve Anzak Koyu virajlarında şehitlikler ve Ege Denizi manzarası.',
    difficulty: 'Kolay / Rahat',
    twistiness: 76,
    points: [
      { name: 'Kilitbahir Kalesi', lat: 40.1478, lon: 26.3792 },
      { name: 'Alçıtepe Şehitlik Yolu', lat: 40.0954, lon: 26.2307 },
      { name: 'Kabatepe Limanı', lat: 40.2031, lon: 26.2736 }
    ]
  },
  {
    id: 'likya-antik-rotasi',
    title: 'Likya Antik Kentleri & Kıyı Virajları Turu',
    category: 'Antik Kent & Deniz Virajları',
    description: 'Tlos, Patara, Kaş ve Simena Batık Şehir üzerinden Akdeniz\'in en büyüleyici antik rotası.',
    difficulty: 'Orta',
    twistiness: 95,
    points: [
      { name: 'Tlos Antik Kenti & Akropol', lat: 36.5539, lon: 29.3533 },
      { name: 'Patara Antik Kenti & Meclisi', lat: 36.2608, lon: 29.3142 },
      { name: 'Kaş Antiphellos Tiyatrosu', lat: 36.1993, lon: 29.6377 },
      { name: 'Simena Kalesi & Kekova', lat: 36.1906, lon: 29.8617 }
    ]
  },
  {
    id: 'frigya-kral-yolu',
    title: 'Frigya Vadisi & Midas Krallığı Dağ Yolu',
    category: 'Kaya Şehirleri & Dağ Yolu',
    description: 'Eskişehir-Afyon arasında 3000 yıllık devasa Midas Anıtı ve Ayazini kaya yerleşimleri.',
    difficulty: 'Orta',
    twistiness: 85,
    points: [
      { name: 'Pessinus Antik Kenti (Sivrihisar)', lat: 39.3364, lon: 31.5858 },
      { name: 'Midas Anıtı (Yazılıkaya)', lat: 39.2003, lon: 30.7136 },
      { name: 'Ayazini Kaya Evleri Metropolisi', lat: 39.0142, lon: 30.6558 }
    ]
  },
  {
    id: 'dogu-urartu-saraylari',
    title: 'Doğu Anadolu: Urartu & İshak Paşa Sarayı Turu',
    category: 'Yüksek Rakım & Tarih (1800m+)',
    description: 'Kars Ani Harabeleri\'nden Ağrı Dağı eteklerindeki İshak Paşa Sarayı ve Hoşap Kalesi\'ne efsane keşif rotası.',
    difficulty: 'İleri / Macera',
    twistiness: 89,
    points: [
      { name: 'Ani Antik Kenti (Kars)', lat: 40.5075, lon: 43.5728 },
      { name: 'İshak Paşa Sarayı (Doğubayazıt)', lat: 39.5211, lon: 44.1294 },
      { name: 'Van Kalesi (Tuşpa)', lat: 38.5028, lon: 43.3403 },
      { name: 'Hoşap Kalesi (Güzelsu)', lat: 38.3189, lon: 43.8017 }
    ]
  },
  {
    id: 'stelvio-pass',
    title: 'Stelvio Geçidi (İtalya Alpleri)',
    category: 'Dünya Efsanesi (2757m)',
    description: '48 adet keskin saç tokası (hairpin) virajıyla motorcuların dünya genelindeki 1 numaralı hac rotası.',
    difficulty: 'Uzman',
    twistiness: 99,
    points: [
      { name: 'Prad am Stilfserjoch', lat: 46.6186, lon: 10.5936 },
      { name: 'Passo dello Stelvio Zirve (2757m)', lat: 46.5286, lon: 10.4532 },
      { name: 'Bormio', lat: 46.4687, lon: 10.3732 }
    ]
  }
];

// Map & Layer State
let map = null;
let routePolyline = null;
let routeGlowPolyline = null;
let tileLayers = {};
let mapInitialized = false;

function createTileLayers() {
  if (typeof L === 'undefined') return {};
  return {
    osm: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }),
    dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      attribution: '&copy; CARTO, &copy; OpenStreetMap'
    }),
    topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: '&copy; OpenTopoMap'
    }),
    sat: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      attribution: '&copy; Esri'
    })
  };
}

// AÇILIŞ ANİMASYONU (SPLASH SCREEN)
let splashDismissed = false;

window.dismissSplashScreen = function() {
  if (splashDismissed) return;
  splashDismissed = true;
  const splash = document.getElementById('splash-screen');
  if (!splash) return;

  splash.style.opacity = '0';
  splash.style.transform = 'scale(1.04)';
  splash.style.pointerEvents = 'none';

  setTimeout(() => {
    if (splash.parentNode) splash.parentNode.removeChild(splash);
    if (map) {
      setTimeout(() => map.invalidateSize(), 100);
    }
  }, 650);
};

function updateSplashProgress(percent, statusText) {
  const bar = document.getElementById('splash-progress-bar');
  const txt = document.getElementById('splash-status-text');
  const pct = document.getElementById('splash-percent-text');
  if (bar && bar.style) bar.style.width = percent + '%';
  if (txt && statusText) txt.textContent = statusText;
  if (pct) pct.textContent = percent + '%';
}

function initSplashScreenSequence() {
  const steps = [
    { delay: 300, pct: 35, text: 'Harita ve viraj profilleri yükleniyor...' },
    { delay: 700, pct: 68, text: 'Keşif veritabanı (787 nokta) senkronize edildi...' },
    { delay: 1150, pct: 92, text: 'Benzinlik & mola ağları hazırlanıyor...' },
    { delay: 1550, pct: 100, text: 'Hazır. Virajların özgürlüğüne hoş geldiniz!' }
  ];

  steps.forEach(step => {
    setTimeout(() => {
      if (!splashDismissed) {
        updateSplashProgress(step.pct, step.text);
      }
    }, step.delay);
  });

  setTimeout(() => {
    window.dismissSplashScreen();
  }, 1950);
}

// Robust App Bootstrap - runs immediately so all buttons and UI are active
function startApp() {
  initSplashScreenSequence();
  initIcons();
  initEventListeners();
  renderWaypointsUI();
  setupElevationCanvas();
  renderPresetsList();
  if (window.DEFAULT_HISTORIC_PLACES && window.DEFAULT_HISTORIC_PLACES.length > 0) {
    state.allHistoricPlaces = window.DEFAULT_HISTORIC_PLACES;
  }
  loadHistoricPlaces();
  initMapWhenReady();

  // PWA Service Worker (iOS & Android Offline Support)
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW registration note:', err));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}

function initMapWhenReady() {
  if (mapInitialized) return;
  if (typeof L !== 'undefined') {
    mapInitialized = true;
    initMap();
    return;
  }

  // Poll for Leaflet
  let attempts = 0;
  const timer = setInterval(() => {
    attempts++;
    if (typeof L !== 'undefined') {
      clearInterval(timer);
      mapInitialized = true;
      initMap();
    } else if (attempts >= 40) {
      clearInterval(timer);
      console.warn('Leaflet bekleniyor...');
      ensureLeafletLoaded().then(() => {
        if (typeof L !== 'undefined' && !mapInitialized) {
          mapInitialized = true;
          initMap();
        }
      });
    }
  }, 100);
}

function ensureLeafletLoaded() {
  return new Promise((resolve) => {
    if (typeof L !== 'undefined') {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      resolve();
    };
    document.head.appendChild(script);
  });
}

function initIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function initMap() {
  const mapElem = document.getElementById('map');
  if (!mapElem) return;

  if (typeof L === 'undefined') {
    mapElem.innerHTML = `
      <div class="flex items-center justify-center h-full text-center p-6 text-slate-400">
        <div class="glass-panel p-6 rounded-2xl max-w-sm">
          <p class="text-base font-bold text-white mb-2">Harita Servisi Yükleniyor</p>
          <p class="text-xs text-slate-400 mb-4">Lütfen internet bağlantınızı kontrol ediniz.</p>
          <button onclick="location.reload()" class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl text-xs font-semibold">Yeniden Dene</button>
        </div>
      </div>
    `;
    return;
  }

  if (map) return;

  tileLayers = createTileLayers();

  // Tüm Türkiye'yi kapsayacak şekilde merkezle
  map = L.map('map', {
    center: [38.8, 35.2],
    zoom: 6,
    zoomControl: false
  });

  // Zoom control
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Varsayılan olarak canlı OSM katmanını ekle
  state.activeTileLayer = tileLayers.osm || tileLayers.dark;
  state.activeTileLayer.addTo(map);

  // Katman butonunu aktif göster
  const osmBtn = document.getElementById('tile-osm');
  if (osmBtn) {
    document.querySelectorAll('.tile-btn').forEach(btn => btn.classList.replace('bg-slate-800', 'text-slate-400'));
    osmBtn.classList.add('bg-slate-800', 'text-white');
  }

  // Leaflet boyut hesaplama düzeltmesi (Flexbox & WebKit rendering)
  setTimeout(() => { if (map) map.invalidateSize(); }, 150);
  setTimeout(() => { if (map) map.invalidateSize(); }, 500);
  setTimeout(() => { if (map) map.invalidateSize(); }, 1200);

  window.addEventListener('resize', () => {
    if (map) map.invalidateSize();
  });

  // Map Click Listener to add waypoints
  map.on('click', async (e) => {
    const { lat, lng } = e.latlng;
    await handleMapClick(lat, lng);
  });

  // Re-render any waypoints or route if initialized
  state.waypoints.forEach(wp => {
    if (wp.lat && wp.lon) updateMarker(wp);
  });
  if (state.routeData && state.routeData.geometry) {
    drawRouteOnMap(state.routeData.geometry.coordinates);
  }
}

// Tile Switcher
function switchTileLayer(name) {
  if (!map || !tileLayers) return;
  if (state.activeTileLayer) {
    map.removeLayer(state.activeTileLayer);
  }
  state.activeTileLayer = tileLayers[name] || tileLayers.osm;
  state.activeTileLayer.addTo(map);

  document.querySelectorAll('.tile-btn').forEach(btn => {
    btn.classList.remove('bg-slate-800', 'text-white');
    btn.classList.add('text-slate-400');
  });
  const activeBtn = document.getElementById(`tile-${name}`);
  if (activeBtn) {
    activeBtn.classList.remove('text-slate-400');
    activeBtn.classList.add('bg-slate-800', 'text-white');
  }
}

// Handling clicks on the map to set waypoints
async function handleMapClick(lat, lng) {
  // Check if start is empty
  const startWp = state.waypoints.find(w => w.type === 'start');
  const endWp = state.waypoints.find(w => w.type === 'end');

  if (!startWp.lat) {
    startWp.lat = lat;
    startWp.lon = lng;
    startWp.name = await reverseGeocode(lat, lng) || 'Seçilen Başlangıç';
    updateMarker(startWp);
    renderWaypointsUI();
    return;
  }

  if (!endWp.lat) {
    endWp.lat = lat;
    endWp.lon = lng;
    endWp.name = await reverseGeocode(lat, lng) || 'Seçilen Varış';
    updateMarker(endWp);
    renderWaypointsUI();
    calculateRoute();
    return;
  }

  // If start and end are already set, add a via waypoint before end
  const newId = 'wp_' + Date.now();
  const address = await reverseGeocode(lat, lng) || `Ara Durak ${state.waypoints.length - 1}`;
  const newWp = {
    id: newId,
    type: 'via',
    name: address,
    lat: lat,
    lon: lng,
    marker: null
  };

  // Insert before end waypoint
  state.waypoints.splice(state.waypoints.length - 1, 0, newWp);
  updateMarker(newWp);
  renderWaypointsUI();
  calculateRoute();
}

// Nominatim Reverse Geocoding
async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`, {
      headers: { 'Accept-Language': 'tr' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.address?.town || data.address?.city || data.address?.county || data.display_name?.split(',')[0] || null;
  } catch (err) {
    console.warn('Geocoding error:', err);
    return null;
  }
}

// Geocoding forward search
async function searchLocation(query) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`, {
      headers: { 'Accept-Language': 'tr' }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Search error:', err);
    return [];
  }
}

// Render Waypoints UI in Sidebar
function renderWaypointsUI() {
  const container = document.getElementById('waypoints-container');
  container.innerHTML = '';

  state.waypoints.forEach((wp, index) => {
    const isStart = wp.type === 'start';
    const isEnd = wp.type === 'end';
    const isVia = wp.type === 'via';

    const row = document.createElement('div');
    row.className = 'relative flex items-center space-x-2 group';

    // Dot / Icon indicator
    let badgeColor = 'bg-amber-500';
    let badgeIcon = 'map-pin';
    let labelText = `Durak ${index}`;

    if (isStart) {
      badgeColor = 'bg-emerald-500';
      badgeIcon = 'navigation';
      labelText = 'Başlangıç';
    } else if (isEnd) {
      badgeColor = 'bg-red-500';
      badgeIcon = 'flag';
      labelText = 'Varış';
    }

    row.innerHTML = `
      <div class="w-7 h-7 rounded-xl ${badgeColor}/20 border border-${badgeColor}/40 flex items-center justify-center shrink-0 text-white font-bold text-xs">
        <i data-lucide="${badgeIcon}" class="w-3.5 h-3.5 text-white"></i>
      </div>

      <div class="flex-1 relative">
        <input 
          type="text" 
          value="${escapeHtml(wp.name)}" 
          placeholder="${labelText} belirleyin veya haritadan seçin..."
          data-wp-id="${wp.id}"
          class="wp-input w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
        />
        <!-- Autocomplete Suggestions Dropdown -->
        <div class="wp-autocomplete hidden absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto"></div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center space-x-1 shrink-0">
        ${isStart ? `
          <button class="btn-gps-locate p-1.5 rounded-lg text-slate-500 hover:text-accent-400 hover:bg-slate-800 transition-colors" data-wp-id="${wp.id}" title="Konumumu Bul">
            <i data-lucide="crosshair" class="w-4 h-4"></i>
          </button>
        ` : ''}
        ${isVia ? `
          <button class="btn-remove-wp p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors" data-wp-id="${wp.id}" title="Durağı Sil">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
          </button>
        ` : ''}
      </div>
    `;

    container.appendChild(row);
  });

  initIcons();
  attachWaypointInputEvents();

  // Attach GPS click handler
  document.querySelectorAll('.btn-gps-locate').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const wpId = e.currentTarget.dataset.wpId;
      const wp = state.waypoints.find(w => w.id === wpId);
      if (!wp) return;
      
      const inputEl = document.querySelector(`.wp-input[data-wp-id="${wpId}"]`);
      if (inputEl) inputEl.value = "Konum bulunuyor...";

      // MAC NATIVE GPS (WKWebView Bridge)
      if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.gpsHandler) {
        window.onNativeLocation = async (lat, lon) => {
          wp.lat = lat;
          wp.lon = lon;
          wp.name = "Mevcut Konumum (GPS)";
          const addr = await reverseGeocode(wp.lat, wp.lon);
          if (addr) wp.name = addr;
          updateMarker(wp);
          renderWaypointsUI();
          calculateRoute();
          map.setView([wp.lat, wp.lon], 15);
          showToast("Konumunuz Mac GPS sensöründen alındı.", "success");
        };
        window.onNativeLocationError = () => {
          showToast("Mac Konum Servisine erişilemedi. IP Ağına geçiliyor...", "error");
          fallbackToIpLocation(wp, inputEl);
        };
        // Istegi Objective-C'ye gonder
        window.webkit.messageHandlers.gpsHandler.postMessage("");
        return;
      }

      // STANDART BROWSER GPS (HTML5)
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            wp.lat = position.coords.latitude;
            wp.lon = position.coords.longitude;
            wp.name = "Mevcut Konumum";
            const addr = await reverseGeocode(wp.lat, wp.lon);
            if (addr) wp.name = addr;
            updateMarker(wp);
            renderWaypointsUI();
            calculateRoute();
            map.setView([wp.lat, wp.lon], 15);
          },
          (error) => {
            console.warn("HTML5 GPS failed, falling back to IP location...", error);
            fallbackToIpLocation(wp, inputEl);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        fallbackToIpLocation(wp, inputEl);
      }
    });
  });
}

function fallbackToIpLocation(wp, inputEl) {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(async data => {
        if (data.latitude && data.longitude) {
          wp.lat = data.latitude;
          wp.lon = data.longitude;
          wp.name = data.city ? data.city + " (Tahmini)" : "Mevcut Konumum (IP)";
          const addr = await reverseGeocode(wp.lat, wp.lon);
          if (addr) wp.name = addr;
          updateMarker(wp);
          renderWaypointsUI();
          calculateRoute();
          map.setView([wp.lat, wp.lon], 13);
          showToast("Konumunuz ağ (IP) üzerinden tahmini olarak bulundu.", "success");
        } else {
          throw new Error("Invalid IP data");
        }
      })
      .catch(err => {
        console.error("IP Location Error: ", err);
        showToast("Konum alınamadı. Lütfen manuel giriniz.", "error");
        if (inputEl) inputEl.value = wp.name || "";
      });
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}

// Attach Search & Autocomplete to Inputs
function attachWaypointInputEvents() {
  document.querySelectorAll('.wp-input').forEach(input => {
    const wpId = input.dataset.wpId;
    const wp = state.waypoints.find(w => w.id === wpId);
    const dropdown = input.nextElementSibling;
    let debounceTimer;

    input.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      clearTimeout(debounceTimer);
      if (val.length < 3) {
        dropdown.classList.add('hidden');
        return;
      }

      debounceTimer = setTimeout(async () => {
        const results = await searchLocation(val);
        if (!results || results.length === 0) {
          dropdown.classList.add('hidden');
          return;
        }

        dropdown.innerHTML = results.map(r => `
          <div class="autocomplete-item p-2 hover:bg-slate-800 cursor-pointer border-b border-slate-800/60 last:border-0 text-xs text-slate-200" 
               data-lat="${r.lat}" data-lon="${r.lon}" data-name="${escapeHtml(r.display_name)}">
            <div class="font-medium text-white">${escapeHtml(r.display_name.split(',')[0])}</div>
            <div class="text-[10px] text-slate-400 truncate">${escapeHtml(r.display_name)}</div>
          </div>
        `).join('');

        dropdown.classList.remove('hidden');

        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
          item.addEventListener('click', () => {
            const lat = parseFloat(item.dataset.lat);
            const lon = parseFloat(item.dataset.lon);
            const name = item.dataset.name.split(',')[0];

            wp.lat = lat;
            wp.lon = lon;
            wp.name = name;
            input.value = name;
            dropdown.classList.add('hidden');

            updateMarker(wp);
            if (map) map.flyTo([lat, lon], 12);
            calculateRoute();
          });
        });
      }, 400);
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  });

  // Remove waypoint buttons
  document.querySelectorAll('.btn-remove-wp').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.wpId;
      const index = state.waypoints.findIndex(w => w.id === id);
      if (index !== -1) {
        if (state.waypoints[index].marker && map) {
          map.removeLayer(state.waypoints[index].marker);
        }
        state.waypoints.splice(index, 1);
        renderWaypointsUI();
        calculateRoute();
      }
    });
  });
}

// Markers Management with Custom Styling & Dragging
function updateMarker(wp) {
  if (!map || typeof L === 'undefined' || !wp.lat || !wp.lon) return;

  const isStart = wp.type === 'start';
  const isEnd = wp.type === 'end';
  const pinClass = isStart ? 'pin-start' : isEnd ? 'pin-end' : 'pin-waypoint';
  const pinIcon = isStart ? 'A' : isEnd ? 'B' : '•';

  const iconHtml = `
    <div class="custom-pin ${pinClass} w-8 h-8 text-xs relative">
      ${isStart ? '<div class="pulse-effect"></div>' : ''}
      <span>${pinIcon}</span>
    </div>
  `;

  const customIcon = L.divIcon({
    className: 'custom-leaflet-marker',
    html: iconHtml,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  if (wp.marker) {
    wp.marker.setLatLng([wp.lat, wp.lon]);
  } else {
    wp.marker = L.marker([wp.lat, wp.lon], {
      icon: customIcon,
      draggable: true
    }).addTo(map);

    wp.marker.bindPopup(`
      <div class="text-xs">
        <strong class="text-brand-400">${wp.type === 'start' ? 'Başlangıç' : wp.type === 'end' ? 'Varış' : 'Ara Durak'}</strong>
        <p class="font-medium text-white mt-1">${escapeHtml(wp.name || 'Nokta')}</p>
        <span class="text-[10px] text-slate-400">Taşımak için sürükleyin</span>
      </div>
    `);

    // Sürükleme bittiğinde koordinatları güncelle ve rotayı yeniden hesapla
    wp.marker.on('dragend', async (event) => {
      const position = event.target.getLatLng();
      wp.lat = position.lat;
      wp.lon = position.lng;
      wp.name = await reverseGeocode(wp.lat, wp.lon) || wp.name;
      renderWaypointsUI();
      calculateRoute();
    });
  }
}

// ROUTING HELPERS
const VALHALLA_PROFILES = {
  // Virajlı (Moto): otoyol/paralı yol/ana yoldan kaçın, toprak yola girme
  twisty: { costing: 'motorcycle', costing_options: { motorcycle: { use_highways: 0.0, use_tolls: 0.0, use_primary: 0.2, use_trails: 0.0 } } },
  // Keyifli (GT): otoyolu az kullan
  scenic: { costing: 'auto', costing_options: { auto: { use_highways: 0.2, use_tolls: 0.3 } } },
  // En Hızlı: otoyolu serbestçe kullan
  fastest: { costing: 'auto', costing_options: { auto: { use_highways: 1.0, use_tolls: 1.0 } } }
};

async function fetchWithTimeout(url, options = {}, ms = 25000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function decodePolyline6(str) {
  const coords = [];
  let index = 0, lat = 0, lon = 0;
  while (index < str.length) {
    let b, shift = 0, result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lon += (result & 1) ? ~(result >> 1) : (result >> 1);
    coords.push([lon / 1e6, lat / 1e6]); // GeoJSON sırası: [lon, lat]
  }
  return coords;
}

async function fetchValhallaRoute(points, profile) {
  const p = VALHALLA_PROFILES[profile] || VALHALLA_PROFILES.fastest;
  const body = {
    locations: points.map(pt => ({ lat: pt.lat, lon: pt.lon })),
    costing: p.costing,
    costing_options: p.costing_options,
    units: 'kilometers',
    directions_type: 'none'
  };
  const res = await fetchWithTimeout('https://valhalla1.openstreetmap.de/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Valhalla HTTP ' + res.status);
  const data = await res.json();
  if (!data.trip || !data.trip.legs) throw new Error('Valhalla boş yanıt');

  let coords = [];
  data.trip.legs.forEach(leg => {
    const legCoords = decodePolyline6(leg.shape);
    coords = coords.length ? coords.concat(legCoords.slice(1)) : legCoords;
  });
  return {
    distance: data.trip.summary.length * 1000, // metre
    duration: data.trip.summary.time,          // saniye
    geometry: { type: 'LineString', coordinates: coords },
    source: 'valhalla'
  };
}

async function fetchOsrmRoute(points) {
  const coordsStr = points.map(p => `${p.lon},${p.lat}`).join(';');
  const res = await fetchWithTimeout(`https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`);
  if (!res.ok) throw new Error('OSRM HTTP ' + res.status);
  const data = await res.json();
  if (!data.routes || !data.routes.length) return null;
  const r = data.routes[0];
  return { distance: r.distance, duration: r.duration, geometry: r.geometry, source: 'osrm' };
}

// ROUTING CALCULATION ENGINE
async function calculateRoute() {
  const validPoints = state.waypoints.filter(w => w.lat !== null && w.lon !== null);
  if (validPoints.length < 2) {
    clearRouteDisplay();
    return;
  }

  showRoutingLoading(true);
  const requestId = (state.routeRequestId = (state.routeRequestId || 0) + 1);

  try {
    // YOL TERCİHLERİ: Valhalla (profil bazlı gerçek yol tercihi), hata olursa OSRM
    let route = null;
    try {
      route = await fetchValhallaRoute(validPoints, state.currentProfile);
    } catch (vErr) {
      console.warn('Valhalla başarısız, OSRM deneniyor:', vErr);
    }
    if (requestId !== state.routeRequestId) return;
    if (!route) {
      route = await fetchOsrmRoute(validPoints);
      if (state.currentProfile !== 'fastest') {
        console.warn('Yedek rota servisi kullanıldı; yol tercihi uygulanamadı.');
      }
    }
    if (requestId !== state.routeRequestId) return;
    if (!route) {
      alert('Seçilen noktalar arasında uygun bir yol bulunamadı.');
      return;
    }

    state.routeData = route;

    // Haritada rotayı çiz
    drawRouteOnMap(route.geometry.coordinates);

    // İstatistikleri ve viraj puanını hesapla
    displayRouteStats(route);

        // Aktif keşif (POI) katmanlarını yeni rotaya göre yenile
    analyzeRouteCorridor(50000, true);

    // Yükseklik profilini çek ve çiz
    fetchAndDisplayElevation(route.geometry.coordinates);

    // Hava durumunu güncelle
    fetchWeatherForRoute(validPoints[0], validPoints[validPoints.length - 1]);

    // UI Panellerini ve aksiyon butonlarını etkinleştir
    document.getElementById('route-summary-panel').classList.remove('hidden');
    document.getElementById('weather-panel').classList.remove('hidden');
    document.getElementById('btn-export-gpx').removeAttribute('disabled');
    document.getElementById('btn-open-gmaps').removeAttribute('disabled');
    document.getElementById('btn-save-route-modal').removeAttribute('disabled');

  } catch (error) {
    console.error('Route calculation error:', error);
    alert('Rota hesaplanırken bir hata oluştu. Lütfen bağlantınızı kontrol edin.');
  } finally {
    showRoutingLoading(false);
  }
}

// Draw Route Polyline with Dual Glow
function drawRouteOnMap(geojsonCoords) {
  if (!map || typeof L === 'undefined') return;
  // Convert [lon, lat] to [lat, lon] for Leaflet
  const latLngs = geojsonCoords.map(c => [c[1], c[0]]);

  if (routePolyline) map.removeLayer(routePolyline);
  if (routeGlowPolyline) map.removeLayer(routeGlowPolyline);

  // Background glow line
  routeGlowPolyline = L.polyline(latLngs, {
    color: state.currentProfile === 'twisty' ? '#f97316' : '#0ea5e9',
    weight: 9,
    opacity: 0.35,
    lineCap: 'round',
    lineJoin: 'round'
  }).addTo(map);

  // Main crisp line
  routePolyline = L.polyline(latLngs, {
    color: state.currentProfile === 'twisty' ? '#ffedd5' : '#38bdf8',
    weight: 4,
    opacity: 0.95,
    lineCap: 'round',
    lineJoin: 'round'
  }).addTo(map);

  // Zoom map to fit route
  map.fitBounds(routePolyline.getBounds(), { padding: [50, 50] });
}

// Calculate Twistiness (Viraj Puanı) and Route Insights
function displayRouteStats(route) {
  const distanceKm = (route.distance / 1000).toFixed(1);
  const durationSec = route.duration;

  // Format Duration
  const hours = Math.floor(durationSec / 3600);
  const minutes = Math.floor((durationSec % 3600) / 60);
  const durationStr = hours > 0 ? `${hours} sa ${minutes} dk` : `${minutes} dk`;

  document.getElementById('stat-distance').textContent = `${distanceKm} km`;
  document.getElementById('stat-duration').textContent = durationStr;

  // Calculate Twistiness / Curviness Score
  // Analyzes angle variance of consecutive coordinate vectors per kilometer
  const coords = route.geometry.coordinates;
  const curviness = calculateCurvinessScore(coords, route.distance);

  const curvinessElem = document.getElementById('stat-curviness');
  curvinessElem.textContent = `${curviness} / 100`;

  if (curviness >= 85) {
    curvinessElem.className = 'text-base font-bold text-orange-400';
  } else if (curviness >= 65) {
    curvinessElem.className = 'text-base font-bold text-amber-400';
  } else {
    curvinessElem.className = 'text-base font-bold text-sky-400';
  }

  // Update Fuel & Cost Estimation (if present in DOM)
  const fuelLitersEl = document.getElementById('stat-fuel-liters');
  const fuelCostEl = document.getElementById('stat-fuel-cost');
  if (fuelLitersEl && fuelCostEl) {
    const fuelLiters = ((route.distance / 1000) * (state.fuelConsumption / 100)).toFixed(1);
    const fuelCost = Math.round(fuelLiters * state.fuelPricePerLiter);
    fuelLitersEl.textContent = `${fuelLiters} L`;
    fuelCostEl.textContent = fuelCost;
  }

  // Update Profile Badge
  const badge = document.getElementById('route-badge-mode');
  if (state.currentProfile === 'twisty') {
    badge.textContent = 'VİRAJLI & MOTO';
    badge.className = 'px-2 py-0.5 rounded-md text-[10px] font-bold bg-brand-500/20 text-brand-400 border border-brand-500/30';
  } else if (state.currentProfile === 'scenic') {
    badge.textContent = 'KEYİFLİ GT';
    badge.className = 'px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30';
  } else {
    badge.textContent = 'HIZLI OTOYOL';
    badge.className = 'px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30';
  }
}

// Curviness algorithm
function calculateCurvinessScore(coords, totalDistanceMeters) {
  if (!coords || coords.length < 3 || totalDistanceMeters < 500) return 50;

  // 1) Rotayı 40 metrelik eşit aralıklarla yeniden örnekle (yoğunluktan bağımsız ölçüm)
  const STEP = 40;
  const pts = [coords[0]];
  let carry = 0;
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1], b = coords[i];
    const seg = haversineMeters(a[1], a[0], b[1], b[0]);
    if (seg === 0) continue;
    let d = STEP - carry;
    while (d <= seg) {
      const t = d / seg;
      pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      d += STEP;
    }
    carry = seg - (d - STEP);
  }
  if (pts.length < 3) return 50;

  // 2) Ardışık yön değişimlerini topla (2°'den küçük titreşimleri yok say)
  let totalTurn = 0;
  let prev = getBearing(pts[0][1], pts[0][0], pts[1][1], pts[1][0]);
  for (let i = 2; i < pts.length; i++) {
    const cur = getBearing(pts[i - 1][1], pts[i - 1][0], pts[i][1], pts[i][0]);
    let diff = Math.abs(cur - prev);
    if (diff > 180) diff = 360 - diff;
    if (diff > 2 && diff < 150) totalTurn += diff;
    prev = cur;
  }

  // 3) Km başına derece -> 0-99 puan  (otoyol ~30°/km ≈ 14, sahil yolu ~150°/km ≈ 53, dağ geçidi ~400°/km ≈ 86)
  const degPerKm = totalTurn / Math.max(totalDistanceMeters / 1000, 0.5);
  return Math.max(1, Math.min(99, Math.round(100 * (1 - Math.exp(-degPerKm / 200)))));
}

function getBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  let brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

// ELEVATION PROFILE WITH OPEN-METEO ELEVATION API
async function fetchAndDisplayElevation(coords) {
  const panel = document.getElementById('elevation-panel');
  if (coords.length < 5) {
    panel.classList.add('hidden');
    return;
  }

  // Sample 45 evenly distributed points along geometry
  const samplePoints = [];
  const sampleStep = Math.max(1, Math.floor(coords.length / 45));

  for (let i = 0; i < coords.length; i += sampleStep) {
    samplePoints.push(coords[i]);
  }
  if (samplePoints[samplePoints.length - 1] !== coords[coords.length - 1]) {
    samplePoints.push(coords[coords.length - 1]);
  }

  const lats = samplePoints.map(p => p[1].toFixed(5)).join(',');
  const lons = samplePoints.map(p => p[0].toFixed(5)).join(',');

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`);
    if (!res.ok) throw new Error('Elevation fetch failed');
    const data = await res.json();
    const elevations = data.elevation || [];

    if (elevations.length === 0) return;

    // Calculate total climb / descent
    let totalAscent = 0;
    for (let i = 1; i < elevations.length; i++) {
      const diff = elevations[i] - elevations[i - 1];
      if (diff > 0) totalAscent += diff;
    }

    document.getElementById('stat-elevation').textContent = `+${Math.round(totalAscent)} m`;
    document.getElementById('elevation-max').textContent = `${Math.round(Math.max(...elevations))} m`;
    document.getElementById('elevation-min').textContent = `${Math.round(Math.min(...elevations))} m`;

    state.elevationData = samplePoints.map((pt, idx) => ({
      coord: [pt[1], pt[0]],
      elev: elevations[idx] || 0
    }));

    panel.classList.remove('hidden');
    drawElevationChart(state.elevationData);

  } catch (err) {
    console.warn('Elevation unavailable:', err);
    panel.classList.add('hidden');
  }
}

// Canvas-based Elevation Profile Chart
function setupElevationCanvas() {
  const canvas = document.getElementById('elevation-chart');
  if (!canvas) return;

  canvas.addEventListener('mousemove', (e) => {
    if (!state.elevationData || state.elevationData.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, mouseX / rect.width));
    const index = Math.round(ratio * (state.elevationData.length - 1));
    const point = state.elevationData[index];

    if (point) {
      document.getElementById('elevation-hover-info').textContent = `Rakım: ${Math.round(point.elev)}m`;

      // Update Map Hover Marker
      if (map && typeof L !== 'undefined') {
        if (!state.elevationHoverMarker) {
          state.elevationHoverMarker = L.circleMarker(point.coord, {
            radius: 7,
            color: '#ffffff',
            fillColor: '#f97316',
            fillOpacity: 1,
            weight: 3
          }).addTo(map);
        } else {
          state.elevationHoverMarker.setLatLng(point.coord);
        }
      }
    }
  });

  canvas.addEventListener('mouseleave', () => {
    document.getElementById('elevation-hover-info').textContent = '';
    if (map && state.elevationHoverMarker) {
      map.removeLayer(state.elevationHoverMarker);
      state.elevationHoverMarker = null;
    }
  });
}

function drawElevationChart(data) {
  const canvas = document.getElementById('elevation-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Resize canvas according to display width
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const elevs = data.map(d => d.elev);
  const minElev = Math.min(...elevs) - 20;
  const maxElev = Math.max(...elevs) + 40;
  const range = Math.max(maxElev - minElev, 1);

  // Gradient fill for mountain feeling
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, 'rgba(249, 115, 22, 0.45)');
  gradient.addColorStop(1, 'rgba(249, 115, 22, 0.02)');

  ctx.beginPath();
  ctx.moveTo(0, h);

  data.forEach((d, idx) => {
    const x = (idx / (data.length - 1)) * w;
    const y = h - ((d.elev - minElev) / range) * (h - 20) - 10;
    if (idx === 0) {
      ctx.lineTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Top Stroke line
  ctx.beginPath();
  data.forEach((d, idx) => {
    const x = (idx / (data.length - 1)) * w;
    const y = h - ((d.elev - minElev) / range) * (h - 20) - 10;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

// WEATHER INTEGRATION (Open-Meteo)
async function fetchWeatherForRoute(startWp, endWp) {
  try {
    const [startRes, endRes] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${startWp.lat}&longitude=${startWp.lon}&current=temperature_2m,wind_speed_10m`),
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${endWp.lat}&longitude=${endWp.lon}&current=temperature_2m,wind_speed_10m`)
    ]);

    if (startRes.ok) {
      const sData = await startRes.json();
      document.getElementById('weather-start-temp').textContent = `${Math.round(sData.current.temperature_2m)}°C`;
      document.getElementById('weather-start-wind').textContent = `${Math.round(sData.current.wind_speed_10m)} km/s rüzgar`;
    }

    if (endRes.ok) {
      const eData = await endRes.json();
      document.getElementById('weather-end-temp').textContent = `${Math.round(eData.current.temperature_2m)}°C`;
      document.getElementById('weather-end-wind').textContent = `${Math.round(eData.current.wind_speed_10m)} km/s rüzgar`;
    }
  } catch (err) {
    console.warn('Weather fetch error:', err);
  }
}

// EXPORT TO GPX (Compatible with Garmin, Calimoto, Rever, OsmAnd)
function exportGPX() {
  if (!state.routeData) return;

  const coords = state.routeData.geometry.coordinates;
  const validPoints = state.waypoints.filter(w => w.lat !== null && w.lon !== null);

  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Rotam - Motosiklet Gezi Planlayıcı" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Rotam Gezi Rotası</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
`;

  // Add Waypoints
  validPoints.forEach((wp, index) => {
    gpx += `  <wpt lat="${wp.lat}" lon="${wp.lon}">
    <name>${escapeHtml(wp.name || 'Durak ' + index)}</name>
  </wpt>\n`;
  });

  // Add Track
  gpx += `  <trk>
    <name>Rotam Rota Çizgisi</name>
    <trkseg>\n`;

  coords.forEach(pt => {
    gpx += `      <trkpt lat="${pt[1]}" lon="${pt[0]}"></trkpt>\n`;
  });

  gpx += `    </trkseg>
  </trk>
</gpx>`;

  const blob = new Blob([gpx], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rotam_gezi_${Date.now()}.gpx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// OPEN IN GOOGLE MAPS WITH ALL WAYPOINTS
function openInGoogleMaps() {
  const validPoints = state.waypoints.filter(w => w.lat !== null && w.lon !== null);
  if (validPoints.length < 2) return;

  const origin = `${validPoints[0].lat},${validPoints[0].lon}`;
  const destination = `${validPoints[validPoints.length - 1].lat},${validPoints[validPoints.length - 1].lon}`;

  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;

  // Intermediate waypoints
  if (validPoints.length > 2) {
    const waypointsStr = validPoints.slice(1, -1).map(p => `${p.lat},${p.lon}`).join('|');
    url += `&waypoints=${waypointsStr}`;
  }

  window.open(url, '_blank');
}

// PRESET SCENIC ROUTES
function renderPresetsList() {
  const container = document.getElementById('presets-list');
  if (!container) return;

  container.innerHTML = PRESET_ROUTES.map(preset => `
    <div class="glass-card p-3.5 rounded-xl border border-slate-800 hover:border-brand-500/50 transition-all cursor-pointer group flex flex-col justify-between"
         onclick="loadPresetRoute('${preset.id}')">
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-sm font-bold text-white group-hover:text-brand-400 transition-colors">${escapeHtml(preset.title)}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-500/20 text-brand-400 border border-brand-500/30">
            %${preset.twistiness} Viraj
          </span>
        </div>
        <p class="text-xs text-slate-400 mb-2 leading-relaxed">${escapeHtml(preset.description)}</p>
      </div>
      <div class="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
        <span>Kategori: <strong class="text-slate-300">${preset.category}</strong></span>
        <span class="text-brand-400 group-hover:translate-x-1 transition-transform inline-flex items-center space-x-1 font-medium">
          <span>Rotayı Yükle</span>
          <span>&rarr;</span>
        </span>
      </div>
    </div>
  `).join('');
}

window.loadPresetRoute = function(presetId) {
  const preset = PRESET_ROUTES.find(p => p.id === presetId);
  if (!preset) return;

  // Clear existing markers
  if (map) {
    state.waypoints.forEach(wp => {
      if (wp.marker) map.removeLayer(wp.marker);
    });
  }

  // Rebuild waypoints array
  state.waypoints = preset.points.map((pt, idx) => ({
    id: idx === 0 ? 'start' : idx === preset.points.length - 1 ? 'end' : 'wp_' + idx,
    type: idx === 0 ? 'start' : idx === preset.points.length - 1 ? 'end' : 'via',
    name: pt.name,
    lat: pt.lat,
    lon: pt.lon,
    marker: null
  }));

  // Update markers
  state.waypoints.forEach(updateMarker);
  renderWaypointsUI();
  calculateRoute();

  // Close modal
  document.getElementById('modal-presets').classList.add('hidden');
};

// Clear All
function clearAll() {
  if (map) {
    state.waypoints.forEach(wp => {
      if (wp.marker) map.removeLayer(wp.marker);
    });
  }

  state.waypoints = [
    { id: 'start', type: 'start', name: '', lat: null, lon: null, marker: null },
    { id: 'end', type: 'end', name: '', lat: null, lon: null, marker: null }
  ];

  clearRouteDisplay();
  renderWaypointsUI();
}

function clearRouteDisplay() {
  if (map) {
    if (routePolyline) {
      map.removeLayer(routePolyline);
      routePolyline = null;
    }
    if (routeGlowPolyline) {
      map.removeLayer(routeGlowPolyline);
      routeGlowPolyline = null;
    }
  }
  document.getElementById('route-summary-panel').classList.add('hidden');
  document.getElementById('weather-panel').classList.add('hidden');
  document.getElementById('elevation-panel').classList.add('hidden');
  document.getElementById('btn-export-gpx').setAttribute('disabled', 'true');
  document.getElementById('btn-open-gmaps').setAttribute('disabled', 'true');
  document.getElementById('btn-save-route-modal').setAttribute('disabled', 'true');
}

// Reverse Route (Ters Çevir)
function reverseRoute() {
  state.waypoints.reverse();
  // Adjust types
  state.waypoints.forEach((wp, idx) => {
    if (idx === 0) wp.type = 'start';
    else if (idx === state.waypoints.length - 1) wp.type = 'end';
    else wp.type = 'via';

    if (map && wp.marker) {
      map.removeLayer(wp.marker);
      wp.marker = null;
    }
  });

  state.waypoints.forEach(updateMarker);
  renderWaypointsUI();
  calculateRoute();
}

// Add Via Waypoint button handler
function addEmptyWaypoint() {
  const newWp = {
    id: 'wp_' + Date.now(),
    type: 'via',
    name: '',
    lat: null,
    lon: null,
    marker: null
  };
  state.waypoints.splice(state.waypoints.length - 1, 0, newWp);
  renderWaypointsUI();
}

function showRoutingLoading(isLoading) {
  const hint = document.getElementById('map-hint');
  if (hint) {
    if (isLoading) {
      hint.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 text-brand-400 animate-spin"></i><span>Virajlı rota ve yükselti hesaplanıyor...</span>`;
      initIcons();
    } else {
      hint.innerHTML = `<i data-lucide="mouse-pointer-click" class="w-4 h-4 text-brand-400"></i><span>Haritaya tıklayarak veya arama yaparak durak ekleyin.</span>`;
      initIcons();
    }
  }
}

// POINTS OF INTEREST (POI) — rota boyunca (veya görünen haritada) keşif noktaları
const POI_TYPES = {
  historic: {
    title: 'Tarihi Yer & Müze', color: '#f59e0b', fill: '#d97706', radius: 50000,
    filters: [
      'node["historic"~"castle|ruins|archaeological_site|fort|monastery|aqueduct|tomb|city_gate|tower|caravanserai"]["name"]',
      'way["historic"~"castle|ruins|archaeological_site|fort|monastery|aqueduct|tomb|city_gate|tower|caravanserai"]["name"]',
      'relation["historic"~"castle|ruins|archaeological_site|fort|monastery"]["name"]',
      'node["tourism"="museum"]["name"]',
      'way["tourism"="museum"]["name"]',
      'relation["tourism"="museum"]["name"]',
      'node["tourism"~"archaeological_site|attraction"]["historic"]["name"]',
      'way["tourism"~"archaeological_site|attraction"]["historic"]["name"]'
    ],
    localCategories: ['historic']
  },
  viewpoint: {
    title: 'Manzara Noktası', color: '#f97316', fill: '#ea580c', radius: 50000,
    filters: ['node["tourism"="viewpoint"]', 'node["mountain_pass"="yes"]["name"]'],
    localCategories: ['viewpoint', 'mountain_pass']
  },
  fuel: {
    title: 'Benzinlik & Yakıt', color: '#10b981', fill: '#059669', radius: 50000, overpassRadius: 5000,
    filters: ['node["amenity"="fuel"]', 'way["amenity"="fuel"]'],
    localCategories: ['fuel']
  },
  cafe: {
    title: 'Mola & Dinlenme', color: '#0ea5e9', fill: '#0284c7', radius: 50000, overpassRadius: 5000,
    filters: ['node["amenity"~"cafe|restaurant"]', 'node["highway"="services"]'],
    localCategories: ['cafe', 'rest_area']
  }
};
state.poiList = [];

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function minDistanceToRoute(lat, lon, routeCoords) {
  if (!routeCoords || routeCoords.length === 0) return Infinity;
  let minDist = Infinity;
  const step = Math.max(1, Math.floor(routeCoords.length / 150));
  for (let i = 0; i < routeCoords.length; i += step) {
    const p = routeCoords[i];
    const d = haversineMeters(lat, lon, p[1], p[0]);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

function sampleRouteCoords(maxPoints) {
  const coords = state.routeData.geometry.coordinates;
  const step = Math.max(1, Math.ceil(coords.length / maxPoints));
  const out = [];
  for (let i = 0; i < coords.length; i += step) out.push(coords[i]);
  if (out[out.length - 1] !== coords[coords.length - 1]) out.push(coords[coords.length - 1]);
  return out; // [lon, lat]
}

// Arama alanı: rota varsa rota koridoru, yoksa görünen harita
function getPoiSearchArea(type) {
  const cfg = POI_TYPES[type];
  if (state.routeData && state.routeData.geometry && state.routeData.geometry.coordinates.length > 1) {
    const pts = sampleRouteCoords(40);
    // Calculate bbox with buffer
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    pts.forEach(p => {
      minLat = Math.min(minLat, p[1]);
      maxLat = Math.max(maxLat, p[1]);
      minLon = Math.min(minLon, p[0]);
      maxLon = Math.max(maxLon, p[0]);
    });
    // Add ~0.1 deg buffer (approx 11km)
    minLat -= 0.1; maxLat += 0.1; minLon -= 0.1; maxLon += 0.1;
    
    const searchRadius = cfg.radius || 50000;
    const overpassRadius = cfg.overpassRadius || searchRadius;

    const bboxStr = `${minLat.toFixed(5)},${minLon.toFixed(5)},${maxLat.toFixed(5)},${maxLon.toFixed(5)}`;
    return {
      mode: 'route',
      bbox: bboxStr,
      clause: `(${bboxStr})`,
      contains: (lat, lon) => minDistanceToRoute(lat, lon, state.routeData.geometry.coordinates) <= searchRadius
    };
  }
  if (!map) return null;
  const b = map.getBounds();
  return {
    mode: 'bbox',
    tooBigForOverpass: map.getZoom() < 6,
    bbox: `${b.getSouth().toFixed(5)},${b.getWest().toFixed(5)},${b.getNorth().toFixed(5)},${b.getEast().toFixed(5)}`,
    clause: `(${b.getSouth().toFixed(5)},${b.getWest().toFixed(5)},${b.getNorth().toFixed(5)},${b.getEast().toFixed(5)})`,
    contains: (lat, lon) => b.contains([lat, lon])
  };
}

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];

async function runOverpass(query) {
  // 1) Yerel sunucu
  try {
    const res = await fetchWithTimeout(window.API_BASE + '/api/poi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    }, 15000);
    if (res.ok) {
      const data = await res.json();
      if (data && data.elements) return data;
    }
  } catch (e) {
    console.warn('Yerel POI proxy deneniyor...', e);
  }

  // 2) Doğrudan halka açık aynaları sırayla dene
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const res = await fetchWithTimeout(mirror, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query)
      }, 15000);
      if (res.ok) {
        const data = await res.json();
        if (data && data.elements) return data;
      }
    } catch (err) {
      console.warn(`Overpass ayna (${mirror}) başarısız:`, err);
    }
  }

  throw new Error('Tüm Overpass sunucuları yanıt vermedi.');
}

function showToast(message, kind = 'info') {
  let box = document.getElementById('rotam-toast');
  if (!box) {
    box = document.createElement('div');
    box.id = 'rotam-toast';
    box.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:3000;padding:10px 16px;border-radius:12px;font-size:12px;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.4);transition:opacity .3s;max-width:90vw;text-align:center';
    document.body.appendChild(box);
  }
  box.style.background = kind === 'error' ? '#b91c1c' : kind === 'ok' ? '#047857' : '#334155';
  box.textContent = message;
  box.style.opacity = '1';
  clearTimeout(box._t);
  box._t = setTimeout(() => { box.style.opacity = '0'; }, 3500);
}

function setPoiButtonState(button, active, loading) {
  if (!button) return;
  if (!button.dataset.originalHtml) button.dataset.originalHtml = button.innerHTML;
  button.innerHTML = loading
    ? '<i data-lucide="loader-2" class="w-4 h-4 mb-1 animate-spin"></i><span>Aranıyor...</span>'
    : button.dataset.originalHtml;
  button.classList.toggle('border-brand-500', active);
  button.classList.toggle('text-brand-400', active);
  button.classList.toggle('bg-brand-500/10', active);
  button.classList.toggle('bg-slate-950', !active);
  button.classList.toggle('text-slate-300', !active);
  initIcons();
}

async function togglePoi(type, button) {
  if (!map) { showToast('Harita henüz yüklenmedi.', 'error'); return; }
  if (state.activePoiTypes.has(type)) {
    state.activePoiTypes.delete(type);
    removePoiMarkers(type);
    setPoiButtonState(button, false, false);
    return;
  }
  if (!getPoiSearchArea(type)) {
    showToast('Önce bir rota oluşturun veya haritaya biraz daha yakınlaşın.', 'error');
    return;
  }
  state.activePoiTypes.add(type);
  setPoiButtonState(button, true, true);
  const count = await fetchPoiMarkers(type);
  setPoiButtonState(button, true, false);
  
}

// Rota değiştiğinde aktif POI katmanlarını yenile
async function refreshActivePois() {
  for (const type of Array.from(state.activePoiTypes)) {
    const btn = document.getElementById('poi-' + type);
    setPoiButtonState(btn, true, true);
    const count = await fetchPoiMarkers(type, true, true);
    setPoiButtonState(btn, true, false);
  }
}

function removePoiMarkers(type) {
  state.poiMarkers = state.poiMarkers.filter(m => {
    if (m.poiType === type) {
      if (map) map.removeLayer(m.marker);
      return false;
    }
    return true;
  });
}

async function fetchPoiMarkers(type, silent = false, clearOld = false) {
  const cfg = POI_TYPES[type];
  const area = getPoiSearchArea(type);
  if (!cfg || !area) return 0;

  const items = [];
  const seen = new Set();
  const pushItem = (lat, lon, name, desc) => {
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ lat, lon, name, desc });
  };

  // Yerel veritabanındaki tarihi yerler / manzara noktaları (internet olmasa da çalışır)
  if (cfg.localCategories.length) {
    const local = (state.allHistoricPlaces && state.allHistoricPlaces.length ? state.allHistoricPlaces : (window.DEFAULT_HISTORIC_PLACES || []));
    local.filter(p => cfg.localCategories.includes(p.category) && area.contains(p.lat, p.lon))
      .forEach(p => pushItem(p.lat, p.lon, p.name, p.description || ''));
  }

  let onlineError = null;
  if (!area.tooBigForOverpass) {
    try {
    const query = `[out:json][timeout:25];(${cfg.filters.map(f => f + area.clause + ';').join('')});out center 350;`;
    const data = await runOverpass(query);
    (data.elements || []).forEach(el => {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (lat == null || lon == null) return;
      const tags = el.tags || {};
      const name = tags['name:tr'] || tags.name || tags.brand || cfg.title;
      pushItem(lat, lon, name, tags.description || tags.operator || '');
    });
  } catch (err) {
    onlineError = err;
    console.warn('POI çevrimiçi arama başarısız:', err);
  }
  } else {
    onlineError = new Error('Harita çok uzak');
  }

  if (clearOld) removePoiMarkers(type);
  const routeCoords = state.routeData && state.routeData.geometry ? state.routeData.geometry.coordinates : null;

  items.forEach(item => {
    let distKm = null;
    if (routeCoords && routeCoords.length > 0) {
      const d = minDistanceToRoute(item.lat, item.lon, routeCoords);
      if (d !== Infinity) distKm = (d / 1000).toFixed(1);
    }
    item.distKm = distKm;

    const idx = state.poiList.push(item) - 1;
    const radius = type === 'historic' ? 8 : (type === 'fuel' ? 7.5 : 7);
    const marker = L.circleMarker([item.lat, item.lon], {
      radius: radius,
      color: cfg.color,
      fillColor: cfg.fill,
      fillOpacity: 0.95,
      weight: 2
    }).addTo(map);

    let badgeStyle = 'bg-amber-500/20 text-amber-300';
    if (type === 'viewpoint') badgeStyle = 'bg-orange-500/20 text-orange-300';
    else if (type === 'fuel') badgeStyle = 'bg-emerald-500/20 text-emerald-300';
    else if (type === 'cafe') badgeStyle = 'bg-sky-500/20 text-sky-300';

    const safeName = escapeHtml(item.name).replace(/'/g, "\\'");
    marker.bindPopup(`
      <div class="text-xs p-1">
        <div class="flex items-center justify-between mb-1.5 gap-2">
          <strong style="color:${cfg.color}" class="font-bold flex items-center gap-1">${cfg.title}</strong>
          ${distKm ? `<span class="text-[10px] ${badgeStyle} px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">📍 Rotadan ${distKm} km</span>` : ''}
        </div>
        <p class="font-bold text-white text-sm mt-0.5">${escapeHtml(item.name)}</p>
        ${item.desc ? `<p class="text-[11px] text-slate-300 mt-1 leading-relaxed">${escapeHtml(item.desc)}</p>` : ''}
        <div class="flex items-center space-x-1.5 mt-3 pt-2 border-t border-slate-800">
          <button onclick="addPoiToRoute(${item.lat}, ${item.lon}, '${safeName}')" class="text-[10px] bg-brand-600 hover:bg-brand-500 text-white px-2.5 py-1.5 rounded-lg font-semibold shadow-md shadow-brand-600/30">Rotaya Ekle</button>
          <button onclick="setPoiAsEndpoint(${item.lat}, ${item.lon}, '${safeName}', 'start')" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1.5 rounded-lg">Başlangıç</button>
          <button onclick="setPoiAsEndpoint(${item.lat}, ${item.lon}, '${safeName}', 'end')" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1.5 rounded-lg">Varış</button>
        </div>
      </div>
    `);
    state.poiMarkers.push({ poiType: type, marker });
  });

  if (!silent) {
    const where = area.mode === 'route' ? 'rota koridorunda' : 'bu bölgede';
    if (items.length) {
      showToast(`${items.length} adet ${cfg.title.toLowerCase()} ${where} keşfedildi.`, 'ok');
    } else if (area.tooBigForOverpass) {
      showToast('Daha detaylı keşif için haritaya biraz daha yakınlaşın.', 'info');
    } else {
      showToast(`${where[0].toUpperCase() + where.slice(1)} kayıtlı ${cfg.title.toLowerCase()} bulunamadı.`, 'info');
    }
  }
  return items.length;
}

window.poiAction = function(idx, action) {
  const item = state.poiList[idx];
  if (!item) return;
  if (map) map.closePopup();
  if (action === 'via') {
    window.addPoiToRoute(item.lat, item.lon, item.name);
  } else {
    window.setPoiAsEndpoint(item.lat, item.lon, item.name, action);
  }
};

window.addPoiToRoute = function(lat, lon, name) {
  // Boş başlangıç/varış varsa önce onları doldur
  const startWp = state.waypoints.find(w => w.type === 'start');
  const endWp = state.waypoints.find(w => w.type === 'end');
  if (startWp && startWp.lat === null) return window.setPoiAsEndpoint(lat, lon, name, 'start');
  if (endWp && endWp.lat === null) return window.setPoiAsEndpoint(lat, lon, name, 'end');

  const newWp = { id: 'poi_' + Date.now(), type: 'via', name, lat, lon, marker: null };
  // Rotadaki en uygun sıraya ekle (toplam sapmayı en aza indir)
  let bestIdx = state.waypoints.length - 1, bestCost = Infinity;
  for (let i = 1; i < state.waypoints.length; i++) {
    const a = state.waypoints[i - 1], b = state.waypoints[i];
    if (a.lat === null || b.lat === null) continue;
    const cost = haversineMeters(a.lat, a.lon, lat, lon) + haversineMeters(lat, lon, b.lat, b.lon) - haversineMeters(a.lat, a.lon, b.lat, b.lon);
    if (cost < bestCost) { bestCost = cost; bestIdx = i; }
  }
  state.waypoints.splice(bestIdx, 0, newWp);
  updateMarker(newWp);
  renderWaypointsUI();
  calculateRoute();
  showToast(`"${name}" rotaya eklendi.`, 'ok');
};

// Event Listeners Setup
function initEventListeners() {
  // 50 km Rota Analiz Butonu
  const btnAnalyzeCorridor = document.getElementById('btn-analyze-route-pois');
  if (btnAnalyzeCorridor) {
    btnAnalyzeCorridor.addEventListener('click', () => analyzeRouteCorridor(50000, false));
  }

  // Profile Buttons
  document.querySelectorAll('.profile-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.profile-btn').forEach(b => {
        b.classList.remove('bg-brand-600', 'text-white', 'shadow-md', 'shadow-brand-600/30');
        b.classList.add('text-slate-400');
      });
      btn.classList.add('bg-brand-600', 'text-white', 'shadow-md', 'shadow-brand-600/30');
      btn.classList.remove('text-slate-400');

      state.currentProfile = btn.dataset.profile;
      calculateRoute();
    });
  });

  // Tile Buttons
  document.getElementById('tile-dark').addEventListener('click', () => switchTileLayer('dark'));
  document.getElementById('tile-topo').addEventListener('click', () => switchTileLayer('topo'));
  document.getElementById('tile-osm').addEventListener('click', () => switchTileLayer('osm'));
  document.getElementById('tile-sat').addEventListener('click', () => switchTileLayer('sat'));

  // Route Actions
  document.getElementById('btn-add-waypoint').addEventListener('click', addEmptyWaypoint);
  document.getElementById('btn-clear-all').addEventListener('click', clearAll);
  document.getElementById('btn-reverse-route').addEventListener('click', reverseRoute);
  document.getElementById('btn-export-gpx').addEventListener('click', exportGPX);
  document.getElementById('btn-open-gmaps').addEventListener('click', openInGoogleMaps);

  // POI Buttons
  document.getElementById('poi-historic').addEventListener('click', function() { togglePoi('historic', this); });
  document.getElementById('poi-viewpoint').addEventListener('click', function() { togglePoi('viewpoint', this); });
  document.getElementById('poi-fuel').addEventListener('click', function() { togglePoi('fuel', this); });
  document.getElementById('poi-cafe').addEventListener('click', function() { togglePoi('cafe', this); });

  // Historic Places Modal
  const historicModal = document.getElementById('modal-historic-places');
  document.getElementById('btn-historic-places').addEventListener('click', () => {
    loadHistoricPlaces();
    historicModal.classList.remove('hidden');
  });
  document.getElementById('btn-close-historic-places').addEventListener('click', () => {
    historicModal.classList.add('hidden');
  });
  historicModal.addEventListener('click', (e) => {
    if (e.target === historicModal) historicModal.classList.add('hidden');
  });

  // Historic Search Input
  document.getElementById('search-historic-input').addEventListener('input', (e) => {
    filterHistoricPlaces(e.target.value);
  });

  // Region Filter Buttons
  document.querySelectorAll('.region-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.region-filter-btn').forEach(b => {
        b.classList.remove('bg-amber-500/20', 'text-amber-400', 'border', 'border-amber-500/40', 'font-medium');
        b.classList.add('bg-slate-800', 'text-slate-400');
      });
      btn.classList.add('bg-amber-500/20', 'text-amber-400', 'border', 'border-amber-500/40', 'font-medium');
      btn.classList.remove('bg-slate-800', 'text-slate-400');
      state.activeRegionFilter = btn.dataset.region;
      filterHistoricPlaces(document.getElementById('search-historic-input').value);
    });
  });

  // Preset Modal
  const modal = document.getElementById('modal-presets');
  document.getElementById('btn-presets').addEventListener('click', () => modal.classList.remove('hidden'));
  document.getElementById('btn-close-presets').addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  // Mobile Sidebar Toggle
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('btn-toggle-sidebar');
  const toggleIcon = document.getElementById('sidebar-toggle-icon');

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('hidden');
    sidebar.classList.toggle('flex');
    const isHidden = sidebar.classList.contains('hidden');
    toggleIcon.setAttribute('data-lucide', isHidden ? 'panel-left-open' : 'panel-left-close');
    initIcons();
  });

  // Toggle Elevation Panel Minimize
  document.getElementById('btn-toggle-elevation').addEventListener('click', () => {
    const canvasWrap = document.querySelector('#elevation-panel .h-28');
    canvasWrap.classList.toggle('hidden');
  });

  // DATABASE: Saved Routes Modal
  const savedRoutesModal = document.getElementById('modal-saved-routes');
  document.getElementById('btn-open-saved-routes').addEventListener('click', () => {
    loadSavedRoutesFromDb();
    savedRoutesModal.classList.remove('hidden');
  });
  document.getElementById('btn-close-saved-routes').addEventListener('click', () => {
    savedRoutesModal.classList.add('hidden');
  });
  savedRoutesModal.addEventListener('click', (e) => {
    if (e.target === savedRoutesModal) savedRoutesModal.classList.add('hidden');
  });

  // DATABASE: Save Current Route Modal
  const saveRouteModal = document.getElementById('modal-save-route');
  document.getElementById('btn-save-route-modal').addEventListener('click', () => {
    if (!state.routeData) return;
    const startWp = state.waypoints.find(w => w.type === 'start');
    const endWp = state.waypoints.find(w => w.type === 'end');
    const defaultTitle = `${startWp?.name || 'Başlangıç'} &rarr; ${endWp?.name || 'Varış'} Gezisi`;
    document.getElementById('save-route-title').value = defaultTitle.replace('&rarr;', '→');
    saveRouteModal.classList.remove('hidden');
  });
  document.getElementById('btn-close-save-route').addEventListener('click', () => {
    saveRouteModal.classList.add('hidden');
  });
  document.getElementById('btn-cancel-save-route').addEventListener('click', () => {
    saveRouteModal.classList.add('hidden');
  });

  // DATABASE: Form Submit to save route
  document.getElementById('form-save-route').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('save-route-title').value.trim();
    const desc = document.getElementById('save-route-desc').value.trim();
    await saveRouteToDatabase(title, desc);
    saveRouteModal.classList.add('hidden');
  });
}

// DATABASE API OPERATIONS
async function saveRouteToDatabase(title, description) {
  if (!state.routeData) return;

  const validPoints = state.waypoints.filter(w => w.lat !== null && w.lon !== null);
  const payload = {
    title: title || 'Gezi Rotası',
    description: description || '',
    mode: state.currentProfile,
    distance_km: (state.routeData.distance / 1000).toFixed(1),
    duration_seconds: state.routeData.duration,
    curviness_score: calculateCurvinessScore(state.routeData.geometry.coordinates, state.routeData.distance),
    waypoints: validPoints.map(w => ({ id: w.id, type: w.type, name: w.name, lat: w.lat, lon: w.lon })),
    geometry: state.routeData.geometry.coordinates,
    is_favorite: 1
  };

  try {
    const res = await fetch(window.API_BASE + '/api/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert('✅ Rota SQLite veritabanına başarıyla kaydedildi!');
    } else {
      // LocalStorage fallback if server not active
      saveRouteToLocalStorage(payload);
      alert('ℹ️ Rota yerel hafızaya kaydedildi.');
    }
  } catch (err) {
    saveRouteToLocalStorage(payload);
    alert('ℹ️ Rota yerel hafızaya kaydedildi.');
  }
}

function saveRouteToLocalStorage(payload) {
  const existing = JSON.parse(localStorage.getItem('rotam_saved_routes') || '[]');
  payload.id = 'local_' + Date.now();
  payload.created_at = new Date().toISOString();
  existing.unshift(payload);
  localStorage.setItem('rotam_saved_routes', JSON.stringify(existing));
}

async function loadSavedRoutesFromDb() {
  const listContainer = document.getElementById('saved-routes-list');
  listContainer.innerHTML = '<div class="text-center py-6 text-slate-400 text-xs"><i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto mb-2 text-brand-400"></i>Kayıtlı rotalar veritabanından getiriliyor...</div>';
  initIcons();

  let routes = [];

  try {
    const res = await fetch(window.API_BASE + '/api/routes');
    if (res.ok) {
      routes = await res.json();
    }
  } catch (e) {
    // Fallback to local storage
    routes = JSON.parse(localStorage.getItem('rotam_saved_routes') || '[]');
  }

  if (!routes || routes.length === 0) {
    listContainer.innerHTML = `
      <div class="text-center py-8 text-slate-400 text-xs">
        <i data-lucide="map" class="w-8 h-8 mx-auto mb-2 text-slate-600"></i>
        <p class="font-medium text-slate-300">Henüz kayıtlı bir rota yok.</p>
        <p class="text-slate-500 mt-1">Bir rota oluşturup "Rotayı Kaydet" butonuna tıklayarak veritabanına ekleyebilirsiniz.</p>
      </div>
    `;
    initIcons();
    return;
  }

  listContainer.innerHTML = routes.map(r => {
    const durHours = Math.floor((r.duration_seconds || 0) / 3600);
    const durMins = Math.floor(((r.duration_seconds || 0) % 3600) / 60);
    const durStr = durHours > 0 ? `${durHours} sa ${durMins} dk` : `${durMins} dk`;
    const waypoints = r.waypoints || [];

    return `
      <div class="glass-card p-4 rounded-xl border border-slate-800 hover:border-brand-500/40 transition-all flex flex-col justify-between group">
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <h4 class="text-sm font-bold text-white group-hover:text-brand-400 transition-colors">${escapeHtml(r.title)}</h4>
            <div class="flex items-center space-x-1.5">
              <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-500/20 text-brand-400 border border-brand-500/30">
                %${r.curviness_score || 50} Viraj
              </span>
              <button onclick="deleteSavedRoute(${r.id})" class="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors" title="Sil">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
          ${r.description ? `<p class="text-xs text-slate-400 mb-2">${escapeHtml(r.description)}</p>` : ''}
          <div class="text-[11px] text-slate-500 flex items-center space-x-3 mb-3">
            <span>📏 ${r.distance_km} km</span>
            <span>⏱️ ${durStr}</span>
            <span>📍 ${waypoints.length} Durak</span>
          </div>
        </div>
        <div class="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <span class="text-[10px] text-slate-500">${r.created_at ? r.created_at.split('T')[0] : ''}</span>
          <button onclick="loadSavedRouteOntoMap(${r.id})" class="bg-brand-600 hover:bg-brand-500 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-md shadow-brand-600/30 transition-all">
            Haritaya Yükle &rarr;
          </button>
        </div>
      </div>
    `;
  }).join('');

  initIcons();
}

window.deleteSavedRoute = async function(routeId) {
  if (!confirm('Bu rotayı veritabanından silmek istediğinize emin misiniz?')) return;

  try {
    const res = await fetch(window.API_BASE + `/api/routes/${routeId}`, { method: 'DELETE' });
    if (res.ok) {
      loadSavedRoutesFromDb();
      return;
    }
  } catch (e) {}

  // Fallback
  const existing = JSON.parse(localStorage.getItem('rotam_saved_routes') || '[]');
  const filtered = existing.filter(r => r.id != routeId);
  localStorage.setItem('rotam_saved_routes', JSON.stringify(filtered));
  loadSavedRoutesFromDb();
};

window.loadSavedRouteOntoMap = async function(routeId) {
  let route = null;
  try {
    const res = await fetch(window.API_BASE + '/api/routes');
    if (res.ok) {
      const routes = await res.json();
      route = routes.find(r => r.id == routeId);
    }
  } catch (e) {}

  if (!route) {
    const existing = JSON.parse(localStorage.getItem('rotam_saved_routes') || '[]');
    route = existing.find(r => r.id == routeId);
  }

  if (!route || !route.waypoints) return;

  // Clear existing markers
  if (map) {
    state.waypoints.forEach(wp => {
      if (wp.marker) map.removeLayer(wp.marker);
    });
  }

  state.waypoints = route.waypoints.map((pt, idx) => ({
    id: pt.id || (idx === 0 ? 'start' : idx === route.waypoints.length - 1 ? 'end' : 'wp_' + idx),
    type: pt.type || (idx === 0 ? 'start' : idx === route.waypoints.length - 1 ? 'end' : 'via'),
    name: pt.name,
    lat: pt.lat,
    lon: pt.lon,
    marker: null
  }));

  state.waypoints.forEach(updateMarker);
  renderWaypointsUI();
  calculateRoute();

  document.getElementById('modal-saved-routes').classList.add('hidden');
};

// Set POI as Start or End
window.setPoiAsEndpoint = function(lat, lon, name, endpointType) {
  const targetWp = state.waypoints.find(w => w.type === endpointType);
  if (targetWp) {
    targetWp.lat = lat;
    targetWp.lon = lon;
    targetWp.name = name;
    updateMarker(targetWp);
    renderWaypointsUI();
    calculateRoute();
  }
};

// HISTORIC PLACES EXPLORER (TÜRKİYE TARİHİ YERLERİ)
state.allHistoricPlaces = [];
state.activeRegionFilter = 'all';

async function loadHistoricPlaces() {
  const listContainer = document.getElementById('historic-places-list');
  if (window.DEFAULT_HISTORIC_PLACES && window.DEFAULT_HISTORIC_PLACES.length > 0) {
    state.allHistoricPlaces = window.DEFAULT_HISTORIC_PLACES;
    filterHistoricPlaces(document.getElementById('search-historic-input')?.value || '');
  } else if (listContainer) {
    listContainer.innerHTML = '<div class="text-center py-6 text-slate-400 text-xs"><i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400"></i>Tarihi yerler yükleniyor...</div>';
    initIcons();
  }

  try {
    const res = await fetch(window.API_BASE + '/api/places');
    if (res.ok) {
      const dbPlaces = await res.json();
      const defaultPlaces = window.DEFAULT_HISTORIC_PLACES || [];
      const combined = [...defaultPlaces];
      
      dbPlaces.forEach(up => {
        if (!combined.some(dp => dp.name === up.name)) {
          combined.push(up);
        }
      });
      
      state.allHistoricPlaces = combined;
      filterHistoricPlaces(document.getElementById('search-historic-input')?.value || '');
    }
  } catch (e) {
    console.warn('Using cached places data');
  }
}

function filterHistoricPlaces(query) {
  const q = (query || '').toLowerCase().trim();
  const listContainer = document.getElementById('historic-places-list');
  const region = state.activeRegionFilter || 'all';

  let filtered = state.allHistoricPlaces;

  if (region !== 'all') {
    filtered = filtered.filter(p => {
      const desc = (p.description || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const combined = `${name} ${desc}`;

      if (region === 'Ege') {
        return ['ege', 'izmir', 'aydın', 'muğla', 'denizli', 'manisa', 'uşak', 'kütahya', 'milas', 'selçuk', 'didim', 'datça', 'fethiye', 'seydikemer', 'bergama', 'assos', 'karia', 'iyonya', 'knidos', 'labranda', 'alinda', 'stratoni', 'nysa', 'priene', 'milet', 'sardes', 'aizanoi', 'blaundos', 'clandras', 'kaunos', 'tlos', 'pinara', 'çeşme', 'urla', 'bodrum', 'kuşadası', 'torbalı', 'tire', 'ödemiş', 'erythrai', 'klazomenai', 'seferihisar', 'sığacık', 'dikili', 'çandarlı', 'bornova', 'konak', 'karpuzlu', 'çine', 'sultanhisar', 'germencik', 'ortaklar', 'bafa', 'kapıkırı', 'beçin', 'yatağan', 'kayaköy', 'buldan', 'yenicekent', 'salihli', 'kula', 'çavdarhisar', 'ulubey', 'karahallı'].some(k => combined.includes(k));
      }
      if (region === 'Akdeniz') {
        return ['akdeniz', 'antalya', 'burdur', 'isparta', 'mersin', 'adana', 'osmaniye', 'hatay', 'kaş', 'kemer', 'demre', 'anamur', 'silifke', 'alanya', 'sagalassos', 'kibyra', 'termessos', 'adada', 'selge', 'arykanda', 'patara', 'xanthos', 'letoon', 'myra', 'phaselis', 'aspendos', 'simena', 'kekova', 'anemurium', 'mamure', 'kanlıdivane', 'uzuncaburç', 'kızkalesi', 'cennet', 'anavarza', 'yılankale', 'karatepe', 'titus', 'gölhisar', 'ağlasun', 'bucak', 'çamlık', 'sütçüler', 'yalvaç', 'korkuteli', 'aksu', 'serik', 'belkıs', 'manavgat', 'köprülü', 'kumluca', 'çıralı', 'finike', 'elmalı', 'üçağız', 'kınık', 'seki', 'gazipaşa', 'bozyazı', 'aydıncık', 'narlıkuyu', 'erdemli', 'ayaş', 'mezitli', 'tarsus', 'kozan', 'ceyhan', 'seyhan', 'yüreğir', 'kadirli', 'düziçi', 'toprakkale', 'samandağ', 'çevlik', 'antakya', 'belen', 'payas', 'dörtyol'].some(k => combined.includes(k));
      }
      if (region === 'İç Anadolu') {
        return ['iç anadolu', 'kapadokya', 'konya', 'ankara', 'çorum', 'sivas', 'eskişehir', 'afyon', 'aksaray', 'nevşehir', 'kayseri', 'karaman', 'niğde', 'göreme', 'midas', 'yazılıkaya', 'ayazini', 'pessinus', 'sivrihisar', 'hattuşa', 'alacahöyük', 'gordion', 'çatalhöyük', 'ihlara', 'selime', 'derinkuyu', 'kaymaklı', 'soğanlı', 'kültepe', 'sultanhanı', 'alahan', 'binbirkilise', 'taşkale', 'eflatunpınar', 'kilistra', 'divriği', 'avanos', 'ürgüp', 'uçhisar', 'ortahisar', 'özkonak', 'mazı', 'güzelyurt', 'aşıklı', 'gülağaç', 'ağzıkarahan', 'saratlı', 'yeşilhisar', 'kocasinan', 'gümüşler', 'bor', 'kemerhisar', 'çumra', 'karatay', 'meram', 'gökyurt', 'beyşehir', 'fasıllar', 'selçuklu', 'sille', 'manazan', 'yeşildere', 'mut', 'polatlı', 'yassıhöyük', 'altındağ', 'ulus', 'çankaya', 'haymana', 'boğazkale', 'alaca', 'ortaköy', 'şapinuva', 'han', 'ihsaniye', 'dumlupınar'].some(k => combined.includes(k));
      }
      if (region === 'Marmara') {
        return ['marmara', 'trakya', 'çanakkale', 'edirne', 'bursa', 'balıkesir', 'kırklareli', 'tekirdağ', 'sakarya', 'düzce', 'kocaeli', 'gelibolu', 'şehitlik', 'truva', 'troas', 'parion', 'kyzikos', 'daskyleion', 'gölyazı', 'tirilye', 'iznik', 'cumalıkızık', 'justinianus', 'prusias', 'konuralp', 'selimiye', 'uzunköprü', 'kıyıköy', 'bolu', 'istanbul', 'fatih', 'sarayburnu', 'sultanahmet', 'gülhane', 'beyoğlu', 'galata', 'sarıyer', 'rumeli hisarı', 'beykoz', 'anadolu hisarı', 'yedikule', 'kariye', 'üsküdar', 'kız kulesi', 'beşiktaş', 'dolmabahçe', 'sultanbeyli', 'aydos', 'bilecik', 'söğüt', 'taraklı', 'izmit', 'eceabat', 'seddülbahir', 'kilitbahir', 'tevfikiye', 'babakale', 'ayvacık', 'erdek', 'bandırma', 'ergili', 'edremit', 'altınoluk', 'akçakoca', 'vize'].some(k => combined.includes(k));
      }
      if (region === 'Karadeniz') {
        return ['karadeniz', 'trabzon', 'rize', 'artvin', 'gümüşhane', 'amasya', 'sinop', 'kastamonu', 'karabük', 'bartın', 'zonguldak', 'ordu', 'giresun', 'samsun', 'sümela', 'vazelon', 'zilkale', 'şenyuva', 'fırtına', 'santa', 'imera', 'kuşkayası', 'amasra', 'hadrianapolis', 'safranbolu', 'mahmut bey', 'boyabat', 'yason', 'şavşat', 'işhan', 'ovit', 'maçka', 'altındere', 'esiroğlu', 'kuştul', 'ortahisar', 'çamlıhemşin', 'pazar', 'hemşin', 'cevizli', 'yusufeli', 'barhal', 'parhali', 'altıparmak', 'tekkale', 'dörtkilise', 'dumanlı', 'olucak', 'krom', 'eskipazar', 'kasaba', 'şebinkarahisar', 'bayadı', 'kurul', 'tokat', 'zile', 'niksar', 'ballıca', 'bayburt', 'baksı'].some(k => combined.includes(k));
      }
      if (region === 'Doğu & Güneydoğu') {
        return ['doğu', 'güneydoğu', 'mezopotamya', 'urfa', 'şanlıurfa', 'mardin', 'diyarbakır', 'gaziantep', 'adıyaman', 'batman', 'şırnak', 'van', 'kars', 'ağrı', 'erzurum', 'erzincan', 'ardahan', 'bitlis', 'elazığ', 'çıldır', 'şeytan kalesi', 'ani', 'ishak paşa', 'öşk vank', 'çobandede', 'kemaliye', 'tuşpa', 'çavuştepe', 'hoşap', 'ayanis', 'akdamar', 'ahlat', 'nemrut', 'harput', 'palu', 'göbeklitepe', 'karahantepe', 'harran', 'şuayb', 'soğmatar', 'halfeti', 'rumkale', 'zeugma', 'yesemek', 'cendere', 'arsemia', 'perre', 'dara', 'mor gabriel', 'mor evgin', 'zerzevan', 'malabadi', 'hasankeyf', 'finik', 'cizre', 'arpaçay', 'yıldırımtepe', 'doğubayazıt', 'uzundere', 'çamlıyamaç', 'köprüköy', 'yakutiye', 'tercan', 'ipekyolu', 'gevaş', 'gürpınar', 'güzelsu', 'örencik', 'haliliye', 'eyyübiye', 'yağmurlu', 'yavuzeli', 'nizip', 'belkıs', 'islahiye', 'kahta', 'kocahisar', 'örenli', 'artuklu', 'oğuz', 'midyat', 'güngören', 'nusaybin', 'çınar', 'demirölçek', 'sur', 'silvan', 'malatya', 'battalgazi', 'kahramanmaraş', 'birecik', 'hakkari', 'tunceli', 'çemişgezek', 'pertek', 'kemah', 'muş', 'malazgirt', 'sarıkamış'].some(k => combined.includes(k));
      }
      return true;
    });
  }

  if (q) {
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.description && p.description.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div class="text-center py-8 text-slate-400 text-xs">
        <i data-lucide="compass" class="w-8 h-8 mx-auto mb-2 text-slate-600"></i>
        <p class="font-medium text-slate-300">"${escapeHtml(q)}" ile eşleşen yerel kayıt bulunamadı.</p>
        <p class="text-slate-500 mt-1 mb-3">Harita arama kutusuna yazarak OpenStreetMap üzerinden Türkiye'deki tüm tarihi mekanları haritada aratabilirsiniz.</p>
        <button onclick="searchAndFlyToHistoricPlace('${escapeHtml(q).replace(/'/g, "\\'")}')" class="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-600/30">
          🔍 Haritada Canlı Ara
        </button>
      </div>
    `;
    initIcons();
    return;
  }

  // Header count indicator
  const countBadge = `<div class="text-[11px] text-amber-400 font-semibold mb-2 flex items-center justify-between">
    <span>Toplam <strong>${filtered.length}</strong> tarihi mekan ve keşif noktası listeleniyor</span>
    <span class="text-slate-500 text-[10px]">Tüm Türkiye genelinden</span>
  </div>`;

  listContainer.innerHTML = countBadge + filtered.map(p => `
    <div class="glass-card p-3.5 rounded-xl border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between group">
      <div class="flex items-start justify-between mb-1.5">
        <div>
          <div class="flex items-center space-x-2">
            <span class="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">${escapeHtml(p.name)}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              ${p.category === 'historic' ? '🏛️ Tarihi Eser / Antik Kent' : p.category === 'mountain_pass' ? '⛰️ Dağ Geçidi' : '👁️ Seyir Terası'}
            </span>
          </div>
          <p class="text-xs text-slate-300 mt-1 leading-relaxed">${escapeHtml(p.description || '')}</p>
        </div>
      </div>
      <div class="flex items-center justify-between pt-2.5 mt-1 border-t border-slate-800/80 text-[11px]">
        <button onclick="flyToHistoricSpot(${p.lat}, ${p.lon}, '${escapeHtml(p.name).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;')}')" class="text-slate-400 hover:text-white flex items-center space-x-1 transition-colors">
          <i data-lucide="locate" class="w-3.5 h-3.5 text-amber-400"></i>
          <span>Haritada Gör</span>
        </button>
        <div class="flex items-center space-x-1.5">
          <button onclick="addHistoricSpotToRoute(${p.lat}, ${p.lon}, '${escapeHtml(p.name).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;')}', 'start')" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium">
            Başlangıç Yap
          </button>
          <button onclick="addHistoricSpotToRoute(${p.lat}, ${p.lon}, '${escapeHtml(p.name).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;')}', 'via')" class="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-semibold shadow-md shadow-amber-600/30">
            Rotaya Ekle
          </button>
          <button onclick="addHistoricSpotToRoute(${p.lat}, ${p.lon}, '${escapeHtml(p.name).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;')}', 'end')" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium">
            Varış Yap
          </button>
        </div>
      </div>
    </div>
  `).join('');

  initIcons();
}

window.flyToHistoricSpot = function(lat, lon, name) {
  document.getElementById('modal-historic-places').classList.add('hidden');
  if (!map || typeof L === 'undefined') {
    alert('Harita servisi yükleniyor, lütfen birkaç saniye sonra tekrar deneyin.');
    return;
  }
  map.flyTo([lat, lon], 14, { duration: 1.5 });

  const customMarker = L.circleMarker([lat, lon], {
    radius: 9,
    color: '#ffffff',
    fillColor: '#f59e0b',
    fillOpacity: 1,
    weight: 3
  }).addTo(map);

  customMarker.bindPopup(`
    <div class="text-xs">
      <strong class="text-amber-400">🏛️ Tarihi Yer</strong>
      <p class="font-bold text-white mt-1">${escapeHtml(name)}</p>
      <div class="flex items-center space-x-1.5 mt-2">
        <button onclick="addHistoricSpotToRoute(${lat}, ${lon}, '${escapeHtml(name).replace(/'/g, "\\'")}', 'via')" class="text-[10px] bg-brand-600 hover:bg-brand-500 text-white px-2 py-1 rounded">
          Rotaya Ekle
        </button>
      </div>
    </div>
  `).openPopup();
};

window.addHistoricSpotToRoute = function(lat, lon, name, type) {
  const startWp = state.waypoints.find(w => w.type === 'start');
  const endWp = state.waypoints.find(w => w.type === 'end');

  if (type === 'start') {
    if (startWp) {
      startWp.lat = lat;
      startWp.lon = lon;
      startWp.name = name;
      updateMarker(startWp);
    }
  } else if (type === 'end') {
    if (endWp) {
      endWp.lat = lat;
      endWp.lon = lon;
      endWp.name = name;
      updateMarker(endWp);
    }
  } else {
    // 'via' veya akıllı rota ekleme:
    if (startWp && startWp.lat === null) {
      startWp.lat = lat;
      startWp.lon = lon;
      startWp.name = name;
      updateMarker(startWp);
    } else if (endWp && endWp.lat === null) {
      endWp.lat = lat;
      endWp.lon = lon;
      endWp.name = name;
      updateMarker(endWp);
    } else {
      const newWp = {
        id: 'historic_' + Date.now(),
        type: 'via',
        name: name,
        lat: lat,
        lon: lon,
        marker: null
      };
      // Rotadaki en uygun sıraya ekle (toplam sapmayı en aza indir)
      let bestIdx = state.waypoints.length - 1, bestCost = Infinity;
      for (let i = 1; i < state.waypoints.length; i++) {
        const a = state.waypoints[i - 1], b = state.waypoints[i];
        if (a.lat === null || b.lat === null) continue;
        const cost = haversineMeters(a.lat, a.lon, lat, lon) + haversineMeters(lat, lon, b.lat, b.lon) - haversineMeters(a.lat, a.lon, b.lat, b.lon);
        if (cost < bestCost) { bestCost = cost; bestIdx = i; }
      }
      state.waypoints.splice(bestIdx, 0, newWp);
      updateMarker(newWp);
    }
  }

  renderWaypointsUI();
  calculateRoute();
  const modal = document.getElementById('modal-historic-places');
  if (modal) modal.classList.add('hidden');
  showToast(`"${name}" rotaya eklendi.`, 'ok');
};

window.searchAndFlyToHistoricPlace = async function(query) {
  if (!query) return;
  document.getElementById('modal-historic-places').classList.add('hidden');
  const results = await searchLocation(query + ' Türkiye');
  if (results && results.length > 0) {
    const r = results[0];
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.lon);
    flyToHistoricSpot(lat, lon, r.display_name.split(',')[0]);
  } else {
    alert('Aranan tarihi yer bulunamadı. Lütfen tam adını yazınız.');
  }
};

// Otomatik test modu (yalnızca ?selftest ile)
if (location.search.includes("selftest")) {
  const st = document.createElement("script");
  st.src = "selftest.js?v=" + Date.now();
  document.body.appendChild(st);
}

function fallbackToIpLocation(wp, inputEl) {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(async data => {
        if (data.latitude && data.longitude) {
          wp.lat = data.latitude;
          wp.lon = data.longitude;
          wp.name = data.city ? data.city + " (Tahmini)" : "Mevcut Konumum (IP)";
          
          const addr = await reverseGeocode(wp.lat, wp.lon);
          if (addr) wp.name = addr;
          
          updateMarker(wp);
          renderWaypointsUI();
          calculateRoute();
          map.setView([wp.lat, wp.lon], 13);
          showToast("Konumunuz ağ (IP) üzerinden tahmini olarak bulundu.", "success");
        } else {
          throw new Error("Invalid IP data");
        }
      })
      .catch(err => {
        console.error("IP Location Error: ", err);
        showToast("Konum alınamadı. Lütfen manuel giriniz.", "error");
        if (inputEl) inputEl.value = wp.name || "";
      });
}

// YENI YER EKLEME LOGIC
let pendingNewPlace = { lat: null, lon: null };
document.addEventListener('DOMContentLoaded', () => {
    const btnShowAdd = document.getElementById('btn-show-add-place');
    const formContainer = document.getElementById('add-place-form-container');
    const btnCancel = document.getElementById('btn-cancel-add-place');
    const btnGetCenter = document.getElementById('btn-get-map-center');
    const btnSave = document.getElementById('btn-save-new-place');

    if(btnShowAdd) {
        btnShowAdd.addEventListener('click', () => {
            formContainer.classList.remove('hidden');
        });
    }
    
    if(btnCancel) {
        btnCancel.addEventListener('click', () => {
            formContainer.classList.add('hidden');
        });
    }

    if(btnGetCenter) {
        btnGetCenter.addEventListener('click', () => {
            if(!map) return;
            const center = map.getCenter();
            pendingNewPlace.lat = center.lat;
            pendingNewPlace.lon = center.lng;
            document.getElementById('new-place-lat').textContent = center.lat.toFixed(5);
            document.getElementById('new-place-lon').textContent = center.lng.toFixed(5);
            showToast("Haritanın tam ortasındaki koordinatlar alındı.", "ok");
        });
    }

    if(btnSave) {
        btnSave.addEventListener('click', async () => {
            const name = document.getElementById('new-place-name').value.trim();
            const cat = document.getElementById('new-place-category').value;
            const desc = document.getElementById('new-place-desc').value.trim();
            
            if(!name) { showToast("Lütfen bir yer adı girin.", "error"); return; }
            if(!pendingNewPlace.lat || !pendingNewPlace.lon) { showToast("Lütfen Harita Ortasından Al butonuna basarak konum belirleyin.", "error"); return; }

            btnSave.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i>';
            initIcons();
            
            try {
                const res = await fetch(window.API_BASE + '/api/places', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: name,
                        category: cat,
                        lat: pendingNewPlace.lat,
                        lon: pendingNewPlace.lon,
                        description: desc,
                        rating: 5
                    })
                });
                
                if(res.ok) {
                    showToast("Harika! Yeni yer başarıyla kaydedildi.", "success");
                    formContainer.classList.add('hidden');
                    document.getElementById('new-place-name').value = '';
                    document.getElementById('new-place-desc').value = '';
                    pendingNewPlace = { lat: null, lon: null };
                    document.getElementById('new-place-lat').textContent = '-';
                    document.getElementById('new-place-lon').textContent = '-';
                    
                    // Listeyi yenile
                    loadHistoricPlaces();
                } else {
                    showToast("Kaydedilirken bir hata oluştu.", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Sunucuya bağlanılamadı.", "error");
            } finally {
                btnSave.textContent = "Kaydet";
            }
        });
    }
});

// 50 KM GÜZERGAH KORİDORU ANALİZİ & TÜM POI'LERİ İŞARETLEME
async function analyzeRouteCorridor(radiusMeters = 50000, isAuto = false) {
  if (!state.routeData || !state.routeData.geometry || !state.routeData.geometry.coordinates) {
    if (!isAuto) showToast('Lütfen önce başlangıç ve varış noktası seçerek bir rota oluşturun.', 'info');
    return;
  }

  const btnAnalyze = document.getElementById('btn-analyze-route-pois');
  if (btnAnalyze && !isAuto) {
    btnAnalyze.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>50 km Koridoru Taranıyor...</span>';
    initIcons();
  }

  // Önceki POI katmanlarını temizle
  removePoiMarkers('historic');
  removePoiMarkers('viewpoint');
  removePoiMarkers('fuel');
  removePoiMarkers('cafe');
  state.activePoiTypes.clear();

  const coords = state.routeData.geometry.coordinates;
  const localPlaces = (state.allHistoricPlaces && state.allHistoricPlaces.length) ? state.allHistoricPlaces : (window.DEFAULT_HISTORIC_PLACES || []);
  
  let historicCount = 0;
  let viewpointCount = 0;
  let fuelCount = 0;
  let cafeCount = 0;
  const seenKeys = new Set();
  const addedMarkers = [];

  function addCorridorMarker(p, poiType, distKm) {
    const key = `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);

    if (poiType === 'fuel') fuelCount++;
    else if (poiType === 'cafe') cafeCount++;
    else if (poiType === 'viewpoint') viewpointCount++;
    else historicCount++;

    const cfg = POI_TYPES[poiType] || POI_TYPES.historic;
    const item = {
      lat: p.lat,
      lon: p.lon,
      name: p.name,
      desc: p.description || '',
      category: poiType,
      distKm: distKm
    };

    const idx = state.poiList.push(item) - 1;
    const radius = (poiType === 'historic') ? 8 : (poiType === 'fuel' ? 7.5 : 7);
    const marker = L.circleMarker([p.lat, p.lon], {
      radius: radius,
      color: cfg.color,
      fillColor: cfg.fill,
      fillOpacity: 0.95,
      weight: 2
    }).addTo(map);

    let badgeStyle = 'bg-amber-500/20 text-amber-300';
    if (poiType === 'viewpoint') badgeStyle = 'bg-orange-500/20 text-orange-300';
    else if (poiType === 'fuel') badgeStyle = 'bg-emerald-500/20 text-emerald-300';
    else if (poiType === 'cafe') badgeStyle = 'bg-sky-500/20 text-sky-300';

    const safeName = escapeHtml(p.name).replace(/'/g, "\\'");
    marker.bindPopup(`
      <div class="text-xs p-1">
        <div class="flex items-center justify-between mb-1.5 gap-2">
          <strong style="color:${cfg.color}" class="font-bold flex items-center gap-1">${cfg.title}</strong>
          <span class="text-[10px] ${badgeStyle} px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">📍 Rotadan ${distKm} km</span>
        </div>
        <p class="font-bold text-white text-sm mt-0.5">${escapeHtml(p.name)}</p>
        ${item.desc ? `<p class="text-[11px] text-slate-300 mt-1 leading-relaxed">${escapeHtml(item.desc)}</p>` : ''}
        <div class="flex items-center space-x-1.5 mt-3 pt-2 border-t border-slate-800">
          <button onclick="addPoiToRoute(${p.lat}, ${p.lon}, '${safeName}')" class="text-[10px] bg-brand-600 hover:bg-brand-500 text-white px-2.5 py-1.5 rounded-lg font-semibold shadow-md shadow-brand-600/30">
            Rotaya Ekle
          </button>
          <button onclick="setPoiAsEndpoint(${p.lat}, ${p.lon}, '${safeName}', 'start')" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1.5 rounded-lg">
            Başlangıç
          </button>
          <button onclick="setPoiAsEndpoint(${p.lat}, ${p.lon}, '${safeName}', 'end')" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1.5 rounded-lg">
            Varış
          </button>
        </div>
      </div>
    `);

    state.poiMarkers.push({ poiType, marker });
    addedMarkers.push(marker);
    return true;
  }

  // 1) Yerel veritabanını anında ekle (0 gecikme)
  localPlaces.forEach(p => {
    const distMeters = minDistanceToRoute(p.lat, p.lon, coords);
    if (distMeters <= radiusMeters) {
      const distKm = (distMeters / 1000).toFixed(1);
      let poiType = 'historic';
      if (p.category === 'fuel') poiType = 'fuel';
      else if (p.category === 'cafe' || p.category === 'rest_area') poiType = 'cafe';
      else if (p.category === 'viewpoint' || p.category === 'mountain_pass') poiType = 'viewpoint';
      addCorridorMarker(p, poiType, distKm);
    }
  });

  function updateCorridorDisplay() {
    state.activePoiTypes.add('historic');
    state.activePoiTypes.add('viewpoint');
    state.activePoiTypes.add('fuel');
    state.activePoiTypes.add('cafe');

    const btnH = document.getElementById('poi-historic');
    const btnV = document.getElementById('poi-viewpoint');
    const btnF = document.getElementById('poi-fuel');
    const btnC = document.getElementById('poi-cafe');
    if (btnH) setPoiButtonState(btnH, true, false);
    if (btnV) setPoiButtonState(btnV, true, false);
    if (btnF) setPoiButtonState(btnF, true, false);
    if (btnC) setPoiButtonState(btnC, true, false);

    const totalCorridor = historicCount + viewpointCount + fuelCount + cafeCount;
    const badge = document.getElementById('corridor-analysis-badge');
    const totalCountEl = document.getElementById('corridor-total-count');
    const histCountEl = document.getElementById('corridor-historic-count');
    const viewCountEl = document.getElementById('corridor-viewpoint-count');
    const fuelCountEl = document.getElementById('corridor-fuel-count');
    const cafeCountEl = document.getElementById('corridor-cafe-count');

    if (badge) badge.classList.remove('hidden');
    if (totalCountEl) totalCountEl.textContent = `${totalCorridor} Nokta`;
    if (histCountEl) histCountEl.textContent = historicCount;
    if (viewCountEl) viewCountEl.textContent = viewpointCount;
    if (fuelCountEl) fuelCountEl.textContent = fuelCount;
    if (cafeCountEl) cafeCountEl.textContent = cafeCount;

    if (btnAnalyze) {
      btnAnalyze.innerHTML = '<i data-lucide="compass" class="w-4 h-4"></i><span>Rotayı Yeniden Analiz Et (50 km)</span>';
      initIcons();
    }
  }

  updateCorridorDisplay();

  state.corridorHiddenCategories = {};
  ['historic', 'viewpoint', 'fuel', 'cafe'].forEach(c => {
    const pill = document.getElementById('pill-filter-' + c);
    if (pill) {
      pill.classList.remove('opacity-40', 'line-through', 'border-dashed', 'bg-slate-950/40');
      pill.classList.add('bg-slate-900/90');
    }
  });

  const totalCorridor = historicCount + viewpointCount + fuelCount + cafeCount;
  showToast(`🎯 50 km Koridoru: ${totalCorridor} nokta bulundu (${historicCount} Tarihi, ${viewpointCount} Manzara, ${fuelCount} Benzinlik, ${cafeCount} Mola)`, 'ok');

  // 2) Canlı OpenStreetMap Benzinlik ve Dinlenme Tesisi Taraması (Arka Planda)
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  coords.forEach(pt => {
    minLat = Math.min(minLat, pt[1]);
    maxLat = Math.max(maxLat, pt[1]);
    minLon = Math.min(minLon, pt[0]);
    maxLon = Math.max(maxLon, pt[0]);
  });
  // ~0.06 deg buffer (~6-7 km corridor around route for live stations)
  minLat -= 0.06; maxLat += 0.06; minLon -= 0.06; maxLon += 0.06;
  const bbox = `${minLat.toFixed(5)},${minLon.toFixed(5)},${maxLat.toFixed(5)},${maxLon.toFixed(5)}`;

  (async () => {
    try {
      const q = `[out:json][timeout:20];(node["amenity"="fuel"](${bbox});node["highway"="services"](${bbox}););out 150;`;
      const data = await runOverpass(q);
      if (data && data.elements && data.elements.length > 0) {
        let addedLive = 0;
        data.elements.forEach(el => {
          const lat = el.lat ?? el.center?.lat;
          const lon = el.lon ?? el.center?.lon;
          if (lat == null || lon == null) return;
          const distMeters = minDistanceToRoute(lat, lon, coords);
          // Rota koridorunda 10 km içerisindeki tüm gerçek benzinlikler
          if (distMeters <= 10000) {
            const distKm = (distMeters / 1000).toFixed(1);
            const tags = el.tags || {};
            const isService = tags.highway === 'services';
            const poiType = isService ? 'cafe' : 'fuel';
            const brand = tags.brand || tags.operator || tags.name || (isService ? 'Karayolu Dinlenme Tesisi' : 'Akaryakıt İstasyonu');
            const name = tags['name:tr'] || tags.name || brand;
            const desc = tags.operator ? `İşletmeci: ${tags.operator}` : (tags.brand ? `Marka: ${tags.brand}` : '24 Saat Açık İstasyon');
            if (addCorridorMarker({ lat, lon, name, description: desc }, poiType, distKm)) {
              addedLive++;
            }
          }
        });
        if (addedLive > 0) {
          updateCorridorDisplay();
        }
      }
    } catch (e) {
      console.warn('Canlı benzinlik araması arka plan notu:', e);
    }
  })();
}

window.toggleCorridorCategory = function(cat) {
  state.corridorHiddenCategories = state.corridorHiddenCategories || {};
  state.corridorHiddenCategories[cat] = !state.corridorHiddenCategories[cat];
  const isHidden = state.corridorHiddenCategories[cat];

  state.poiMarkers.forEach(m => {
    if (m.poiType === cat) {
      if (isHidden) {
        if (map && map.hasLayer(m.marker)) map.removeLayer(m.marker);
      } else {
        if (map && !map.hasLayer(m.marker)) m.marker.addTo(map);
      }
    }
  });

  const pill = document.getElementById('pill-filter-' + cat);
  if (pill) {
    if (isHidden) {
      pill.classList.add('opacity-40', 'line-through', 'border-dashed');
      pill.classList.remove('bg-slate-900/90');
      pill.classList.add('bg-slate-950/40');
    } else {
      pill.classList.remove('opacity-40', 'line-through', 'border-dashed', 'bg-slate-950/40');
      pill.classList.add('bg-slate-900/90');
    }
  }
};

window.clearAllPoiMarkers = function() {
  state.activePoiTypes.clear();
  state.poiMarkers.forEach(m => { if (map) map.removeLayer(m.marker); });
  state.poiMarkers = [];
  state.poiList = [];
  document.querySelectorAll('.poi-toggle').forEach(btn => setPoiButtonState(btn, false, false));
  document.getElementById('corridor-analysis-badge')?.classList.add('hidden');
  showToast('Haritadaki tüm keşif işaretçileri temizlendi.', 'info');
};

window.focusAllCorridorPois = function() {
  if (!map || state.poiMarkers.length === 0) return;
  const activeMarkers = state.poiMarkers.filter(m => map.hasLayer(m.marker)).map(m => m.marker);
  if (activeMarkers.length === 0) return;
  const group = new L.featureGroup(activeMarkers);
  if (routePolyline) group.addLayer(routePolyline);
  map.fitBounds(group.getBounds(), { padding: [40, 40] });
};
