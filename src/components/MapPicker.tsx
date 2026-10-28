import { useEffect, useRef, useState, type FormEvent } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Dialog } from './Dialog';
import { Icon } from './Icon';
import { ZONAS } from '../data/zonas';

/* ==========================================================================
   Elegir una ubicación en el mapa (cualquier parte del mundo): la persona busca un lugar
   o toca el mapa; se marca el punto y un círculo con el radio de búsqueda.
   La búsqueda y el nombre del lugar salen de una lista local de zonas (src/data/zonas.ts), sin API.
   ========================================================================== */
export interface PickedPlace { lat: number; lng: number; label: string; radius: number }

const RADII = [3, 5, 10, 25, 50];
const sinAcentos = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
/** Distancia aproximada en km entre dos puntos */
const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => Math.hypot((a.lat - b.lat) * 111, (a.lng - b.lng) * 111 * Math.cos((a.lat * Math.PI) / 180));

/** Nombre del lugar tocado en el mapa: la zona conocida más cercana (a menos de 4 km) */
async function placeName(lat: number, lng: number): Promise<string> {
  const cerca = ZONAS.map((z) => ({ z, d: km(z, { lat, lng }) })).sort((a, b) => a.d - b.d)[0];
  return cerca && cerca.d < 4 ? cerca.z.nombre : `Punto en el mapa (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
}

export function MapPicker({ open, initial, onClose, onPick }: { open: boolean; initial?: PickedPlace | null; onClose: () => void; onPick: (p: PickedPlace) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const circle = useRef<L.Circle | null>(null);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(initial ? { lat: initial.lat, lng: initial.lng } : null);
  const [label, setLabel] = useState(initial?.label ?? '');
  const [radius, setRadius] = useState(initial?.radius ?? 10);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState('');

  // El mapa se crea al abrir el diálogo (Leaflet necesita que el contenedor ya tenga tamaño)
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (!el.current || map.current) return;
      const m = L.map(el.current, { worldCopyJump: true }).setView(initial ? [initial.lat, initial.lng] : [21.16, -86.85], initial ? 12 : 4);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(m);
      m.on('click', (e: L.LeafletMouseEvent) => choose(e.latlng.lat, e.latlng.lng));
      map.current = m;
      if (initial) draw(initial.lat, initial.lng, initial.radius);
    }, 60);
    return () => {
      clearTimeout(t);
      map.current?.remove();
      map.current = marker.current = circle.current = null;
    };
  }, [open]);

  useEffect(() => { if (point) draw(point.lat, point.lng, radius); }, [radius]);

  function draw(lat: number, lng: number, r: number) {
    const m = map.current;
    if (!m) return;
    const icon = L.divIcon({ className: 'map-pin', html: '<svg class="icon" aria-hidden="true"><use href="#i-pin"/></svg>', iconSize: [34, 34], iconAnchor: [17, 32] });
    marker.current ??= L.marker([lat, lng], { icon }).addTo(m);
    marker.current.setLatLng([lat, lng]);
    circle.current ??= L.circle([lat, lng], { radius: r * 1000, color: '#1F5BDB', weight: 2, fillOpacity: 0.08 }).addTo(m);
    circle.current.setLatLng([lat, lng]).setRadius(r * 1000);
  }

  async function choose(lat: number, lng: number, name?: string) {
    setPoint({ lat, lng });
    draw(lat, lng, radius);
    setLabel(name ?? 'Buscando el nombre del lugar…');
    if (!name) setLabel((await placeName(lat, lng)) || `${lat.toFixed(3)}, ${lng.toFixed(3)}`);
  }

  async function search(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setNote('');
    try {
      const q = sinAcentos(query.trim());
      const hit = ZONAS.find((z) => sinAcentos(z.nombre).includes(q));
      if (!hit) return setNote('No encontramos esa zona. Prueba con «Cumbres», «Arbolada» o «Zona Hotelera», o toca el mapa.');
      map.current?.setView([hit.lat, hit.lng], 13);
      await choose(hit.lat, hit.lng, hit.nombre);
    } finally {
      setSearching(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} labelledBy="mapa-titulo">
      <h2 id="mapa-titulo">¿Dónde buscas casa?</h2>
      <p className="dlg-lead">Busca una colonia o zona de Cancún, o toca el mapa.</p>
      <form className="map-picker__search" onSubmit={search} role="search">
        <label className="sr-only" htmlFor="mapa-buscar">Buscar un lugar</label>
        <input className="input" id="mapa-buscar" type="search" placeholder="Por ejemplo: Cumbres" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="btn btn--secondary" type="submit" disabled={searching}><Icon id="search" />{searching ? 'Buscando…' : 'Buscar'}</button>
      </form>
      {note && <p className="field__help" role="status">{note}</p>}
      <div className="map-picker__map" ref={el} aria-label="Mapa: toca para elegir el lugar" />
      <div className="map-picker__foot">
        <p className="map-picker__place" aria-live="polite">{point ? <><Icon id="pin" />{label}</> : 'Aún no eliges un lugar.'}</p>
        <label className="map-picker__radius">A menos de
          <select className="select" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>{RADII.map((r) => <option key={r} value={r}>{r} km</option>)}</select>
        </label>
      </div>
      <div className="dlg-actions">
        <button className="btn btn--secondary" type="button" onClick={onClose}>Cancelar</button>
        <button className="btn" type="button" disabled={!point} onClick={() => point && onPick({ ...point, label: label || 'Punto elegido', radius })}>Usar este lugar</button>
      </div>
    </Dialog>
  );
}
