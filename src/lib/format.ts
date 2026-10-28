/* Formatos de dinero y fechas (es-MX, hora de Cancún) */

export const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

/** Número a partir de un texto con símbolos: «$30,000 MXN» → 30000 */
export const toNumber = (v: string) => Number(String(v).replace(/[^\d.]/g, '')) || 0;

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** «2026-10-24» → «Sábado 24 de octubre» */
export function longDate(iso: string): string {
  if (!iso) return '';
  const t = new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

