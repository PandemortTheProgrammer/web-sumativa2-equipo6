import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { sendLead, type DataError } from '../lib/datos';
import { priceUnit, type House } from '../lib/catalog';
import { longDate, money, todayISO } from '../lib/format';
import { clean, email, futureDate, phone, required, type Errors } from '../lib/validation';
import { Dialog } from './Dialog';
import { Field, invalid, Opt } from './Field';
import { Icon } from './Icon';
import { useToast } from './Toasts';

/* ==========================================================================
   «¿Te imaginas viviendo aquí?»: solicitud de visita dentro de la ficha de una casa.
   Al enviar se guarda un resumen para la página de Gracias y se pasa a ella.
   ========================================================================== */
const HOURS = ['10:00', '11:30', '13:00', '16:00', '17:30'];
const PAYMENT: [string, string][] = [['contado', 'De contado'], ['credito-bancario', 'Crédito bancario'], ['infonavit', 'Infonavit o Fovissste'], ['no-se', 'Aún no lo sé']];
export const LAST_CONTACT_KEY = 'zugar-ultimo-contacto';

const EMPTY = {
  nombre: '', correo: '', telefono: '', nacionalidad: '', ocupacion: '', presupuesto: '', forma_pago: '',
  personas: '2', mascotas: '' as '' | 'si' | 'no', mascotas_detalle: '', fecha: '', horario: '', comentarios: '', privacidad: false,
};
type Form = typeof EMPTY;

export function HouseVisitForm({ house: c }: { house: House }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [f, setF] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [showErrors, setShowErrors] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const sale = c.op === 'venta';
  const advisor = c.asesor || 'Tu asesora de Zugar';
  const first = advisor.split(' ')[0];

  const validate = (x: Form): Errors =>
    clean({
      nombre: required(x.nombre), correo: email(x.correo), telefono: phone(x.telefono),
      nacionalidad: required(x.nacionalidad), ocupacion: required(x.ocupacion), presupuesto: required(x.presupuesto),
      forma_pago: sale ? required(x.forma_pago, true) : '',
      mascotas: x.mascotas ? '' : 'Elige una opción.',
      mascotas_detalle: x.mascotas === 'si' ? required(x.mascotas_detalle) : '',
      fecha: futureDate(x.fecha), horario: required(x.horario, true),
      privacidad: x.privacidad ? '' : 'Marca esta casilla para continuar.',
    });

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setF((x) => {
      const next = { ...x, [k]: v };
      if (showErrors) setErrors(validate(next));
      return next;
    });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validate(f);
    setErrors(errs);
    setShowErrors(true);
    const firstError = Object.keys(errs)[0];
    if (firstError) {
      document.getElementById(firstError === 'mascotas' ? 'mascotas-si' : `b-${firstError}`)?.focus();
      return;
    }
    setReviewing(true);
  };

  const send = async () => {
    setReviewing(false);
    setSending(true);
    try {
      const { nombre, correo, telefono, comentarios, fecha, horario, privacidad: _ok, ...rest } = f;
      const r = await sendLead({
        reason: 'visita', name: nombre.trim(), email: correo.trim(), phone: telefono, message: comentarios,
        propertyCode: c.code, propertySlug: c.slug, preferredDate: fecha, preferredTime: horario,
        payload: rest as Record<string, string>,
      });
      try {
        sessionStorage.setItem(LAST_CONTACT_KEY, JSON.stringify({ nombre: nombre.trim(), motivo: 'visita', folio: r.folio, fecha: longDate(fecha), hora: horario, asesor: c.asesor, slug: c.slug }));
      } catch {
        /* sin almacenamiento: la página de Gracias muestra el texto general */
      }
      navigate('/gracias');
    } catch (err) {
      const e = err as DataError;
      if (!e?.mensaje) console.error(err);
      toast(e?.mensaje || 'No pudimos enviar tu solicitud. Inténtalo de nuevo.');
      setSending(false);
    }
  };

  const err = (k: keyof Form) => (showErrors ? errors[k] : undefined);
  const rows: [string, string][] = [
    ['Nombre completo', f.nombre], ['Correo electrónico', f.correo], ['Teléfono', f.telefono], ['Nacionalidad', f.nacionalidad],
    ['¿En qué trabajas?', f.ocupacion], ['Casa de interés', c.name + (c.code ? ' · ' + c.code : '')], ['Presupuesto aproximado', f.presupuesto],
    ['¿Cómo planeas comprar?', sale ? PAYMENT.find(([v]) => v === f.forma_pago)?.[1] ?? '' : ''],
    ['Personas que vivirán en la casa', f.personas === '5' ? '5 o más' : f.personas], ['¿Tienes mascotas?', f.mascotas === 'si' ? 'Sí' : f.mascotas === 'no' ? 'No' : ''],
    ['¿Cuáles y cuántas mascotas?', f.mascotas === 'si' ? f.mascotas_detalle : ''], ['Fecha preferida', longDate(f.fecha)],
    ['Horario', f.horario ? f.horario + ' h' : ''], ['Comentarios', f.comentarios],
  ];

  return (
    <>
      <form className="booking-form booking-form--card" noValidate onSubmit={onSubmit}>
        {showErrors && Object.keys(errors).length > 0 && (
          <div className="alert alert-error is-visible" role="alert">
            <Icon id="alert" />
            <div><strong>Revisa los campos señalados</strong>Tu solicitud aún no se ha enviado. Lo que escribiste se conserva.</div>
          </div>
        )}
        <fieldset>
          <legend>1. Tus datos</legend>
          <div className="form-grid">
            <Field id="b-nombre" label="Nombre completo *" error={err('nombre')}>
              <input className="input" id="b-nombre" type="text" autoComplete="name" placeholder="Nombre y apellidos" value={f.nombre} onChange={(e) => set('nombre', e.target.value)} {...invalid('b-nombre', err('nombre'))} />
            </Field>
            <Field id="b-correo" label="Correo electrónico *" error={err('correo')}>
              <input className="input" id="b-correo" type="email" autoComplete="email" placeholder="tu@correo.com" value={f.correo} onChange={(e) => set('correo', e.target.value)} {...invalid('b-correo', err('correo'))} />
            </Field>
            <Field id="b-telefono" label={<>Teléfono <Opt>(opcional)</Opt></>} error={err('telefono')} help={err('telefono') ? undefined : 'Para confirmar tu visita por WhatsApp.'}>
              <input className="input" id="b-telefono" type="tel" autoComplete="tel" placeholder="998 000 0000" value={f.telefono} onChange={(e) => set('telefono', e.target.value)} {...invalid('b-telefono', err('telefono'))} />
            </Field>
            <Field id="b-nacionalidad" label="Nacionalidad *" error={err('nacionalidad')}>
              <input className="input" id="b-nacionalidad" type="text" autoComplete="country-name" placeholder="Mexicana" value={f.nacionalidad} onChange={(e) => set('nacionalidad', e.target.value)} {...invalid('b-nacionalidad', err('nacionalidad'))} />
            </Field>
            <Field id="b-ocupacion" label="¿En qué trabajas? *" error={err('ocupacion')}>
              <input className="input" id="b-ocupacion" type="text" autoComplete="organization-title" placeholder="Por ejemplo: diseño de interiores" value={f.ocupacion} onChange={(e) => set('ocupacion', e.target.value)} {...invalid('b-ocupacion', err('ocupacion'))} />
            </Field>
          </div>
        </fieldset>
        <fieldset>
          <legend>2. Esta casa</legend>
          <div className="form-grid">
            <Field id="b-casa-ref" label="Casa de interés">
              <input className="input" id="b-casa-ref" type="text" value={c.name + (c.code ? ' · ' + c.code : '')} readOnly />
            </Field>
            <Field id="b-presupuesto" label="Presupuesto aproximado *" error={err('presupuesto')}>
              <input className="input" id="b-presupuesto" type="text" inputMode="numeric" placeholder={`${money(c.price)} ${priceUnit(c)}`} value={f.presupuesto} onChange={(e) => set('presupuesto', e.target.value)} {...invalid('b-presupuesto', err('presupuesto'))} />
            </Field>
            {sale && (
              <Field id="b-forma_pago" label="¿Cómo planeas comprar? *" error={err('forma_pago')}>
                <select className="select" id="b-forma_pago" value={f.forma_pago} onChange={(e) => set('forma_pago', e.target.value)} {...invalid('b-forma_pago', err('forma_pago'))}>
                  <option value="">Elige una opción</option>
                  {PAYMENT.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
              </Field>
            )}
            <Field id="b-personas" label="Personas que vivirán en la casa *">
              <select className="select" id="b-personas" value={f.personas} onChange={(e) => set('personas', e.target.value)}>
                <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5 o más</option>
              </select>
            </Field>
            <Field id="b-mascotas" label="¿Tienes mascotas? *" error={err('mascotas')} group>
              <div className="choice-group">
                {(['si', 'no'] as const).map((v) => (
                  <label key={v} className="choice">
                    <input type="radio" id={`mascotas-${v}`} name="mascotas" value={v} checked={f.mascotas === v} onChange={() => set('mascotas', v)} />
                    <span>{v === 'si' ? 'Sí' : 'No'}</span>
                  </label>
                ))}
              </div>
            </Field>
            {f.mascotas === 'si' && (
              <Field id="b-mascotas_detalle" label="¿Cuáles y cuántas mascotas? *" error={err('mascotas_detalle')} help={err('mascotas_detalle') ? undefined : c.pets ? 'Esta casa acepta mascotas.' : 'Esta casa no acepta mascotas; cuéntanos si tienes alguna.'}>
                <input className="input" id="b-mascotas_detalle" type="text" placeholder="Por ejemplo: 1 perro pequeño" value={f.mascotas_detalle} onChange={(e) => set('mascotas_detalle', e.target.value)} {...invalid('b-mascotas_detalle', err('mascotas_detalle'))} />
              </Field>
            )}
          </div>
        </fieldset>
        <fieldset>
          <legend>3. Elige un momento</legend>
          <div className="form-grid">
            <Field id="b-fecha" label="Fecha preferida *" error={err('fecha')}>
              <input className="input" id="b-fecha" type="date" min={todayISO()} value={f.fecha} onChange={(e) => set('fecha', e.target.value)} {...invalid('b-fecha', err('fecha'))} />
            </Field>
            <Field id="b-horario" label="Horario *" error={err('horario')} help={err('horario') ? undefined : 'La visita es en la casa y dura unos 45 minutos.'}>
              <select className="select" id="b-horario" value={f.horario} onChange={(e) => set('horario', e.target.value)} {...invalid('b-horario', err('horario'))}>
                <option value="">Elige un horario</option>
                {HOURS.map((h) => <option key={h} value={h}>{h} h</option>)}
              </select>
            </Field>
            <Field id="b-comentarios" label={<>Comentarios <Opt>(opcional)</Opt></>}>
              <textarea className="textarea" id="b-comentarios" rows={3} placeholder="Por ejemplo: nos gustaría ver el jardín por la mañana." value={f.comentarios} onChange={(e) => set('comentarios', e.target.value)} />
            </Field>
          </div>
        </fieldset>
        <div className={err('privacidad') ? 'is-error' : undefined}>
          <label className="check">
            <input type="checkbox" id="b-privacidad" checked={f.privacidad} onChange={(e) => set('privacidad', e.target.checked)} {...invalid('b-privacidad', err('privacidad'))} />
            <span>Acepto el <Link to="/contacto#aviso-privacidad">aviso de privacidad</Link> y que me contacten sobre esta propiedad.</span>
          </label>
          {err('privacidad') && <p className="field__error flex" id="b-privacidad-error"><Icon id="alert" size="sm" />{err('privacidad')}</p>}
        </div>
        <div className="form-actions">
          <button className="btn btn--lg btn--block" type="submit" disabled={sending} aria-busy={sending || undefined}>
            {sending ? 'Enviando…' : <>Revisar solicitud<Icon id="arrow" /></>}
          </button>
        </div>
        <p className="secure"><Icon id="shield" size="sm" />Tus datos se comparten solo con tu asesora.</p>
      </form>

      <Dialog open={reviewing} onClose={() => setReviewing(false)} labelledBy="dlg-title">
        <h2 id="dlg-title">Revisa tu solicitud</h2>
        <p className="dlg-lead">Confirma que tus datos estén bien antes de enviarlos. {first} te confirmará el día y la hora.</p>
        <dl className="review">
          {rows.filter(([, v]) => v && v.trim()).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v.trim()}</dd></div>)}
        </dl>
        <div className="dlg-actions">
          <button className="btn btn--secondary" type="button" onClick={() => setReviewing(false)}>Corregir datos</button>
          <button className="btn" type="button" onClick={send} autoFocus>Enviar solicitud</button>
        </div>
      </Dialog>
    </>
  );
}
