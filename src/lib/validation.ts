import { todayISO } from './format';

/* Reglas de validación del sitio (mismos mensajes que el original). */
export type Errors = Record<string, string>;

export const required = (v: string, isSelect = false) => (v.trim() ? '' : isSelect ? 'Elige una opción.' : 'Completa este campo.');

export const email = (v: string) =>
  !v.trim() ? 'Completa este campo.' : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Escribe un correo válido, por ejemplo nombre@correo.com.';

export const phone = (v: string, isRequired = false) =>
  !v.trim() ? (isRequired ? 'Completa este campo.' : '') : v.replace(/\D/g, '').length < 10 ? 'El teléfono debe tener 10 dígitos.' : '';

export const futureDate = (v: string) => (!v ? 'Completa este campo.' : v < todayISO() ? 'Elige una fecha a partir de hoy.' : '');

/** Quita las reglas vacías: { a: '', b: 'Completa…' } → { b: 'Completa…' } */
export const clean = (e: Errors): Errors => Object.fromEntries(Object.entries(e).filter(([, m]) => m));
