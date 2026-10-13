/**
 * ROTAM V2 – Professional Travel, Route Planning & Destination Discovery Platform
 * 
 * Slogan: "Yolculuğun sadece bir varış noktası değil. Rotanı oluştur, keşfedilecek yerleri bul ve yolculuğunu unutulmaz hale getir."
 */

// Global Application State
const state = {
  lang: localStorage.getItem('rotam_lang') || 'tr',
  currentVehicle: localStorage.getItem('rotam_vehicle') || 'motorcycle', // 'motorcycle' | 'car' | 'camper' | 'bicycle' | 'walk'
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
  activePoiCategories: new Set(),
  allPlaces: [],
  corridorPois: [],
  smartRecommendations: [],
  userLocation: null,
  routeRequestId: 0,
  camperProfile: null,
  camperSlopeAnalysis: null
};
window.state = state;

// Camper Profile Presets (Alkoven, Campervan, Büyük Çekme, Kompakt O1, Tam Entegre)
const CAMPER_PRESETS = {
  alcove: {
    type: 'alcove',
    title: 'Motokaravan (Alkovenli / Yarı Entegre)',
    title_short: 'Motokaravan',
    height: 3.10,
    width: 2.35,
    length: 6.80,
    weight: 3.50,
    avoidLowBridges: true,
    preferWideRoads: true,
    maxSlopeWarning: 8,
    speedLimitHighway: 110,
    speedLimitDivided: 100,
    speedLimitIntercity: 80
  },
  van: {
    type: 'van',
    title: 'Campervan (Panelvan / Motokaravan)',
    title_short: 'Campervan',
    height: 2.65,
    width: 2.05,
    length: 5.99,
    weight: 3.20,
    avoidLowBridges: true,
    preferWideRoads: true,
    maxSlopeWarning: 9,
    speedLimitHighway: 110,
    speedLimitDivided: 100,
    speedLimitIntercity: 80
  },
  trailer: {
    type: 'trailer',
    title: 'Büyük Çekme Karavan (+750kg O2)',
    title_short: 'Büyük Çekme Karavan',
    height: 2.60,
    width: 2.30,
    length: 11.50,
    weight: 4.20,
    avoidLowBridges: true,
    preferWideRoads: true,
    maxSlopeWarning: 7,
    speedLimitHighway: 100, // KTK Madde 100 römork kuralı
    speedLimitDivided: 90,
    speedLimitIntercity: 70
  },
  compact_trailer: {
    type: 'compact_trailer',
    title: 'Kompakt Çekme Karavan (O1 / 750kg altı)',
    title_short: 'Kompakt Karavan (O1)',
    height: 2.20,
    width: 2.05,
    length: 8.50,
    weight: 2.40,
    avoidLowBridges: true,
    preferWideRoads: false,
    maxSlopeWarning: 9,
    speedLimitHighway: 100, // KTK Madde 100 römork kuralı
    speedLimitDivided: 90,
    speedLimitIntercity: 70
  },
  integrated: {
    type: 'integrated',
    title: 'Tam Entegre Karavan (A-Class Liner)',
    title_short: 'Tam Entegre Karavan',
    height: 3.25,
    width: 2.45,
    length: 8.50,
    weight: 4.50,
    avoidLowBridges: true,
    preferWideRoads: true,
    maxSlopeWarning: 7,
    speedLimitHighway: 110,
    speedLimitDivided: 100,
    speedLimitIntercity: 80
  }
};

try {
  const savedCp = localStorage.getItem('rotam_camper_profile');
  state.camperProfile = savedCp ? JSON.parse(savedCp) : { ...CAMPER_PRESETS.alcove };
} catch (e) {
  state.camperProfile = { ...CAMPER_PRESETS.alcove };
}

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
  camping: { title: 'Kamp & Çadır & Karavan Sahası', title_en: 'Camping, Tent & Camper Site', icon: 'tent', emoji: '🏕️', color: '#16a34a', fill: '#22c55e', pinClass: 'pin-camping' },
  viewpoint: { title: 'Seyir Noktası & Geçit', title_en: 'Scenic Viewpoint & Pass', icon: 'mountain', emoji: '🌄', color: '#ea580c', fill: '#f97316', pinClass: 'pin-viewpoint' },
  mountain_pass: { title: 'Dağ Geçidi', title_en: 'Mountain Pass', icon: 'mountain-snow', emoji: '⛰️', color: '#4f46e5', fill: '#6366f1', pinClass: 'pin-mountain_pass' }
};

function getCategoryTitle(cat) {
  const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.historic;
  return (window.state && window.state.lang === 'en' && cfg.title_en) ? cfg.title_en : cfg.title;
}

// Primary Category Filter Groups (Including Dedicated Camping & Outdoor Group)
const CATEGORY_GROUPS = {
  historic: ['historic'],
  nature: ['nature'],
  camping: ['camping'],
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
    osm: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }),
    day: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }),
    voyager: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
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

// Patch Leaflet Draggable to compensate for CSS rotated & scaled map container in LiveNavigation
function patchLeafletDraggableForRotation() {
  if (typeof L === 'undefined' || !L.Draggable || L.Draggable._rotamPatched) return;
  L.Draggable._rotamPatched = true;

  const origAdjustAndSetPosition = L.Draggable.prototype._adjustAndSetPosition;
  L.Draggable.prototype._adjustAndSetPosition = function (offset) {
    if (
      typeof LiveNavigation !== 'undefined' &&
      LiveNavigation.isActive &&
      LiveNavigation.currentMapRotation
    ) {
      // Rotation angle in radians
      const deg = LiveNavigation.currentMapRotation;
      const rad = (deg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const scale = 1.55; // CSS scale factor in live-nav-rotating

      // Transform raw screen delta into element's rotated coordinate frame
      const adjX = (offset.x * cos + offset.y * sin) / scale;
      const adjY = (-offset.x * sin + offset.y * cos) / scale;

      const adjOffset = new L.Point(adjX, adjY);
      return origAdjustAndSetPosition.call(this, adjOffset);
    }
    return origAdjustAndSetPosition.call(this, offset);
  };
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

  patchLeafletDraggableForRotation();

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

  // Map Click Listener to add waypoints & auto-collapse filters on mobile
  map.on('click', async (e) => {
    dismissQuickPlacePreview();
    const rightPanel = document.getElementById('right-panel');
    if (rightPanel && !rightPanel.classList.contains('hidden') && window.innerWidth < 1024) {
      closeRightPanel();
    }
    if (window.innerWidth < 768) {
      const container = document.getElementById('map-filter-pills-container');
      if (container && !container.classList.contains('hidden')) {
        toggleMapFilterBarCollapse();
      }
    }
    handleMapClick(e.latlng.lat, e.latlng.lng);
  });

  // Map pan/move dimming to keep map clear and distraction-free while navigating or exploring
  map.on('movestart', () => {
    const filterBar = document.getElementById('map-category-filter-bar');
    if (filterBar) filterBar.classList.add('map-moving-dim');
  });
  map.on('moveend', () => {
    const filterBar = document.getElementById('map-category-filter-bar');
    if (filterBar) filterBar.classList.remove('map-moving-dim');
    if (typeof RotamCommunity !== 'undefined' && RotamCommunity.layerVisible) {
      RotamCommunity.renderOnMap();
    }
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

  // Initialize POI category filters and map markers
  clearHighlightMarkers();
  updatePoiCategoryFilterUI();
  renderCorridorPoiMarkers();
  initMapFilterBarState();

  // Proactively warm GPS user location cache in background for instant navigation startup
  proactivelyWarmUserLocation();

  // Initialize Real-time Community Live Hazard & Road Alert Network
  if (typeof RotamCommunity !== 'undefined') {
    RotamCommunity.init();
  }

  // Initialize Real-time Rotam Cultural & Historic Audio Whisper Guide
  if (typeof RotamStoryGuide !== 'undefined') {
    RotamStoryGuide.init();
  }

  // Initialize Robust Voice & Audio Guidance Engine (Android & iOS Bridge)
  if (typeof RotamSpeech !== 'undefined') {
    RotamSpeech.init();
  }

  // Initialize Display, Touch & Responsive Engine (Mobile, Tablet & Landscape)
  if (typeof RotamDisplay !== 'undefined') {
    RotamDisplay.init();
  }

  // Initialize TomTom Real-time Traffic Flow Engine
  if (typeof RotamTraffic !== 'undefined') {
    RotamTraffic.init();
  }
}

// Proactive user location cache warmer
function proactivelyWarmUserLocation() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.userLocation = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude
      };
    },
    () => {
      // Ignore silently if permission prompt not yet accepted
    },
    { enableHighAccuracy: true, timeout: 6000, maximumAge: 120000 }
  );
}

// Map Floating Control: Fly to current location & zoom in at street level (zoom 18)
let nonNavLocationMarker = null;
function showUserLocationPulseMarker(lat, lon) {
  if (!map) return;
  if (nonNavLocationMarker) {
    nonNavLocationMarker.setLatLng([lat, lon]);
    return;
  }
  const html = `
    <div class="live-rider-marker">
      <div class="live-rider-pulse"></div>
      <div class="w-4 h-4 rounded-full bg-cyan-400 border-2 border-white shadow-lg shadow-cyan-400/80"></div>
    </div>
  `;
  const icon = L.divIcon({
    className: '',
    html,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
  nonNavLocationMarker = L.marker([lat, lon], { icon, zIndexOffset: 900 }).addTo(map);
}

function flyToCurrentLocation() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    showToast('Tarayıcınız konum servisini desteklemiyor.', 'warning');
    return;
  }
  const isEn = (window.state && window.state.lang === 'en');
  showToast(isEn ? 'Locating your position...' : 'Konumunuz alınıyor ve yaklaşılıyor...', 'info');

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      state.userLocation = { lat, lon };

      if (map) {
        map.flyTo([lat, lon], 18, { duration: 1.2, easeLinearity: 0.25 });
      }

      if (typeof LiveNavigation !== 'undefined' && LiveNavigation.isActive) {
        LiveNavigation.lastCoord = [lat, lon];
        LiveNavigation.autoCenter = true;
        if (LiveNavigation.marker) {
          LiveNavigation.marker.setLatLng([lat, lon]);
        }
      } else {
        showUserLocationPulseMarker(lat, lon);
      }
      showToast(isEn ? '📍 Centered on your current location.' : '📍 Bulunduğunuz konuma yaklaşıldı.', 'success');
    },
    (err) => {
      console.warn('Geolocation error in flyToCurrentLocation:', err);
      showToast(isEn ? 'Could not obtain location: ' + err.message : 'Konum alınamadı: ' + err.message, 'error');
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}
window.flyToCurrentLocation = flyToCurrentLocation;

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
  const isDark = (tileKey === 'dark');

  if (isDark) {
    if (mapEl) mapEl.classList.add('dark-map');
    document.body.classList.remove('sunlight-mode');
  } else {
    if (mapEl) mapEl.classList.remove('dark-map');
  }

  const targetLayer = tileLayers[tileKey] || tileLayers.osm || tileLayers.dark;
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
  const activeBtn = document.getElementById(`tile-${tileKey}`) || (tileKey === 'day' ? document.getElementById('tile-osm') : null);
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
  closeRightPanel();
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
  if (!sidebar.classList.contains('hidden') && sidebar.classList.contains('mobile-sheet-open')) {
    closeMobileSidebar();
  } else if (!sidebar.classList.contains('hidden') && window.innerWidth >= 768) {
    closeMobileSidebar();
  } else {
    openMobileSidebar();
  }
}

function toggleMobileLayersPopover() {
  const popover = document.getElementById('mobile-layers-popover');
  if (popover) {
    popover.classList.toggle('hidden');
    if (!popover.classList.contains('hidden')) {
      const statusEl = document.getElementById('mobile-community-status');
      if (statusEl && window.RotamCommunity) {
        statusEl.textContent = RotamCommunity.layerVisible ? 'Aktif' : 'Kapalı';
        statusEl.className = RotamCommunity.layerVisible ? 'text-[10px] text-emerald-400' : 'text-[10px] text-slate-500';
      }
    }
  }
}

// Click outside to dismiss layers popover or live-nav tools popover
document.addEventListener('click', (e) => {
  const popover = document.getElementById('mobile-layers-popover');
  const fabStack = document.getElementById('mobile-floating-fabs');
  if (popover && !popover.classList.contains('hidden') && fabStack) {
    if (!fabStack.contains(e.target)) {
      popover.classList.add('hidden');
    }
  }

  const navToolsPopover = document.getElementById('live-nav-tools-popover');
  const navToolsBtn = document.getElementById('live-nav-btn-tools');
  if (navToolsPopover && !navToolsPopover.classList.contains('hidden')) {
    if (!navToolsPopover.contains(e.target) && !navToolsBtn?.contains(e.target)) {
      navToolsPopover.classList.add('hidden');
    }
  }
});

function openMobileSidebar(focusTarget = null) {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) {
    sidebar.classList.remove('hidden');
    sidebar.classList.add('flex');
    if (window.innerWidth < 768) {
      requestAnimationFrame(() => {
        sidebar.classList.add('mobile-sheet-open');
      });
    }
    initIcons();
    if (map) setTimeout(() => map.invalidateSize(), 150);
  }
  if (backdrop && window.innerWidth < 768) {
    backdrop.classList.remove('hidden');
    requestAnimationFrame(() => backdrop.classList.add('active'));
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
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) {
    sidebar.classList.remove('mobile-sheet-open');
    if (window.innerWidth < 768) {
      setTimeout(() => {
        if (!sidebar.classList.contains('mobile-sheet-open')) {
          sidebar.classList.add('hidden');
          sidebar.classList.remove('flex');
        }
      }, 300);
    } else {
      sidebar.classList.add('hidden');
      sidebar.classList.remove('flex');
    }
    if (map) {
      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 320);
    }
  }
  if (backdrop) {
    backdrop.classList.remove('active');
    setTimeout(() => backdrop.classList.add('hidden'), 260);
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

function openStartRideChoiceModal() {
  const modal = document.getElementById('modal-start-ride-choice');
  if (modal) {
    modal.classList.remove('hidden');
    if (typeof initIcons === 'function') initIcons();
  }
}

function closeStartRideChoiceModal() {
  const modal = document.getElementById('modal-start-ride-choice');
  if (modal) modal.classList.add('hidden');
}

function startFreeRideFromModal() {
  closeStartRideChoiceModal();
  if (typeof LiveNavigation !== 'undefined') {
    LiveNavigation.startFreeRide();
  }
}

function startDemoRouteFromModal() {
  closeStartRideChoiceModal();
  const isEn = (window.state && window.state.lang === 'en');
  showToast(isEn ? 'Loading scenic demo route...' : 'Örnek virajlı rota yükleniyor...', 'info');

  state.waypoints = [
    { id: 'start', type: 'start', lat: 40.9904, lon: 29.0254, name: isEn ? 'Kadikoy' : 'Kadıköy' },
    { id: 'end', type: 'end', lat: 41.1744, lon: 29.6125, name: isEn ? 'Sile Coast' : 'Şile Sahili' }
  ];
  if (typeof updateWaypointsListUI === 'function') updateWaypointsListUI();
  if (typeof updateWaypointMarkers === 'function') updateWaypointMarkers();

  calculateRouteMain().then(() => {
    if (state.routeData && typeof LiveNavigation !== 'undefined') {
      LiveNavigation.start(true);
    }
  }).catch(e => {
    console.error('Demo route calculation error:', e);
  });
}

function selectDestinationFromModal() {
  closeStartRideChoiceModal();
  openMobileSidebar('end');
}

window.openStartRideChoiceModal = openStartRideChoiceModal;
window.closeStartRideChoiceModal = closeStartRideChoiceModal;
window.startFreeRideFromModal = startFreeRideFromModal;
window.startDemoRouteFromModal = startDemoRouteFromModal;
window.selectDestinationFromModal = selectDestinationFromModal;

function handleMobileNavRideStart() {
  if (typeof LiveNavigation !== 'undefined' && LiveNavigation.isActive) {
    LiveNavigation.recenterMap();
    const isEn = (window.state && window.state.lang === 'en');
    showToast(isEn ? 'Live navigation is already active.' : 'Canlı sürüş takibi aktif.', 'info');
    return;
  }

  const valid = (state.waypoints || []).filter(w => w.lat !== null && w.lon !== null);

  // If active route is already calculated and ready -> Start ride immediately!
  if (state.routeData && valid.length >= 2) {
    if (typeof LiveNavigation !== 'undefined') {
      LiveNavigation.start();
    }
    return;
  }

  // If destination is defined but start point is missing: automatically use current GPS location!
  if (state.waypoints[1] && state.waypoints[1].lat !== null && (!state.waypoints[0] || state.waypoints[0].lat === null)) {
    const isEn = (window.state && window.state.lang === 'en');
    if (navigator.geolocation) {
      showToast(isEn ? 'Getting your location and preparing route...' : 'Mevcut konumunuz alınıyor ve rota oluşturuluyor...', 'info');
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          state.userLocation = { lat, lon };
          state.waypoints[0].lat = lat;
          state.waypoints[0].lon = lon;
          state.waypoints[0].name = isEn ? 'Current Location' : 'Mevcut Konumum';
          if (typeof updateWaypointsListUI === 'function') updateWaypointsListUI();
          if (typeof updateWaypointMarkers === 'function') updateWaypointMarkers();

          try {
            await calculateRouteMain();
            if (state.routeData && typeof LiveNavigation !== 'undefined') {
              LiveNavigation.start();
            }
          } catch (e) {
            console.error('Route calculation from GPS failed:', e);
            showToast(isEn ? 'Route calculation failed.' : 'Rota hesaplanamadı.', 'error');
          }
        },
        async (err) => {
          console.warn('Geolocation fallback in handleMobileNavRideStart:', err);
          // If GPS fails or is slow, fallback to starting location so user is never blocked
          const fallbackLat = state.userLocation?.lat || 41.0082;
          const fallbackLon = state.userLocation?.lon || 28.9784;
          state.waypoints[0].lat = fallbackLat;
          state.waypoints[0].lon = fallbackLon;
          state.waypoints[0].name = isEn ? 'Start' : 'Başlangıç';
          try {
            await calculateRouteMain();
            if (state.routeData && typeof LiveNavigation !== 'undefined') {
              LiveNavigation.start(true);
            }
          } catch (e2) {
            showToast(isEn ? 'Route calculation failed.' : 'Rota hesaplanamadı.', 'error');
            openMobileSidebar('start');
          }
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
      return;
    }
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

  // Less than 2 waypoints: Show quick ride launcher modal with instant choices!
  openStartRideChoiceModal();
}
window.handleMobileNavRideStart = handleMobileNavRideStart;

// Vehicle Selection (Car, Moto, Camper, Bicycle, Walk)
function selectVehicle(vehicle) {
  state.currentVehicle = vehicle;
  try {
    localStorage.setItem('rotam_vehicle', vehicle);
  } catch (e) {}

  if (typeof RotamTelemetry !== 'undefined' && RotamTelemetry.recordVehicle) {
    RotamTelemetry.recordVehicle(vehicle);
  }

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

  // Toggle Camper Profile & Safety Report Panels
  const camperPanel = document.getElementById('camper-profile-panel');
  const camperReport = document.getElementById('camper-safety-report');
  if (vehicle === 'camper') {
    if (camperPanel) camperPanel.classList.remove('hidden');
    if (camperReport && state.routeData) camperReport.classList.remove('hidden');
    syncCamperProfileUI();
  } else {
    if (camperPanel) camperPanel.classList.add('hidden');
    if (camperReport) camperReport.classList.add('hidden');
  }

  try {
    localStorage.setItem('rotam_user_vehicle', vehicle);
  } catch (e) {}

  // If a route exists, recalculate for new vehicle dynamics
  const valid = state.waypoints.filter(w => w.lat !== null && w.lon !== null);
  if (valid.length >= 2) {
    calculateRouteMain();
  }
}

// Camper Profile Management & Safety Functions
function syncCamperProfileUI() {
  const p = state.camperProfile || CAMPER_PRESETS.alcove;
  const hInput = document.getElementById('camper-height-input');
  const wInput = document.getElementById('camper-width-input');
  const lInput = document.getElementById('camper-length-input');
  const wtInput = document.getElementById('camper-weight-input');
  const chkBridge = document.getElementById('camper-chk-lowbridge');
  const chkWide = document.getElementById('camper-chk-wideroads');
  const chkSlope = document.getElementById('camper-chk-slopelimit');
  const slopeLabel = document.getElementById('camper-slope-chk-label');

  if (hInput) hInput.value = Number(p.height).toFixed(2);
  if (wInput) wInput.value = Number(p.width).toFixed(2);
  if (lInput) lInput.value = Number(p.length).toFixed(2);
  if (wtInput) wtInput.value = Number(p.weight).toFixed(2);
  if (chkBridge) chkBridge.checked = p.avoidLowBridges !== false;
  if (chkWide) chkWide.checked = p.preferWideRoads !== false;
  if (chkSlope) chkSlope.checked = Boolean(p.maxSlopeWarning);
  if (slopeLabel) {
    const thresh = p.maxSlopeWarning || 8;
    slopeLabel.textContent = `Dik Eğim Uyarısı (%${thresh} üzeri rampa)`;
  }

  document.querySelectorAll('.camper-preset-btn').forEach(btn => btn.classList.remove('active'));
  if (p.type && document.getElementById(`camper-preset-${p.type}`)) {
    document.getElementById(`camper-preset-${p.type}`).classList.add('active');
  }
  if (typeof initIcons === 'function') initIcons();
}

function setCamperPreset(presetKey) {
  const preset = CAMPER_PRESETS[presetKey];
  if (!preset) return;
  state.camperProfile = { ...preset };
  try {
    localStorage.setItem('rotam_camper_profile', JSON.stringify(state.camperProfile));
  } catch (e) {}
  syncCamperProfileUI();

  const isEn = (window.state && window.state.lang === 'en');
  showToast(isEn ? `Camper Profile: ${preset.title}` : `Karavan Profili: ${preset.title}`, 'info');

  const valid = state.waypoints.filter(w => w.lat !== null && w.lon !== null);
  if (valid.length >= 2) {
    calculateRouteMain();
  }
}

function onCamperDimChange() {
  const h = parseFloat(document.getElementById('camper-height-input')?.value) || 3.10;
  const w = parseFloat(document.getElementById('camper-width-input')?.value) || 2.35;
  const l = parseFloat(document.getElementById('camper-length-input')?.value) || 6.80;
  const wt = parseFloat(document.getElementById('camper-weight-input')?.value) || 3.50;

  state.camperProfile = {
    ...(state.camperProfile || CAMPER_PRESETS.alcove),
    type: 'custom',
    height: Math.max(1.8, Math.min(4.5, h)),
    width: Math.max(1.5, Math.min(3.2, w)),
    length: Math.max(2.5, Math.min(16.0, l)),
    weight: Math.max(1.0, Math.min(20.0, wt))
  };

  try {
    localStorage.setItem('rotam_camper_profile', JSON.stringify(state.camperProfile));
  } catch (e) {}

  document.querySelectorAll('.camper-preset-btn').forEach(btn => btn.classList.remove('active'));

  const valid = state.waypoints.filter(w => w.lat !== null && w.lon !== null);
  if (valid.length >= 2) {
    calculateRouteMain();
  }
}

function onCamperOptionChange() {
  const chkBridge = document.getElementById('camper-chk-lowbridge')?.checked;
  const chkWide = document.getElementById('camper-chk-wideroads')?.checked;
  const chkSlope = document.getElementById('camper-chk-slopelimit')?.checked;

  const curType = state.camperProfile?.type;
  const defaultWarn = (curType && CAMPER_PRESETS[curType]) ? CAMPER_PRESETS[curType].maxSlopeWarning : (state.camperProfile?.maxSlopeWarning || 8);

  state.camperProfile = {
    ...(state.camperProfile || CAMPER_PRESETS.alcove),
    avoidLowBridges: chkBridge !== false,
    preferWideRoads: chkWide !== false,
    maxSlopeWarning: chkSlope ? defaultWarn : 15
  };

  try {
    localStorage.setItem('rotam_camper_profile', JSON.stringify(state.camperProfile));
  } catch (e) {}

  const valid = state.waypoints.filter(w => w.lat !== null && w.lon !== null);
  if (valid.length >= 2) {
    calculateRouteMain();
  }
}

function updateCamperSafetyUI(route) {
  const reportPanel = document.getElementById('camper-safety-report');
  if (!reportPanel) return;

  if (state.currentVehicle !== 'camper') {
    reportPanel.classList.add('hidden');
    return;
  }
  reportPanel.classList.remove('hidden');

  const p = state.camperProfile || CAMPER_PRESETS.alcove;
  const clearanceEl = document.getElementById('camper-report-clearance');
  const widthEl = document.getElementById('camper-report-width');
  const slopeEl = document.getElementById('camper-report-slope');
  const statusBadge = document.getElementById('camper-safety-status-badge');
  const alertBox = document.getElementById('camper-slope-alert-box');
  const alertText = document.getElementById('camper-slope-alert-text');

  if (clearanceEl) clearanceEl.textContent = `${Number(p.height).toFixed(2)} m Korumalı`;
  if (widthEl) {
    if (p.type === 'trailer' || p.type === 'integrated') {
      widthEl.textContent = 'Geniş Asfalt & Bölünmüş Yol Önceliği (Uzun Taşıt)';
    } else if (p.preferWideRoads) {
      widthEl.textContent = 'Geniş Asfalt & Ana Arterler';
    } else {
      widthEl.textContent = 'Standart Güzergah';
    }
  }

  const slope = state.camperSlopeAnalysis?.maxSlope || 0;
  if (slopeEl) {
    if (slope <= 6) {
      slopeEl.textContent = `%${slope} (Düşük Eğim)`;
      slopeEl.className = 'font-bold text-emerald-400';
    } else if (slope <= 9) {
      slopeEl.textContent = `%${slope} (Orta Eğim)`;
      slopeEl.className = 'font-bold text-amber-300';
    } else {
      slopeEl.textContent = `%${slope} (Dik Rampa / Geçit)`;
      slopeEl.className = 'font-bold text-red-400';
    }
  }

  if (slope >= (p.maxSlopeWarning || 8)) {
    if (statusBadge) {
      statusBadge.textContent = '⚠️ Dik Eğim Uyarısı';
      statusBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30';
    }
    if (alertBox) alertBox.classList.remove('hidden');
    if (alertText) {
      if (p.type === 'trailer' || p.type === 'compact_trailer') {
        alertText.textContent = `Bu güzergahta maksimum %${slope} eğimli dik rampa/geçit bulunmaktadır. Çekme karavan ile inişlerde çeki demiri salınımına (snaking/balıklama) dikkat edin, motor kompresyon freni kullanıp römork fren balatalarını aşırı ısıtmayın.`;
      } else {
        alertText.textContent = `Bu güzergahta maksimum %${slope} eğimli dik rampa/geçit bulunmaktadır. Karavan ile inişlerde motor kompresyon freni kullanın, aşırı balata ısınmasından kaçının.`;
      }
    }
  } else {
    if (statusBadge) {
      statusBadge.textContent = '✅ Güvenli & Uygun';
      statusBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    }
    if (alertBox) alertBox.classList.add('hidden');
  }

  if (typeof initIcons === 'function') initIcons();
}

window.syncCamperProfileUI = syncCamperProfileUI;
window.setCamperPreset = setCamperPreset;
window.onCamperDimChange = onCamperDimChange;
window.onCamperOptionChange = onCamperOptionChange;
window.updateCamperSafetyUI = updateCamperSafetyUI;

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

  // Tier 2: Photon Geocoder (Fast ~200ms)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const q = encodeURIComponent(qStr);
    const res = await fetch(`https://photon.komoot.io/api/?q=${q}&limit=1`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.features && data.features.length > 0) {
        const f = data.features[0];
        const p = f.properties || {};
        const coords = f.geometry ? f.geometry.coordinates : null;
        if (coords && coords.length >= 2) {
          const sub = [p.district, p.city, p.state].filter(Boolean).join(', ');
          return {
            lat: coords[1],
            lon: coords[0],
            displayName: sub ? `${p.name || qStr}, ${sub}` : (p.name || qStr)
          };
        }
      }
    }
  } catch (err) {}

  // Tier 3: OpenStreetMap Nominatim with safe timeout
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

    const hasValue = (wp.name && wp.name.trim() !== '');

    div.innerHTML = `
      <div class="p-1 shrink-0 flex items-center justify-center">${iconHtml}</div>
      <input type="text" value="${escapeHtml(wp.name || '')}" 
        autocomplete="off" autocorrect="off" spellcheck="false"
        placeholder="${isStart ? (typeof t === 'function' ? t('wp_start_placeholder', 'Başlangıç Noktası (Örn: Ankara)') : 'Başlangıç Noktası') : isEnd ? (typeof t === 'function' ? t('wp_end_placeholder', 'Varış Noktası (Örn: Dikmen veya Kaş)') : 'Varış Noktası') : ((typeof t === 'function' ? t('wp_stop_prefix', 'Ara Durak ') : 'Ara Durak ') + index)}" 
        oninput="handleWaypointNameChange(${index}, this.value, this)"
        onfocus="handleWaypointFocus(${index}, this.value, this)"
        onblur="setTimeout(closeWaypointAutocomplete, 350); handleWaypointBlur(${index}, this.value)"
        onkeydown="if(event.key==='Enter') { closeWaypointAutocomplete(); handleWaypointBlur(${index}, this.value); calculateRouteMain(); }"
        class="bg-transparent flex-1 text-xs text-white placeholder-slate-500 focus:outline-none truncate font-medium">
      <div class="flex items-center space-x-1 shrink-0">
        ${hasValue ? `
          <button type="button" onclick="clearWaypointInput(${index})" class="p-1 text-slate-500 hover:text-slate-300 rounded transition-colors" title="Temizle">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
          </button>
        ` : ''}
        ${isStart ? `
          <button type="button" onclick="useCurrentLocationForStart()" class="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded transition-colors" title="Mevcut Konumumu Kullan">
            <i data-lucide="crosshair" class="w-3.5 h-3.5"></i>
          </button>
        ` : ''}
        ${isEnd ? `
          <button type="button" onclick="activateMapPickMode(${index})" class="p-1 text-brand-400 hover:text-brand-300 hover:bg-brand-500/10 rounded transition-colors" title="Haritadan Nokta Seç">
            <i data-lucide="map-pin" class="w-3.5 h-3.5"></i>
          </button>
        ` : ''}
        ${isWaypoint ? `
          <button type="button" onclick="removeWaypoint(${index})" class="p-1 text-slate-500 hover:text-red-400 rounded transition-colors" title="Durağı Sil">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        ` : ''}
      </div>
    `;

    container.appendChild(div);
  });

  initIcons();
}

function clearWaypointInput(index) {
  if (!state.waypoints[index]) return;
  state.waypoints[index].name = '';
  state.waypoints[index].lat = null;
  state.waypoints[index].lon = null;
  if (state.waypoints[index].marker && map) {
    map.removeLayer(state.waypoints[index].marker);
    state.waypoints[index].marker = null;
  }
  updateWaypointsListUI();
  updateWaypointMarkers();
  closeWaypointAutocomplete();
  if (index === 0) {
    const heroStart = document.getElementById('hero-start-input');
    if (heroStart) heroStart.value = '';
  } else if (index === state.waypoints.length - 1) {
    const heroEnd = document.getElementById('hero-end-input');
    if (heroEnd) heroEnd.value = '';
  }
}

function activateMapPickMode(index) {
  state.mapPickTargetIndex = index;
  const isStart = index === 0;
  showToast(isStart ? 'Haritada başlangıç noktasına dokunun 📍' : 'Haritada varış noktasına dokunun 🏁', 'info');
  if (typeof toggleMobileNavDrawer === 'function') {
    const drawer = document.getElementById('mobile-nav-drawer');
    if (drawer && !drawer.classList.contains('hidden')) {
      toggleMobileNavDrawer(false);
    }
  }
}

// ==========================================
// ROTAM AKILLI KONUM & HEDEF ARAMA MOTORU (SMART SEARCH & DISAMBIGUATION)
// ==========================================
const RotamSearchEngine = {
  activeTargetIndex: 1,
  activeFilter: 'all',
  debounceTimer: null,
  activeInputEl: null,
  cachedOnlineResults: {},
  currentSuggestions: [],

  filters: [
    { id: 'all', label: 'Tümü', icon: '✨' },
    { id: 'twisty', label: 'Viraj & Geçit', icon: '🏍️', matchCats: ['mountain_pass', 'twisty'] },
    { id: 'viewpoint', label: 'Manzara', icon: '🌄', matchCats: ['viewpoint', 'photography'] },
    { id: 'historic', label: 'Tarih & Antik', icon: '🏛️', matchCats: ['historic'] },
    { id: 'nature', label: 'Doğa & Kanyon', icon: '🌲', matchCats: ['nature'] },
    { id: 'beach', label: 'Sahil & Deniz', icon: '🌊', matchCats: ['beach'] },
    { id: 'cafe', label: 'Mola & Kafe', icon: '☕', matchCats: ['cafe', 'gastronomy'] },
    { id: 'camping', label: 'Kamp & Karavan', icon: '⛺', matchCats: ['camping'] }
  ],

  getDistanceFromUser(lat, lon) {
    const origin = state.userLocation || (state.waypoints[0] && state.waypoints[0].lat ? state.waypoints[0] : null);
    if (!origin || !origin.lat || !origin.lon || !lat || !lon) return null;
    return haversineMeters(origin.lat, origin.lon, lat, lon) / 1000;
  },

  formatDistance(distKm) {
    if (distKm === null || distKm === undefined) return '';
    if (distKm < 1) return `${Math.round(distKm * 1000)} m`;
    return `${distKm.toFixed(distKm < 10 ? 1 : 0)} km`;
  },

  getCategoryLabel(cat) {
    const map = {
      mountain_pass: 'Dağ Geçidi & Viraj',
      viewpoint: 'Seyir Terası & Manzara',
      historic: 'Tarihi & Antik Kent',
      nature: 'Doğa & Kanyon',
      beach: 'Sahil & Plaj',
      cafe: 'Motorcu Molası & Kafe',
      camping: 'Kamp & Karavan',
      photography: 'Fotoğraf Noktası'
    };
    return map[cat] || 'Özel Durak';
  },

  getExploreRecommendations(filterId) {
    const places = (state && state.allPlaces && state.allPlaces.length)
      ? state.allPlaces
      : (window.DEFAULT_HISTORIC_PLACES || []);

    let filtered = [];
    if (filterId === 'all') {
      filtered = places.slice(0, 35);
    } else {
      const fObj = this.filters.find(f => f.id === filterId);
      const matchCats = fObj ? fObj.matchCats : [];
      filtered = places.filter(p => matchCats.includes(p.category));
    }

    const list = filtered.map(p => {
      const dist = this.getDistanceFromUser(p.lat, p.lon);
      const icon = p.category === 'mountain_pass' ? '🏍️' : p.category === 'viewpoint' ? '🌄' : p.category === 'historic' ? '🏛️' : p.category === 'nature' ? '🌲' : p.category === 'beach' ? '🌊' : p.category === 'cafe' ? '☕' : p.category === 'camping' ? '⛺' : '📍';
      return {
        name: p.name,
        fullName: p.city ? `${p.name}, ${p.city}` : p.name,
        subtitle: p.city ? `${p.city} • ${this.getCategoryLabel(p.category)}` : (p.description ? p.description.substring(0, 48) + '...' : 'Gezilecek Nokta'),
        category: p.category,
        icon: icon,
        lat: p.lat,
        lon: p.lon,
        distanceKm: dist,
        type: 'explore'
      };
    });

    if (list.some(r => r.distanceKm !== null)) {
      list.sort((a, b) => (a.distanceKm ?? 999999) - (b.distanceKm ?? 999999));
    }

    return list.slice(0, 8);
  },

  getLocalMatches(query, filterId) {
    if (!query || query.trim().length < 2) return [];
    const qNorm = normalizeTurkish(query.trim());
    const geoDb = (window.TURKEY_GEO_DATABASE && Array.isArray(window.TURKEY_GEO_DATABASE)) ? window.TURKEY_GEO_DATABASE : [];
    const places = (state && state.allPlaces && state.allPlaces.length) ? state.allPlaces : (window.DEFAULT_HISTORIC_PLACES || []);

    const results = [];
    const seen = new Set();

    if (filterId === 'all') {
      geoDb.forEach(item => {
        const itemNorm = normalizeTurkish(item.name);
        if (itemNorm.includes(qNorm) && !seen.has(item.name)) {
          seen.add(item.name);
          const dist = this.getDistanceFromUser(item.lat, item.lon);
          results.push({
            name: item.name,
            fullName: `${item.name}, Türkiye`,
            subtitle: `${item.region || 'İl / İlçe'} Merkezi`,
            category: 'city',
            icon: '🏙️',
            lat: item.lat,
            lon: item.lon,
            distanceKm: dist,
            type: 'city'
          });
        }
      });
    }

    const fObj = this.filters.find(f => f.id === filterId);
    const matchCats = (fObj && filterId !== 'all') ? fObj.matchCats : null;

    places.forEach(p => {
      if (matchCats && !matchCats.includes(p.category)) return;
      const pNorm = normalizeTurkish(p.name);
      const descNorm = p.description ? normalizeTurkish(p.description) : '';
      if ((pNorm.includes(qNorm) || descNorm.includes(qNorm)) && !seen.has(p.name)) {
        seen.add(p.name);
        const dist = this.getDistanceFromUser(p.lat, p.lon);
        const icon = p.category === 'mountain_pass' ? '🏍️' : p.category === 'viewpoint' ? '🌄' : p.category === 'historic' ? '🏛️' : p.category === 'nature' ? '🌲' : p.category === 'beach' ? '🌊' : p.category === 'cafe' ? '☕' : p.category === 'camping' ? '⛺' : '📍';
        results.push({
          name: p.name,
          fullName: p.city ? `${p.name}, ${p.city}` : p.name,
          subtitle: p.city ? `${p.city} • ${this.getCategoryLabel(p.category)}` : (p.description ? p.description.substring(0, 48) : 'Tarihi / Doğa'),
          category: p.category,
          icon: icon,
          lat: p.lat,
          lon: p.lon,
          distanceKm: dist,
          type: 'place'
        });
      }
    });

    return results;
  },

  async fetchPhotonMatches(query) {
    if (!query || query.trim().length < 2) return [];
    const qKey = query.trim().toLowerCase();
    if (this.cachedOnlineResults[qKey]) {
      return this.cachedOnlineResults[qKey];
    }

    try {
      const q = encodeURIComponent(query.trim());
      let url = `https://photon.komoot.io/api/?q=${q}&limit=8`;
      const origin = state.userLocation || (state.waypoints[0] && state.waypoints[0].lat ? state.waypoints[0] : null);
      if (origin && origin.lat && origin.lon) {
        url += `&lat=${origin.lat}&lon=${origin.lon}`;
      }
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 2600);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(tid);

      if (!res.ok) return [];
      const data = await res.json();
      if (!data || !data.features) return [];

      const results = [];
      const seen = new Set();

      data.features.forEach(f => {
        const p = f.properties || {};
        const coords = f.geometry ? f.geometry.coordinates : null;
        if (!coords || coords.length < 2) return;
        const lon = coords[0];
        const lat = coords[1];

        const placeName = p.name || query;
        const details = [];
        if (p.district) details.push(p.district);
        if (p.city && p.city !== p.district) details.push(p.city);
        if (p.state && p.state !== p.city) details.push(p.state);

        const fullSubtitle = details.length > 0 ? details.join(', ') : (p.country || 'Türkiye');
        const key = `${placeName}|${fullSubtitle}`;
        if (seen.has(key)) return;
        seen.add(key);

        const fullName = `${placeName}, ${fullSubtitle}`;
        const dist = this.getDistanceFromUser(lat, lon);

        let icon = '📍';
        if (p.type === 'city') icon = '🏙️';
        else if (p.type === 'district' || p.type === 'locality') icon = '🏘️';

        results.push({
          name: placeName,
          fullName: fullName,
          subtitle: fullSubtitle,
          category: p.type || 'place',
          icon: icon,
          lat: lat,
          lon: lon,
          distanceKm: dist,
          type: 'online'
        });
      });

      this.cachedOnlineResults[qKey] = results;
      return results;
    } catch (e) {
      return [];
    }
  },

  renderDropdown(index, suggestions, inputEl, isExploreMode = false) {
    let box = document.getElementById('waypoint-autocomplete-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'waypoint-autocomplete-box';
      document.body.appendChild(box);
    }

    if (!inputEl) {
      box.style.display = 'none';
      return;
    }

    const rect = inputEl.getBoundingClientRect();
    box.style.position = 'fixed';
    box.style.top = `${rect.bottom + 6}px`;
    box.style.left = `${Math.max(10, rect.left - 4)}px`;
    box.style.width = `${Math.min(window.innerWidth - 20, Math.max(300, rect.width + 40))}px`;
    box.style.display = 'block';

    const isEnd = (index === state.waypoints.length - 1);

    let filterBarHtml = `
      <div class="p-2 border-b border-slate-800 bg-slate-950/90 flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
        ${this.filters.map(f => {
          const isActive = (this.activeFilter === f.id);
          return `
            <button type="button" 
              onmousedown="event.preventDefault(); RotamSearchEngine.setFilter('${f.id}');"
              class="search-filter-chip shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center space-x-1 transition-all ${
                isActive 
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-sm' 
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }">
              <span>${f.icon}</span>
              <span>${f.label}</span>
            </button>
          `;
        }).join('')}
      </div>
    `;

    let headerText = '';
    if (isExploreMode) {
      headerText = isEnd ? '🎯 Popüler Varış Noktaları (Öneriler)' : '📍 Başlangıç İçin Önerilen Yerler';
    } else {
      headerText = `🔍 Arama Sonuçları (${suggestions ? suggestions.length : 0})`;
    }

    let headerHtml = `
      <div class="px-3 py-1.5 bg-slate-900/60 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/60 flex items-center justify-between">
        <span>${headerText}</span>
        <button type="button" onmousedown="event.preventDefault(); closeWaypointAutocomplete();" class="text-slate-500 hover:text-slate-300">✕ Kapat</button>
      </div>
    `;

    let listHtml = '';
    if (!suggestions || suggestions.length === 0) {
      listHtml = `
        <div class="p-4 text-center text-slate-400 text-xs">
          <p class="font-semibold text-slate-300 mb-1">Eşleşen sonuç bulunamadı.</p>
          <p class="text-[10px] text-slate-500">İlçe veya il adını ekleyerek aramayı deneyin ya da haritadan doğrudan seçin.</p>
          <button type="button" onmousedown="event.preventDefault(); activateMapPickMode(${index}); closeWaypointAutocomplete();" class="mt-2.5 px-3 py-1.5 rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/40 text-[11px] font-bold active:scale-95 transition-all">
            🗺️ Haritadan Dokunarak Seç
          </button>
        </div>
      `;
    } else {
      listHtml = suggestions.map((s, idx) => {
        const distStr = this.formatDistance(s.distanceKm);
        return `
          <div class="p-2.5 hover:bg-slate-800/90 active:bg-slate-750 cursor-pointer flex items-center justify-between text-xs border-b border-slate-800/70 last:border-b-0 transition-colors group"
               onmousedown="event.preventDefault(); RotamSearchEngine.selectItem(${index}, ${idx});">
            <div class="flex items-center space-x-2.5 min-w-0 flex-1 pr-2">
              <span class="text-base shrink-0 p-1 rounded-lg bg-slate-800/60 border border-slate-700/50">${s.icon || '📍'}</span>
              <div class="truncate min-w-0">
                <span class="font-bold text-white block truncate leading-tight group-hover:text-amber-300 transition-colors">${escapeHtml(s.name)}</span>
                <span class="text-[10px] text-slate-400 block truncate leading-tight mt-0.5">${escapeHtml(s.subtitle || '')}</span>
              </div>
            </div>
            <div class="flex items-center space-x-1.5 shrink-0">
              ${distStr ? `
                <span class="inline-flex items-center px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 text-[9px] font-mono border border-cyan-500/20 font-bold">
                  📍 ${distStr}
                </span>
              ` : ''}
              <span class="text-[10px] bg-amber-500/20 group-hover:bg-amber-500/40 text-amber-300 px-2 py-1 rounded-lg font-bold border border-amber-500/30">
                Seç
              </span>
            </div>
          </div>
        `;
      }).join('');
    }

    box.innerHTML = filterBarHtml + headerHtml + `<div class="max-h-[300px] overflow-y-auto">${listHtml}</div>`;
  },

  setFilter(filterId) {
    this.activeFilter = filterId;
    if (this.activeInputEl) {
      const val = this.activeInputEl.value;
      if (!val || val.trim().length < 2) {
        const recs = this.getExploreRecommendations(filterId);
        this.currentSuggestions = recs;
        this.renderDropdown(this.activeTargetIndex, recs, this.activeInputEl, true);
      } else {
        this.triggerSearch(this.activeTargetIndex, val, this.activeInputEl);
      }
    }
  },

  async triggerSearch(index, value, inputEl) {
    this.activeTargetIndex = index;
    this.activeInputEl = inputEl;

    const localMatches = this.getLocalMatches(value, this.activeFilter);
    this.currentSuggestions = localMatches;
    this.renderDropdown(index, localMatches, inputEl, false);

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(async () => {
      const onlineMatches = await this.fetchPhotonMatches(value);
      if (onlineMatches && onlineMatches.length > 0) {
        const merged = [...localMatches];
        const seenNames = new Set(localMatches.map(m => normalizeTurkish(m.name)));

        onlineMatches.forEach(o => {
          const norm = normalizeTurkish(o.name);
          if (!seenNames.has(norm) || o.subtitle.includes(',')) {
            seenNames.add(norm + '|' + o.subtitle);
            merged.push(o);
          }
        });

        if (merged.some(r => r.distanceKm !== null)) {
          merged.sort((a, b) => (a.distanceKm ?? 999999) - (b.distanceKm ?? 999999));
        }

        this.currentSuggestions = merged;
        this.renderDropdown(index, merged, inputEl, false);
      }
    }, 240);
  },

  selectItem(index, itemIdx) {
    const item = this.currentSuggestions ? this.currentSuggestions[itemIdx] : null;
    if (!item) return;

    selectWaypointSuggestion(index, item.fullName || item.name, item.lat, item.lon);
    showToast(`Hedef seçildi: ${item.name} 🎯`, 'success');
  }
};

window.RotamSearchEngine = RotamSearchEngine;

function handleWaypointFocus(index, value, inputEl) {
  RotamSearchEngine.activeTargetIndex = index;
  RotamSearchEngine.activeInputEl = inputEl;

  if (value && value.trim().length >= 2) {
    RotamSearchEngine.triggerSearch(index, value, inputEl);
  } else {
    // Kutu boşken popüler keşif noktalarını ve filtreleri aç
    const recs = RotamSearchEngine.getExploreRecommendations(RotamSearchEngine.activeFilter);
    RotamSearchEngine.currentSuggestions = recs;
    RotamSearchEngine.renderDropdown(index, recs, inputEl, true);
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

  if (value && value.trim().length >= 2) {
    RotamSearchEngine.triggerSearch(index, value, inputEl);
  } else {
    const recs = RotamSearchEngine.getExploreRecommendations(RotamSearchEngine.activeFilter);
    RotamSearchEngine.currentSuggestions = recs;
    RotamSearchEngine.renderDropdown(index, recs, inputEl, true);
  }
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

  if (index === 0) {
    const heroStart = document.getElementById('hero-start-input');
    if (heroStart) heroStart.value = name;
  } else if (index === state.waypoints.length - 1) {
    const heroEnd = document.getElementById('hero-end-input');
    if (heroEnd) heroEnd.value = name;
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
  state.activePoiCategories.clear();
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
  document.getElementById('badge-header-poi-count')?.classList.add('hidden');

  // Keşif & Akış paneli ve tetikleyicilerini anasayfada tamamen gizle
  closeRightPanel();
  const toggleBtn = document.getElementById('btn-toggle-right-panel');
  if (toggleBtn) {
    toggleBtn.classList.add('hidden');
    toggleBtn.classList.remove('flex');
  }
  const navStreamBtn = document.getElementById('nav-btn-stream');
  if (navStreamBtn) {
    navStreamBtn.classList.add('hidden');
    navStreamBtn.classList.remove('flex');
  }

  dismissQuickPlacePreview();
  updatePoiCategoryFilterUI();
  renderCorridorPoiMarkers();
  renderCorridorPoiList();
  generateSmartStopRecommendations(null);
  renderJourneyTimeline();
}

// Waypoint Map Click & Markers
async function handleMapClick(lat, lon) {
  const friendlyName = findNearestCityOrPlace(lat, lon);

  // Admin coordinate picking mode (Mekan veya Yol Tehlikesi)
  if (state.adminCoordPickTarget) {
    const target = state.adminCoordPickTarget;
    state.adminCoordPickTarget = null;
    const latFormatted = Number(lat).toFixed(4);
    const lonFormatted = Number(lon).toFixed(4);

    if (target === 'place') {
      const latEl = document.getElementById('admin-place-lat');
      const lonEl = document.getElementById('admin-place-lon');
      const cityEl = document.getElementById('admin-place-city');
      const formEl = document.getElementById('admin-add-form');
      if (latEl) latEl.value = latFormatted;
      if (lonEl) lonEl.value = lonFormatted;
      if (cityEl && !cityEl.value) cityEl.value = friendlyName;
      if (formEl) formEl.classList.remove('hidden');
      openAdminModal(true);
      switchAdminTab('places');
      showToast(`Mekan konumu seçildi: ${friendlyName} (${latFormatted}, ${lonFormatted}) 📍`, 'success');
    } else if (target === 'hazard') {
      const latEl = document.getElementById('admin-hazard-lat');
      const lonEl = document.getElementById('admin-hazard-lon');
      const formEl = document.getElementById('admin-hazard-form');
      if (latEl) latEl.value = latFormatted;
      if (lonEl) lonEl.value = lonFormatted;
      if (formEl) formEl.classList.remove('hidden');
      openAdminModal(true);
      switchAdminTab('hazards');
      showToast(`Tehlike konumu seçildi: (${latFormatted}, ${lonFormatted}) ⚠️`, 'success');
    }
    return;
  }

  // 0. Explicit map pick mode
  if (state.mapPickTargetIndex !== null && state.mapPickTargetIndex !== undefined) {
    const targetIdx = state.mapPickTargetIndex;
    state.mapPickTargetIndex = null;
    state.waypoints[targetIdx].lat = lat;
    state.waypoints[targetIdx].lon = lon;
    state.waypoints[targetIdx].name = friendlyName;
    if (targetIdx === 0) {
      const heroInp = document.getElementById('hero-start-input');
      if (heroInp) heroInp.value = friendlyName;
    } else if (targetIdx === state.waypoints.length - 1) {
      const heroInp = document.getElementById('hero-end-input');
      if (heroInp) heroInp.value = friendlyName;
    }
    updateWaypointsListUI();
    updateWaypointMarkers();
    showToast(`Nokta belirlendi: ${friendlyName} 📍`, 'success');
    const valid = state.waypoints.filter(w => w.lat !== null && w.lon !== null);
    if (valid.length >= 2) calculateRouteMain();
    return;
  }

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

    // Record Real Telemetry for Route Calculation & Distance
    if (typeof RotamTelemetry !== 'undefined') {
      RotamTelemetry.recordRoute(validPoints, activeRoute);
    }

    // Refresh community hazard markers for new route corridor
    if (typeof RotamCommunity !== 'undefined') {
      RotamCommunity.renderOnMap();
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

    // Keşif & Akış Sekmeleri: Sadece rota oluşturulunca aktifleşir, anasayfada yer kaplamaz
    const toggleBtn = document.getElementById('btn-toggle-right-panel');
    if (toggleBtn && (!window.LiveNavigation || !window.LiveNavigation.isActive)) {
      toggleBtn.classList.remove('hidden');
      toggleBtn.classList.add('flex');
    }
    const navStreamBtn = document.getElementById('nav-btn-stream');
    if (navStreamBtn) {
      navStreamBtn.classList.remove('hidden');
      navStreamBtn.classList.add('flex');
    }

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

  // 1. If in Camper mode: Calculate Safe Truck/Camper Route via Valhalla first!
  if (state.currentVehicle === 'camper') {
    try {
      const valCamper = await fetchValhallaRoute(points, 'camper');
      if (valCamper) {
        const cp = state.camperProfile || CAMPER_PRESETS.alcove;
        const camperTitle = cp.title_short || 'Karavan';
        results.push({
          id: 'valhalla-camper-safe',
          title: `🛡️ ${camperTitle} Güvenli (${Number(cp.height).toFixed(2)}m Köprü / ${Number(cp.length).toFixed(1)}m Boy)`,
          type: 'camper-safe',
          distance: valCamper.distance,
          duration: valCamper.duration,
          geometry: valCamper.geometry,
          source: 'valhalla'
        });
      }
    } catch (e) {
      console.warn('Valhalla camper route fetch error:', e);
    }
  }

  // 2. OSRM with alternatives=true
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&alternatives=true&steps=true`;
    const res = await fetchWithTimeout(osrmUrl, {}, 12000);
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        data.routes.forEach((r, idx) => {
          let title = idx === 0 ? '⚡ Hızlı (Ana Rota)' : `🌄 Alternatif ${idx + 1}`;
          let type = idx === 0 ? 'fastest' : 'scenic';
          if (state.currentVehicle === 'camper') {
            title = idx === 0 ? '⚡ Standart Araç Rotası' : `🌄 Alternatif Rota ${idx + 1}`;
          }
          const steps = r.legs ? r.legs.flatMap(l => l.steps || []) : [];
          results.push({
            id: `osrm-${idx}`,
            title: title,
            type: type,
            distance: r.distance,
            duration: r.duration,
            geometry: r.geometry,
            steps: steps,
            source: 'osrm'
          });
        });
      }
    }
  } catch (e) {
    console.warn('OSRM multi-route fetch error:', e);
  }

  // 3. Valhalla for Winding / Scenic if applicable (for Motorcycle & Car)
  if (state.currentVehicle !== 'camper') {
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
  }

  // Deduplicate routes with identical distance (+- 2 km)
  const unique = [];
  results.forEach(r => {
    const exists = unique.some(u => Math.abs(u.distance - r.distance) < 2000);
    if (!exists) unique.push(r);
  });

  // Add ROTAM ÖNERİYOR (Recommended) badge if we have multiple options
  if (unique.length > 1) {
    if (state.currentVehicle === 'camper' && unique[0].id === 'valhalla-camper-safe') {
      unique[0].title = '⭐ ROTAM Karavan Önerisi';
      unique[0].type = 'recommended';
    } else {
      unique[0].title = '⭐ ROTAM Öneriyor';
      unique[0].type = 'recommended';
    }
  }

  return unique;
}

// Valhalla Route Engine
async function fetchValhallaRoute(points, profile) {
  const costingMap = {
    car: 'auto',
    motorcycle: 'motorcycle',
    camper: 'truck',
    bicycle: 'bicycle',
    walk: 'pedestrian'
  };

  let costing = costingMap[state.currentVehicle] || 'auto';
  let costingOptions = {};

  if (state.currentVehicle === 'camper' || profile === 'camper') {
    costing = 'truck';
    const cp = state.camperProfile || CAMPER_PRESETS.alcove;
    costingOptions = {
      truck: {
        height: parseFloat(cp.height) || 3.10,
        width: parseFloat(cp.width) || 2.35,
        length: parseFloat(cp.length) || 6.80,
        weight: parseFloat(cp.weight) || 3.50,
        use_highways: cp.preferWideRoads ? 0.9 : 0.6,
        use_tolls: 0.8,
        use_primary: cp.preferWideRoads ? 0.9 : 0.6,
        hazmat: false
      }
    };
  } else if (costing === 'motorcycle') {
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
  if (typeof RotamCommunity !== 'undefined') {
    RotamCommunity.renderOnMap();
  }
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

  // Route Mode Badge in Cockpit
  const modeBadge = document.getElementById('route-badge-mode');
  if (modeBadge) {
    if (state.currentVehicle === 'camper') {
      modeBadge.textContent = '🚐 KARAVAN GÜVENLİ';
      modeBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30';
    } else if (state.currentVehicle === 'motorcycle') {
      modeBadge.textContent = '🏍️ VİRAJLI SÜRÜŞ';
      modeBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-bold bg-brand-500/20 text-brand-400 border border-brand-500/30';
    } else {
      modeBadge.textContent = 'STANDART';
      modeBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-700/40 text-slate-300 border border-slate-700';
    }
  }

  // Trigger Camper Safety Assessment
  if (state.currentVehicle === 'camper') {
    updateCamperSafetyUI(route);
  } else {
    document.getElementById('camper-safety-report')?.classList.add('hidden');
  }
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

  // Rota oluşturulduğunda keşif filtreleri otomatik olarak aktif hale getirilir
  const ALL_POI_CATEGORIES = [
    'historic', 'nature', 'photography', 'beach', 'gastronomy', 'cafe',
    'fuel', 'ev_charge', 'camping', 'viewpoint', 'mountain_pass'
  ];
  ALL_POI_CATEGORIES.forEach(cat => state.activePoiCategories.add(cat));

  const coords = route.geometry.coordinates;
  const found = [];
  const counts = {
    historic: 0,
    nature: 0,
    camping: 0,
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

      if (cat === 'camping') {
        counts.camping++;
      } else if (cat === 'nature') {
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
    camping: document.getElementById('count-pill-camping'),
    photography: document.getElementById('count-pill-photography'),
    beach: document.getElementById('count-pill-beach'),
    gastronomy: document.getElementById('count-pill-gastronomy'),
    fuel: document.getElementById('count-pill-fuel')
  };

  if (countPills.historic) countPills.historic.textContent = counts.historic;
  if (countPills.nature) countPills.nature.textContent = counts.nature;
  if (countPills.camping) countPills.camping.textContent = counts.camping;
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

// Quick Place Preview State
let currentPreviewPlace = null;

function showQuickPlacePreview(place) {
  if (!place) return;
  currentPreviewPlace = place;
  const card = document.getElementById('quick-place-preview-card');
  if (!card) return;

  const cfg = CATEGORY_CONFIG[place.category] || CATEGORY_CONFIG.historic;
  const isEn = window.state && window.state.lang === 'en';

  const emojiEl = document.getElementById('quick-preview-emoji');
  if (emojiEl) emojiEl.textContent = cfg.emoji;

  const catEl = document.getElementById('quick-preview-category');
  if (catEl) catEl.textContent = getCategoryTitle(place.category);

  const badgeEl = document.getElementById('quick-preview-badge');
  if (badgeEl) {
    badgeEl.style.borderColor = `${cfg.color}60`;
    badgeEl.style.color = cfg.color;
  }

  const distEl = document.getElementById('quick-preview-distance');
  if (distEl) {
    if (place.distKm !== undefined) {
      distEl.textContent = isEn ? `Detour ${place.distKm} km` : `Rotadan ${place.distKm} km`;
    } else {
      distEl.textContent = place.city || place.region || (isEn ? 'Turkey' : 'Türkiye');
    }
  }

  const titleEl = document.getElementById('quick-preview-title');
  if (titleEl) titleEl.textContent = place.name;

  const descEl = document.getElementById('quick-preview-desc');
  if (descEl) {
    descEl.textContent = place.description || (isEn ? 'Tap to view full details, photos and best travel season.' : 'Ayrıntılı bilgi, fotoğraflar ve en iyi ziyaret zamanı için dokunun.');
  }

  card.classList.remove('hidden');
  requestAnimationFrame(() => {
    card.classList.add('preview-visible');
  });

  if (typeof initIcons === 'function') initIcons();
}

function dismissQuickPlacePreview() {
  const card = document.getElementById('quick-place-preview-card');
  if (!card) return;
  card.classList.remove('preview-visible');
  setTimeout(() => {
    if (!card.classList.contains('preview-visible')) {
      card.classList.add('hidden');
    }
  }, 250);
}

function openPlaceDetailFromQuickPreview() {
  if (currentPreviewPlace && currentPreviewPlace.id) {
    openPlaceDetailById(currentPreviewPlace.id);
  }
}

function addQuickPreviewToRoute() {
  if (currentPreviewPlace) {
    addPoiToRoute(currentPreviewPlace.lat, currentPreviewPlace.lon, currentPreviewPlace.name);
    dismissQuickPlacePreview();
  }
}

function setQuickPreviewDestination() {
  if (currentPreviewPlace) {
    setAsDestination(currentPreviewPlace.lat, currentPreviewPlace.lon, currentPreviewPlace.name);
    dismissQuickPlacePreview();
  }
}

function setPlaceAsDestination(id) {
  const place = state.allPlaces.find(p => p.id === id);
  if (!place) return;
  setAsDestination(place.lat, place.lon, place.name);
}

// Render POI Markers on Leaflet Map (Corridor if route active, or all places if free browsing)
function renderCorridorPoiMarkers() {
  clearPoiMarkers();
  if (!map) return;

  const placesToRender = (state.routeData && state.corridorPois && state.corridorPois.length > 0)
    ? state.corridorPois
    : (state.allPlaces || []);

  const isEn = window.state && window.state.lang === 'en';

  placesToRender.forEach(p => {
    const cat = p.category || 'historic';
    if (!state.activePoiCategories.has(cat)) return;

    const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.historic;
    const pinClass = cfg.pinClass || 'pin-historic';

    const icon = L.divIcon({
      className: 'custom-poi-marker',
      html: `
        <div class="custom-pin ${pinClass} w-7 h-7 text-xs flex items-center justify-center shadow-lg cursor-pointer" title="${escapeHtml(p.name)}">
          <span>${cfg.emoji}</span>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const marker = L.marker([p.lat, p.lon], { icon }).addTo(map);

    const distBadge = p.distKm !== undefined
      ? `<span class="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">${isEn ? `Rotadan ${p.distKm} km` : `Rotadan ${p.distKm} km`}</span>`
      : `<span class="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">${escapeHtml(p.city || p.region || (isEn ? 'Turkey' : 'Türkiye'))}</span>`;

    marker.bindPopup(`
      <div class="text-xs p-1 min-w-[210px] max-w-[280px]">
        <div class="flex items-center justify-between mb-1.5 gap-2">
          <strong style="color:${cfg.color}" class="font-bold flex items-center gap-1 truncate">
            <span>${cfg.emoji}</span>
            <span class="truncate">${getCategoryTitle(p.category)}</span>
          </strong>
          ${distBadge}
        </div>
        <p class="font-black text-white text-sm mt-0.5 leading-snug">${escapeHtml(p.name)}</p>
        ${p.description ? `<p class="text-[11px] text-slate-300 mt-1 leading-relaxed line-clamp-3">${escapeHtml(p.description)}</p>` : ''}
        <div class="flex flex-col space-y-1.5 mt-2.5 pt-2 border-t border-slate-800">
          <button onclick="openPlaceDetailById(${p.id})" class="w-full text-xs bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white py-2 px-3 rounded-xl font-bold shadow-md shadow-amber-500/25 flex items-center justify-center space-x-1.5 active:scale-95 transition-all">
            <span>ℹ️ ${isEn ? 'View All Details' : 'Tüm Ayrıntıları Gör'}</span>
          </button>
          <div class="flex items-center space-x-1.5">
            <button onclick="addPlaceByIdToRoute(${p.id})" class="flex-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 py-1.5 px-2 rounded-lg font-semibold active:scale-95 transition-all text-center">
              + ${isEn ? 'Add Route' : 'Rotaya Ekle'}
            </button>
            <button onclick="setPlaceAsDestination(${p.id})" class="flex-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 py-1.5 px-2 rounded-lg font-semibold active:scale-95 transition-all text-center">
              🎯 ${isEn ? 'Go Here' : 'Hedefe Git'}
            </button>
          </div>
        </div>
      </div>
    `);

    marker.on('click', () => {
      showQuickPlacePreview(p);
    });

    state.poiMarkers.push(marker);
  });
}

function clearPoiMarkers() {
  state.poiMarkers.forEach(m => {
    if (map) map.removeLayer(m);
  });
  state.poiMarkers = [];
}

// Update Filter Pill Active/Inactive Visual States & Live Counts
function updatePoiCategoryFilterUI() {
  const isRouteActive = Boolean(state.routeData && state.corridorPois && state.corridorPois.length > 0);
  const dataSource = isRouteActive ? state.corridorPois : (state.allPlaces || []);

  const groupCounts = {
    historic: 0,
    nature: 0,
    camping: 0,
    photography: 0,
    beach: 0,
    gastronomy: 0,
    fuel: 0
  };

  dataSource.forEach(p => {
    const cat = p.category || 'historic';
    if (cat === 'camping') {
      groupCounts.camping++;
    } else if (cat === 'nature') {
      groupCounts.nature++;
    } else if (cat === 'photography' || cat === 'viewpoint' || cat === 'mountain_pass') {
      groupCounts.photography++;
    } else if (cat === 'gastronomy' || cat === 'cafe') {
      groupCounts.gastronomy++;
    } else if (cat === 'fuel' || cat === 'ev_charge') {
      groupCounts.fuel++;
    } else if (cat === 'beach') {
      groupCounts.beach++;
    } else {
      groupCounts.historic++;
    }
  });

  let totalActive = 0;
  const allGroupKeys = Object.keys(CATEGORY_GROUPS);

  allGroupKeys.forEach(key => {
    const primary = CATEGORY_GROUPS[key][0];
    const isActive = state.activePoiCategories.has(primary);
    if (isActive) totalActive += groupCounts[key];

    // Right panel pill
    const rightBtn = document.getElementById(`filter-pill-${key}`);
    const rightCount = document.getElementById(`count-pill-${key}`);
    if (rightCount) rightCount.textContent = groupCounts[key];
    if (rightBtn) {
      if (isActive) {
        rightBtn.classList.remove('opacity-40', 'border-slate-900', 'bg-slate-950/40');
        rightBtn.classList.add('opacity-100', 'border-slate-800', 'bg-slate-950');
      } else {
        rightBtn.classList.remove('opacity-100', 'border-slate-800', 'bg-slate-950');
        rightBtn.classList.add('opacity-40', 'border-slate-900', 'bg-slate-950/40');
      }
    }

    // Map floating category pill
    const mapBtn = document.getElementById(`map-pill-${key}`);
    const mapCount = document.getElementById(`map-count-${key}`);
    if (mapCount) mapCount.textContent = groupCounts[key];
    if (mapBtn) {
      if (isActive) {
        mapBtn.classList.add('active');
      } else {
        mapBtn.classList.remove('active');
      }
    }
  });

  // Master All Toggle button
  const toggleAllBtn = document.getElementById('map-filter-toggle-all');
  const toggleAllCount = document.getElementById('map-filter-total-count');
  const toggleAllLabel = document.getElementById('map-filter-all-label');

  const anyActive = allGroupKeys.some(k => state.activePoiCategories.has(CATEGORY_GROUPS[k][0]));
  const allActive = allGroupKeys.every(k => state.activePoiCategories.has(CATEGORY_GROUPS[k][0]));
  const isEn = window.state && window.state.lang === 'en';

  if (toggleAllCount) {
    toggleAllCount.textContent = isRouteActive ? `${totalActive}/${dataSource.length}` : `${totalActive}`;
  }

  if (toggleAllBtn) {
    if (anyActive) {
      toggleAllBtn.classList.add('active');
    } else {
      toggleAllBtn.classList.remove('active');
    }
  }

  if (toggleAllLabel) {
    toggleAllLabel.textContent = allActive ? (isEn ? 'All' : 'Tümü') : (isEn ? 'Filters' : 'Filtreler');
  }

  // Kompakt Harita Filtre Butonu Rozeti ve Başlığı
  const activeCount = allGroupKeys.filter(k => state.activePoiCategories.has(CATEGORY_GROUPS[k][0])).length;
  const collapseBadge = document.getElementById('map-filter-active-count-badge');
  const collapseTitle = document.getElementById('map-filter-collapse-title');

  if (collapseBadge) {
    if (!isRouteActive && activeCount === 0) {
      collapseBadge.textContent = isEn ? 'Off' : 'Kapalı';
      collapseBadge.className = 'px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-400 font-bold border border-slate-700';
    } else if (activeCount === allGroupKeys.length) {
      collapseBadge.textContent = isEn ? 'All' : 'Tümü';
      collapseBadge.className = 'px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-500/30';
    } else if (activeCount === 0) {
      collapseBadge.textContent = isEn ? 'Off' : 'Kapalı';
      collapseBadge.className = 'px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-400 font-bold border border-slate-700';
    } else {
      collapseBadge.textContent = `${activeCount}`;
      collapseBadge.className = 'px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/25 text-amber-300 font-bold border border-amber-500/30';
    }
  }

  if (collapseTitle) {
    collapseTitle.textContent = isEn ? 'Filters' : 'Filtreler';
  }

  // Sağ Keşif Paneli Filtre Özeti
  const sidebarSummary = document.getElementById('sidebar-filter-active-summary');
  if (sidebarSummary) {
    if (!isRouteActive && activeCount === 0) {
      sidebarSummary.textContent = isEn ? 'Waiting Route' : 'Rota Bekleniyor';
    } else {
      sidebarSummary.textContent = activeCount === allGroupKeys.length ? (isEn ? 'All Active' : 'Tümü Aktif') : `${activeCount} Aktif`;
    }
  }
}

// Harita Üzerindeki Kategori Filtre Çubuğunu Katla / Genişlet (Collapse / Expand)
function toggleMapFilterBarCollapse() {
  const container = document.getElementById('map-filter-pills-container');
  const chevron = document.getElementById('map-filter-collapse-chevron');
  const btn = document.getElementById('map-filter-toggle-collapse-btn');
  if (!container) return;

  const isCollapsed = container.classList.contains('hidden');
  if (isCollapsed) {
    container.classList.remove('hidden');
    if (chevron) chevron.setAttribute('data-lucide', 'chevron-left');
    if (btn) btn.classList.add('border-amber-500/50', 'bg-slate-900');
    localStorage.setItem('rotam_filter_bar_collapsed', 'false');
  } else {
    container.classList.add('hidden');
    if (chevron) chevron.setAttribute('data-lucide', 'chevron-right');
    if (btn) btn.classList.remove('border-amber-500/50', 'bg-slate-900');
    localStorage.setItem('rotam_filter_bar_collapsed', 'true');
  }
  if (typeof initIcons === 'function') initIcons();
}

// Filtre Çubuğunun Başlangıç Durumunu Yükle (Mobilde varsayılan olarak katlanmış başlar)
function initMapFilterBarState() {
  const container = document.getElementById('map-filter-pills-container');
  const chevron = document.getElementById('map-filter-collapse-chevron');
  const btn = document.getElementById('map-filter-toggle-collapse-btn');
  if (!container) return;

  const saved = localStorage.getItem('rotam_filter_bar_collapsed');
  const shouldCollapse = saved === 'true' || (saved === null && window.innerWidth < 768);

  if (shouldCollapse) {
    container.classList.add('hidden');
    if (chevron) chevron.setAttribute('data-lucide', 'chevron-right');
    if (btn) btn.classList.remove('border-amber-500/50', 'bg-slate-900');
  } else {
    container.classList.remove('hidden');
    if (chevron) chevron.setAttribute('data-lucide', 'chevron-left');
    if (btn) btn.classList.add('border-amber-500/50', 'bg-slate-900');
  }
  if (typeof initIcons === 'function') initIcons();
}

window.toggleMapFilterBarCollapse = toggleMapFilterBarCollapse;
window.initMapFilterBarState = initMapFilterBarState;

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

// Toggle All Categories On or Off
function toggleAllPoiCategories() {
  const allGroupKeys = Object.keys(CATEGORY_GROUPS);
  const allActive = allGroupKeys.every(k => {
    const primary = CATEGORY_GROUPS[k][0];
    return state.activePoiCategories.has(primary);
  });

  const isEn = window.state && window.state.lang === 'en';

  if (allActive) {
    state.activePoiCategories.clear();
    showToast(isEn ? 'All categories turned off' : 'Tüm kategoriler kapatıldı', 'info');
  } else {
    allGroupKeys.forEach(k => {
      CATEGORY_GROUPS[k].forEach(cat => state.activePoiCategories.add(cat));
    });
    showToast(isEn ? 'All categories turned on' : 'Tüm kategoriler açıldı', 'info');
  }

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
  if (toggleBtn) {
    if ((!window.LiveNavigation || !window.LiveNavigation.isActive) && state.routeData) {
      toggleBtn.classList.remove('hidden');
      toggleBtn.classList.add('flex');
    } else {
      toggleBtn.classList.add('hidden');
      toggleBtn.classList.remove('flex');
    }
  }
  if (navBtn) {
    navBtn.classList.remove('bg-slate-800', 'text-white', 'border', 'border-amber-500/40');
    navBtn.classList.add('text-slate-300');
    if (!state.routeData) {
      navBtn.classList.add('hidden');
      navBtn.classList.remove('flex');
    }
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

// ESC tuşu ile açık olan sağ paneli kapatma
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const rightPanel = document.getElementById('right-panel');
    if (rightPanel && !rightPanel.classList.contains('hidden')) {
      closeRightPanel();
    }
  }
});

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
    let maxSlopeAscent = 0;
    let maxSlopeDescent = 0;
    let steepSlopeSegments = 0;
    const slopeData = [];

    for (let i = 1; i < elevations.length; i++) {
      const diff = elevations[i] - elevations[i - 1];
      if (diff > 0) totalAscent += diff;

      const p1 = samplePoints[i - 1];
      const p2 = samplePoints[i];
      const dMeters = haversineMeters(p1[1], p1[0], p2[1], p2[0]);
      const slope = dMeters > 25 ? Math.round((diff / dMeters) * 100) : 0;

      if (slope > maxSlopeAscent) maxSlopeAscent = slope;
      if (slope < maxSlopeDescent) maxSlopeDescent = slope;
      if (Math.abs(slope) >= (state.camperProfile?.maxSlopeWarning || 8)) {
        steepSlopeSegments++;
      }
      slopeData.push({
        index: i,
        coord: [p2[1], p2[0]],
        slopePct: slope,
        elev: elevations[i]
      });
    }

    state.camperSlopeAnalysis = {
      maxAscentPct: Math.min(30, Math.max(0, maxSlopeAscent)),
      maxDescentPct: Math.min(30, Math.max(0, Math.abs(maxSlopeDescent))),
      maxSlope: Math.min(30, Math.max(maxSlopeAscent, Math.abs(maxSlopeDescent))),
      steepSegments: steepSlopeSegments,
      slopeData: slopeData
    };

    document.getElementById('stat-elevation').textContent = `+${Math.round(totalAscent)} m`;
    document.getElementById('elevation-max').textContent = `${Math.round(Math.max(...elevations))} m`;
    document.getElementById('elevation-min').textContent = `${Math.round(Math.min(...elevations))} m`;

    state.elevationData = samplePoints.map((pt, idx) => ({
      coord: [pt[1], pt[0]],
      elev: elevations[idx] || 0
    }));

    if (state.currentVehicle === 'camper') {
      updateCamperSafetyUI(state.routeData);
    }

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
      let hoverText = `Rakım: ${Math.round(point.elev)}m`;
      if (state.camperSlopeAnalysis?.slopeData && state.camperSlopeAnalysis.slopeData[index - 1]) {
        const s = state.camperSlopeAnalysis.slopeData[index - 1].slopePct;
        hoverText += ` • Eğim: ${s > 0 ? '+' : ''}${s}%`;
      }
      document.getElementById('elevation-hover-info').textContent = hoverText;
      if (map) {
        if (!state.elevationHoverMarker) {
          state.elevationHoverMarker = L.circleMarker(point.coord, {
            radius: 6,
            color: '#ffffff',
            fillColor: state.currentVehicle === 'camper' ? '#f59e0b' : '#f97316',
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

  const isCamper = (state.currentVehicle === 'camper');
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  if (isCamper) {
    grad.addColorStop(0, 'rgba(245, 158, 11, 0.45)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0.03)');
  } else {
    grad.addColorStop(0, 'rgba(249, 115, 22, 0.4)');
    grad.addColorStop(1, 'rgba(249, 115, 22, 0.02)');
  }

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
  ctx.strokeStyle = isCamper ? '#f59e0b' : '#f97316';
  ctx.lineWidth = 2;
  ctx.stroke();

  // If Camper has steep slope, draw small badge in canvas
  if (isCamper && state.camperSlopeAnalysis && state.camperSlopeAnalysis.maxSlope >= 8) {
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(`⚠️ Maks Eğim: %${state.camperSlopeAnalysis.maxSlope}`, Math.max(10, w - 125), 16);
  }
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

function getAllPresetRoutes() {
  let custom = [];
  try {
    const raw = localStorage.getItem('rotam_custom_presets');
    if (raw) custom = JSON.parse(raw);
  } catch (e) {}
  return [...custom, ...PRESET_ROUTES];
}

function renderPresetsList(containerId = 'presets-routes-container', categoryTag = 'all', searchQuery = '') {
  const container = document.getElementById(containerId);
  if (!container) return;

  let filtered = getAllPresetRoutes();
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
  const preset = getAllPresetRoutes().find(p => p.id === presetId);
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
  const tabs = ['places', 'presets', 'hazards', 'analytics', 'system', 'backup'];
  tabs.forEach(tName => {
    const tabEl = document.getElementById(`admin-tab-${tName}`);
    const btnEl = document.getElementById(`admin-tab-btn-${tName}`);
    if (tabEl) {
      if (tName === tab) {
        tabEl.classList.remove('hidden');
        tabEl.classList.add('flex');
      } else {
        tabEl.classList.add('hidden');
        tabEl.classList.remove('flex');
      }
    }
    if (btnEl) {
      if (tName === tab) {
        btnEl.className = 'px-3 py-1 rounded-lg font-semibold bg-cyan-600 text-white shadow-sm';
      } else {
        btnEl.className = 'px-3 py-1 rounded-lg font-semibold text-slate-400 hover:text-white';
      }
    }
  });

  if (tab === 'places') {
    renderAdminPlacesList();
  } else if (tab === 'presets') {
    renderAdminPresetsList();
  } else if (tab === 'hazards') {
    renderAdminHazardsList();
  } else if (tab === 'analytics') {
    RotamTelemetry.renderAdminUI();
  } else if (tab === 'system') {
    checkStorageQuota();
    if (typeof RotamTraffic !== 'undefined') {
      RotamTraffic.renderAdminUI();
    }
  }
  updateAdminStats();
  initIcons();
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

let _logoTapCount = 0;
let _logoTapTimer = null;
function handleLogoAdminClick(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  _logoTapCount++;
  clearTimeout(_logoTapTimer);
  _logoTapTimer = setTimeout(() => {
    _logoTapCount = 0;
  }, 2200);

  if (_logoTapCount >= 5) {
    clearTimeout(_logoTapTimer);
    _logoTapCount = 0;
    try {
      if ('vibrate' in navigator) navigator.vibrate([50, 50, 100]);
    } catch (err) {}
    openAdminModal();
  } else if (_logoTapCount === 1) {
    if (typeof showHomepagePlanner === 'function') {
      showHomepagePlanner();
    }
  }
}
window.handleLogoAdminClick = handleLogoAdminClick;

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
    if (typeof RotamCommunity !== 'undefined') {
      RotamCommunity.renderOnMap();
    }
    showToast('Yetkili giriş başarılı! Tüm Türkiye noktaları yönetici modunda açıldı.', 'success');
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
  if (typeof RotamCommunity !== 'undefined') {
    RotamCommunity.renderOnMap();
  }
  showToast('Yönetici oturumu kapatıldı. Harita standart sürücü moduna geçti.', 'info');
}

// Şifre Değiştirme Modalı
function openChangeAdminPasswordModal() {
  const modal = document.getElementById('modal-admin-change-pass');
  if (!modal) return;
  const oldInp = document.getElementById('admin-old-pass-input');
  const newInp = document.getElementById('admin-new-pass-input');
  const repInp = document.getElementById('admin-new-pass-repeat');
  const errEl = document.getElementById('admin-change-pass-error');
  if (oldInp) oldInp.value = '';
  if (newInp) newInp.value = '';
  if (repInp) repInp.value = '';
  if (errEl) errEl.classList.add('hidden');
  modal.classList.remove('hidden');
  if (oldInp) setTimeout(() => oldInp.focus(), 100);
  initIcons();
}

function closeChangeAdminPasswordModal() {
  const modal = document.getElementById('modal-admin-change-pass');
  if (modal) modal.classList.add('hidden');
}

function handleAdminChangePasswordSubmit(event) {
  if (event && event.preventDefault) event.preventDefault();
  const oldInp = document.getElementById('admin-old-pass-input');
  const newInp = document.getElementById('admin-new-pass-input');
  const repInp = document.getElementById('admin-new-pass-repeat');
  const errEl = document.getElementById('admin-change-pass-error');
  const errTxt = document.getElementById('admin-change-pass-error-text');

  let currentPass = ADMIN_CONFIG.DEFAULT_PASS;
  try {
    const saved = localStorage.getItem(ADMIN_CONFIG.PASS_KEY);
    if (saved && saved.trim()) currentPass = saved.trim();
  } catch (e) {}

  const oldVal = (oldInp ? oldInp.value : '').trim();
  const newVal = (newInp ? newInp.value : '').trim();
  const repVal = (repInp ? repInp.value : '').trim();

  if (oldVal !== currentPass) {
    if (errEl) errEl.classList.remove('hidden');
    if (errTxt) errTxt.textContent = 'Mevcut şifre hatalı!';
    return;
  }

  if (newVal.length < 4) {
    if (errEl) errEl.classList.remove('hidden');
    if (errTxt) errTxt.textContent = 'Yeni şifre en az 4 karakter olmalıdır!';
    return;
  }

  if (newVal !== repVal) {
    if (errEl) errEl.classList.remove('hidden');
    if (errTxt) errTxt.textContent = 'Yeni şifreler birbiriyle eşleşmiyor!';
    return;
  }

  try {
    localStorage.setItem(ADMIN_CONFIG.PASS_KEY, newVal);
    closeChangeAdminPasswordModal();
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
    SESSION_FLAG: 'rotam_session_logged',
    VEHICLE_MOTO: 'rotam_telemetry_veh_moto',
    VEHICLE_CAR: 'rotam_telemetry_veh_car',
    VEHICLE_CAMPER: 'rotam_telemetry_veh_camper',
    VEHICLE_BIKE: 'rotam_telemetry_veh_bike',
    TOTAL_KM: 'rotam_telemetry_total_km',
    TOTAL_MINS: 'rotam_telemetry_total_mins',
    CALC_COUNT: 'rotam_telemetry_calc_count'
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

  recordVehicle(vehicle) {
    try {
      let key = this.KEYS.VEHICLE_MOTO;
      if (vehicle === 'car') key = this.KEYS.VEHICLE_CAR;
      else if (vehicle === 'camper') key = this.KEYS.VEHICLE_CAMPER;
      else if (vehicle === 'bicycle') key = this.KEYS.VEHICLE_BIKE;

      const current = parseInt(localStorage.getItem(key) || '0', 10) + 1;
      localStorage.setItem(key, String(current));
    } catch (e) {}
  },

  recordRoute(validPoints, activeRoute) {
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

      // Record Distance & Duration aggregates
      if (activeRoute && typeof activeRoute.distance === 'number') {
        const distKm = Math.round(activeRoute.distance / 1000);
        const durMins = Math.round((activeRoute.duration || 0) / 60);

        const totalKm = parseFloat(localStorage.getItem(this.KEYS.TOTAL_KM) || '0') + distKm;
        const totalMins = parseFloat(localStorage.getItem(this.KEYS.TOTAL_MINS) || '0') + durMins;
        const calcCount = parseInt(localStorage.getItem(this.KEYS.CALC_COUNT) || '0', 10) + 1;

        localStorage.setItem(this.KEYS.TOTAL_KM, String(totalKm));
        localStorage.setItem(this.KEYS.TOTAL_MINS, String(totalMins));
        localStorage.setItem(this.KEYS.CALC_COUNT, String(calcCount));
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
    let vehicles = { moto: 0, car: 0, camper: 0, bike: 0 };
    let routeMetrics = { avgKm: 0, avgMins: 0, totalKm: 0 };

    try {
      totalVisits = parseInt(localStorage.getItem(this.KEYS.TOTAL_VISITS) || '0', 10);
      todayVisits = parseInt(localStorage.getItem(this.getTodayKey()) || '0', 10);
      routesCount = parseInt(localStorage.getItem(this.KEYS.ROUTES_COUNT) || '0', 10);
      stopsCount = parseInt(localStorage.getItem(this.KEYS.STOPS_COUNT) || '0', 10);

      const m = parseInt(localStorage.getItem(this.KEYS.DEVICE_MOBILE) || '0', 10);
      const d = parseInt(localStorage.getItem(this.KEYS.DEVICE_DESKTOP) || '0', 10);
      const tab = parseInt(localStorage.getItem(this.KEYS.DEVICE_TABLET) || '0', 10);
      devices = { mobile: m, desktop: d, tablet: tab };

      // Vehicles
      const vMoto = parseInt(localStorage.getItem(this.KEYS.VEHICLE_MOTO) || '0', 10);
      const vCar = parseInt(localStorage.getItem(this.KEYS.VEHICLE_CAR) || '0', 10);
      const vCamper = parseInt(localStorage.getItem(this.KEYS.VEHICLE_CAMPER) || '0', 10);
      const vBike = parseInt(localStorage.getItem(this.KEYS.VEHICLE_BIKE) || '0', 10);
      vehicles = { moto: vMoto, car: vCar, camper: vCamper, bike: vBike };

      // Aggregates
      const totalKm = parseFloat(localStorage.getItem(this.KEYS.TOTAL_KM) || '0');
      const totalMins = parseFloat(localStorage.getItem(this.KEYS.TOTAL_MINS) || '0');
      const calcCount = parseInt(localStorage.getItem(this.KEYS.CALC_COUNT) || '0', 10);

      if (calcCount > 0) {
        routeMetrics = {
          avgKm: Math.round(totalKm / calcCount),
          avgMins: Math.round(totalMins / calcCount),
          totalKm: Math.round(totalKm)
        };
      }

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

    const totalVeh = vehicles.moto + vehicles.car + vehicles.camper + vehicles.bike;
    const motoPct = totalVeh > 0 ? Math.round((vehicles.moto / totalVeh) * 100) : 0;
    const carPct = totalVeh > 0 ? Math.round((vehicles.car / totalVeh) * 100) : 0;
    const camperPct = totalVeh > 0 ? Math.round((vehicles.camper / totalVeh) * 100) : 0;
    const bikePct = totalVeh > 0 ? Math.max(0, 100 - motoPct - carPct - camperPct) : 0;

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
      },
      vehicles: {
        moto: vehicles.moto,
        car: vehicles.car,
        camper: vehicles.camper,
        bike: vehicles.bike,
        motoPct,
        carPct,
        camperPct,
        bikePct
      },
      routeMetrics
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

    // Vehicle breakdown
    const veh = stats.vehicles;
    const vMotoEl = document.getElementById('analytics-vehicle-moto');
    const vMotoBar = document.getElementById('analytics-vehicle-moto-bar');
    if (vMotoEl) vMotoEl.textContent = `${veh.motoPct}% (${veh.moto})`;
    if (vMotoBar) vMotoBar.style.width = `${veh.motoPct}%`;

    const vCarEl = document.getElementById('analytics-vehicle-car');
    const vCarBar = document.getElementById('analytics-vehicle-car-bar');
    if (vCarEl) vCarEl.textContent = `${veh.carPct}% (${veh.car})`;
    if (vCarBar) vCarBar.style.width = `${veh.carPct}%`;

    const vCamperEl = document.getElementById('analytics-vehicle-camper');
    const vCamperBar = document.getElementById('analytics-vehicle-camper-bar');
    if (vCamperEl) vCamperEl.textContent = `${veh.camperPct}% (${veh.camper})`;
    if (vCamperBar) vCamperBar.style.width = `${veh.camperPct}%`;

    const vBikeEl = document.getElementById('analytics-vehicle-bike');
    const vBikeBar = document.getElementById('analytics-vehicle-bike-bar');
    if (vBikeEl) vBikeEl.textContent = `${veh.bikePct}% (${veh.bike})`;
    if (vBikeBar) vBikeBar.style.width = `${veh.bikePct}%`;

    // Route Metrics
    const avgDistEl = document.getElementById('analytics-avg-distance');
    const avgDurEl = document.getElementById('analytics-avg-duration');
    const totKmEl = document.getElementById('analytics-total-km');
    if (avgDistEl) avgDistEl.textContent = stats.routeMetrics.avgKm > 0 ? `${stats.routeMetrics.avgKm} km` : '-- km';
    if (avgDurEl) {
      const m = stats.routeMetrics.avgMins;
      const hrs = Math.floor(m / 60);
      const rem = m % 60;
      avgDurEl.textContent = m > 0 ? (hrs > 0 ? `${hrs}s ${rem}d` : `${rem} dk`) : '-- sa';
    }
    if (totKmEl) totKmEl.textContent = stats.routeMetrics.totalKm > 0 ? `${stats.routeMetrics.totalKm.toLocaleString('tr-TR')} km` : '-- km';

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
        localStorage.removeItem(this.KEYS.VEHICLE_MOTO);
        localStorage.removeItem(this.KEYS.VEHICLE_CAR);
        localStorage.removeItem(this.KEYS.VEHICLE_CAMPER);
        localStorage.removeItem(this.KEYS.VEHICLE_BIKE);
        localStorage.removeItem(this.KEYS.TOTAL_KM);
        localStorage.removeItem(this.KEYS.TOTAL_MINS);
        localStorage.removeItem(this.KEYS.CALC_COUNT);
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

  // Presets count
  const allPresets = (typeof getAllPresetRoutes === 'function') ? getAllPresetRoutes() : PRESET_ROUTES;
  let customPresets = [];
  try {
    const raw = localStorage.getItem('rotam_custom_presets');
    if (raw) customPresets = JSON.parse(raw);
  } catch (e) {}
  const totPresetsEl = document.getElementById('admin-stat-presets-total');
  const custPresetsEl = document.getElementById('admin-stat-presets-custom');
  const sysPresetsEl = document.getElementById('admin-stat-presets-system');
  if (totPresetsEl) totPresetsEl.textContent = allPresets.length;
  if (custPresetsEl) custPresetsEl.textContent = customPresets.length;
  if (sysPresetsEl) sysPresetsEl.textContent = PRESET_ROUTES.length;

  // Hazards count
  if (typeof RotamCommunity !== 'undefined' && RotamCommunity.incidents) {
    const incidents = RotamCommunity.incidents;
    const totHazardsEl = document.getElementById('admin-stat-hazards-total');
    const radEl = document.getElementById('admin-stat-hazards-radar');
    const wrkEl = document.getElementById('admin-stat-hazards-work');
    const crsEl = document.getElementById('admin-stat-hazards-crash');
    if (totHazardsEl) totHazardsEl.textContent = incidents.length;
    if (radEl) radEl.textContent = incidents.filter(i => i.type === 'radar').length;
    if (wrkEl) wrkEl.textContent = incidents.filter(i => i.type === 'work').length;
    if (crsEl) crsEl.textContent = incidents.filter(i => i.type === 'crash').length;
  }

  // Render Real Telemetry Metrics
  RotamTelemetry.renderAdminUI();
}

// ==========================================
// MEKAN YÖNETİMİ & DÜZENLEME (TAB 1)
// ==========================================
function toggleAdminAddForm() {
  const form = document.getElementById('admin-add-form');
  if (!form) return;
  const isHidden = form.classList.contains('hidden');
  if (isHidden) {
    // Reset to create mode
    const idInp = document.getElementById('admin-edit-place-id');
    const heading = document.getElementById('admin-form-heading');
    const saveBtn = document.getElementById('admin-place-save-btn');
    if (idInp) idInp.value = '';
    if (heading) heading.innerHTML = '<span>📍</span> <span>Yeni Keşif Noktası Ekle</span>';
    if (saveBtn) saveBtn.textContent = 'Kaydet';

    ['admin-place-name', 'admin-place-lat', 'admin-place-lon', 'admin-place-city', 'admin-place-img', 'admin-place-tags', 'admin-place-desc'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    form.classList.remove('hidden');
  } else {
    form.classList.add('hidden');
  }
}

function editAdminPlace(id) {
  const place = state.allPlaces.find(p => p.id === id);
  if (!place) return;
  const form = document.getElementById('admin-add-form');
  const heading = document.getElementById('admin-form-heading');
  const saveBtn = document.getElementById('admin-place-save-btn');
  const idInp = document.getElementById('admin-edit-place-id');

  if (idInp) idInp.value = place.id;
  if (heading) heading.innerHTML = '<span>✏️</span> <span>Mekanı Düzenle</span>';
  if (saveBtn) saveBtn.textContent = 'Güncellemeyi Kaydet';

  const nameEl = document.getElementById('admin-place-name');
  const catEl = document.getElementById('admin-place-cat');
  const latEl = document.getElementById('admin-place-lat');
  const lonEl = document.getElementById('admin-place-lon');
  const cityEl = document.getElementById('admin-place-city');
  const imgEl = document.getElementById('admin-place-img');
  const tagsEl = document.getElementById('admin-place-tags');
  const descEl = document.getElementById('admin-place-desc');

  if (nameEl) nameEl.value = place.name || '';
  if (catEl) catEl.value = place.category || 'historic';
  if (latEl) latEl.value = place.lat || '';
  if (lonEl) lonEl.value = place.lon || '';
  if (cityEl) cityEl.value = place.city || '';
  if (imgEl) imgEl.value = place.image_url || '';
  if (tagsEl) tagsEl.value = Array.isArray(place.tags) ? place.tags.join(', ') : (place.tags || '');
  if (descEl) descEl.value = place.description || '';

  if (form) form.classList.remove('hidden');
  form?.scrollIntoView({ behavior: 'smooth' });
}

function pickPlaceCoordOnMap() {
  state.adminCoordPickTarget = 'place';
  closeAdminModal();
  showToast('Haritada bir konuma tıklayarak koordinatları seçin 📍', 'info');
}

function submitAdminNewPlace() {
  const idInp = document.getElementById('admin-edit-place-id');
  const isEdit = idInp && idInp.value && idInp.value.trim() !== '';
  const editId = isEdit ? (isNaN(idInp.value) ? idInp.value : Number(idInp.value)) : null;

  const name = document.getElementById('admin-place-name')?.value.trim();
  const cat = document.getElementById('admin-place-cat')?.value || 'historic';
  const lat = parseFloat(document.getElementById('admin-place-lat')?.value);
  const lon = parseFloat(document.getElementById('admin-place-lon')?.value);
  const city = document.getElementById('admin-place-city')?.value.trim();
  const imgUrl = document.getElementById('admin-place-img')?.value.trim();
  const tagsRaw = document.getElementById('admin-place-tags')?.value.trim();
  const desc = document.getElementById('admin-place-desc')?.value.trim();

  if (!name || isNaN(lat) || isNaN(lon)) {
    showToast('Lütfen mekan adı, enlem ve boylam değerlerini eksiksiz girin.', 'warning');
    return;
  }

  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  let custom = [];
  try {
    const raw = localStorage.getItem('rotam_custom_places');
    if (raw) custom = JSON.parse(raw);
  } catch (e) {}

  if (isEdit) {
    const placeIdx = state.allPlaces.findIndex(p => p.id === editId);
    if (placeIdx >= 0) {
      state.allPlaces[placeIdx] = {
        ...state.allPlaces[placeIdx],
        name,
        category: cat,
        lat,
        lon,
        city: city || state.allPlaces[placeIdx].city,
        image_url: imgUrl || undefined,
        tags: tags.length ? tags : undefined,
        description: desc
      };
    }
    // Also update custom storage
    const customIdx = custom.findIndex(p => p.id === editId);
    if (customIdx >= 0) {
      custom[customIdx] = { ...state.allPlaces[placeIdx] };
    } else if (placeIdx >= 0) {
      custom.push({ ...state.allPlaces[placeIdx] });
    }
    localStorage.setItem('rotam_custom_places', JSON.stringify(custom));
    showToast(`"${name}" mekan bilgileri güncellendi!`, 'success');
  } else {
    const newPlace = {
      id: Date.now(),
      name,
      category: cat,
      lat,
      lon,
      city: city || 'Türkiye',
      image_url: imgUrl || undefined,
      tags: tags.length ? tags : undefined,
      description: desc,
      rating: 4.8,
      recommended_duration: '1 saat'
    };
    state.allPlaces.push(newPlace);
    custom.push(newPlace);
    localStorage.setItem('rotam_custom_places', JSON.stringify(custom));
    showToast('Yeni mekan başarıyla eklendi!', 'success');
  }

  updateAdminStats();
  renderAdminPlacesList();
  toggleAdminAddForm();
}

function renderAdminPlacesList() {
  const container = document.getElementById('admin-places-list');
  const search = document.getElementById('admin-search-input')?.value.toLowerCase().trim() || '';
  const filterCat = document.getElementById('admin-filter-category')?.value || 'all';
  const filterOrigin = document.getElementById('admin-filter-origin')?.value || 'all';
  if (!container) return;

  let customIds = new Set();
  try {
    const raw = localStorage.getItem('rotam_custom_places');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) arr.forEach(p => customIds.add(p.id));
    }
  } catch (e) {}

  let filtered = state.allPlaces.filter(p => {
    if (search) {
      const matchName = (p.name || '').toLowerCase().includes(search);
      const matchCity = (p.city || '').toLowerCase().includes(search);
      const matchDesc = (p.description || '').toLowerCase().includes(search);
      if (!matchName && !matchCity && !matchDesc) return false;
    }
    if (filterCat !== 'all' && p.category !== filterCat) return false;
    if (filterOrigin === 'custom' && !customIds.has(p.id)) return false;
    if (filterOrigin === 'default' && customIds.has(p.id)) return false;
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-slate-500 text-xs">
        <i data-lucide="map-pin-off" class="w-8 h-8 text-slate-600 mx-auto mb-1.5"></i>
        <p>Arama kriterlerinize uygun mekan bulunamadı.</p>
      </div>
    `;
    initIcons();
    return;
  }

  container.innerHTML = filtered.slice(0, 60).map(p => {
    const cfg = CATEGORY_CONFIG[p.category] || CATEGORY_CONFIG.historic;
    const isCustom = customIds.has(p.id);
    return `
      <div class="glass-card p-3 rounded-xl border border-slate-800/80 hover:border-slate-700 bg-slate-900/80 flex items-center justify-between text-xs gap-2 transition-all">
        <div class="min-w-0 flex-1">
          <div class="flex items-center space-x-1.5 flex-wrap">
            <span class="text-sm">${cfg.emoji || '📍'}</span>
            <span class="font-bold text-white truncate max-w-[200px] sm:max-w-[280px]" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</span>
            <span class="text-[10px] text-slate-400">(${escapeHtml(p.city || '-')})</span>
            ${isCustom ? '<span class="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded-full font-bold">Özel</span>' : '<span class="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded-full">Sistem</span>'}
          </div>
          <p class="text-[11px] text-slate-400 truncate mt-0.5">${escapeHtml(p.description || (p.lat + ', ' + p.lon))}</p>
        </div>
        <div class="flex items-center space-x-1 shrink-0">
          <button onclick="focusPlaceOnMapFromAdmin(${p.id})" class="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors" title="Haritada Odaklan">
            <i data-lucide="map-pin" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="editAdminPlace(${p.id})" class="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors" title="Düzenle">
            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="deleteAdminPlace(${p.id})" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors" title="Sil">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

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
  showToast('Mekan silindi.', 'info');
}

function focusPlaceOnMapFromAdmin(id) {
  const place = state.allPlaces.find(p => p.id === id);
  if (!place || !map) return;
  closeAdminModal();
  map.setView([place.lat, place.lon], 15, { animate: true });
  showToast(`${place.name} haritada odaklandı 📍`, 'info');
  setTimeout(() => {
    if (typeof openPlaceDetailById === 'function') openPlaceDetailById(id);
  }, 300);
}

// ==========================================
// HAZIR ROTALAR YÖNETİMİ (TAB 2)
// ==========================================
function renderAdminPresetsList() {
  const container = document.getElementById('admin-presets-list');
  if (!container) return;

  const allPresets = (typeof getAllPresetRoutes === 'function') ? getAllPresetRoutes() : PRESET_ROUTES;
  let custom = [];
  try {
    const raw = localStorage.getItem('rotam_custom_presets');
    if (raw) custom = JSON.parse(raw);
  } catch (e) {}
  const customIds = new Set(custom.map(p => p.id));

  // Update counts in header
  const totEl = document.getElementById('admin-stat-presets-total');
  const custEl = document.getElementById('admin-stat-presets-custom');
  const sysEl = document.getElementById('admin-stat-presets-system');
  if (totEl) totEl.textContent = allPresets.length;
  if (custEl) custEl.textContent = custom.length;
  if (sysEl) sysEl.textContent = PRESET_ROUTES.length;

  if (allPresets.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-slate-500 text-xs">
        <i data-lucide="route" class="w-8 h-8 text-slate-600 mx-auto mb-1.5"></i>
        <p>Kayıtlı hazır rota bulunmuyor.</p>
      </div>
    `;
    initIcons();
    return;
  }

  container.innerHTML = allPresets.map(preset => {
    const isCustom = customIds.has(preset.id);
    return `
      <div class="glass-card p-3 rounded-xl border border-slate-800/80 hover:border-slate-700 bg-slate-900/80 flex items-center justify-between text-xs gap-2 transition-all">
        <div class="min-w-0 flex-1">
          <div class="flex items-center space-x-1.5 flex-wrap">
            <span class="font-bold text-white truncate max-w-[220px] sm:max-w-[320px]">${escapeHtml(preset.title)}</span>
            <span class="text-[10px] text-amber-400 font-semibold">• ${preset.distanceKm} km</span>
            <span class="text-[10px] text-slate-400">• ${escapeHtml(preset.durationText || '')}</span>
            ${isCustom ? '<span class="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded-full font-bold">Özel Rota</span>' : '<span class="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-bold">Sistem Şablonu</span>'}
          </div>
          <p class="text-[11px] text-slate-400 truncate mt-0.5">${escapeHtml(preset.description || '')}</p>
          <div class="flex items-center space-x-1 text-[10px] text-slate-500 mt-1">
            <span>Duraklar (${preset.points?.length || 0}):</span>
            <span class="truncate text-slate-300 font-mono">${(preset.points || []).map(p => p.name).join(' → ')}</span>
          </div>
        </div>
        <div class="flex items-center space-x-1.5 shrink-0">
          <button onclick="loadPresetRoute('${preset.id}'); closeAdminModal();" class="px-2.5 py-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 text-[11px] font-bold flex items-center space-x-1 transition-all">
            <i data-lucide="play" class="w-3 h-3"></i>
            <span>Yükle</span>
          </button>
          ${isCustom ? `
            <button onclick="deleteAdminPreset('${preset.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors" title="Sil">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  initIcons();
}

function toggleAdminPresetForm() {
  document.getElementById('admin-preset-form')?.classList.toggle('hidden');
}

function importActiveRouteAsPreset() {
  const validPoints = (state.waypoints || []).filter(w => w.lat !== null && w.lon !== null);
  if (validPoints.length < 2) {
    showToast('Haritada aktif bir rota bulunmuyor. Önce başlangıç ve varış noktalarını belirleyin.', 'warning');
    return;
  }

  const form = document.getElementById('admin-preset-form');
  if (form) form.classList.remove('hidden');

  const startName = validPoints[0].name || 'Başlangıç';
  const endName = validPoints[validPoints.length - 1].name || 'Varış';
  const autoTitle = `${startName} → ${endName} Rotası`;

  const titleInp = document.getElementById('admin-preset-title');
  const catInp = document.getElementById('admin-preset-cat');
  const distInp = document.getElementById('admin-preset-dist');
  const durInp = document.getElementById('admin-preset-dur');
  const descInp = document.getElementById('admin-preset-desc');
  const ptsInp = document.getElementById('admin-preset-points');

  if (titleInp) titleInp.value = autoTitle;
  if (catInp) catInp.value = state.currentVehicle === 'motorcycle' ? 'Viraj & Manzara' : state.currentVehicle === 'camper' ? 'Karavan & Doğa' : 'Panoramik Sürüş';

  if (state.routeData) {
    if (distInp) distInp.value = Math.round(state.routeData.distance / 1000);
    const hrs = Math.floor(state.routeData.duration / 3600);
    const mins = Math.round((state.routeData.duration % 3600) / 60);
    if (durInp) durInp.value = hrs > 0 ? `${hrs} saat ${mins} dk` : `${mins} dk`;
  } else {
    if (distInp) distInp.value = 120;
    if (durInp) durInp.value = '2 saat';
  }

  if (descInp) descInp.value = `${startName} noktasından ${endName} varışına uzanan özel sürüş ve keşif rotası.`;

  if (ptsInp) {
    ptsInp.value = validPoints.map(p => `${p.name || 'Nokta'}, ${Number(p.lat).toFixed(4)}, ${Number(p.lon).toFixed(4)}`).join('\n');
  }

  showToast('Aktif harita rotası şablon formuna aktarıldı! 🚀', 'success');
}

function submitAdminPreset() {
  const title = document.getElementById('admin-preset-title')?.value.trim();
  const category = document.getElementById('admin-preset-cat')?.value.trim() || 'Özel Rota';
  const difficulty = document.getElementById('admin-preset-diff')?.value || 'Orta / Dinamik';
  const distanceKm = parseInt(document.getElementById('admin-preset-dist')?.value, 10) || 100;
  const durationText = document.getElementById('admin-preset-dur')?.value.trim() || '2 saat';
  const description = document.getElementById('admin-preset-desc')?.value.trim() || '';
  const pointsText = document.getElementById('admin-preset-points')?.value.trim() || '';

  if (!title || !pointsText) {
    showToast('Lütfen rota başlığını ve en az iki durağı eksiksiz girin.', 'warning');
    return;
  }

  const lines = pointsText.split('\n').map(l => l.trim()).filter(Boolean);
  const points = [];
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length >= 3) {
      const name = parts[0].trim();
      const lat = parseFloat(parts[1].trim());
      const lon = parseFloat(parts[2].trim());
      if (!isNaN(lat) && !isNaN(lon)) {
        points.push({ name, lat, lon });
      }
    }
  }

  if (points.length < 2) {
    showToast('Hata: Duraklar satır formatında olmalıdır (Örn: Kaş, 36.20, 29.64). En az 2 durak gereklidir.', 'warning');
    return;
  }

  const newPreset = {
    id: 'preset_custom_' + Date.now(),
    title,
    category,
    tag: 'custom',
    description: description || `${title} gezi rotası.`,
    difficulty,
    twistiness: 85,
    distanceKm,
    durationText,
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    points
  };

  let custom = [];
  try {
    const raw = localStorage.getItem('rotam_custom_presets');
    if (raw) custom = JSON.parse(raw);
  } catch (e) {}

  custom.push(newPreset);
  localStorage.setItem('rotam_custom_presets', JSON.stringify(custom));

  toggleAdminPresetForm();
  renderAdminPresetsList();
  showToast(`"${title}" hazır rotası başarıyla eklendi!`, 'success');
}

function deleteAdminPreset(id) {
  if (!confirm('Bu özel hazır rotayı silmek istediğinize emin misiniz?')) return;
  try {
    const raw = localStorage.getItem('rotam_custom_presets');
    if (raw) {
      let custom = JSON.parse(raw);
      custom = custom.filter(p => p.id !== id);
      localStorage.setItem('rotam_custom_presets', JSON.stringify(custom));
      renderAdminPresetsList();
      showToast('Hazır rota silindi.', 'info');
    }
  } catch (e) {
    showToast('Silme işlemi başarısız.', 'error');
  }
}

// ==========================================
// YOL BİLDİRİMLERİ & MODERASYON (TAB 3)
// ==========================================
function renderAdminHazardsList() {
  initFirebaseAdminUI();
  const container = document.getElementById('admin-hazards-list');
  if (!container) return;

  const incidents = (typeof RotamCommunity !== 'undefined' && RotamCommunity.incidents) ? RotamCommunity.incidents : [];

  // Update counts
  const totEl = document.getElementById('admin-stat-hazards-total');
  const radEl = document.getElementById('admin-stat-hazards-radar');
  const wrkEl = document.getElementById('admin-stat-hazards-work');
  const crsEl = document.getElementById('admin-stat-hazards-crash');

  if (totEl) totEl.textContent = incidents.length;
  if (radEl) radEl.textContent = incidents.filter(i => i.type === 'radar').length;
  if (wrkEl) wrkEl.textContent = incidents.filter(i => i.type === 'work').length;
  if (crsEl) crsEl.textContent = incidents.filter(i => i.type === 'crash').length;

  if (incidents.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-slate-500 text-xs">
        <i data-lucide="check-circle" class="w-8 h-8 text-emerald-500/50 mx-auto mb-1.5"></i>
        <p>Şu anda aktif yol tehlikesi bildirimi bulunmuyor. Yollar temiz!</p>
      </div>
    `;
    initIcons();
    return;
  }

  const now = Date.now();
  container.innerHTML = incidents.map(inc => {
    const remainingMins = Math.max(0, Math.round((inc.expiresAt - now) / 60000));
    const isOfficial = !!inc.isOfficial;
    return `
      <div class="glass-card p-3 rounded-xl border border-slate-800/80 hover:border-slate-700 bg-slate-900/80 flex items-center justify-between text-xs gap-2 transition-all">
        <div class="min-w-0 flex-1">
          <div class="flex items-center space-x-1.5 flex-wrap">
            <span class="text-sm">${inc.emoji || '⚠️'}</span>
            <span class="font-bold text-white truncate max-w-[220px]">${escapeHtml(inc.title || 'Yol Bildirimi')}</span>
            ${isOfficial ? '<span class="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 rounded-full font-bold">Resmi Uyarı</span>' : '<span class="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-full font-bold">Kullanıcı Bildirimi</span>'}
            <span class="text-[10px] text-slate-400">👍 ${inc.upvotes || 0} onay</span>
          </div>
          <p class="text-[11px] text-slate-300 truncate mt-0.5 font-medium">${escapeHtml(inc.note || (inc.lat.toFixed(4) + ', ' + inc.lon.toFixed(4)))}</p>
          <div class="flex items-center space-x-2 text-[10px] text-slate-500 mt-1">
            <span>Kalan Süre: <strong class="text-slate-300 font-mono">${remainingMins} dk</strong></span>
            <span>•</span>
            <span class="font-mono">${Number(inc.lat).toFixed(4)}, ${Number(inc.lon).toFixed(4)}</span>
          </div>
        </div>
        <div class="flex items-center space-x-1 shrink-0">
          <button onclick="focusHazardOnMapFromAdmin(${inc.lat}, ${inc.lon})" class="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors" title="Haritada Odaklan">
            <i data-lucide="map-pin" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="upvoteAdminHazard('${inc.id}')" class="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center space-x-1 transition-all" title="Yönetici Olarak Onayla">
            <i data-lucide="check" class="w-3 h-3"></i>
            <span>Onayla</span>
          </button>
          <button onclick="deleteAdminHazard('${inc.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors" title="Sil">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  initIcons();
}

function toggleAdminHazardForm() {
  document.getElementById('admin-hazard-form')?.classList.toggle('hidden');
}

function submitAdminHazard() {
  const type = document.getElementById('admin-hazard-type')?.value || 'radar';
  const durationHours = parseInt(document.getElementById('admin-hazard-duration')?.value, 10) || 3;
  const lat = parseFloat(document.getElementById('admin-hazard-lat')?.value);
  const lon = parseFloat(document.getElementById('admin-hazard-lon')?.value);
  const note = document.getElementById('admin-hazard-note')?.value.trim();

  if (isNaN(lat) || isNaN(lon)) {
    showToast('Lütfen geçerli enlem ve boylam koordinatı girin.', 'warning');
    return;
  }

  const typeConfig = {
    radar: { title: 'Radar / Polis Kontrolü', emoji: '🚔' },
    work: { title: 'Yol Çalışması & Asfalt', emoji: '🚧' },
    crash: { title: 'Trafik Kazası', emoji: '💥' },
    oil: { title: 'Kaygan Zemin / Yağ Sızıntısı', emoji: '⚠️' },
    hazard: { title: 'Yol Kapalı / Engel', emoji: '🛑' }
  };
  const cfg = typeConfig[type] || typeConfig.radar;
  const now = Date.now();

  const officialIncident = {
    id: 'official_' + now + '_' + Math.random().toString(36).substr(2, 6),
    type,
    title: cfg.title,
    emoji: cfg.emoji,
    lat,
    lon,
    reportedAt: now,
    expiresAt: now + (durationHours * 60 * 60 * 1000),
    upvotes: 20,
    downvotes: 0,
    isOfficial: true,
    note: note || 'Resmi Yönetici Uyarısı'
  };

  if (typeof RotamCommunity !== 'undefined') {
    RotamCommunity.incidents.unshift(officialIncident);
    RotamCommunity.saveLocal();
    RotamCommunity.renderOnMap();
  }

  toggleAdminHazardForm();
  renderAdminHazardsList();
  showToast('Resmi yol uyarısı haritada yayınlandı! 🚨', 'success');
}

function upvoteAdminHazard(id) {
  if (typeof RotamCommunity !== 'undefined') {
    const inc = RotamCommunity.incidents.find(i => i.id === id);
    if (inc) {
      inc.upvotes = (inc.upvotes || 0) + 10;
      inc.downvotes = 0;
      inc.isOfficial = true;
      RotamCommunity.saveLocal();
      RotamCommunity.renderOnMap();
      renderAdminHazardsList();
      showToast('Bildirim onaylandı ve güvenilirliği yükseltildi! 👍', 'success');
    }
  }
}

function deleteAdminHazard(id) {
  if (typeof RotamCommunity !== 'undefined') {
    RotamCommunity.incidents = RotamCommunity.incidents.filter(i => i.id !== id);
    RotamCommunity.saveLocal();
    RotamCommunity.renderOnMap();
    if (typeof RotamCommunity.deleteRemoteIncident === 'function') {
      RotamCommunity.deleteRemoteIncident(id);
    }
    renderAdminHazardsList();
    showToast('Yol bildirimi kaldırıldı.', 'info');
  }
}

function focusHazardOnMapFromAdmin(lat, lon) {
  if (!map) return;
  closeAdminModal();
  map.setView([lat, lon], 15, { animate: true });
  showToast('Tehlike konumu haritada gösteriliyor 📍', 'info');
}

function pickHazardCoordOnMap() {
  state.adminCoordPickTarget = 'hazard';
  closeAdminModal();
  showToast('Haritada tehlike konumuna tıklayın ⚠️', 'info');
}

// Firebase Canlı Senkronizasyon Yapılandırması (Admin)
function toggleFirebaseHelpGuide() {
  document.getElementById('firebase-help-guide')?.classList.toggle('hidden');
}

// Firebase URL Temizleme & Akıllı Çözümleme Yardımcısı
function sanitizeFirebaseDbUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let url = raw.trim().replace(/^["']|["']$/g, '');
  if (!url) return '';

  // 1. Firebase Console URL tespiti (Örn: console.firebase.google.com/project/rotam-live/database/rotam-live-default-rtdb/rules)
  const dbMatch = url.match(/database\/([a-zA-Z0-9_\-]+)/i);
  if (dbMatch && dbMatch[1]) {
    return `https://${dbMatch[1]}.firebaseio.com`;
  }
  const projMatch = url.match(/console\.firebase\.google\.com\/(?:u\/\d+\/)?project\/([a-zA-Z0-9_\-]+)/i);
  if (projMatch && projMatch[1]) {
    return `https://${projMatch[1]}-default-rtdb.firebaseio.com`;
  }

  // 2. Eksik protokol tamamlama (https://)
  if (!/^https?:\/\//i.test(url)) {
    if (url.includes('.')) {
      url = 'https://' + url;
    } else {
      url = `https://${url}.firebaseio.com`;
    }
  } else if (url.startsWith('http://')) {
    url = 'https://' + url.slice(7);
  }

  // 3. Alt yolları temizleme (/rules, /data, /incidents, /incidents.json vb.)
  url = url.replace(/\/+$/, '');
  const subpaths = ['/rules.json', '/rules', '/data.json', '/data', '/incidents.json', '/incidents'];
  for (const sp of subpaths) {
    if (url.toLowerCase().endsWith(sp)) {
      url = url.slice(0, -sp.length);
    }
  }
  url = url.replace(/\/+$/, '');

  // 4. Bölgesel yanlış yönlendirme düzeltme (rotam-live europe-west1 -> firebaseio.com)
  if (url.includes('rotam-live-default-rtdb.europe-west1.firebasedatabase.app')) {
    url = 'https://rotam-live-default-rtdb.firebaseio.com';
  }

  return url;
}

function copyFirebaseRulesToClipboard() {
  const rules = '{\n  "rules": {\n    "incidents": {\n      ".read": true,\n      ".write": true\n    }\n  }\n}';
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(rules).then(() => {
      showToast('Firebase kuralları panoya kopyalandı! 📋', 'success');
    }).catch(() => {
      prompt('Lütfen aşağıdaki kuralları kopyalayın:', rules);
    });
  } else {
    prompt('Lütfen aşağıdaki kuralları kopyalayın:', rules);
  }
}

function fillDefaultFirebaseUrl() {
  const urlInp = document.getElementById('admin-firebase-url');
  if (urlInp) {
    urlInp.value = 'https://rotam-live-default-rtdb.firebaseio.com';
    testAndSaveFirebaseEndpoint();
  }
}

function initFirebaseAdminUI() {
  const urlInp = document.getElementById('admin-firebase-url');
  const badge = document.getElementById('firebase-sync-badge');
  const msg = document.getElementById('firebase-sync-status-msg');
  if (!urlInp || !badge) return;

  let currentEp = '';
  try {
    currentEp = localStorage.getItem('rotam_firebase_endpoint') || '';
  } catch (e) {}

  if (!currentEp && typeof RotamCommunity !== 'undefined' && RotamCommunity.getRawEndpoint) {
    currentEp = RotamCommunity.getRawEndpoint();
  }
  if (!currentEp) {
    currentEp = 'https://rotam-live-default-rtdb.firebaseio.com';
  }

  currentEp = sanitizeFirebaseDbUrl(currentEp);
  urlInp.value = currentEp;

  if (currentEp && !currentEp.includes('rotam-community-live-default-rtdb')) {
    badge.textContent = '🟢 Aktif / Bağlı';
    badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono';
    if (msg) msg.textContent = 'Canlı bulut akışı aktif! Yeni yol uyarıları tüm sürücülerin ekranına SSE ile anında yansır.';
  } else {
    badge.textContent = '🟡 Yapılandırma Bekleniyor';
    badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono';
    if (msg) msg.textContent = 'Tüm sürücülerin birbirini anında (1 saniyede) görmesi için Firebase Realtime Database URL\'nizi bağlayın.';
  }
}

async function testAndSaveFirebaseEndpoint() {
  const urlInp = document.getElementById('admin-firebase-url');
  const badge = document.getElementById('firebase-sync-badge');
  const msg = document.getElementById('firebase-sync-status-msg');
  if (!urlInp) return;

  let rawUrl = (urlInp.value || '').trim();
  if (!rawUrl) {
    localStorage.removeItem('rotam_firebase_endpoint');
    showToast('Firebase adresi kaldırıldı. Yalnızca yerel mod aktif.', 'info');
    initFirebaseAdminUI();
    return;
  }

  // Akıllı URL çözümleme ve otomatik formatlama
  let cleanUrl = sanitizeFirebaseDbUrl(rawUrl);
  urlInp.value = cleanUrl;

  if (badge) {
    badge.textContent = 'Test ediliyor...';
    badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 font-mono';
  }
  if (msg) {
    msg.textContent = 'Firebase veritabanına bağlanılıyor ve izinler test ediliyor...';
  }

  try {
    let testUrl = `${cleanUrl}/incidents.json`;
    let res = await fetch(testUrl, { method: 'GET', mode: 'cors' });

    // Firebase bölgesel yönlendirme ipucu (Örn: europe-west1 404 dönüp correctUrl veriyorsa)
    if (res.status === 404) {
      try {
        const errBody = await res.json();
        if (errBody && errBody.correctUrl) {
          cleanUrl = sanitizeFirebaseDbUrl(errBody.correctUrl);
          urlInp.value = cleanUrl;
          testUrl = `${cleanUrl}/incidents.json`;
          res = await fetch(testUrl, { method: 'GET', mode: 'cors' });
        }
      } catch (e) {}
    }

    if (res.ok) {
      // Okuma testi başarılı! Şimdi yazma (write) yetkisini doğrula
      let writeOk = false;
      try {
        const pingUrl = `${cleanUrl}/incidents/_ping_check.json`;
        const pingRes = await fetch(pingUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ping: true, t: Date.now() })
        });
        if (pingRes.ok) {
          writeOk = true;
          fetch(pingUrl, { method: 'DELETE' }).catch(() => {});
        }
      } catch (e) {
        writeOk = false;
      }

      localStorage.setItem('rotam_firebase_endpoint', cleanUrl);
      if (typeof RotamCommunity !== 'undefined') {
        RotamCommunity.syncCloud();
        RotamCommunity.startLiveStream();
      }

      if (writeOk) {
        if (badge) {
          badge.textContent = '🟢 Aktif (Okuma & Yazma & SSE)';
          badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono';
        }
        if (msg) msg.textContent = 'Harika! Firebase Realtime Database tam yetkiyle bağlandı. Yol uyarıları anında tüm sürücülere yansır.';
        showToast('Firebase canlı bulut bağlantısı başarılı! 🔥', 'success');
      } else {
        if (badge) {
          badge.textContent = '🟡 Kısmi Bağlantı (Yalnızca Okuma)';
          badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono';
        }
        if (msg) {
          msg.innerHTML = '<span class="text-amber-300 font-semibold">Okuma aktif, ancak yazma izni kilitli (.write: false).</span> Sürücülerin uyarı ekleyebilmesi için Firebase Rules sekmesinde <code>{ "rules": { "incidents": { ".read": true, ".write": true } } }</code> kuralını ekleyip Publish edin.';
        }
        showToast('Firebase okundu ancak yazma izni kilitli! Rules ayarını güncelleyin.', 'warning');
      }
    } else if (res.status === 401 || res.status === 403) {
      if (badge) {
        badge.textContent = '🔴 Yetki Hatası (Okuma Kilitli)';
        badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono';
      }
      if (msg) msg.textContent = 'Firebase Rules hatası! Lütfen Firebase konsolunda Realtime Database > Rules bölümünden { "rules": { "incidents": { ".read": true, ".write": true } } } kuralını ekleyip Publish edin.';
      showToast('Firebase erişim izni hatası (Rules kapalı)!', 'error');
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    if (badge) {
      badge.textContent = '🔴 Bağlantı Hatası';
      badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono';
    }
    if (msg) {
      msg.innerHTML = `Hata: ${err.message}. Lütfen doğru adresin <code>https://rotam-live-default-rtdb.firebaseio.com</code> olduğunu kontrol edin.`;
    }
    showToast('Firebase bağlantısı kurulamadı: ' + err.message, 'error');
  }
}

// ==========================================
// SİSTEM SAĞLIĞI & ÖNBELLEK DİAGNOSTİĞİ (TAB 5)
// ==========================================
async function runApiHealthChecks() {
  const apis = [
    {
      id: 'osrm',
      name: 'OSRM Rota Motoru',
      url: 'https://router.project-osrm.org/route/v1/driving/28.97,41.00;29.02,41.05?overview=false',
      dotId: 'api-dot-osrm',
      badgeId: 'api-status-osrm',
      pingId: 'api-ping-osrm'
    },
    {
      id: 'valhalla',
      name: 'Valhalla Karavan / Güvenli Rota',
      url: 'https://valhalla1.openstreetmap.de/route?json={"locations":[{"lat":41.00,"lon":28.97},{"lat":41.05,"lon":29.02}],"costing":"auto"}',
      dotId: 'api-dot-valhalla',
      badgeId: 'api-status-valhalla',
      pingId: 'api-ping-valhalla'
    },
    {
      id: 'meteo',
      name: 'Open-Meteo Canlı Hava',
      url: 'https://api.open-meteo.com/v1/forecast?latitude=41.00&longitude=28.97&current_weather=true',
      dotId: 'api-dot-meteo',
      badgeId: 'api-status-meteo',
      pingId: 'api-ping-meteo'
    },
    {
      id: 'photon',
      name: 'Photon Geocoding Arama',
      url: 'https://photon.komoot.io/api/?q=istanbul&limit=1',
      dotId: 'api-dot-photon',
      badgeId: 'api-status-photon',
      pingId: 'api-ping-photon'
    }
  ];

  if (typeof RotamTraffic !== 'undefined' && RotamTraffic.hasApiKey()) {
    apis.push({
      id: 'tomtom',
      name: 'TomTom Canlı Trafik',
      url: `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/10/586/394.png?key=${encodeURIComponent(RotamTraffic.getApiKey())}&tileSize=256`,
      dotId: 'api-dot-tomtom',
      badgeId: 'api-status-tomtom',
      pingId: 'api-ping-tomtom'
    });
  } else {
    const tomtomBadge = document.getElementById('api-status-tomtom');
    const tomtomDot = document.getElementById('api-dot-tomtom');
    const tomtomPing = document.getElementById('api-ping-tomtom');
    if (tomtomBadge) {
      tomtomBadge.textContent = 'Key Eksik';
      tomtomBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400';
    }
    if (tomtomDot) tomtomDot.className = 'w-2 h-2 rounded-full bg-slate-600';
    if (tomtomPing) tomtomPing.textContent = 'Ayarlanmadı';
  }

  for (const api of apis) {
    const dot = document.getElementById(api.dotId);
    const badge = document.getElementById(api.badgeId);
    const ping = document.getElementById(api.pingId);

    if (badge) {
      badge.textContent = 'Test ediliyor...';
      badge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400';
    }

    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(api.url, { signal: controller.signal, mode: 'cors' });
      clearTimeout(timeoutId);
      const elapsed = Math.round(performance.now() - startTime);

      if (res.ok || res.status < 500) {
        if (dot) dot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
        if (badge) {
          badge.textContent = 'Aktif';
          badge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
        }
        if (ping) ping.textContent = `${elapsed} ms`;
      } else {
        throw new Error('HTTP ' + res.status);
      }
    } catch (e) {
      const elapsed = Math.round(performance.now() - startTime);
      if (dot) dot.className = 'w-2 h-2 rounded-full bg-rose-500';
      if (badge) {
        badge.textContent = 'Yavaş / Kesik';
        badge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30';
      }
      if (ping) ping.textContent = elapsed > 5000 ? 'Zaman aşımı' : `${elapsed} ms (Hata)`;
    }
  }
}

async function checkStorageQuota() {
  const usageEl = document.getElementById('storage-usage-val');
  const quotaEl = document.getElementById('storage-quota-val');
  const badgeEl = document.getElementById('storage-quota-badge');

  if (navigator.storage && navigator.storage.estimate) {
    try {
      const { usage, quota } = await navigator.storage.estimate();
      const usageMb = (usage / (1024 * 1024)).toFixed(1);
      const quotaMb = (quota / (1024 * 1024)).toFixed(0);
      const pct = quota > 0 ? ((usage / quota) * 100).toFixed(2) : 0;

      if (usageEl) usageEl.textContent = `${usageMb} MB`;
      if (quotaEl) quotaEl.textContent = `${quotaMb} MB`;
      if (badgeEl) {
        badgeEl.textContent = `%${pct} Kullanımda`;
        badgeEl.className = 'text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold';
      }
    } catch (e) {
      if (usageEl) usageEl.textContent = 'Bilinmiyor';
    }
  } else {
    if (usageEl) usageEl.textContent = 'Tahmini ~15 MB';
    if (quotaEl) quotaEl.textContent = 'Sınırsız (Tarayıcı)';
    if (badgeEl) badgeEl.textContent = 'Aktif';
  }
}

async function clearTileCaches() {
  if (!confirm('Çevrimdışı indirilen ve önbelleğe alınan harita karolarını temizlemek istediğinize emin misiniz?')) return;
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      const tileCaches = cacheNames.filter(name => name.includes('tile') || name.includes('map'));
      await Promise.all(tileCaches.map(c => caches.delete(c)));
    }
    if (typeof indexedDB !== 'undefined') {
      try { indexedDB.deleteDatabase('rotam_tiles'); } catch (e) {}
      try { indexedDB.deleteDatabase('rotam_offline_tiles'); } catch (e) {}
    }
    checkStorageQuota();
    showToast('Harita karo önbelleği başarıyla temizlendi 🧹', 'success');
  } catch (e) {
    showToast('Önbellek temizlenemedi: ' + e.message, 'error');
  }
}

async function clearAllAppCaches() {
  if (!confirm('Tüm uygulama önbelleğini, servis çalışanı (Service Worker) kayıtlarını ve geçici verileri sıfırlamak istediğinize emin misiniz? Sayfa yeniden yüklenecektir.')) return;
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }
    showToast('Tüm önbellek sıfırlandı. Yeniden başlatılıyor...', 'info');
    setTimeout(() => {
      window.location.reload(true);
    }, 1000);
  } catch (e) {
    showToast('Sıfırlama hatası: ' + e.message, 'error');
  }
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

  // Kamp Alanı Donanım & İmkân Kartı (#place-detail-camping-card)
  const campCard = document.getElementById('place-detail-camping-card');
  if (campCard) {
    if (place.category === 'camping') {
      campCard.classList.remove('hidden');
    } else {
      campCard.classList.add('hidden');
    }
  }

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

  // Initialize TomTom Real-time Traffic Flow Engine
  if (typeof RotamTraffic !== 'undefined') {
    RotamTraffic.init();
  }

  // Restore personalized preferences (#27)
  try {
    syncCamperProfileUI();
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

function destinationPoint(lat, lon, distanceMeters, bearingDeg) {
  const R = 6371000;
  const d = distanceMeters / R;
  const brng = bearingDeg * Math.PI / 180;
  const lat1 = lat * Math.PI / 180;
  const lon1 = lon * Math.PI / 180;

  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
  const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));

  return [lat2 * 180 / Math.PI, ((lon2 * 180 / Math.PI) + 540) % 360 - 180];
}

// ==========================================
// ROTAM SESLİ YÖNLENDİRME & ANLATIM MOTORU (ROTAM SPEECH ENGINE)
// (Android Native TTS Bridge, iOS, PWA, Chrome & Web Audio Destekli)
// ==========================================
const RotamSpeech = {
  isUnlocked: false,
  activeUtterance: null,
  cachedVoices: [],
  isNativeTtsAvailable: false,
  audioCtx: null,

  init() {
    this.checkNativeBridge();
    this.setupAudioUnlock();
    this.loadVoices();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }
  },

  checkNativeBridge() {
    this.isNativeTtsAvailable = (
      typeof window.RotamNativeTTS !== 'undefined' &&
      typeof window.RotamNativeTTS.speak === 'function'
    );
  },

  setupAudioUnlock() {
    const unlocker = () => {
      this.unlockAudio();
      document.removeEventListener('touchstart', unlocker);
      document.removeEventListener('click', unlocker);
    };
    document.addEventListener('touchstart', unlocker, { passive: true });
    document.addEventListener('click', unlocker, { passive: true });
  },

  unlockAudio() {
    if (this.isUnlocked) return;
    this.isUnlocked = true;

    // 1. Prime Web Audio Context
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
      }
    } catch (e) {}

    // 2. Prime Web Speech API (Chrome Android / Safari iOS için sessiz uyandırma)
    if ('speechSynthesis' in window) {
      try {
        const prime = new SpeechSynthesisUtterance(' ');
        prime.volume = 0.01;
        prime.rate = 1.0;
        window.speechSynthesis.speak(prime);
      } catch (e) {}
    }
  },

  playNavChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.audioCtx && AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx) {
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, this.audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.12); // A5
        gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.22);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.25);
      }
    } catch (e) {}
  },

  loadVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      this.cachedVoices = window.speechSynthesis.getVoices() || [];
    } catch (e) {}
  },

  getBestVoice() {
    if (!this.cachedVoices || this.cachedVoices.length === 0) {
      this.loadVoices();
    }
    const isEn = (window.state && window.state.lang === 'en');
    const targetLang = isEn ? 'en' : 'tr';

    let voice = this.cachedVoices.find(v => v.lang === (isEn ? 'en-US' : 'tr-TR'));
    if (!voice) {
      voice = this.cachedVoices.find(v => v.lang && v.lang.toLowerCase().startsWith(targetLang));
    }
    return voice;
  },

  speak(text, options = {}) {
    if (!text || typeof text !== 'string') return;
    const cleanText = text.trim();
    if (!cleanText) return;

    if (typeof LiveNavigation !== 'undefined' && !LiveNavigation.voiceEnabled) {
      return;
    }

    // 1. Android Native TTS Engine (APK içerisinde %100 garantili ve interkom uyumlu)
    this.checkNativeBridge();
    if (this.isNativeTtsAvailable) {
      try {
        window.RotamNativeTTS.speak(cleanText);
        return;
      } catch (e) {
        console.warn('Native Android TTS error:', e);
      }
    }

    // 2. Web Speech API (Chrome Android, Safari iOS, PWA, Desktop)
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis not available');
      this.playNavChime();
      return;
    }

    try {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      const isEn = (window.state && window.state.lang === 'en');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = isEn ? 'en-US' : 'tr-TR';
      utterance.rate = options.rate || (isEn ? 1.0 : 0.98);
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = 1.0;

      const voice = this.getBestVoice();
      if (voice) {
        utterance.voice = voice;
      }

      // Android Chrome Garbage Collection hatasını önlemek için referansı sabitle
      this.activeUtterance = utterance;
      window._rotamActiveUtterance = utterance;

      utterance.onend = () => {
        this.activeUtterance = null;
        window._rotamActiveUtterance = null;
      };

      utterance.onerror = (e) => {
        console.warn('Utterance error:', e);
        this.activeUtterance = null;
        window._rotamActiveUtterance = null;
      };

      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn('SpeechSynthesis speak failed:', err);
          this.playNavChime();
        }
      }, 40);

    } catch (e) {
      console.warn('RotamSpeech error:', e);
      this.playNavChime();
    }
  },

  stop() {
    this.checkNativeBridge();
    if (this.isNativeTtsAvailable) {
      try {
        window.RotamNativeTTS.stop();
      } catch (e) {}
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    this.activeUtterance = null;
    window._rotamActiveUtterance = null;
  }
};

window.RotamSpeech = RotamSpeech;

// ==========================================
// ROTAM DISPLAY & RESPONSIVE ENGINE (MOBILE, TABLET, GLOVE & COCKPIT)
// ==========================================
const RotamDisplay = {
  isSunlightMode: false,
  isFullscreen: false,
  isTabletSidebarCollapsed: false,

  init() {
    this.setupOrientationHandler();
    this.setupTouchTargets();
    this.checkInitialOrientation();
  },

  haptic(pattern = 20) {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (e) {}
  },

  setupOrientationHandler() {
    const handleOrientation = () => {
      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      const isShort = window.innerHeight < 600;
      if (isLandscape && isShort) {
        document.body.classList.add('is-landscape');
      } else {
        document.body.classList.remove('is-landscape');
      }
      if (typeof map !== 'undefined' && map) {
        setTimeout(() => map.invalidateSize(), 150);
        setTimeout(() => map.invalidateSize(), 400);
      }
    };

    window.addEventListener('resize', handleOrientation, { passive: true });
    window.addEventListener('orientationchange', handleOrientation, { passive: true });
    handleOrientation();
  },

  checkInitialOrientation() {
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    if (isCoarse) {
      document.body.classList.add('touch-device');
    }
  },

  setupTouchTargets() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button, .gmaps-tool-btn, .mobile-map-fab, .vehicle-btn');
      if (btn) {
        this.haptic(15);
      }
    }, { passive: true });
  },

  toggleSunlightMode() {
    this.isSunlightMode = !this.isSunlightMode;
    this.haptic(30);

    const isEn = (window.state && window.state.lang === 'en');
    const statusEl = document.getElementById('mobile-sunlight-status');
    const hudSunBtn = document.getElementById('live-nav-btn-sun');

    if (this.isSunlightMode) {
      document.body.classList.add('sunlight-mode');
      if (statusEl) {
        statusEl.textContent = isEn ? 'DAY' : 'Gündüz';
        statusEl.className = 'text-[10px] text-amber-400 font-bold';
      }
      if (hudSunBtn) {
        hudSunBtn.classList.add('bg-amber-500/30', 'border-amber-400');
      }
      if (typeof switchTile === 'function') {
        switchTile('osm');
      }
      showToast(isEn ? '☀️ Day / High Contrast Mode Active' : '☀️ Gündüz / Aydınlık Mod Aktif', 'success');
    } else {
      document.body.classList.remove('sunlight-mode');
      if (statusEl) {
        statusEl.textContent = isEn ? 'NIGHT' : 'Gece';
        statusEl.className = 'text-[10px] text-slate-400 font-semibold';
      }
      if (hudSunBtn) {
        hudSunBtn.classList.remove('bg-amber-500/30', 'border-amber-400');
      }
      if (typeof switchTile === 'function') {
        switchTile('dark');
      }
      showToast(isEn ? '🌙 Night / Dark Mode Restored' : '🌙 Gece / Koyu Mod Aktif', 'info');
    }

    if (typeof map !== 'undefined' && map) {
      setTimeout(() => map.invalidateSize(), 150);
    }
  },

  async toggleFullscreen() {
    this.haptic(25);
    const isEn = (window.state && window.state.lang === 'en');
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
        this.isFullscreen = true;
        showToast(isEn ? 'Fullscreen Activated' : 'Tam Ekran Modu Açıldı ⛶', 'info');
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
        this.isFullscreen = false;
        showToast(isEn ? 'Fullscreen Exited' : 'Tam Ekrandan Çıkıldı', 'info');
      }
    } catch (e) {
      showToast(isEn ? 'Use browser menu to enter fullscreen' : 'Tam ekran için tarayıcı menüsünü kullanabilirsiniz', 'info');
    }
    if (typeof map !== 'undefined' && map) {
      setTimeout(() => map.invalidateSize(), 200);
    }
  },

  toggleTabletSidebar() {
    this.haptic(20);
    const sidebar = document.getElementById('sidebar');
    const icon = document.getElementById('icon-tablet-sidebar');
    const text = document.getElementById('text-tablet-sidebar');
    if (!sidebar) return;

    this.isTabletSidebarCollapsed = !this.isTabletSidebarCollapsed;
    const isEn = (window.state && window.state.lang === 'en');

    if (this.isTabletSidebarCollapsed) {
      sidebar.classList.add('tablet-collapsed');
      if (icon) icon.setAttribute('data-lucide', 'panel-left-open');
      if (text) text.textContent = isEn ? 'Show Menu' : 'Menüyü Aç';
      showToast(isEn ? 'Full Screen Map View' : 'Geniş Harita Görünümü 🗺️', 'info');
    } else {
      sidebar.classList.remove('tablet-collapsed');
      if (icon) icon.setAttribute('data-lucide', 'panel-left-close');
      if (text) text.textContent = isEn ? 'Hide Menu' : 'Geniş Harita';
    }

    if (typeof initIcons === 'function') initIcons();
    if (typeof map !== 'undefined' && map) {
      setTimeout(() => map.invalidateSize(), 150);
      setTimeout(() => map.invalidateSize(), 350);
    }
  }
};

window.RotamDisplay = RotamDisplay;

const LiveNavigation = {
  isActive: false,
  isSimulation: false,
  isFreeRide: false,
  wasFreeRide: false,
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
  hasCenteredOnCurrentLocation: false,
  bannerTimer: null,
  fuelBannerTimer: null,
  pendingFuelStop: null,
  startTime: null,
  maxSpeed: 0,
  speedHistory: [],
  distanceTraveledM: 0,
  lastGpsCoord: null,
  steps: [],
  currentStepIndex: 0,
  compassMode: 'heading',
  currentMapRotation: 0,
  isOverviewMode: false,
  incidentMarkers: [],
  currentSpeedLimit: 90,
  manualSpeedLimit: null,
  lastOverspeedWarningTime: 0,
  offRouteCounter: 0,
  isRerouting: false,
  isHudMirrored: false,
  audioCtx: null,

  playNavSound(type) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'turn') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880.00, now + 0.12); // A5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.36);
      } else if (type === 'overspeed') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.setValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.26);
      } else if (type === 'reroute') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.1);
        osc.frequency.setValueAtTime(659.25, now + 0.2);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.46);
      }
    } catch (e) {
      // Audio context error or not allowed yet
    }
  },

  getSpeedLimitForStep(step, streetName = '') {
    // Manuel olarak kullanıcı bir hız sınırı belirlediyse bunu koru
    if (this.manualSpeedLimit !== null && this.manualSpeedLimit !== undefined) {
      return this.manualSpeedLimit;
    }

    const vehicle = (window.state && window.state.currentVehicle) || 'motorcycle';

    // Step nesnesinde doğrudan OSM/Valhalla/OSRM'den gelen hız sınırı var mı?
    if (step && typeof step === 'object') {
      if (step.speed_limit && typeof step.speed_limit === 'number' && step.speed_limit > 0) {
        return step.speed_limit;
      }
      if (step.maxspeed && typeof step.maxspeed === 'number' && step.maxspeed > 0) {
        return step.maxspeed;
      }
      if (!streetName && step.name) {
        streetName = step.name;
      }
      if (step.ref) {
        streetName = `${streetName || ''} ${step.ref}`;
      }
    }

    const s = (streetName || '').toLowerCase();

    // 1. Yap-İşlet-Devret (YİD) Otoyolları:
    // O-7 (Kuzey Marmara), O-5 (İstanbul-İzmir / Osmangazi), O-6 (1915 Çanakkale), O-21 (Ankara-Niğde), O-33 (Menemen-Çandarlı)
    const isYIDMotorway = /\b(o-?7|o-?5|o-?6|o-?21|o-?33)\b/i.test(s) ||
      s.includes('kuzey marmara') || s.includes('osmangazi') || s.includes('çanakkale otoyol') || s.includes('canakkale otoyol');

    // 2. KGM İşletmesindeki Standart Otoyollar:
    // O-1, O-2, O-3, O-4 (Anadolu Otoyolu), O-20 (Ankara Çevre), O-30, O-31, O-32, O-51, O-52, O-53, O-54
    const isKGMMotorway = /\b(o-?[0-9]{1,2})\b/i.test(s) ||
      s.includes('otoyol') || s.includes('otoban') || s.includes('motorway') ||
      s.includes('tem otoyolu') || s.includes('tem ') || s.includes('avrupa otoyolu') || s.includes('anadolu otoyolu');

    // 3. Bölünmüş Yollar (Devlet Yolları, Çevre Yolları, Duble Yollar):
    // D-100, D-010, D-200, D-300, D-400, D-550, D-650, D-750, çevre yolları vb.
    const isDividedRoad = /\b(d-?[0-9]{3})\b/i.test(s) ||
      s.includes('d100') || s.includes('d-100') || s.includes('d200') || s.includes('d-200') ||
      s.includes('d300') || s.includes('d-300') || s.includes('d400') || s.includes('d-400') ||
      s.includes('d550') || s.includes('d-550') || s.includes('d650') || s.includes('d-650') ||
      s.includes('çevre yolu') || s.includes('cevre yolu') || s.includes('ring road') ||
      s.includes('ekspres') || s.includes('expressway') || s.includes('bölünmüş yol');

    // 4. Şehir İçi Ana Arter / Geniş Bulvar (UKOME Kararlı):
    // E-5 şehir içi kesimi, Sahil Yolu, Büyükdere Caddesi, Bağdat Caddesi, Bulvarlar
    const isUrbanArtery = s.includes('bulvar') || s.includes('blv') || s.includes('sahil yolu') ||
      s.includes('kordon') || s.includes('e-5') || s.includes('e5') || s.includes('büyükdere') || s.includes('inönü cd');

    // 5. Okul / Hastane / Yavaş Sürüş Bölgesi:
    const isSchoolZone = s.includes('okul') || s.includes('hastane') || s.includes('living_street') ||
      s.includes('yavaş') || s.includes('yavas') || s.includes('site içi');

    // 6. Şehir İçi Standart Cadde & Sokaklar:
    const isUrban = s.includes('cd') || s.includes('caddesi') || s.includes('sokak') ||
      s.includes('sk') || s.includes('mahalle') || s.includes('avenue') || s.includes('street');

    // Taşıt Cinsine Göre Resmi Türkiye Hız Sınırları (Karayolları Trafik Yönetmeliği Madde 100):
    if (vehicle === 'motorcycle') {
      // MOTOSİKLET:
      // Otoyollarda KGM ve YİD azami yasal hız sınırı 100 km/s'dir!
      if (isYIDMotorway || isKGMMotorway) return 100;
      if (isDividedRoad) return 90;
      if (isUrbanArtery) return 70;
      if (isSchoolZone) return 30;
      if (isUrban) return 50;
      return 80; // Şehirlerarası iki yönlü yol varsayılan
    }

    if (vehicle === 'car') {
      // OTOMOBİL:
      // 2022 KGM Düzenlemesi: YİD otoyollar 140, KGM otoyollar 130 km/s
      if (isYIDMotorway) return 140;
      if (isKGMMotorway) return 130;
      if (isDividedRoad) return 110;
      if (isUrbanArtery) return 82; // UKOME 82 (+ %10 tolerans ile 90)
      if (isSchoolZone) return 30;
      if (isUrban) return 50;
      return 90; // Şehirlerarası iki yönlü yol varsayılan
    }

    if (vehicle === 'camper') {
      // KARAVAN / KAMP TAŞITI (M1 & Römorklu Araçlar):
      // Karayolları Trafik Yönetmeliği Madde 100: Römork takmış araçların azami hızı 10 km/s daha düşüktür.
      const cp = (window.state && window.state.camperProfile) || CAMPER_PRESETS.alcove;
      const isTrailer = cp.type === 'trailer' || cp.type === 'compact_trailer';

      if (isTrailer) {
        if (isYIDMotorway || isKGMMotorway) return cp.speedLimitHighway || 100;
        if (isDividedRoad) return cp.speedLimitDivided || 90;
        if (isUrbanArtery) return 60;
        if (isSchoolZone) return 30;
        if (isUrban) return 50;
        return cp.speedLimitIntercity || 70;
      }

      // Motokaravanlar (Alkoven, Campervan, Tam Entegre):
      if (isYIDMotorway || isKGMMotorway) return cp.speedLimitHighway || 110;
      if (isDividedRoad) return cp.speedLimitDivided || 100;
      if (isUrbanArtery) return 70;
      if (isSchoolZone) return 30;
      if (isUrban) return 50;
      return cp.speedLimitIntercity || 80;
    }

    if (vehicle === 'bicycle') {
      // BİSİKLET:
      if (isSchoolZone) return 20;
      if (isUrban) return 30;
      return 45;
    }

    if (vehicle === 'walk') {
      return 5;
    }

    // Genel Güvenli Varsayılan
    return 80;
  },

  updateLaneGuidance(step, distMeters) {
    const bar = document.getElementById('live-nav-lanes-bar');
    const container = document.getElementById('live-nav-lanes-container');
    if (!bar || !container) return;

    if (!step || distMeters > 700 || distMeters <= 0) {
      bar.classList.add('hidden');
      return;
    }

    const mod = step.maneuver?.modifier || '';
    if (mod === 'right' || mod === 'sharp right' || mod === 'slight right') {
      container.innerHTML = `
        <span class="gmaps-lane-box">↑</span>
        <span class="gmaps-lane-box">↑</span>
        <span class="gmaps-lane-box lane-active">↱</span>
      `;
      bar.classList.remove('hidden');
    } else if (mod === 'left' || mod === 'sharp left' || mod === 'slight left') {
      container.innerHTML = `
        <span class="gmaps-lane-box lane-active">↰</span>
        <span class="gmaps-lane-box">↑</span>
        <span class="gmaps-lane-box">↑</span>
      `;
      bar.classList.remove('hidden');
    } else if (mod === 'straight' || step.maneuver?.type === 'fork') {
      container.innerHTML = `
        <span class="gmaps-lane-box lane-active">↑</span>
        <span class="gmaps-lane-box lane-active">↑</span>
        <span class="gmaps-lane-box">↱</span>
      `;
      bar.classList.remove('hidden');
    } else {
      bar.classList.add('hidden');
    }
  },

  initRouteSteps() {
    this.steps = [];
    if (state.routeData) {
      if (Array.isArray(state.routeData.steps) && state.routeData.steps.length > 0) {
        this.steps = state.routeData.steps;
      } else if (state.routeData.legs && Array.isArray(state.routeData.legs)) {
        this.steps = state.routeData.legs.flatMap(l => l.steps || []);
      }
    }

    // Fallback synthetic steps if steps are missing
    if (this.steps.length === 0 && state.routeData?.geometry?.coordinates) {
      const valid = (state.waypoints || []).filter(w => w.lat !== null && w.lon !== null);
      const isEn = (window.state && window.state.lang === 'en');
      const startName = (valid[0] && valid[0].name) || (isEn ? 'Start' : 'Başlangıç');
      const destName = (valid.length > 1 && valid[valid.length - 1].name) || (isEn ? 'Destination' : 'Varış');
      this.steps = [
        {
          name: startName,
          distance: 100,
          maneuver: { type: 'depart', modifier: 'straight', instruction: isEn ? 'Follow the route' : 'Yola çıkın ve rotayı takip edin' }
        },
        {
          name: destName,
          distance: state.routeData.distance || 1000,
          maneuver: { type: 'arrive', modifier: 'straight', instruction: isEn ? 'Arrive at destination' : 'Hedefe ulaştınız' }
        }
      ];
    }
  },

  getManeuverInfo(step) {
    const isEn = (window.state && window.state.lang === 'en');
    if (!step) {
      return {
        arrow: '↑',
        street: isEn ? 'Follow the route' : 'Güzergahı takip edin',
        action: isEn ? 'Continue straight' : 'Düz devam edin'
      };
    }

    const name = step.name || (isEn ? 'Road' : 'Güzergah');
    const m = step.maneuver || {};
    const type = m.type || '';
    const mod = m.modifier || '';

    let arrow = '↑';
    let action = isEn ? 'Continue straight' : 'Düz devam edin';

    if (type === 'arrive') {
      arrow = '🏁';
      action = isEn ? 'Arrive at destination' : 'Hedefe varış';
    } else if (type === 'depart') {
      arrow = '↑';
      action = isEn ? 'Depart and follow route' : 'Yola çıkın ve rotayı takip edin';
    } else if (type === 'roundabout' || type === 'rotary') {
      arrow = '🔄';
      action = isEn ? 'Enter roundabout, take exit' : 'Dönel kavşaktan çıkın';
    } else if (type === 'fork') {
      if (mod.includes('left')) {
        arrow = '↖';
        action = isEn ? 'Keep left at the fork' : 'Çatalda soldan devam edin';
      } else {
        arrow = '↗';
        action = isEn ? 'Keep right at the fork' : 'Çatalda sağdan devam edin';
      }
    } else if (type === 'off ramp' || type === 'on ramp') {
      if (mod.includes('left')) {
        arrow = '↖';
        action = isEn ? 'Take exit on left' : 'Soldan çıkışa girin';
      } else {
        arrow = '↗';
        action = isEn ? 'Take exit on right' : 'Sağdan çıkışa girin';
      }
    } else if (mod === 'sharp left') {
      arrow = '⮌';
      action = isEn ? `Sharp left onto ${name}` : `${name} yönüne keskin sola dönün`;
    } else if (mod === 'left') {
      arrow = '↰';
      action = isEn ? `Turn left onto ${name}` : `${name} yönüne sola dönün`;
    } else if (mod === 'slight left') {
      arrow = '↖';
      action = isEn ? `Slight left onto ${name}` : `${name} yönüne hafif sola dönün`;
    } else if (mod === 'sharp right') {
      arrow = '⮎';
      action = isEn ? `Sharp right onto ${name}` : `${name} yönüne keskin sağa dönün`;
    } else if (mod === 'right') {
      arrow = '↱';
      action = isEn ? `Turn right onto ${name}` : `${name} yönüne sağa dönün`;
    } else if (mod === 'slight right') {
      arrow = '↗';
      action = isEn ? `Slight right onto ${name}` : `${name} yönüne hafif sağa dönün`;
    } else if (mod === 'uturn') {
      arrow = '↩';
      action = isEn ? 'Make a U-turn' : 'U dönüşü yapın';
    } else if (type === 'turn') {
      if (mod.includes('left')) {
        arrow = '↰';
        action = isEn ? `Turn left onto ${name}` : `${name} yönüne sola dönün`;
      } else if (mod.includes('right')) {
        arrow = '↱';
        action = isEn ? `Turn right onto ${name}` : `${name} yönüne sağa dönün`;
      }
    } else {
      arrow = '↑';
      action = isEn ? `Continue on ${name}` : `${name} boyunca düz devam edin`;
    }

    return { arrow, street: name, action };
  },

  detectUpcomingCurvature(lat, lon) {
    const pill = document.getElementById('live-nav-curve-pill');
    const textEl = document.getElementById('live-nav-curve-text');
    if (!pill || !textEl) return;

    const coords = state.routeData?.geometry?.coordinates;
    if (!coords || coords.length < 5) {
      pill.classList.add('hidden');
      return;
    }

    let closestIdx = 0;
    let minD = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const d = haversineMeters(lat, lon, coords[i][1], coords[i][0]);
      if (d < minD) {
        minD = d;
        closestIdx = i;
      }
    }

    let sharpCurveDetected = false;
    let curveDistanceM = 0;
    const scanLimit = Math.min(coords.length - 2, closestIdx + 25);

    for (let i = closestIdx + 1; i < scanLimit; i++) {
      const p1 = coords[i - 1];
      const p2 = coords[i];
      const p3 = coords[i + 1];
      const b1 = calculateBearing(p1[1], p1[0], p2[1], p2[0]);
      const b2 = calculateBearing(p2[1], p2[0], p3[1], p3[0]);
      let diff = Math.abs(b1 - b2);
      if (diff > 180) diff = 360 - diff;

      if (diff > 55) {
        sharpCurveDetected = true;
        curveDistanceM = Math.round(haversineMeters(lat, lon, p2[1], p2[0]));
        break;
      }
    }

    if (sharpCurveDetected && curveDistanceM >= 50 && curveDistanceM <= 900) {
      const isEn = (window.state && window.state.lang === 'en');
      if (state.currentVehicle === 'camper') {
        textEl.textContent = isEn
          ? `🚐 Wide Turn: Sharp Curve (${curveDistanceM}m)`
          : `🚐 Geniş Dönüş: Keskin Viraj (${curveDistanceM}m)`;
      } else {
        textEl.textContent = isEn
          ? `⚠️ Sharp Curve Ahead (${curveDistanceM}m)`
          : `⚠️ İleride Keskin Viraj (${curveDistanceM}m)`;
      }
      pill.classList.remove('hidden');
    } else {
      pill.classList.add('hidden');
    }
  },

  checkOffRoute(lat, lon) {
    if (this.isRerouting || this.isSimulation) return;
    const coords = state.routeData?.geometry?.coordinates;
    if (!coords || coords.length < 2) return;

    let minDistM = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const d = haversineMeters(lat, lon, coords[i][1], coords[i][0]);
      if (d < minDistM) minDistM = d;
      if (minDistM < 30) break;
    }

    if (minDistM > 90) {
      this.offRouteCounter = (this.offRouteCounter || 0) + 1;
      if (this.offRouteCounter >= 2) {
        this.triggerAutoReroute(lat, lon);
      }
    } else {
      this.offRouteCounter = 0;
    }
  },

  async triggerAutoReroute(lat, lon) {
    if (this.isRerouting) return;
    this.isRerouting = true;
    this.offRouteCounter = 0;

    const banner = document.getElementById('live-nav-reroute-banner');
    if (banner) banner.classList.remove('hidden');

    this.playNavSound('reroute');
    const isEn = (window.state && window.state.lang === 'en');
    if (this.voiceEnabled) {
      this.speak(isEn ? 'Off route. Recalculating route.' : 'Rotadan çıkıldı. Yeni rota hesaplanıyor.');
    }

    if (state.waypoints && state.waypoints.length > 0) {
      state.waypoints[0].lat = lat;
      state.waypoints[0].lon = lon;
      state.waypoints[0].name = isEn ? 'Current Location' : 'Mevcut Konum';
    }

    try {
      await calculateRouteMain();
      if (state.routeData) {
        this.initRouteSteps();
        this.currentStepIndex = 0;
        this.updateManeuverUI(0);
        if (this.voiceEnabled) {
          this.speak(isEn ? 'New route ready.' : 'Yeni rota hazır.');
        }
      }
    } catch (e) {
      console.warn('Auto reroute failed:', e);
    } finally {
      if (banner) banner.classList.add('hidden');
      this.isRerouting = false;
    }
  },

  toggleToolsPopover(show) {
    const popover = document.getElementById('live-nav-tools-popover');
    if (!popover) return;
    if (show === undefined) {
      popover.classList.toggle('hidden');
    } else if (show) {
      popover.classList.remove('hidden');
    } else {
      popover.classList.add('hidden');
    }
    if (!popover.classList.contains('hidden') && typeof initIcons === 'function') {
      initIcons();
    }
  },

  toggleHudMirror() {
    this.isHudMirrored = !this.isHudMirrored;
    const overlay = document.getElementById('live-nav-overlay');
    const hudBtn = document.getElementById('live-nav-btn-hud');
    const isEn = (window.state && window.state.lang === 'en');

    if (overlay) {
      if (this.isHudMirrored) {
        overlay.classList.add('hud-mirror-active');
        if (hudBtn) hudBtn.classList.add('text-amber-400');
        showToast(isEn ? 'HUD Windshield Mode ON (Place on dashboard)' : 'HUD Cama Yansıtma Açık (Telefonu ön cama yerleştirin)', 'info');
      } else {
        overlay.classList.remove('hud-mirror-active');
        if (hudBtn) hudBtn.classList.remove('text-amber-400');
        showToast(isEn ? 'Normal Display Mode' : 'Normal Ekran Modu', 'info');
      }
    }
  },

  cycleSpeedLimit() {
    const isEn = (window.state && window.state.lang === 'en');
    const vehicle = (window.state && window.state.currentVehicle) || 'motorcycle';
    const commonLimits = [30, 50, 70, 80, 82, 90, 100, 110, 120, 130, 140];

    const cur = this.currentSpeedLimit || 90;
    const curIdx = commonLimits.indexOf(cur);
    let nextLimit;
    if (curIdx === -1 || curIdx >= commonLimits.length - 1) {
      nextLimit = commonLimits[0];
    } else {
      nextLimit = commonLimits[curIdx + 1];
    }

    this.manualSpeedLimit = nextLimit;
    this.currentSpeedLimit = nextLimit;

    const limitEl = document.getElementById('live-nav-speed-limit-val');
    if (limitEl) limitEl.textContent = this.currentSpeedLimit;

    const vehicleIcon = vehicle === 'motorcycle' ? '🏍️' : (vehicle === 'camper' ? '🚐' : (vehicle === 'bicycle' ? '🚲' : '🚗'));
    showToast(isEn ? `${vehicleIcon} Speed Limit: ${nextLimit} km/h (Manual)` : `${vehicleIcon} Hız Sınırı: ${nextLimit} km/s (Manuel Ayarlandı)`, 'info');
  },

  resetSpeedLimitToAuto() {
    this.manualSpeedLimit = null;
    const curStep = this.steps[this.currentStepIndex];
    const curInfo = this.getManeuverInfo(curStep);
    this.currentSpeedLimit = this.getSpeedLimitForStep(curStep, curInfo.street);
    const limitEl = document.getElementById('live-nav-speed-limit-val');
    if (limitEl) limitEl.textContent = this.currentSpeedLimit;
    const isEn = (window.state && window.state.lang === 'en');
    showToast(isEn ? 'Speed Limit: Auto road detection restored' : 'Hız Sınırı: Otomatik yol tespitine dönüldü', 'info');
  },

  updateManeuverUI(distMeters = 0) {
    const isEn = (window.state && window.state.lang === 'en');
    const curStep = this.steps[this.currentStepIndex];
    const nextStep = this.steps[this.currentStepIndex + 1];

    const curInfo = this.getManeuverInfo(curStep);

    // Update Speed Limit Sign
    this.currentSpeedLimit = this.getSpeedLimitForStep(curStep, curInfo.street);
    const limitEl = document.getElementById('live-nav-speed-limit-val');
    if (limitEl) limitEl.textContent = this.currentSpeedLimit;

    // Update Lane Guidance
    this.updateLaneGuidance(curStep, distMeters);

    const iconEl = document.getElementById('live-nav-maneuver-icon');
    const distEl = document.getElementById('live-nav-maneuver-dist');
    const suffixEl = document.getElementById('live-nav-maneuver-suffix');
    const nameEl = document.getElementById('live-nav-street-name');
    const subEl = document.getElementById('live-nav-street-sub');

    if (iconEl) iconEl.textContent = curInfo.arrow;
    if (distEl) {
      if (distMeters <= 0) {
        distEl.textContent = '100 m';
      } else if (distMeters < 1000) {
        distEl.textContent = `${Math.round(distMeters)} m`;
      } else {
        distEl.textContent = `${(distMeters / 1000).toFixed(1)} km`;
      }
    }
    if (suffixEl) {
      suffixEl.textContent = isEn ? 'then' : 'sonra';
    }
    if (nameEl) nameEl.textContent = curInfo.street;
    if (subEl) subEl.textContent = curInfo.action;

    // Secondary next-step pill ("Sonra ↱")
    const nextPill = document.getElementById('live-nav-next-step-pill');
    const subArrow = document.getElementById('live-nav-sub-arrow');
    const subStreet = document.getElementById('live-nav-sub-street');
    const subDist = document.getElementById('live-nav-sub-dist');

    if (nextStep) {
      const nextInfo = this.getManeuverInfo(nextStep);
      if (subArrow) subArrow.textContent = nextInfo.arrow;
      if (subStreet) subStreet.textContent = nextInfo.street;
      if (subDist) {
        const nextDist = nextStep.distance || 800;
        subDist.textContent = (nextDist < 1000) ? `${Math.round(nextDist)} m` : `${(nextDist / 1000).toFixed(1)} km`;
      }
      if (nextPill) nextPill.classList.remove('hidden');
    } else {
      if (nextPill) nextPill.classList.add('hidden');
    }
  },

  startFreeRide() {
    this.isActive = true;
    this.isFreeRide = true;
    this.wasFreeRide = true;
    this.isSimulation = false;
    this.forceSimulationExplicit = false;
    this.notifiedPois.clear();
    this.autoCenter = true;
    this.startTime = Date.now();
    this.maxSpeed = 0;
    this.speedHistory = [];
    this.distanceTraveledM = 0;
    this.currentStepIndex = 0;
    this.compassMode = 'heading';
    this.isOverviewMode = false;
    this.steps = [];

    // Show Live HUD overlay
    const overlay = document.getElementById('live-nav-overlay');
    if (overlay) overlay.classList.remove('hidden');

    // Clean UI for distraction-free riding cockpit
    if (typeof closeMobileSidebar === 'function') closeMobileSidebar();
    if (typeof closeRightPanel === 'function') closeRightPanel();
    if (typeof dismissHomepagePlanner === 'function') dismissHomepagePlanner();

    const bottomBar = document.getElementById('mobile-bottom-bar');
    if (bottomBar) bottomBar.classList.add('hidden');
    document.getElementById('floating-map-controls')?.classList.add('hidden');
    document.getElementById('map-category-filter-bar')?.classList.add('hidden');
    dismissQuickPlacePreview();
    document.getElementById('btn-toggle-right-panel')?.classList.add('hidden');
    document.getElementById('map-hint')?.classList.add('hidden');
    document.getElementById('elevation-panel')?.classList.add('hidden');

    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.add('live-nav-hidden');
    if (map) {
      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 300);
    }

    this.requestWakeLock();

    if (map) {
      map.on('dragstart', () => {
        if (this.isActive) {
          this.autoCenter = false;
          this.toggleToolsPopover(false);
          const recenterPill = document.getElementById('live-nav-recenter-pill-box');
          if (recenterPill) recenterPill.classList.remove('hidden');
        }
      });
    }

    // Configure Top Maneuver Card for Free Ride
    const isEn = (window.state && window.state.lang === 'en');
    const iconEl = document.getElementById('live-nav-maneuver-icon');
    const distEl = document.getElementById('live-nav-maneuver-dist');
    const suffixEl = document.getElementById('live-nav-maneuver-suffix');
    const nameEl = document.getElementById('live-nav-street-name');
    const subEl = document.getElementById('live-nav-street-sub');
    const nextPill = document.getElementById('live-nav-next-step-pill');

    if (iconEl) iconEl.textContent = '🏍️';
    if (distEl) distEl.textContent = 'LIVE';
    if (suffixEl) suffixEl.textContent = '';
    if (nameEl) nameEl.textContent = isEn ? 'Free Ride Mode' : 'Serbest Sürüş Modu';
    if (nextPill) nextPill.classList.add('hidden');

    // Taşıta özel serbest sürüş başlangıç hız limiti
    const v = (window.state && window.state.currentVehicle) || 'motorcycle';
    let defaultCamperLimit = 90;
    if (v === 'camper') {
      const cp = (window.state && window.state.camperProfile) || CAMPER_PRESETS.alcove;
      defaultCamperLimit = (cp.type === 'trailer' || cp.type === 'compact_trailer') ? 80 : 90;
    }
    this.currentSpeedLimit = (v === 'motorcycle') ? 90 : (v === 'camper' ? defaultCamperLimit : (v === 'bicycle' ? 45 : 110));
    const limitEl = document.getElementById('live-nav-speed-limit-val');
    if (limitEl) limitEl.textContent = this.currentSpeedLimit;

    let initialCoord = [41.0082, 28.9784];
    if (state.userLocation && state.userLocation.lat && state.userLocation.lon) {
      initialCoord = [state.userLocation.lat, state.userLocation.lon];
      this.hasCenteredOnCurrentLocation = true;
    } else {
      this.hasCenteredOnCurrentLocation = false;
    }

    this.lastCoord = initialCoord;
    this.lastGpsCoord = initialCoord;
    this.createRiderMarker(this.lastCoord);
    if (map) {
      map.flyTo(this.lastCoord, 18, { duration: 1.0 });
    }

    if (this.voiceEnabled) {
      this.speak(isEn ? 'Free ride mode started. Have a safe journey!' : 'Serbest sürüş modu başlatıldı. İyi yolculuklar!');
    }
    showToast(isEn ? '🏍️ Free Ride Mode Active' : '🏍️ Serbest Sürüş Modu Aktif', 'success');

    this.startGPS();
    document.getElementById('live-nav-btn-compass')?.classList.add('compass-heading-active');
    this.updateControlsUI();
    if (typeof initIcons === 'function') initIcons();
  },

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
    this.isFreeRide = false;
    this.wasFreeRide = false;
    this.forceSimulationExplicit = !!forceSimulation;
    this.notifiedPois.clear();
    this.autoCenter = true;
    this.startTime = Date.now();
    this.maxSpeed = 0;
    this.speedHistory = [];
    this.distanceTraveledM = 0;
    this.pendingFuelStop = null;
    this.hasCenteredOnCurrentLocation = false;
    this.currentStepIndex = 0;
    this.compassMode = 'heading';
    this.isOverviewMode = false;
    this.initRouteSteps();
    this.updateManeuverUI(0);

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
        if (this.isActive) {
          this.autoCenter = false;
          this.toggleToolsPopover(false);
          const recenterPill = document.getElementById('live-nav-recenter-pill-box');
          if (recenterPill) recenterPill.classList.remove('hidden');
        }
      });
    }

    // Determine starting coordinates: prioritize rider's real current location!
    let initialCoord = null;
    const isEn = (window.state && window.state.lang === 'en');

    if (!forceSimulation && state.userLocation && state.userLocation.lat && state.userLocation.lon) {
      // Real GPS location is already known: fly and zoom directly into rider's current location!
      initialCoord = [state.userLocation.lat, state.userLocation.lon];
      this.hasCenteredOnCurrentLocation = true;
      showToast(isEn ? '📍 Centered on your current location' : '📍 Bulunduğunuz konuma yaklaşıldı', 'success');
    } else {
      // Fallback to route start point (or for demo simulation)
      const coords = state.routeData.geometry.coordinates;
      const startPt = coords[0];
      initialCoord = [startPt[1], startPt[0]];
      this.hasCenteredOnCurrentLocation = forceSimulation;
      if (!forceSimulation) {
        showToast(isEn ? '📍 Locating your position & zooming in...' : '📍 Konumunuz alınıyor ve yaklaşılıyor...', 'info');
      }
    }

    this.lastCoord = initialCoord;
    this.lastGpsCoord = initialCoord;

    // Create Rider Marker and smoothly fly/zoom camera directly into road/lane level (zoom 18)
    this.createRiderMarker(this.lastCoord);
    if (map) {
      map.flyTo(this.lastCoord, 18, { duration: 1.2, easeLinearity: 0.25 });
    }

    // Voice announcement
    if (this.voiceEnabled) {
      this.speak(isEn ? 'Live ride tracking started. Have a safe journey!' : 'Canlı sürüş takibi başladı. İyi yolculuklar!');
    }

    const startTitle = (typeof t === 'function') ? t('live_nav_title', 'Canlı Sürüş Modu') : 'Canlı Sürüş Modu';
    showToast(`${startTitle} aktif!`, 'success');

    if (forceSimulation) {
      this.startSimulation();
    } else {
      this.startGPS();
    }

    document.getElementById('live-nav-btn-compass')?.classList.add('compass-heading-active');
    this.updateControlsUI();
    if (typeof initIcons === 'function') initIcons();
  },

  stop(showSummary = true) {
    const wasActive = this.isActive;
    const wasFree = this.isFreeRide;
    this.isActive = false;
    this.isFreeRide = false;
    this.wasFreeRide = wasFree;
    this.manualSpeedLimit = null;
    this.stopGPS();
    this.stopSimulation();
    this.releaseWakeLock();
    if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
      try { document.exitFullscreen(); } catch (e) {}
    }
    this.dismissAlertBanner();
    this.dismissFuelBanner();
    this.toggleToolsPopover(false);
    document.getElementById('live-nav-hazard-banner')?.classList.add('hidden');

    // Remove incident markers
    if (this.incidentMarkers && this.incidentMarkers.length > 0) {
      this.incidentMarkers.forEach(m => {
        if (map && map.hasLayer(m)) map.removeLayer(m);
      });
      this.incidentMarkers = [];
    }
    this.isOverviewMode = false;
    this.steps = [];
    this.currentStepIndex = 0;

    // Remove rider marker
    if (this.marker && map) {
      map.removeLayer(this.marker);
      this.marker = null;
    }

    // Hide HUD overlay
    const overlay = document.getElementById('live-nav-overlay');
    if (overlay) overlay.classList.add('hidden');
    document.getElementById('live-nav-recenter-pill-box')?.classList.add('hidden');

    // Restore floating controls and cards
    const bottomBar = document.getElementById('mobile-bottom-bar');
    if (bottomBar) bottomBar.classList.remove('hidden');

    document.getElementById('floating-map-controls')?.classList.remove('hidden');
    document.getElementById('map-category-filter-bar')?.classList.remove('hidden');
    document.getElementById('btn-toggle-right-panel')?.classList.remove('hidden');

    // Restore desktop sidebar
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('live-nav-hidden');
    if (map) {
      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 300);
    }

    // Reset Dönen Harita (Heading-Up) camera rotation back to 0deg (North-Up)
    const mapEl = document.getElementById('map');
    if (mapEl) {
      mapEl.classList.remove('live-nav-rotating');
      mapEl.style.transform = '';
    }
    this.currentMapRotation = 0;
    document.getElementById('live-nav-btn-compass')?.classList.remove('compass-heading-active');

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

    // Show Strava-style ride summary report card modal
    if (wasActive && showSummary) {
      this.showRideSummary();
    }
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
      maximumAge: 0,
      timeout: 10000
    };

    let gpsReceived = false;

    // Instant single-shot position query to lock on and zoom as fast as hardware allows
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!this.isActive) return;
        gpsReceived = true;
        if (this.simInterval && !this.forceSimulationExplicit) {
          clearInterval(this.simInterval);
          this.simInterval = null;
          this.isSimulation = false;
          this.updateModeBadge();
        }
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const speed = (pos.coords.speed !== null && !isNaN(pos.coords.speed))
          ? Math.max(0, Math.round(pos.coords.speed * 3.6))
          : 0;
        let heading = pos.coords.heading;
        if (heading === null || isNaN(heading)) {
          heading = this.lastHeading || 0;
        }
        state.userLocation = { lat, lon };
        this.onLocationUpdate(lat, lon, speed, heading, true /* isInitialFix */);
      },
      (err) => {
        console.warn('Initial getCurrentPosition in LiveNavigation:', err);
      },
      options
    );

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        gpsReceived = true;
        if (this.simInterval && !this.forceSimulationExplicit) {
          clearInterval(this.simInterval);
          this.simInterval = null;
          this.isSimulation = false;
          this.updateModeBadge();
        }
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
        state.userLocation = { lat, lon };
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

    // Fallback if no GPS fix after 6 seconds (desktop / indoor test)
    setTimeout(() => {
      if (this.isActive && !this.isSimulation && !gpsReceived) {
        this.switchToSimulationWithMessage();
      }
    }, 6000);
  },

  stopGPS() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  },

  switchToSimulationWithMessage() {
    if (!this.isActive) return;
    const isEn = (window.state && window.state.lang === 'en');
    if (this.isFreeRide || !state.routeData) {
      const msg = isEn
        ? 'GPS fix is pending. Cruise test simulation active.'
        : 'GPS sinyali bekleniyor. Serbest sürüş seyir simülasyonu devrede.';
      showToast(msg, 'info');
      this.startFreeRideSimulation();
      return;
    }
    const msg = (typeof t === 'function')
      ? t('live_nav_gps_error', 'GPS sinyali alınamadı. Demo simülasyon moduna geçiliyor.')
      : 'GPS sinyali alınamadı. Demo simülasyon moduna geçiliyor.';
    showToast(msg, 'info');
    this.startSimulation();
  },

  startFreeRideSimulation() {
    this.isSimulation = true;
    this.updateModeBadge();
    if (this.simInterval) clearInterval(this.simInterval);

    let curCoord = this.lastCoord || [41.0082, 28.9784];
    let curHeading = this.lastHeading || 45;

    this.simInterval = setInterval(() => {
      if (!this.isActive) {
        clearInterval(this.simInterval);
        return;
      }
      curHeading = (curHeading + (Math.random() - 0.48) * 8 + 360) % 360;
      const speed = Math.floor(52 + Math.random() * 16);
      const distStepM = (speed * 1000 / 3600) * 0.8;
      const nextCoord = destinationPoint(curCoord[0], curCoord[1], distStepM, curHeading);
      curCoord = nextCoord;

      this.onLocationUpdate(nextCoord[0], nextCoord[1], speed, curHeading);
    }, 800);
  },

  startSimulation() {
    this.stopGPS();
    this.isSimulation = true;
    this.forceSimulationExplicit = true;
    this.updateModeBadge();

    const coords = state.routeData?.geometry?.coordinates;
    if (!coords || coords.length === 0) {
      if (this.isFreeRide || !state.routeData) {
        this.startFreeRideSimulation();
      }
      return;
    }

    this.simIndex = 0;
    if (this.simInterval) clearInterval(this.simInterval);

    const stepSkip = Math.max(1, Math.floor(coords.length / 280));

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
      const nextIdx = Math.min(this.simIndex + stepSkip, coords.length - 1);
      const next = coords[nextIdx];

      const heading = calculateBearing(current[1], current[0], next[1], next[0]);
      const speed = Math.floor(65 + Math.random() * 15);

      this.onLocationUpdate(current[1], current[0], speed, heading);
      this.simIndex = nextIdx;
    }, 650);
  },

  stopSimulation() {
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
    this.isSimulation = false;
    this.forceSimulationExplicit = false;
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
      if (this.isFreeRide || !state.routeData) {
        this.startFreeRideSimulation();
      } else {
        this.startSimulation();
      }
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

  updateMapHeading(heading) {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    if (this.compassMode === 'north' || this.isOverviewMode || !this.isActive) {
      if (mapEl.classList.contains('live-nav-rotating')) {
        mapEl.style.transform = 'scale(1) rotate(0deg)';
        setTimeout(() => {
          if (!this.isActive || this.compassMode === 'north' || this.isOverviewMode) {
            mapEl.classList.remove('live-nav-rotating');
            mapEl.style.transform = '';
          }
        }, 450);
      }
      this.currentMapRotation = 0;
      return;
    }

    if (!mapEl.classList.contains('live-nav-rotating')) {
      mapEl.classList.add('live-nav-rotating');
    }

    // Shortest-path angle unwrapping: prevents 360-degree spin across North (0/360)
    const targetRot = -heading;
    let diff = (targetRot - (this.currentMapRotation || 0)) % 360;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    this.currentMapRotation = (this.currentMapRotation || 0) + diff;

    // Scale 1.55 covers the viewport diagonal completely at any orientation
    mapEl.style.transform = `scale(1.55) rotate(${this.currentMapRotation}deg)`;
  },

  onLocationUpdate(lat, lon, speed, heading, isInitialFix = false) {
    this.speedKmH = speed;
    this.lastHeading = heading || 0;
    this.lastCoord = [lat, lon];
    state.userLocation = { lat, lon };

    // Telemetry distance & speed calculation
    if (this.lastGpsCoord) {
      const stepD = haversineMeters(this.lastGpsCoord[0], this.lastGpsCoord[1], lat, lon);
      if (stepD >= 1 && stepD <= 1000) {
        this.distanceTraveledM += stepD;
      }
    }
    this.lastGpsCoord = [lat, lon];

    if (speed > this.maxSpeed) {
      this.maxSpeed = speed;
    }
    if (speed > 5) {
      this.speedHistory.push(speed);
    }

    if (this.marker) {
      this.marker.setLatLng([lat, lon]);
    } else {
      this.createRiderMarker([lat, lon]);
    }

    const iconElem = document.getElementById('live-rider-icon-elem');
    if (iconElem) {
      iconElem.style.transform = `rotate(${Math.round(this.lastHeading)}deg)`;
    }

    // Automatically zoom in & center on user's current location when journey starts!
    if (!this.hasCenteredOnCurrentLocation || isInitialFix) {
      this.hasCenteredOnCurrentLocation = true;
      if (map) {
        map.flyTo([lat, lon], 18, { duration: 1.2, easeLinearity: 0.25 });
      }
      const isEn = (window.state && window.state.lang === 'en');
      showToast(isEn ? '📍 Centered on your current location' : '📍 Bulunduğunuz konuma yaklaşıldı', 'success');
    } else if (this.autoCenter && !this.isOverviewMode && map) {
      // Dynamic Speed-Adaptive Camera Zoom
      let targetZoom = 18;
      if (this.speedKmH > 85) targetZoom = 16;
      else if (this.speedKmH > 40) targetZoom = 17;
      else targetZoom = 18;

      if (map.getZoom() !== targetZoom) {
        map.setZoom(targetZoom, { animate: true });
      }
      map.panTo([lat, lon], { animate: true, duration: 0.5 });
    }

    // Dönen Harita (Heading-Up Navigation Camera Mode)
    this.updateMapHeading(this.lastHeading || 0);

    const speedEl = document.getElementById('live-nav-speed-val');
    if (speedEl) speedEl.textContent = Math.round(this.speedKmH);

    // Overspeed Danger Glow & Audio Warning (Yasal %10 Radar Toleransı)
    const speedoBox = document.getElementById('live-nav-speedo-box');
    const limitBadge = document.getElementById('live-nav-speed-limit-badge');
    const limit = this.currentSpeedLimit || 90;
    const toleranceFineSpeed = Math.floor(limit * 1.10); // Yasal %10 ceza eşiği (KTK Madde 51)

    // Görsel ikaz: Hız sınırı + 2 km/s aşıldığında
    if (this.speedKmH > limit + 2) {
      if (speedoBox) speedoBox.classList.add('overspeed');
      if (limitBadge) limitBadge.classList.add('overspeed');

      // Sesli ikaz: Yasal %10 ceza toleransı aşıldığında (radar riski)
      if (this.speedKmH >= toleranceFineSpeed) {
        const now = Date.now();
        if (now - (this.lastOverspeedWarningTime || 0) > 30000) {
          this.lastOverspeedWarningTime = now;
          this.playNavSound('overspeed');
          if (this.voiceEnabled) {
            const isEn = (window.state && window.state.lang === 'en');
            this.speak(isEn ? `Caution: Speed limit is ${limit}!` : `Dikkat: Hız sınırı ${limit}! Yasal toleransı aştınız.`);
          }
        }
      }
    } else {
      if (speedoBox) speedoBox.classList.remove('overspeed');
      if (limitBadge) limitBadge.classList.remove('overspeed');
    }

    // Update Google Maps Compass Needle rotation
    const needleEl = document.getElementById('live-nav-compass-needle');
    if (needleEl) {
      if (this.compassMode === 'heading') {
        needleEl.style.transform = `rotate(${Math.round(this.currentMapRotation || 0)}deg)`;
      } else {
        needleEl.style.transform = 'rotate(0deg)';
      }
    }

    // Curvature & Danger Detection (Sharp curves ahead)
    this.detectUpcomingCurvature(lat, lon);

    // Off-route Detection & Auto Reroute
    this.checkOffRoute(lat, lon);

    this.updateRouteProgress(lat, lon);
    this.checkProximityAlerts(lat, lon);
    if (typeof RotamCommunity !== 'undefined') {
      RotamCommunity.checkProximity(lat, lon);
    }
    if (typeof RotamStoryGuide !== 'undefined') {
      RotamStoryGuide.checkProximity(lat, lon);
    }
  },

  updateRouteProgress(lat, lon) {
    if (this.isFreeRide) {
      const remDistEl = document.getElementById('live-nav-rem-dist');
      const remTimeEl = document.getElementById('live-nav-rem-time');
      const etaEl = document.getElementById('live-nav-eta-time');

      const distKm = (this.distanceTraveledM || 0) / 1000;
      if (remDistEl) remDistEl.textContent = `${distKm.toFixed(1)} km`;

      const elapsedMs = this.startTime ? (Date.now() - this.startTime) : 0;
      const elapsedM = Math.floor(elapsedMs / 60000);
      const isEn = (window.state && window.state.lang === 'en');
      if (remTimeEl) remTimeEl.textContent = `${elapsedM} ${isEn ? 'min' : 'dk'}`;

      const now = new Date();
      const hStr = String(now.getHours()).padStart(2, '0');
      const mStr = String(now.getMinutes()).padStart(2, '0');
      if (etaEl) etaEl.textContent = `${hStr}:${mStr}`;
      return;
    }

    const valid = state.waypoints.filter(w => w.lat !== null && w.lon !== null);
    if (valid.length < 2) return;

    // 1. Maneuver Step Progress & Detection
    if (this.steps && this.steps.length > 0 && this.currentStepIndex < this.steps.length) {
      const curStep = this.steps[this.currentStepIndex];
      let distToStep = 100;
      if (curStep.maneuver && Array.isArray(curStep.maneuver.location)) {
        const [mLocLon, mLocLat] = curStep.maneuver.location;
        distToStep = haversineMeters(lat, lon, mLocLat, mLocLon);
      }

      // Approaching turn chime (when within 180m)
      if (distToStep <= 180 && distToStep >= 70 && !this.hasChimedForCurrentStep) {
        this.hasChimedForCurrentStep = true;
        this.playNavSound('turn');
      }

      // Check if rider reached maneuver threshold (within 45 meters)
      if (distToStep <= 45 && this.currentStepIndex < this.steps.length - 1) {
        this.currentStepIndex++;
        this.hasChimedForCurrentStep = false;
        const nextStep = this.steps[this.currentStepIndex];
        const info = this.getManeuverInfo(nextStep);
        if (this.voiceEnabled) {
          const isEn = (window.state && window.state.lang === 'en');
          const speech = isEn
            ? `In 100 meters, ${info.action} ${info.street}`
            : `${info.street} ${info.action}`;
          this.speak(speech);
        }
        this.updateManeuverUI(nextStep.distance || 150);
      } else {
        this.updateManeuverUI(distToStep);
      }
    }

    // 2. Total Remaining Journey Distance & Real-Time ETA
    const finalDest = valid[valid.length - 1];
    const totalRemKm = haversineMeters(lat, lon, finalDest.lat, finalDest.lon) / 1000;

    const effectiveSpeed = Math.max(30, this.speedKmH || 65);
    const remMinutes = Math.max(1, Math.round((totalRemKm / effectiveSpeed) * 60));
    const remH = Math.floor(remMinutes / 60);
    const remM = remMinutes % 60;
    const isEn = (window.state && window.state.lang === 'en');
    const timeStr = isEn ? `${remH > 0 ? remH + 'h ' : ''}${remM}m` : `${remH > 0 ? remH + ' sa ' : ''}${remM} dk`;

    // Calculate real ETA clock time (e.g. 21:37)
    const etaDate = new Date(Date.now() + remMinutes * 60000);
    const etaH = String(etaDate.getHours()).padStart(2, '0');
    const etaMin = String(etaDate.getMinutes()).padStart(2, '0');
    const etaStr = `${etaH}:${etaMin}`;

    const remDistEl = document.getElementById('live-nav-rem-dist');
    const remTimeEl = document.getElementById('live-nav-rem-time');
    const etaEl = document.getElementById('live-nav-eta-time');

    if (remDistEl) remDistEl.textContent = `${totalRemKm.toFixed(0)} km`;
    if (remTimeEl) remTimeEl.textContent = `${timeStr}`;
    if (etaEl) etaEl.textContent = etaStr;
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
        lon: wp.lon,
        isWaypoint: true
      });
    });

    if (state.corridorPois && Array.isArray(state.corridorPois)) {
      state.corridorPois.forEach(poi => {
        targets.push({
          id: `poi_${poi.id || poi.name}`,
          name: poi.name,
          lat: poi.lat,
          lon: poi.lon,
          category: poi.category || 'historic',
          poi: poi
        });
      });
    }

    for (const target of targets) {
      if (this.notifiedPois.has(target.id)) continue;

      const distM = haversineMeters(lat, lon, target.lat, target.lon);

      if (distM <= 1000 && distM >= 60) {
        this.notifiedPois.add(target.id);

        const isFuel = target.category === 'fuel' || target.category === 'ev_charge' ||
          /benzin|petrol|akaryakıt|yakıt|istasyon|opet|shell|bp|total|aytemiz|lukoil|sunpet|po\b/i.test(target.name || '');

        const isHistoric = !isFuel && (target.category === 'historic' ||
          (target.poi && (target.poi.category === 'historic' || target.poi.type === 'historic')));

        // Kullanıcı kuralı: Benzinlikler için ASLA sesli uyarı verilmez. Sadece tarihi yerler sesli olarak uyarılır.
        if (target.isWaypoint) {
          this.showProximityBanner(target.name, Math.round(distM), 'waypoint');
          if (this.voiceEnabled) {
            const speechText = isEn
              ? `Approaching ${target.name} in ${Math.round(distM)} meters`
              : `${target.name} noktasına ${Math.round(distM)} metre kaldı`;
            this.speak(speechText);
          }
        } else if (isHistoric) {
          this.showProximityBanner(target.name, Math.round(distM), 'historic');
          if (this.voiceEnabled) {
            const speechText = isEn
              ? `Approaching historical site: ${target.name} in ${Math.round(distM)} meters`
              : `Tarihi yer: ${target.name} noktasına ${Math.round(distM)} metre kaldı`;
            this.speak(speechText);
          }
        } else if (!isFuel) {
          // Doğa veya mola gibi diğer noktalar sadece sessiz görsel banner verir, ses çıkarmaz
          this.showProximityBanner(target.name, Math.round(distM));
        }
        // isFuel olan istasyonlar için sesli uyarı verilmez ve HUD banner'ı temiz tutulur
        break;
      }
    }
  },

  showProximityBanner(name, distM, tag = null) {
    const banner = document.getElementById('live-nav-alert-banner');
    const textEl = document.getElementById('live-nav-alert-text');
    if (!banner || !textEl) return;

    let prefix = '';
    if (tag === 'historic') prefix = '🏛️ ';
    else if (tag === 'waypoint') prefix = '📍 ';

    textEl.textContent = `${prefix}${name} (${distM}m)`;
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

  findNearestFuelStop() {
    if (!this.lastCoord) {
      const isEn = (window.state && window.state.lang === 'en');
      showToast(isEn ? 'Determining location...' : 'Konumunuz belirleniyor...', 'info');
      return;
    }
    const [lat, lon] = this.lastCoord;
    let pool = [];

    if (Array.isArray(state.corridorPois) && state.corridorPois.length > 0) {
      pool = state.corridorPois.filter(p => p.category === 'fuel' || p.category === 'cafe' || p.category === 'gastronomy');
    }
    if (pool.length === 0 && Array.isArray(state.allPlaces) && state.allPlaces.length > 0) {
      pool = state.allPlaces.filter(p => p.category === 'fuel' || p.category === 'cafe' || p.category === 'gastronomy');
    }

    if (pool.length === 0) {
      const isEn = (window.state && window.state.lang === 'en');
      showToast(isEn ? 'No fuel station or rest stop found nearby.' : 'Yakında benzinlik veya mola noktası bulunamadı.', 'info');
      return;
    }

    // Rank by distance from rider, requiring at least 150m ahead
    const scored = pool.map(item => {
      const d = haversineMeters(lat, lon, item.lat, item.lon);
      return { ...item, distMeters: d };
    }).filter(item => item.distMeters >= 150).sort((a, b) => a.distMeters - b.distMeters);

    if (scored.length === 0) {
      const isEn = (window.state && window.state.lang === 'en');
      showToast(isEn ? 'No station ahead within range.' : 'İleride menzil içinde istasyon bulunamadı.', 'info');
      return;
    }

    const nearest = scored[0];
    this.pendingFuelStop = nearest;
    this.showFuelBanner(nearest);
  },

  showFuelBanner(spot) {
    const banner = document.getElementById('live-nav-fuel-banner');
    const nameEl = document.getElementById('live-nav-fuel-name');
    const distEl = document.getElementById('live-nav-fuel-dist');
    if (!banner || !nameEl) return;

    const distKm = (spot.distMeters / 1000).toFixed(1);
    const isEn = (window.state && window.state.lang === 'en');
    let catLabel = spot.category === 'fuel' ? 'Akaryakıt İstasyonu' : 'Mola & Dinlenme';
    if (isEn) catLabel = spot.category === 'fuel' ? 'Fuel Station' : 'Rest Stop & Cafe';

    nameEl.textContent = spot.name;
    if (distEl) distEl.textContent = `${distKm} km • ${catLabel}`;

    banner.classList.remove('hidden');
    if (this.fuelBannerTimer) clearTimeout(this.fuelBannerTimer);
    this.fuelBannerTimer = setTimeout(() => {
      this.dismissFuelBanner();
    }, 12000);

    // Benzinlik için sesli uyarı kapatıldı (Kullanıcı talebi: Benzinlikleri sesli uyarı olarak vermesin, sadece tarihi yerler sesli uyarılır)
  },

  dismissFuelBanner() {
    const banner = document.getElementById('live-nav-fuel-banner');
    if (banner) banner.classList.add('hidden');
    if (this.fuelBannerTimer) {
      clearTimeout(this.fuelBannerTimer);
      this.fuelBannerTimer = null;
    }
  },

  addPendingFuelStop() {
    if (!this.pendingFuelStop) return;
    const spot = this.pendingFuelStop;
    this.dismissFuelBanner();
    this.addFuelStopToRoute(spot);
  },

  async addFuelStopToRoute(spot) {
    const isEn = (window.state && window.state.lang === 'en');
    showToast(isEn ? `Adding ${spot.name} to route...` : `${spot.name} ara durak olarak ekleniyor...`, 'info');

    // Add intermediate waypoint before destination
    const valid = (state.waypoints || []).filter(w => w.lat !== null && w.lon !== null);
    const insertIdx = Math.max(1, state.waypoints.length - 1);
    const newWp = {
      id: 'fuel_' + Date.now(),
      lat: spot.lat,
      lon: spot.lon,
      name: spot.name,
      address: spot.description || (spot.category === 'fuel' ? 'Akaryakıt İstasyonu' : 'Mola Noktası')
    };

    state.waypoints.splice(insertIdx, 0, newWp);
    if (typeof renderWaypoints === 'function') renderWaypoints();

    try {
      await calculateRouteMain();
      showToast(isEn ? `${spot.name} added, route updated!` : `${spot.name} rotaya eklendi, güzergah güncellendi!`, 'success');
      if (this.voiceEnabled) {
        this.speak(isEn ? `${spot.name} added to route.` : `${spot.name} rotaya durak olarak eklendi.`);
      }
      if (this.lastCoord && map) {
        map.flyTo(this.lastCoord, 18, { duration: 0.8 });
      }
    } catch (err) {
      console.error('Error adding fuel stop to route:', err);
      showToast(isEn ? 'Failed to update route.' : 'Rota güncellenemedi.', 'error');
    }
  },

  onDestinationReached() {
    const isEn = (window.state && window.state.lang === 'en');
    const msg = isEn ? 'You have arrived at your destination! Congratulations!' : 'Hedefe ulaştınız! Tebrikler!';
    if (this.voiceEnabled) {
      this.speak(msg);
    }
    showToast(msg, 'success');
    this.stop(true);
  },

  recenterMap() {
    this.autoCenter = true;
    const recenterPill = document.getElementById('live-nav-recenter-pill-box');
    if (recenterPill) recenterPill.classList.add('hidden');
    if (this.lastCoord && map) {
      map.flyTo(this.lastCoord, 18, { duration: 0.8 });
      if (this.compassMode === 'heading') {
        this.updateMapHeading(this.lastHeading || 0);
      }
      const isEn = (window.state && window.state.lang === 'en');
      showToast(isEn ? 'Camera centered & locked to road' : 'Harita sürücüye odaklandı ve kilitlendi', 'info');
    }
  },

  showRideSummary() {
    const modal = document.getElementById('modal-ride-summary');
    if (!modal) return;

    const isEn = (window.state && window.state.lang === 'en');

    // Route title
    const valid = (state.waypoints || []).filter(w => w.lat !== null && w.lon !== null);
    let routeTitle = 'Rotam Sürüşü';
    if (this.wasFreeRide) {
      routeTitle = isEn ? 'Free Ride (Cockpit)' : 'Serbest Sürüş (Kokpit)';
    } else if (valid.length >= 2) {
      routeTitle = `${valid[0].name || (isEn ? 'Start' : 'Başlangıç')} → ${valid[valid.length - 1].name || (isEn ? 'Destination' : 'Varış')}`;
    }
    const nameEl = document.getElementById('summary-route-name');
    if (nameEl) nameEl.textContent = routeTitle;

    // Duration calculation
    const elapsedMs = this.startTime ? (Date.now() - this.startTime) : 0;
    const totalMinutes = Math.max(1, Math.round(elapsedMs / 60000));
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const durationStr = h > 0 ? (isEn ? `${h}h ${m}m` : `${h} sa ${m} dk`) : (isEn ? `${m} min` : `${m} dk`);
    const durEl = document.getElementById('summary-duration');
    if (durEl) durEl.textContent = durationStr;

    // Distance calculation: use real traveled distance, or simulation/route distance fallback
    let distKm = this.distanceTraveledM / 1000;
    if (distKm < 0.2 && state.routeData && state.routeData.summary) {
      distKm = state.routeData.summary.distance;
    }
    const distEl = document.getElementById('summary-dist');
    if (distEl) distEl.textContent = `${distKm.toFixed(1)} km`;

    // Speeds
    let avgSpeed = 0;
    if (this.speedHistory.length > 0) {
      const sum = this.speedHistory.reduce((a, b) => a + b, 0);
      avgSpeed = Math.round(sum / this.speedHistory.length);
    } else if (distKm > 0 && totalMinutes > 0) {
      avgSpeed = Math.round((distKm / (totalMinutes / 60)));
      if (avgSpeed > 140) avgSpeed = 85;
    } else {
      avgSpeed = 75;
    }
    const avgEl = document.getElementById('summary-avg-speed');
    if (avgEl) avgEl.textContent = `${avgSpeed} ${isEn ? 'km/h' : 'km/s'}`;

    let maxSpeed = this.maxSpeed > 0 ? Math.round(this.maxSpeed) : Math.round(avgSpeed * 1.25);
    if (maxSpeed > 180) maxSpeed = 135;
    const maxEl = document.getElementById('summary-max-speed');
    if (maxEl) maxEl.textContent = `${maxSpeed} ${isEn ? 'km/h' : 'km/s'}`;

    // Elevation Gain
    let elevationGain = 0;
    if (state.elevationProfile && Array.isArray(state.elevationProfile)) {
      for (let i = 1; i < state.elevationProfile.length; i++) {
        const diff = state.elevationProfile[i] - state.elevationProfile[i - 1];
        if (diff > 0) elevationGain += diff;
      }
    }
    if (elevationGain === 0) {
      elevationGain = Math.round(distKm * 2.8 + 120);
    }
    const elevEl = document.getElementById('summary-elevation');
    if (elevEl) elevEl.textContent = `+${Math.round(elevationGain)} m`;

    // POIs / stops count
    const poisCount = Math.max(this.notifiedPois.size, valid.length - 2 > 0 ? valid.length - 2 : 1);
    const poisEl = document.getElementById('summary-pois-count');
    if (poisEl) poisEl.textContent = `${poisCount} ${isEn ? 'Stops' : 'Nokta'}`;

    modal.classList.remove('hidden');
    if (typeof initIcons === 'function') initIcons();
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
    if (typeof RotamSpeech !== 'undefined') {
      RotamSpeech.speak(text, { rate: 1.02 });
      return;
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
  },

  toggleCompassOrientation() {
    const isEn = (window.state && window.state.lang === 'en');
    const needleEl = document.getElementById('live-nav-compass-needle');
    const compassBtn = document.getElementById('live-nav-btn-compass');

    if (this.compassMode === 'heading') {
      this.compassMode = 'north';
      showToast(isEn ? '🧭 North-Up: Fixed North mode' : '🧭 Sabit Kuzey Modu', 'info');
      this.updateMapHeading(0);
      if (needleEl) needleEl.style.transform = 'rotate(0deg)';
      if (compassBtn) compassBtn.classList.remove('compass-heading-active');
      if (map && this.lastCoord) {
        map.panTo(this.lastCoord, { animate: true });
      }
    } else {
      this.compassMode = 'heading';
      showToast(isEn ? '🧭 Rotating Map: Heading-Up active' : '🧭 Dönen Harita: Sürüş Yönü Takip Modu', 'info');
      if (compassBtn) compassBtn.classList.add('compass-heading-active');
      this.updateMapHeading(this.lastHeading || 0);
      this.recenterMap();
    }
  },

  toggleOverviewOrRecenter() {
    const isEn = (window.state && window.state.lang === 'en');
    const overviewIcon = document.getElementById('live-nav-overview-icon');

    // If user has panned away while riding, first tap re-centers the camera on the rider!
    if (!this.autoCenter && !this.isOverviewMode) {
      this.recenterMap();
      return;
    }

    if (!this.isOverviewMode) {
      this.isOverviewMode = true;
      this.autoCenter = false;
      this.updateMapHeading(0); // Reset map rotation while viewing full overview
      if (overviewIcon) overviewIcon.setAttribute('data-lucide', 'locate-fixed');
      if (map && state.routeLayer) {
        try {
          map.fitBounds(state.routeLayer.getBounds(), { padding: [60, 60], animate: true, duration: 1.0 });
        } catch (e) {
          // ignore
        }
      }
      showToast(isEn ? 'Route Overview mode' : 'Rota Genel Bakış Modu', 'info');
    } else {
      this.isOverviewMode = false;
      this.autoCenter = true;
      if (overviewIcon) overviewIcon.setAttribute('data-lucide', 'crosshair');
      this.recenterMap();
      this.updateMapHeading(this.lastHeading || 0); // Re-apply heading rotation
    }
    if (typeof initIcons === 'function') initIcons();
  },

  openIncidentReportModal() {
    const modal = document.getElementById('modal-incident-report');
    if (modal) modal.classList.remove('hidden');
    if (typeof initIcons === 'function') initIcons();
  },

  closeIncidentReportModal() {
    const modal = document.getElementById('modal-incident-report');
    if (modal) modal.classList.add('hidden');
  },

  submitIncidentReport(type) {
    this.closeIncidentReportModal();
    const coord = (this.lastCoord && this.lastCoord.length >= 2)
      ? { lat: this.lastCoord[0], lon: this.lastCoord[1] }
      : (state.userLocation || (state.waypoints[0]?.lat ? { lat: state.waypoints[0].lat, lon: state.waypoints[0].lon } : { lat: 41.0082, lon: 28.9784 }));

    if (typeof RotamCommunity !== 'undefined') {
      RotamCommunity.reportIncident(type, coord);
    }
  }
};

// ==========================================
// ROTAM OFFLINE MAP & CORRIDOR CACHE ENGINE
// ==========================================
const RotamOfflineMap = {
  isDownloading: false,
  cancelRequested: false,
  CACHE_NAME: 'rotam-tiles-v1',

  latLonToTile(lat, lon, zoom) {
    const rad = (lat * Math.PI) / 180;
    const n = Math.pow(2, zoom);
    const x = Math.floor(((lon + 180) / 360) * n);
    const y = Math.floor(
      ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n
    );
    return {
      x: Math.max(0, Math.min(n - 1, x)),
      y: Math.max(0, Math.min(n - 1, y)),
      z: zoom
    };
  },

  async getStats() {
    if (!('caches' in window)) return { count: 0, sizeMb: '0.0' };
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const keys = await cache.keys();
      const count = keys.length;
      const sizeMb = ((count * 18) / 1024).toFixed(1);
      return { count, sizeMb };
    } catch (e) {
      return { count: 0, sizeMb: '0.0' };
    }
  },

  async updateStatsUI() {
    const stats = await this.getStats();
    const countEl = document.getElementById('offline-stats-count');
    const sizeEl = document.getElementById('offline-stats-size');
    const badgeEl = document.getElementById('mobile-offline-badge');

    if (countEl) countEl.textContent = `${stats.count.toLocaleString()} karo`;
    if (sizeEl) sizeEl.textContent = `~${stats.sizeMb} MB`;
    if (badgeEl) {
      badgeEl.textContent = stats.count > 0 ? `${stats.sizeMb}MB` : 'İndir';
    }
  },

  openModal() {
    const modal = document.getElementById('modal-offline-maps');
    if (modal) modal.classList.remove('hidden');
    this.updateStatsUI();
    this.updateRoutePreviewUI();
    if (typeof initIcons === 'function') initIcons();
  },

  closeModal() {
    if (this.isDownloading) {
      const isEn = (window.state && window.state.lang === 'en');
      const confirmCancel = confirm(
        isEn
          ? 'Download is in progress. Do you want to cancel?'
          : 'Harita indirme işlemi devam ediyor. İptal etmek istiyor musunuz?'
      );
      if (confirmCancel) {
        this.cancelRequested = true;
      } else {
        return;
      }
    }
    const modal = document.getElementById('modal-offline-maps');
    if (modal) modal.classList.add('hidden');
  },

  updateRoutePreviewUI() {
    const routeBox = document.getElementById('offline-active-route-box');
    const noRouteBox = document.getElementById('offline-no-route-box');
    const routeInfoEl = document.getElementById('offline-route-info');
    const isEn = (window.state && window.state.lang === 'en');

    if (state.routeData && state.routeData.geometry && state.routeData.geometry.coordinates) {
      if (routeBox) routeBox.classList.remove('hidden');
      if (noRouteBox) noRouteBox.classList.add('hidden');
      if (routeInfoEl) {
        const km = (state.routeData.distance / 1000).toFixed(0);
        routeInfoEl.textContent = isEn
          ? `Active Route: ${km} km Corridor (Zoom 7-13)`
          : `Aktif Rota: ${km} km Sürüş Koridoru (Zoom 7-13)`;
      }
    } else {
      if (routeBox) routeBox.classList.add('hidden');
      if (noRouteBox) noRouteBox.classList.remove('hidden');
    }
  },

  async clearCache() {
    const isEn = (window.state && window.state.lang === 'en');
    const msg = isEn
      ? 'Are you sure you want to delete all offline downloaded map tiles?'
      : 'İndirilen tüm çevrimdışı harita karolarını silmek istediğinize emin misiniz?';
    if (!confirm(msg)) return;

    try {
      if ('caches' in window) {
        await caches.delete(this.CACHE_NAME);
        await caches.open(this.CACHE_NAME);
      }
      showToast(isEn ? 'Offline tile cache cleared' : 'Çevrimdışı harita önbelleği temizlendi', 'info');
      this.updateStatsUI();
    } catch (e) {
      console.warn('Clear cache error:', e);
    }
  },

  async downloadCurrentRoute() {
    if (!state.routeData || !state.routeData.geometry || !state.routeData.geometry.coordinates) {
      const isEn = (window.state && window.state.lang === 'en');
      showToast(
        isEn
          ? 'Please create a route first to download its offline corridor map.'
          : 'Lütfen önce bir rota oluşturun.',
        'info'
      );
      this.openModal();
      return;
    }

    const coords = state.routeData.geometry.coordinates; // [lon, lat]
    const tileSet = new Set();

    // Sample route points (every ~1km or at least 150 points along the path)
    const step = Math.max(1, Math.floor(coords.length / 200));
    const sampled = [];
    for (let i = 0; i < coords.length; i += step) {
      sampled.push(coords[i]);
    }
    if (sampled[sampled.length - 1] !== coords[coords.length - 1]) {
      sampled.push(coords[coords.length - 1]);
    }

    // Generate tiles for zoom levels 7 to 13 with corridor buffer
    for (const [lon, lat] of sampled) {
      for (let z = 7; z <= 13; z++) {
        const t = this.latLonToTile(lat, lon, z);
        tileSet.add(`${z}/${t.x}/${t.y}`);
        if (z >= 11) {
          tileSet.add(`${z}/${t.x + 1}/${t.y}`);
          tileSet.add(`${z}/${t.x - 1}/${t.y}`);
          tileSet.add(`${z}/${t.x}/${t.y + 1}`);
          tileSet.add(`${z}/${t.x}/${t.y - 1}`);
        }
      }
    }

    const tilesArray = Array.from(tileSet).map((k) => {
      const [z, x, y] = k.split('/');
      return { z: parseInt(z), x: parseInt(x), y: parseInt(y) };
    });

    const isEn = (window.state && window.state.lang === 'en');
    await this.executeTileBatchDownload(
      tilesArray,
      isEn ? 'Downloading Route Corridor Map' : 'Aktif Rota Koridoru İndiriliyor'
    );
  },

  async downloadRegion(regionKey) {
    const isEn = (window.state && window.state.lang === 'en');
    let bounds = null;
    let minZ = 7;
    let maxZ = 11;
    let title = '';

    if (regionKey === 'turkey_overview') {
      bounds = { minLat: 35.8, maxLat: 42.2, minLon: 25.8, maxLon: 44.6 };
      minZ = 5;
      maxZ = 7;
      title = isEn ? 'Turkey Overview' : 'Türkiye Genel Bakış';
    } else if (regionKey === 'aegean_med') {
      bounds = { minLat: 36.2, maxLat: 38.8, minLon: 26.5, maxLon: 32.2 };
      minZ = 7;
      maxZ = 11;
      title = isEn ? 'Aegean & Mediterranean' : 'Ege & Akdeniz Sahilleri';
    } else if (regionKey === 'marmara') {
      bounds = { minLat: 40.0, maxLat: 41.6, minLon: 26.8, maxLon: 30.2 };
      minZ = 7;
      maxZ = 11;
      title = isEn ? 'Marmara Region' : 'Marmara & Boğazlar';
    } else if (regionKey === 'blacksea') {
      bounds = { minLat: 40.5, maxLat: 41.8, minLon: 36.5, maxLon: 41.8 };
      minZ = 7;
      maxZ = 11;
      title = isEn ? 'Black Sea Highlands' : 'Karadeniz & Yaylalar';
    }

    if (!bounds) return;

    const tileSet = new Set();
    for (let z = minZ; z <= maxZ; z++) {
      const tl = this.latLonToTile(bounds.maxLat, bounds.minLon, z);
      const br = this.latLonToTile(bounds.minLat, bounds.maxLon, z);
      for (let x = Math.min(tl.x, br.x); x <= Math.max(tl.x, br.x); x++) {
        for (let y = Math.min(tl.y, br.y); y <= Math.max(tl.y, br.y); y++) {
          tileSet.add(`${z}/${x}/${y}`);
        }
      }
    }

    const tilesArray = Array.from(tileSet).map((k) => {
      const [z, x, y] = k.split('/');
      return { z: parseInt(z), x: parseInt(x), y: parseInt(y) };
    });

    await this.executeTileBatchDownload(tilesArray, title);
  },

  async executeTileBatchDownload(tiles, label) {
    if (this.isDownloading) return;
    if (!('caches' in window)) {
      showToast('Tarayıcınız CacheStorage API desteklemiyor.', 'error');
      return;
    }

    this.isDownloading = true;
    this.cancelRequested = false;

    const progressBox = document.getElementById('offline-progress-box');
    const progressBar = document.getElementById('offline-progress-bar');
    const progressText = document.getElementById('offline-progress-text');
    const progressLabel = document.getElementById('offline-progress-label');

    if (progressBox) progressBox.classList.remove('hidden');
    if (progressLabel) progressLabel.textContent = label;

    const total = tiles.length;
    let completed = 0;
    const isEn = (window.state && window.state.lang === 'en');

    try {
      const cache = await caches.open(this.CACHE_NAME);
      const concurrency = 6;

      for (let i = 0; i < total; i += concurrency) {
        if (this.cancelRequested) {
          showToast(isEn ? 'Download cancelled' : 'İndirme iptal edildi', 'info');
          break;
        }

        const chunk = tiles.slice(i, i + concurrency);
        await Promise.all(
          chunk.map(async ({ z, x, y }) => {
            const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
            try {
              const match = await cache.match(url);
              if (!match) {
                const res = await fetch(url, { mode: 'cors' });
                if (res.ok) {
                  await cache.put(url, res);
                }
              }
            } catch (err) {
              // Ignore single tile fetch failures
            }
            completed++;
          })
        );

        const pct = Math.min(100, Math.round((completed / total) * 100));
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (progressText) {
          progressText.textContent = `${completed} / ${total} (%${pct})`;
        }
      }

      if (!this.cancelRequested) {
        showToast(
          isEn
            ? `✅ Offline map ready (${completed} tiles saved)!`
            : `✅ Çevrimdışı harita hazır (${completed} karo kaydedildi)!`,
          'success'
        );
      }
    } catch (err) {
      console.warn('Tile batch download error:', err);
      showToast(isEn ? 'Offline download error.' : 'İndirme sırasında bir hata oluştu.', 'error');
    } finally {
      this.isDownloading = false;
      this.cancelRequested = false;
      if (progressBox) progressBox.classList.add('hidden');
      this.updateStatsUI();
    }
  }
};

window.RotamOfflineMap = RotamOfflineMap;

// Global Online/Offline Event Listeners
window.addEventListener('online', () => {
  const isEn = (window.state && window.state.lang === 'en');
  showToast(isEn ? '🌐 Internet connection restored' : '🌐 İnternet bağlantısı sağlandı', 'success');
  const badge = document.getElementById('offline-network-badge');
  if (badge) badge.classList.add('hidden');
});

window.addEventListener('offline', () => {
  const isEn = (window.state && window.state.lang === 'en');
  showToast(isEn ? '📡 Offline mode active (Saved maps ready)' : '📡 Çevrimdışı mod: İndirilen haritalar devrede', 'info');
  const badge = document.getElementById('offline-network-badge');
  if (badge) badge.classList.remove('hidden');
});

// ==========================================
// ROTAM COMMUNITY LIVE HAZARD & INCIDENT NETWORK (WAZE STYLE REALTIME SYNC)
// ==========================================
const RotamCommunity = {
  incidents: [],
  markers: {},
  activeHazardAlert: null,
  dismissedHazardIds: new Set(),
  layerVisible: true,
  eventSource: null,
  cloudEndpoint: 'https://rotam-live-default-rtdb.firebaseio.com/incidents',

  // Pre-seeded realistic community hazards across Turkey routes
  seedDefaults: [
    {
      id: 'seed-1',
      type: 'radar',
      title: 'Radar / Polis Denetimi',
      emoji: '🚔',
      lat: 41.0560,
      lon: 29.0200,
      reportedAt: Date.now() - 14 * 60 * 1000,
      expiresAt: Date.now() + 60 * 60 * 1000,
      upvotes: 4,
      downvotes: 0,
      note: 'Boğaziçi Köprüsü çıkışı mobil radar aracı'
    },
    {
      id: 'seed-2',
      type: 'oil',
      title: 'Kaygan Zemin / Yağ Sızıntısı',
      emoji: '⚠️',
      lat: 41.1350,
      lon: 29.4120,
      reportedAt: Date.now() - 22 * 60 * 1000,
      expiresAt: Date.now() + 75 * 60 * 1000,
      upvotes: 6,
      downvotes: 0,
      note: 'Şile yolu virajında mazot birikintisi, dikkat!'
    },
    {
      id: 'seed-3',
      type: 'crash',
      title: 'Trafik Kazası',
      emoji: '💥',
      lat: 40.9850,
      lon: 28.8720,
      reportedAt: Date.now() - 10 * 60 * 1000,
      expiresAt: Date.now() + 50 * 60 * 1000,
      upvotes: 3,
      downvotes: 0,
      note: 'D100 Avcılar yönü sol şerit kapalı'
    },
    {
      id: 'seed-4',
      type: 'work',
      title: 'Yol Çalışması / Asfalt',
      emoji: '🚧',
      lat: 40.8520,
      lon: 29.3520,
      reportedAt: Date.now() - 35 * 60 * 1000,
      expiresAt: Date.now() + 180 * 60 * 1000,
      upvotes: 5,
      downvotes: 0,
      note: 'Kuzey Marmara Otoyolu gişeler öncesi şerit daralması'
    },
    {
      id: 'seed-5',
      type: 'radar',
      title: 'Polis Kontrol Noktası',
      emoji: '🚔',
      lat: 36.9850,
      lon: 28.3240,
      reportedAt: Date.now() - 18 * 60 * 1000,
      expiresAt: Date.now() + 80 * 60 * 1000,
      upvotes: 5,
      downvotes: 0,
      note: 'Marmaris - Sakar Geçidi inişi radar kontrolü'
    }
  ],

  getRawEndpoint() {
    try {
      return localStorage.getItem('rotam_firebase_endpoint') || '';
    } catch (e) {
      return '';
    }
  },

  getEndpoint() {
    let ep = sanitizeFirebaseDbUrl(this.getRawEndpoint());
    if (!ep) {
      ep = sanitizeFirebaseDbUrl(this.cloudEndpoint);
    }
    if (!ep) {
      ep = 'https://rotam-live-default-rtdb.firebaseio.com';
    }
    return ep + '/incidents';
  },

  init() {
    this.loadLocalIncidents();
    this.syncCloud();
    this.startLiveStream();
    // Background polling fallback every 60 seconds
    setInterval(() => this.syncCloud(), 60000);
  },

  startLiveStream() {
    if (typeof EventSource === 'undefined') return;
    if (this.eventSource) {
      try { this.eventSource.close(); } catch(e){}
      this.eventSource = null;
    }

    const ep = this.getEndpoint();
    if (!ep || ep.includes('rotam-community-live-default-rtdb')) return;

    try {
      this.eventSource = new EventSource(`${ep}.json`);

      this.eventSource.addEventListener('put', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed) {
            if (parsed.path === '/' && parsed.data && typeof parsed.data === 'object') {
              Object.values(parsed.data).forEach(r => {
                if (!r || !r.id) return;
                const idx = this.incidents.findIndex(i => i.id === r.id);
                if (idx >= 0) this.incidents[idx] = { ...this.incidents[idx], ...r };
                else this.incidents.push(r);
              });
              this.cleanExpired();
              this.renderOnMap();
            } else if (parsed.data && parsed.data.id) {
              const r = parsed.data;
              const idx = this.incidents.findIndex(i => i.id === r.id);
              if (idx >= 0) this.incidents[idx] = { ...this.incidents[idx], ...r };
              else this.incidents.unshift(r);
              this.cleanExpired();
              this.renderOnMap();
            }
          }
        } catch (err) {}
      });

      this.eventSource.addEventListener('patch', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed && parsed.data && parsed.path) {
            const key = parsed.path.replace(/^\//, '');
            const idx = this.incidents.findIndex(i => i.id === key);
            if (idx >= 0) {
              this.incidents[idx] = { ...this.incidents[idx], ...parsed.data };
              this.cleanExpired();
              this.renderOnMap();
            }
          }
        } catch (err) {}
      });
    } catch (err) {
      console.warn('Firebase EventSource stream connection error:', err);
    }
  },

  loadLocalIncidents() {
    try {
      const stored = localStorage.getItem('rotam_community_incidents');
      if (stored) {
        this.incidents = JSON.parse(stored);
      }
    } catch (e) {}

    if (!this.incidents || this.incidents.length === 0) {
      this.incidents = [...this.seedDefaults];
      this.saveLocal();
    }
    this.cleanExpired();
  },

  saveLocal() {
    try {
      localStorage.setItem('rotam_community_incidents', JSON.stringify(this.incidents));
    } catch (e) {}
  },

  cleanExpired() {
    const now = Date.now();
    this.incidents = this.incidents.filter(inc => {
      return (inc.expiresAt > now) && (inc.downvotes < 3);
    });
    this.saveLocal();
  },

  async syncCloud() {
    this.cleanExpired();
    const ep = this.getEndpoint();
    try {
      const res = await fetch(`${ep}.json`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          const remoteList = Object.keys(data).map(k => ({ ...data[k], cloudKey: k }));
          remoteList.forEach(r => {
            const idx = this.incidents.findIndex(i => i.id === r.id);
            if (idx >= 0) {
              this.incidents[idx] = { ...this.incidents[idx], ...r };
            } else {
              this.incidents.push(r);
            }
          });
          this.cleanExpired();
        }
      }
    } catch (e) {
      // Offline fallback: keep running smoothly with local storage
    }
    this.renderOnMap();
  },

  async reportIncident(type, coord, note = '') {
    if (!coord || !coord.lat || !coord.lon) {
      coord = state.userLocation || { lat: 41.0082, lon: 28.9784 };
    }

    const typeConfig = {
      radar: { title: 'Radar / Polis Denetimi', emoji: '🚔', ttlMs: 90 * 60 * 1000 },
      crash: { title: 'Trafik Kazası', emoji: '💥', ttlMs: 60 * 60 * 1000 },
      oil: { title: 'Kaygan Zemin / Yağ Sızıntısı', emoji: '⚠️', ttlMs: 120 * 60 * 1000 },
      work: { title: 'Yol Çalışması / Asfalt', emoji: '🚧', ttlMs: 240 * 60 * 1000 },
      blocked: { title: 'Yol Kapalı / Heyelan', emoji: '⛔', ttlMs: 90 * 60 * 1000 },
      fuel: { title: 'Yakıt / Dinlenme İstasyonu', emoji: '⛽', ttlMs: 360 * 60 * 1000 },
      camper: { title: 'Karavan Su / Kamp Alanı', emoji: '🚐', ttlMs: 720 * 60 * 1000 }
    };

    const cfg = typeConfig[type] || typeConfig.radar;
    const now = Date.now();
    const newInc = {
      id: 'inc_' + now + '_' + Math.random().toString(36).substr(2, 6),
      type: type,
      title: cfg.title,
      emoji: cfg.emoji,
      lat: coord.lat,
      lon: coord.lon,
      reportedAt: now,
      expiresAt: now + cfg.ttlMs,
      upvotes: 1,
      downvotes: 0,
      note: note || ''
    };

    this.incidents.unshift(newInc);
    this.saveLocal();
    this.renderOnMap();

    // Broadcast async to cloud (Firebase RTDB)
    const ep = this.getEndpoint();
    try {
      fetch(`${ep}/${newInc.id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInc)
      }).catch(() => {});
    } catch (e) {}

    const isEn = (window.state && window.state.lang === 'en');
    showToast(isEn ? `Reported: ${cfg.title} (Live to all riders)` : `Tüm sürücülerle paylaşıldı: ${cfg.title} 📢`, 'success');
    return newInc;
  },

  async voteIncident(id, isUpvote) {
    const inc = this.incidents.find(i => i.id === id);
    if (!inc) return;

    const isAdm = typeof isAdminAuthenticated === 'function' && isAdminAuthenticated();
    let userDistM = Infinity;
    if (state.userLocation && state.userLocation.lat && state.userLocation.lon) {
      userDistM = haversineMeters(state.userLocation.lat, state.userLocation.lon, inc.lat, inc.lon);
    }

    // Harita üzerinden sadece admin tüm noktalara oylama verebilir; normal kullanıcılar sadece yakınsa (<= 1.5 km) oy verebilir
    if (!isAdm && userDistM > 1500) {
      showToast('Harita üzerinden yalnızca Yönetici tüm noktalara oy verebilir. Oylamak için noktaya 1.5 km yakın olmalısınız.', 'warning');
      return;
    }

    if (isAdm) {
      if (isUpvote) {
        inc.upvotes = (inc.upvotes || 0) + 3;
        inc.expiresAt += 30 * 60 * 1000; // Extend by 30 mins
        showToast('👑 Yönetici onayı kaydedildi (+30 dk)! 👍', 'success');
      } else {
        inc.downvotes = (inc.downvotes || 0) + 3;
        showToast('👑 Yönetici bildirimi temizledi ❌', 'info');
      }
    } else {
      if (isUpvote) {
        inc.upvotes = (inc.upvotes || 0) + 1;
        inc.expiresAt += 30 * 60 * 1000;
        showToast('Bildirim doğrulandı! Teşekkürler 👍', 'success');
      } else {
        inc.downvotes = (inc.downvotes || 0) + 1;
        showToast('Yolun temizlendiği bildirildi ❌', 'info');
      }
    }

    this.cleanExpired();
    this.renderOnMap();

    // Sync vote to cloud (Firebase RTDB)
    const ep = this.getEndpoint();
    try {
      fetch(`${ep}/${id}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upvotes: inc.upvotes, downvotes: inc.downvotes, expiresAt: inc.expiresAt })
      }).catch(() => {});
    } catch (e) {}
  },

  async deleteRemoteIncident(id) {
    const ep = this.getEndpoint();
    try {
      fetch(`${ep}/${id}.json`, {
        method: 'DELETE'
      }).catch(() => {});
    } catch (e) {}
  },

  // Kullanıcılar sadece yakın olan noktalardaki uyarıları görebilsin; Admin tüm noktaları görsün
  isHazardVisibleToCurrentViewer(inc) {
    // 1. Yönetici ise haritadaki TÜM noktalar eksiksiz gösterilir
    if (typeof isAdminAuthenticated === 'function' && isAdminAuthenticated()) {
      return true;
    }

    // 2. Kullanıcının aktif GPS konumu varsa (40 km mesafe)
    if (state.userLocation && state.userLocation.lat && state.userLocation.lon) {
      const dUser = haversineMeters(state.userLocation.lat, state.userLocation.lon, inc.lat, inc.lon);
      if (dUser <= 40000) return true;
    }

    // 3. Kullanıcının aktif çizilmiş bir rotası varsa (koridor boyunca 15 km)
    if (state.routeData?.geometry?.coordinates && typeof minDistanceToRoute === 'function') {
      const dRoute = minDistanceToRoute(inc.lat, inc.lon, state.routeData.geometry.coordinates);
      if (dRoute <= 15000) return true;
    }

    // 4. Rota durakları varsa (GPS açılmamış olsa bile başlangıç/varış çevresi 30 km)
    if (state.waypoints && state.waypoints.length > 0) {
      for (const wp of state.waypoints) {
        if (wp.lat !== null && wp.lon !== null) {
          const dWp = haversineMeters(wp.lat, wp.lon, inc.lat, inc.lon);
          if (dWp <= 30000) return true;
        }
      }
    }

    // 5. Harita odağı: Kullanıcı belirli bir bölgeye odaklandıysa (Zoom >= 11, merkezden 25 km)
    if (typeof map !== 'undefined' && map && map.getZoom && map.getZoom() >= 11) {
      const center = map.getCenter();
      const dCenter = haversineMeters(center.lat, center.lng, inc.lat, inc.lon);
      if (dCenter <= 25000) return true;
    }

    // Diğer uzak şehirlerdeki noktalar normal sürücü haritasında gizlenir
    return false;
  },

  renderOnMap() {
    if (!map) return;

    // Remove old markers
    Object.values(this.markers).forEach(m => {
      if (map.hasLayer(m)) map.removeLayer(m);
    });
    this.markers = {};

    if (!this.layerVisible) return;

    const isAdm = typeof isAdminAuthenticated === 'function' && isAdminAuthenticated();

    this.incidents.forEach(inc => {
      // Sadece yakın olanlar (Admin için tümü)
      if (!this.isHazardVisibleToCurrentViewer(inc)) return;

      const minAgo = Math.max(1, Math.round((Date.now() - inc.reportedAt) / 60000));

      let userDistM = Infinity;
      if (state.userLocation && state.userLocation.lat && state.userLocation.lon) {
        userDistM = haversineMeters(state.userLocation.lat, state.userLocation.lon, inc.lat, inc.lon);
      }
      const isCloseEnough = userDistM <= 1500; // 1.5 km içinde mi?

      const iconHtml = `
        <div class="community-hazard-pin hazard-${inc.type} ${isAdm ? 'ring-2 ring-cyan-400' : ''}">
          <span class="hazard-emoji">${inc.emoji || '⚠️'}</span>
          <span class="hazard-pulse"></span>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'community-hazard-divicon',
        html: iconHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20]
      });

      let voteSectionHtml = '';
      if (isAdm) {
        const distStr = userDistM < Infinity ? (userDistM > 1000 ? (userDistM / 1000).toFixed(1) + ' km' : Math.round(userDistM) + 'm') : 'Uzak nokta';
        voteSectionHtml = `
          <div class="mt-2 pt-2 border-t border-slate-700/80">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-[9px] font-bold text-cyan-400 font-mono flex items-center space-x-1">
                <span>👑</span>
                <span>YÖNETİCİ OYLAMASI</span>
              </span>
              <span class="text-[9px] text-slate-400 font-mono">${distStr}</span>
            </div>
            <div class="flex items-center space-x-1.5 mb-1.5">
              <button onclick="RotamCommunity.voteIncident('${inc.id}', true)" class="flex-1 py-1 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 font-bold text-[10px] border border-emerald-500/30 flex items-center justify-center space-x-1 active:scale-95 transition-all">
                <span>👍 Onayla (+30dk)</span>
              </button>
              <button onclick="RotamCommunity.voteIncident('${inc.id}', false)" class="flex-1 py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 font-bold text-[10px] border border-amber-500/30 flex items-center justify-center space-x-1 active:scale-95 transition-all">
                <span>❌ Temizle</span>
              </button>
            </div>
            <button onclick="deleteAdminHazard('${inc.id}')" class="w-full py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-[9px] font-semibold border border-rose-800/40 flex items-center justify-center space-x-1 transition-all">
              <span>🗑️ Bildirimi Doğrudan Kaldır</span>
            </button>
          </div>
        `;
      } else if (isCloseEnough) {
        voteSectionHtml = `
          <div class="mt-2 pt-2 border-t border-slate-700/80">
            <div class="flex items-center justify-between mb-1 text-[9px] text-emerald-400 font-semibold font-mono">
              <span>📍 Yakındasınız (~${Math.round(userDistM)}m)</span>
              <span>Oylayabilirsiniz</span>
            </div>
            <div class="flex items-center space-x-1.5">
              <button onclick="RotamCommunity.voteIncident('${inc.id}', true)" class="flex-1 py-1 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 font-bold text-[10px] border border-emerald-500/30 flex items-center justify-center space-x-1 active:scale-95 transition-all">
                <span>👍 Hala Var</span>
              </button>
              <button onclick="RotamCommunity.voteIncident('${inc.id}', false)" class="flex-1 py-1 px-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 font-bold text-[10px] border border-red-500/30 flex items-center justify-center space-x-1 active:scale-95 transition-all">
                <span>❌ Yol Temiz</span>
              </button>
            </div>
          </div>
        `;
      } else {
        const distStr = userDistM < Infinity ? `${(userDistM / 1000).toFixed(1)} km uzaktasınız` : 'Konumunuz uzak';
        voteSectionHtml = `
          <div class="mt-2 pt-2 border-t border-slate-700/80">
            <div class="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[10px] text-slate-400 text-center space-y-0.5">
              <div class="flex items-center justify-center space-x-1 text-slate-300 font-semibold">
                <span>🔒 Harita Oylaması Kilitli</span>
              </div>
              <p class="text-[9px] text-slate-500 leading-tight">Harita üzerinden sadece Yönetici tüm noktalara oy verebilir. Oylama için tehlikeye 1.5 km yakın olmalısınız (${distStr}).</p>
            </div>
          </div>
        `;
      }

      const popupHtml = `
        <div class="p-2 text-slate-100 max-w-[220px]">
          <div class="flex items-center space-x-2 mb-1.5">
            <span class="text-xl">${inc.emoji || '⚠️'}</span>
            <div class="min-w-0 flex-1">
              <span class="font-bold text-xs text-white block truncate">${inc.title}</span>
              ${inc.isOfficial ? '<span class="inline-block px-1.5 py-0.2 rounded text-[8px] bg-red-500/20 text-red-300 border border-red-500/30 font-bold">Resmi Bildirim</span>' : ''}
            </div>
          </div>
          <p class="text-[10px] text-slate-400 mb-1 font-mono">${minAgo} dakika önce bildirildi</p>
          ${inc.note ? `<p class="text-[11px] text-amber-200 mb-2 italic bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">${inc.note}</p>` : ''}
          <div class="flex items-center justify-between text-[10px] text-slate-300 pt-1 border-t border-slate-700/60 mb-1">
            <span>👍 ${inc.upvotes || 1} onay</span>
            <span>👎 ${inc.downvotes || 0}</span>
          </div>
          ${voteSectionHtml}
        </div>
      `;

      const m = L.marker([inc.lat, inc.lon], { icon: customIcon, zIndexOffset: 800 })
        .bindPopup(popupHtml, { className: 'rotam-popup', maxWidth: 240 })
        .addTo(map);

      this.markers[inc.id] = m;
    });
  },

  checkProximity(userLat, userLon) {
    if (!userLat || !userLon) return;
    const banner = document.getElementById('live-nav-hazard-banner');
    if (!banner) return;

    const ALERT_RADIUS_M = 750;
    let closestHazard = null;
    let closestDist = Infinity;

    this.incidents.forEach(inc => {
      if (this.dismissedHazardIds.has(inc.id)) return;
      const d = haversineMeters(userLat, userLon, inc.lat, inc.lon);
      if (d < ALERT_RADIUS_M && d < closestDist) {
        closestDist = d;
        closestHazard = inc;
      }
    });

    if (closestHazard) {
      this.activeHazardAlert = closestHazard;
      const titleEl = document.getElementById('live-hazard-title');
      const subEl = document.getElementById('live-hazard-sub');
      const iconEl = document.getElementById('live-hazard-icon');

      if (titleEl) titleEl.textContent = `🚨 ${Math.round(closestDist)}m İleride ${closestHazard.title}!`;
      const minAgo = Math.max(1, Math.round((Date.now() - closestHazard.reportedAt) / 60000));
      if (subEl) subEl.textContent = `Topluluk: 👍 ${closestHazard.upvotes || 1} sürücü onayladı (${minAgo} dk önce)`;
      if (iconEl) iconEl.textContent = closestHazard.emoji || '⚠️';

      banner.classList.remove('hidden');

      try {
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
      } catch (e) {}
    } else {
      if (!this.activeHazardAlert) {
        banner.classList.add('hidden');
      }
    }
  },

  confirmActiveHazard(isConfirmed) {
    const banner = document.getElementById('live-nav-hazard-banner');
    if (this.activeHazardAlert) {
      this.dismissedHazardIds.add(this.activeHazardAlert.id);
      this.voteIncident(this.activeHazardAlert.id, isConfirmed);
      this.activeHazardAlert = null;
    }
    if (banner) banner.classList.add('hidden');
  },

  toggleLayer() {
    this.layerVisible = !this.layerVisible;
    this.renderOnMap();
    const btn = document.getElementById('btn-toggle-community-hazards');
    if (btn) btn.classList.toggle('active', this.layerVisible);
    const mobileStatus = document.getElementById('mobile-community-status');
    if (mobileStatus) {
      mobileStatus.textContent = this.layerVisible ? 'Aktif' : 'Kapalı';
      mobileStatus.className = this.layerVisible ? 'text-[10px] text-emerald-400 font-bold' : 'text-[10px] text-slate-500 font-bold';
    }
    const isEn = (window.state && window.state.lang === 'en');
    showToast(this.layerVisible ? '🚨 Canlı Topluluk Uyarıları Açık' : 'Topluluk Uyarıları Gizlendi', 'info');
  }
};
window.RotamCommunity = RotamCommunity;
window.openCommunityReportModal = function() {
  LiveNavigation.openIncidentReportModal();
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

window.shareRideSummary = function() {
  const isEn = (window.state && window.state.lang === 'en');
  const routeName = document.getElementById('summary-route-name')?.textContent || 'Rotam';
  const dist = document.getElementById('summary-dist')?.textContent || '0 km';
  const dur = document.getElementById('summary-duration')?.textContent || '0 dk';
  const avg = document.getElementById('summary-avg-speed')?.textContent || '0 km/s';
  const max = document.getElementById('summary-max-speed')?.textContent || '0 km/s';
  const elev = document.getElementById('summary-elevation')?.textContent || '0 m';
  const pois = document.getElementById('summary-pois-count')?.textContent || '0';

  const shareText = isEn
    ? `🏍️ ROTAM - Ride Report Card\n📍 Route: ${routeName}\n🛣️ Traveled: ${dist}\n⏱️ Duration: ${dur}\n⚡ Speeds: Avg ${avg} | Max ${max}\n⛰️ Elevation: ${elev}\n🎯 Stops Visited: ${pois}\n\nTrack your adventure: https://rotam.app`
    : `🏍️ ROTAM - Sürüş Karnem\n📍 Güzergah: ${routeName}\n🛣️ Kat Edilen Yol: ${dist}\n⏱️ Sürüş Süresi: ${dur}\n⚡ Hızlar: Ort ${avg} | Maks ${max}\n⛰️ Tırmanış: ${elev}\n🎯 Keşfedilen Duraklar: ${pois}\n\nSen de rotanı keşfet: https://rotam.app`;

  if (navigator.share) {
    navigator.share({
      title: isEn ? 'Rotam Ride Report' : 'Rotam Sürüş Karnesi',
      text: shareText
    }).catch(err => {
      console.warn('Share canceled/failed:', err);
    });
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(shareText).then(() => {
      showToast(isEn ? 'Ride report copied to clipboard!' : 'Sürüş karnesi panoya kopyalandı!', 'success');
    }).catch(() => {
      showToast(isEn ? 'Could not copy to clipboard.' : 'Panoya kopyalanamadı.', 'error');
    });
  } else {
    showToast(shareText, 'info');
  }
};

window.closeRideSummaryModal = function() {
  const modal = document.getElementById('modal-ride-summary');
  if (modal) modal.classList.add('hidden');
};

window.LiveNavigation = LiveNavigation;

// Re-request Screen Wake Lock when tab becomes visible again
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && LiveNavigation.isActive) {
    LiveNavigation.requestWakeLock();
  }
});

// ==========================================
// ROTAM AKILLI KÜLTÜR & TARİH FISILTISI (SMART STORY GUIDE)
// ==========================================
const RotamStoryGuide = {
  enabled: true,
  lastSpokenTimestamp: 0,
  minIntervalMs: 150000, // 2.5 dakika mola (aşırı konuşmayı engeller)
  toldStoryIds: new Set(),
  activeStory: null,
  bannerTimeout: null,

  curatedStories: [
    {
      id: 'story-sakar',
      title: 'Sakar Geçidi & Gökova Körfezi',
      lat: 37.0678,
      lon: 28.3412,
      radiusM: 3000,
      teaser: 'Ege\'nin en nefes kesici virajlarına hoş geldiniz. Deniz seviyesinden 670 metre yükseklikten Gökova Körfezi\'ne iniyorsunuz.',
      story: 'Sakar Geçidi, Ege ve Akdeniz motorcularının kutsal viraj rotasıdır. Deniz seviyesinden 670 metre irtifadan Gökova maviliğine keskin "S" virajlarıyla süzülürsünüz. Gün batımında seyir terasında durup körfeze bakmak, rüzgarın fısıltısını dinlemek ve Halikarnas Balıkçısı\'nın aşkla anlattığı mavi yolculuğun başlangıcını hissetmek paha biçilemezdir.'
    },
    {
      id: 'story-kaputas',
      title: 'Kaputaş Kanyonu & Turkuaz Virajlar',
      lat: 36.2287,
      lon: 29.4491,
      radiusM: 2500,
      teaser: 'Kaş ile Kalkan arasında, kanyonun denizle buluştuğu efsanevi turkuaz kumsal.',
      story: 'Kaputaş Kanyonu, Likya yolunun en görkemli noktalarından biridir. Dağlardan sızan yer altı sularının denizle buluşması sayesinde suyun rengi eşsiz bir turkuaz tona bürünür. Uçurumun kenarındaki virajlar hem sürüş keyfi hem de antik Likya krallarının izlerini taşır.'
    },
    {
      id: 'story-bolu',
      title: 'Bolu Dağı Eski Geçidi',
      lat: 40.7421,
      lon: 31.4285,
      radiusM: 3500,
      teaser: 'Sisli çam ormanları, meşhur tırmanış virajları ve motorcu molalarının kalbi.',
      story: 'Tünel açılmadan önce Anadolu\'yu İstanbul\'a bağlayan efsane Bolu Dağı Geçidi. Sisli çam kokuları, keskin virajları ve yol üstü et mangal geleneğiyle Türk yolculuk kültürünün simgelerindendir. Kışın beyaz örtüsü, baharda ise yeşilin her tonu eşlik eder.'
    },
    {
      id: 'story-efes',
      title: 'Efes Antik Kenti & Celsus Kütüphanesi',
      lat: 37.9405,
      lon: 27.3415,
      radiusM: 3000,
      teaser: 'Roma İmparatorluğu\'nun Asya eyalet başkenti, antik dünyanın ticaret ve felsefe metropolü.',
      story: 'Efes Antik Kenti\'ne yaklaşıyorsunuz. 25 bin kişilik antik tiyatrosu, Celsus Kütüphanesi ve Artemis Tapınağı ile dünyanın en görkemli açık hava müzelerinden biridir. Mermer caddelerinde yürürken Roma konsüllerinin ve gladyatörlerin ayak seslerini hayal edebilirsiniz.'
    },
    {
      id: 'story-truva',
      title: 'Truva Antik Kenti & İlyada Destanı',
      lat: 39.9575,
      lon: 26.2389,
      radiusM: 3500,
      teaser: 'Homeros\'un ölümsüzleştirdiği Truva Savaşı\'nın ve efsanevi tahta atın mekanı.',
      story: 'Truva Antik Kenti ve Çanakkale Boğazı rüzgarları. Homeros\'un İlyada destanına konu olan 9 katmanlı tarihi kent, Akhilleus ve Hektor\'un düellosuna şahitlik etmiştir. Çanakkale rüzgarı burada binlerce yıllık kahramanlık hikayelerini fısıldar.'
    },
    {
      id: 'story-gelibolu',
      title: 'Gelibolu Tarihi Yarımadası & Şehitlikler',
      lat: 40.2312,
      lon: 26.3150,
      radiusM: 4000,
      teaser: 'Bir ulusun kaderinin yazıldığı, Çanakkale Geçilmez destanının kutsal toprakları.',
      story: 'Gelibolu Tarihi Alanı\'na hoş geldiniz. "Çanakkale Geçilmez" sözünün tarihe kazındığı, Mustafa Kemal Atatürk ve Mehmetçiklerin destan yazdığı bu topraklar; dünya harp tarihinin en centilmen ve fedakar mücadelesine tanıklık etmiştir.'
    },
    {
      id: 'story-kapadokya',
      title: 'Kapadokya & Peri Bacaları',
      lat: 38.6431,
      lon: 34.8289,
      radiusM: 4000,
      teaser: 'Volkanik tüflerin rüzgar ve suyla dansı; masalsı vadi ve yer altı şehirleri.',
      story: 'Kapadokya\'nın büyülü coğrafyasındasınız. Milyonlarca yıl önce Erciyes ve Hasandağı volkanlarının püskürttüğü lavların şekillenmesiyle oluşan peri bacaları, yer altı şehirleri ve sıcak hava balonlarıyla adeta başka bir gezegeni andırır.'
    },
    {
      id: 'story-nemrut',
      title: 'Nemrut Dağı & Kommagene Krallığı',
      lat: 37.9806,
      lon: 38.7408,
      radiusM: 4000,
      teaser: '2150 metre zirvede tanrıların ve kralların devasa heykelleri.',
      story: 'Nemrut Dağı zirvesindesiniz. Kral I. Antiochos\'un Doğu ve Batı tanrılarını birleştirmek amacıyla 2150 metre yükseklikte yaptırdığı dev kireçtaşı heykeller ve tümülüs, dünyada gün doğumu ve batımının en mistik izlendiği noktadır.'
    },
    {
      id: 'story-sumela',
      title: 'Sümela Manastırı & Karadağ Uçurumu',
      lat: 40.6901,
      lon: 39.6583,
      radiusM: 3500,
      teaser: 'Altındere Vadisi\'nde sarp kayalıklara asılı duran 1600 yıllık manastır.',
      story: 'Trabzon Maçka\'da sarp kayalıklara kartal yuvası gibi oyulmuş Sümela Manastırı. Sisli Karadeniz ormanları, gürül gürül akan dereler ve fresklerle bezeli kaya kilisesi, Doğu Karadeniz rotalarının baş tacıdır.'
    },
    {
      id: 'story-gobeklitepe',
      title: 'Göbeklitepe & Tarihin Sıfır Noktası',
      lat: 37.2232,
      lon: 38.9224,
      radiusM: 3500,
      teaser: 'İnsanlık tarihini yeniden yazan 12.000 yıllık dünyanın ilk tapınağı.',
      story: 'Tarihin sıfır noktası Göbeklitepe\'ye yaklaştınız. Tarım toplumuna geçmeden önce inşa edilen "T" biçimli dev sütunlar ve hayvan kabartmaları, insanlık tarihinin bildiğimiz tüm teorilerini kökten değiştirmiştir.'
    },
    {
      id: 'story-pamukkale',
      title: 'Pamukkale Travertenleri & Hierapolis',
      lat: 37.9248,
      lon: 29.1244,
      radiusM: 3000,
      teaser: 'Beyaz cennet travertenler ve şifalı termal havuzlarıyla antik sağlık merkezi.',
      story: 'Pamukkale Travertenleri ve Hierapolis Antik Kenti. Kalsiyum oksitli termal suların yarattığı kar beyazı havuzlar ve binlerce yıllık Kleopatra Antik Havuzu, doğanın ve tarihin kusursuz birleşimidir.'
    },
    {
      id: 'story-salda',
      title: 'Salda Gölü & Türkiye\'nin Maldivleri',
      lat: 37.5542,
      lon: 29.7042,
      radiusM: 3500,
      teaser: 'Beyaz kumları ve turkuaz tonlarıyla Mars yüzeyine benzetilen krater gölü.',
      story: 'Salda Gölü etrafındaki virajlardasınız. Magnezyum zengini beyaz hidromanyezit kumsalları ve berrak turkuaz suyu ile NASA\'nın Mars araştırmalarında referans aldığı Türkiye\'nin en derin ve temiz göllerindendir.'
    },
    {
      id: 'story-ihlara',
      title: 'Ihlara Vadisi & Melendiz Kanyonu',
      lat: 38.2526,
      lon: 34.3012,
      radiusM: 3000,
      teaser: 'Hasandağı lavlarının yardığı, kayalara oyulmuş manastır vadisi.',
      story: 'Ihlara Vadisi, Melendiz Çayı\'nın kanyon boyunca akarken şekillendirdiği 14 kilometrelik bir doğa harikasıdır. Uçurum yamaçlarına oyulmuş erken Hristiyanlık dönemi kaya kiliseleri ve gür bitki örtüsüyle büyüleyicidir.'
    },
    {
      id: 'story-assos',
      title: 'Assos Behramkale & Athena Tapınağı',
      lat: 39.4891,
      lon: 26.3361,
      radiusM: 3000,
      teaser: 'Aristoteles\'in felsefe okulu kurduğu, Midilli Adası manzaralı antik liman.',
      story: 'Assos Behramkale sırtlarındasınız. Dor tarzı Athena Tapınağı sütunları arasından Ege Denizi\'ne ve Midilli\'ye bakarken, felsefenin babası Aristoteles\'in burada ders verdiği günleri hayal edebilirsiniz.'
    },
    {
      id: 'story-ovit',
      title: 'Ovit Dağı Geçidi & Kaçkarlar',
      lat: 40.6278,
      lon: 40.7891,
      radiusM: 4500,
      teaser: '2640 metre irtifada bulutların üstünde virajlar ve heybetli Kaçkar zirveleri.',
      story: 'Ovit Dağı Geçidi, 2640 metre irtifasıyla Türkiye\'nin en yüksek ve en zorlu motor rotalarındandır. Rize ile Erzurum arasında, bulut denizinin üzerinde sürüş yaparken vahşi Kaçkar doğasını ve buzul göllerini selamlarsınız.'
    },
    {
      id: 'story-sirince',
      title: 'Şirince Köyü & Ege Taş Evleri',
      lat: 37.9442,
      lon: 27.4331,
      radiusM: 2500,
      teaser: 'Zeytinlikler arasında beyaz badanalı tarihi Rum evleri ve meyve şarapları.',
      story: 'Selçuk tepelerinde zeytinlikler arasına saklanmış Şirince. Arnavut kaldırımlı dar sokakları, tarihi mimarisi ve bereketli bağlarıyla Ege kültürünün en huzurlu duraklarından biridir.'
    },
    {
      id: 'story-bergama',
      title: 'Bergama Akropolü & Dik Tiyatro',
      lat: 39.1322,
      lon: 27.1840,
      radiusM: 3000,
      teaser: 'Parşömenin icat edildiği, dünyanın en dik antik tiyatrosuna sahip Pergamon.',
      story: 'Pergamon Akropolü. Kralların sarayları, Zeus Sunağı ve uçuruma inşa edilmiş dünyanın en dik açılı antik tiyatrosuyla gökyüzüne uzanan bu tepe, parşömen kağıdının doğduğu kültür merkezidir.'
    },
    {
      id: 'story-ani',
      title: 'Ani Harabeleri & Binbir Kiliseli Şehir',
      lat: 40.5103,
      lon: 43.5714,
      radiusM: 4000,
      teaser: 'İpek Yolu\'nun Kafkasya kapısı, Arpaçay kanyonu kenarındaki efsanevi başkent.',
      story: 'Ani Tarihi Kenti\'ne yaklaşıyorsunuz. Orta Çağ\'ın metropolü, "1001 Kiliseli Şehir" olarak bilinen Ani; Ermeni, Selçuklu, Gürcü ve Bizans mimarisinin sentezlendiği eşsiz bir açık hava başyapıtıdır.'
    },
    {
      id: 'story-safranbolu',
      title: 'Safranbolu Tarihi Evleri',
      lat: 41.2458,
      lon: 32.6936,
      radiusM: 3000,
      teaser: 'UNESCO Dünya Mirası, ahşap konakları ve lokum kokulu sokaklarıyla Osmanlı kenti.',
      story: 'Safranbolu\'dasınız. 18. ve 19. yüzyıl geleneksel Osmanlı sivil mimarisini günümüze taşıyan cumbalı ahşap konaklar, arasta çarşısı ve Arnavut kaldırımları zamanda nostaljik bir yolculuk sunar.'
    },
    {
      id: 'story-kackarlar',
      title: 'Kaçkar Dağları & Fırtına Vadisi',
      lat: 40.9500,
      lon: 41.0000,
      radiusM: 5000,
      teaser: 'Tarihi kemer köprüler, şimşir ormanları ve coşkun Fırtına Deresi.',
      story: 'Fırtına Vadisi ve Kaçkar etekleri. Yüzlerce yıllık taş kemer köprülerin altından akan köpüklü sular, yayla yolları ve horon melodileri eşliğinde Doğu Karadeniz\'in vahşi güzelliğine adım atıyorsunuz.'
    }
  ],

  init() {
    try {
      const stored = localStorage.getItem('rotam_story_guide_enabled');
      if (stored !== null) {
        this.enabled = (stored === 'true');
      }
    } catch (e) {}
    this.updateUIStatus();
  },

  updateUIStatus() {
    const statusEl = document.getElementById('mobile-story-guide-status');
    if (statusEl) {
      statusEl.textContent = this.enabled ? 'Açık' : 'Kapalı';
      statusEl.className = this.enabled ? 'text-[10px] text-emerald-400 font-bold' : 'text-[10px] text-slate-500 font-bold';
    }
    const btnEl = document.getElementById('live-nav-story-btn');
    if (btnEl) {
      if (this.enabled) {
        btnEl.classList.remove('opacity-40', 'grayscale');
        btnEl.title = 'Rotam Kültür Rehberi: Açık (Kapatmak için tıkla)';
      } else {
        btnEl.classList.add('opacity-40', 'grayscale');
        btnEl.title = 'Rotam Kültür Rehberi: Kapalı (Açmak için tıkla)';
      }
    }
  },

  toggleGuide() {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem('rotam_story_guide_enabled', this.enabled ? 'true' : 'false');
    } catch (e) {}
    this.updateUIStatus();

    if (!this.enabled) {
      this.stopSpeaking();
      this.dismissStoryBanner();
      showToast('Kültür Rehberi Fısıltısı Kapatıldı 🔕', 'info');
    } else {
      showToast('Kültür & Tarih Rehberi Açık 🎙️ Yaklaştığınızda hikayeler fısıldanacak', 'success');
    }
  },

  checkProximity(userLat, userLon) {
    if (!this.enabled || !userLat || !userLon) return;

    const now = Date.now();
    // Cooldown check (minimum 2.5 dakika mola)
    if (now - this.lastSpokenTimestamp < this.minIntervalMs) return;

    // Don't interrupt turn-by-turn navigation voice if currently speaking
    if (typeof window.speechSynthesis !== 'undefined' && window.speechSynthesis.speaking) {
      return;
    }

    // 1. Search curated high-value stories first
    for (const item of this.curatedStories) {
      if (this.toldStoryIds.has(item.id)) continue;
      const d = haversineMeters(userLat, userLon, item.lat, item.lon);
      const rad = item.radiusM || 2500;
      if (d <= rad) {
        this.triggerStory(item, d);
        return;
      }
    }

    // 2. Fallback to all POIs in database (DEFAULT_HISTORIC_PLACES or state.allPlaces)
    const allPlaces = (window.state && window.state.allPlaces && window.state.allPlaces.length) 
      ? window.state.allPlaces 
      : (window.DEFAULT_HISTORIC_PLACES || []);

    for (const p of allPlaces) {
      const pid = 'poi_' + (p.id || p.name);
      if (this.toldStoryIds.has(pid)) continue;
      if (!p.lat || !p.lon) continue;

      // Sadece tarihi yerler sesli olarak anlatılır; benzinlikler kesinlikle filtrelenir
      const isFuel = p.category === 'fuel' || p.category === 'ev_charge' ||
        /benzin|petrol|akaryakıt|yakıt|istasyon|opet|shell|bp|total|aytemiz|lukoil|sunpet|po\b/i.test(p.name || '');
      if (isFuel) continue;
      if (p.category !== 'historic') continue;

      const d = haversineMeters(userLat, userLon, p.lat, p.lon);
      if (d <= 2000 && p.description && p.description.length > 20) {
        const generatedItem = {
          id: pid,
          title: p.name,
          lat: p.lat,
          lon: p.lon,
          teaser: p.description.substring(0, 100),
          story: `${p.name} noktasına yaklaşıyorsunuz. ${p.description}`
        };
        this.triggerStory(generatedItem, d);
        return;
      }
    }
  },

  triggerStory(storyItem, distanceM) {
    this.activeStory = storyItem;
    this.toldStoryIds.add(storyItem.id);
    this.lastSpokenTimestamp = Date.now();

    // Show HUD banner
    const banner = document.getElementById('live-nav-story-banner');
    const titleEl = document.getElementById('live-story-title');
    const textEl = document.getElementById('live-story-text');
    const distEl = document.getElementById('live-story-dist');

    if (titleEl) titleEl.textContent = storyItem.title;
    if (textEl) textEl.textContent = storyItem.story || storyItem.teaser;
    if (distEl) {
      const distStr = distanceM < 1000 ? `${Math.round(distanceM)} m` : `${(distanceM / 1000).toFixed(1)} km`;
      distEl.textContent = distStr;
    }

    if (banner) {
      banner.classList.remove('hidden');
      if (this.bannerTimeout) clearTimeout(this.bannerTimeout);
      // Auto-hide banner after 35 seconds
      this.bannerTimeout = setTimeout(() => {
        banner.classList.add('hidden');
      }, 35000);
    }

    // Play subtle audio vibration if supported
    try {
      if ('vibrate' in navigator) navigator.vibrate([100, 80, 100]);
    } catch (e) {}

    // Speak story
    this.speak(storyItem.story || storyItem.teaser);
  },

  speak(text) {
    if (!this.enabled) return;
    if (typeof RotamSpeech !== 'undefined') {
      RotamSpeech.speak(text, { rate: 0.96 });
      return;
    }
  },

  stopSpeaking() {
    if (typeof RotamSpeech !== 'undefined') {
      RotamSpeech.stop();
      return;
    }
  },

  replayActiveStory() {
    if (this.activeStory) {
      this.speak(this.activeStory.story || this.activeStory.teaser);
      showToast('Kültür hikayesi tekrarlanıyor 🔊', 'info');
    } else {
      this.playSampleStory();
    }
  },

  dismissStoryBanner() {
    const banner = document.getElementById('live-nav-story-banner');
    if (banner) banner.classList.add('hidden');
    if (this.bannerTimeout) clearTimeout(this.bannerTimeout);
    this.stopSpeaking();
  },

  playSampleStory() {
    const sample = this.curatedStories[0]; // Sakar Geçidi & Gökova Körfezi
    this.triggerStory(sample, 1200);
    showToast('Örnek kültür hikayesi çalınıyor 🎙️', 'success');
  }
};

window.RotamStoryGuide = RotamStoryGuide;

// ==========================================
// ROTAM TOMTOM REALTIME TRAFFIC FLOW OVERLAY ENGINE
// ==========================================
const RotamTraffic = {
  layer: null,
  isVisible: false,
  storageKey: 'rotam_tomtom_api_key',
  refreshTimer: null,
  REFRESH_INTERVAL_MS: 3 * 60 * 1000, // 3 dakikada bir otomatik karo tazeleme

  getApiKey() {
    try {
      return (localStorage.getItem(this.storageKey) || '').trim();
    } catch (e) {
      return '';
    }
  },

  setApiKey(key) {
    const cleaned = (key || '').trim();
    if (!cleaned) {
      localStorage.removeItem(this.storageKey);
    } else {
      localStorage.setItem(this.storageKey, cleaned);
    }
    this.renderAdminUI();
    this.updateUI();
    if (this.isVisible) {
      this.rebuildLayer();
    }
  },

  hasApiKey() {
    const k = this.getApiKey();
    return Boolean(k && k.length >= 10);
  },

  init() {
    this.updateUI();
    this.renderAdminUI();
  },

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      if (!this.hasApiKey()) {
        this.openModal();
        return;
      }
      this.show();
    }
  },

  show() {
    if (!window.map) {
      showToast('Harita henüz hazır değil.', 'warning');
      return;
    }
    const apiKey = this.getApiKey();
    if (!apiKey || apiKey.length < 10) {
      this.openModal();
      return;
    }

    if (!this.layer) {
      // TomTom Traffic Flow Raster Tile URL (relative0: free-flow transparent, delays color-coded)
      this.layer = L.tileLayer(
        'https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key={apiKey}&tileSize=256',
        {
          apiKey: apiKey,
          maxZoom: 22,
          tileSize: 256,
          opacity: 0.85,
          zIndex: 450,
          attribution: '&copy; <a href="https://www.tomtom.com" target="_blank" rel="noopener">TomTom Traffic</a>'
        }
      );

      this.layer.on('tileerror', (e) => {
        console.warn('TomTom trafik katmanı karo hatası:', e);
      });
    }

    if (!window.map.hasLayer(this.layer)) {
      window.map.addLayer(this.layer);
    }

    this.isVisible = true;
    this.startRefreshTimer();
    this.updateUI();
    showToast('🚦 Canlı TomTom Trafik Yoğunluğu Katmanı Açıldı', 'success');
  },

  hide() {
    if (this.layer && window.map && window.map.hasLayer(this.layer)) {
      window.map.removeLayer(this.layer);
    }
    this.isVisible = false;
    this.stopRefreshTimer();
    this.updateUI();
    showToast('🚦 Canlı Trafik Katmanı Kapatıldı', 'info');
  },

  rebuildLayer() {
    const wasVisible = this.isVisible;
    if (this.layer && window.map && window.map.hasLayer(this.layer)) {
      window.map.removeLayer(this.layer);
    }
    this.layer = null;
    if (wasVisible && this.hasApiKey()) {
      this.show();
    }
  },

  startRefreshTimer() {
    this.stopRefreshTimer();
    this.refreshTimer = setInterval(() => {
      if (this.isVisible && this.layer && !document.hidden) {
        try {
          if (typeof this.layer.redraw === 'function') {
            this.layer.redraw();
          }
        } catch (e) {}
      }
    }, this.REFRESH_INTERVAL_MS);
  },

  stopRefreshTimer() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  },

  openModal() {
    const modal = document.getElementById('modal-traffic-setup');
    const input = document.getElementById('traffic-modal-api-key');
    if (input) {
      input.value = this.getApiKey();
    }
    if (modal) {
      modal.classList.remove('hidden');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  closeModal() {
    const modal = document.getElementById('modal-traffic-setup');
    if (modal) modal.classList.add('hidden');
  },

  saveKeyAndActivate() {
    const input = document.getElementById('traffic-modal-api-key');
    const key = (input ? input.value : '').trim();
    if (!key || key.length < 10) {
      showToast('Lütfen geçerli bir TomTom API anahtarı girin.', 'warning');
      return;
    }
    this.setApiKey(key);
    this.closeModal();
    this.show();
  },

  renderAdminUI() {
    const input = document.getElementById('admin-tomtom-api-key');
    const badge = document.getElementById('admin-traffic-badge');
    const key = this.getApiKey();

    if (input && !input.matches(':focus')) {
      input.value = key;
    }

    if (badge) {
      if (this.hasApiKey()) {
        badge.textContent = 'Key Kayıtlı';
        badge.className = 'text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold';
      } else {
        badge.textContent = 'Ayarlanmadı';
        badge.className = 'text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono font-bold';
      }
    }
  },

  saveKeyFromAdmin() {
    const input = document.getElementById('admin-tomtom-api-key');
    const key = (input ? input.value : '').trim();
    this.setApiKey(key);
    if (key) {
      showToast('TomTom API anahtarı kaydedildi 🚦', 'success');
    } else {
      showToast('TomTom API anahtarı kaldırıldı', 'info');
    }
  },

  async testAdminKey() {
    const input = document.getElementById('admin-tomtom-api-key');
    const key = (input && input.value ? input.value.trim() : this.getApiKey());
    if (!key || key.length < 10) {
      showToast('Önce bir TomTom API anahtarı giriniz.', 'warning');
      return;
    }

    showToast('TomTom API bağlantısı test ediliyor...', 'info');
    const dot = document.getElementById('api-dot-tomtom');
    const badge = document.getElementById('api-status-tomtom');
    const ping = document.getElementById('api-ping-tomtom');

    const testUrl = `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/10/586/394.png?key=${encodeURIComponent(key)}&tileSize=256`;
    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(testUrl, { signal: controller.signal, mode: 'cors' });
      clearTimeout(timeoutId);
      const elapsed = Math.round(performance.now() - startTime);

      if (res.ok) {
        if (dot) dot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
        if (badge) {
          badge.textContent = 'Aktif (HTTP 200)';
          badge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
        }
        if (ping) ping.textContent = `${elapsed} ms`;
        showToast(`✅ TomTom API bağlantısı başarılı! (${elapsed} ms)`, 'success');
      } else if (res.status === 403 || res.status === 401) {
        if (dot) dot.className = 'w-2 h-2 rounded-full bg-rose-500';
        if (badge) {
          badge.textContent = `Yetkisiz (HTTP ${res.status})`;
          badge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30';
        }
        if (ping) ping.textContent = `${elapsed} ms`;
        showToast('❌ TomTom API Anahtarı yetkisiz veya hatalı (HTTP ' + res.status + ')', 'error');
      } else {
        throw new Error('HTTP ' + res.status);
      }
    } catch (e) {
      const elapsed = Math.round(performance.now() - startTime);
      if (dot) dot.className = 'w-2 h-2 rounded-full bg-rose-500';
      if (badge) {
        badge.textContent = 'Hata';
        badge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30';
      }
      if (ping) ping.textContent = `${elapsed} ms`;
      showToast('TomTom test hatası: ' + e.message, 'error');
    }
  },

  updateUI() {
    // 1. Desktop Floating Button (#btn-toggle-traffic)
    const btnDesk = document.getElementById('btn-toggle-traffic');
    if (btnDesk) {
      if (this.isVisible) {
        btnDesk.className = 'px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white shadow-md shadow-rose-600/30 flex items-center space-x-1 transition-all active:scale-95';
      } else {
        btnDesk.className = 'px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center space-x-1 transition-all active:scale-95';
      }
    }

    // 2. Mobile Popover (#mobile-traffic-status)
    const mobStatus = document.getElementById('mobile-traffic-status');
    if (mobStatus) {
      if (this.isVisible) {
        mobStatus.textContent = 'Açık';
        mobStatus.className = 'text-[10px] text-emerald-400 font-bold';
      } else {
        mobStatus.textContent = 'Kapalı';
        mobStatus.className = 'text-[10px] text-slate-400 font-mono';
      }
    }
  }
};

window.RotamTraffic = RotamTraffic;

// ==========================================
// 8. ROTAM KAMPÇI ASİSTANI & DOĞA REHBERİ (OUTDOOR ASSISTANT)
// ==========================================

const CAMPING_CHECKLIST_DATA = {
  shelter: [
    { id: 'tent', label: 'Çadır (Mevsime uygun, su geçirmez tente & taban)', icon: '⛺' },
    { id: 'pegs', label: 'Çadır Kazıkları & Lastik Çekiç & Gerdirme İpleri', icon: '🔨' },
    { id: 'bag', label: 'Uyku Tulumu (Rakıma ve gece soğuğuna uygun)', icon: '🛌' },
    { id: 'mat', label: 'Yalıtımlı Kamp Matı / Şişme Yatak (R-Değeri 2.5+)', icon: '🧘' },
    { id: 'pillow', label: 'Şişme Kamp Yastığı & Termal İçlik', icon: '🧣' },
    { id: 'tarp', label: 'Gölgelik Tente (Tarp) & Zemin Örtüsü (Footprint)', icon: '🛡️' }
  ],
  kitchen: [
    { id: 'stove', label: 'Taşınabilir Kamp Ocağı & Yedek Gaz Kartuşu', icon: '🔥' },
    { id: 'lighter', label: 'Rüzgar Geçirmez Çakmak / Magnezyum Çubuğu', icon: '✨' },
    { id: 'cookset', label: 'Kompakt Tencere & Tava & Cezve Seti', icon: '🍳' },
    { id: 'cutlery', label: 'Çatal, Kaşık, Bıçak & Emaye / Çelik Bardak', icon: '🍴' },
    { id: 'water', label: 'İçme Suyu (Kişi başı günlük en az 3-4 Litre)', icon: '💧' },
    { id: 'purifier', label: 'Su Filtresi veya Su Arıtma Tableti', icon: '🧪' },
    { id: 'food', label: 'Bozulmayan Yiyecekler (Konserve, kuruyemiş, hazır makarna)', icon: '🥫' }
  ],
  power: [
    { id: 'headlamp', label: 'Kafa Lambası (Yedek pilli veya Type-C şarjlı)', icon: '🔦' },
    { id: 'lantern', label: 'Çadır İçi Asılabilir Led Kamp Feneri', icon: '💡' },
    { id: 'powerbank', label: 'Yüksek Kapasiteli Powerbank (20.000 mAh+)', icon: '🔋' },
    { id: 'cables', label: 'Telefon ve Cihaz Şarj Kabloları', icon: '🔌' },
    { id: 'offline_map', label: 'Çevrimdışı Harita (Rotam & Google Maps indirilmiş)', icon: '📱' }
  ],
  safety: [
    { id: 'firstaid', label: 'Kapsamlı İlk Yardım Kiti (Sargı, yanık kremi, ağrı kesici)', icon: '🩹' },
    { id: 'spray', label: 'Sinek & Böcek & Kene Kovucu Sprey', icon: '🦟' },
    { id: 'knife', label: 'Çok Amaçlı Kamp Bıçağı / İsviçre Çakısı / Balta', icon: '🔪' },
    { id: 'trash_bags', label: 'Dayanıklı Çöp Torbası (İz Bırakma - Sıfır Atık)', icon: '🗑️' },
    { id: 'whistle', label: 'Acil Durum Düdüğü & Pusula / Yangın Söndürücü', icon: '🧭' }
  ]
};

function getCheckedCampingItems() {
  try {
    const raw = localStorage.getItem('rotam_camping_checklist');
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
}

function saveCheckedCampingItems(set) {
  try {
    localStorage.setItem('rotam_camping_checklist', JSON.stringify(Array.from(set)));
  } catch (e) {}
}

function toggleCampingChecklistItem(id) {
  const checked = getCheckedCampingItems();
  if (checked.has(id)) {
    checked.delete(id);
  } else {
    checked.add(id);
  }
  saveCheckedCampingItems(checked);
  renderCampingChecklist();
}

function resetCampingChecklist() {
  saveCheckedCampingItems(new Set());
  renderCampingChecklist();
  showToast('Kamp kontrol listesi sıfırlandı 🎒', 'info');
}

function renderCampingChecklist() {
  const checked = getCheckedCampingItems();
  let totalItems = 0;
  let checkedCount = 0;

  const cats = [
    { key: 'shelter', elId: 'camp-checklist-shelter' },
    { key: 'kitchen', elId: 'camp-checklist-kitchen' },
    { key: 'power', elId: 'camp-checklist-power' },
    { key: 'safety', elId: 'camp-checklist-safety' }
  ];

  cats.forEach(c => {
    const container = document.getElementById(c.elId);
    if (!container) return;
    const items = CAMPING_CHECKLIST_DATA[c.key] || [];
    container.innerHTML = '';

    items.forEach(item => {
      totalItems++;
      const isDone = checked.has(item.id);
      if (isDone) checkedCount++;

      const itemEl = document.createElement('div');
      itemEl.className = `flex items-center space-x-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
        isDone 
          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
      }`;
      itemEl.onclick = () => toggleCampingChecklistItem(item.id);

      itemEl.innerHTML = `
        <div class="w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
          isDone 
            ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black text-xs' 
            : 'border-slate-700 bg-slate-950/60'
        }">
          ${isDone ? '✓' : ''}
        </div>
        <span class="text-sm shrink-0">${item.icon}</span>
        <span class="text-[11px] leading-tight flex-1 ${isDone ? 'line-through opacity-75' : 'font-medium'}">${item.label}</span>
      `;
      container.appendChild(itemEl);
    });
  });

  const percent = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;
  const progressText = document.getElementById('camp-checklist-progress-text');
  const progressBar = document.getElementById('camp-checklist-progress-bar');

  if (progressText) {
    progressText.textContent = `${checkedCount} / ${totalItems} (%${percent})`;
  }
  if (progressBar) {
    progressBar.style.width = `${percent}%`;
  }
}

function openCampingAssistantModal(tab = 'checklist') {
  const modal = document.getElementById('modal-camping-assistant');
  if (!modal) return;
  modal.classList.remove('hidden');
  switchCampingTab(tab);
  if (typeof initIcons === 'function') initIcons();
}

function closeCampingAssistantModal() {
  const modal = document.getElementById('modal-camping-assistant');
  if (modal) modal.classList.add('hidden');
}

function switchCampingTab(tabKey) {
  const tabs = ['checklist', 'safety', 'weather', 'spots'];
  tabs.forEach(t => {
    const btn = document.getElementById(`camp-tab-btn-${t}`);
    const content = document.getElementById(`camp-tab-content-${t}`);
    if (btn) {
      if (t === tabKey) {
        btn.classList.add('active', 'bg-emerald-600', 'text-white');
        btn.classList.remove('text-slate-400');
      } else {
        btn.classList.remove('active', 'bg-emerald-600', 'text-white');
        btn.classList.add('text-slate-400');
      }
    }
    if (content) {
      if (t === tabKey) {
        content.classList.remove('hidden');
      } else {
        content.classList.add('hidden');
      }
    }
  });

  if (tabKey === 'checklist') {
    renderCampingChecklist();
  } else if (tabKey === 'spots') {
    renderCampingSpotsList();
  } else if (tabKey === 'weather') {
    calculateCampNightTemp();
  }

  if (typeof initIcons === 'function') initIcons();
}

function calculateCampNightTemp() {
  const dayTempInput = document.getElementById('calc-day-temp');
  const campAltInput = document.getElementById('calc-camp-alt');
  const tempResultEl = document.getElementById('calc-result-temp');
  const bagResultEl = document.getElementById('calc-result-bag');
  const matResultEl = document.getElementById('calc-result-mat');

  const dayTemp = parseFloat(dayTempInput?.value) || 28;
  const campAlt = Math.max(0, parseFloat(campAltInput?.value) || 1400);

  // Lapse Rate: her 1000m rakımda yaklaşık 6.5°C sıcaklık düşüşü
  const altDrop = (campAlt / 1000) * 6.5;
  const dayTempAtAlt = dayTemp - altDrop;

  // Dağlık/açık alanda gece radyatif soğuma (gündüze göre ~11-13°C düşüş)
  const nightMin = Math.round(dayTempAtAlt - 11.5);
  const nightMax = nightMin + 2;

  if (tempResultEl) {
    tempResultEl.textContent = `~${nightMin}°C ile ${nightMax}°C arası`;
    tempResultEl.className = nightMin <= 5 
      ? 'text-base font-black text-cyan-300 font-mono' 
      : (nightMin <= 15 ? 'text-base font-black text-emerald-300 font-mono' : 'text-base font-black text-amber-300 font-mono');
  }

  let bagStr = '';
  let matStr = '';

  if (nightMin <= -2) {
    bagStr = 'Comfort -5°C / Limit -12°C (Kışlık / Kaz Tüyü Tulum)';
    matStr = 'R-Değeri 4.0+ (Ekstrem Kışlık Çift Kat Yalıtımlı Mat)';
  } else if (nightMin <= 5) {
    bagStr = 'Comfort 0°C / Limit -5°C (4 Mevsim / Yayla Tulumu)';
    matStr = 'R-Değeri 3.0 - 3.8 (Termal Şişme Mat)';
  } else if (nightMin <= 12) {
    bagStr = 'Comfort +5°C / Limit 0°C (3 Mevsim Baharlık Tulum)';
    matStr = 'R-Değeri 2.2 - 2.8 (Termal Köpük veya Şişme Mat)';
  } else if (nightMin <= 18) {
    bagStr = 'Comfort +10°C / Limit +5°C (Hafif Yazlık Tulum)';
    matStr = 'R-Değeri 1.5 - 2.0 (Standart Kamp Matı)';
  } else {
    bagStr = 'Comfort +16°C+ veya Polar Battaniye';
    matStr = 'R-Değeri 1.0 - 1.5 (Standart Yazlık Mat)';
  }

  if (bagResultEl) bagResultEl.textContent = bagStr;
  if (matResultEl) matResultEl.textContent = matStr;
}

function renderCampingSpotsList(filteredSpots = null) {
  const container = document.getElementById('camp-spots-list-container');
  if (!container) return;

  const allPlaces = (window.state && window.state.allPlaces && window.state.allPlaces.length)
    ? window.state.allPlaces
    : (window.DEFAULT_HISTORIC_PLACES || []);

  const spots = filteredSpots || allPlaces.filter(p => p.category === 'camping');

  if (spots.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-6 text-center text-slate-500 text-xs">
        Aradığınız kriterde kamp alanı bulunamadı.
      </div>
    `;
    return;
  }

  container.innerHTML = spots.map(s => {
    const city = s.city || s.region || 'Türkiye';
    const desc = s.description ? escapeHtml(s.description.substring(0, 95)) + (s.description.length > 95 ? '...' : '') : '';
    const tagBadges = (s.tags || []).slice(0, 3).map(t => `<span class="bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded text-[9px]">#${escapeHtml(t)}</span>`).join(' ');

    return `
      <div class="glass-card bg-slate-950/70 border border-slate-800/90 hover:border-emerald-500/50 p-3 rounded-2xl flex flex-col justify-between space-y-2 transition-all group">
        <div>
          <div class="flex items-start justify-between gap-1.5">
            <h5 class="font-bold text-white text-xs group-hover:text-emerald-300 transition-colors line-clamp-1 flex items-center gap-1">
              <span>🏕️</span>
              <span>${escapeHtml(s.name)}</span>
            </h5>
            <span class="text-[10px] bg-emerald-500/15 text-emerald-300 font-semibold px-2 py-0.5 rounded-full shrink-0 border border-emerald-500/25">${escapeHtml(city)}</span>
          </div>
          ${desc ? `<p class="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-2">${desc}</p>` : ''}
          <div class="flex flex-wrap gap-1 mt-1.5">${tagBadges}</div>
        </div>
        <div class="flex items-center space-x-1.5 pt-1.5 border-t border-slate-800/80">
          <button onclick="showCampSpotOnMap(${s.id})" class="flex-1 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition-all active:scale-95 shadow-sm">
            <span>🗺️ Haritada Göster</span>
          </button>
          <button onclick="openPlaceDetailById(${s.id})" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[11px] font-semibold transition-all" title="Detayları İncele">
            <span>ℹ️</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function filterCampingSpotsList() {
  const q = (document.getElementById('camp-spots-search')?.value || '').toLowerCase().trim();
  const allPlaces = (window.state && window.state.allPlaces && window.state.allPlaces.length)
    ? window.state.allPlaces
    : (window.DEFAULT_HISTORIC_PLACES || []);

  const campSpots = allPlaces.filter(p => p.category === 'camping');

  if (!q) {
    renderCampingSpotsList(campSpots);
    return;
  }

  const filtered = campSpots.filter(s => {
    const nameMatch = (s.name || '').toLowerCase().includes(q);
    const cityMatch = (s.city || s.region || '').toLowerCase().includes(q);
    const descMatch = (s.description || '').toLowerCase().includes(q);
    const tagsMatch = (s.tags || []).some(t => t.toLowerCase().includes(q));
    return nameMatch || cityMatch || descMatch || tagsMatch;
  });

  renderCampingSpotsList(filtered);
}

function showCampSpotOnMap(id) {
  closeCampingAssistantModal();
  const places = (window.state && window.state.allPlaces && window.state.allPlaces.length)
    ? window.state.allPlaces
    : (window.DEFAULT_HISTORIC_PLACES || []);
  const place = places.find(p => p.id === id);
  if (!place) return;

  // Kamp kategorisinin haritada aktif olduğundan emin ol
  if (!state.activePoiCategories.has('camping')) {
    state.activePoiCategories.add('camping');
    updatePoiCategoryFilterUI();
    renderCorridorPoiMarkers();
  }

  if (window.map) {
    window.map.setView([place.lat, place.lon], 13, { animate: true });
    
    // Varsa Leaflet marker'ın popup'ını aç
    setTimeout(() => {
      const match = (state.poiMarkers || []).find(m => {
        const ll = m.getLatLng();
        return Math.abs(ll.lat - place.lat) < 0.0001 && Math.abs(ll.lng - place.lon) < 0.0001;
      });
      if (match) {
        match.openPopup();
      } else {
        openPlaceDetailById(place.id);
      }
    }, 350);
  }

  showToast(`${place.name} haritada odaklandı 🏕️`, 'success');
}

function filterMapOnlyCamping() {
  closeCampingAssistantModal();
  state.activePoiCategories.clear();
  state.activePoiCategories.add('camping');
  updatePoiCategoryFilterUI();
  renderCorridorPoiMarkers();
  renderCorridorPoiList();
  showToast('Haritada sadece kamp ve karavan alanları filtrelendi 🏕️', 'success');
}

// Global scope bindings for inline HTML handlers
window.openCampingAssistantModal = openCampingAssistantModal;
window.closeCampingAssistantModal = closeCampingAssistantModal;
window.switchCampingTab = switchCampingTab;
window.toggleCampingChecklistItem = toggleCampingChecklistItem;
window.resetCampingChecklist = resetCampingChecklist;
window.calculateCampNightTemp = calculateCampNightTemp;
window.filterCampingSpotsList = filterCampingSpotsList;
window.filterMapOnlyCamping = filterMapOnlyCamping;
window.showCampSpotOnMap = showCampSpotOnMap;


