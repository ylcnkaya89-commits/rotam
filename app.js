/**
 * ROTAM V2 – Professional Travel, Route Planning & Destination Discovery Platform
 * 
 * Slogan: "Yolculuğun sadece bir varış noktası değil. Rotanı oluştur, keşfedilecek yerleri bul ve yolculuğunu unutulmaz hale getir."
 */

// Global Application State
const state = {
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
  activePoiCategories: new Set(['historic', 'nature', 'photography', 'beach', 'gastronomy', 'cafe', 'fuel', 'ev_charge', 'camping']),
  allPlaces: [],
  corridorPois: [],
  smartRecommendations: [],
  userLocation: null,
  routeRequestId: 0
};

// Map & Layer State
let map = null;
let routePolyline = null;
let routeGlowPolyline = null;
let ghostPolylines = [];
let tileLayers = {};
let mapInitialized = false;

// Category Configs: Colors, Icons & Titles
const CATEGORY_CONFIG = {
  historic: { title: 'Tarihi Yer & Antik Kent', icon: 'landmark', emoji: '🏛️', color: '#d97706', fill: '#f59e0b', pinClass: 'pin-historic' },
  nature: { title: 'Doğa & Şelale & Kanyon', icon: 'trees', emoji: '🌲', color: '#059669', fill: '#10b981', pinClass: 'pin-nature' },
  photography: { title: 'Fotoğraf & Seyir Noktası', icon: 'camera', emoji: '📸', color: '#7c3aed', fill: '#8b5cf6', pinClass: 'pin-photography' },
  beach: { title: 'Sahil & Plaj & Koy', icon: 'waves', emoji: '🌊', color: '#0284c7', fill: '#38bdf8', pinClass: 'pin-beach' },
  gastronomy: { title: 'Gastronomi & Meşhur Lezzet', icon: 'utensils', emoji: '🍴', color: '#e11d48', fill: '#f43f5e', pinClass: 'pin-gastronomy' },
  cafe: { title: 'Mola Yeri & Kafe', icon: 'coffee', emoji: '☕', color: '#0f766e', fill: '#14b8a6', pinClass: 'pin-cafe' },
  fuel: { title: 'Akaryakıt İstasyonu', icon: 'fuel', emoji: '⛽', color: '#047857', fill: '#10b981', pinClass: 'pin-fuel' },
  ev_charge: { title: 'Elektrikli Araç Şarj (EV)', icon: 'zap', emoji: '⚡', color: '#0891b2', fill: '#06b6d4', pinClass: 'pin-ev_charge' },
  camping: { title: 'Karavan & Kamp Alanı', icon: 'tent', emoji: '🚐', color: '#65a30d', fill: '#84cc16', pinClass: 'pin-camping' },
  viewpoint: { title: 'Seyir Noktası & Geçit', icon: 'mountain', emoji: '🌄', color: '#ea580c', fill: '#f97316', pinClass: 'pin-viewpoint' },
  mountain_pass: { title: 'Dağ Geçidi', icon: 'mountain-snow', emoji: '⛰️', color: '#4f46e5', fill: '#6366f1', pinClass: 'pin-mountain_pass' }
};

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
}

// Map Tile Layers Setup
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

// Leaflet Map Initialization
function initMap() {
  if (mapInitialized || typeof L === 'undefined') return;
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  tileLayers = createTileLayers();
  const defaultTile = tileLayers.dark || tileLayers.osm;

  // Center on Turkey
  map = L.map('map', {
    center: [39.0, 35.2],
    zoom: 6,
    layers: [defaultTile],
    zoomControl: false,
    tap: true
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
}

function switchTile(tileKey) {
  if (!map || !tileLayers[tileKey]) return;
  Object.values(tileLayers).forEach(l => {
    if (map.hasLayer(l)) map.removeLayer(l);
  });
  map.addLayer(tileLayers[tileKey]);
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
}

// Splash Screen Dismissal
function dismissSplashScreen() {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;
  splash.style.opacity = '0';
  splash.style.pointerEvents = 'none';
  setTimeout(() => {
    splash.remove();
    initIcons();
  }, 600);
}

// Homepage Hero Planner Toggle
function showHomepagePlanner() {
  const hero = document.getElementById('homepage-hero-overlay');
  if (hero) {
    hero.classList.remove('hidden');
    hero.classList.add('flex');
    initIcons();
  }
}

function dismissHomepagePlanner() {
  const hero = document.getElementById('homepage-hero-overlay');
  if (hero) {
    hero.classList.add('hidden');
    hero.classList.remove('flex');
  }
}

// Vehicle Selection (Car, Moto, Camper, Bicycle, Walk)
function selectVehicle(vehicle) {
  state.currentVehicle = vehicle;
  document.querySelectorAll('.vehicle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.vehicle === vehicle);
  });

  const badge = document.getElementById('vehicle-label-badge');
  const scoreLabel = document.getElementById('label-stat-score');
  const labels = {
    car: 'Otomobil',
    motorcycle: 'Motosiklet',
    camper: 'Karavan',
    bicycle: 'Bisiklet',
    walk: 'Yaya'
  };
  if (badge) badge.textContent = labels[vehicle] || vehicle;
  if (scoreLabel) {
    if (vehicle === 'motorcycle') scoreLabel.textContent = 'Viraj Puanı';
    else if (vehicle === 'car') scoreLabel.textContent = 'Konfor Skoru';
    else if (vehicle === 'camper') scoreLabel.textContent = 'Karavan Uyumu';
    else if (vehicle === 'bicycle') scoreLabel.textContent = 'Bisiklet Uyumu';
    else scoreLabel.textContent = 'Yürüyüş Uyumu';
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

function setHeroStart(city) {
  const input = document.getElementById('hero-start-input');
  if (input) input.value = city;
}

function setHeroEnd(city) {
  const input = document.getElementById('hero-end-input');
  if (input) input.value = city;
}

// GPS Location for Start Point
function useCurrentLocationForStart() {
  if (!navigator.geolocation) {
    alert('Tarayıcınız konum servisini desteklemiyor.');
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
    },
    (err) => {
      alert('Konum alınamadı: ' + err.message);
      if (input) input.value = '';
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// Geocoding Helper via OpenStreetMap Nominatim
async function geocodeLocation(query) {
  if (!query || query.trim() === '') return null;
  const q = encodeURIComponent(query.trim() + ', Türkiye');
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1&accept-language=tr`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name
      };
    }
  } catch (err) {
    console.warn('Geocoding error:', err);
  }
  return null;
}

// Hero Route Submission
async function submitHeroRoute() {
  const startVal = document.getElementById('hero-start-input')?.value.trim();
  const endVal = document.getElementById('hero-end-input')?.value.trim();

  if (!startVal || !endVal) {
    alert('Lütfen başlangıç ve varış noktalarını girin.');
    return;
  }

  showLoadingBanner(true, '1. Başlangıç ve varış noktaları bulunuyor...');

  let startCoord = null;
  if (startVal.includes('Mevcut Konumum') && state.userLocation) {
    startCoord = state.userLocation;
  } else {
    startCoord = await geocodeLocation(startVal);
  }

  let endCoord = await geocodeLocation(endVal);

  if (!startCoord) {
    showLoadingBanner(false);
    alert(`"${startVal}" konumu bulunamadı. Lütfen kontrol edip tekrar deneyin.`);
    return;
  }
  if (!endCoord) {
    showLoadingBanner(false);
    alert(`"${endVal}" konumu bulunamadı. Lütfen kontrol edip tekrar deneyin.`);
    return;
  }

  state.waypoints[0].lat = startCoord.lat;
  state.waypoints[0].lon = startCoord.lon;
  state.waypoints[0].name = startVal;

  state.waypoints[1].lat = endCoord.lat;
  state.waypoints[1].lon = endCoord.lon;
  state.waypoints[1].name = endVal;

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
    div.className = 'flex items-center space-x-2 bg-slate-950/70 p-2 rounded-xl border border-slate-800/80 group transition-all';

    let iconHtml = '';
    if (isStart) iconHtml = '<span class="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>';
    else if (isEnd) iconHtml = '<span class="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></span>';
    else iconHtml = '<span class="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>';

    div.innerHTML = `
      <div class="p-1 shrink-0 flex items-center justify-center">${iconHtml}</div>
      <input type="text" value="${escapeHtml(wp.name || '')}" placeholder="${isStart ? 'Başlangıç Noktası' : isEnd ? 'Varış Noktası' : 'Ara Durak ' + index}" 
        onchange="handleWaypointNameChange(${index}, this.value)"
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

function handleWaypointNameChange(index, value) {
  if (state.waypoints[index]) {
    state.waypoints[index].name = value;
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
}

function removeWaypoint(index) {
  if (index <= 0 || index >= state.waypoints.length - 1) return;
  const wp = state.waypoints[index];
  if (wp.marker && map) map.removeLayer(wp.marker);
  state.waypoints.splice(index, 1);
  updateWaypointsListUI();
  calculateRouteMain();
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
  document.getElementById('route-summary-panel')?.classList.add('hidden');
  document.getElementById('weather-panel')?.classList.add('hidden');
  document.getElementById('elevation-panel')?.classList.add('hidden');
  document.getElementById('route-alternatives-container')?.classList.add('hidden');
  document.getElementById('mobile-mini-cockpit')?.classList.add('hidden');
  document.getElementById('btn-export-gpx')?.setAttribute('disabled', 'true');
  document.getElementById('btn-open-gmaps')?.setAttribute('disabled', 'true');
  document.getElementById('btn-save-route-modal')?.setAttribute('disabled', 'true');
}

// Waypoint Map Click & Markers
async function handleMapClick(lat, lon) {
  // If start is empty, fill start
  if (state.waypoints[0].lat === null) {
    state.waypoints[0].lat = lat;
    state.waypoints[0].lon = lon;
    state.waypoints[0].name = `Konum (${lat.toFixed(3)}, ${lon.toFixed(3)})`;
    updateWaypointsListUI();
    updateWaypointMarkers();
    return;
  }
  // If end is empty, fill end
  if (state.waypoints[state.waypoints.length - 1].lat === null) {
    state.waypoints[state.waypoints.length - 1].lat = lat;
    state.waypoints[state.waypoints.length - 1].lon = lon;
    state.waypoints[state.waypoints.length - 1].name = `Konum (${lat.toFixed(3)}, ${lon.toFixed(3)})`;
    updateWaypointsListUI();
    updateWaypointMarkers();
    calculateRouteMain();
    return;
  }
  // Otherwise, add intermediate waypoint
  const newIndex = state.waypoints.length - 1;
  const newWp = {
    id: 'wp-' + Date.now(),
    type: 'waypoint',
    name: `Durak (${lat.toFixed(3)}, ${lon.toFixed(3)})`,
    lat: lat,
    lon: lon,
    marker: null
  };
  state.waypoints.splice(newIndex, 0, newWp);
  updateWaypointsListUI();
  updateWaypointMarkers();
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
  const validPoints = state.waypoints.filter(w => w.lat !== null && w.lon !== null);
  if (validPoints.length < 2) {
    clearRouteDisplay();
    return;
  }

  const requestId = ++state.routeRequestId;
  showLoadingBanner(true, '1. Rota hesaplanıyor...');

  try {
    // Stage 1: Generate multiple route alternatives
    showLoadingBanner(true, '2. Alternatif rotalar analiz ediliyor...');
    const alternatives = await fetchMultiRouteAlternatives(validPoints);
    if (requestId !== state.routeRequestId) return;

    if (!alternatives || alternatives.length === 0) {
      showLoadingBanner(false);
      alert('Seçilen noktalar arasında uygun bir güzergah bulunamadı.');
      return;
    }

    state.routeAlternatives = alternatives;
    state.activeRouteIndex = 0;
    const activeRoute = alternatives[0];
    state.routeData = activeRoute;

    // Draw Active Route & Ghost Alternatives on Map
    drawRoutesOnMap(alternatives, 0);

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
    const mini = document.getElementById('mobile-mini-cockpit');
    if (mini) {
      mini.classList.remove('hidden');
      document.getElementById('mobile-mini-dist').textContent = (activeRoute.distance / 1000).toFixed(1) + ' km';
      const m = Math.floor(activeRoute.duration / 60);
      document.getElementById('mobile-mini-dur').textContent = `${Math.floor(m / 60)} sa ${m % 60} dk`;
    }

  } catch (error) {
    console.error('Route calculation error:', error);
    alert('Rota hesaplanırken bir hata oluştu. Lütfen bağlantınızı kontrol edin.');
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
    const durStr = `${Math.floor(m / 60)} sa ${m % 60} dk`;

    const div = document.createElement('div');
    div.className = `route-card p-2.5 rounded-xl border flex items-center justify-between text-xs ${
      isActive ? 'active-route border-brand-500 bg-brand-500/10' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
    }`;
    div.onclick = () => selectAlternativeRoute(idx);

    div.innerHTML = `
      <div class="flex items-center space-x-2">
        <span class="w-2.5 h-2.5 rounded-full ${isActive ? 'bg-brand-500' : 'bg-slate-600'}"></span>
        <div>
          <p class="font-bold text-white text-xs">${r.title}</p>
          <p class="text-[10px] text-slate-400">${r.source === 'valhalla' ? 'Manzaralı Bölge Yolları' : 'Hızlı Otoyol Güzergahı'}</p>
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
  const durStr = `${hours} sa ${minutes} dk`;

  document.getElementById('stat-distance').textContent = `${distKm} km`;
  document.getElementById('stat-duration').textContent = durStr;

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
  if (fuelEl) fuelEl.textContent = `Tahmini Yakıt: ${fuelStops} Durak`;
  if (breakEl) breakEl.textContent = `Önerilen Mola: ${breaks}`;
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
    cafe: 0,
    fuel: 0,
    ev_charge: 0,
    camping: 0
  };

  state.allPlaces.forEach(p => {
    const distMeters = minDistanceToRoute(p.lat, p.lon, coords);
    if (distMeters <= radiusMeters) {
      const distKm = (distMeters / 1000).toFixed(1);
      const cat = p.category || 'historic';
      if (counts[cat] !== undefined) counts[cat]++;
      else counts.historic++;

      found.push({ ...p, distKm: parseFloat(distKm) });
    }
  });

  // Sort by distance to route
  found.sort((a, b) => a.distKm - b.distKm);
  state.corridorPois = found;

  // Update Badge Counts
  const totalEl = document.getElementById('corridor-total-count');
  if (totalEl) totalEl.textContent = `${found.length} Nokta`;

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
  if (countPills.fuel) countPills.fuel.textContent = counts.fuel + counts.ev_charge;

  // Plot Markers on Map
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

    const safeName = escapeHtml(p.name).replace(/'/g, "\\'");
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
          <button onclick="addPoiToRoute(${p.lat}, ${p.lon}, '${safeName}')" class="text-[10px] bg-brand-600 hover:bg-brand-500 text-white px-2.5 py-1.5 rounded-lg font-semibold shadow-md shadow-brand-600/30">
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

// Toggle Corridor Filter Category
function togglePoiCategoryFilter(category) {
  if (state.activePoiCategories.has(category)) {
    state.activePoiCategories.delete(category);
  } else {
    state.activePoiCategories.add(category);
  }
  renderCorridorPoiMarkers();
  renderCorridorPoiList();
}

// Render Corridor POI List in Right Panel
function renderCorridorPoiList() {
  const container = document.getElementById('route-pois-list');
  const countLabel = document.getElementById('route-poi-list-count');
  if (!container) return;

  const filtered = state.corridorPois.filter(p => state.activePoiCategories.has(p.category || 'historic'));
  if (countLabel) countLabel.textContent = `${filtered.length} yer listeleniyor`;

  container.innerHTML = '';
  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-500 py-3 text-center">Bu kategoride koridorda nokta bulunamadı.</p>';
    return;
  }

  filtered.slice(0, 30).forEach(p => {
    const cfg = CATEGORY_CONFIG[p.category] || CATEGORY_CONFIG.historic;
    const div = document.createElement('div');
    div.className = 'glass-card p-2.5 rounded-xl border border-slate-800/80 flex items-start justify-between space-x-2 text-xs hover:border-slate-700 transition-all';
    const safeName = escapeHtml(p.name).replace(/'/g, "\\'");

    div.innerHTML = `
      <div class="min-w-0 flex-1">
        <div class="flex items-center space-x-1.5">
          <span>${cfg.emoji}</span>
          <p class="font-bold text-white truncate">${escapeHtml(p.name)}</p>
        </div>
        <p class="text-[10px] text-slate-400 truncate mt-0.5">${escapeHtml(p.description || '')}</p>
        <span class="text-[9px] text-amber-400 font-semibold">📍 Rotadan ${p.distKm} km</span>
      </div>
      <button onclick="addPoiToRoute(${p.lat}, ${p.lon}, '${safeName}')" class="shrink-0 p-1.5 bg-brand-600/80 hover:bg-brand-500 text-white rounded-lg text-[10px] font-semibold flex items-center space-x-1" title="Rotaya Ekle">
        <i data-lucide="plus" class="w-3 h-3"></i>
        <span>Ekle</span>
      </button>
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

  // Select top-rated places with minimal detour (between 0.5 km and 12 km from route)
  const candidates = state.corridorPois
    .filter(p => p.distKm >= 0.5 && p.distKm <= 15.0)
    .sort((a, b) => (b.rating || 4.8) - (a.rating || 4.8));

  const picks = candidates.slice(0, 3);
  state.smartRecommendations = picks;

  if (picks.length === 0) {
    container.innerHTML = '<p class="text-[11px] text-slate-500 py-2">Bu güzergahta ek sapma önerisi bulunmuyor.</p>';
    return;
  }

  picks.forEach(p => {
    const cfg = CATEGORY_CONFIG[p.category] || CATEGORY_CONFIG.historic;
    const detourKm = (p.distKm * 1.8).toFixed(1);
    const detourMin = Math.round((detourKm / 45) * 60);
    const safeName = escapeHtml(p.name).replace(/'/g, "\\'");

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
      <div class="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
        <span>Önerilen Mola: ${p.recommended_duration || '1-2 saat'}</span>
        <button onclick="addPoiToRoute(${p.lat}, ${p.lon}, '${safeName}')" class="bg-brand-600 hover:bg-brand-500 text-white font-bold px-2.5 py-1 rounded-lg shadow-sm shadow-brand-600/30 flex items-center space-x-1">
          <i data-lucide="plus" class="w-3 h-3"></i>
          <span>ROTAYA EKLE</span>
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  initIcons();
}

// Add POI to Route as an Optimal Intermediate Waypoint
function addPoiToRoute(lat, lon, name) {
  const insertIndex = state.waypoints.length - 1;
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
  calculateRouteMain();

  alert(`"${name}" rotanıza başarıyla eklendi! Rota güncelleniyor.`);
}

// JOURNEY TIMELINE
function renderJourneyTimeline() {
  const container = document.getElementById('journey-timeline-container');
  if (!container) return;

  container.innerHTML = '';
  const valid = state.waypoints.filter(w => w.lat !== null && w.lon !== null);

  valid.forEach((wp, idx) => {
    const isStart = idx === 0;
    const isEnd = idx === valid.length - 1;

    const div = document.createElement('div');
    div.className = 'timeline-item flex items-start space-x-3 text-xs relative pb-4';

    let dotColor = isStart ? 'bg-emerald-500' : isEnd ? 'bg-red-500' : 'bg-amber-500';
    let label = isStart ? 'BAŞLANGIÇ' : isEnd ? 'VARIŞ' : `DURAK ${idx}`;

    div.innerHTML = `
      <div class="w-6 h-6 rounded-full ${dotColor} flex items-center justify-center text-[10px] font-bold text-white shrink-0 z-10 shadow-lg">
        ${isStart ? 'A' : isEnd ? 'B' : idx}
      </div>
      <div class="glass-card p-2.5 rounded-xl border border-slate-800 flex-1">
        <div class="flex items-center justify-between">
          <span class="text-[9px] font-bold uppercase text-slate-400 tracking-wider">${label}</span>
          ${!isStart && !isEnd ? `
            <button onclick="removeWaypoint(${idx})" class="text-slate-500 hover:text-red-400" title="Kaldır">
              <i data-lucide="trash-2" class="w-3 h-3"></i>
            </button>
          ` : ''}
        </div>
        <p class="font-bold text-white text-xs mt-0.5">${escapeHtml(wp.name || 'İsimsiz Nokta')}</p>
      </div>
    `;

    container.appendChild(div);
  });

  initIcons();
}

// Right Panel Toggling & Tabs
function toggleRightPanel() {
  const panel = document.getElementById('right-panel');
  if (!panel) return;
  panel.classList.toggle('hidden');
}

function switchRightTab(tab) {
  const btnDiscover = document.getElementById('tab-btn-discover');
  const btnTimeline = document.getElementById('tab-btn-timeline');
  const contentDiscover = document.getElementById('tab-content-discover');
  const contentTimeline = document.getElementById('tab-content-timeline');

  if (tab === 'discover') {
    btnDiscover.className = 'px-3 py-1 rounded-lg font-semibold bg-brand-600 text-white shadow-sm';
    btnTimeline.className = 'px-3 py-1 rounded-lg font-semibold text-slate-400 hover:text-white';
    contentDiscover.classList.remove('hidden');
    contentTimeline.classList.add('hidden');
  } else {
    btnTimeline.className = 'px-3 py-1 rounded-lg font-semibold bg-brand-600 text-white shadow-sm';
    btnDiscover.className = 'px-3 py-1 rounded-lg font-semibold text-slate-400 hover:text-white';
    contentTimeline.classList.remove('hidden');
    contentDiscover.classList.add('hidden');
  }
}

// Mobile Sidebar Controls
function openMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('hidden');
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.add('hidden');
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

    panel.classList.remove('hidden');
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
  const step = Math.max(1, Math.floor(routeCoords.length / 150));
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
            <span>${cfg.title}</span>
          </span>
          <span class="text-[10px] text-slate-400">${p.city || p.region || 'Türkiye'}</span>
        </div>
        <h4 class="font-bold text-white text-sm">${escapeHtml(p.name)}</h4>
        <p class="text-[11px] text-slate-300 mt-1 line-clamp-2">${escapeHtml(p.description || '')}</p>
      </div>

      <div class="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px]">
        <span class="text-slate-400">⏱️ ${p.recommended_duration || '1 saat'}</span>
        <div class="flex items-center space-x-1.5">
          <button onclick="setAsDestination(${p.lat}, ${p.lon}, '${safeName}')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold">
            Hedef Yap
          </button>
          <button onclick="addPoiToRoute(${p.lat}, ${p.lon}, '${safeName}')" class="px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold">
            Rotaya Ekle
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
  alert('Rota başarıyla kaydedildi!');
}

function openSavedRoutesModal() {
  const modal = document.getElementById('modal-saved-routes');
  const list = document.getElementById('saved-routes-list');
  if (!modal || !list) return;

  modal.classList.remove('hidden');
  list.innerHTML = '';

  let savedList = [];
  try {
    const raw = localStorage.getItem('rotam_saved_routes');
    if (raw) savedList = JSON.parse(raw);
  } catch (err) {}

  if (savedList.length === 0) {
    list.innerHTML = '<p class="text-xs text-slate-400 py-6 text-center">Henüz kaydedilmiş rotanız bulunmuyor.</p>';
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

function openAdminModal() {
  const modal = document.getElementById('modal-admin');
  if (!modal) return;
  modal.classList.remove('hidden');

  switchAdminTab('places');
  updateAdminStats();
  renderAdminPlacesList();
}

function closeAdminModal() {
  document.getElementById('modal-admin')?.classList.add('hidden');
}

function updateAdminStats() {
  const total = state.allPlaces.length;
  const historic = state.allPlaces.filter(p => p.category === 'historic').length;
  const nature = state.allPlaces.filter(p => p.category === 'nature').length;
  const gastro = state.allPlaces.filter(p => p.category === 'gastronomy' || p.category === 'cafe').length;

  document.getElementById('admin-stat-total').textContent = total;
  document.getElementById('admin-stat-historic').textContent = historic;
  document.getElementById('admin-stat-nature').textContent = nature;
  document.getElementById('admin-stat-gastro').textContent = gastro;

  // Local analytics tracking (#34)
  let visits = parseInt(localStorage.getItem('rotam_visits') || '1428', 10);
  const totalVisitsEl = document.getElementById('analytics-total-visits');
  if (totalVisitsEl) totalVisitsEl.textContent = visits.toLocaleString('tr-TR');
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
    alert('Lütfen mekan adı, enlem ve boylam değerlerini eksiksiz girin.');
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
  alert('Yeni mekan başarıyla eklendi!');
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
        alert('Hata: Yüklenen JSON dosyası geçerli bir mekan listesi içermiyor.');
        return;
      }
      state.allPlaces = parsed;
      localStorage.setItem('rotam_custom_places', JSON.stringify(parsed));
      updateAdminStats();
      renderAdminPlacesList();
      alert(`Başarılı! ${parsed.length} mekan başarıyla geri yüklendi.`);
    } catch (err) {
      alert('Dosya okuma hatası: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// MODAL: MEKAN DETAY PENCERESİ
function openPlaceDetailById(id) {
  const place = state.allPlaces.find(p => p.id === id);
  if (!place) return;

  const modal = document.getElementById('modal-place-detail');
  const cfg = CATEGORY_CONFIG[place.category] || CATEGORY_CONFIG.historic;

  document.getElementById('place-detail-icon').textContent = cfg.emoji;
  document.getElementById('place-detail-name').textContent = place.name;
  document.getElementById('place-detail-cat-badge').textContent = cfg.title;
  document.getElementById('place-detail-desc').textContent = place.description || 'Bu mekan hakkında henüz detaylı açıklama girilmemiş.';
  document.getElementById('place-detail-time').textContent = place.best_time || 'Tüm Yıl Boyunca';
  document.getElementById('place-detail-duration').textContent = place.recommended_duration || '1 saat';

  const tagsCont = document.getElementById('place-detail-tags-container');
  tagsCont.innerHTML = '';
  if (place.tags && Array.isArray(place.tags)) {
    place.tags.forEach(t => {
      const span = document.createElement('span');
      span.className = 'text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full';
      span.textContent = `#${t}`;
      tagsCont.appendChild(span);
    });
  }

  const safeName = escapeHtml(place.name).replace(/'/g, "\\'");
  document.getElementById('btn-place-add-to-route').onclick = () => {
    addPoiToRoute(place.lat, place.lon, safeName);
    closePlaceDetailModal();
  };

  document.getElementById('btn-place-set-destination').onclick = () => {
    setAsDestination(place.lat, place.lon, safeName);
    closePlaceDetailModal();
  };

  modal.classList.remove('hidden');
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
        alert('GPX dosyasında iz noktası (trkpt) bulunamadı.');
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

      alert(`GPX rotası yüklendi: ${(totalDist / 1000).toFixed(1)} km`);
    } catch (err) {
      alert('GPX işleme hatası: ' + err.message);
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
  if (valid.length < 2) return;

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

  window.open(url, '_blank');
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
  initPlacesDatabase();
  initMap();
  updateWaypointsListUI();
  initIcons();

  // Increment local visits telemetry (#34)
  try {
    let visits = parseInt(localStorage.getItem('rotam_visits') || '1428', 10);
    visits++;
    localStorage.setItem('rotam_visits', visits.toString());
  } catch (e) {}

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
