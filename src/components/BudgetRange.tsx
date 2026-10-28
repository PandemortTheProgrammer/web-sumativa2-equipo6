import { Field, invalid } from './Field';

/* ==========================================================================
   Presupuesto con mínimo y máximo: se escriben como números (sin «$» ni texto)
   o se eligen de una lista de montos sugeridos según sea renta o compra.
   ========================================================================== */
const SUGGESTED = {
  renta: [8000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 70000],
  compra: [1500000, 2000000, 2500000, 3000000, 3500000, 4000000, 5000000, 7000000, 10000000],
};

/** «15000» → 15000; vacío o inválido → null */
export const toAmount = (v: string): number | null => {
  const n = Number(v.replace(/[^\d.]/g, ''));
  return v.trim() && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

const fmt = (n: number) => '$' + n.toLocaleString('en-US');

/** «$10,000 – $20,000 MXN / mes», «Hasta $20,000…» o «Desde $10,000…» */
export function budgetLabel(min: string, max: string, op: 'renta' | 'compra') {
  const a = toAmount(min);
  const b = toAmount(max);
  const unit = op === 'renta' ? ' MXN / mes' : ' MXN';
  if (a && b) return `${fmt(a)} – ${fmt(b)}${unit}`;
  if (b) return `Hasta ${fmt(b)}${unit}`;
  if (a) return `Desde ${fmt(a)}${unit}`;
  return '';
}

/** Error del rango (para la validación del formulario) */
export function budgetError(min: string, max: string): string {
  if (!toAmount(max)) return 'Escribe tu presupuesto máximo (solo números).';
  if (min.trim() && !toAmount(min)) return 'Escribe el mínimo solo con números.';
  if (toAmount(min) && toAmount(min)! > toAmount(max)!) return 'El mínimo no puede ser mayor que el máximo.';
  return '';
}

export function BudgetRange({ idPrefix, op, min, max, error, onChange }: {
  idPrefix: string; op: 'renta' | 'compra'; min: string; max: string; error?: string; onChange: (min: string, max: string) => void;
}) {
  const list = `${idPrefix}-montos`;
  const numeric = (v: string) => v.replace(/[^\d]/g, '');
  return (
    <Field id={`${idPrefix}-max`} label={op === 'renta' ? 'Presupuesto al mes (MXN) *' : 'Presupuesto (MXN) *'} error={error} className="span-2"
      help={error ? undefined : 'Escribe solo números o elige un monto de la lista. El mínimo es opcional.'}>
      <div className="budget-range">
        <label className="sr-only" htmlFor={`${idPrefix}-min`}>Presupuesto mínimo</label>
        <input className="input" id={`${idPrefix}-min`} type="text" inputMode="numeric" list={list} placeholder="Mínimo" value={min} onChange={(e) => onChange(numeric(e.target.value), max)} />
        <span aria-hidden="true">a</span>
        <input className="input" id={`${idPrefix}-max`} type="text" inputMode="numeric" list={list} placeholder="Máximo" value={max} onChange={(e) => onChange(min, numeric(e.target.value))} {...invalid(`${idPrefix}-max`, error)} />
        <datalist id={list}>{SUGGESTED[op].map((n) => <option key={n} value={n}>{fmt(n)}</option>)}</datalist>
      </div>
    </Field>
  );
}
