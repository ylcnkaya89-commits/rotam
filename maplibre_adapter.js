// ========================================================
// Rotam MapLibre GL JS 3D Vector Map Engine & Compatibility Adapter
// Enables hardware-accelerated WebGL 3D vector map, 3D building extrusions,
// 60 FPS GPU camera rotation, and 3D navigation cockpit mode (pitch: 60°).
// ========================================================

window.isMapLibre = false;

window.RotamMapEngine = {
  activeEngine: localStorage.getItem('rotam_map_engine') || 'maplibre',
  currentStyleKey: 'dark',
  maplibreInstance: null,

  STYLES: {
    dark: 'https://tiles.openfreemap.org/styles/dark',
    day: 'https://tiles.openfreemap.org/styles/liberty',
    osm: 'https://tiles.openfreemap.org/styles/liberty',
    voyager: 'https://tiles.openfreemap.org/styles/liberty',
    sat: {
      version: 8,
      sources: {
        satellite: {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256
        }
      },
      layers: [
        {
          id: 'satellite-bg',
          type: 'raster',
          source: 'satellite'
        }
      ]
    },
    topo: 'https://tiles.openfreemap.org/styles/bright'
  },

  isSupported() {
    return (
      typeof maplibregl !== 'undefined' &&
      typeof maplibregl.supported === 'function' &&
      maplibregl.supported()
    );
  },

  shouldUseMapLibre() {
    return this.activeEngine === 'maplibre' && this.isSupported();
  },

  toggleEngine() {
    const isEn = (window.state && window.state.lang === 'en');
    if (this.activeEngine === 'maplibre') {
      this.activeEngine = 'leaflet';
      localStorage.setItem('rotam_map_engine', 'leaflet');
      showToast(isEn ? 'Switching to 2D Leaflet...' : '2D Leaflet motoruna geçiliyor...', 'info');
    } else {
      if (!this.isSupported()) {
        showToast(isEn ? 'WebGL not supported on this device' : 'Cihazınız WebGL 3D motorunu desteklemiyor', 'warning');
        return;
      }
      this.activeEngine = 'maplibre';
      localStorage.setItem('rotam_map_engine', 'maplibre');
      showToast(isEn ? 'Switching to 3D MapLibre Vector...' : '3D MapLibre Vektör motoruna geçiliyor...', 'success');
    }
    setTimeout(() => {
      window.location.reload();
    }, 600);
  },

  updateEngineUI() {
    const label = document.getElementById('map-engine-label');
    const btn = document.getElementById('btn-toggle-engine');
    const is3D = (this.activeEngine === 'maplibre' && window.isMapLibre);

    if (label) {
      label.textContent = is3D ? '3D Vektör' : '2D Klasik';
    }
    if (btn) {
      if (is3D) {
        btn.className = 'px-2 py-1 rounded-lg text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 flex items-center space-x-1 transition-all';
        btn.title = 'Harita Motoru: 3D MapLibre Vektör (Tıklayarak 2D Leaflet moduna geçebilirsiniz)';
      } else {
        btn.className = 'px-2 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 flex items-center space-x-1 transition-all';
        btn.title = 'Harita Motoru: 2D Leaflet Klasik (Tıklayarak 3D Vektör moduna geçebilirsiniz)';
      }
    }
  }
};

// ==========================================
// MapLibre Polyline Wrapper (GeoJSON LineString)
// Emulates L.polyline API so all routing code in Rotam works unchanged!
// ==========================================
class MapLibrePolylineWrapper {
  constructor(m, latlngs, options = {}) {
    this.map = m;
    this.id = 'rotam-line-' + Math.random().toString(36).substr(2, 9);
    this.sourceId = 'source-' + this.id;
    this.options = options || {};
    this.latlngs = latlngs || [];
    this._listeners = {};

    this._draw();
  }

  _draw() {
    if (!this.map) return;
    const m = this.map;

    const render = () => {
      try {
        const coords = this.latlngs.map(pt => [pt[1], pt[0]]); // [lon, lat]
        const geojson = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coords
          }
        };

        if (m.getSource(this.sourceId)) {
          m.getSource(this.sourceId).setData(geojson);
          return;
        }

        m.addSource(this.sourceId, {
          type: 'geojson',
          data: geojson
        });

        m.addLayer({
          id: this.id,
          type: 'line',
          source: this.sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': this.options.color || '#38bdf8',
            'line-width': this.options.weight || 6,
            'line-opacity': this.options.opacity !== undefined ? this.options.opacity : 0.95
          }
        });

        m.on('click', this.id, (e) => {
          if (this._listeners['click']) this._listeners['click'](e);
        });
        m.on('mouseenter', this.id, () => {
          m.getCanvas().style.cursor = 'pointer';
          if (this._listeners['mouseover']) this._listeners['mouseover']();
        });
        m.on('mouseleave', this.id, () => {
          m.getCanvas().style.cursor = '';
          if (this._listeners['mouseout']) this._listeners['mouseout']();
        });
      } catch (err) {
        console.warn('MapLibre polyline render deferral:', err);
      }
    };

    if (m.isStyleLoaded && m.isStyleLoaded()) {
      render();
    } else {
      m.once('load', render);
    }
  }

  setStyle(newOpts = {}) {
    this.options = Object.assign(this.options, newOpts);
    try {
      if (newOpts.color && this.map && this.map.getLayer(this.id)) {
        this.map.setPaintProperty(this.id, 'line-color', newOpts.color);
      }
      if (newOpts.weight && this.map && this.map.getLayer(this.id)) {
        this.map.setPaintProperty(this.id, 'line-width', newOpts.weight);
      }
      if (newOpts.opacity !== undefined && this.map && this.map.getLayer(this.id)) {
        this.map.setPaintProperty(this.id, 'line-opacity', newOpts.opacity);
      }
    } catch (e) {}
  }

  on(event, handler) {
    this._listeners[event] = handler;
    return this;
  }

  addTo(m) {
    this.map = m;
    this._draw();
    return this;
  }

  remove() {
    try {
      if (this.map) {
        if (this.map.getLayer(this.id)) this.map.removeLayer(this.id);
        if (this.map.getSource(this.sourceId)) this.map.removeSource(this.sourceId);
      }
    } catch (e) {}
  }

  getBounds() {
    if (!this.latlngs || this.latlngs.length === 0) {
      return {
        _southWest: { lat: 39, lng: 35 },
        _northEast: { lat: 39, lng: 35 },
        isValid: () => true
      };
    }
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    for (const pt of this.latlngs) {
      const lat = pt[0], lon = pt[1];
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    }
    return {
      _southWest: { lat: minLat, lng: minLon },
      _northEast: { lat: maxLat, lng: maxLon },
      isValid: () => true
    };
  }
}

// ==========================================
// MapLibre Marker Wrapper (HTML DOM Marker)
// Emulates L.marker API so custom HTML pins, icons, and popups work unchanged!
// ==========================================
class MapLibreMarkerWrapper {
  constructor(latlng, options = {}) {
    this.latlng = latlng;
    this.options = options || {};
    this._listeners = {};

    let el;
    if (options.customElement) {
      el = options.customElement;
    } else if (options.icon && options.icon.options && options.icon.options.html) {
      el = document.createElement('div');
      if (options.icon.options.className) {
        el.className = options.icon.options.className;
      }
      el.innerHTML = options.icon.options.html;
    } else {
      el = document.createElement('div');
      el.className = 'w-4 h-4 bg-blue-500 rounded-full border-2 border-white';
    }
    this.element = el;

    const lon = Array.isArray(latlng) ? latlng[1] : (latlng.lon || latlng.lng);
    const lat = Array.isArray(latlng) ? latlng[0] : latlng.lat;

    this.marker = new maplibregl.Marker({
      element: el,
      draggable: !!options.draggable
    }).setLngLat([lon, lat]);

    this.marker.on('dragend', () => {
      const lngLat = this.marker.getLngLat();
      if (this._listeners['dragend']) {
        this._listeners['dragend']({
          target: {
            getLatLng: () => ({ lat: lngLat.lat, lng: lngLat.lng })
          }
        });
      }
    });

    el.addEventListener('click', (e) => {
      if (this._listeners['click']) {
        this._listeners['click'](e);
      }
    });
  }

  addTo(m) {
    this.map = m;
    this.marker.addTo(m);
    return this;
  }

  setLatLng(latlng) {
    this.latlng = latlng;
    const lon = Array.isArray(latlng) ? latlng[1] : (latlng.lon || latlng.lng);
    const lat = Array.isArray(latlng) ? latlng[0] : latlng.lat;
    this.marker.setLngLat([lon, lat]);
    return this;
  }

  getLatLng() {
    const lngLat = this.marker.getLngLat();
    return { lat: lngLat.lat, lng: lngLat.lng };
  }

  on(event, handler) {
    this._listeners[event] = handler;
    return this;
  }

  bindPopup(html) {
    const popup = new maplibregl.Popup({ offset: 25, closeButton: true, maxWidth: '320px' }).setHTML(html);
    this.marker.setPopup(popup);
    return this;
  }

  openPopup() {
    const popup = this.marker.getPopup();
    if (popup && this.map) {
      popup.addTo(this.map);
    }
    return this;
  }

  closePopup() {
    const popup = this.marker.getPopup();
    if (popup) {
      popup.remove();
    }
    return this;
  }

  remove() {
    this.marker.remove();
  }
}

// ==========================================
// MapLibre Instance Wrapper & Polyfills
// Adds Leaflet-compatible convenience methods directly to the map instance.
// ==========================================
function wrapMapLibreInstance(m) {
  m.invalidateSize = function() {
    this.resize();
  };

  const origFlyTo = m.flyTo.bind(m);
  m.flyTo = function(target, zoom, options = {}) {
    if (Array.isArray(target)) {
      const [lat, lon] = target;
      origFlyTo({
        center: [lon, lat],
        zoom: zoom !== undefined ? zoom : this.getZoom(),
        duration: (options.duration ? options.duration * 1000 : 1200)
      });
    } else if (typeof target === 'object' && target.center) {
      origFlyTo(target);
    }
  };

  const origPanTo = m.panTo.bind(m);
  m.panTo = function(target, options = {}) {
    if (Array.isArray(target)) {
      origPanTo([target[1], target[0]], options);
    } else {
      origPanTo(target, options);
    }
  };

  m.setView = function(target, zoom, options = {}) {
    if (Array.isArray(target)) {
      const [lat, lon] = target;
      const targetZoom = zoom !== undefined ? zoom : this.getZoom();
      if (options.animate === false) {
        this.jumpTo({ center: [lon, lat], zoom: targetZoom });
      } else {
        origFlyTo({ center: [lon, lat], zoom: targetZoom, duration: 800 });
      }
    }
  };

  const origGetCenter = m.getCenter.bind(m);
  m.getCenter = function() {
    const c = origGetCenter();
    return { lat: c.lat, lng: c.lng };
  };

  const origFitBounds = m.fitBounds.bind(m);
  m.fitBounds = function(bounds, options = {}) {
    try {
      let b;
      if (bounds && bounds._southWest && bounds._northEast) {
        b = [
          [bounds._southWest.lng, bounds._southWest.lat],
          [bounds._northEast.lng, bounds._northEast.lat]
        ];
      } else if (Array.isArray(bounds) && bounds.length === 2 && Array.isArray(bounds[0])) {
        b = [
          [bounds[0][1], bounds[0][0]],
          [bounds[1][1], bounds[1][0]]
        ];
      } else {
        b = bounds;
      }
      let pad = 50;
      if (options.padding) {
        pad = Array.isArray(options.padding) ? options.padding[0] : options.padding;
      }
      origFitBounds(b, { padding: pad, maxZoom: 16 });
    } catch (e) {
      console.warn('MapLibre fitBounds handling:', e);
    }
  };

  const origRemoveLayer = m.removeLayer.bind(m);
  m.removeLayer = function(layerOrId) {
    if (layerOrId && typeof layerOrId.remove === 'function') {
      layerOrId.remove();
    } else if (typeof layerOrId === 'string') {
      try {
        if (this.getLayer(layerOrId)) origRemoveLayer(layerOrId);
        if (this.getSource(layerOrId)) this.removeSource(layerOrId);
      } catch (e) {}
    }
  };

  m.hasLayer = function(layer) {
    return !!layer;
  };

  // Map Click wrapper: provides standard e.latlng object
  const origOn = m.on.bind(m);
  m.on = function(event, ...args) {
    if (event === 'click' && typeof args[0] === 'function') {
      const userFn = args[0];
      return origOn('click', (e) => {
        e.latlng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
        userFn(e);
      });
    }
    return origOn(event, ...args);
  };
}

// 3D Buildings Extrusion setup on MapLibre vector tiles
function setup3DBuildingsLayer(m) {
  try {
    const layers = m.getStyle().layers;
    let labelLayerId;
    for (let i = 0; i < layers.length; i++) {
      if (layers[i].type === 'symbol' && layers[i].layout && layers[i].layout['text-field']) {
        labelLayerId = layers[i].id;
        break;
      }
    }

    const sourceName = m.getSource('openmaptiles') ? 'openmaptiles' : (m.getSource('protomaps') ? 'protomaps' : null);
    if (sourceName && !m.getLayer('rotam-3d-buildings')) {
      m.addLayer({
        id: 'rotam-3d-buildings',
        source: sourceName,
        'source-layer': 'building',
        type: 'fill-extrusion',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': '#1e293b',
          'fill-extrusion-height': [
            'interpolate', ['linear'], ['zoom'],
            14, 0,
            16, ['coalesce', ['get', 'render_height'], ['get', 'height'], 20]
          ],
          'fill-extrusion-base': [
            'interpolate', ['linear'], ['zoom'],
            14, 0,
            16, ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0]
          ],
          'fill-extrusion-opacity': 0.75
        }
      }, labelLayerId);
    }
  } catch (e) {}
}

// ==========================================
// Patch Leaflet Global Factory Functions (L.marker, L.polyline, L.circleMarker)
// Dynamically creates MapLibre equivalents when window.isMapLibre is active!
// ==========================================
if (typeof L !== 'undefined') {
  const origLMarker = L.marker;
  L.marker = function(latlng, options) {
    if (window.isMapLibre && window.map instanceof maplibregl.Map) {
      return new MapLibreMarkerWrapper(latlng, options);
    }
    return origLMarker.apply(L, arguments);
  };

  const origLPolyline = L.polyline;
  L.polyline = function(latlngs, options) {
    if (window.isMapLibre && window.map instanceof maplibregl.Map) {
      return new MapLibrePolylineWrapper(window.map, latlngs, options);
    }
    return origLPolyline.apply(L, arguments);
  };

  const origLCircleMarker = L.circleMarker;
  L.circleMarker = function(latlng, opts = {}) {
    if (window.isMapLibre && window.map instanceof maplibregl.Map) {
      const r = opts.radius || 6;
      const el = document.createElement('div');
      el.style.width = (r * 2) + 'px';
      el.style.height = (r * 2) + 'px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = opts.fillColor || '#ffffff';
      el.style.border = '2px solid ' + (opts.color || '#38bdf8');
      el.style.boxShadow = '0 0 8px ' + (opts.color || '#38bdf8');
      return new MapLibreMarkerWrapper(latlng, { customElement: el });
    }
    return origLCircleMarker.apply(L, arguments);
  };
}
