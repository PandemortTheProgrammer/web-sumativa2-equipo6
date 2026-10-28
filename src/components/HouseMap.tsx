import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fichaOf, photoOf, shortPrice, type House } from '../lib/catalog';

/* ==========================================================================
   Mapas con Leaflet + OpenStreetMap.
   - Listado: un marcador por casa con ventana (foto, nombre, zona, precio y «Ver la casa»).
   - Ficha: un círculo de zona (la ubicación es aproximada a propósito).
   Sin coordenadas se muestra el mapa de Google de siempre (iframe, sin clave).
   ========================================================================== */
export const googleEmbed = (q: string, zoom = 15) => `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=${zoom}&hl=es&output=embed`;
export const googleLink = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
export const hasCoords = (c?: House | null): c is House & { lat: number; lng: number } =>
  !!c && typeof c.lat === 'number' && typeof c.lng === 'number' && isFinite(c.lat) && isFinite(c.lng);

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

const pin = () =>
  L.divIcon({
    className: 'map-pin',
    html: '<svg class="icon" aria-hidden="true"><use href="#i-pin"/></svg>',
    iconSize: [34, 34],
    iconAnchor: [17, 32],
    popupAnchor: [0, -28],
  });

function baseMap(el: HTMLElement) {
  const map = L.map(el, { scrollWheelZoom: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  return map;
}

interface MarkersMapProps {
  houses: House[];
  /** Casa elegida en la lista: el mapa vuela a su marcador y abre su ventana */
  selected?: string | null;
  label: string;
}

/** Mapa del listado con un marcador por casa */
export function MarkersMap({ houses, selected, label }: MarkersMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<Record<string, L.Marker>>({});
  const navigate = useNavigate();
  const located = houses.filter(hasCoords);
  const key = located.map((h) => h.slug).join(',');

  useEffect(() => {
    if (!el.current || !located.length) return;
    const m = (map.current = baseMap(el.current));
    const icon = pin();
    markers.current = {};
    const bounds = located.map((c) => {
      markers.current[c.slug] = L.marker([c.lat, c.lng], { icon, title: c.name, alt: c.name })
        .bindPopup(
          `<a class="map-popup" href="${esc(fichaOf(c))}">` +
            `<img src="${esc(photoOf(c))}" alt="" loading="lazy" onerror="this.remove()">` +
            `<strong>${esc(c.name)}</strong><span>${esc(c.zona)}</span>` +
            `<span class="map-popup__price">${shortPrice(c)}${c.op === 'renta' ? ' al mes' : ''}</span>` +
            `<span class="map-popup__more">Ver la casa</span></a>`,
          { minWidth: 200, maxWidth: 240 },
        )
        .addTo(m);
      return [c.lat, c.lng] as L.LatLngTuple;
    });
    if (bounds.length === 1) m.setView(bounds[0], 14);
    else m.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
    return () => {
      m.remove();
      map.current = null;
    };
  }, [key]); // se redibuja solo si cambian las casas

  useEffect(() => {
    const marker = selected ? markers.current[selected] : null;
    if (marker && map.current) {
      map.current.flyTo(marker.getLatLng(), 15, { duration: 0.8 });
      marker.openPopup();
    }
  }, [selected]);

  if (!located.length) return null;
  return (
    <div
      ref={el}
      className="map__leaflet"
      role="region"
      aria-label={label}
      // La ventana del marcador abre la ficha sin recargar la página
      onClick={(e) => {
        const a = (e.target as HTMLElement).closest('a.map-popup');
        if (a) {
          e.preventDefault();
          navigate(a.getAttribute('href')!);
        }
      }}
    />
  );
}

/** Mapa de la ficha: círculo de 350 m alrededor de la ubicación aproximada */
export function ZoneMap({ house, label }: { house: House & { lat: number; lng: number }; label: string }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!el.current) return;
    const center: L.LatLngTuple = [house.lat, house.lng];
    const m = baseMap(el.current).setView(center, 15);
    L.circle(center, { radius: 350, className: 'map-area' }).addTo(m);
    return () => {
      m.remove();
    };
  }, [house.lat, house.lng]);
  return <div ref={el} className="map__leaflet" role="region" aria-label={label} />;
}
