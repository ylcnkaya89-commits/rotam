// Leaflet Yandex Layer Plugin
// Based on shramov/leaflet-plugins (MIT License)
/* global ymaps: true, L: true */

(function () {
  if (typeof L === 'undefined') return;

  L.Yandex = L.Layer.extend({
    options: {
      type: 'yandex#map', // 'map', 'satellite', 'hybrid', 'map~vector'
      mapOptions: {
        balloonAutoPan: false,
        suppressMapOpenBlock: true
      },
      overlayOpacity: 0.8,
      minZoom: 0,
      maxZoom: 19
    },

    initialize: function (type, options) {
      if (typeof type === 'object') {
        options = type;
        type = false;
      }
      options = L.Util.setOptions(this, options);
      if (type) { this.options.type = type; }
      this._isOverlay = options.type.indexOf('overlay') !== -1 ||
                        options.type.indexOf('skeleton') !== -1;
      this._animatedElements = [];
    },

    _setStyle: function (el, style) {
      for (var prop in style) {
        el.style[prop] = style[prop];
      }
    },

    _initContainer: function (parentEl) {
      var zIndexClass = this._isOverlay ? 'leaflet-overlay-pane' : 'leaflet-tile-pane';
      var _container = L.DomUtil.create('div', 'leaflet-yandex-container leaflet-pane ' + zIndexClass);
      var opacity = this.options.opacity || (this._isOverlay && this.options.overlayOpacity);
      if (opacity) {
        L.DomUtil.setOpacity(_container, opacity);
      }
      var auto = { width: '100%', height: '100%' };
      this._setStyle(parentEl, auto);
      this._setStyle(_container, auto);
      return _container;
    },

    onAdd: function (map) {
      this._map = map;
      var mapPane = map.getPane('mapPane');
      if (!this._container) {
        this._container = this._initContainer(mapPane);
        map.once('unload', this._destroy, this);
        this._initApi();
      }
      mapPane.appendChild(this._container);
      if (!this._yandex) { return; }
      this._setEvents(map);
      this._update();
    },

    beforeAdd: function (map) {
      if (map._addZoomLimit) map._addZoomLimit(this);
    },

    onRemove: function (map) {
      if (map._removeZoomLimit) map._removeZoomLimit(this);
      if (this._container && this._container.parentNode) {
        this._container.parentNode.removeChild(this._container);
      }
    },

    _destroy: function (e) {
      if (!this._map || this._map === e.target) {
        if (this._yandex) {
          try { this._yandex.destroy(); } catch (err) {}
          delete this._yandex;
        }
        delete this._container;
      }
    },

    _setEvents: function (map) {
      var events = {
        move: this._update,
        resize: function () {
          if (this._yandex && this._yandex.container) {
            this._yandex.container.fitToViewport();
          }
        }
      };
      if (this._zoomAnimated) {
        events.zoomanim = this._animateZoom;
        events.zoomend = this._animateZoomEnd;
      }
      map.on(events, this);
      this.once('remove', function () {
        map.off(events, this);
        if (this._container) {
          this._container.remove();
        }
      }, this);
    },

    _update: function () {
      if (!this._map || !this._yandex) return;
      var map = this._map;
      var center = map.getCenter();
      try {
        this._yandex.setCenter([center.lat, center.lng], map.getZoom(), { checkZoomRange: false });
        var offset = L.point(0, 0).subtract(L.DomUtil.getPosition(map.getPane('mapPane')));
        L.DomUtil.setPosition(this._container, offset);
      } catch (e) {}
    },

    _animateZoom: function (e) {
      if (!this._map || !this._yandex) return;
      var map = this._map;
      var viewHalf = map.getSize()._divideBy(2);
      var topLeft = map.project(e.center, e.zoom)._subtract(viewHalf)._round();
      var offset = map.project(map.getBounds().getNorthWest(), e.zoom)._subtract(topLeft);
      var scale = map.getZoomScale(e.zoom);
      this._animatedElements.length = 0;
      if (this._yandex.panes && this._yandex.panes._array) {
        this._yandex.panes._array.forEach(function (el) {
          if (typeof ymaps !== 'undefined' && el.pane instanceof ymaps.pane.MovablePane) {
            var element = el.pane.getElement();
            L.DomUtil.addClass(element, 'leaflet-zoom-animated');
            L.DomUtil.setTransform(element, offset, scale);
            this._animatedElements.push(element);
          }
        }, this);
      }
    },

    _animateZoomEnd: function () {
      this._animatedElements.forEach(function (el) {
        L.DomUtil.setTransform(el, 0, 1);
      });
      this._animatedElements.length = 0;
    },

    _initApi: function () {
      if (typeof ymaps === 'undefined') {
        // Retry until ymaps loads
        var self = this;
        var attempts = 0;
        var checkYmaps = setInterval(function () {
          attempts++;
          if (typeof ymaps !== 'undefined' && ymaps.ready) {
            clearInterval(checkYmaps);
            ymaps.ready(self._initMapObject, self);
          } else if (attempts > 30) {
            clearInterval(checkYmaps);
            console.warn('Yandex Maps API ymaps nesnesi yüklenemedi.');
          }
        }, 200);
        return;
      }
      ymaps.ready(this._initMapObject, this);
    },

    _mapType: function () {
      var shortType = this.options.type;
      if (!shortType || shortType.indexOf('#') !== -1) {
        return shortType;
      }
      return 'yandex#' + shortType;
    },

    _initMapObject: function () {
      if (!this._container) return;
      try {
        var center = (this._map) ? this._map.getCenter() : { lat: 39.0, lng: 35.2 };
        var zoom = (this._map) ? this._map.getZoom() : 6;

        var ymap = new ymaps.Map(this._container, {
          center: [center.lat, center.lng],
          zoom: zoom,
          behaviors: [],
          controls: [],
          type: this._mapType()
        }, this.options.mapOptions);

        if (this._isOverlay) {
          ymap.container.getElement().style.background = 'transparent';
        }
        this._yandex = ymap;
        if (this._map) {
          this.onAdd(this._map);
        }
        this.fire('load');
      } catch (err) {
        console.warn('Yandex Map Object init error:', err);
      }
    }
  });

  L.yandex = function (type, options) {
    return new L.Yandex(type, options);
  };
})();
