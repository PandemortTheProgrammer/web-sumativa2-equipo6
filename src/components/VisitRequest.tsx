import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { sendLead, type DataError } from '../lib/datos';
import { longDate, todayISO } from '../lib/format';
import { clean, email, futureDate, phone, required, type Errors } from '../lib/validation';
import { BudgetRange, budgetError, budgetLabel, toAmount } from './BudgetRange';
import { useCatalog } from './CatalogProvider';
import { Dialog } from './Dialog';
import { Field, invalid, Opt } from './Field';
import { Icon } from './Icon';
import { LeadDone } from './LeadDone';
import { useToast } from './Toasts';

/* ==========================================================================
   Solicitud (sección «Contáctanos» del inicio): qué busca la persona, zona de preferencia
   (opcional) y presupuesto mínimo y máximo. Antes de enviar se muestra un resumen.
   Al enviar, la solicitud se guarda en el navegador (src/lib/datos.ts) y aparece en el panel, en «Solicitudes».
   ========================================================================== */
const HOURS = ['10:00', '11:30', '13:00', '16:00', '17:30'];

const EMPTY = {
  nombre: '', correo: '', telefono: '', nacionalidad: '', ocupacion: '',
  operacion: 'renta' as 'renta' | 'compra', zona: '', presupuesto_min: '', presupuesto_max: '',
  recamaras: '3', banos: '2', personas: '2', mascotas: '' as '' | 'si' | 'no', mascotas_detalle: '',
  fecha: '', horario: '', comentarios: '',
};
type Form = typeof EMPTY;

export function VisitRequest() {
  const { houses, loading } = useCatalog();
  const toast = useToast();
  const [f, setF] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [showErrors, setShowErrors] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ folio: string; text: string; account: 'created' | 'existing' | null } | null>(null);
  // Sugerencias para «Zona de preferencia»: las zonas de las casas publicadas (se puede escribir cualquier otra)
  const places = useMemo(() => [...new Set(houses.map((h) => h.zona))].sort(), [houses]);
  const budget = budgetLabel(f.presupuesto_min, f.presupuesto_max, f.operacion);

  const validate = (x: Form): Errors =>
    clean({
      nombre: required(x.nombre),
      correo: email(x.correo),
      telefono: phone(x.telefono),
      nacionalidad: required(x.nacionalidad),
      ocupacion: required(x.ocupacion),
      presupuesto_max: budgetError(x.presupuesto_min, x.presupuesto_max),
      mascotas: x.mascotas ? '' : 'Elige una opción.',
      mascotas_detalle: x.mascotas === 'si' ? required(x.mascotas_detalle) : '',
      fecha: futureDate(x.fecha),
      horario: required(x.horario, true),
    });

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((x) => {
      const next = { ...x, [k]: v };
      if (showErrors) setErrors(validate(next));
      return next;
    });
  };
  const setBudget = (min: string, max: string) =>
    setF((x) => {
      const next = { ...x, presupuesto_min: min, presupuesto_max: max };
      if (showErrors) setErrors(validate(next));
      return next;
    });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (loading) return; // aún se carga el catálogo
    const errs = validate(f);
    setErrors(errs);
    setShowErrors(true);
    const first = Object.keys(errs)[0];
    if (first) {
      document.getElementById(first === 'mascotas' ? 'mascotas-si' : first === 'presupuesto_max' ? 'b-pres-max' : `b-${first}`)?.focus();
      return;
    }
    setReviewing(true);
  };

  const send = async () => {
    setReviewing(false);
    setSending(true);
    try {
      const { nombre, correo, telefono, comentarios, fecha, horario, presupuesto_min, presupuesto_max, ...rest } = f;
      const r = await sendLead({
        reason: f.operacion === 'compra' ? 'comprar' : 'rentar', name: nombre.trim(), email: correo.trim(), phone: telefono, message: comentarios,
        // Montos como número; «presupuesto» es el texto legible para el asesor
        payload: { ...rest, presupuesto: budget, presupuesto_min: toAmount(presupuesto_min), presupuesto_max: toAmount(presupuesto_max), fecha_preferida: fecha, horario },
      });
      const first = nombre.trim().split(' ')[0];
      setDone({
        folio: r.folio,
        account: r.account,
        text: `¡Gracias, ${first}! Recibimos tu solicitud.|Tu asesor te propondrá casas ${f.operacion === 'compra' ? 'en venta' : 'en renta'} y te contactará para visitarlas el ${longDate(fecha).toLowerCase()} a las ${horario} h.`,
      });
    } catch (err) {
      const e = err as DataError;
      if (!e?.mensaje) console.error(err);
      toast(e?.mensaje || 'No pudimos enviar tu solicitud. Inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setF(EMPTY); setErrors({}); setShowErrors(false); setDone(null);
    setTimeout(() => document.getElementById('b-nombre')?.focus(), 0);
  };

  const reviewRows = ([
    ['Nombre completo', f.nombre], ['Correo electrónico', f.correo], ['Teléfono', f.telefono], ['Nacionalidad', f.nacionalidad],
    ['¿En qué trabajas?', f.ocupacion], ['Operación', f.operacion === 'compra' ? 'Compra' : 'Renta'], ['Zona de preferencia', f.zona || 'Sin preferencia'],
    ['Presupuesto', budget], ['Número de recámaras', f.recamaras === '4' ? '4 o más' : f.recamaras], ['Número de baños', f.banos === '3' ? '3 o más' : f.banos],
    ['Personas que vivirán en la casa', f.personas === '5' ? '5 o más' : f.personas], ['¿Tienes mascotas?', f.mascotas === 'si' ? 'Sí' : f.mascotas === 'no' ? 'No' : ''],
    ['¿Cuáles y cuántas mascotas?', f.mascotas === 'si' ? f.mascotas_detalle : ''], ['Fecha preferida', f.fecha ? longDate(f.fecha) : ''],
    ['Horario', f.horario ? f.horario + ' h' : ''], ['Comentarios', f.comentarios],
  ] as [string, string][]).filter(([, v]) => v.trim());

  const err = (k: keyof Form) => (showErrors ? errors[k] : undefined);
  const hasErrors = showErrors && Object.keys(errors).length > 0;

  return (
    <div className="booking__layout">
      <aside className="booking__aside" aria-label="Resumen de tu solicitud">
        <section className="summary" id="resumen" aria-labelledby="resumen-titulo" aria-live="polite">
          <span className="eyebrow">Tu solicitud</span>
          <h3 id="resumen-titulo">{f.operacion === 'compra' ? 'Quieres comprar' : 'Quieres rentar'}</h3>
          <p className="summary__loc">{f.zona ? `Zona de preferencia: ${f.zona}` : 'Te propondremos casas según lo que buscas.'}</p>
          {budget && <p className="summary__price"><strong>{budget}</strong></p>}
          <p className="summary__specs">{`${f.recamaras === '4' ? '4 o más' : f.recamaras} recámaras · ${f.banos === '3' ? '3 o más' : f.banos} baños`}{f.mascotas === 'si' ? ' · Con mascotas' : ''}</p>
          <dl>
            <div><dt>Operación</dt><dd>{f.operacion === 'compra' ? 'Compra' : 'Renta'}</dd></div>
            <div><dt>Para visitar</dt><dd>{f.fecha ? longDate(f.fecha) + (f.horario ? ` · ${f.horario} h` : '') : 'Elige fecha y horario'}</dd></div>
            <div><dt>Te acompaña</dt><dd>Tu asesora o asesor de Zugar</dd></div>
            <div><dt>Seguimiento</dt><dd>Por correo y teléfono con tu asesor</dd></div>
          </dl>
          <p className="summary__foot">Tu asesor te propondrá casas y confirmará la visita contigo.</p>
        </section>
        <section className="side-card" aria-labelledby="hablar-titulo">
          <h3 id="hablar-titulo">¿Prefieres hablar?</h3>
          <ul className="side-card__list">
            <li><a href="tel:+529985550142"><Icon id="phone" />+52 998 555 0142</a></li>
            <li><a href="mailto:hola@zugar.mx"><Icon id="mail" />hola@zugar.mx</a></li>
            <li><span><Icon id="clock" />Lun–vie 9:00–18:00 · Sáb 10:00–14:00</span></li>
          </ul>
          <p className="side-card__note">No tenemos oficina física: te atendemos por teléfono, WhatsApp y directamente en cada casa.</p>
        </section>
      </aside>

      <form className="booking-form" noValidate onSubmit={onSubmit}>
        {done ? (
          <LeadDone
            title={done.text.split('|')[0]} text={done.text.split('|')[1]} folio={done.folio} houses={houses} onReset={reset}
            email={f.correo.trim()} account={done.account}
            wish={{ op: f.operacion === 'compra' ? 'venta' : 'renta', min: toAmount(f.presupuesto_min), max: toAmount(f.presupuesto_max), rec: f.recamaras, pets: f.mascotas === 'si', zone: f.zona }}
          />
        ) : (
          <>
            {hasErrors && (
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
                <Field id="b-ocupacion" label="¿En qué trabajas? *" error={err('ocupacion')} className="span-2">
                  <input className="input" id="b-ocupacion" type="text" autoComplete="organization-title" placeholder="Por ejemplo: diseño de interiores" value={f.ocupacion} onChange={(e) => set('ocupacion', e.target.value)} {...invalid('b-ocupacion', err('ocupacion'))} />
                </Field>
              </div>
            </fieldset>

            <fieldset>
              <legend>2. La casa que buscas</legend>
              <div className="form-grid">
                <Field id="b-operacion" label="Operación *">
                  <select className="select" id="b-operacion" value={f.operacion} onChange={(e) => set('operacion', e.target.value as Form['operacion'])}>
                    <option value="renta">Renta</option>
                    <option value="compra">Compra</option>
                  </select>
                </Field>
                <Field id="b-zona" label={<>Zona de preferencia <Opt>(opcional)</Opt></>} help="Colonia, ciudad o país.">
                  <input className="input" id="b-zona" type="text" list="b-zonas" maxLength={80} placeholder="Por ejemplo: Arbolada" value={f.zona} onChange={(e) => set('zona', e.target.value)} />
                  <datalist id="b-zonas">{places.map((z) => <option key={z} value={z} />)}</datalist>
                </Field>
                <BudgetRange idPrefix="b-pres" op={f.operacion} min={f.presupuesto_min} max={f.presupuesto_max} error={err('presupuesto_max')} onChange={setBudget} />
                <Field id="b-recamaras" label="Número de recámaras *">
                  <select className="select" id="b-recamaras" value={f.recamaras} onChange={(e) => set('recamaras', e.target.value)}>
                    <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4 o más</option>
                  </select>
                </Field>
                <Field id="b-banos" label="Número de baños *">
                  <select className="select" id="b-banos" value={f.banos} onChange={(e) => set('banos', e.target.value)}>
                    <option value="1">1</option><option value="2">2</option><option value="3">3 o más</option>
                  </select>
                </Field>
                <Field id="b-personas" label="Personas que vivirán en la casa *">
                  <select className="select" id="b-personas" value={f.personas} onChange={(e) => set('personas', e.target.value)}>
                    <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5 o más</option>
                  </select>
                </Field>
                <Field id="b-mascotas" label="¿Tienes mascotas? *" error={err('mascotas')} className="span-2" group>
                  <div className="choice-group">
                    {(['si', 'no'] as const).map((v) => (
                      <label key={v} className="choice">
                        <input type="radio" id={`mascotas-${v}`} name="mascotas" value={v} checked={f.mascotas === v} onChange={() => set('mascotas', v)} {...invalid('b-mascotas', err('mascotas'))} />
                        <span>{v === 'si' ? 'Sí' : 'No'}</span>
                      </label>
                    ))}
                  </div>
                </Field>
                {f.mascotas === 'si' && (
                  <Field id="b-mascotas_detalle" label="¿Cuáles y cuántas mascotas? *" error={err('mascotas_detalle')} className="span-2" help={err('mascotas_detalle') ? undefined : 'Así te mostramos solo casas donde sean bienvenidas.'}>
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
                <Field id="b-horario" label="Horario *" error={err('horario')}>
                  <select className="select" id="b-horario" value={f.horario} onChange={(e) => set('horario', e.target.value)} {...invalid('b-horario', err('horario'))}>
                    <option value="">Elige un horario</option>
                    {HOURS.map((h) => <option key={h} value={h}>{h} h</option>)}
                  </select>
                </Field>
                <Field id="b-comentarios" label={<>Comentarios <Opt>(opcional)</Opt></>} className="span-2">
                  <textarea className="textarea" id="b-comentarios" placeholder="Por ejemplo: nos gustaría conocer el patio y la iluminación de la casa por la mañana." value={f.comentarios} onChange={(e) => set('comentarios', e.target.value)} />
                </Field>
              </div>
            </fieldset>

            <div className="form-actions">
              <button className="btn btn--lg" type="submit" disabled={sending || loading} aria-busy={sending || undefined}>
                {sending ? 'Enviando…' : <>Revisar solicitud<Icon id="arrow-ur" /></>}
              </button>
              <p className="form-note">
                Te mostraremos un resumen antes de enviar. Al continuar aceptas nuestro <Link to="/contacto#aviso-privacidad">Aviso de privacidad</Link>.
              </p>
            </div>
          </>
        )}
      </form>

      <Dialog open={reviewing} onClose={() => setReviewing(false)} labelledBy="dlg-title">
        <h2 id="dlg-title">Revisa tu solicitud</h2>
        <p className="dlg-lead">Confirma que tus datos estén bien antes de enviarlos.</p>
        <dl className="review">
          {reviewRows.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
        <div className="dlg-actions">
          <button className="btn btn--secondary" type="button" onClick={() => setReviewing(false)}>Corregir datos</button>
          <button className="btn" type="button" onClick={send} autoFocus>Enviar solicitud</button>
        </div>
      </Dialog>
    </div>
  );
}
