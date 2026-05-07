'use client';

import { useEffect, useRef } from 'react';
// Leaflet CSS imported here (not in globals.css) so it only ships when
// the map component is actually rendered. The map sits below the fold
// inside the contact section, so this defers ~10 KB of CSS off the
// initial homepage critical path. Pages that never mount ServiceMap
// (auth, dashboard, etc) don't pay the cost at all.
import 'leaflet/dist/leaflet.css';

const NEIGHBORHOODS: { name: string; lat: number; lng: number; hq?: boolean }[] = [
  { name: 'Downtown Austin', lat: 30.267, lng: -97.743, hq: true },
  { name: 'South Austin',    lat: 30.225, lng: -97.775 },
  { name: 'East Austin',     lat: 30.263, lng: -97.718 },
  { name: 'North Austin',    lat: 30.348, lng: -97.736 },
  { name: 'The Domain',      lat: 30.402, lng: -97.722 },
  { name: 'Round Rock',      lat: 30.508, lng: -97.679 },
  { name: 'Cedar Park',      lat: 30.505, lng: -97.820 },
  { name: 'Georgetown',      lat: 30.633, lng: -97.677 },
  { name: 'Pflugerville',    lat: 30.439, lng: -97.600 },
  { name: 'Buda / Kyle',     lat: 30.082, lng: -97.840 },
  { name: 'Lakeway / Westlake', lat: 30.370, lng: -97.984 },
  { name: 'Dripping Springs', lat: 30.190, lng: -98.086 },
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
        center: [30.30, -97.78],
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
      L.circle([30.30, -97.78], {
        radius: 38000,
        color: '#d62030',
        weight: 2,
        dashArray: '6 6',
        fillColor: '#d62030',
        fillOpacity: 0.06,
      }).addTo(map);

      // Neighborhood markers
      NEIGHBORHOODS.forEach(({ name, lat, lng, hq }) => {
        const icon = L.divIcon({
          className: '',
          html: hq
            ? `<div style="position:relative;width:16px;height:16px;">
                 <div style="position:absolute;inset:0;border-radius:50%;background:rgba(214,32,48,0.5);animation:map-pulse 1.8s ease-in-out infinite;"></div>
                 <div style="position:absolute;inset:2px;border-radius:50%;background:#d62030;border:2px solid #fff;"></div>
               </div>`
            : `<div style="width:10px;height:10px;border-radius:50%;background:#d62030;border:2px solid #fff;"></div>`,
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
      aria-label="Austin Auto Detail service area map"
    />
  );
}
