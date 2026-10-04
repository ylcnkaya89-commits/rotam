// Rotam otomatik test — yalnızca ?selftest ile yüklenir
(async function () {
  const log = (...a) => console.log('[SELFTEST]', ...a);
  window.addEventListener('error', e => log('JS HATASI:', e.message, e.filename + ':' + e.lineno));
  window.alert = msg => log('ALERT:', msg);

  const wait = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 100 && !map; i++) await wait(200);
  log('Harita yüklendi:', !!map);
  if (!map) return;

  // Muğla Merkez -> Akyaka -> Datça
  state.waypoints = [
    { id: 'start', type: 'start', name: 'Muğla', lat: 37.2153, lon: 28.3636, marker: null },
    { id: 'end', type: 'end', name: 'Datça', lat: 36.7262, lon: 27.6841, marker: null }
  ];
  state.waypoints.forEach(updateMarker);
  renderWaypointsUI();

  // 1) Yol tercihleri
  for (const p of ['twisty', 'scenic', 'fastest']) {
    document.querySelector(`.profile-btn[data-profile="${p}"]`).click();
    for (let i = 0; i < 150 && document.getElementById('map-hint')?.textContent.includes('hesaplanıyor'); i++) await wait(200);
    await wait(500);
    const r = state.routeData;
    log(`PROFİL ${p}: kaynak=${r?.source} mesafe=${r ? (r.distance / 1000).toFixed(1) : '-'}km süre=${r ? Math.round(r.duration / 60) : '-'}dk viraj=${document.getElementById('stat-curviness').textContent}`);
  }

  // 2) POI (rota boyunca)
  for (const t of ['fuel', 'cafe', 'viewpoint', 'historic']) {
    const t0 = Date.now();
    const btn = document.getElementById('poi-' + t);
    await togglePoi(t, btn);
    log(`POI ${t}: ${state.poiMarkers.filter(m => m.poiType === t).length} nokta, ${Date.now() - t0}ms, aktif=${state.activePoiTypes.has(t)}`);
  }

  // 3) POI'yi rotaya ekle
  const before = state.waypoints.length;
  if (state.poiList.length) {
    poiAction(0, 'via');
    await wait(8000);
    log(`POI rotaya ekleme: durak ${before} -> ${state.waypoints.length}, yeni mesafe=${(state.routeData.distance / 1000).toFixed(1)}km`);
  }

  // 4) POI kapatma
  await togglePoi('fuel', document.getElementById('poi-fuel'));
  log('POI fuel kapatıldı, kalan fuel işaretçisi:', state.poiMarkers.filter(m => m.poiType === 'fuel').length);

  // 5) Tarihi yerler + efsane rotalar
  log('Tarihi yer sayısı:', state.allHistoricPlaces.length, 'fonksiyonlar:', typeof flyToHistoricSpot, typeof addHistoricSpotToRoute, typeof loadPresetRoute);
  log('BİTTİ');
})();
