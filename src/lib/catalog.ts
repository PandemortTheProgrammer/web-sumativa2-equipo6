import { money } from './format';

/* Casa con los nombres de campos del sitio (los mismos que usaba main.js). */
export interface House {
  slug: string;
  code?: string;
  name: string;
  zona: string;
  zonaKey: string;
  mapa: string;
  lat?: number | null;
  lng?: number | null;
  op: 'renta' | 'venta';
  price: number;
  rec: number;
  banos: number;
  m2: number;
  terreno?: number;
  est: number;
  pets: boolean;
  amueblada: 'si' | 'semi' | 'no';
  tipo: 'casa' | 'casa-condominio' | 'townhouse';
  tipoTexto?: string;
  asesor: string;
  orden: number;
  img?: string;
  foto?: string;
  description?: string;
  address?: string;
  age?: number | null;
  maintenance?: string;
  amenities?: string[];
  photos?: { src: string; label: string }[];
  publishedAt?: string;
}

/** Texto sin acentos, en minúsculas y con guiones como espacios (para buscar «lagos-del-sol» o «Huayacán»). */
const plain = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[-_,]+/g, ' ').replace(/\s+/g, ' ').trim();

/** ¿La casa está en esa ubicación? Texto libre de cualquier parte del mundo: colonia, ciudad, estado o país. */
export function inPlace(c: House, place: string) {
  const wanted = plain(place);
  if (!wanted) return true;
  const where = plain([c.zona, c.zonaKey, c.mapa, c.address].filter(Boolean).join(' '));
  return wanted.split(' ').every((w) => where.includes(w));
}

/** Ubicación escrita bonita para títulos y etiquetas («lagos-del-sol» → «Lagos del sol») */
export const placeLabel = (place: string) => {
  const t = place.trim().replace(/[-_]+/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export const IMG = '/assets/img/';
export const WHATSAPP = '529985550142';

export const photoOf = (c: House) => c.foto || IMG + (c.img || c.slug) + '.jpg';
export const fichaOf = (c: Pick<House, 'slug'>) => '/propiedad/' + encodeURIComponent(c.slug);
export const shortPrice = (c: House) => (c.op === 'renta' ? money(c.price) : '$' + (c.price / 1e6).toFixed(2).replace(/\.?0+$/, '') + ' M');
export const priceUnit = (c: House) => (c.op === 'renta' ? 'MXN / mes' : 'MXN');
