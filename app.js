/**
 * ROTAM V2 – Professional Travel, Route Planning & Destination Discovery Platform
 * 
 * Slogan: "Yolculuğun sadece bir varış noktası değil. Rotanı oluştur, keşfedilecek yerleri bul ve yolculuğunu unutulmaz hale getir."
 */

// Global Application State
const state = {
  lang: localStorage.getItem('rotam_lang') || 'tr',
  currentVehicle: 'car', // 'car' | 'motorcycle' | 'camper' | 'bicycle' | 'walk'
  selectedPreferences: new Set(['fastest']), // 'fastest', 'scenic', 'historic', 'nature', 'photo', 'beach', 'gastro', 'twisty', 'discovery', 'best'
  waypoints: [
    { id: 'start', type: 'start', name: '', lat: null, lon: null, marker: null },
    { id: 'end', type: 'end', name: '', lat: null, lon: null, marker: null }
  ],
  routeData: null,
  routeAlternatives: [],
  activeRouteIndex: 0,
  elevationData: [],
  elevationHoverMarker: null,
  activeTileLayer: null,
  poiMarkers: [],
  highlightMarkers: [],
  activePoiCategories: new Set([
    'historic', 'nature', 'photography', 'beach', 'gastronomy', 'cafe',
    'fuel', 'ev_charge', 'camping', 'viewpoint', 'mountain_pass'
  ]),
  allPlaces: [],
  corridorPois: [],
  smartRecommendations: [],
  userLocation: null,
  routeRequestId: 0
};
window.state = state;

// Map & Layer State
let map = null;
let routePolyline = null;
let routeGlowPolyline = null;
let ghostPolylines = [];
let tileLayers = {};
let mapInitialized = false;

// Category Configs: Colors, Icons & Titles
const CATEGORY_CONFIG = {
  historic: { title: 'Tarihi Yer & Antik Kent', title_en: 'Historic & Ancient Site', icon: 'landmark', emoji: '🏛️', color: '#d97706', fill: '#f59e0b', pinClass: 'pin-historic' },
  nature: { title: 'Doğa & Şelale & Kanyon', title_en: 'Nature, Waterfall & Canyon', icon: 'trees', emoji: '🌲', color: '#059669', fill: '#10b981', pinClass: 'pin-nature' },
  photography: { title: 'Fotoğraf & Seyir Noktası', title_en: 'Photography & Viewpoint', icon: 'camera', emoji: '📸', color: '#7c3aed', fill: '#8b5cf6', pinClass: 'pin-photography' },
  beach: { title: 'Sahil & Plaj & Koy', title_en: 'Beach & Bay', icon: 'waves', emoji: '🌊', color: '#0284c7', fill: '#38bdf8', pinClass: 'pin-beach' },
  gastronomy: { title: 'Gastronomi & Meşhur Lezzet', title_en: 'Gastronomy & Culinary', icon: 'utensils', emoji: '🍴', color: '#e11d48', fill: '#f43f5e', pinClass: 'pin-gastronomy' },
  cafe: { title: 'Mola Yeri & Kafe', title_en: 'Rest Stop & Cafe', icon: 'coffee', emoji: '☕', color: '#0f766e', fill: '#14b8a6', pinClass: 'pin-cafe' },
  fuel: { title: 'Akaryakıt İstasyonu', title_en: 'Fuel Station', icon: 'fuel', emoji: '⛽', color: '#047857', fill: '#10b981', pinClass: 'pin-fuel' },
  ev_charge: { title: 'Elektrikli Araç Şarj (EV)', title_en: 'EV Charging Station', icon: 'zap', emoji: '⚡', color: '#0891b2', fill: '#06b6d4', pinClass: 'pin-ev_charge' },
  camping: { title: 'Karavan & Kamp Alanı', title_en: 'Camper & Camping Site', icon: 'tent', emoji: '🚐', color: '#65a30d', fill: '#84cc16', pinClass: 'pin-camping' },
  viewpoint: { title: 'Seyir Noktası & Geçit', title_en: 'Scenic Viewpoint & Pass', icon: 'mountain', emoji: '🌄', color: '#ea580c', fill: '#f97316', pinClass: 'pin-viewpoint' },
  mountain_pass: { title: 'Dağ Geçidi', title_en: 'Mountain Pass', icon: 'mountain-snow', emoji: '⛰️', color: '#4f46e5', fill: '#6366f1', pinClass: 'pin-mountain_pass' }
};

function getCategoryTitle(cat) {
  const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.historic;
  return (window.state && window.state.lang === 'en' && cfg.title_en) ? cfg.title_en : cfg.title;
}

// 6 Primary Category Filter Groups Mapping all 871 Places Harmoniously
const CATEGORY_GROUPS = {
  historic: ['historic'],
  nature: ['nature', 'camping'],
  photography: ['photography', 'viewpoint', 'mountain_pass'],
  beach: ['beach'],
  gastronomy: ['gastronomy', 'cafe'],
  fuel: ['fuel', 'ev_charge']
};

// Modern Glassmorphic Non-Blocking Toast Notification System
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center space-y-2 pointer-events-none px-4 w-full max-w-md';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const typeStyles = {
    success: 'border-emerald-500/50 bg-slate-900/95 text-emerald-300 shadow-emerald-500/10',
    info: 'border-amber-500/50 bg-slate-900/95 text-amber-200 shadow-amber-500/10',
    warning: 'border-orange-500/50 bg-slate-900/95 text-orange-200 shadow-orange-500/10',
    error: 'border-rose-500/50 bg-slate-900/95 text-rose-200 shadow-rose-500/10'
  };
  const iconMap = {
    success: 'check-circle-2',
    info: 'info',
    warning: 'alert-triangle',
    error: 'alert-circle'
  };

  const style = typeStyles[type] || typeStyles.info;
  const icon = iconMap[type] || 'info';

  toast.className = `pointer-events-auto backdrop-blur-md px-4 py-3 rounded-2xl border ${style} shadow-2xl flex items-center space-x-3 text-xs font-medium transform transition-all duration-300 ease-out translate-y-4 opacity-0 cursor-pointer max-w-full`;
  toast.innerHTML = `
    <i data-lucide="${icon}" class="w-4 h-4 shrink-0"></i>
    <span class="flex-1 leading-snug">${escapeHtml(message)}</span>
    <button class="text-slate-400 hover:text-white p-0.5 ml-2" onclick="this.parentElement.remove()">
      <i data-lucide="x" class="w-3.5 h-3.5"></i>
    </button>
  `;

  container.appendChild(toast);
  initIcons();

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-4', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  const timer = setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3800);

  toast.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    clearTimeout(timer);
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 200);
  });
}

// Initial Database Loader (Merging default places with local storage additions)
function initPlacesDatabase() {
  const defaults = window.DEFAULT_HISTORIC_PLACES || [];
  let custom = [];
  try {
    const raw = localStorage.getItem('rotam_custom_places');
    if (raw) custom = JSON.parse(raw);
  } catch (e) {
    console.warn('Custom places read error:', e);
  }

  // Combine and deduplicate by id
  const mapById = new Map();
  defaults.forEach(p => mapById.set(p.id, p));
  custom.forEach(p => mapById.set(p.id, p));

  state.allPlaces = Array.from(mapById.values());
  console.log(`Rotam V2 Mekan Veritabanı Hazır: ${state.allPlaces.length} nokta.`);
  if (typeof populateCityDatalist === 'function') {
    populateCityDatalist();
  }
}

// Map Tile Layers Setup
function createTileLayers() {
  if (typeof L === 'undefined') return {};
  const layers = {
    // Ultra-reliable, adblocker-safe Dark Mode tile using OpenStreetMap + high-contrast CSS filter
    dark: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }),
    voyager: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      attribution: '&copy; CARTO, &copy; OpenStreetMap'
    }),
    osm: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
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

  // Add error resilience
  Object.entries(layers).forEach(([name, l]) => {
    l.on('tileerror', (e) => {
      console.warn(`Harita katmanı (${name}) karosu yüklenirken uyarı:`, e);
    });
  });

  return layers;
}

// Leaflet Map Initialization with automatic retry & size stabilization
let mapInitRetries = 0;
function initMap() {
  if (mapInitialized) return;

  if (typeof L === 'undefined') {
    mapInitRetries++;
    if (mapInitRetries < 40) {
      setTimeout(initMap, 150);
    } else {
      console.error('Leaflet kütüphanesi yüklenemedi.');
    }
    return;
  }

  const mapEl = document.getElementById('map');
  if (!mapEl) {
    setTimeout(initMap, 150);
    return;
  }

  // Ensure dark-map filter is active for dark mode
  mapEl.classList.add('dark-map');

  tileLayers = createTileLayers();
  const defaultTile = tileLayers.dark || tileLayers.osm;

  // Center on Turkey
  map = L.map('map', {
    center: [39.0, 35.2],
    zoom: 6,
    layers: [defaultTile],
    zoomControl: false,
    tap: true,
    preferCanvas: true
  });

  // Custom Zoom Control placed bottom right
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  state.activeTileLayer = 'dark';
  mapInitialized = true;

  // Map Click Listener to add waypoints
  map.on('click', async (e) => {
    handleMapClick(e.latlng.lat, e.latlng.lng);
  });

  setupElevationCanvas();

  // Setup ResizeObserver for map container to automatically adjust to drawer & flex resize
  if (typeof ResizeObserver !== 'undefined' && mapEl) {
    const mapResizeObserver = new ResizeObserver(() => {
      if (map) {
        map.invalidateSize();
      }
    });
    mapResizeObserver.observe(mapEl);
  }

  // Force Leaflet container recalculation at crucial render intervals
  setTimeout(() => { if (map) map.invalidateSize(); }, 60);
  setTimeout(() => { if (map) map.invalidateSize(); }, 250);
  setTimeout(() => { if (map) map.invalidateSize(); }, 700);
  setTimeout(() => { if (map) map.invalidateSize(); }, 1500);

  // Clean, uncluttered map on startup: no pins or symbols
  clearHighlightMarkers();
}

// Initial Highlight Discovery Pins (Kept clean on startup)
function renderInitialHighlights() {
  clearHighlightMarkers();
}

function clearHighlightMarkers() {
  if (!state.highlightMarkers) state.highlightMarkers = [];
  state.highlightMarkers.forEach(m => {
    if (map) map.removeLayer(m);
  });
  state.highlightMarkers = [];
}

function switchTile(tileKey) {
  if (!map) return;

  const mapEl = document.getElementById('map');
  if (tileKey === 'dark') {
    if (mapEl) mapEl.classList.add('dark-map');
  } else {
    if (mapEl) mapEl.classList.remove('dark-map');
  }

  const targetLayer = tileLayers[tileKey] || tileLayers.dark || tileLayers.osm;
  if (!targetLayer) return;

  Object.values(tileLayers).forEach(l => {
    if (map.hasLayer(l)) map.removeLayer(l);
  });
  map.addLayer(targetLayer);
  state.activeTileLayer = tileKey;

  document.querySelectorAll('.tile-btn').forEach(b => {
    b.classList.remove('bg-slate-800', 'text-white');
    b.classList.add('text-slate-400');
  });
  const activeBtn = document.getElementById(`tile-${tileKey}`);
  if (activeBtn) {
    activeBtn.classList.add('bg-slate-800', 'text-white');
    activeBtn.classList.remove('text-slate-400');
  }
  setTimeout(() => { if (map) map.invalidateSize(); }, 50);
}

// Splash Screen Dismissal
function dismissSplashScreen() {
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.style.opacity = '0';
    splash.style.pointerEvents = 'none';
    setTimeout(() => {
      splash.remove();
      initIcons();
      if (map) map.invalidateSize();
    }, 600);
  }
  if (map) {
    setTimeout(() => map.invalidateSize(), 50);
    setTimeout(() => map.invalidateSize(), 250);
    setTimeout(() => map.invalidateSize(), 700);
  }
}

// Homepage Hero Planner Toggle
function showHomepagePlanner() {
  if (window.innerWidth < 768) {
    closeRightPanel();
  }
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth >= 768 && sidebar) {
    sidebar.classList.remove('hidden');
    sidebar.classList.add('flex');
    sidebar.scrollTo({ top: 0, behavior: 'smooth' });
    const startInp = document.querySelector('#waypoints-container input');
    if (startInp) startInp.focus();
    return;
  }
  if (sidebar) {
    sidebar.classList.remove('hidden');
    sidebar.classList.add('flex');
    initIcons();
    if (map) setTimeout(() => map.invalidateSize(), 200);
  }
}

function dismissHomepagePlanner() {
  const hero = document.getElementById('homepage-hero-overlay');
  if (hero) {
    hero.classList.add('hidden');
    hero.classList.remove('flex');
  }
  if (map) {
    setTimeout(() => map.invalidateSize(), 50);
    setTimeout(() => map.invalidateSize(), 250);
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  if (!sidebar.classList.contains('hidden')) {
    closeMobileSidebar();
  } else {
    openMobileSidebar();
  }
}

function openMobileSidebar(focusTarget = null) {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.remove('hidden');
    sidebar.classList.add('flex');
    initIcons();
    if (map) setTimeout(() => map.invalidateSize(), 150);
  }
  // On mobile, close right-panel and hide floating widgets to prevent overlay collision
  if (window.innerWidth < 768) {
    closeRightPanel();
    const bottomBar = document.getElementById('mobile-bottom-bar');
    if (bottomBar) bottomBar.classList.add('hidden');
    const elev = document.getElementById('elevation-panel');
    if (elev) elev.classList.add('hidden');
  }

  if (focusTarget === 'end') {
    setTimeout(() => {
      const inputs = document.querySelectorAll('#waypoints-container input');
      if (inputs && inputs.length > 0) {
        const destInput = inputs[inputs.length - 1];
        destInput.focus();
        destInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);
  }
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.add('hidden');
    sidebar.classList.remove('flex');
    if (map) {
      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 300);
    }
  }
  if (typeof closeWaypointAutocomplete === 'function') {
    closeWaypointAutocomplete();
  }
  // On mobile, restore bottom floating bar
  if (window.innerWidth < 768) {
    const bottomBar = document.getElementById('mobile-bottom-bar');
    if (bottomBar && (!window.LiveNavigation || !window.LiveNavigation.isActive)) {
      bottomBar.classList.remove('hidden');
    }
  }
}

function handleMobileNavPlan() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar && !sidebar.classList.contains('hidden')) {
    closeMobileSidebar();
  } else {
    openMobileSidebar();
  }
}

function handleMobileNavRideStart() {
  if (typeof LiveNavigation !== 'undefined' && LiveNavigation.isActive) {
    LiveNavigation.recenterMap();
    const isEn = (window.state && window.state.lang === 'en');
    showToast(isEn ? 'Live navigation is already active.' : 'Canlı sürüş takibi aktif.', 'info');
    return;
  }

  const valid = (state.waypoints || []).filter(w => w.lat !== null && w.lon !== null);

  // If active route is already calculated and ready
  if (state.routeData && valid.length >= 2) {
    if (typeof LiveNavigation !== 'undefined') {
      LiveNavigation.start();
    }
    return;
  }

  // If 2+ valid waypoints are present but routeData hasn't been computed yet
  if (valid.length >= 2) {
    const isEn = (window.state && window.state.lang === 'en');
    showToast(isEn ? 'Preparing route, starting ride...' : 'Rota hazırlanıyor, sürüş başlatılıyor...', 'info');
    calculateRouteMain().then(() => {
      if (state.routeData && typeof LiveNavigation !== 'undefined') {
        LiveNavigation.start();
      }
    }).catch(err => {
      console.error('Ride route calculation error:', err);
      showToast(isEn ? 'Route calculation failed.' : 'Rota hesaplanamadı.', 'error');
    });
    return;
  }

  // Less than 2 waypoints: prompt user to select destination
  const isEn = (window.state && window.state.lang === 'en');
  showToast(isEn ? 'Please select your destination first.' : 'Lütfen önce gitmek istediğiniz varış noktasını seçin.', 'info');
  openMobileSidebar('end');
}
window.handleMobileNavRideStart = handleMobileNavRideStart;

// Vehicle Selection (Car, Moto, Camper, Bicycle, Walk)
function selectVehicle(vehicle) {
  state.currentVehicle = vehicle;
  document.querySelectorAll('.vehicle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.vehicle === vehicle);
  });

  const badge = document.getElementById('vehicle-label-badge');
  const scoreLabel = document.getElementById('label-stat-score');
  const labels = {
    car: (typeof t === 'function') ? t('veh_car', 'Otomobil') : 'Otomobil',
    motorcycle: (typeof t === 'function') ? t('veh_moto', 'Motosiklet') : 'Motosiklet',
    camper: (typeof t === 'function') ? t('veh_camper', 'Karavan') : 'Karavan',
    bicycle: (typeof t === 'function') ? t('veh_bicycle', 'Bisiklet') : 'Bisiklet',
    walk: (typeof t === 'function') ? t('veh_walk', 'Yaya') : 'Yaya'
  };
  if (badge) badge.textContent = labels[vehicle] || vehicle;
  if (scoreLabel) {
    if (vehicle === 'motorcycle') scoreLabel.textContent = (typeof t === 'function') ? t('score_curviness', 'Viraj Puanı') : 'Viraj Puanı';
    else if (vehicle === 'car') scoreLabel.textContent = (typeof t === 'function') ? t('score_comfort', 'Konfor Skoru') : 'Konfor Skoru';
    else if (vehicle === 'camper') scoreLabel.textContent = (typeof t === 'function') ? t('score_camper', 'Karavan Uyumu') : 'Karavan Uyumu';
    else if (vehicle === 'bicycle') scoreLabel.textContent = (typeof t === 'function') ? t('score_bicycle', 'Bisiklet Uyumu') : 'Bisiklet Uyumu';
    else scoreLabel.textContent = (typeof t === 'function') ? t('score_walk', 'Yürüyüş Uyumu') : 'Yürüyüş Uyumu';
  }

  // Also sync hero selector if present
  document.querySelectorAll('.hero-vehicle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.v === vehicle);
  });

  try {
    localStorage.setItem('rotam_user_vehicle', vehicle);
  } catch (e) {}

  // If a route exists, recalculate for new vehicle dynamics
  const valid = state.waypoints.filter(w => w.lat !== null && w.lon !== null);
  if (valid.length >= 2) {
    calculateRouteMain();
  }
}

function selectHeroVehicle(v) {
  selectVehicle(v);
}

// Preference Toggle (Fastest, Scenic, Historic, Nature, Photo, Beach, Gastro, Twisty, Discovery, Best)
function toggleHeroPref(pref) {
  if (pref === 'fastest') {
    state.selectedPreferences.clear();
    state.selectedPreferences.add('fastest');
  } else {
    state.selectedPreferences.delete('fastest');
    if (state.selectedPreferences.has(pref)) {
      state.selectedPreferences.delete(pref);
      if (state.selectedPreferences.size === 0) state.selectedPreferences.add('fastest');
    } else {
      state.selectedPreferences.add(pref);
    }
  }

  document.querySelectorAll('.pref-chip').forEach(chip => {
    chip.classList.toggle('active', state.selectedPreferences.has(chip.dataset.pref));
  });

  try {
    localStorage.setItem('rotam_user_prefs', JSON.stringify(Array.from(state.selectedPreferences)));
  } catch (e) {}
}

// Turkish String Normalization (case & diacritic-insensitive)
function normalizeTurkish(str) {
  if (!str) return '';
  return str
    .toString()
    .trim()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u');
}

// Instant Offline Local Search Engine for All 81 Provinces, Districts and 870+ Places
function searchLocalGeo(query) {
  if (!query || typeof query !== 'string') return null;
  const rawQ = query.trim();
  const q = normalizeTurkish(rawQ);
  if (!q) return null;

  const geoDb = (window.TURKEY_GEO_DATABASE && Array.isArray(window.TURKEY_GEO_DATABASE)) ? window.TURKEY_GEO_DATABASE : [];
  const placesDb = (state && state.allPlaces && Array.isArray(state.allPlaces)) ? state.allPlaces : (window.DEFAULT_HISTORIC_PLACES || []);

  // 1. Exact match in TURKEY_GEO_DATABASE (81 provinces + top 50 hubs)
  const exactGeo = geoDb.find(item => normalizeTurkish(item.name) === q);
  if (exactGeo) {
    return { lat: exactGeo.lat, lon: exactGeo.lon, displayName: `${exactGeo.name}, Türkiye`, source: 'turkey_db' };
  }

  // 2. Starts-with match in TURKEY_GEO_DATABASE
  const startsGeo = geoDb.find(item => normalizeTurkish(item.name).startsWith(q));
  if (startsGeo) {
    return { lat: startsGeo.lat, lon: startsGeo.lon, displayName: `${startsGeo.name}, Türkiye`, source: 'turkey_db' };
  }

  // 3. Substring match in TURKEY_GEO_DATABASE
  const subGeo = geoDb.find(item => normalizeTurkish(item.name).includes(q) || q.includes(normalizeTurkish(item.name)));
  if (subGeo) {
    return { lat: subGeo.lat, lon: subGeo.lon, displayName: `${subGeo.name}, Türkiye`, source: 'turkey_db' };
  }

  // 4. Exact match in 870+ Places Database
  const exactPlace = placesDb.find(p => normalizeTurkish(p.name) === q);
  if (exactPlace) {
    return { lat: exactPlace.lat, lon: exactPlace.lon, displayName: `${exactPlace.name} (${exactPlace.city || 'Türkiye'})`, source: 'places_db' };
  }

  // 5. Starts-with match in Places Database
  const startsPlace = placesDb.find(p => normalizeTurkish(p.name).startsWith(q));
  if (startsPlace) {
    return { lat: startsPlace.lat, lon: startsPlace.lon, displayName: `${startsPlace.name} (${startsPlace.city || 'Türkiye'})`, source: 'places_db' };
  }

  // 6. Substring match in Places Database
  const subPlace = placesDb.find(p => normalizeTurkish(p.name).includes(q));
  if (subPlace) {
    return { lat: subPlace.lat, lon: subPlace.lon, displayName: `${subPlace.name} (${subPlace.city || 'Türkiye'})`, source: 'places_db' };
  }

  // 7. Token word match: e.g. "Ankara merkez", "Antalya kaş"
  const tokens = q.split(/[\s,/-]+/).filter(t => t.length >= 3);
  for (const token of tokens) {
    const tokenGeo = geoDb.find(item => normalizeTurkish(item.name) === token || normalizeTurkish(item.name).startsWith(token));
    if (tokenGeo) {
      return { lat: tokenGeo.lat, lon: tokenGeo.lon, displayName: `${tokenGeo.name}, Türkiye`, source: 'turkey_db' };
    }
  }

  return null;
}

// Reverse Geocoding Lookup for Coordinates (Nearest City or Landmark)
function findNearestCityOrPlace(lat, lon) {
  let nearestName = null;
  let minDistance = Infinity;

  const geoDb = (window.TURKEY_GEO_DATABASE && Array.isArray(window.TURKEY_GEO_DATABASE)) ? window.TURKEY_GEO_DATABASE : [];
  for (const city of geoDb) {
    const d = Math.hypot(city.lat - lat, city.lon - lon);
    if (d < minDistance) {
      minDistance = d;
      nearestName = city.name;
    }
  }

  const placesDb = (state && state.allPlaces && Array.isArray(state.allPlaces)) ? state.allPlaces : (window.DEFAULT_HISTORIC_PLACES || []);
  for (const p of placesDb) {
    const d = Math.hypot(p.lat - lat, p.lon - lon);
    if (d < minDistance) {
      minDistance = d;
      nearestName = p.name;
    }
  }

  if (minDistance < 0.12) {
    return nearestName || `Konum (${lat.toFixed(3)}, ${lon.toFixed(3)})`;
  } else if (minDistance < 0.35) {
    return `${nearestName} Çevresi`;
  }
  return `Konum (${lat.toFixed(3)}, ${lon.toFixed(3)})`;
}

// Populate Turkish Cities & Tourist Hubs Datalist for Autocomplete
function populateCityDatalist() {
  const datalist = document.getElementById('turkey-cities-list');
  if (!datalist) return;
  if (datalist.children && datalist.children.length > 0) return;

  const seen = new Set();
  const options = [];

  if (window.TURKEY_GEO_DATABASE && Array.isArray(window.TURKEY_GEO_DATABASE)) {
    window.TURKEY_GEO_DATABASE.forEach(item => {
      if (!seen.has(item.name)) {
        seen.add(item.name);
        options.push(`<option value="${item.name}">${item.name}${item.region ? ' (' + item.region + ')' : ''}</option>`);
      }
    });
  }

  const places = (state && state.allPlaces && Array.isArray(state.allPlaces)) ? state.allPlaces : (window.DEFAULT_HISTORIC_PLACES || []);
  places.forEach(p => {
    if (p && p.name && !seen.has(p.name)) {
      seen.add(p.name);
      options.push(`<option value="${p.name}">${p.name}${p.city ? ' - ' + p.city : ''}</option>`);
    }
  });

  datalist.innerHTML = options.join('');
}

function checkAndPanToWaypoint(index) {
  const wp = state.waypoints[index];
  if (wp && wp.lat !== null && wp.lon !== null && map) {
    const start = state.waypoints[0];
    const end = state.waypoints[state.waypoints.length - 1];
    if (start && end && start.lat !== null && end.lat !== null) {
      const bounds = L.latLngBounds([[start.lat, start.lon], [end.lat, end.lon]]);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 });
    } else {
      map.setView([wp.lat, wp.lon], 9);
    }
  }
}

function setSidebarStart(city) {
  const local = searchLocalGeo(city);
  if (state.waypoints[0]) {
    state.waypoints[0].name = city;
    if (local) {
      state.waypoints[0].lat = local.lat;
      state.waypoints[0].lon = local.lon;
    }
  }
  const heroInp = document.getElementById('hero-start-input');
  if (heroInp) heroInp.value = city;
  const inputs = document.querySelectorAll('#waypoints-container input');
  if (inputs && inputs[0]) inputs[0].value = city;
  updateWaypointMarkers();
  checkAndPanToWaypoint(0);
}

function setSidebarEnd(city) {
  const lastIdx = state.waypoints.length - 1;
  const local = searchLocalGeo(city);
  if (state.waypoints[lastIdx]) {
    state.waypoints[lastIdx].name = city;
    if (local) {
      state.waypoints[lastIdx].lat = local.lat;
      state.waypoints[lastIdx].lon = local.lon;
    }
  }
  const heroInp = document.getElementById('hero-end-input');
  if (heroInp) heroInp.value = city;
  const inputs = document.querySelectorAll('#waypoints-container input');
  if (inputs && inputs[lastIdx]) inputs[lastIdx].value = city;
  if (typeof closeWaypointAutocomplete === 'function') closeWaypointAutocomplete();
  updateWaypointMarkers();
  checkAndPanToWaypoint(lastIdx);
}

function setHeroStart(city) {
  setSidebarStart(city);
}

function setHeroEnd(city) {
  setSidebarEnd(city);
}

function handleHeroStartInput(value) {
  if (state.waypoints[0]) {
    state.waypoints[0].name = value;
    const local = searchLocalGeo(value);
    if (local) {
      state.waypoints[0].lat = local.lat;
      state.waypoints[0].lon = local.lon;
      updateWaypointMarkers();
    }
  }
}

function handleHeroEndInput(value) {
  const lastIdx = state.waypoints.length - 1;
  if (state.waypoints[lastIdx]) {
    state.waypoints[lastIdx].name = value;
    const local = searchLocalGeo(value);
    if (local) {
      state.waypoints[lastIdx].lat = local.lat;
      state.waypoints[lastIdx].lon = local.lon;
      updateWaypointMarkers();
    }
  }
}

// GPS Location for Start Point
function useCurrentLocationForStart() {
  if (!navigator.geolocation) {
    showToast('Tarayıcınız konum servisini desteklemiyor.', 'warning');
    return;
  }
  const input = document.getElementById('hero-start-input');
  if (input) input.value = 'Mevcut Konumum alınıyor...';

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      state.userLocation = { lat, lon };

      state.waypoints[0].lat = lat;
      state.waypoints[0].lon = lon;
      state.waypoints[0].name = 'Mevcut Konumum';
      if (input) input.value = '📍 Mevcut Konumum';
      updateWaypointsListUI();
      updateWaypointMarkers();
      checkAndPanToWaypoint(0);
      showToast('Mevcut konumunuz başlangıç noktası olarak ayarlandı.', 'success');
    },
    (err) => {
      showToast('Konum alınamadı: ' + err.message, 'error');
      if (input) input.value = '';
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// Multi-Tier Geocoding Helper: Instant Offline Database First + Fallbacks
async function geocodeLocation(query) {
  if (!query || typeof query !== 'string' || query.trim() === '') return null;
  const qStr = query.trim();

  // Tier 1: Check instant offline local database first (0ms, 100% offline, guaranteed)
  const localMatch = searchLocalGeo(qStr);
  if (localMatch) {
    return {
      lat: localMatch.lat,
      lon: localMatch.lon,
      displayName: localMatch.displayName
    };
  }

  // Tier 2: OpenStreetMap Nominatim with safe timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2800);
    const q = encodeURIComponent(qStr + ', Türkiye');
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1&accept-language=tr`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          displayName: data[0].display_name
        };
      }
    }
  } catch (err) {
    // Timeout or network error - fallback silently
  }

  // Tier 3: Fuzzy token match as last resort
  const tokens = normalizeTurkish(qStr).split(/[\s,/-]+/).filter(t => t.length >= 2);
  for (const t of tokens) {
    const subMatch = searchLocalGeo(t);
    if (subMatch) {
      return {
        lat: subMatch.lat,
        lon: subMatch.lon,
        displayName: subMatch.displayName
      };
    }
  }

  return null;
}

// Hero Route Submission
async function submitHeroRoute() {
  const startInp = document.getElementById('hero-start-input');
  const endInp = document.getElementById('hero-end-input');
  const startVal = startInp ? startInp.value.trim() : '';
  const endVal = endInp ? endInp.value.trim() : '';

  if (!startVal || !endVal) {
    showToast('Lütfen başlangıç ve varış noktalarını girin.', 'warning');
    return;
  }

  showLoadingBanner(true, '1. Başlangıç ve varış noktaları bulunuyor...');

  let startCoord = null;
  if (startVal.includes('Mevcut Konumum') && state.userLocation) {
    startCoord = state.userLocation;
  } else {
    if (state.waypoints[0] && state.waypoints[0].lat !== null && state.waypoints[0].name === startVal) {
      startCoord = { lat: state.waypoints[0].lat, lon: state.waypoints[0].lon };
    } else {
      startCoord = await geocodeLocation(startVal);
    }
  }

  const lastIdx = state.waypoints.length - 1;
  let endCoord = null;
  if (state.waypoints[lastIdx] && state.waypoints[lastIdx].lat !== null && state.waypoints[lastIdx].name === endVal) {
    endCoord = { lat: state.waypoints[lastIdx].lat, lon: state.waypoints[lastIdx].lon };
  } else {
    endCoord = await geocodeLocation(endVal);
  }

  if (!startCoord) {
    showLoadingBanner(false);
    showToast(`"${startVal}" konumu bulunamadı. Lütfen kontrol edip tekrar deneyin.`, 'warning');
    return;
  }
  if (!endCoord) {
    showLoadingBanner(false);
    showToast(`"${endVal}" konumu bulunamadı. Lütfen kontrol edip tekrar deneyin.`, 'warning');
    return;
  }

  state.waypoints[0].lat = startCoord.lat;
  state.waypoints[0].lon = startCoord.lon;
  state.waypoints[0].name = startVal;

  state.waypoints[lastIdx].lat = endCoord.lat;
  state.waypoints[lastIdx].lon = endCoord.lon;
  state.waypoints[lastIdx].name = endVal;

  updateWaypointsListUI();
  updateWaypointMarkers();
  dismissHomepagePlanner();

  // Launch Calculation Engine
  await calculateRouteMain();
}

// Waypoint List & UI Management
function updateWaypointsListUI() {
  const container = document.getElementById('waypoints-container');
  if (!container) return;

  container.innerHTML = '';

  state.waypoints.forEach((wp, index) => {
    const isStart = index === 0;
    const isEnd = index === state.waypoints.length - 1;
    const isWaypoint = !isStart && !isEnd;

    const div = document.createElement('div');
    div.className = 'flex items-center space-x-2 bg-slate-950/70 p-2 rounded-xl border border-slate-800/80 group transition-all relative';

    let iconHtml = '';
    if (isStart) iconHtml = '<span class="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>';
    else if (isEnd) iconHtml = '<span class="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></span>';
    else iconHtml = '<span class="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>';

    div.innerHTML = `
      <div class="p-1 shrink-0 flex items-center justify-center">${iconHtml}</div>
      <input type="text" value="${escapeHtml(wp.name || '')}" 
        autocomplete="off" autocorrect="off" spellcheck="false"
        placeholder="${isStart ? (typeof t === 'function' ? t('wp_start_placeholder', 'Başlangıç Noktası (Örn: İstanbul)') : 'Başlangıç Noktası') : isEnd ? (typeof t === 'function' ? t('wp_end_placeholder', 'Varış Noktası (Örn: Antalya)') : 'Varış Noktası') : ((typeof t === 'function' ? t('wp_stop_prefix', 'Ara Durak ') : 'Ara Durak ') + index)}" 
        oninput="handleWaypointNameChange(${index}, this.value, this)"
        onfocus="handleWaypointFocus(${index}, this.value, this)"
        onblur="setTimeout(closeWaypointAutocomplete, 300); handleWaypointBlur(${index}, this.value)"
        onkeydown="if(event.key==='Enter') { closeWaypointAutocomplete(); handleWaypointBlur(${index}, this.value); calculateRouteMain(); }"
        class="bg-transparent flex-1 text-xs text-white placeholder-slate-500 focus:outline-none truncate font-medium">
      <div class="flex items-center space-x-1 shrink-0">
        ${isWaypoint ? `
          <button onclick="removeWaypoint(${index})" class="p-1 text-slate-500 hover:text-red-400 rounded transition-colors" title="Durağı Sil">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
          </button>
        ` : ''}
      </div>
    `;

    container.appendChild(div);
  });

  initIcons();
}

function getLocalGeoSuggestions(query, limit = 5) {
  if (!query || typeof query !== 'string') return [];
  const q = normalizeTurkish(query.trim());
  if (!q || q.length < 2) return [];

  const results = [];
  const seen = new Set();

  const geoDb = (window.TURKEY_GEO_DATABASE && Array.isArray(window.TURKEY_GEO_DATABASE)) ? window.TURKEY_GEO_DATABASE : [];
  const placesDb = (state && state.allPlaces && Array.isArray(state.allPlaces)) ? state.allPlaces : (window.DEFAULT_HISTORIC_PLACES || []);

  // 1. Starts-with in provinces / districts
  geoDb.forEach(item => {
    if (results.length >= limit) return;
    const nameNorm = normalizeTurkish(item.name);
    if (nameNorm.startsWith(q) && !seen.has(item.name)) {
      seen.add(item.name);
      results.push({ name: item.name, subtitle: item.region || 'İl / İlçe', lat: item.lat, lon: item.lon, type: 'city' });
    }
  });

  // 2. Starts-with in Places DB
  placesDb.forEach(p => {
    if (results.length >= limit) return;
    const nameNorm = normalizeTurkish(p.name);
    if (nameNorm.startsWith(q) && !seen.has(p.name)) {
      seen.add(p.name);
      results.push({ name: p.name, subtitle: p.city || 'Tarihi & Doğa', lat: p.lat, lon: p.lon, type: 'place' });
    }
  });

  // 3. Includes in provinces
  if (results.length < limit) {
    geoDb.forEach(item => {
      if (results.length >= limit) return;
      const nameNorm = normalizeTurkish(item.name);
      if (nameNorm.includes(q) && !seen.has(item.name)) {
        seen.add(item.name);
        results.push({ name: item.name, subtitle: item.region || 'İl / İlçe', lat: item.lat, lon: item.lon, type: 'city' });
      }
    });
  }

  // 4. Includes in places
  if (results.length < limit) {
    placesDb.forEach(p => {
      if (results.length >= limit) return;
      const nameNorm = normalizeTurkish(p.name);
      if (nameNorm.includes(q) && !seen.has(p.name)) {
        seen.add(p.name);
        results.push({ name: p.name, subtitle: p.city || 'Tarihi & Doğa', lat: p.lat, lon: p.lon, type: 'place' });
      }
    });
  }

  return results;
}

function handleWaypointFocus(index, value, inputEl) {
  if (value && value.trim().length >= 2) {
    const suggestions = getLocalGeoSuggestions(value, 5);
    renderWaypointAutocomplete(index, suggestions, inputEl);
  }
}

function handleWaypointNameChange(index, value, inputEl) {
  if (!state.waypoints[index]) return;
  state.waypoints[index].name = value;

  // Sync to hero inputs
  if (index === 0) {
    const heroStart = document.getElementById('hero-start-input');
    if (heroStart && heroStart.value !== value) heroStart.value = value;
  } else if (index === state.waypoints.length - 1) {
    const heroEnd = document.getElementById('hero-end-input');
    if (heroEnd && heroEnd.value !== value) heroEnd.value = value;
  }

  // Render non-clashing custom dropdown under active input
  const suggestions = getLocalGeoSuggestions(value, 5);
  renderWaypointAutocomplete(index, suggestions, inputEl);
}

function renderWaypointAutocomplete(index, suggestions, inputEl) {
  let box = document.getElementById('waypoint-autocomplete-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'waypoint-autocomplete-box';
    document.body.appendChild(box);
  }

  if (!suggestions || suggestions.length === 0 || !inputEl) {
    box.style.display = 'none';
    return;
  }

  const rect = inputEl.getBoundingClientRect();
  box.style.position = 'fixed';
  box.style.top = `${rect.bottom + 4}px`;
  box.style.left = `${Math.max(12, rect.left)}px`;
  box.style.width = `${Math.min(window.innerWidth - 24, rect.width + 36)}px`;
  box.style.display = 'block';

  box.innerHTML = suggestions.map(s => `
    <div class="p-2.5 hover:bg-slate-800 active:bg-slate-750 cursor-pointer flex items-center justify-between text-xs border-b border-slate-800 last:border-b-0 transition-colors"
         onmousedown="event.preventDefault(); selectWaypointSuggestion(${index}, '${escapeHtml(s.name)}', ${s.lat}, ${s.lon});">
      <div class="flex items-center space-x-2 min-w-0">
        <span class="text-amber-400 shrink-0">${s.type === 'city' ? '🏙️' : '📍'}</span>
        <div class="truncate">
          <span class="font-bold text-white block truncate">${escapeHtml(s.name)}</span>
          <span class="text-[10px] text-slate-400 block truncate">${escapeHtml(s.subtitle || '')}</span>
        </div>
      </div>
      <span class="text-[10px] bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded font-semibold shrink-0 ml-1">Seç</span>
    </div>
  `).join('');
}

function selectWaypointSuggestion(index, name, lat, lon) {
  if (!state.waypoints[index]) return;
  state.waypoints[index].name = name;
  state.waypoints[index].lat = lat;
  state.waypoints[index].lon = lon;

  const inputs = document.querySelectorAll('#waypoints-container input');
  if (inputs && inputs[index]) {
    inputs[index].value = name;
  }

  closeWaypointAutocomplete();
  updateWaypointMarkers();

  const valid = state.waypoints.filter(w => w.lat !== null && w.lon !== null);
  if (valid.length >= 2) {
    calculateRouteMain();
  }
}

function closeWaypointAutocomplete() {
  const box = document.getElementById('waypoint-autocomplete-box');
  if (box) {
    box.style.display = 'none';
  }
}

async function handleWaypointBlur(index, value) {
  if (!state.waypoints[index] || !value || value.trim() === '') return;
  if (state.waypoints[index].lat === null || state.waypoints[index].lon === null) {
    const coord = await geocodeLocation(value);
    if (coord) {
      state.waypoints[index].lat = coord.lat;
      state.waypoints[index].lon = coord.lon;
      updateWaypointMarkers();
      checkAndPanToWaypoint(index);
    }
  }
}

function addWaypointField() {
  const newIndex = state.waypoints.length - 1;
  const newWp = {
    id: 'waypoint-' + Date.now(),
    type: 'waypoint',
    name: '',
    lat: null,
    lon: null,
    marker: null
  };
  state.waypoints.splice(newIndex, 0, newWp);
  updateWaypointsListUI();
  if (typeof RotamTelemetry !== 'undefined') {
    RotamTelemetry.recordStopAdded();
  }
}

function removeWaypoint(index) {
  if (index <= 0 || index >= state.waypoints.length - 1) return;
  const wp = state.waypoints[index];
  const name = wp ? (wp.name || 'Durak') : 'Durak';
  if (wp && wp.marker && map) map.removeLayer(wp.marker);
  state.waypoints.splice(index, 1);
  updateWaypointsListUI();
  calculateRouteMain();
  showToast(`"${name}" rotadan kaldırıldı.`, 'info');
}

function reverseRoute() {
  state.waypoints.reverse();
  state.waypoints[0].type = 'start';
  state.waypoints[state.waypoints.length - 1].type = 'end';
  updateWaypointsListUI();
  updateWaypointMarkers();
  calculateRouteMain();
}

function clearAllRoute() {
  state.waypoints.forEach(wp => {
    if (wp.marker && map) map.removeLayer(wp.marker);
  });
  state.waypoints = [
    { id: 'start', type: 'start', name: '', lat: null, lon: null, marker: null },
    { id: 'end', type: 'end', name: '', lat: null, lon: null, marker: null }
  ];
  clearRouteDisplay();
  updateWaypointsListUI();
}

function clearRouteDisplay() {
  if (routePolyline && map) map.removeLayer(routePolyline);
  if (routeGlowPolyline && map) map.removeLayer(routeGlowPolyline);
  routePolyline = null;
  routeGlowPolyline = null;

  ghostPolylines.forEach(p => { if (map) map.removeLayer(p); });
  ghostPolylines = [];

  clearPoiMarkers();
  state.routeData = null;
  state.routeAlternatives = [];
  state.corridorPois = [];
  state.smartRecommendations = [];
  clearHighlightMarkers();

  if (map) {
    map.setView([39.0, 35.2], 6);
    setTimeout(() => map.invalidateSize(), 100);
  }

  document.getElementById('route-summary-panel')?.classList.add('hidden');
  document.getElementById('weather-panel')?.classList.add('hidden');
  document.getElementById('elevation-panel')?.classList.add('hidden');
  document.getElementById('route-alternatives-container')?.classList.add('hidden');
  document.getElementById('mobile-mini-cockpit')?.classList.add('hidden');
  document.getElementById('mobile-home-prompt-card')?.classList.remove('hidden');
  document.getElementById('mobile-bottom-bar')?.classList.remove('hidden');
  document.getElementById('badge-right-panel-poi-count')?.classList.add('hidden');

  const corridorTotal = document.getElementById('corridor-total-count');
  if (corridorTotal) corridorTotal.textContent = '0 Nokta';

  const sidebarCount = document.getElementById('sidebar-shortcut-corridor-count');
  if (sidebarCount) sidebarCount.textContent = '0 Keşif';

  ['historic', 'nature', 'photography', 'beach', 'gastronomy', 'fuel'].forEach(cat => {
    const pill = document.getElementById(`count-pill-${cat}`);
    if (pill) pill.textContent = '0';
  });

  document.getElementById('btn-export-gpx')?.setAttribute('disabled', 'true');
  document.getElementById('btn-open-gmaps')?.setAttribute('disabled', 'true');
  document.getElementById('btn-save-route-modal')?.setAttribute('disabled', 'true');
  document.getElementById('badge-right-panel-poi-count')?.classList.add('hidden');
  document.getElementById('badge-header-poi-count')?.classList.add('hidden');

  renderCorridorPoiList();
  generateSmartStopRecommendations(null);
  renderJourneyTimeline();
}

// Waypoint Map Click & Markers
async function handleMapClick(lat, lon) {
  const friendlyName = findNearestCityOrPlace(lat, lon);

  // 1. If start has no coordinates and no name entered yet
  if (state.waypoints[0].lat === null && (!state.waypoints[0].name || state.waypoints[0].name.trim() === '')) {
    state.waypoints[0].lat = lat;
    state.waypoints[0].lon = lon;
    state.waypoints[0].name = friendlyName;
    const heroInp = document.getElementById('hero-start-input');
    if (heroInp) heroInp.value = friendlyName;
    updateWaypointsListUI();
    updateWaypointMarkers();
    showToast(`Başlangıç: ${friendlyName}`, 'success');
    return;
  }

  // 2. If end has no coordinates and no name entered yet
  const lastIdx = state.waypoints.length - 1;
  if (state.waypoints[lastIdx].lat === null && (!state.waypoints[lastIdx].name || state.waypoints[lastIdx].name.trim() === '')) {
    state.waypoints[lastIdx].lat = lat;
    state.waypoints[lastIdx].lon = lon;
    state.waypoints[lastIdx].name = friendlyName;
    const heroInp = document.getElementById('hero-end-input');
    if (heroInp) heroInp.value = friendlyName;
    updateWaypointsListUI();
    updateWaypointMarkers();
    showToast(`Varış: ${friendlyName}`, 'success');
    calculateRouteMain();
    return;
  }

  // 3. If start was typed but coordinate still missing
  if (state.waypoints[0].lat === null) {
    state.waypoints[0].lat = lat;
    state.waypoints[0].lon = lon;
    if (!state.waypoints[0].name) {
      state.waypoints[0].name = friendlyName;
      const heroInp = document.getElementById('hero-start-input');
      if (heroInp) heroInp.value = friendlyName;
    }
    updateWaypointsListUI();
    updateWaypointMarkers();
    return;
  }

  // 4. If end was typed but coordinate still missing
  if (state.waypoints[lastIdx].lat === null) {
    state.waypoints[lastIdx].lat = lat;
    state.waypoints[lastIdx].lon = lon;
    if (!state.waypoints[lastIdx].name) {
      state.waypoints[lastIdx].name = friendlyName;
      const heroInp = document.getElementById('hero-end-input');
      if (heroInp) heroInp.value = friendlyName;
    }
    updateWaypointsListUI();
    updateWaypointMarkers();
    calculateRouteMain();
    return;
  }

  // 5. Otherwise, add intermediate waypoint
  const newIndex = state.waypoints.length - 1;
  const newWp = {
    id: 'wp-' + Date.now(),
    type: 'waypoint',
    name: friendlyName,
    lat: lat,
    lon: lon,
    marker: null
  };
  state.waypoints.splice(newIndex, 0, newWp);
  updateWaypointsListUI();
  updateWaypointMarkers();
  showToast(`Ara durak: ${friendlyName}`, 'info');
  calculateRouteMain();
}

function updateWaypointMarkers() {
  if (!map) return;
  state.waypoints.forEach((wp, index) => {
    if (wp.lat === null || wp.lon === null) return;
    if (wp.marker) map.removeLayer(wp.marker);

    const isStart = index === 0;
    const isEnd = index === state.waypoints.length - 1;

    let pinClass = isStart ? 'pin-start' : isEnd ? 'pin-end' : 'pin-waypoint';
    let iconText = isStart ? 'A' : isEnd ? 'B' : `${index}`;

    const icon = L.divIcon({
      className: 'custom-pin-wrapper',
      html: `
        <div class="custom-pin ${pinClass} w-8 h-8 text-xs relative">
          ${isStart ? '<div class="pulse-effect"></div>' : ''}
          <span class="relative z-10">${iconText}</span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    wp.marker = L.marker([wp.lat, wp.lon], { icon, draggable: true }).addTo(map);

    wp.marker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      wp.lat = pos.lat;
      wp.lon = pos.lng;
      calculateRouteMain();
    });
  });
}

// ROUTING CALCULATION ENGINE & ALTERNATIVES
function showLoadingBanner(show, text) {
  const banner = document.getElementById('route-loading-banner');
  const txt = document.getElementById('route-loading-stage-text');
  if (!banner) return;
  if (show) {
    if (txt) txt.textContent = text || 'Rota hesaplanıyor...';
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

async function calculateRouteMain() {
  showLoadingBanner(true, '1. Rota durakları kontrol ediliyor...');

  // Auto geocode any waypoint with a name but missing coordinates
  for (let i = 0; i < state.waypoints.length; i++) {
    const wp = state.waypoints[i];
    if ((wp.lat === null || wp.lon === null) && wp.name && wp.name.trim() !== '') {
      showLoadingBanner(true, `Konum aranıyor: ${wp.name}...`);
      const coord = await geocodeLocation(wp.name);
      if (coord) {
        wp.lat = coord.lat;
        wp.lon = coord.lon;
      }
    }
  }
  updateWaypointMarkers();

  const validPoints = state.waypoints.filter(w => w.lat !== null && w.lon !== null);
  if (validPoints.length < 2) {
    showLoadingBanner(false);
    showToast('Lütfen en az başlangıç ve varış noktası girin veya haritadan 2 nokta seçin.', 'warning');
    return;
  }

  const requestId = ++state.routeRequestId;
  showLoadingBanner(true, '1. Güzergah hesaplanıyor...');

  try {
    // Stage 1: Generate multiple route alternatives
    showLoadingBanner(true, '2. Alternatif rotalar analiz ediliyor...');
    const alternatives = await fetchMultiRouteAlternatives(validPoints);
    if (requestId !== state.routeRequestId) return;

    if (!alternatives || alternatives.length === 0) {
      showLoadingBanner(false);
      showToast('Seçilen noktalar arasında uygun bir güzergah bulunamadı.', 'warning');
      return;
    }

    state.routeAlternatives = alternatives;
    state.activeRouteIndex = 0;
    const activeRoute = alternatives[0];
    state.routeData = activeRoute;

    // Record Real Telemetry for Route Calculation
    if (typeof RotamTelemetry !== 'undefined') {
      RotamTelemetry.recordRoute(validPoints);
    }

    // Clear initial highlight pins when active route takes over
    clearHighlightMarkers();

    // Draw Active Route & Ghost Alternatives on Map
    drawRoutesOnMap(alternatives, 0);

    if (map) {
      setTimeout(() => map.invalidateSize(), 80);
    }

    // Display Cockpit Stats
    displayRouteStats(activeRoute);
    renderRouteAlternativesUI(alternatives, 0);

    // Stage 3: Fetch Weather
    showLoadingBanner(true, '3. Güzergah hava durumu kontrol ediliyor...');
    fetchWeatherForRoute(validPoints[0], validPoints[validPoints.length - 1]);

    // Stage 4: 50 km Corridor POI Analysis
    showLoadingBanner(true, '4. 50 km çevredeki yerler keşfediliyor...');
    analyzeRouteCorridor(activeRoute, 50000);

    // Stage 5: Elevation Profile & Smart Stop Recommendations
    showLoadingBanner(true, '5. En iyi durak önerileri seçiliyor...');
    fetchAndDisplayElevation(activeRoute.geometry.coordinates);
    generateSmartStopRecommendations(activeRoute);
    renderJourneyTimeline();

    // Enable UI Panels
    document.getElementById('route-summary-panel')?.classList.remove('hidden');
    document.getElementById('weather-panel')?.classList.remove('hidden');
    document.getElementById('btn-export-gpx')?.removeAttribute('disabled');
    document.getElementById('btn-open-gmaps')?.removeAttribute('disabled');
    document.getElementById('btn-save-route-modal')?.removeAttribute('disabled');

    // Mobile mini cockpit
    const bottomBar = document.getElementById('mobile-bottom-bar');
    if (bottomBar) bottomBar.classList.remove('hidden');
    const mini = document.getElementById('mobile-mini-cockpit');
    const promptCard = document.getElementById('mobile-home-prompt-card');
    const plannerBtn = document.getElementById('btn-mobile-open-planner');
    if (mini) {
      mini.classList.remove('hidden');
      if (promptCard) promptCard.classList.add('hidden');
      if (plannerBtn) plannerBtn.classList.add('hidden');
      document.getElementById('mobile-mini-dist').textContent = (activeRoute.distance / 1000).toFixed(1) + ' km';
      const m = Math.floor(activeRoute.duration / 60);
      const isEn = (window.state && window.state.lang === 'en');
      const h = Math.floor(m / 60);
      const minRem = m % 60;
      document.getElementById('mobile-mini-dur').textContent = isEn ? `${h > 0 ? h + ' h ' : ''}${minRem} m` : `${h > 0 ? h + ' sa ' : ''}${minRem} dk`;
    }

    // On mobile, auto-close sidebar so user immediately views their route on the map
    if (window.innerWidth < 768) {
      closeMobileSidebar();
      if (routePolyline && map) {
        setTimeout(() => {
          map.fitBounds(routePolyline.getBounds(), { padding: [36, 36] });
        }, 120);
      }
    }

  } catch (error) {
    console.error('Route calculation error:', error);
    showToast('Rota hesaplanırken bir hata oluştu. Lütfen bağlantınızı kontrol edin.', 'error');
  } finally {
    showLoadingBanner(false);
  }
}

// Multi-Route Alternatives Generator
async function fetchMultiRouteAlternatives(points) {
  const coordsStr = points.map(p => `${p.lon},${p.lat}`).join(';');
  const results = [];

  // 1. OSRM with alternatives=true
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&alternatives=true`;
    const res = await fetchWithTimeout(osrmUrl, {}, 12000);
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        data.routes.forEach((r, idx) => {
          const title = idx === 0 ? '⚡ Hızlı (Ana Rota)' : `🌄 Alternatif ${idx + 1}`;
          const type = idx === 0 ? 'fastest' : 'scenic';
          results.push({
            id: `osrm-${idx}`,
            title: title,
            type: type,
            distance: r.distance,
            duration: r.duration,
            geometry: r.geometry,
            source: 'osrm'
          });
        });
      }
    }
  } catch (e) {
    console.warn('OSRM multi-route fetch error:', e);
  }

  // 2. Valhalla for Winding / Scenic if applicable
  try {
    const valhallaProfile = state.currentVehicle === 'motorcycle' ? 'twisty' : 'scenic';
    const valRoute = await fetchValhallaRoute(points, valhallaProfile);
    if (valRoute) {
      results.push({
        id: 'valhalla-scenic',
        title: state.currentVehicle === 'motorcycle' ? '🏍️ Virajlı (Motosiklet)' : '🌄 Manzaralı & Sakin',
        type: state.currentVehicle === 'motorcycle' ? 'twisty' : 'scenic',
        distance: valRoute.distance,
        duration: valRoute.duration,
        geometry: valRoute.geometry,
        source: 'valhalla'
      });
    }
  } catch (e) {
    console.warn('Valhalla alternative fetch error:', e);
  }

  // Deduplicate routes with identical distance (+- 2 km)
  const unique = [];
  results.forEach(r => {
    const exists = unique.some(u => Math.abs(u.distance - r.distance) < 2000);
    if (!exists) unique.push(r);
  });

  // Add ROTAM ÖNERİYOR (Recommended) badge if we have multiple options
  if (unique.length > 1) {
    unique[0].title = '⭐ ROTAM Öneriyor';
    unique[0].type = 'recommended';
  }

  return unique;
}

// Valhalla Route Engine
async function fetchValhallaRoute(points, profile) {
  const costingMap = {
    car: 'auto',
    motorcycle: 'motorcycle',
    camper: 'auto',
    bicycle: 'bicycle',
    walk: 'pedestrian'
  };

  const costing = costingMap[state.currentVehicle] || 'auto';
  let costingOptions = {};

  if (costing === 'motorcycle') {
    costingOptions = { motorcycle: { use_highways: 0.0, use_tolls: 0.0, use_primary: 0.3 } };
  } else if (costing === 'auto' && profile === 'scenic') {
    costingOptions = { auto: { use_highways: 0.1, use_tolls: 0.2 } };
  }

  const body = {
    locations: points.map(pt => ({ lat: pt.lat, lon: pt.lon })),
    costing: costing,
    costing_options: costingOptions,
    units: 'kilometers',
    directions_type: 'none'
  };

  const res = await fetchWithTimeout('https://valhalla1.openstreetmap.de/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }, 15000);

  if (!res.ok) throw new Error('Valhalla HTTP ' + res.status);
  const data = await res.json();
  if (!data.trip || !data.trip.legs) throw new Error('Valhalla trip empty');

  let coords = [];
  data.trip.legs.forEach(leg => {
    const legCoords = decodePolyline6(leg.shape);
    coords = coords.length ? coords.concat(legCoords.slice(1)) : legCoords;
  });

  return {
    distance: data.trip.summary.length * 1000,
    duration: data.trip.summary.time,
    geometry: { type: 'LineString', coordinates: coords }
  };
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
    coords.push([lon / 1e6, lat / 1e6]);
  }
  return coords;
}

async function fetchWithTimeout(url, options = {}, ms = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// Draw Active Route and Ghost Alternatives
function drawRoutesOnMap(routes, activeIdx) {
  if (!map) return;

  if (routePolyline) map.removeLayer(routePolyline);
  if (routeGlowPolyline) map.removeLayer(routeGlowPolyline);
  ghostPolylines.forEach(p => map.removeLayer(p));
  ghostPolylines = [];

  // Draw inactive ghost alternatives first
  routes.forEach((r, idx) => {
    if (idx === activeIdx) return;
    const latLngs = r.geometry.coordinates.map(c => [c[1], c[0]]);
    const ghost = L.polyline(latLngs, {
      color: '#64748b',
      weight: 4,
      opacity: 0.5,
      dashArray: '6, 8',
      lineCap: 'round'
    }).addTo(map);

    ghost.on('click', () => {
      selectAlternativeRoute(idx);
    });
    ghostPolylines.push(ghost);
  });

  // Draw active route with high-contrast dual glow
  const activeRoute = routes[activeIdx];
  const activeLatLngs = activeRoute.geometry.coordinates.map(c => [c[1], c[0]]);

  routeGlowPolyline = L.polyline(activeLatLngs, {
    color: '#f97316',
    weight: 9,
    opacity: 0.4,
    lineCap: 'round',
    lineJoin: 'round'
  }).addTo(map);

  routePolyline = L.polyline(activeLatLngs, {
    color: '#fed7aa',
    weight: 4,
    opacity: 0.95,
    lineCap: 'round',
    lineJoin: 'round'
  }).addTo(map);

  map.fitBounds(routePolyline.getBounds(), { padding: [50, 50] });
}

// Select Alternate Route
function selectAlternativeRoute(idx) {
  if (!state.routeAlternatives[idx]) return;
  state.activeRouteIndex = idx;
  const activeRoute = state.routeAlternatives[idx];
  state.routeData = activeRoute;

  drawRoutesOnMap(state.routeAlternatives, idx);
  displayRouteStats(activeRoute);
  renderRouteAlternativesUI(state.routeAlternatives, idx);
  analyzeRouteCorridor(activeRoute, 50000);
  fetchAndDisplayElevation(activeRoute.geometry.coordinates);
  generateSmartStopRecommendations(activeRoute);
  renderJourneyTimeline();
}

// Render Alternative Routes Comparison UI Cards
function renderRouteAlternativesUI(routes, activeIdx) {
  const container = document.getElementById('route-alternatives-container');
  const list = document.getElementById('alternatives-list');
  if (!container || !list) return;

  if (routes.length <= 1) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  list.innerHTML = '';

  routes.forEach((r, idx) => {
    const isActive = idx === activeIdx;
    const distKm = (r.distance / 1000).toFixed(1);
    const m = Math.floor(r.duration / 60);
    const isEn = (window.state && window.state.lang === 'en');
    const durStr = isEn ? `${Math.floor(m / 60)} h ${m % 60} m` : `${Math.floor(m / 60)} sa ${m % 60} dk`;
    const sourceLabel = r.source === 'valhalla'
      ? ((typeof t === 'function') ? t('source_scenic', 'Manzaralı Bölge Yolları') : 'Manzaralı Bölge Yolları')
      : ((typeof t === 'function') ? t('source_highway', 'Hızlı Otoyol Güzergahı') : 'Hızlı Otoyol Güzergahı');
    const titleLabel = r.type === 'recommended'
      ? ((typeof t === 'function') ? t('recommended_badge', '⭐ ROTAM Öneriyor') : '⭐ ROTAM Öneriyor')
      : r.title;

    const div = document.createElement('div');
    div.className = `route-card p-2.5 rounded-xl border flex items-center justify-between text-xs ${
      isActive ? 'active-route border-brand-500 bg-brand-500/10' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
    }`;
    div.onclick = () => selectAlternativeRoute(idx);

    div.innerHTML = `
      <div class="flex items-center space-x-2">
        <span class="w-2.5 h-2.5 rounded-full ${isActive ? 'bg-brand-500' : 'bg-slate-600'}"></span>
        <div>
          <p class="font-bold text-white text-xs">${titleLabel}</p>
          <p class="text-[10px] text-slate-400">${sourceLabel}</p>
        </div>
      </div>
      <div class="text-right">
        <span class="font-bold text-white">${distKm} km</span>
        <p class="text-[10px] text-amber-400 font-semibold">${durStr}</p>
      </div>
    `;

    list.appendChild(div);
  });
}

// Display Route Metrics & Cockpit Indicators
function displayRouteStats(route) {
  const distKm = (route.distance / 1000).toFixed(1);
  const durSec = route.duration;
  const hours = Math.floor(durSec / 3600);
  const minutes = Math.floor((durSec % 3600) / 60);
  const isEn = (window.state && window.state.lang === 'en');
  const durStr = isEn
    ? `${hours > 0 ? hours + ' h ' : ''}${minutes} m`
    : `${hours > 0 ? hours + ' sa ' : ''}${minutes} dk`;

  document.getElementById('stat-distance').textContent = `${distKm} km`;
  document.getElementById('stat-duration').textContent = durStr;

  const miniDist = document.getElementById('mobile-mini-dist');
  const miniDur = document.getElementById('mobile-mini-dur');
  if (miniDist) miniDist.textContent = `${distKm} km`;
  if (miniDur) miniDur.textContent = durStr;

  // Curviness / Score Evaluation
  const score = calculateCurvinessScore(route.geometry.coordinates);
  const scoreEl = document.getElementById('stat-score');
  if (scoreEl) {
    if (state.currentVehicle === 'motorcycle') scoreEl.textContent = `${score} / 100`;
    else if (state.currentVehicle === 'camper') scoreEl.textContent = `${Math.max(65, 100 - score)} / 100`;
    else scoreEl.textContent = `${Math.round(85 + (score % 15))} / 100`;
  }

  // Estimated fuel / breaks
  const fuelStops = Math.max(1, Math.floor(route.distance / (state.currentVehicle === 'motorcycle' ? 220000 : 450000)));
  const breaks = Math.max(1, Math.floor(durSec / 7200));

  const fuelEl = document.getElementById('stat-fuel-stops');
  const breakEl = document.getElementById('stat-coffee-breaks');
  const fuelPrefix = (typeof t === 'function') ? t('est_fuel_prefix', 'Tahmini Yakıt:') : 'Tahmini Yakıt:';
  const fuelSuffix = (typeof t === 'function') ? t('fuel_stops_suffix', 'Durak') : 'Durak';
  const breaksPrefix = (typeof t === 'function') ? t('suggested_breaks_prefix', 'Önerilen Mola:') : 'Önerilen Mola:';

  if (fuelEl) fuelEl.textContent = `${fuelPrefix} ${fuelStops} ${fuelSuffix}`;
  if (breakEl) breakEl.textContent = `${breaksPrefix} ${breaks}`;
}

// Curviness Score Algorithm
function calculateCurvinessScore(coords) {
  if (coords.length < 3) return 50;
  let totalAngle = 0;
  let count = 0;
  const step = Math.max(1, Math.floor(coords.length / 120));

  for (let i = step; i < coords.length - step; i += step) {
    const p1 = coords[i - step];
    const p2 = coords[i];
    const p3 = coords[i + step];

    const b1 = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
    const b2 = Math.atan2(p3[1] - p2[1], p3[0] - p2[0]);
    let diff = Math.abs(b2 - b1);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;

    totalAngle += diff;
    count++;
  }

  if (count === 0) return 50;
  const avgCurve = (totalAngle / count) * (180 / Math.PI);
  return Math.min(99, Math.max(35, Math.round(avgCurve * 4.2)));
}

// 50 KM GÜZERGAH KORİDORU ANALİZİ
function analyzeRouteCorridor(route, radiusMeters = 50000) {
  clearPoiMarkers();
  if (!route || !route.geometry || !route.geometry.coordinates) return;

  const coords = route.geometry.coordinates;
  const found = [];
  const counts = {
    historic: 0,
    nature: 0,
    photography: 0,
    beach: 0,
    gastronomy: 0,
    fuel: 0
  };

  state.allPlaces.forEach(p => {
    const distMeters = minDistanceToRoute(p.lat, p.lon, coords);
    if (distMeters <= radiusMeters) {
      const distKm = (distMeters / 1000).toFixed(1);
      const cat = p.category || 'historic';

      if (cat === 'nature' || cat === 'camping') {
        counts.nature++;
      } else if (cat === 'photography' || cat === 'viewpoint' || cat === 'mountain_pass') {
        counts.photography++;
      } else if (cat === 'gastronomy' || cat === 'cafe') {
        counts.gastronomy++;
      } else if (cat === 'fuel' || cat === 'ev_charge') {
        counts.fuel++;
      } else if (cat === 'beach') {
        counts.beach++;
      } else {
        counts.historic++;
      }

      found.push({ ...p, distKm: parseFloat(distKm) });
    }
  });

  // Sort by distance to route
  found.sort((a, b) => a.distKm - b.distKm);
  state.corridorPois = found;

  // Update Badge Counts
  const totalEl = document.getElementById('corridor-total-count');
  if (totalEl) totalEl.textContent = `${found.length} Nokta`;

  const rightPanelBadge = document.getElementById('badge-right-panel-poi-count');
  const headerBadge = document.getElementById('badge-header-poi-count');
  if (found.length > 0) {
    if (rightPanelBadge) {
      rightPanelBadge.textContent = found.length;
      rightPanelBadge.classList.remove('hidden');
    }
    if (headerBadge) {
      headerBadge.textContent = found.length;
      headerBadge.classList.remove('hidden');
    }
  } else {
    if (rightPanelBadge) rightPanelBadge.classList.add('hidden');
    if (headerBadge) headerBadge.classList.add('hidden');
  }

  const mobileMiniPois = document.getElementById('mobile-mini-pois');
  if (mobileMiniPois) {
    const isEn = (window.state && window.state.lang === 'en');
    mobileMiniPois.textContent = isEn ? `${found.length} Spots` : `${found.length} Keşif`;
  }

  const sidebarShortcutCount = document.getElementById('sidebar-shortcut-corridor-count');
  if (sidebarShortcutCount) {
    sidebarShortcutCount.textContent = `${found.length} Keşif`;
  }

  const countPills = {
    historic: document.getElementById('count-pill-historic'),
    nature: document.getElementById('count-pill-nature'),
    photography: document.getElementById('count-pill-photography'),
    beach: document.getElementById('count-pill-beach'),
    gastronomy: document.getElementById('count-pill-gastronomy'),
    fuel: document.getElementById('count-pill-fuel')
  };

  if (countPills.historic) countPills.historic.textContent = counts.historic;
  if (countPills.nature) countPills.nature.textContent = counts.nature;
  if (countPills.photography) countPills.photography.textContent = counts.photography;
  if (countPills.beach) countPills.beach.textContent = counts.beach;
  if (countPills.gastronomy) countPills.gastronomy.textContent = counts.gastronomy;
  if (countPills.fuel) countPills.fuel.textContent = counts.fuel;

  // Visual filter pill states
  updatePoiCategoryFilterUI();

  // Plot Markers on Map & Right List
  renderCorridorPoiMarkers();
  renderCorridorPoiList();
}

// Render POI Markers on Leaflet Map
function renderCorridorPoiMarkers() {
  clearPoiMarkers();
  if (!map) return;

  state.corridorPois.forEach(p => {
    const cat = p.category || 'historic';
    if (!state.activePoiCategories.has(cat)) return;

    const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.historic;
    const pinClass = cfg.pinClass || 'pin-historic';

    const icon = L.divIcon({
      className: 'custom-poi-marker',
      html: `
        <div class="custom-pin ${pinClass} w-7 h-7 text-xs flex items-center justify-center shadow-lg" title="${escapeHtml(p.name)}">
          <span>${cfg.emoji}</span>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const marker = L.marker([p.lat, p.lon], { icon }).addTo(map);

    marker.bindPopup(`
      <div class="text-xs p-1">
        <div class="flex items-center justify-between mb-1.5 gap-2">
          <strong style="color:${cfg.color}" class="font-bold flex items-center gap-1">
            <span>${cfg.emoji}</span>
            <span>${cfg.title}</span>
          </strong>
          <span class="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">Rotadan ${p.distKm} km</span>
        </div>
        <p class="font-bold text-white text-sm mt-0.5">${escapeHtml(p.name)}</p>
        ${p.description ? `<p class="text-[11px] text-slate-300 mt-1 leading-relaxed">${escapeHtml(p.description)}</p>` : ''}
        <div class="flex items-center space-x-1.5 mt-3 pt-2 border-t border-slate-800">
          <button onclick="addPlaceByIdToRoute(${p.id})" class="text-[10px] bg-brand-600 hover:bg-brand-500 text-white px-2.5 py-1.5 rounded-lg font-semibold shadow-md shadow-brand-600/30">
            Rotaya Ekle
          </button>
          <button onclick="openPlaceDetailById(${p.id})" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1.5 rounded-lg">
            Detaylar
          </button>
        </div>
      </div>
    `);

    state.poiMarkers.push(marker);
  });
}

function clearPoiMarkers() {
  state.poiMarkers.forEach(m => {
    if (map) map.removeLayer(m);
  });
  state.poiMarkers = [];
}

// Update Filter Pill Active/Inactive Visual States
function updatePoiCategoryFilterUI() {
  Object.keys(CATEGORY_GROUPS).forEach(key => {
    const btn = document.getElementById(`filter-pill-${key}`);
    if (!btn) return;
    const primary = CATEGORY_GROUPS[key][0];
    const isActive = state.activePoiCategories.has(primary);
    if (isActive) {
      btn.classList.remove('opacity-40', 'border-slate-900', 'bg-slate-950/40');
      btn.classList.add('opacity-100', 'border-slate-800', 'bg-slate-950');
    } else {
      btn.classList.remove('opacity-100', 'border-slate-800', 'bg-slate-950');
      btn.classList.add('opacity-40', 'border-slate-900', 'bg-slate-950/40');
    }
  });
}

// Toggle Corridor Filter Category Group
function togglePoiCategoryFilter(groupKey) {
  const members = CATEGORY_GROUPS[groupKey] || [groupKey];
  const isCurrentlyActive = state.activePoiCategories.has(members[0]);

  members.forEach(cat => {
    if (isCurrentlyActive) {
      state.activePoiCategories.delete(cat);
    } else {
      state.activePoiCategories.add(cat);
    }
  });

  updatePoiCategoryFilterUI();
  renderCorridorPoiMarkers();
  renderCorridorPoiList();
}

// Render Corridor POI List in Right Panel
function renderCorridorPoiList() {
  const container = document.getElementById('route-pois-list');
  const countLabel = document.getElementById('route-poi-list-count');
  if (!container) return;

  if (!state.routeData || !state.corridorPois || state.corridorPois.length === 0) {
    if (countLabel) countLabel.textContent = 'Rota bekleniyor';
    container.innerHTML = `
      <div class="glass-card p-4 rounded-2xl border border-slate-800 text-center space-y-2.5 my-2">
        <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center">
          <i data-lucide="radar" class="w-5 h-5"></i>
        </div>
        <p class="text-xs font-bold text-white">Rotada Keşif Bekleniyor</p>
        <p class="text-[11px] text-slate-400 leading-relaxed">
          Bir başlangıç ve varış noktası seçip rotanızı oluşturduğunuzda, güzergahınızın 50 km koridorundaki tarihi yerler, doğa harikaları, seyir tepeleri ve lezzet durakları burada taranıp listelenecektir.
        </p>
        <button onclick="showHomepagePlanner()" class="mt-1 bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-500 hover:to-orange-500 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-lg shadow-brand-600/30 active:scale-95 transition-all">
          Rotanı Oluştur
        </button>
      </div>
    `;
    initIcons();
    return;
  }

  const filtered = state.corridorPois.filter(p => state.activePoiCategories.has(p.category || 'historic'));
  if (countLabel) countLabel.textContent = `${filtered.length} yer listeleniyor`;

  container.innerHTML = '';
  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-500 py-3 text-center">Bu kategoride koridorda nokta bulunamadı. Filtreleri genişletin.</p>';
    return;
  }

  filtered.slice(0, 35).forEach(p => {
    const cfg = CATEGORY_CONFIG[p.category] || CATEGORY_CONFIG.historic;
    const div = document.createElement('div');
    div.className = 'glass-card p-2.5 rounded-xl border border-slate-800/80 flex items-start justify-between space-x-2 text-xs hover:border-slate-700 transition-all';

    div.innerHTML = `
      <div class="min-w-0 flex-1">
        <div class="flex items-center space-x-1.5">
          <span>${cfg.emoji}</span>
          <p class="font-bold text-white truncate">${escapeHtml(p.name)}</p>
        </div>
        <p class="text-[10px] text-slate-400 line-clamp-2 mt-0.5">${escapeHtml(p.description || '')}</p>
        <div class="flex items-center space-x-2 mt-1">
          <span class="text-[9px] text-amber-400 font-semibold">${(window.state && window.state.lang === 'en') ? `📍 ${p.distKm} km from route` : `📍 Rotadan ${p.distKm} km`}</span>
          ${p.recommended_duration ? `<span class="text-[9px] text-slate-400">⏱️ ${p.recommended_duration}</span>` : ''}
        </div>
      </div>
      <div class="flex flex-col space-y-1 shrink-0">
        <button onclick="addPlaceByIdToRoute(${p.id})" class="p-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-[10px] font-semibold flex items-center space-x-1 shadow-sm" title="Rotaya Ekle">
          <i data-lucide="plus" class="w-3 h-3"></i>
          <span>${(typeof t === 'function') ? t('btn_add_card', 'Ekle') : 'Ekle'}</span>
        </button>
        <button onclick="openPlaceDetailById(${p.id})" class="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-medium text-center" title="Detayları İncele">
          ${(typeof t === 'function') ? t('btn_details', 'Detay') : 'Detay'}
        </button>
      </div>
    `;
    container.appendChild(div);
  });
  initIcons();
}

// SMART STOP RECOMMENDATIONS (Detour Calculation)
function generateSmartStopRecommendations(route) {
  const container = document.getElementById('smart-recommendations-list');
  if (!container) return;

  container.innerHTML = '';

  if (!state.routeData || !state.corridorPois || state.corridorPois.length === 0) {
    container.innerHTML = `
      <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center text-[11px] text-slate-400">
        Rota oluşturulduğunda minimum sapmalı en popüler duraklar burada önerilecektir.
      </div>
    `;
    return;
  }

  // Select top-rated places with minimal detour (between 0.5 km and 15 km from route)
  const candidates = state.corridorPois
    .filter(p => p.distKm >= 0.5 && p.distKm <= 15.0)
    .sort((a, b) => (b.rating || 4.8) - (a.rating || 4.8));

  const picks = candidates.slice(0, 3);
  state.smartRecommendations = picks;

  if (picks.length === 0) {
    container.innerHTML = '<p class="text-[11px] text-slate-500 py-2">Bu güzergahta minimum sapmalı ek öneri bulunmuyor.</p>';
    return;
  }

  picks.forEach(p => {
    const cfg = CATEGORY_CONFIG[p.category] || CATEGORY_CONFIG.historic;
    const detourKm = (p.distKm * 1.8).toFixed(1);
    const detourMin = Math.round((detourKm / 45) * 60);

    const card = document.createElement('div');
    card.className = 'glass-card p-3 rounded-2xl border border-amber-500/30 bg-slate-950/80 space-y-2 text-xs animate-slide-in';

    card.innerHTML = `
      <div class="flex items-start justify-between">
        <div class="min-w-0">
          <div class="flex items-center space-x-1">
            <span>${cfg.emoji}</span>
            <span class="font-bold text-white text-xs truncate">${escapeHtml(p.name)}</span>
          </div>
          <span class="text-[10px] text-emerald-400 font-semibold">⭐ Şiddetle Önerilir</span>
        </div>
        <span class="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">+${detourKm} km / +${detourMin} dk</span>
      </div>
      <p class="text-[11px] text-slate-300 leading-relaxed">${escapeHtml(p.description || '')}</p>
      <div class="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-800">
        <span>Önerilen Mola: ${p.recommended_duration || '1-2 saat'}</span>
        <button onclick="addPlaceByIdToRoute(${p.id})" class="bg-brand-600 hover:bg-brand-500 text-white font-bold px-2.5 py-1 rounded-lg shadow-sm shadow-brand-600/30 flex items-center space-x-1">
          <i data-lucide="plus" class="w-3 h-3"></i>
          <span>ROTAYA EKLE</span>
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  initIcons();
}

// Add Place by Database ID to Route
function addPlaceByIdToRoute(id) {
  const place = state.allPlaces.find(p => p.id === id);
  if (!place) return;
  addPoiToRoute(place.lat, place.lon, place.name);
}

// Add POI to Route as an Optimal Intermediate Waypoint
function addPoiToRoute(lat, lon, name) {
  // Prevent duplicate additions
  const isDuplicate = state.waypoints.some(w => {
    if (w.lat === null || w.lon === null) return false;
    const dist = haversineMeters(w.lat, w.lon, lat, lon);
    return dist < 120 || (w.name && w.name.trim().toLowerCase() === name.trim().toLowerCase());
  });

  if (isDuplicate) {
    showToast(`"${name}" zaten rotanızda durak olarak ekli.`, 'info');
    return;
  }

  const insertIndex = Math.max(1, state.waypoints.length - 1);
  const newWp = {
    id: 'wp-' + Date.now(),
    type: 'waypoint',
    name: name,
    lat: lat,
    lon: lon,
    marker: null
  };

  state.waypoints.splice(insertIndex, 0, newWp);
  updateWaypointsListUI();
  updateWaypointMarkers();
  if (typeof RotamTelemetry !== 'undefined') {
    RotamTelemetry.recordStopAdded();
  }
  calculateRouteMain();

  showToast(`"${name}" rotanıza durak olarak eklendi! Güzergah güncelleniyor...`, 'success');
}

// Reordering stops along the route
function moveWaypointUp(index) {
  if (index <= 1 || index >= state.waypoints.length - 1) return;
  const temp = state.waypoints[index];
  state.waypoints[index] = state.waypoints[index - 1];
  state.waypoints[index - 1] = temp;
  updateWaypointsListUI();
  updateWaypointMarkers();
  calculateRouteMain();
}

function moveWaypointDown(index) {
  if (index < 1 || index >= state.waypoints.length - 2) return;
  const temp = state.waypoints[index];
  state.waypoints[index] = state.waypoints[index + 1];
  state.waypoints[index + 1] = temp;
  updateWaypointsListUI();
  updateWaypointMarkers();
  calculateRouteMain();
}

// JOURNEY TIMELINE
function renderJourneyTimeline() {
  const container = document.getElementById('journey-timeline-container');
  if (!container) return;

  container.innerHTML = '';
  const valid = state.waypoints.filter(w => w.lat !== null && w.lon !== null);

  if (!state.routeData || valid.length < 2) {
    container.innerHTML = `
      <div class="glass-card p-4 rounded-2xl border border-slate-800 text-center space-y-2.5 my-2">
        <div class="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 mx-auto flex items-center justify-center">
          <i data-lucide="clock" class="w-5 h-5"></i>
        </div>
        <p class="text-xs font-bold text-white">${(typeof t === 'function') ? t('timeline_not_ready_title', 'Yolculuk Akışı Hazır Değil') : 'Yolculuk Akışı Hazır Değil'}</p>
        <p class="text-[11px] text-slate-400 leading-relaxed">
          ${(typeof t === 'function') ? t('timeline_not_ready_desc', 'Başlangıç ve varış noktalarınızı belirleyip rotanızı oluşturduğunuzda, sürüş sırasına göre tüm duraklar, mola önerileri ve etap süreleri bu akışta yer alacaktır.') : ''}
        </p>
        <button onclick="showHomepagePlanner()" class="mt-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs py-2 px-4 rounded-xl active:scale-95 transition-all">
          ${(typeof t === 'function') ? t('timeline_set_stops_btn', 'Durakları Belirle') : 'Durakları Belirle'}
        </button>
      </div>
    `;
    initIcons();
    return;
  }

  // Header Overview Card
  const totalKm = (state.routeData.distance / 1000).toFixed(1);
  const totalMinutes = Math.floor(state.routeData.duration / 60);
  const totalH = Math.floor(totalMinutes / 60);
  const totalM = totalMinutes % 60;
  const isEn = (window.state && window.state.lang === 'en');
  const durStr = isEn ? `${totalH > 0 ? totalH + ' h ' : ''}${totalM} m` : `${totalH > 0 ? totalH + ' sa ' : ''}${totalM} dk`;
  const stopsCount = valid.length - 2;

  const summaryCard = document.createElement('div');
  summaryCard.className = 'glass-card p-3 rounded-2xl border border-brand-500/20 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/20 mb-3 text-xs space-y-1.5';
  summaryCard.innerHTML = `
    <div class="flex items-center justify-between">
      <span class="text-[10px] font-bold text-brand-400 uppercase tracking-wider">${(typeof t === 'function') ? t('timeline_summary_title', 'Sürüş Özeti') : 'Sürüş Özeti'}</span>
      <span class="text-[10px] bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full font-bold">${valid.length} ${(typeof t === 'function') ? t('timeline_points_count', 'Nokta') : 'Nokta'}</span>
    </div>
    <div class="flex items-center justify-between text-white font-bold text-sm">
      <span>${totalKm} km</span>
      <span class="text-amber-400">${durStr}</span>
    </div>
    <div class="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
      <span>${isEn ? 'Stops: ' + (stopsCount > 0 ? stopsCount : 'Direct Route') : 'Ara Durak: ' + (stopsCount > 0 ? stopsCount : 'Doğrudan Rota')}</span>
      <span>${isEn ? 'Suggested Breaks: ' + Math.max(1, Math.floor(totalMinutes / 120)) : 'Önerilen Dinlenme: ' + Math.max(1, Math.floor(totalMinutes / 120)) + ' Mola'}</span>
    </div>
    <div class="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800">
      <button onclick="startLiveRide()" class="col-span-2 py-2.5 px-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-cyan-600/30 active:scale-95 transition-all" title="Canlı Sürüş & GPS Takip Modu">
        <i data-lucide="play" class="w-3.5 h-3.5 fill-white text-white"></i>
        <span>${(typeof t === 'function') ? t('btn_start_live_ride', 'CANLI SÜRÜŞÜ BAŞLAT') : 'CANLI SÜRÜŞÜ BAŞLAT'}</span>
      </button>
      <button onclick="openInGoogleMaps()" class="col-span-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-xl text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-all" title="Google Maps Navigasyonu Başlat">
        <i data-lucide="navigation" class="w-3.5 h-3.5 text-emerald-400"></i>
        <span>${(typeof t === 'function') ? t('timeline_gmaps_btn', "Google Maps'e Gönder") : "Google Maps'e Gönder"}</span>
      </button>
    </div>
  `;
  container.appendChild(summaryCard);

  // Chronological Timeline Items
  valid.forEach((wp, idx) => {
    const isStart = idx === 0;
    const isEnd = idx === valid.length - 1;
    const isWaypoint = !isStart && !isEnd;
    const realIdx = state.waypoints.indexOf(wp);

    const div = document.createElement('div');
    div.className = 'timeline-item flex items-start space-x-3 text-xs relative pb-4';

    let dotColor = isStart ? 'bg-emerald-500 shadow-emerald-500/50' : isEnd ? 'bg-red-500 shadow-red-500/50' : 'bg-amber-500 shadow-amber-500/50';
    let label = isStart ? ((typeof t === 'function') ? t('timeline_start', 'BAŞLANGIÇ NOKTASI') : 'BAŞLANGIÇ NOKTASI')
      : isEnd ? ((typeof t === 'function') ? t('timeline_end', 'VARIŞ NOKTASI') : 'VARIŞ NOKTASI')
      : `${(typeof t === 'function') ? t('timeline_waypoint', 'ARA DURAK') : 'ARA DURAK'} ${idx}`;
    let icon = isStart ? '🏁' : isEnd ? '🎯' : '📍';

    div.innerHTML = `
      <div class="w-6 h-6 rounded-full ${dotColor} flex items-center justify-center text-[10px] font-bold text-white shrink-0 z-10 shadow-lg">
        ${isStart ? 'A' : isEnd ? 'B' : idx}
      </div>
      <div class="glass-card p-2.5 rounded-xl border border-slate-800 flex-1 hover:border-slate-700 transition-all">
        <div class="flex items-center justify-between">
          <span class="text-[9px] font-bold uppercase text-slate-400 tracking-wider flex items-center space-x-1">
            <span>${icon}</span>
            <span>${label}</span>
          </span>
          ${isWaypoint && realIdx > 0 ? `
            <div class="flex items-center space-x-1">
              ${realIdx > 1 ? `
                <button onclick="moveWaypointUp(${realIdx})" class="p-1 text-slate-400 hover:text-white" title="Yukarı Taşı">
                  <i data-lucide="chevron-up" class="w-3 h-3"></i>
                </button>
              ` : ''}
              ${realIdx < state.waypoints.length - 2 ? `
                <button onclick="moveWaypointDown(${realIdx})" class="p-1 text-slate-400 hover:text-white" title="Aşağı Taşı">
                  <i data-lucide="chevron-down" class="w-3 h-3"></i>
                </button>
              ` : ''}
              <button onclick="removeWaypoint(${realIdx})" class="p-1 text-slate-500 hover:text-red-400" title="Durağı Kaldır">
                <i data-lucide="trash-2" class="w-3 h-3"></i>
              </button>
            </div>
          ` : ''}
        </div>
        <p class="font-bold text-white text-xs mt-0.5">${escapeHtml(wp.name || (isStart ? 'Başlangıç Konumu' : isEnd ? 'Varış Konumu' : 'İsimsiz Durak'))}</p>
        <p class="text-[10px] text-slate-400 mt-0.5">${isStart ? 'Çıkış Noktası' : isEnd ? 'Hedef Varış' : 'Planlanan Durak'}</p>
      </div>
    `;

    container.appendChild(div);

    // Insert Suggested Rest / Coffee Break between segments if long drive
    if (!isEnd && totalMinutes >= 120 && idx === 0 && valid.length === 2) {
      const breakDiv = document.createElement('div');
      breakDiv.className = 'timeline-item flex items-start space-x-3 text-xs relative pb-4 pl-1';
      breakDiv.innerHTML = `
        <div class="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center text-[10px] shrink-0 z-10">
          ☕
        </div>
        <div class="bg-slate-950/70 p-2 rounded-xl border border-sky-500/20 flex-1 text-[11px]">
          <div class="flex items-center justify-between text-sky-300 font-semibold">
            <span>Önerilen Dinlenme Molası</span>
            <span class="text-[10px] text-slate-400">~2. saat civarı</span>
          </div>
          <p class="text-[10px] text-slate-400 mt-0.5">Sürüş güvenliği için 15-20 dk dinlenme tavsiye edilir.</p>
        </div>
      `;
      container.appendChild(breakDiv);
    }
  });

  initIcons();
}

// Right Panel Toggling & Tabs
function toggleRightPanel() {
  const panel = document.getElementById('right-panel');
  if (!panel) return;
  if (!panel.classList.contains('hidden')) {
    closeRightPanel();
  } else {
    openRightPanel();
  }
}

function openRightPanel() {
  const panel = document.getElementById('right-panel');
  const toggleBtn = document.getElementById('btn-toggle-right-panel');
  const navBtn = document.getElementById('nav-btn-stream');
  const mapControls = document.getElementById('floating-map-controls');
  const elevPanel = document.getElementById('elevation-panel');
  if (!panel) return;

  // On mobile, close left sidebar to prevent overlay collision
  if (window.innerWidth < 768) {
    closeMobileSidebar();
  }

  panel.classList.remove('hidden');
  panel.classList.add('flex');
  if (toggleBtn) toggleBtn.classList.add('hidden');
  if (navBtn) {
    navBtn.classList.add('bg-slate-800', 'text-white', 'border', 'border-amber-500/40');
    navBtn.classList.remove('text-slate-300');
  }
  if (mapControls && window.innerWidth >= 768) {
    mapControls.classList.add('shifted');
  }
  if (elevPanel && window.innerWidth >= 768) {
    elevPanel.classList.add('with-right-panel');
  }

  // Ensure content is fresh
  renderCorridorPoiList();
  renderJourneyTimeline();

  initIcons();
  if (map) {
    setTimeout(() => map.invalidateSize(), 100);
    setTimeout(() => map.invalidateSize(), 350);
  }
}

function closeRightPanel() {
  const panel = document.getElementById('right-panel');
  const toggleBtn = document.getElementById('btn-toggle-right-panel');
  const navBtn = document.getElementById('nav-btn-stream');
  const mapControls = document.getElementById('floating-map-controls');
  const elevPanel = document.getElementById('elevation-panel');
  if (!panel) return;

  panel.classList.add('hidden');
  panel.classList.remove('flex');
  if (toggleBtn && (!window.LiveNavigation || !window.LiveNavigation.isActive)) {
    toggleBtn.classList.remove('hidden');
  }
  if (navBtn) {
    navBtn.classList.remove('bg-slate-800', 'text-white', 'border', 'border-amber-500/40');
    navBtn.classList.add('text-slate-300');
  }
  if (mapControls) {
    mapControls.classList.remove('shifted');
  }
  if (elevPanel) {
    elevPanel.classList.remove('with-right-panel');
  }
  if (map) {
    setTimeout(() => map.invalidateSize(), 100);
    setTimeout(() => map.invalidateSize(), 350);
  }
}

function switchRightTab(tab) {
  const btnDiscover = document.getElementById('tab-btn-discover');
  const btnTimeline = document.getElementById('tab-btn-timeline');
  const contentDiscover = document.getElementById('tab-content-discover');
  const contentTimeline = document.getElementById('tab-content-timeline');

  if (tab === 'discover') {
    if (btnDiscover) btnDiscover.className = 'px-3 py-1 rounded-lg font-semibold bg-brand-600 text-white shadow-sm';
    if (btnTimeline) btnTimeline.className = 'px-3 py-1 rounded-lg font-semibold text-slate-400 hover:text-white';
    if (contentDiscover) contentDiscover.classList.remove('hidden');
    if (contentTimeline) contentTimeline.classList.add('hidden');
  } else {
    if (btnTimeline) btnTimeline.className = 'px-3 py-1 rounded-lg font-semibold bg-brand-600 text-white shadow-sm';
    if (btnDiscover) btnDiscover.className = 'px-3 py-1 rounded-lg font-semibold text-slate-400 hover:text-white';
    if (contentTimeline) contentTimeline.classList.remove('hidden');
    if (contentDiscover) contentDiscover.classList.add('hidden');
  }
}

// Elevation Canvas & API Setup
async function fetchAndDisplayElevation(coords) {
  const panel = document.getElementById('elevation-panel');
  if (!panel || coords.length < 5) return;

  const samplePoints = [];
  const step = Math.max(1, Math.floor(coords.length / 40));
  for (let i = 0; i < coords.length; i += step) samplePoints.push(coords[i]);
  if (samplePoints[samplePoints.length - 1] !== coords[coords.length - 1]) {
    samplePoints.push(coords[coords.length - 1]);
  }

  const lats = samplePoints.map(p => p[1].toFixed(4)).join(',');
  const lons = samplePoints.map(p => p[0].toFixed(4)).join(',');

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`);
    if (!res.ok) throw new Error('Elevation API failed');
    const data = await res.json();
    const elevations = data.elevation || [];
    if (elevations.length === 0) return;

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

    // Only unhide elevation automatically on desktop (>= 768px)
    if (window.innerWidth >= 768) {
      panel.classList.remove('hidden');
    }
    drawElevationChart(state.elevationData);

  } catch (e) {
    console.warn('Elevation data unavailable:', e);
    document.getElementById('stat-elevation').textContent = 'Mevcut Değil';
  }
}

function setupElevationCanvas() {
  const canvas = document.getElementById('elevation-chart');
  if (!canvas) return;

  canvas.addEventListener('mousemove', (e) => {
    if (!state.elevationData || state.elevationData.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const index = Math.round(ratio * (state.elevationData.length - 1));
    const point = state.elevationData[index];

    if (point) {
      document.getElementById('elevation-hover-info').textContent = `Rakım: ${Math.round(point.elev)}m`;
      if (map) {
        if (!state.elevationHoverMarker) {
          state.elevationHoverMarker = L.circleMarker(point.coord, {
            radius: 6,
            color: '#ffffff',
            fillColor: '#f97316',
            fillOpacity: 1,
            weight: 2
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

  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const elevs = data.map(d => d.elev);
  const minElev = Math.min(...elevs) - 20;
  const maxElev = Math.max(...elevs) + 30;
  const range = Math.max(maxElev - minElev, 1);

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(249, 115, 22, 0.4)');
  grad.addColorStop(1, 'rgba(249, 115, 22, 0.02)');

  ctx.beginPath();
  ctx.moveTo(0, h);
  data.forEach((d, idx) => {
    const x = (idx / (data.length - 1)) * w;
    const y = h - ((d.elev - minElev) / range) * (h - 15) - 5;
    ctx.lineTo(x, y);
  });
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  data.forEach((d, idx) => {
    const x = (idx / (data.length - 1)) * w;
    const y = h - ((d.elev - minElev) / range) * (h - 15) - 5;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function toggleElevationPanelVisibility() {
  const panel = document.getElementById('elevation-panel');
  if (panel) panel.classList.toggle('hidden');
}

// Weather Integration (Open-Meteo) with Honest "Veri Alınamadı" States
async function fetchWeatherForRoute(startWp, endWp) {
  const startTemp = document.getElementById('weather-start-temp');
  const startWind = document.getElementById('weather-start-wind');
  const endTemp = document.getElementById('weather-end-temp');
  const endWind = document.getElementById('weather-end-wind');

  try {
    const [startRes, endRes] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${startWp.lat}&longitude=${startWp.lon}&current=temperature_2m,wind_speed_10m`),
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${endWp.lat}&longitude=${endWp.lon}&current=temperature_2m,wind_speed_10m`)
    ]);

    if (startRes.ok) {
      const sData = await startRes.json();
      startTemp.textContent = `${Math.round(sData.current.temperature_2m)}°C`;
      startWind.textContent = `${Math.round(sData.current.wind_speed_10m)} km/s rüzgar`;
    } else {
      startTemp.textContent = 'Veri alınamadı';
    }

    if (endRes.ok) {
      const eData = await endRes.json();
      endTemp.textContent = `${Math.round(eData.current.temperature_2m)}°C`;
      endWind.textContent = `${Math.round(eData.current.wind_speed_10m)} km/s rüzgar`;
    } else {
      endTemp.textContent = 'Veri alınamadı';
    }
  } catch (err) {
    console.warn('Weather fetch error:', err);
    startTemp.textContent = 'Veri alınamadı';
    endTemp.textContent = 'Veri alınamadı';
  }
}

// Distance Helper Functions
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

function minDistanceToRoute(lat, lon, routeCoords) {
  if (!routeCoords || routeCoords.length === 0) return Infinity;
  let minDist = Infinity;
  const step = Math.max(1, Math.floor(routeCoords.length / 350));
  for (let i = 0; i < routeCoords.length; i += step) {
    const p = routeCoords[i];
    const d = haversineMeters(lat, lon, p[1], p[0]);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

// MODAL: TÜRKİYE'Yİ KEŞFET (STANDALONE DESTINATION BROWSER)
let discoverFilterCat = 'all';
let discoverFilterReg = 'all';

function openDiscoverModal() {
  const modal = document.getElementById('modal-discover');
  if (!modal) return;
  modal.classList.remove('hidden');
  filterDiscoverPlaces();
}

function closeDiscoverModal() {
  document.getElementById('modal-discover')?.classList.add('hidden');
}

function selectDiscoverCategory(cat) {
  discoverFilterCat = cat;
  document.querySelectorAll('.discover-cat-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === cat);
    btn.classList.toggle('bg-amber-500/20', btn.dataset.cat === cat);
    btn.classList.toggle('text-amber-400', btn.dataset.cat === cat);
    btn.classList.toggle('border-amber-500/40', btn.dataset.cat === cat);
  });
  filterDiscoverPlaces();
}

function selectDiscoverRegion(reg) {
  discoverFilterReg = reg;
  document.querySelectorAll('.discover-reg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.reg === reg);
    btn.classList.toggle('bg-slate-800', btn.dataset.reg === reg);
    btn.classList.toggle('text-amber-400', btn.dataset.reg === reg);
  });
  filterDiscoverPlaces();
}

function filterDiscoverPlaces() {
  const container = document.getElementById('discover-places-grid');
  const search = document.getElementById('discover-search-input')?.value.toLowerCase().trim() || '';
  if (!container) return;

  container.innerHTML = '';

  const filtered = state.allPlaces.filter(p => {
    if (discoverFilterCat !== 'all' && p.category !== discoverFilterCat) return false;
    if (discoverFilterReg !== 'all' && (p.region || '') !== discoverFilterReg) return false;
    if (search) {
      const matchName = (p.name || '').toLowerCase().includes(search);
      const matchDesc = (p.description || '').toLowerCase().includes(search);
      const matchCity = (p.city || '').toLowerCase().includes(search);
      return matchName || matchDesc || matchCity;
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-400 py-8 text-center col-span-2">Arama kriterlerine uygun mekan bulunamadı.</p>';
    return;
  }

  filtered.slice(0, 40).forEach(p => {
    const cfg = CATEGORY_CONFIG[p.category] || CATEGORY_CONFIG.historic;
    const card = document.createElement('div');
    card.className = 'glass-card p-3 rounded-2xl border border-slate-800/80 flex flex-col justify-between space-y-2 hover:border-amber-500/40 transition-all';
    const safeName = escapeHtml(p.name).replace(/'/g, "\\'");

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-1">
          <span class="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1">
            <span>${cfg.emoji}</span>
            <span>${(window.state && window.state.lang === 'en' && cfg.title_en) ? cfg.title_en : cfg.title}</span>
          </span>
          <span class="text-[10px] text-slate-400">${p.city || p.region || 'Türkiye'}</span>
        </div>
        <h4 class="font-bold text-white text-sm">${escapeHtml(p.name)}</h4>
        <p class="text-[11px] text-slate-300 mt-1 line-clamp-2">${escapeHtml(p.description || '')}</p>
      </div>

      <div class="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px]">
        <span class="text-slate-400">⏱️ ${p.recommended_duration || ((window.state && window.state.lang === 'en') ? '1 hour' : '1 saat')}</span>
        <div class="flex items-center space-x-1.5">
          <button onclick="openPlaceDetailById(${p.id})" class="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 flex items-center space-x-1" title="Fotoğraflar ve Detaylar">
            <i data-lucide="camera" class="w-3 h-3"></i>
            <span>${(typeof t === 'function') ? t('btn_photo', 'Fotoğraf') : 'Fotoğraf'}</span>
          </button>
          <button onclick="setAsDestination(${p.lat}, ${p.lon}, '${safeName}')" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold">
            ${(typeof t === 'function') ? t('btn_target', 'Hedef') : 'Hedef'}
          </button>
          <button onclick="addPoiToRoute(${p.lat}, ${p.lon}, '${safeName}')" class="px-2 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold">
            ${(typeof t === 'function') ? t('btn_add_card', 'Ekle') : 'Ekle'}
          </button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  initIcons();
}

function setAsDestination(lat, lon, name) {
  state.waypoints[state.waypoints.length - 1].lat = lat;
  state.waypoints[state.waypoints.length - 1].lon = lon;
  state.waypoints[state.waypoints.length - 1].name = name;
  closeDiscoverModal();
  updateWaypointsListUI();
  updateWaypointMarkers();
  calculateRouteMain();
}

// MODAL: YAKINIMDA NE VAR? (GPS GEO-EXPLORER)
let nearbyRadius = 50;

function openNearbyModal() {
  document.getElementById('modal-nearby')?.classList.remove('hidden');
  fetchNearby(nearbyRadius);
}

function closeNearbyModal() {
  document.getElementById('modal-nearby')?.classList.add('hidden');
}

function refreshNearbyGPS() {
  fetchNearby(nearbyRadius, true);
}

function fetchNearby(radiusKm, forceGps = false) {
  nearbyRadius = radiusKm;
  document.querySelectorAll('.nearby-radius-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.radius) === radiusKm);
    btn.classList.toggle('bg-emerald-600', parseInt(btn.dataset.radius) === radiusKm);
    btn.classList.toggle('text-white', parseInt(btn.dataset.radius) === radiusKm);
  });

  const list = document.getElementById('nearby-places-list');
  if (!list) return;

  if (!state.userLocation || forceGps) {
    if (!navigator.geolocation) {
      list.innerHTML = '<p class="text-xs text-red-400 text-center py-4">Tarayıcınız konum servisini desteklemiyor.</p>';
      return;
    }
    list.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">Konumunuz alınıyor...</p>';

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.userLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        renderNearbyResults(pos.coords.latitude, pos.coords.longitude, radiusKm);
      },
      (err) => {
        list.innerHTML = `<p class="text-xs text-red-400 text-center py-4">Konum erişimi reddedildi: ${err.message}</p>`;
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  } else {
    renderNearbyResults(state.userLocation.lat, state.userLocation.lon, radiusKm);
  }
}

function renderNearbyResults(uLat, uLon, radiusKm) {
  const list = document.getElementById('nearby-places-list');
  if (!list) return;

  const nearby = [];
  state.allPlaces.forEach(p => {
    const dMeters = haversineMeters(uLat, uLon, p.lat, p.lon);
    const dKm = dMeters / 1000;
    if (dKm <= radiusKm) {
      nearby.push({ ...p, distKm: dKm });
    }
  });

  nearby.sort((a, b) => a.distKm - b.distKm);

  list.innerHTML = '';
  if (nearby.length === 0) {
    list.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">${radiusKm} km çevrenizde kayıtlı mekan bulunamadı. Yarıçapı artırmayı deneyin.</p>`;
    return;
  }

  nearby.forEach(p => {
    const cfg = CATEGORY_CONFIG[p.category] || CATEGORY_CONFIG.historic;
    const div = document.createElement('div');
    div.className = 'glass-card p-3 rounded-xl border border-slate-800 flex items-center justify-between space-x-2 text-xs';
    const safeName = escapeHtml(p.name).replace(/'/g, "\\'");

    div.innerHTML = `
      <div class="min-w-0 flex-1">
        <div class="flex items-center space-x-1.5">
          <span>${cfg.emoji}</span>
          <p class="font-bold text-white truncate">${escapeHtml(p.name)}</p>
        </div>
        <p class="text-[10px] text-slate-400 truncate mt-0.5">${escapeHtml(p.description || '')}</p>
        <span class="text-[10px] text-emerald-400 font-semibold">Mesafe: ${p.distKm.toFixed(1)} km</span>
      </div>
      <button onclick="addPoiToRoute(${p.lat}, ${p.lon}, '${safeName}'); closeNearbyModal();" class="px-2.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold shrink-0">
        Rotaya Ekle
      </button>
    `;

    list.appendChild(div);
  });
}

// MODAL: KAYITLI ROTALAR & KAYDETME
function openSaveRouteModal() {
  document.getElementById('modal-save-route')?.classList.remove('hidden');
}

function closeSaveRouteModal() {
  document.getElementById('modal-save-route')?.classList.add('hidden');
}

function handleSaveRouteSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('save-route-title')?.value.trim();
  const notes = document.getElementById('save-route-desc')?.value.trim();

  if (!title) return;

  const newSaved = {
    id: 'route-' + Date.now(),
    title: title,
    notes: notes,
    vehicle: state.currentVehicle,
    date: new Date().toLocaleDateString('tr-TR'),
    distanceKm: state.routeData ? (state.routeData.distance / 1000).toFixed(1) : '0',
    waypoints: state.waypoints.map(w => ({ name: w.name, lat: w.lat, lon: w.lon }))
  };

  let savedList = [];
  try {
    const raw = localStorage.getItem('rotam_saved_routes');
    if (raw) savedList = JSON.parse(raw);
  } catch (err) {}

  savedList.unshift(newSaved);
  localStorage.setItem('rotam_saved_routes', JSON.stringify(savedList));

  closeSaveRouteModal();
  showToast('Rota başarıyla kaydedildi!', 'success');
}

// ==========================================
// EFSANE HAZIR ROTALAR (CURATED SCENIC ROUTES)
// ==========================================
const PRESET_ROUTES = [
  {
    id: 'kas-kalkan-fethiye',
    title: 'Kaş - Kalkan - Fethiye Sahil Yolu (D400)',
    category: 'Motosiklet & Deniz Manzarası',
    tag: 'coast',
    description: 'Turkuaz deniz manzaralı, keskin uçurum virajları ve Kaputaş Kanyonu geçişiyle Türkiye\'nin en popüler kıyı sürüş rotası.',
    difficulty: 'Orta / İleri',
    twistiness: 94,
    distanceKm: 106,
    durationText: '2 saat 15 dk',
    badgeClass: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    points: [
      { name: 'Kaş Marina (Antalya)', lat: 36.1993, lon: 29.6377 },
      { name: 'Kaputaş Plajı & Kanyonu', lat: 36.2287, lon: 29.4491 },
      { name: 'Kalkan Seyir Tepesi', lat: 36.2625, lon: 29.4146 },
      { name: 'Fethiye Ölüdeniz (Muğla)', lat: 36.5498, lon: 29.1256 }
    ]
  },
  {
    id: 'sakar-gecidi-akyaka-datca',
    title: 'Muğla Sakar Geçidi & Akyaka - Datça',
    category: 'Efsane Saç Tokası Virajlar',
    tag: 'moto',
    description: '670 metreden deniz seviyesine inen meşhur Sakar Geçidi saç tokası virajları, Gökova Körfezi panoraması ve Datça Yarımadası.',
    difficulty: 'İleri',
    twistiness: 96,
    distanceKm: 142,
    durationText: '2 saat 40 dk',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    points: [
      { name: 'Muğla Merkez', lat: 37.2153, lon: 28.3636 },
      { name: 'Sakar Geçidi Seyir Terası', lat: 37.0678, lon: 28.3412 },
      { name: 'Akyaka Azmak Nehri', lat: 37.0545, lon: 28.3242 },
      { name: 'Datça Yarımadası', lat: 36.7262, lon: 27.6841 }
    ]
  },
  {
    id: 'bolu-dagi-abant-yedigoller',
    title: 'Bolu Dağı Eski Geçit & Abant Virajları',
    category: 'Dağ & Orman Virajları',
    tag: 'nature',
    description: 'Otoyol tüneli yerine eski Bolu Dağı zirve geçidi ve Abant çam ormanları arasındaki saf sürüş keyfi sunan teknik virajlar.',
    difficulty: 'Orta',
    twistiness: 88,
    distanceKm: 85,
    durationText: '1 saat 50 dk',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    points: [
      { name: 'Düzce Kaynaşlı', lat: 40.7781, lon: 31.3094 },
      { name: 'Bolu Dağı Eski Geçit Zirve', lat: 40.7421, lon: 31.4285 },
      { name: 'Abant Gölü Tabiat Parkı', lat: 40.6053, lon: 31.2828 },
      { name: 'Gölcük Tabiat Parkı (Bolu)', lat: 40.6558, lon: 31.6288 }
    ]
  },
  {
    id: 'likya-antik-rotasi',
    title: 'Likya Antik Kentleri & Kıyı Virajları Turu',
    category: 'Antik Kent & Kıyı Virajları',
    tag: 'history',
    description: 'Tlos, Patara, Kaş Antiphellos ve Simena Batık Şehir üzerinden Akdeniz\'in en büyüleyici tarihi rotası.',
    difficulty: 'Orta',
    twistiness: 95,
    distanceKm: 118,
    durationText: '2 saat 30 dk',
    badgeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    points: [
      { name: 'Tlos Antik Kenti & Akropol', lat: 36.5539, lon: 29.3533 },
      { name: 'Patara Antik Kenti & Meclisi', lat: 36.2608, lon: 29.3142 },
      { name: 'Kaş Antiphellos Tiyatrosu', lat: 36.1993, lon: 29.6377 },
      { name: 'Simena Kalesi & Kekova', lat: 36.1906, lon: 29.8617 }
    ]
  },
  {
    id: 'kapadokya-ihlara-vadisi',
    title: 'Kapadokya Peri Bacaları & Ihlara Kanyonu',
    category: 'Jeolojik Doğa & Kanyon',
    tag: 'nature',
    description: 'Göreme Açık Hava Müzesi, Uçhisar Kalesi, Derinkuyu Yeraltı Şehri ve 14 km\'lik Ihlara Kanyonu boyunca masalsı bir Orta Anadolu sürüşü.',
    difficulty: 'Kolay / Orta',
    twistiness: 87,
    distanceKm: 115,
    durationText: '2 saat 10 dk',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    points: [
      { name: 'Göreme Açık Hava Müzesi', lat: 38.6402, lon: 34.8453 },
      { name: 'Uçhisar Kalesi Zirve', lat: 38.6300, lon: 34.8055 },
      { name: 'Derinkuyu Yeraltı Şehri', lat: 38.3736, lon: 34.7347 },
      { name: 'Ihlara Vadisi Kanyon Girişi', lat: 38.2389, lon: 34.3014 }
    ]
  },
  {
    id: 'canakkale-gelibolu-sehitlik',
    title: 'Çanakkale Boğazı & Gelibolu Tarihi Rota',
    category: 'Tarih & Rüzgarlı Sahil',
    tag: 'history',
    description: 'Kilitbahir, Alçıtepe, Şehitler Abidesi ve Anzak Koyu virajlarında Ege Denizi ve Boğaz manzarası eşliğinde duygu yüklü bir rota.',
    difficulty: 'Kolay / Rahat',
    twistiness: 76,
    distanceKm: 72,
    durationText: '1 saat 35 dk',
    badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    points: [
      { name: 'Kilitbahir Kalesi', lat: 40.1478, lon: 26.3792 },
      { name: 'Çanakkale Şehitler Abidesi', lat: 40.0500, lon: 26.2183 },
      { name: 'Alçıtepe Şehitlik Yolu', lat: 40.0954, lon: 26.2307 },
      { name: 'Kabatepe Limanı & Anzak Koyu', lat: 40.2031, lon: 26.2736 }
    ]
  },
  {
    id: 'frigya-kral-yolu',
    title: 'Frigya Vadisi & Midas Krallığı Dağ Yolu',
    category: 'Kaya Şehirleri & Dağ Yolu',
    tag: 'history',
    description: 'Eskişehir-Afyon arasında 3000 yıllık devasa Midas Yazılıkaya Anıtı, Emre Gölü ve Ayazini kaya metropolisi arasındaki gizemli rota.',
    difficulty: 'Orta',
    twistiness: 85,
    distanceKm: 135,
    durationText: '2 saat 35 dk',
    badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    points: [
      { name: 'Pessinus Antik Kenti (Sivrihisar)', lat: 39.3364, lon: 31.5858 },
      { name: 'Midas Anıtı (Yazılıkaya)', lat: 39.2003, lon: 30.7136 },
      { name: 'Emre Gölü & Frigya Balon Alanı', lat: 39.0988, lon: 30.5524 },
      { name: 'Ayazini Kaya Evleri Metropolisi', lat: 39.0142, lon: 30.6558 }
    ]
  },
  {
    id: 'kusyuvasi-gecidi-toroslar',
    title: 'Toroslar & Alanya Kuşyuvası Geçidi',
    category: 'Uçurum & Dağ Tünelleri',
    tag: 'moto',
    description: 'Toros Dağları\'nda kayalara oyulmuş 1400 metre rakımlı tüneller, baş döndürücü uçurumlar ve Akdeniz\'e inen nefes kesici virajlar.',
    difficulty: 'Uzman / İleri',
    twistiness: 97,
    distanceKm: 88,
    durationText: '2 saat 20 dk',
    badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30',
    points: [
      { name: 'Alanya Kalesi & Liman', lat: 36.5333, lon: 31.9961 },
      { name: 'Dim Çayı Vadisi', lat: 36.5411, lon: 32.0833 },
      { name: 'Kuşyuvası Geçidi Zirvesi (1400m)', lat: 36.6219, lon: 32.3275 },
      { name: 'Sarıveliler Toros Zirvesi', lat: 36.7028, lon: 32.6144 }
    ]
  },
  {
    id: 'dogu-urartu-saraylari',
    title: 'Doğu Anadolu: Urartu & İshak Paşa Sarayı',
    category: 'Yüksek Rakım & Tarih (1800m+)',
    tag: 'history',
    description: 'Kars Ani Katedrali\'nden Ağrı Dağı eteklerindeki masalsı İshak Paşa Sarayı, Muradiye Şelalesi ve Van Kalesi\'ne uzanan efsane rota.',
    difficulty: 'İleri / Macera',
    twistiness: 89,
    distanceKm: 340,
    durationText: '5 saat 15 dk',
    badgeClass: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    points: [
      { name: 'Ani Harabeleri & Katedral (Kars)', lat: 40.5075, lon: 43.5728 },
      { name: 'İshak Paşa Sarayı (Doğubayazıt)', lat: 39.5211, lon: 44.1294 },
      { name: 'Muradiye Şelalesi', lat: 39.0436, lon: 43.7533 },
      { name: 'Van Kalesi (Tuşpa)', lat: 38.5028, lon: 43.3403 }
    ]
  },
  {
    id: 'kackarlar-firtina-vadisi',
    title: 'Karadeniz Fırtına Vadisi & Ayder - Zilkale',
    category: 'Yağmur Ormanı & Yayla Virajları',
    tag: 'nature',
    description: 'Tarihi taş kemer köprüler, sarp kayalık üzerindeki Zilkale, Palovit Şelalesi ve Kaçkar Dağları sisli yayla geçitleri.',
    difficulty: 'Orta / İleri',
    twistiness: 93,
    distanceKm: 92,
    durationText: '2 saat 25 dk',
    badgeClass: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    points: [
      { name: 'Rize Ardeşen Sahili', lat: 41.1914, lon: 40.9875 },
      { name: 'Fırtına Vadisi Taş Köprüler (Çamlıhemşin)', lat: 41.0442, lon: 40.9631 },
      { name: 'Zil Kale (Sarp Kaya Zirvesi)', lat: 40.9333, lon: 40.9639 },
      { name: 'Ayder Yaylası & Kaplıcalar', lat: 40.9567, lon: 41.0967 }
    ]
  }
];

let activePresetCategory = 'all';

function openPresetsModal() {
  const modal = document.getElementById('modal-presets');
  if (!modal) return;
  modal.classList.remove('hidden');
  renderPresetsList('presets-routes-container', activePresetCategory);
  initIcons();
}

function closePresetsModal() {
  document.getElementById('modal-presets')?.classList.add('hidden');
}

function filterPresetsByCategory(tag) {
  activePresetCategory = tag;
  document.querySelectorAll('.preset-filter-btn').forEach(btn => {
    const isTarget = btn.dataset.tag === tag;
    btn.className = isTarget
      ? 'preset-filter-btn active text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-amber-600 text-white shrink-0 shadow-sm'
      : 'preset-filter-btn text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white shrink-0';
  });
  filterPresetsList();
}

function filterPresetsList() {
  const query = (document.getElementById('presets-search-input')?.value || '').toLowerCase().trim();
  renderPresetsList('presets-routes-container', activePresetCategory, query);
}

function renderPresetsList(containerId = 'presets-routes-container', categoryTag = 'all', searchQuery = '') {
  const container = document.getElementById(containerId);
  if (!container) return;

  let filtered = PRESET_ROUTES;
  if (categoryTag && categoryTag !== 'all') {
    filtered = filtered.filter(p => p.tag === categoryTag);
  }
  if (searchQuery) {
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(searchQuery) ||
      p.description.toLowerCase().includes(searchQuery) ||
      p.points.some(pt => pt.name.toLowerCase().includes(searchQuery))
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 text-slate-400 text-xs">
        <i data-lucide="search-x" class="w-8 h-8 text-slate-600 mx-auto mb-2"></i>
        <p>Aramanızla eşleşen hazır rota bulunamadı.</p>
      </div>
    `;
    initIcons();
    return;
  }

  container.innerHTML = filtered.map(preset => `
    <div class="glass-card p-4 rounded-2xl border border-slate-800 hover:border-amber-500/50 bg-slate-900/90 transition-all flex flex-col justify-between space-y-3 group">
      <div>
        <div class="flex items-start justify-between gap-2 mb-1.5">
          <div>
            <h4 class="text-sm font-bold text-white group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
              <span>${escapeHtml(preset.title)}</span>
            </h4>
            <div class="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
              <span class="text-amber-400 font-semibold">${escapeHtml(preset.category)}</span>
              <span>•</span>
              <span>${preset.distanceKm} km</span>
              <span>•</span>
              <span>${preset.durationText}</span>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${preset.badgeClass || 'bg-amber-500/20 text-amber-300 border-amber-500/30'}">
            %${preset.twistiness} Viraj
          </span>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(preset.description)}</p>
      </div>

      <!-- Duraklar Çipleri & Yükle Butonu -->
      <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div class="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-[70%]">
          ${preset.points.map((pt, i) => `
            <span class="inline-flex items-center text-[10px] bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-800 text-slate-300 shrink-0">
              <span class="w-3.5 h-3.5 rounded-full ${i === 0 ? 'bg-emerald-500' : i === preset.points.length - 1 ? 'bg-rose-500' : 'bg-brand-500'} text-white text-[8px] flex items-center justify-center font-bold mr-1 shrink-0">${i + 1}</span>
              <span class="truncate max-w-[110px]">${escapeHtml(pt.name)}</span>
            </span>
          `).join('')}
        </div>

        <button onclick="loadPresetRoute('${preset.id}')" class="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-600/20 active:scale-95 transition-all flex items-center space-x-1.5 shrink-0 ml-auto">
          <i data-lucide="map" class="w-3.5 h-3.5"></i>
          <span>Rotayı Yükle</span>
          <span>&rarr;</span>
        </button>
      </div>
    </div>
  `).join('');

  initIcons();
}

function loadPresetRoute(presetId) {
  const preset = PRESET_ROUTES.find(p => p.id === presetId);
  if (!preset) return;

  // Clear existing route and markers
  clearAllRoute();

  // Populate waypoints from preset
  state.waypoints = preset.points.map((pt, idx) => ({
    id: idx === 0 ? 'start' : idx === preset.points.length - 1 ? 'end' : 'wp-' + Date.now() + '-' + idx,
    type: idx === 0 ? 'start' : idx === preset.points.length - 1 ? 'end' : 'waypoint',
    name: pt.name,
    lat: pt.lat,
    lon: pt.lon,
    marker: null
  }));

  updateWaypointsListUI();
  updateWaypointMarkers();

  // Close modals
  closePresetsModal();
  closeSavedRoutesModal();

  // Close mobile sidebar if open
  closeMobileSidebar();

  const bottomBar = document.getElementById('mobile-bottom-bar');
  if (bottomBar) bottomBar.classList.remove('hidden');

  // Calculate route immediately
  calculateRouteMain();

  showToast(`"${preset.title}" hazır rotası haritaya yüklendi!`, 'success');
}

function switchSavedModalTab(tab) {
  const btnPresets = document.getElementById('btn-tab-preset-routes');
  const btnSaved = document.getElementById('btn-tab-my-saved');
  const contPresets = document.getElementById('saved-modal-presets-container');
  const contSaved = document.getElementById('saved-routes-list');

  if (tab === 'presets') {
    if (btnPresets) btnPresets.className = 'px-3 py-1.5 rounded-xl font-bold bg-amber-600 text-white shadow-sm transition-all flex items-center space-x-1.5';
    if (btnSaved) btnSaved.className = 'px-3 py-1.5 rounded-xl font-semibold bg-slate-800 text-slate-300 hover:text-white transition-all flex items-center space-x-1.5';
    contPresets?.classList.remove('hidden');
    contSaved?.classList.add('hidden');
    renderPresetsList('saved-modal-presets-container');
  } else {
    if (btnPresets) btnPresets.className = 'px-3 py-1.5 rounded-xl font-semibold bg-slate-800 text-slate-300 hover:text-white transition-all flex items-center space-x-1.5';
    if (btnSaved) btnSaved.className = 'px-3 py-1.5 rounded-xl font-bold bg-rose-600 text-white shadow-sm transition-all flex items-center space-x-1.5';
    contPresets?.classList.add('hidden');
    contSaved?.classList.remove('hidden');
    renderSavedRoutesList();
  }
}

function openSavedRoutesModal() {
  const modal = document.getElementById('modal-saved-routes');
  if (!modal) return;
  modal.classList.remove('hidden');

  // Default to presets so user sees curated routes right away
  switchSavedModalTab('presets');
  initIcons();
}

function renderSavedRoutesList() {
  const list = document.getElementById('saved-routes-list');
  if (!list) return;
  list.innerHTML = '';

  let savedList = [];
  try {
    const raw = localStorage.getItem('rotam_saved_routes');
    if (raw) savedList = JSON.parse(raw);
  } catch (err) {}

  if (savedList.length === 0) {
    list.innerHTML = '<p class="text-xs text-slate-400 py-8 text-center">Henüz kaydedilmiş bir özel rotanız bulunmuyor.<br><span class="text-[11px] text-slate-500">Hazır rotaları yukarıdaki "Hazır Efsane Rotalar" sekmesinden inceleyebilirsiniz.</span></p>';
    return;
  }

  savedList.forEach((r, idx) => {
    const div = document.createElement('div');
    div.className = 'glass-card p-3 rounded-2xl border border-slate-800 flex items-center justify-between text-xs space-x-3';

    div.innerHTML = `
      <div class="min-w-0 flex-1">
        <h4 class="font-bold text-white text-sm truncate">${escapeHtml(r.title)}</h4>
        <p class="text-[11px] text-slate-400 mt-0.5">${r.date} • ${r.distanceKm} km • ${r.vehicle}</p>
        ${r.notes ? `<p class="text-[10px] text-slate-400 mt-1 truncate">${escapeHtml(r.notes)}</p>` : ''}
      </div>
      <div class="flex items-center space-x-2 shrink-0">
        <button onclick="loadSavedRoute(${idx})" class="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold">
          Yükle
        </button>
        <button onclick="deleteSavedRoute(${idx})" class="p-1.5 text-slate-500 hover:text-red-400" title="Sil">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    `;

    list.appendChild(div);
  });

  initIcons();
}

function closeSavedRoutesModal() {
  document.getElementById('modal-saved-routes')?.classList.add('hidden');
}

function loadSavedRoute(index) {
  try {
    const raw = localStorage.getItem('rotam_saved_routes');
    const list = JSON.parse(raw);
    const r = list[index];
    if (!r) return;

    state.waypoints = r.waypoints.map((w, idx) => ({
      id: 'wp-' + idx,
      type: idx === 0 ? 'start' : idx === r.waypoints.length - 1 ? 'end' : 'waypoint',
      name: w.name,
      lat: w.lat,
      lon: w.lon,
      marker: null
    }));

    if (r.vehicle) selectVehicle(r.vehicle);

    updateWaypointsListUI();
    updateWaypointMarkers();
    closeSavedRoutesModal();
    calculateRouteMain();
  } catch (err) {
    console.error('Error loading route:', err);
  }
}

function deleteSavedRoute(index) {
  try {
    const raw = localStorage.getItem('rotam_saved_routes');
    const list = JSON.parse(raw);
    list.splice(index, 1);
    localStorage.setItem('rotam_saved_routes', JSON.stringify(list));
    openSavedRoutesModal();
  } catch (err) {}
}

// MODAL: YÖNETİM & VERİ YÖNETİMİ PANELİ (ADMIN & JSON BACKUP)
function switchAdminTab(tab) {
  const tabPlaces = document.getElementById('admin-tab-places');
  const tabAnalytics = document.getElementById('admin-tab-analytics');
  const tabBackup = document.getElementById('admin-tab-backup');
  const btnPlaces = document.getElementById('admin-tab-btn-places');
  const btnAnalytics = document.getElementById('admin-tab-btn-analytics');
  const btnBackup = document.getElementById('admin-tab-btn-backup');

  if (!tabPlaces || !tabAnalytics || !tabBackup) return;

  // Reset all tabs
  tabPlaces.classList.add('hidden');
  tabAnalytics.classList.add('hidden');
  tabBackup.classList.add('hidden');

  btnPlaces.className = 'px-3 py-1 rounded-lg font-semibold text-slate-400 hover:text-white';
  btnAnalytics.className = 'px-3 py-1 rounded-lg font-semibold text-slate-400 hover:text-white';
  btnBackup.className = 'px-3 py-1 rounded-lg font-semibold text-slate-400 hover:text-white';

  if (tab === 'places') {
    tabPlaces.classList.remove('hidden');
    btnPlaces.className = 'px-3 py-1 rounded-lg font-semibold bg-cyan-600 text-white shadow-sm';
  } else if (tab === 'analytics') {
    tabAnalytics.classList.remove('hidden');
    btnAnalytics.className = 'px-3 py-1 rounded-lg font-semibold bg-cyan-600 text-white shadow-sm';
  } else if (tab === 'backup') {
    tabBackup.classList.remove('hidden');
    btnBackup.className = 'px-3 py-1 rounded-lg font-semibold bg-cyan-600 text-white shadow-sm';
  }
}

// ==========================================
// ADMIN AUTHENTICATION & ACCESS CONTROL (#34)
// ==========================================
const ADMIN_CONFIG = {
  SESSION_KEY: 'rotam_admin_session',
  PASS_KEY: 'rotam_admin_pass',
  DEFAULT_PASS: 'rotam2026'
};

function isAdminAuthenticated() {
  try {
    return sessionStorage.getItem(ADMIN_CONFIG.SESSION_KEY) === 'true';
  } catch (e) {
    return false;
  }
}

function openAdminAuthModal() {
  const modal = document.getElementById('modal-admin-auth');
  const input = document.getElementById('admin-password-input');
  const err = document.getElementById('admin-auth-error');
  if (err) err.classList.add('hidden');
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 100);
  }
  if (modal) modal.classList.remove('hidden');
  initIcons();
}

function closeAdminAuthModal() {
  const modal = document.getElementById('modal-admin-auth');
  if (modal) modal.classList.add('hidden');
}

function handleAdminLogin(event) {
  if (event && event.preventDefault) event.preventDefault();
  const input = document.getElementById('admin-password-input');
  const err = document.getElementById('admin-auth-error');
  const enteredPass = (input ? input.value : '').trim();

  let currentPass = ADMIN_CONFIG.DEFAULT_PASS;
  try {
    const saved = localStorage.getItem(ADMIN_CONFIG.PASS_KEY);
    if (saved && saved.trim()) currentPass = saved.trim();
  } catch (e) {}

  if (enteredPass === currentPass) {
    try {
      sessionStorage.setItem(ADMIN_CONFIG.SESSION_KEY, 'true');
    } catch (e) {}
    closeAdminAuthModal();
    openAdminModal(true);
    showToast('Yetkili giriş başarılı!', 'success');
  } else {
    if (err) err.classList.remove('hidden');
    if (input) {
      input.classList.add('border-rose-500');
      setTimeout(() => input.classList.remove('border-rose-500'), 1500);
    }
  }
}

function logoutAdmin() {
  try {
    sessionStorage.removeItem(ADMIN_CONFIG.SESSION_KEY);
  } catch (e) {}
  closeAdminModal();
  showToast('Yönetici oturumu kapatıldı.', 'info');
}

function changeAdminPassword() {
  let currentPass = ADMIN_CONFIG.DEFAULT_PASS;
  try {
    const saved = localStorage.getItem(ADMIN_CONFIG.PASS_KEY);
    if (saved && saved.trim()) currentPass = saved.trim();
  } catch (e) {}

  const oldInput = prompt('Mevcut yönetici şifrenizi girin:');
  if (oldInput === null) return;
  if (oldInput.trim() !== currentPass) {
    showToast('Mevcut şifre hatalı!', 'error');
    return;
  }

  const newPass = prompt('Yeni yönetici şifresini girin (en az 4 karakter):');
  if (!newPass || newPass.trim().length < 4) {
    showToast('Yeni şifre en az 4 karakter olmalıdır.', 'warning');
    return;
  }

  try {
    localStorage.setItem(ADMIN_CONFIG.PASS_KEY, newPass.trim());
    showToast('Yönetici şifresi başarıyla güncellendi.', 'success');
  } catch (e) {
    showToast('Şifre kaydedilemedi.', 'error');
  }
}

function openAdminModal(bypassAuth = false) {
  if (!bypassAuth && !isAdminAuthenticated()) {
    openAdminAuthModal();
    return;
  }
  const modal = document.getElementById('modal-admin');
  if (!modal) return;
  modal.classList.remove('hidden');

  switchAdminTab('places');
  updateAdminStats();
  renderAdminPlacesList();
  initIcons();
}

function closeAdminModal() {
  document.getElementById('modal-admin')?.classList.add('hidden');
}

// ==========================================
// REAL-TIME TELEMETRY & ANALYTICS ENGINE
// ==========================================
const RotamTelemetry = {
  KEYS: {
    TOTAL_VISITS: 'rotam_telemetry_total_visits',
    TODAY_PREFIX: 'rotam_telemetry_daily_',
    ROUTES_COUNT: 'rotam_telemetry_routes_count',
    STOPS_COUNT: 'rotam_telemetry_stops_count',
    POPULAR_ROUTES: 'rotam_telemetry_popular_routes',
    DEVICE_MOBILE: 'rotam_telemetry_dev_mobile',
    DEVICE_DESKTOP: 'rotam_telemetry_dev_desktop',
    DEVICE_TABLET: 'rotam_telemetry_dev_tablet',
    SESSION_FLAG: 'rotam_session_logged'
  },

  getTodayKey() {
    const d = new Date();
    return `${this.KEYS.TODAY_PREFIX}${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  detectDevice() {
    const ua = ((typeof navigator !== 'undefined' ? navigator.userAgent : '') || (typeof window !== 'undefined' && window.navigator ? window.navigator.userAgent : '') || '').toLowerCase();
    const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk)/i.test(ua);
    if (isTablet) return 'tablet';
    const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const isMobile = /mobile|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile|wpdesktop/i.test(ua) || width <= 768;
    if (isMobile) return 'mobile';
    return 'desktop';
  },

  init() {
    try {
      const alreadyLogged = sessionStorage.getItem(this.KEYS.SESSION_FLAG);
      if (!alreadyLogged) {
        sessionStorage.setItem(this.KEYS.SESSION_FLAG, 'true');

        // Total visits
        const total = parseInt(localStorage.getItem(this.KEYS.TOTAL_VISITS) || '0', 10) + 1;
        localStorage.setItem(this.KEYS.TOTAL_VISITS, String(total));

        // Today visits
        const todayKey = this.getTodayKey();
        const today = parseInt(localStorage.getItem(todayKey) || '0', 10) + 1;
        localStorage.setItem(todayKey, String(today));

        // Device breakdown
        const dev = this.detectDevice();
        if (dev === 'mobile') {
          const m = parseInt(localStorage.getItem(this.KEYS.DEVICE_MOBILE) || '0', 10) + 1;
          localStorage.setItem(this.KEYS.DEVICE_MOBILE, String(m));
        } else if (dev === 'tablet') {
          const tab = parseInt(localStorage.getItem(this.KEYS.DEVICE_TABLET) || '0', 10) + 1;
          localStorage.setItem(this.KEYS.DEVICE_TABLET, String(tab));
        } else {
          const dsk = parseInt(localStorage.getItem(this.KEYS.DEVICE_DESKTOP) || '0', 10) + 1;
          localStorage.setItem(this.KEYS.DEVICE_DESKTOP, String(dsk));
        }
      }
    } catch (e) {
      console.warn('Telemetry init failed:', e);
    }
  },

  recordRoute(validPoints) {
    try {
      const current = parseInt(localStorage.getItem(this.KEYS.ROUTES_COUNT) || '0', 10) + 1;
      localStorage.setItem(this.KEYS.ROUTES_COUNT, String(current));

      if (validPoints && validPoints.length >= 2) {
        const start = (validPoints[0].name || 'Başlangıç').trim();
        const end = (validPoints[validPoints.length - 1].name || 'Varış').trim();
        const routeName = `${start} → ${end}`;

        let routesMap = {};
        try {
          const raw = localStorage.getItem(this.KEYS.POPULAR_ROUTES);
          if (raw) routesMap = JSON.parse(raw);
        } catch (e) {}

        routesMap[routeName] = (routesMap[routeName] || 0) + 1;
        localStorage.setItem(this.KEYS.POPULAR_ROUTES, JSON.stringify(routesMap));
      }
    } catch (e) {
      console.warn('Record route failed:', e);
    }
  },

  recordStopAdded() {
    try {
      const current = parseInt(localStorage.getItem(this.KEYS.STOPS_COUNT) || '0', 10) + 1;
      localStorage.setItem(this.KEYS.STOPS_COUNT, String(current));
    } catch (e) {
      console.warn('Record stop failed:', e);
    }
  },

  getStats() {
    let totalVisits = 0;
    let todayVisits = 0;
    let routesCount = 0;
    let stopsCount = 0;
    let popularRoutes = [];
    let devices = { mobile: 0, desktop: 0, tablet: 0 };

    try {
      totalVisits = parseInt(localStorage.getItem(this.KEYS.TOTAL_VISITS) || '0', 10);
      todayVisits = parseInt(localStorage.getItem(this.getTodayKey()) || '0', 10);
      routesCount = parseInt(localStorage.getItem(this.KEYS.ROUTES_COUNT) || '0', 10);
      stopsCount = parseInt(localStorage.getItem(this.KEYS.STOPS_COUNT) || '0', 10);

      const m = parseInt(localStorage.getItem(this.KEYS.DEVICE_MOBILE) || '0', 10);
      const d = parseInt(localStorage.getItem(this.KEYS.DEVICE_DESKTOP) || '0', 10);
      const tab = parseInt(localStorage.getItem(this.KEYS.DEVICE_TABLET) || '0', 10);
      devices = { mobile: m, desktop: d, tablet: tab };

      const rawRoutes = localStorage.getItem(this.KEYS.POPULAR_ROUTES);
      if (rawRoutes) {
        const map = JSON.parse(rawRoutes);
        popularRoutes = Object.entries(map)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
      }
    } catch (e) {}

    const totalDev = devices.mobile + devices.desktop + devices.tablet;
    const mobilePct = totalDev > 0 ? Math.round((devices.mobile / totalDev) * 100) : 0;
    const desktopPct = totalDev > 0 ? Math.round((devices.desktop / totalDev) * 100) : 0;
    const tabletPct = totalDev > 0 ? Math.max(0, 100 - mobilePct - desktopPct) : 0;

    return {
      totalVisits,
      todayVisits,
      routesCount,
      stopsCount,
      popularRoutes,
      devices: {
        mobile: devices.mobile,
        desktop: devices.desktop,
        tablet: devices.tablet,
        mobilePct,
        desktopPct,
        tabletPct
      }
    };
  },

  renderAdminUI() {
    const stats = this.getStats();

    const totalEl = document.getElementById('analytics-total-visits');
    if (totalEl) totalEl.textContent = stats.totalVisits.toLocaleString('tr-TR');

    const todayEl = document.getElementById('analytics-today-visits');
    if (todayEl) todayEl.textContent = stats.todayVisits.toLocaleString('tr-TR');

    const routesEl = document.getElementById('analytics-routes-created');
    if (routesEl) routesEl.textContent = stats.routesCount.toLocaleString('tr-TR');

    const stopsEl = document.getElementById('analytics-stops-added');
    if (stopsEl) stopsEl.textContent = stats.stopsCount.toLocaleString('tr-TR');

    // Popular routes list
    const routesListEl = document.getElementById('analytics-popular-routes-list');
    if (routesListEl) {
      if (stats.popularRoutes.length === 0) {
        routesListEl.innerHTML = `
          <div class="text-center py-4 text-slate-500 text-xs italic">
            ${(typeof t === 'function' ? t('admin_analytics_no_routes') : null) || 'Henüz hesaplanan rota bulunmuyor.'}
          </div>
        `;
      } else {
        routesListEl.innerHTML = stats.popularRoutes.map(r => `
          <div class="flex items-center justify-between p-2 bg-slate-950/70 border border-slate-800/80 rounded-xl">
            <span class="text-white font-medium truncate max-w-[200px]" title="${escapeHtml(r.name)}">${escapeHtml(r.name)}</span>
            <span class="text-amber-400 font-bold shrink-0 ml-2 text-xs bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">${r.count} arama</span>
          </div>
        `).join('');
      }
    }

    // Devices
    const dev = stats.devices;
    const mobPctEl = document.getElementById('analytics-mobile-pct');
    const mobBarEl = document.getElementById('analytics-mobile-bar');
    if (mobPctEl) mobPctEl.textContent = `${dev.mobilePct}% (${dev.mobile})`;
    if (mobBarEl) mobBarEl.style.width = `${dev.mobilePct}%`;

    const dskPctEl = document.getElementById('analytics-desktop-pct');
    const dskBarEl = document.getElementById('analytics-desktop-bar');
    if (dskPctEl) dskPctEl.textContent = `${dev.desktopPct}% (${dev.desktop})`;
    if (dskBarEl) dskBarEl.style.width = `${dev.desktopPct}%`;

    const tabPctEl = document.getElementById('analytics-tablet-pct');
    const tabBarEl = document.getElementById('analytics-tablet-bar');
    if (tabPctEl) tabPctEl.textContent = `${dev.tabletPct}% (${dev.tablet})`;
    if (tabBarEl) tabBarEl.style.width = `${dev.tabletPct}%`;

    initIcons();
  },

  resetConfirm() {
    if (confirm('Tüm analitik ve telemetri sayaçlarını sıfırlamak istediğinize emin misiniz?')) {
      try {
        localStorage.removeItem(this.KEYS.TOTAL_VISITS);
        localStorage.removeItem(this.KEYS.ROUTES_COUNT);
        localStorage.removeItem(this.KEYS.STOPS_COUNT);
        localStorage.removeItem(this.KEYS.POPULAR_ROUTES);
        localStorage.removeItem(this.KEYS.DEVICE_MOBILE);
        localStorage.removeItem(this.KEYS.DEVICE_DESKTOP);
        localStorage.removeItem(this.KEYS.DEVICE_TABLET);
        localStorage.removeItem(this.getTodayKey());
        this.renderAdminUI();
        showToast('Telemetri sayaçları sıfırlandı.', 'info');
      } catch (e) {
        showToast('Sıfırlama başarısız.', 'error');
      }
    }
  },

  exportJson() {
    const stats = this.getStats();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stats, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `rotam_telemetry_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    showToast('Analitik verileri JSON olarak indirildi.', 'success');
  }
};

function updateAdminStats() {
  const total = state.allPlaces.length;
  const historic = state.allPlaces.filter(p => p.category === 'historic').length;
  const nature = state.allPlaces.filter(p => p.category === 'nature').length;
  const gastro = state.allPlaces.filter(p => p.category === 'gastronomy' || p.category === 'cafe').length;

  const totalEl = document.getElementById('admin-stat-total');
  if (totalEl) totalEl.textContent = total;
  const histEl = document.getElementById('admin-stat-historic');
  if (histEl) histEl.textContent = historic;
  const natEl = document.getElementById('admin-stat-nature');
  if (natEl) natEl.textContent = nature;
  const gastEl = document.getElementById('admin-stat-gastro');
  if (gastEl) gastEl.textContent = gastro;

  // Render Real Telemetry Metrics
  RotamTelemetry.renderAdminUI();
}

function toggleAdminAddForm() {
  document.getElementById('admin-add-form')?.classList.toggle('hidden');
}

function submitAdminNewPlace() {
  const name = document.getElementById('admin-place-name')?.value.trim();
  const cat = document.getElementById('admin-place-cat')?.value;
  const lat = parseFloat(document.getElementById('admin-place-lat')?.value);
  const lon = parseFloat(document.getElementById('admin-place-lon')?.value);
  const city = document.getElementById('admin-place-city')?.value.trim();
  const desc = document.getElementById('admin-place-desc')?.value.trim();

  if (!name || isNaN(lat) || isNaN(lon)) {
    showToast('Lütfen mekan adı, enlem ve boylam değerlerini eksiksiz girin.', 'warning');
    return;
  }

  const newPlace = {
    id: Date.now(),
    name,
    category: cat,
    lat,
    lon,
    city,
    description: desc,
    rating: 4.8,
    recommended_duration: '1 saat'
  };

  state.allPlaces.push(newPlace);

  // Persist to custom local storage
  let custom = [];
  try {
    const raw = localStorage.getItem('rotam_custom_places');
    if (raw) custom = JSON.parse(raw);
  } catch (e) {}
  custom.push(newPlace);
  localStorage.setItem('rotam_custom_places', JSON.stringify(custom));

  updateAdminStats();
  renderAdminPlacesList();
  toggleAdminAddForm();
  showToast('Yeni mekan başarıyla eklendi!', 'success');
}

function renderAdminPlacesList() {
  const container = document.getElementById('admin-places-list');
  const search = document.getElementById('admin-search-input')?.value.toLowerCase().trim() || '';
  if (!container) return;

  container.innerHTML = '';
  const filtered = state.allPlaces.filter(p => {
    if (!search) return true;
    return (p.name || '').toLowerCase().includes(search) || (p.city || '').toLowerCase().includes(search);
  });

  filtered.slice(0, 50).forEach((p, idx) => {
    const cfg = CATEGORY_CONFIG[p.category] || CATEGORY_CONFIG.historic;
    const div = document.createElement('div');
    div.className = 'glass-card p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs space-x-2';

    div.innerHTML = `
      <div class="min-w-0 flex-1">
        <div class="flex items-center space-x-1">
          <span>${cfg.emoji}</span>
          <span class="font-bold text-white truncate">${escapeHtml(p.name)}</span>
          <span class="text-[10px] text-slate-500">(${p.city || '-'})</span>
        </div>
        <p class="text-[10px] text-slate-400 truncate mt-0.5">${escapeHtml(p.description || '')}</p>
      </div>
      <button onclick="deleteAdminPlace(${p.id})" class="text-slate-500 hover:text-red-400 p-1" title="Sil">
        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
      </button>
    `;

    container.appendChild(div);
  });

  initIcons();
}

function filterAdminPlaces() {
  renderAdminPlacesList();
}

function deleteAdminPlace(id) {
  if (!confirm('Bu mekanı silmek istediğinize emin misiniz?')) return;
  state.allPlaces = state.allPlaces.filter(p => p.id !== id);

  // Sync custom storage
  try {
    const raw = localStorage.getItem('rotam_custom_places');
    if (raw) {
      let custom = JSON.parse(raw);
      custom = custom.filter(p => p.id !== id);
      localStorage.setItem('rotam_custom_places', JSON.stringify(custom));
    }
  } catch (e) {}

  updateAdminStats();
  renderAdminPlacesList();
}

// JSON Backup & Restore
function exportPlacesJsonBackup() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state.allPlaces, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute('href', dataStr);
  dlAnchor.setAttribute('download', `rotam_places_backup_${Date.now()}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
}

function importPlacesJsonBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!Array.isArray(parsed)) {
        showToast('Hata: Yüklenen JSON dosyası geçerli bir mekan listesi içermiyor.', 'error');
        return;
      }
      state.allPlaces = parsed;
      localStorage.setItem('rotam_custom_places', JSON.stringify(parsed));
      updateAdminStats();
      renderAdminPlacesList();
      showToast(`Başarılı! ${parsed.length} mekan başarıyla geri yüklendi.`, 'success');
    } catch (err) {
      showToast('Dosya okuma hatası: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

// REAL PHOTO ENGINE: WIKIMEDIA COMMONS & OPEN ARCHIVES
const placePhotoCache = new Map();

async function fetchPlacePhoto(place) {
  if (!place || !place.name) return null;
  const cacheKey = place.id ? String(place.id) : place.name.trim();
  if (placePhotoCache.has(cacheKey)) {
    return placePhotoCache.get(cacheKey);
  }

  // Pre-configured custom image URL support
  if (place.image_url) {
    const res = { url: place.image_url, source: 'Özel Arşiv' };
    placePhotoCache.set(cacheKey, res);
    return res;
  }

  // 1. Search Turkish Wikipedia with Generator Search (CORS origin=*)
  try {
    const searchUrl = `https://tr.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(place.name)}&gsrlimit=1&prop=pageimages|pageterms&piprop=thumbnail&pithumbsize=800&format=json&origin=*`;
    const response = await fetch(searchUrl);
    if (response.ok) {
      const data = await response.json();
      const pages = data?.query?.pages;
      if (pages) {
        for (const pid in pages) {
          const p = pages[pid];
          if (p.thumbnail && p.thumbnail.source) {
            const photoInfo = {
              url: p.thumbnail.source,
              source: 'Wikimedia Commons',
              title: p.title || place.name
            };
            placePhotoCache.set(cacheKey, photoInfo);
            return photoInfo;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Wikipedia fotoğraf getirme hatası:', err);
  }

  // 2. Shortened query fallback if name has more than 2 words (e.g. "Sagalassos Antik Kenti" -> "Sagalassos")
  const words = place.name.trim().split(/\s+/);
  if (words.length > 2) {
    try {
      const shortened = words.slice(0, 2).join(' ');
      const searchUrl2 = `https://tr.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(shortened)}&gsrlimit=1&prop=pageimages|pageterms&piprop=thumbnail&pithumbsize=800&format=json&origin=*`;
      const response2 = await fetch(searchUrl2);
      if (response2.ok) {
        const data2 = await response2.json();
        const pages2 = data2?.query?.pages;
        if (pages2) {
          for (const pid in pages2) {
            const p2 = pages2[pid];
            if (p2.thumbnail && p2.thumbnail.source) {
              const photoInfo = {
                url: p2.thumbnail.source,
                source: 'Wikimedia Commons',
                title: p2.title || place.name
              };
              placePhotoCache.set(cacheKey, photoInfo);
              return photoInfo;
            }
          }
        }
      }
    } catch (e) {}
  }

  placePhotoCache.set(cacheKey, null);
  return null;
}

// MODAL: MEKAN DETAY PENCERESİ (GERÇEK FOTOĞRAF & GOOGLE MAPS)
async function openPlaceDetailById(id) {
  const place = state.allPlaces.find(p => p.id === id);
  if (!place) return;

  const modal = document.getElementById('modal-place-detail');
  const cfg = CATEGORY_CONFIG[place.category] || CATEGORY_CONFIG.historic;

  const isEn = window.state && window.state.lang === 'en';

  // Bilgi Alanları
  const nameEl = document.getElementById('place-detail-name');
  if (nameEl) nameEl.textContent = place.name;

  const catBadge = document.getElementById('place-detail-cat-badge');
  if (catBadge) {
    catBadge.textContent = `${cfg.emoji} ${getCategoryTitle(place.category)}`;
    catBadge.style.borderColor = `${cfg.color}60`;
    catBadge.style.color = cfg.color;
  }

  const cityEl = document.getElementById('place-detail-city');
  if (cityEl) cityEl.textContent = place.city || place.region || (isEn ? 'Turkey' : 'Türkiye');

  const descEl = document.getElementById('place-detail-desc');
  if (descEl) descEl.textContent = place.description || (isEn ? 'No detailed description available yet for this place.' : 'Bu mekan hakkında henüz detaylı açıklama girilmemiş.');

  const timeEl = document.getElementById('place-detail-time');
  if (timeEl) timeEl.textContent = place.best_time || (isEn ? 'All Year Round' : 'Tüm Yıl Boyunca');

  const durEl = document.getElementById('place-detail-duration');
  if (durEl) durEl.textContent = place.recommended_duration || (isEn ? '1-2 hours' : '1-2 saat');

  // Google Maps Canlı Fotoğraf ve 360° Linki
  const gmapsBtn = document.getElementById('btn-place-gmaps-photos');
  if (gmapsBtn) {
    const q = encodeURIComponent(`${place.name} ${place.city || ''}`);
    gmapsBtn.href = `https://www.google.com/maps/search/?api=1&query=${q}`;
  }

  // Etiketler
  const tagsCont = document.getElementById('place-detail-tags-container');
  if (tagsCont) {
    tagsCont.innerHTML = '';
    if (place.tags && Array.isArray(place.tags)) {
      place.tags.forEach(t => {
        const span = document.createElement('span');
        span.className = 'text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full';
        span.textContent = `#${t}`;
        tagsCont.appendChild(span);
      });
    }
  }

  // Buton Eylemleri
  const safeName = escapeHtml(place.name).replace(/'/g, "\\'");
  const btnAdd = document.getElementById('btn-place-add-to-route');
  if (btnAdd) {
    btnAdd.onclick = () => {
      addPoiToRoute(place.lat, place.lon, safeName);
      closePlaceDetailModal();
    };
  }

  const btnDest = document.getElementById('btn-place-set-destination');
  if (btnDest) {
    btnDest.onclick = () => {
      setAsDestination(place.lat, place.lon, safeName);
      closePlaceDetailModal();
    };
  }

  // Modal'ı hemen aç (kullanıcı beklemesin)
  modal.classList.remove('hidden');
  initIcons();

  // Gerçek Fotoğrafı Asenkron Olarak Yükle
  const imgEl = document.getElementById('place-detail-img');
  const skeletonEl = document.getElementById('place-detail-img-skeleton');
  const sourceBadge = document.getElementById('place-detail-img-source');
  const fallbackEmoji = document.getElementById('place-detail-fallback-emoji');

  if (imgEl && skeletonEl) {
    imgEl.classList.add('opacity-0');
    skeletonEl.classList.remove('hidden');
    if (fallbackEmoji) fallbackEmoji.classList.add('hidden');
    if (sourceBadge) sourceBadge.classList.add('hidden');

    const photoInfo = await fetchPlacePhoto(place);

    // Kullanıcı bu sırada başka mekana geçmişse çakışmayı önle
    if (document.getElementById('place-detail-name')?.textContent !== place.name) return;

    skeletonEl.classList.add('hidden');

    if (photoInfo && photoInfo.url) {
      imgEl.src = photoInfo.url;
      imgEl.alt = place.name;
      imgEl.onload = () => {
        imgEl.classList.remove('opacity-0');
      };
      if (sourceBadge) {
        sourceBadge.textContent = `📸 ${photoInfo.source}`;
        sourceBadge.classList.remove('hidden');
      }
    } else {
      imgEl.src = '';
      if (fallbackEmoji) {
        fallbackEmoji.textContent = cfg.emoji;
        fallbackEmoji.classList.remove('hidden');
      }
    }
  }
}

function closePlaceDetailModal() {
  document.getElementById('modal-place-detail')?.classList.add('hidden');
}

// GPX IMPORT MODAL & DRAG/DROP
function openGpxImportModal() {
  document.getElementById('modal-gpx-import')?.classList.remove('hidden');
}

function closeGpxImportModal() {
  document.getElementById('modal-gpx-import')?.classList.add('hidden');
}

function handleGpxDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.add('border-emerald-500');
}

function handleGpxDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('border-emerald-500');
}

function handleGpxDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('border-emerald-500');
  const dt = e.dataTransfer;
  if (dt.files && dt.files.length) {
    parseGpxFile(dt.files[0]);
  }
}

function handleGpxFileSelect(e) {
  if (e.target.files && e.target.files.length) {
    parseGpxFile(e.target.files[0]);
  }
}

function parseGpxFile(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const text = e.target.result;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      const trkpts = xmlDoc.getElementsByTagName('trkpt');

      if (!trkpts || trkpts.length === 0) {
        showToast('GPX dosyasında iz noktası (trkpt) bulunamadı.', 'warning');
        return;
      }

      const coords = [];
      for (let i = 0; i < trkpts.length; i++) {
        const lat = parseFloat(trkpts[i].getAttribute('lat'));
        const lon = parseFloat(trkpts[i].getAttribute('lon'));
        coords.push([lon, lat]);
      }

      // Create Route Object from GPX
      const startCoord = coords[0];
      const endCoord = coords[coords.length - 1];

      state.waypoints[0].lat = startCoord[1];
      state.waypoints[0].lon = startCoord[0];
      state.waypoints[0].name = file.name.replace('.gpx', '') + ' (Başlangıç)';

      state.waypoints[state.waypoints.length - 1].lat = endCoord[1];
      state.waypoints[state.waypoints.length - 1].lon = endCoord[0];
      state.waypoints[state.waypoints.length - 1].name = file.name.replace('.gpx', '') + ' (Varış)';

      let totalDist = 0;
      for (let i = 1; i < coords.length; i++) {
        totalDist += haversineMeters(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]);
      }

      const gpxRoute = {
        distance: totalDist,
        duration: (totalDist / 1000 / 60) * 3600,
        geometry: { type: 'LineString', coordinates: coords }
      };

      state.routeData = gpxRoute;
      state.routeAlternatives = [gpxRoute];
      drawRoutesOnMap([gpxRoute], 0);
      displayRouteStats(gpxRoute);
      analyzeRouteCorridor(gpxRoute, 50000);
      fetchAndDisplayElevation(coords);

      closeGpxImportModal();
      updateWaypointsListUI();
      updateWaypointMarkers();

      showToast(`GPX rotası yüklendi: ${(totalDist / 1000).toFixed(1)} km`, 'success');
    } catch (err) {
      showToast('GPX işleme hatası: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

// GPX EXPORT (RFC-Compliant XML)
function exportGPX() {
  if (!state.routeData) return;
  const coords = state.routeData.geometry.coordinates;
  const validPoints = state.waypoints.filter(w => w.lat !== null && w.lon !== null);

  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Rotam V2 Platform" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Rotam Gezi Rotası</name>
    <time>${new Date().toISOString()}</time>
  </metadata>\n`;

  validPoints.forEach((wp, idx) => {
    gpx += `  <wpt lat="${wp.lat}" lon="${wp.lon}">
    <name>${escapeHtml(wp.name || 'Durak ' + idx)}</name>
  </wpt>\n`;
  });

  gpx += `  <trk>
    <name>Rotam Sürüş Rotası</name>
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
  a.download = `rotam_${Date.now()}.gpx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// OPEN IN GOOGLE MAPS
function openInGoogleMaps() {
  const valid = state.waypoints.filter(w => w.lat !== null && w.lon !== null);
  if (valid.length < 2) {
    showToast('Google Maps navigasyonunu başlatmak için önce başlangıç ve varış noktalarınızı belirleyip rota oluşturun.', 'info');
    if (window.innerWidth < 768) {
      openMobileSidebar();
    }
    return;
  }

  const origin = `${valid[0].lat},${valid[0].lon}`;
  const dest = `${valid[valid.length - 1].lat},${valid[valid.length - 1].lon}`;

  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`;

  if (valid.length > 2) {
    const intermediates = valid.slice(1, -1).map(w => `${w.lat},${w.lon}`).join('|');
    url += `&waypoints=${encodeURIComponent(intermediates)}`;
  }

  const travelModes = {
    car: 'driving',
    motorcycle: 'driving',
    camper: 'driving',
    bicycle: 'bicycling',
    walk: 'walking'
  };
  url += `&travelmode=${travelModes[state.currentVehicle] || 'driving'}`;

  showToast('Google Maps navigasyonu açılıyor...', 'info');
  const win = window.open(url, '_blank');
  if (!win || win.closed || typeof win.closed === 'undefined') {
    window.location.href = url;
  }
}

// HTML Escape Helper
function escapeHtml(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Lucide Icon Initializer
function initIcons() {
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }
}

// DOM CONTENT LOADED EVENT
document.addEventListener('DOMContentLoaded', () => {
  checkStandalonePWA();
  syncViewportHeight();
  if (typeof applyTranslations === 'function') applyTranslations();
  initPlacesDatabase();
  populateCityDatalist();
  initMap();
  updateWaypointsListUI();
  renderCorridorPoiList();
  renderJourneyTimeline();
  initIcons();

  // Initialize real-time telemetry (#34)
  if (typeof RotamTelemetry !== 'undefined') {
    RotamTelemetry.init();
  }

  // Restore personalized preferences (#27)
  try {
    const savedVehicle = localStorage.getItem('rotam_user_vehicle');
    if (savedVehicle) selectVehicle(savedVehicle);

    const savedPrefsRaw = localStorage.getItem('rotam_user_prefs');
    if (savedPrefsRaw) {
      const savedPrefs = JSON.parse(savedPrefsRaw);
      if (Array.isArray(savedPrefs) && savedPrefs.length > 0) {
        state.selectedPreferences = new Set(savedPrefs);
        document.querySelectorAll('.pref-chip').forEach(chip => {
          chip.classList.toggle('active', state.selectedPreferences.has(chip.dataset.pref));
        });
      }
    }
  } catch (e) {}

  // Progress animation on splash screen
  const pBar = document.getElementById('splash-progress-bar');
  const pTxt = document.getElementById('splash-status-text');

  setTimeout(() => {
    if (pBar) pBar.style.width = '70%';
    if (pTxt) pTxt.textContent = 'Mekan veritabanı hazırlandı...';
  }, 400);

  setTimeout(() => {
    if (pBar) pBar.style.width = '100%';
    if (pTxt) pTxt.textContent = 'Harita ve seyahat motoru hazır!';
  }, 850);

  setTimeout(() => {
    dismissSplashScreen();
  }, 1400);
});

// Standalone PWA & Dynamic Viewport Synchronizer (iOS 'Ana Ekrana Ekle' & Android PWA)
function syncViewportHeight() {
  const isInputFocused = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
  const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  // If user is actively typing, do not aggressively crush container height or invalidate map
  if (!isInputFocused) {
    document.documentElement.style.setProperty('--app-height', `${vh}px`);
  }
  if (map && !isInputFocused) {
    map.invalidateSize();
  }
}

function checkStandalonePWA() {
  const isIosStandalone = ('standalone' in window.navigator) && window.navigator.standalone;
  const isMatchStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  if (isIosStandalone || isMatchStandalone) {
    document.documentElement.classList.add('is-pwa-standalone');
    document.body.classList.add('is-pwa-standalone');
  }
}

// Window-level size invalidation listeners for flawless responsive rendering
window.addEventListener('resize', () => {
  syncViewportHeight();
});

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', syncViewportHeight);
}

window.addEventListener('orientationchange', () => {
  setTimeout(syncViewportHeight, 150);
  setTimeout(syncViewportHeight, 400);
});

window.addEventListener('load', () => {
  checkStandalonePWA();
  syncViewportHeight();
  if (map) {
    map.invalidateSize();
    setTimeout(() => map.invalidateSize(), 300);
  }
});

// Run immediate viewport sync
checkStandalonePWA();
syncViewportHeight();

/* ==========================================================================
   LIVE NAVIGATION & GPS RIDE TRACKING CONTROLLER (#40)
   ========================================================================== */
function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

const LiveNavigation = {
  isActive: false,
  isSimulation: false,
  voiceEnabled: true,
  wakeLock: null,
  watchId: null,
  marker: null,
  simIndex: 0,
  simInterval: null,
  lastCoord: null,
  lastHeading: 0,
  speedKmH: 0,
  notifiedPois: new Set(),
  autoCenter: true,
  bannerTimer: null,

  start(forceSimulation = false) {
    const valid = (state.waypoints || []).filter(w => w.lat !== null && w.lon !== null);
    if (valid.length < 2) {
      const msg = (typeof t === 'function')
        ? t('mobile_enter_dest_first', 'Lütfen önce gitmek istediğiniz varış noktasını seçin.')
        : 'Lütfen önce gitmek istediğiniz varış noktasını seçin.';
      showToast(msg, 'info');
      if (window.innerWidth < 768) {
        openMobileSidebar('end');
      }
      return;
    }

    if (!state.routeData) {
      const isEn = (window.state && window.state.lang === 'en');
      showToast(isEn ? 'Preparing route, starting ride...' : 'Rota hazırlanıyor, sürüş başlatılıyor...', 'info');
      calculateRouteMain().then(() => {
        if (state.routeData) {
          LiveNavigation.start(forceSimulation);
        }
      }).catch(err => {
        console.error('Route calculation failed before live ride:', err);
        showToast(isEn ? 'Route calculation failed.' : 'Rota hesaplanamadı.', 'error');
      });
      return;
    }

    this.isActive = true;
    this.notifiedPois.clear();
    this.autoCenter = true;

    // Show Live HUD overlay
    const overlay = document.getElementById('live-nav-overlay');
    if (overlay) overlay.classList.remove('hidden');

    // Clean UI for distraction-free riding cockpit
    if (typeof closeMobileSidebar === 'function') closeMobileSidebar();
    if (typeof closeRightPanel === 'function') closeRightPanel();
    if (typeof dismissHomepagePlanner === 'function') dismissHomepagePlanner();

    // Hide all colliding floating controls and cards during Live HUD
    const bottomBar = document.getElementById('mobile-bottom-bar');
    if (bottomBar) bottomBar.classList.add('hidden');

    document.getElementById('floating-map-controls')?.classList.add('hidden');
    document.getElementById('btn-toggle-right-panel')?.classList.add('hidden');
    document.getElementById('map-hint')?.classList.add('hidden');
    document.getElementById('elevation-panel')?.classList.add('hidden');

    // On desktop, collapse sidebar for full-screen immersive map navigation
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.add('live-nav-hidden');
    if (map) {
      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 300);
    }

    // Request screen wake lock
    this.requestWakeLock();

    // Map drag listener to pause auto-center
    if (map) {
      map.on('dragstart', () => {
        if (this.isActive) this.autoCenter = false;
      });
    }

    // Coordinates of current route
    const coords = state.routeData.geometry.coordinates;
    const startPt = coords[0];
    this.lastCoord = [startPt[1], startPt[0]];

    // Create Rider Marker and set view
    this.createRiderMarker(this.lastCoord);
    if (map) {
      map.setView(this.lastCoord, 16, { animate: true });
    }

    // Voice announcement
    if (this.voiceEnabled) {
      const isEn = (window.state && window.state.lang === 'en');
      this.speak(isEn ? 'Live ride tracking started. Have a safe journey!' : 'Canlı sürüş takibi başladı. İyi yolculuklar!');
    }

    const startTitle = (typeof t === 'function') ? t('live_nav_title', 'Canlı Sürüş Modu') : 'Canlı Sürüş Modu';
    showToast(`${startTitle} aktif!`, 'success');

    if (forceSimulation) {
      this.startSimulation();
    } else {
      this.startGPS();
    }

    this.updateControlsUI();
    if (typeof initIcons === 'function') initIcons();
  },

  stop() {
    this.isActive = false;
    this.stopGPS();
    this.stopSimulation();
    this.releaseWakeLock();

    // Remove rider marker
    if (this.marker && map) {
      map.removeLayer(this.marker);
      this.marker = null;
    }

    // Hide HUD overlay
    const overlay = document.getElementById('live-nav-overlay');
    if (overlay) overlay.classList.add('hidden');

    // Restore floating controls and cards
    const bottomBar = document.getElementById('mobile-bottom-bar');
    if (bottomBar) bottomBar.classList.remove('hidden');

    document.getElementById('floating-map-controls')?.classList.remove('hidden');
    document.getElementById('btn-toggle-right-panel')?.classList.remove('hidden');

    // Restore desktop sidebar
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('live-nav-hidden');
    if (map) {
      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 300);
    }

    // Hide alert banner
    this.dismissAlertBanner();

    // Reset map view to full route bounds
    if (map && state.routeLayer) {
      try {
        map.fitBounds(state.routeLayer.getBounds(), { padding: [40, 40] });
      } catch (e) {
        // ignore
      }
    }

    const isEn = (window.state && window.state.lang === 'en');
    showToast(isEn ? 'Ride completed.' : 'Sürüş sonlandırıldı.', 'info');
  },

  startGPS() {
    if (!navigator.geolocation) {
      this.switchToSimulationWithMessage();
      return;
    }

    this.isSimulation = false;
    this.updateModeBadge();

    const options = {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000
    };

    let gpsReceived = false;

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        gpsReceived = true;
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const speed = (pos.coords.speed !== null && !isNaN(pos.coords.speed))
          ? Math.max(0, Math.round(pos.coords.speed * 3.6))
          : 0;

        let heading = pos.coords.heading;
        if (heading === null || isNaN(heading)) {
          if (this.lastCoord) {
            heading = calculateBearing(this.lastCoord[0], this.lastCoord[1], lat, lon);
          } else {
            heading = this.lastHeading || 0;
          }
        }
        this.onLocationUpdate(lat, lon, speed, heading);
      },
      (err) => {
        console.warn('Geolocation in LiveNavigation:', err);
        if (!gpsReceived && this.isActive && !this.isSimulation) {
          this.switchToSimulationWithMessage();
        }
      },
      options
    );

    // Fallback if no GPS fix after 4 seconds (desktop / indoor test)
    setTimeout(() => {
      if (this.isActive && !this.isSimulation && !gpsReceived) {
        this.switchToSimulationWithMessage();
      }
    }, 4000);
  },

  stopGPS() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  },

  switchToSimulationWithMessage() {
    if (!this.isActive) return;
    const msg = (typeof t === 'function')
      ? t('live_nav_gps_error', 'GPS sinyali alınamadı. Demo simülasyon moduna geçiliyor.')
      : 'GPS sinyali alınamadı. Demo simülasyon moduna geçiliyor.';
    showToast(msg, 'info');
    this.startSimulation();
  },

  startSimulation() {
    this.stopGPS();
    this.isSimulation = true;
    this.updateModeBadge();

    const coords = state.routeData?.geometry?.coordinates;
    if (!coords || coords.length === 0) return;

    this.simIndex = 0;
    if (this.simInterval) clearInterval(this.simInterval);

    this.simInterval = setInterval(() => {
      if (!this.isActive || !this.isSimulation) {
        clearInterval(this.simInterval);
        return;
      }

      if (this.simIndex >= coords.length - 1) {
        const last = coords[coords.length - 1];
        this.onLocationUpdate(last[1], last[0], 0, this.lastHeading);
        this.onDestinationReached();
        clearInterval(this.simInterval);
        return;
      }

      const current = coords[this.simIndex];
      const next = coords[Math.min(this.simIndex + 1, coords.length - 1)];

      const heading = calculateBearing(current[1], current[0], next[1], next[0]);
      // Touring speed ~ 70-85 km/h
      const speed = Math.floor(70 + Math.random() * 15);

      this.onLocationUpdate(current[1], current[0], speed, heading);
      this.simIndex += 1;
    }, 650);
  },

  stopSimulation() {
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
    this.isSimulation = false;
  },

  toggleSimulation() {
    if (this.isSimulation) {
      const msg = (typeof t === 'function') ? t('live_nav_gps', 'Gerçek GPS moduna geçiliyor...') : 'Gerçek GPS moduna geçiliyor...';
      showToast(msg, 'info');
      this.stopSimulation();
      this.startGPS();
    } else {
      const msg = (typeof t === 'function') ? t('live_nav_demo', 'Demo simülasyonu başlatılıyor...') : 'Demo simülasyonu başlatılıyor...';
      showToast(msg, 'info');
      this.stopGPS();
      this.startSimulation();
    }
    this.updateModeBadge();
  },

  createRiderMarker(latlng) {
    if (this.marker && map) {
      map.removeLayer(this.marker);
    }

    const iconHtml = `
      <div class="live-rider-marker">
        <div class="live-rider-pulse"></div>
        <div class="live-rider-icon" id="live-rider-icon-elem">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
          </svg>
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      className: '',
      html: iconHtml,
      iconSize: [56, 56],
      iconAnchor: [28, 28]
    });

    this.marker = L.marker(latlng, { icon: customIcon, zIndexOffset: 1000 }).addTo(map);
  },

  onLocationUpdate(lat, lon, speed, heading) {
    this.speedKmH = speed;
    this.lastHeading = heading || 0;
    this.lastCoord = [lat, lon];

    if (this.marker) {
      this.marker.setLatLng([lat, lon]);
    } else {
      this.createRiderMarker([lat, lon]);
    }

    const iconElem = document.getElementById('live-rider-icon-elem');
    if (iconElem) {
      iconElem.style.transform = `rotate(${Math.round(this.lastHeading)}deg)`;
    }

    if (this.autoCenter && map) {
      map.panTo([lat, lon], { animate: true, duration: 0.5 });
    }

    const speedEl = document.getElementById('live-nav-speed-val');
    if (speedEl) speedEl.textContent = Math.round(this.speedKmH);

    this.updateRouteProgress(lat, lon);
    this.checkProximityAlerts(lat, lon);
  },

  updateRouteProgress(lat, lon) {
    const valid = state.waypoints.filter(w => w.lat !== null && w.lon !== null);
    if (valid.length < 2) return;

    let nextWp = null;
    let nextDistKm = 0;

    for (let i = 0; i < valid.length; i++) {
      const wp = valid[i];
      const d = haversineMeters(lat, lon, wp.lat, wp.lon) / 1000;
      if (d > 0.15) {
        nextWp = wp;
        nextDistKm = d;
        break;
      }
    }

    if (!nextWp) {
      const dest = valid[valid.length - 1];
      nextWp = dest;
      nextDistKm = haversineMeters(lat, lon, dest.lat, dest.lon) / 1000;
    }

    const finalDest = valid[valid.length - 1];
    const totalRemKm = haversineMeters(lat, lon, finalDest.lat, finalDest.lon) / 1000;

    const effectiveSpeed = Math.max(30, this.speedKmH || 65);
    const remMinutes = Math.round((totalRemKm / effectiveSpeed) * 60);
    const remH = Math.floor(remMinutes / 60);
    const remM = remMinutes % 60;
    const isEn = (window.state && window.state.lang === 'en');
    const timeStr = isEn ? `${remH > 0 ? remH + 'h ' : ''}${remM}m` : `${remH > 0 ? remH + ' sa ' : ''}${remM} dk`;

    const distEl = document.getElementById('live-nav-next-dist');
    const nameEl = document.getElementById('live-nav-next-name');
    if (distEl && nameEl) {
      distEl.textContent = (nextDistKm < 1)
        ? `${Math.round(nextDistKm * 1000)} m`
        : `${nextDistKm.toFixed(1)} km`;
      nameEl.textContent = nextWp.name || (isEn ? 'Next Destination' : 'Sonraki Hedef');
    }

    const dirIcon = document.getElementById('live-nav-dir-icon');
    if (dirIcon && nextWp) {
      const targetBearing = calculateBearing(lat, lon, nextWp.lat, nextWp.lon);
      const relativeBearing = targetBearing - (this.lastHeading || 0);
      dirIcon.style.transform = `rotate(${Math.round(relativeBearing)}deg)`;
    }

    const remDistEl = document.getElementById('live-nav-rem-dist');
    const remTimeEl = document.getElementById('live-nav-rem-time');
    if (remDistEl) remDistEl.textContent = `${totalRemKm.toFixed(1)} km`;
    if (remTimeEl) remTimeEl.textContent = timeStr;
  },

  checkProximityAlerts(lat, lon) {
    const isEn = (window.state && window.state.lang === 'en');
    const targets = [];

    const valid = state.waypoints.filter(w => w.lat !== null && w.lon !== null);
    valid.slice(1).forEach((wp, idx) => {
      targets.push({
        id: `wp_${idx}`,
        name: wp.name || `${isEn ? 'Waypoint' : 'Durak'} ${idx + 1}`,
        lat: wp.lat,
        lon: wp.lon
      });
    });

    if (state.corridorPois && Array.isArray(state.corridorPois)) {
      state.corridorPois.forEach(poi => {
        targets.push({
          id: `poi_${poi.id || poi.name}`,
          name: poi.name,
          lat: poi.lat,
          lon: poi.lon
        });
      });
    }

    for (const target of targets) {
      if (this.notifiedPois.has(target.id)) continue;

      const distM = haversineMeters(lat, lon, target.lat, target.lon);

      if (distM <= 1000 && distM >= 60) {
        this.notifiedPois.add(target.id);
        this.showProximityBanner(target.name, Math.round(distM));

        if (this.voiceEnabled) {
          const speechText = isEn
            ? `Approaching ${target.name} in ${Math.round(distM)} meters`
            : `${target.name} noktasına ${Math.round(distM)} metre kaldı`;
          this.speak(speechText);
        }
        break;
      }
    }
  },

  showProximityBanner(name, distM) {
    const banner = document.getElementById('live-nav-alert-banner');
    const textEl = document.getElementById('live-nav-alert-text');
    if (!banner || !textEl) return;

    textEl.textContent = `${name} (${distM}m)`;
    banner.classList.remove('hidden');

    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      banner.classList.add('hidden');
    }, 7000);
  },

  dismissAlertBanner() {
    const banner = document.getElementById('live-nav-alert-banner');
    if (banner) banner.classList.add('hidden');
  },

  onDestinationReached() {
    const isEn = (window.state && window.state.lang === 'en');
    const msg = isEn ? 'You have arrived at your destination! Congratulations!' : 'Hedefe ulaştınız! Tebrikler!';
    if (this.voiceEnabled) {
      this.speak(msg);
    }
    showToast(msg, 'success');
  },

  recenterMap() {
    this.autoCenter = true;
    if (this.lastCoord && map) {
      map.setView(this.lastCoord, 16, { animate: true });
      const isEn = (window.state && window.state.lang === 'en');
      showToast(isEn ? 'Map centered on rider' : 'Harita sürücüye ortalandı', 'info');
    }
  },

  toggleVoice() {
    this.voiceEnabled = !this.voiceEnabled;
    this.updateControlsUI();
    const isEn = (window.state && window.state.lang === 'en');
    const msg = this.voiceEnabled
      ? (isEn ? 'Voice guidance turned ON' : 'Sesli yönlendirme açıldı')
      : (isEn ? 'Voice guidance turned OFF' : 'Sesli yönlendirme kapatıldı');
    showToast(msg, 'info');
  },

  speak(text) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = (window.state && window.state.lang === 'en') ? 'en-US' : 'tr-TR';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  },

  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
      } catch (err) {
        console.warn('Wake Lock request error:', err);
      }
    }
  },

  releaseWakeLock() {
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
      } catch (e) {
        // ignore
      }
      this.wakeLock = null;
    }
  },

  updateModeBadge() {
    const badgeText = document.getElementById('live-nav-mode-text');
    const demoBtnText = document.getElementById('live-nav-demo-text');
    const isEn = (window.state && window.state.lang === 'en');

    if (this.isSimulation) {
      if (badgeText) badgeText.textContent = isEn ? 'Demo Ride' : 'Demo Sürüş';
      if (demoBtnText) demoBtnText.textContent = isEn ? 'Live GPS' : 'GPS Modu';
    } else {
      if (badgeText) badgeText.textContent = isEn ? 'Live GPS' : 'GPS Canlı';
      if (demoBtnText) demoBtnText.textContent = isEn ? 'Demo' : 'Demo';
    }
  },

  updateControlsUI() {
    const voiceText = document.getElementById('live-nav-voice-text');
    const voiceBtn = document.getElementById('live-nav-voice-btn');
    const voiceIcon = document.getElementById('live-nav-voice-icon');
    const isEn = (window.state && window.state.lang === 'en');

    if (voiceText) {
      voiceText.textContent = this.voiceEnabled
        ? (isEn ? 'Voice On' : 'Ses Açık')
        : (isEn ? 'Voice Off' : 'Ses Kapalı');
    }

    if (voiceBtn) {
      if (this.voiceEnabled) {
        voiceBtn.classList.remove('text-slate-400');
        voiceBtn.classList.add('text-emerald-400');
      } else {
        voiceBtn.classList.remove('text-emerald-400');
        voiceBtn.classList.add('text-slate-400');
      }
    }

    if (voiceIcon) {
      voiceIcon.setAttribute('data-lucide', this.voiceEnabled ? 'volume-2' : 'volume-x');
    }
    if (typeof initIcons === 'function') initIcons();
  }
};

// Global hooks for HTML button triggers
window.handleMobileNavRideStart = handleMobileNavRideStart;
window.startLiveRide = function(forceSim = false) {
  LiveNavigation.start(forceSim);
};

window.stopLiveRide = function() {
  LiveNavigation.stop();
};

window.dismissLiveHudAlert = function() {
  LiveNavigation.dismissAlertBanner();
};

window.LiveNavigation = LiveNavigation;

// Re-request Screen Wake Lock when tab becomes visible again
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && LiveNavigation.isActive) {
    LiveNavigation.requestWakeLock();
  }
});
