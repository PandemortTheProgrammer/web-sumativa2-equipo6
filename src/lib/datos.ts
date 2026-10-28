import { CASAS } from '../data/casas';
import type { House } from './catalog';

/* ==========================================================================
   Datos del sitio público, SIN servidor ni API.
   - El catálogo sale de src/data/casas.ts (datos ficticios).
   - Las solicitudes de los formularios se guardan en este navegador (localStorage)
     y el panel administrativo las muestra en «Solicitudes» (mismo navegador y dominio).
   Las funciones devuelven Promesas con una pequeña espera para mostrar los estados de carga.
   ========================================================================== */

/** Error que muestran los formularios y la ficha */
export interface DataError { status?: number; mensaje?: string }

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

export async function fetchCatalog(): Promise<House[]> {
  await esperar(250);
  return CASAS.slice();
}

export async function fetchHouse(slug: string): Promise<House> {
  await esperar(150);
  const casa = CASAS.find((c) => c.slug === slug);
  if (!casa) throw { status: 404, mensaje: 'Esa casa ya no está publicada.' } satisfies DataError;
  return casa;
}

/* ---------- Solicitudes de los formularios ---------- */
export type LeadReason = 'visita' | 'rentar' | 'comprar' | 'publicar' | 'otro';

export interface LeadInput {
  reason: LeadReason;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  propertySlug?: string;
  propertyCode?: string;
  preferredDate?: string;
  preferredTime?: string;
  /** Resto de respuestas del formulario (ocupación, mascotas…). Los montos van como número (presupuesto_min/max). */
  payload: Record<string, string | number | null>;
}

/** Solicitud guardada en el navegador */
export interface SolicitudDelSitio extends Omit<LeadInput, 'payload'> { folio: string; createdAt: string; payload: Record<string, string | number> }

const CLAVE = 'zugar-solicitudes-del-sitio';

export function leerSolicitudesDelSitio(): SolicitudDelSitio[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) || '[]');
  } catch {
    return [];
  }
}

/** Guarda la solicitud y devuelve su folio (SOL-0201, SOL-0202…) */
export async function sendLead(input: LeadInput): Promise<{ folio: string; cita: string | null; account: 'created' | 'existing' | null }> {
  await esperar(600);
  const lista = leerSolicitudesDelSitio();
  const folio = 'SOL-' + String(201 + lista.length).padStart(4, '0');
  const ahora = new Date();
  const payload = Object.fromEntries(
    Object.entries(input.payload).filter(([, v]) => (typeof v === 'number' ? Number.isFinite(v) : !!v && String(v).trim())) as [string, string | number][],
  );
  lista.push({ ...input, payload, folio, createdAt: ahora.toISOString().slice(0, 19) + '-05:00' });
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista));
  } catch {
    /* sin almacenamiento (modo privado): la solicitud solo se confirma en pantalla */
  }
  return { folio, cita: null, account: null };
}
