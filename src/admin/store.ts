import { useSyncExternalStore } from 'react';
import { ACTIVITY, APPOINTMENTS, BROKERS, HISTORY, PEOPLE, PERSONAL, PROPERTIES } from '../data/demo';

/* ==========================================================================
   Datos del panel: copias de los datos ficticios de src/data/demo.ts (sin servidor).
   Viven en memoria y se restablecen al recargar la página.
   Las vistas leen `D` con useStore() y, después de cambiar algo, llaman a rerender().
   ========================================================================== */
export interface Photo { src: string; label: string; key?: string }
export interface Property {
  id: string; slug?: string; lat?: number | null; lng?: number | null;
  name: string; type: string; zone: string; city: string; address: string; street: string;
  op: 'renta' | 'venta'; price: number; rec: number; banos: number; m2: number | ''; terreno: number | ''; est: number; age: number | '';
  status: string; visibility: 'publicada' | 'pausada' | 'borrador'; broker: string;
  maintenance: string; deposit: number; availableFrom: string; furnished: string; desc: string;
  amenities: string[]; photos: Photo[]; published: string; updated: string; updatedAt: number;
}
export interface Person {
  id: string; name: string; email: string; phone: string; type: 'cliente' | 'inquilino'; label?: string;
  property: string; broker: string; follow: string; op: string; budget: string; needs: string; job: string;
}
export interface Appointment {
  id: string; person: string; property: string; broker: string; date: string; start: string; end: string;
  status: string; kind: string; note: string; confirmedBy?: string;
  /** Lo que llenó en el formulario del sitio, si la cita salió de una solicitud */
  /** Formulario que llenó la persona: el de la solicitud de la cita o (linked=false) su solicitud más reciente */
  lead?: {
    id: string; folio: string; reason: string; name: string; email: string; phone: string | null; payload: Record<string, string | number | boolean>;
    message: string | null; property: { code: string; name: string } | null; preferredDate: string | null; preferredTime: string | null; createdAt: string; linked: boolean;
  } | null;
}
export interface Broker { id: string; name: string; initials: string; role: string; zones: string; email: string; phone: string; photo: string; active: boolean }
export interface Activity { when: string; text: string }
/** Personal con sus roles (lo ve el propietario, que decide quién es broker, administración o ambos) */
export interface StaffMember { id: string; name: string; email: string; roles: string[]; active: boolean; properties: number }

export const IMG = '/assets/img/';
export const Z = {
  TODAY: '2026-10-20',
  ZONES: ['Arbolada', 'Residencial Cumbres', 'Santa Fe', 'Lagos del Sol', 'Aqua Residencial', 'Jardines del Sur', 'Huayacán'],
  TYPES: ['Casa', 'Casa en condominio', 'Townhouse'],
  AMENITIES: ['Jardín privado', 'Cocina integral', 'Acceso controlado 24/7', 'Se aceptan mascotas', 'Alberca', 'Casa club', 'Amueblada', 'Terraza'],
  STATUS: {
    disponible: { label: 'Disponible', tone: 'ok' },
    reservada: { label: 'Reservada', tone: 'warn' },
    rentada: { label: 'Rentada', tone: 'gris' },
    borrador: { label: 'Borrador', tone: 'gris' },
  } as Record<string, { label: string; tone: string }>,
  APPT_STATUS: {
    confirmada: { label: 'Confirmada', tone: 'ok' },
    'por-confirmar': { label: 'Por confirmar', tone: 'warn' },
    realizada: { label: 'Realizada', tone: 'gris' },
    cancelada: { label: 'Cancelada', tone: 'error' },
  } as Record<string, { label: string; tone: string }>,
  FOLLOW: {
    'Visita confirmada': 'gris', 'Por confirmar': 'warn', 'Contrato vigente': 'ok', Reservada: 'gris', 'En seguimiento': 'gris', 'Nuevo contacto': 'gris',
  } as Record<string, string>,
};

export const D = {
  // Copias de los datos ficticios (src/data/demo.ts): las pantallas los modifican en memoria
  brokers: structuredClone(BROKERS),
  properties: structuredClone(PROPERTIES),
  people: structuredClone(PEOPLE),
  appointments: structuredClone(APPOINTMENTS),
  activity: structuredClone(ACTIVITY),
  history: structuredClone(HISTORY),
  nextNumbers: { property: 7, appointment: 27, person: 9 },
  staff: structuredClone(PERSONAL),
};

/* ---------- Redibujar: las vistas se suscriben y se actualizan después de cada cambio ---------- */
let version = 0;
const listeners = new Set<() => void>();
export function rerender() {
  version++;
  listeners.forEach((l) => l());
}
export function useStore() {
  useSyncExternalStore((cb) => (listeners.add(cb), () => listeners.delete(cb)), () => version);
  return D;
}

/* ---------- Texto y formato ---------- */
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MONTHS_SHORT = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'];
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
export const money = (n: number | string) => '$' + Number(n || 0).toLocaleString('en-US');
export const priceLabel = (p: Property) => money(p.price) + (p.op === 'renta' ? ' MXN / mes' : ' MXN');
export const opLabel = (p: Property) => (p.op === 'renta' ? 'Renta' : 'Venta');
export const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export const numberValue = (v: string | number) => Number(String(v).replace(/[^\d.]/g, '')) || 0;

export const parseDate = (iso: string) => { const p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const dateShort = (iso: string) => { const d = parseDate(iso); return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()]; };
export const dateLong = (iso: string) => { const d = parseDate(iso); return cap(DAYS[d.getDay()]) + ' ' + d.getDate() + ' de ' + MONTHS[d.getMonth()]; };
export const dateFull = (iso: string) => { const d = parseDate(iso); return d.getDate() + ' de ' + MONTHS[d.getMonth()] + ' de ' + d.getFullYear(); };
export const dayShort = (d: Date) => DAYS_SHORT[d.getDay()];
export const monthName = (d: Date) => cap(MONTHS[d.getMonth()]);
export const monthShort = (d: Date) => MONTHS_SHORT[d.getMonth()];
export const nowTime = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
export function addMinutes(hhmm: string, min: number) {
  const p = hhmm.split(':');
  const t = +p[0] * 60 + +p[1] + min;
  return String(Math.floor(t / 60) % 24).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
}

/* ---------- Búsquedas en los datos ---------- */
export const prop = (id: string) => D.properties.find((p) => p.id === id);
export const broker = (id: string): Broker => D.brokers.find((b) => b.id === id) || { id: '', name: 'Sin asignar', initials: '—', phone: '', email: '', role: '', zones: '', photo: '', active: false };
export const person = (id: string): Person => D.people.find((p) => p.id === id) || ({ name: 'Contacto eliminado', email: '', phone: '' } as Person);
export const appt = (id?: string | null) => (id ? D.appointments.find((a) => a.id === id) : undefined);
export const isUpcoming = (a: Appointment) => (a.status === 'confirmada' || a.status === 'por-confirmar') && a.date >= Z.TODAY;
export const sortAppts = (list: Appointment[]) => list.slice().sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
export const upcoming = (filter?: (a: Appointment) => boolean) => sortAppts(D.appointments.filter((a) => isUpcoming(a) && (!filter || filter(a))));
export const brokerStats = (id: string) => ({ props: D.properties.filter((p) => p.broker === id).length, next: upcoming((a) => a.broker === id).length });
export const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/* ---------- Registro de actividad ---------- */
export function log(text: string, propId?: string) {
  D.activity.unshift({ when: 'Hoy · ' + nowTime() + ' h', text });
  if (propId) {
    (D.history[propId] = D.history[propId] || []).unshift({ when: dateShort(Z.TODAY) + ' 2026 · ' + nowTime() + ' h', text });
    const p = prop(propId);
    if (p) { p.updated = 'Hoy a las ' + nowTime() + ' h'; p.updatedAt = Date.now(); }
  }
}

/* ---------- Exportar CSV ---------- */
export function csvBlob(rows: (string | number | undefined)[][]) {
  const csv = rows.map((r) => r.map((c) => { const s = String(c ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n');
  return new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
}
export function downloadCSV(filename: string, rows: (string | number | undefined)[][]) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(csvBlob(rows));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* Estado de cada sección (filtros y selección): se conserva al moverse por el panel */
export const viewState = {
  props: { tab: 'todas', q: '', op: '', zone: '', broker: '', amen: [] as string[], more: false, detailId: '', detailTab: 'general' },
  people: { tab: 'todas', q: '', follow: '', broker: '', selected: 'p1' as string | null },
  brokers: { q: '', broker: '', status: '', prop: 'ZUG-001' as string | null },
  citas: { offset: 0, day: null as string | null, tab: 'todas', q: '', broker: '', selected: 'CIT-024' as string | null },
};
