'use client';

import { useEffect, useRef } from 'react';
// Leaflet CSS imported here (not in globals.css) so it only ships when
// the map component is actually rendered. The map sits below the fold
// inside the contact section, so this defers ~10 KB of CSS off the
// initial homepage critical path. Pages that never mount ServiceMap
// (auth, dashboard, etc) don't pay the cost at all.
import 'leaflet/dist/leaflet.css';

const NEIGHBORHOODS: { name: string; lat: number; lng: number; hq?: boolean }[] = [
  { name: 'Downtown Phoenix',  lat: 33.4484, lng: -112.0740, hq: true },
  { name: 'Scottsdale',        lat: 33.4942, lng: -111.9261 },
  { name: 'Old Town Scottsdale', lat: 33.4936, lng: -111.9256 },
  { name: 'Paradise Valley',   lat: 33.5312, lng: -111.9426 },
  { name: 'Tempe',             lat: 33.4255, lng: -111.9400 },
  { name: 'Mesa',              lat: 33.4152, lng: -111.8315 },
  { name: 'Chandler',          lat: 33.3062, lng: -111.8413 },
  { name: 'Gilbert',           lat: 33.3528, lng: -111.7890 },
  { name: 'Ahwatukee',         lat: 33.3167, lng: -111.9840 },
  { name: 'Glendale',          lat: 33.5387, lng: -112.1860 },
  { name: 'Peoria',            lat: 33.5806, lng: -112.2374 },
  { name: 'Arcadia / Biltmore', lat: 33.5030, lng: -111.9760 },
];

export default function ServiceMap() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let map: import('leaflet').Map | null = null;

    (async () => {
      const L = (await import('leaflet')).default;

      if (!containerRef.current) return;

      map = L.map(containerRef.current, {
        center: [33.44, -111.97],
        zoom: 10,
        scrollWheelZoom: false,
        zoomControl: true,
      });

      // Satellite imagery base layer (Esri World Imagery)
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri',
          maxZoom: 18,
        }
      ).addTo(map);

      // Reference labels overlay
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 18, pane: 'overlayPane' }
      ).addTo(map);

      // Remove default Leaflet prefix (removes the Ukrainian flag link)
      map.attributionControl.setPrefix('');

      // Service area circle (38 km radius)
      L.circle([33.44, -111.97], {
        radius: 38000,
        color: '#d4a24c',
        weight: 2,
        dashArray: '6 6',
        fillColor: '#d4a24c',
        fillOpacity: 0.06,
      }).addTo(map);

      // Neighborhood markers
      NEIGHBORHOODS.forEach(({ name, lat, lng, hq }) => {
        const icon = L.divIcon({
          className: '',
          html: hq
            ? `<div style="position:relative;width:16px;height:16px;">
                 <div style="position:absolute;inset:0;border-radius:50%;background:rgba(212,162,76,0.5);animation:map-pulse 1.8s ease-in-out infinite;"></div>
                 <div style="position:absolute;inset:2px;border-radius:50%;background:#d4a24c;border:2px solid #fff;"></div>
               </div>`
            : `<div style="width:10px;height:10px;border-radius:50%;background:#d4a24c;border:2px solid #fff;"></div>`,
          iconSize: hq ? [16, 16] : [10, 10],
          iconAnchor: hq ? [8, 8] : [5, 5],
        });

        L.marker([lat, lng], { icon })
          .addTo(map!)
          .bindPopup(`<strong style="font-family:sans-serif;font-size:13px">${name}</strong>`, {
            closeButton: false,
          });
      });
    })();

    return () => {
      map?.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-80 w-full overflow-hidden rounded-2xl border border-white/10 sm:h-96"
      aria-label="Signature Mobile Detailing service area map"
    />
  );
}
