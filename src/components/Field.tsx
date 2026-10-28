import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface FieldProps {
  id: string;
  label: ReactNode;
  error?: string;
  help?: string;
  className?: string;
  /** Campo de grupo (radios): usa <fieldset>/<legend> en vez de <label> */
  group?: boolean;
  children: ReactNode;
}

/** Campo del sitio: etiqueta, control, ayuda y mensaje de error (mismas clases que el original). */
export function Field({ id, label, error, help, className, group, children }: FieldProps) {
  const cls = ['field', error && 'is-error', className].filter(Boolean).join(' ');
  const errorEl = error && (
    <p className="field__error" id={`${id}-error`}>
      <Icon id="alert" size="sm" />
      {error}
    </p>
  );
  if (group) {
    return (
      <fieldset className={cls}>
        <legend className="field__label">{label}</legend>
        {children}
        {errorEl}
      </fieldset>
    );
  }
  return (
    <div className={cls}>
      <label className="field__label" htmlFor={id}>{label}</label>
      {children}
      {help && <p className="field__help">{help}</p>}
      {errorEl}
    </div>
  );
}

/** Atributos de accesibilidad de un control según su error */
export const invalid = (id: string, error?: string) =>
  error ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` } : {};

export const Opt = ({ children }: { children: ReactNode }) => <span className="opt">{children}</span>;
