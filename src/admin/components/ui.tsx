import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { IMG, Z, type Broker, type Property } from '../store';

/* Componentes reutilizables del panel (mismas clases que el panel HTML) */

export function Icon({ id, className }: { id: string; className?: string }) {
  return (
    <svg className={'icon' + (className ? ' ' + className : '')} aria-hidden="true">
      <use href={`#i-${id}`} />
    </svg>
  );
}

export const src = (s: string) => (/^(blob:|data:|https?:|\/)/.test(s) ? s : IMG + s);

export function Photo({ src: s, alt = '', className }: { src?: string; alt?: string; className?: string }) {
  return <div className={'photo' + (className ? ' ' + className : '')}>{s ? <img src={src(s)} alt={alt} loading="lazy" /> : null}</div>;
}

export const Cover = ({ p, className, alt }: { p: Property; className?: string; alt?: string }) => (
  <Photo src={p.photos[0]?.src ?? ''} alt={alt ?? 'Fachada de ' + p.name} className={className} />
);

export const Avatar = ({ b, className }: { b: Pick<Broker, 'name' | 'initials' | 'photo'>; className?: string }) => (
  <span className={'avatar' + (className ? ' ' + className : '')}>
    {b.photo ? <Photo src={b.photo} alt={'Fotografía de ' + b.name} /> : <span aria-hidden="true">{b.initials}</span>}
  </span>
);

export const Badge = ({ label, tone }: { label: string; tone: string }) => <span className={'badge badge--' + tone}>{label}</span>;
export const StatusBadge = ({ s }: { s: string }) => <Badge label={Z.STATUS[s]?.label ?? s} tone={Z.STATUS[s]?.tone ?? 'gris'} />;
export const ApptBadge = ({ s }: { s: string }) => <Badge label={Z.APPT_STATUS[s]?.label ?? s} tone={Z.APPT_STATUS[s]?.tone ?? 'gris'} />;
export const FollowBadge = ({ f }: { f: string }) => <Badge label={f} tone={Z.FOLLOW[f] || 'gris'} />;

export function Crumbs({ items }: { items: [string, string?][] }) {
  return (
    <nav className="crumbs" aria-label="Ruta de navegación">
      <ol>
        {items.map(([label, to], i) => (
          <li key={i}>{i === items.length - 1 || !to ? <span aria-current="page">{label}</span> : <Link to={to}>{label}</Link>}</li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHead({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1 tabIndex={-1}>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export const Metric = ({ label, value, note }: { label: string; value: string | number; note: string }) => (
  <dl className="card metric">
    <dt>{label}</dt>
    <dd>{value}</dd>
    <p>{note}</p>
  </dl>
);

/** Pestañas accesibles (flechas, Inicio y Fin cambian de pestaña) */
export function Tabs({ name, items, selected, label, onSelect, controls }: { name: string; items: [string, string][]; selected: string; label: string; onSelect: (v: string) => void; controls?: string }) {
  const onKey = (e: KeyboardEvent, i: number) => {
    const n = { ArrowRight: (i + 1) % items.length, ArrowLeft: (i - 1 + items.length) % items.length, Home: 0, End: items.length - 1 }[e.key];
    if (n == null) return;
    e.preventDefault();
    onSelect(items[n][0]);
    setTimeout(() => document.getElementById(`tab-${name}-${items[n][0]}`)?.focus(), 0);
  };
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {items.map(([v, text], i) => (
        <button key={v} className="tab" type="button" role="tab" id={`tab-${name}-${v}`} aria-selected={v === selected} tabIndex={v === selected ? 0 : -1} aria-controls={controls} onClick={() => onSelect(v)} onKeyDown={(e) => onKey(e, i)}>
          {text}
        </button>
      ))}
    </div>
  );
}

export const Pager = ({ shown, total, noun }: { shown: number; total: number; noun: string }) => (
  <div className="pager">
    <span>Mostrando {shown ? '1–' + shown : '0'} de {total} {noun}</span>
    <div className="pager__nav">
      <button type="button" disabled>← Anterior</button>
      <span aria-current="page">1</span>
      <button type="button" disabled>Siguiente →</button>
    </div>
  </div>
);

export function Options({ list, placeholder }: { list: (string | [string, string, boolean?])[]; placeholder?: string }) {
  return (
    <>
      {placeholder != null && <option value="">{placeholder}</option>}
      {list.map((o) => {
        const [v, l, dis] = Array.isArray(o) ? o : [o, o, false];
        return <option key={v} value={v} disabled={!!dis}>{l}</option>;
      })}
    </>
  );
}

/** Brokers para un <select>: los inactivos aparecen deshabilitados (salvo el ya elegido) */
export const brokerOptions = (brokers: Broker[], selected: string) =>
  brokers.map((b): [string, string, boolean] => [b.id, b.name + (b.active ? '' : ' (inactivo)'), !b.active && b.id !== selected]);

/** Parámetros de la dirección (#/citas?cita=CIT-024): se aplican una vez y se quitan, como en el panel HTML */
export function useUrlParams(apply: (p: URLSearchParams) => void) {
  const [params, setParams] = useSearchParams();
  const done = useRef<string | null>(null);
  const key = params.toString();
  if (key && done.current !== key) {
    done.current = key;
    apply(params);
  }
  useEffect(() => {
    if (key) setParams({}, { replace: true });
  }, [key]);
}

/* ---------- Validación (mismos mensajes que el panel HTML) ---------- */
export type FormErrors = Record<string, string>;
export interface ExtraError { id: string; msg: string }

/** Revisa los campos de un formulario (required, correo, números y teléfono). Devuelve { id: mensaje }. */
export function validateForm(form: HTMLFormElement, extra: ExtraError[] = []): FormErrors {
  const errors: FormErrors = {};
  form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea').forEach((el) => {
    if (el.disabled || el.type === 'hidden' || el.type === 'file' || !el.id) return;
    const v = el.value.trim();
    const label = (form.querySelector(`label[for="${el.id}"]`)?.textContent || el.name).replace(/\s*\*\s*$/, '').trim();
    let msg = '';
    if (el.required && el.type === 'checkbox' && !(el as HTMLInputElement).checked) msg = 'Marca esta casilla para continuar.';
    else if (el.required && !v) msg = `Completa «${label}».`;
    else if (v && el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = 'Escribe un correo válido, por ejemplo nombre@correo.com.';
    else if (v && el.dataset.number != null && !/^\$?\s*[\d,]+(\.\d+)?$/.test(v)) msg = `Escribe solo números en «${label}».`;
    else if (v && el.type === 'tel' && v.replace(/\D/g, '').length < 10) msg = 'El teléfono debe tener al menos 10 dígitos.';
    if (msg) errors[el.id] = msg;
  });
  extra.forEach((e) => (errors[e.id] = e.msg));
  const first = Object.keys(errors)[0];
  if (first) document.getElementById(first)?.focus();
  return errors;
}

export function useErrors() {
  const [errors, setErrors] = useState<FormErrors>({});
  return {
    errors,
    check: (form: HTMLFormElement, extra?: ExtraError[]) => {
      const e = validateForm(form, extra);
      setErrors(e);
      return Object.keys(e).length === 0;
    },
    clear: (id: string) => setErrors((x) => (x[id] ? Object.fromEntries(Object.entries(x).filter(([k]) => k !== id)) : x)),
    set: setErrors,
  };
}

/** Atributos de un control con error */
export const err = (errors: FormErrors, id: string) => (errors[id] ? { 'aria-invalid': true as const, 'aria-describedby': id + '-error' } : {});

export const FieldError = ({ errors, id }: { errors: FormErrors; id: string }) =>
  errors[id] ? (
    <p className="field__error" id={id + '-error'}>
      <Icon id="alert" className="icon--sm" />
      {errors[id]}
    </p>
  ) : null;
