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

// Robust App Bootstrap - runs immediately so all buttons and UI are active
function startApp() {
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

// ROUTING CALCULATION ENGINE
async function calculateRoute() {
  const validPoints = state.waypoints.filter(w => w.lat !== null && w.lon !== null);
  if (validPoints.length < 2) {
    clearRouteDisplay();
    return;
  }

  showRoutingLoading(true);

  try {
    // Construct coordinate string for OSRM: lon,lat;lon,lat;...
    const coordsStr = validPoints.map(p => `${p.lon},${p.lat}`).join(';');
    
    // OSRM public routing server with alternatives
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&steps=true&annotations=distance,duration&alternatives=3`;

    const response = await fetch(osrmUrl);
    if (!response.ok) throw new Error('Rota servisine erişilemedi');

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      alert('Seçilen noktalar arasında uygun bir yol bulunamadı.');
      return;
    }

    // YOL TERCİHLERİ (ROUTE PREFERENCES) LOGIC
    let bestRoute = data.routes[0];
    
    if (data.routes.length > 1) {
      if (state.currentProfile === 'twisty') {
        // En virajlı rotayı bul (Find the route with the highest curviness score)
        let maxScore = -1;
        data.routes.forEach(r => {
          const score = calculateCurvinessScore(r.geometry.coordinates, r.distance);
          if (score > maxScore) {
            maxScore = score;
            bestRoute = r;
          }
        });
      } else if (state.currentProfile === 'fastest') {
        // En hızlı rotayı bul (Find the route with the lowest duration)
        let minDuration = Infinity;
        data.routes.forEach(r => {
          if (r.duration < minDuration) {
            minDuration = r.duration;
            bestRoute = r;
          }
        });
      } else if (state.currentProfile === 'scenic') {
        // Keyifli rota: Mesafe olarak en uzun veya orta karar virajlı olanı (en manzaralı olan genelde daha uzun sahil/dağ yoludur)
        let maxDist = -1;
        data.routes.forEach(r => {
          if (r.distance > maxDist) {
            maxDist = r.distance;
            bestRoute = r;
          }
        });
      }
    }

    const route = bestRoute;
    state.routeData = route;

    // Haritada rotayı çiz
    drawRouteOnMap(route.geometry.coordinates);

    // İstatistikleri ve viraj puanını hesapla
    displayRouteStats(route);

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

  // Update Fuel & Cost Estimation
  const fuelLiters = ((route.distance / 1000) * (state.fuelConsumption / 100)).toFixed(1);
  const fuelCost = Math.round(fuelLiters * state.fuelPricePerLiter);
  document.getElementById('stat-fuel-liters').textContent = `${fuelLiters} L`;
  document.getElementById('stat-fuel-cost').textContent = fuelCost;

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
  if (coords.length < 5 || totalDistanceMeters < 500) return 50;

  let totalAngleChange = 0;
  let sampleCount = 0;

  // Sample every few steps to detect road heading changes
  const step = Math.max(1, Math.floor(coords.length / 300));

  for (let i = step; i < coords.length - step; i += step) {
    const p1 = coords[i - step];
    const p2 = coords[i];
    const p3 = coords[i + step];

    const bearing1 = getBearing(p1[1], p1[0], p2[1], p2[0]);
    const bearing2 = getBearing(p2[1], p2[0], p3[1], p3[0]);

    let diff = Math.abs(bearing2 - bearing1);
    if (diff > 180) diff = 360 - diff;

    // Filter out minor GPS noise (< 10 degrees)
    if (diff > 10) {
      totalAngleChange += diff;
      sampleCount++;
    }
  }

  // Degrees of turn per kilometer
  const km = totalDistanceMeters / 1000;
  const turnsPerKm = totalAngleChange / Math.max(km, 1);

  // Normalize to 1-100 score
  // ~150 deg/km is typical straight highway; ~1000+ deg/km is extreme mountain pass
  let score = Math.round((turnsPerKm / 900) * 100);
  score = Math.max(15, Math.min(99, score));
  return score;
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

// POINTS OF INTEREST (POI / OVERPASS API)
async function togglePoi(type, button) {
  if (state.activePoiTypes.has(type)) {
    state.activePoiTypes.delete(type);
    button.classList.remove('border-brand-500', 'text-brand-400', 'bg-brand-500/10');
    button.classList.add('bg-slate-950', 'text-slate-300');
    removePoiMarkers(type);
  } else {
    // Zoom check before fetching
    if (map.getZoom() < 10) {
      alert("Bu alan çok geniş! Keşif noktalarını yükleyebilmek için lütfen haritaya biraz daha yakınlaşın.");
      return;
    }
    
    // UI Loading state
    const originalHtml = button.innerHTML;
    button.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 mb-1 text-brand-400 animate-spin"></i><span>Aranıyor...</span>`;
    initIcons();
    
    state.activePoiTypes.add(type);
    button.classList.add('border-brand-500', 'text-brand-400', 'bg-brand-500/10');
    button.classList.remove('bg-slate-950', 'text-slate-300');
    
    const success = await fetchPoiMarkers(type);
    
    // Restore UI
    button.innerHTML = originalHtml;
    initIcons();
    
    if (!success) {
      state.activePoiTypes.delete(type);
      button.classList.remove('border-brand-500', 'text-brand-400', 'bg-brand-500/10');
      button.classList.add('bg-slate-950', 'text-slate-300');
    }
  }
}

function removePoiMarkers(type) {
  state.poiMarkers = state.poiMarkers.filter(m => {
    if (m.poiType === type) {
      map.removeLayer(m.marker);
      return false;
    }
    return true;
  });
}

async function fetchPoiMarkers(type) {
  const bounds = map.getBounds();
  const south = bounds.getSouth();
  const west = bounds.getWest();
  const north = bounds.getNorth();
  const east = bounds.getEast();

  let tag = 'node[amenity="fuel"]';
  let title = 'Benzinlik';
  let color = '#10b981';
  let fillColor = '#059669';

  if (type === 'historic') {
    tag = 'node["historic"]';
    title = 'Tarihi Yer / Antik Kalıntı';
    color = '#f59e0b';
    fillColor = '#d97706';
  } else if (type === 'viewpoint') {
    tag = 'node[tourism="viewpoint"]';
    title = 'Manzara Seyir Noktası';
    color = '#f97316';
    fillColor = '#ea580c';
  } else if (type === 'cafe') {
    tag = 'node[amenity="cafe"]';
    title = 'Kafe & Mola';
    color = '#0ea5e9';
    fillColor = '#0284c7';
  }

  // Use a faster fallback if too zoomed out (limit to 25 to avoid heavy rendering)
  const query = `[out:json][timeout:25];(${tag}(${south},${west},${north},${east}););out 30;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 429) alert('Çok fazla istek yapıldı. Lütfen biraz bekleyip tekrar deneyin.');
      else alert('Keşif noktaları sunucusuna ulaşılamadı. Lütfen tekrar deneyin.');
      return false;
    }
    const data = await res.json();
    
    if (data.elements.length === 0) {
      alert('Bu bölgede seçtiğiniz türde bir yer bulunamadı.');
      return false;
    }

    data.elements.forEach(el => {
      const name = el.tags.name || el.tags['name:tr'] || el.tags.historic || title;
      const marker = L.circleMarker([el.lat, el.lon], {
        radius: type === 'historic' ? 7 : 6,
        color: color,
        fillColor: fillColor,
        fillOpacity: 0.9,
        weight: 2
      }).addTo(map);
      
      const jsName = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');

      marker.bindPopup(`
        <div class="text-xs">
          <strong style="color: ${color}">${title}</strong>
          <p class="font-medium text-white mt-1">${escapeHtml(name)}</p>
          ${el.tags.description ? `<p class="text-[10px] text-slate-400 mt-0.5">${escapeHtml(el.tags.description)}</p>` : ''}
          <div class="flex items-center space-x-1.5 mt-2">
            <button onclick="addPoiToRoute(${el.lat}, ${el.lon}, '${jsName}')" class="text-[10px] bg-brand-600 hover:bg-brand-500 text-white px-2 py-1 rounded font-medium">
              Rotaya Ekle
            </button>
            <button onclick="setPoiAsEndpoint(${el.lat}, ${el.lon}, '${jsName}', 'start')" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-1.5 py-1 rounded">
              Başlangıç
            </button>
            <button onclick="setPoiAsEndpoint(${el.lat}, ${el.lon}, '${jsName}', 'end')" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-1.5 py-1 rounded">
              Varış
            </button>
          </div>
        </div>
      `);

      state.poiMarkers.push({ poiType: type, marker });
    });
    
    return true;
  } catch (err) {
    console.warn('POI fetch failed:', err);
    alert('İnternet bağlantınızda veya sunucuda bir sorun oluştu.');
    return false;
  }
}

window.addPoiToRoute = function(lat, lon, name) {
  const newWp = {
    id: 'poi_' + Date.now(),
    type: 'via',
    name: name,
    lat: lat,
    lon: lon,
    marker: null
  };
  state.waypoints.splice(state.waypoints.length - 1, 0, newWp);
  updateMarker(newWp);
  renderWaypointsUI();
  calculateRoute();
};

// Event Listeners Setup
function initEventListeners() {
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
    const res = await fetch('/api/routes', {
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
    const res = await fetch('/api/routes');
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
    const res = await fetch(`/api/routes/${routeId}`, { method: 'DELETE' });
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
    const res = await fetch('/api/routes');
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
    const res = await fetch('/api/places');
    if (res.ok) {
      const dbPlaces = await res.json();
      const userHistoric = dbPlaces.filter(p => p.category === 'historic' || p.category === 'mountain_pass' || p.category === 'viewpoint');
      
      // Combine predefined places with user-saved places, avoiding exact duplicates by name
      const defaultPlaces = window.DEFAULT_HISTORIC_PLACES || [];
      const combined = [...defaultPlaces];
      
      userHistoric.forEach(up => {
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
        return ['ege', 'izmir', 'aydın', 'muğla', 'denizli', 'manisa', 'uşak', 'kütahya', 'milas', 'selçuk', 'didim', 'datça', 'fethiye', 'seydikemer', 'bergama', 'assos', 'karia', 'iyonya', 'knidos', 'labranda', 'alinda', 'stratoni', 'nysa', 'priene', 'milet', 'sardes', 'aizanoi', 'blaundos', 'clandras', 'kaunos', 'tlos', 'pinara'].some(k => combined.includes(k));
      }
      if (region === 'Akdeniz') {
        return ['akdeniz', 'antalya', 'burdur', 'isparta', 'mersin', 'adana', 'osmaniye', 'hatay', 'kaş', 'kemer', 'demre', 'anamur', 'silifke', 'alanya', 'sagalassos', 'kibyra', 'termessos', 'adada', 'selge', 'arykanda', 'patara', 'xanthos', 'letoon', 'myra', 'phaselis', 'aspendos', 'simena', 'kekova', 'anemurium', 'mamure', 'kanlıdivane', 'uzuncaburç', 'kızkalesi', 'cennet', 'anavarza', 'yılankale', 'karatepe', 'titus'].some(k => combined.includes(k));
      }
      if (region === 'İç Anadolu') {
        return ['iç anadolu', 'kapadokya', 'konya', 'ankara', 'çorum', 'sivas', 'eskişehir', 'afyon', 'aksaray', 'nevşehir', 'kayseri', 'karaman', 'niğde', 'göreme', 'midas', 'yazılıkaya', 'ayazini', 'pessinus', 'sivrihisar', 'hattuşa', 'alacahöyük', 'gordion', 'çatalhöyük', 'ihlara', 'selime', 'derinkuyu', 'kaymaklı', 'soğanlı', 'kültepe', 'sultanhanı', 'alahan', 'binbirkilise', 'taşkale', 'eflatunpınar', 'kilistra', 'divriği'].some(k => combined.includes(k));
      }
      if (region === 'Marmara') {
        return ['marmara', 'trakya', 'çanakkale', 'edirne', 'bursa', 'balıkesir', 'kırklareli', 'tekirdağ', 'sakarya', 'düzce', 'kocaeli', 'gelibolu', 'şehitlik', 'truva', 'troas', 'parion', 'kyzikos', 'daskyleion', 'gölyazı', 'tirilye', 'iznik', 'cumalıkızık', 'justinianus', 'prusias', 'konuralp', 'selimiye', 'uzunköprü', 'kıyıköy', 'bolu'].some(k => combined.includes(k));
      }
      if (region === 'Karadeniz') {
        return ['karadeniz', 'trabzon', 'rize', 'artvin', 'gümüşhane', 'amasya', 'sinop', 'kastamonu', 'karabük', 'bartın', 'zonguldak', 'ordu', 'giresun', 'samsun', 'sümela', 'vazelon', 'zilkale', 'şenyuva', 'fırtına', 'santa', 'imera', 'kuşkayası', 'amasra', 'hadrianapolis', 'safranbolu', 'mahmut bey', 'boyabat', 'yason', 'şavşat', 'işhan', 'ovit'].some(k => combined.includes(k));
      }
      if (region === 'Doğu & Güneydoğu') {
        return ['doğu', 'güneydoğu', 'mezopotamya', 'urfa', 'şanlıurfa', 'mardin', 'diyarbakır', 'gaziantep', 'adıyaman', 'batman', 'şırnak', 'van', 'kars', 'ağrı', 'erzurum', 'erzincan', 'ardahan', 'bitlis', 'elazığ', 'çıldır', 'şeytan kalesi', 'ani', 'ishak paşa', 'öşk vank', 'çobandede', 'kemaliye', 'tuşpa', 'çavuştepe', 'hoşap', 'ayanis', 'akdamar', 'ahlat', 'nemrut', 'harput', 'palu', 'göbeklitepe', 'karahantepe', 'harran', 'şuayb', 'soğmatar', 'halfeti', 'rumkale', 'zeugma', 'yesemek', 'cendere', 'arsemia', 'perre', 'dara', 'mor gabriel', 'mor evgin', 'zerzevan', 'malabadi', 'hasankeyf', 'finik', 'cizre'].some(k => combined.includes(k));
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
  if (type === 'start') {
    const startWp = state.waypoints.find(w => w.type === 'start');
    if (startWp) {
      startWp.lat = lat;
      startWp.lon = lon;
      startWp.name = name;
      updateMarker(startWp);
    }
  } else if (type === 'end') {
    const endWp = state.waypoints.find(w => w.type === 'end');
    if (endWp) {
      endWp.lat = lat;
      endWp.lon = lon;
      endWp.name = name;
      updateMarker(endWp);
    }
  } else {
    // Via
    const newWp = {
      id: 'historic_' + Date.now(),
      type: 'via',
      name: name,
      lat: lat,
      lon: lon,
      marker: null
    };
    state.waypoints.splice(state.waypoints.length - 1, 0, newWp);
    updateMarker(newWp);
  }

  renderWaypointsUI();
  calculateRoute();
  document.getElementById('modal-historic-places').classList.add('hidden');
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




// POI Actions
function addPoiToRoute(lat, lon, name) {
  if (!map) return;
  const newId = 'wp_' + Date.now();
  const newWp = {
    id: newId,
    type: 'via',
    name: name,
    lat: lat,
    lon: lon,
    marker: null
  };
  
  // Insert before end waypoint
  state.waypoints.splice(state.waypoints.length - 1, 0, newWp);
  updateMarker(newWp);
  renderWaypointsUI();
  calculateRoute();
  
  // Close any open popups
  map.closePopup();
}

function setPoiAsEndpoint(lat, lon, name, type) {
  if (!map) return;
  const wp = state.waypoints.find(w => w.type === type);
  if (wp) {
    wp.lat = lat;
    wp.lon = lon;
    wp.name = name;
    updateMarker(wp);
    renderWaypointsUI();
    calculateRoute();
    map.closePopup();
  }
}
