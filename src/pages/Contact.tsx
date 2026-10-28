import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useCatalog } from '../components/CatalogProvider';
import { Dialog } from '../components/Dialog';
import { Field, invalid, Opt } from '../components/Field';
import { BudgetRange, budgetError, budgetLabel, toAmount } from '../components/BudgetRange';
import { LeadDone } from '../components/LeadDone';
import { Icon } from '../components/Icon';
import { useToast } from '../components/Toasts';
import { sendLead, type DataError } from '../lib/datos';
import { photoOf, priceUnit } from '../lib/catalog';
import { money } from '../lib/format';
import { usePageTitle } from '../lib/usePageTitle';
import { clean, email, phone, required, type Errors } from '../lib/validation';

/* ==========================================================================
   Contáctanos: el formulario se adapta al motivo (rentar, comprar, publicar u otro).
   Enlaces que llegan con ?motivo=comprar, ?motivo=alerta-busqueda o ?casa=casa-ceiba.
   ========================================================================== */
type Reason = 'rentar' | 'comprar' | 'publicar' | 'otro';
const REASONS: [Reason, string][] = [['rentar', 'Quiero rentar'], ['comprar', 'Quiero comprar'], ['publicar', 'Publicar mi casa'], ['otro', 'Otro motivo']];
const FROM_URL: Record<string, Reason> = { visita: 'rentar', rentar: 'rentar', comprar: 'comprar', publicar: 'publicar', otro: 'otro', 'alerta-busqueda': 'otro', 'asesoria-zona': 'otro' };
const PRESET: Record<string, string> = {
  'alerta-busqueda': 'Hola, me gustaría recibir avisos cuando haya casas nuevas con los filtros de mi búsqueda.',
  'asesoria-zona': 'Hola, me gustaría que me ayuden a elegir la mejor zona de Cancún según mi rutina.',
};

const EMPTY = {
  nombre: '', correo: '', telefono: '', nacionalidad: '', ocupacion: '',
  casa: 'sin-definir', presupuesto_min: '', presupuesto_max: '', recamaras: '3', banos: '2', personas: '2', mascotas: '' as '' | 'si' | 'no', mascotas_detalle: '',
  inmueble_tipo: 'casa', inmueble_operacion: 'renta', inmueble_zona: '', inmueble_recamaras: '3', inmueble_precio: '',
  mensaje: '',
};
type Form = typeof EMPTY;

export function Contact() {
  usePageTitle('Contáctanos | Zugar Inmobiliaria');
  const { houses, bySlug } = useCatalog();
  const [params] = useSearchParams();
  const toast = useToast();
  const [reason, setReason] = useState<Reason>('rentar');
  const [f, setF] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [showErrors, setShowErrors] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ title: string; text: string; folio: string; account: 'created' | 'existing' | null } | null>(null);

  // Valores que llegan en el enlace. Sin ?casa= la casa sigue en «Aún no lo sé» (o la que la persona ya eligió).
  useEffect(() => {
    const house = bySlug[params.get('casa') || ''];
    let pm = params.get('motivo') || '';
    if (house && !pm) pm = house.op === 'venta' ? 'comprar' : 'rentar';
    if (FROM_URL[pm]) setReason(FROM_URL[pm]);
    setF((x) => ({ ...x, casa: house ? house.slug : x.casa, mensaje: x.mensaje || PRESET[pm] || '' }));
  }, [params, bySlug]);

  const buying = reason === 'comprar';
  const lookingFor = reason === 'rentar' || reason === 'comprar';
  const house = lookingFor ? bySlug[f.casa] : undefined;
  const messageRequired = reason === 'otro' || reason === 'publicar';
  const options = useMemo(() => houses.filter((h) => (buying ? h.op === 'venta' : h.op === 'renta')), [houses, buying]);
  const budget = budgetLabel(f.presupuesto_min, f.presupuesto_max, buying ? 'compra' : 'renta');
  const setBudget = (min: string, max: string) =>
    setF((x) => {
      const next = { ...x, presupuesto_min: min, presupuesto_max: max };
      if (showErrors) setErrors(validate(next));
      return next;
    });

  const validate = (x: Form, r = reason): Errors =>
    clean({
      nombre: required(x.nombre), correo: email(x.correo), telefono: phone(x.telefono),
      nacionalidad: r === 'rentar' ? required(x.nacionalidad) : '',
      ocupacion: r === 'rentar' ? required(x.ocupacion) : '',
      casa: r === 'rentar' || r === 'comprar' ? required(x.casa, true) : '',
      presupuesto_max: r === 'rentar' || r === 'comprar' ? budgetError(x.presupuesto_min, x.presupuesto_max) : '',
      mascotas: (r === 'rentar' || r === 'comprar') && !x.mascotas ? 'Elige una opción.' : '',
      mascotas_detalle: (r === 'rentar' || r === 'comprar') && x.mascotas === 'si' ? required(x.mascotas_detalle) : '',
      inmueble_zona: r === 'publicar' ? required(x.inmueble_zona) : '',
      mensaje: r === 'otro' || r === 'publicar' ? required(x.mensaje) : '',
    });

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setF((x) => {
      const next = { ...x, [k]: v };
      if (showErrors) setErrors(validate(next));
      return next;
    });

  const changeReason = (r: Reason) => {
    setReason(r);
    setF((x) => {
      // La lista de casas solo tiene las de la operación del motivo
      const c = bySlug[x.casa];
      const next = c && (c.op === 'venta') !== (r === 'comprar') ? { ...x, casa: 'sin-definir' } : x;
      if (showErrors) setErrors(validate(next, r));
      return next;
    });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validate(f);
    setErrors(errs);
    setShowErrors(true);
    const first = Object.keys(errs)[0];
    if (first) {
      document.getElementById(first === 'mascotas' ? 'mascotas-si' : first === 'presupuesto_max' ? 'b-pres-max' : first.startsWith('inmueble_') ? 'p-zona' : `b-${first}`)?.focus();
      return;
    }
    if (reason === 'otro') void send();
    else setReviewing(true);
  };

  const send = async () => {
    setReviewing(false);
    setSending(true);
    const payload: Record<string, string | number | null> =
      reason === 'publicar'
        ? { inmueble_tipo: f.inmueble_tipo, inmueble_operacion: f.inmueble_operacion, inmueble_zona: f.inmueble_zona, inmueble_recamaras: f.inmueble_recamaras, inmueble_precio: toAmount(f.inmueble_precio) }
        : lookingFor
          ? { operacion: buying ? 'compra' : 'renta', presupuesto: budget, presupuesto_min: toAmount(f.presupuesto_min), presupuesto_max: toAmount(f.presupuesto_max), recamaras: f.recamaras, banos: f.banos, personas: f.personas, mascotas: f.mascotas, mascotas_detalle: f.mascotas === 'si' ? f.mascotas_detalle : '', ...(reason === 'rentar' ? { nacionalidad: f.nacionalidad, ocupacion: f.ocupacion } : {}) }
          : {};
    try {
      const r = await sendLead({
        reason, name: f.nombre.trim(), email: f.correo.trim(), phone: f.telefono, message: f.mensaje,
        propertySlug: lookingFor && f.casa !== 'sin-definir' ? f.casa : undefined, payload,
      });
      const name = f.nombre.trim().split(' ')[0];
      setDone({
        folio: r.folio,
        account: r.account,
        ...{
          rentar: { title: `¡Gracias, ${name}! Recibimos tu solicitud.`, text: 'En un día hábil tu asesor te propondrá casas en renta.' },
          comprar: { title: `¡Gracias, ${name}! Recibimos tu solicitud.`, text: 'En un día hábil tu asesor te propondrá opciones de compra y cómo financiarlas.' },
          publicar: { title: `¡Gracias, ${name}! Queremos conocer tu casa.`, text: 'Tu asesor te contactará para agendar una visita a tu inmueble y preparar la publicación.' },
          otro: { title: `¡Gracias, ${name}! Recibimos tu mensaje.`, text: 'Te responderemos en un día hábil.' },
        }[reason],
      });
      window.scrollTo({ top: (document.getElementById('form-titulo')?.getBoundingClientRect().top ?? 0) + window.scrollY - 96, behavior: 'smooth' });
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

  const err = (k: keyof Form) => (showErrors ? errors[k] : undefined);
  // Los bloques visibles se numeran: 1. Tus datos, 2. …, 3. Tu mensaje
  const legends = ['Tus datos', lookingFor ? 'La casa que buscas' : reason === 'publicar' ? 'Tu casa' : null, 'Tu mensaje'].filter(Boolean) as string[];
  const n = (title: string) => `${legends.indexOf(title) + 1}. ${title}`;

  const reviewRows: [string, string][] = [
    ['Motivo', REASONS.find(([r]) => r === reason)![1]],
    ['Nombre completo', f.nombre], ['Correo electrónico', f.correo], ['Teléfono', f.telefono],
    ...(reason === 'rentar' ? ([['Nacionalidad', f.nacionalidad], ['¿En qué trabajas?', f.ocupacion]] as [string, string][]) : []),
    ...(lookingFor
      ? ([
          ['Casa de interés', f.casa === 'sin-definir' ? 'Aún no lo sé, quiero recomendaciones' : bySlug[f.casa] ? `${bySlug[f.casa].name} · ${bySlug[f.casa].zona}` : ''],
          ['Presupuesto', budget], ['Número de recámaras', f.recamaras === '4' ? '4 o más' : f.recamaras],
          ['Número de baños', f.banos === '3' ? '3 o más' : f.banos], ['Personas que vivirán en la casa', f.personas === '5' ? '5 o más' : f.personas],
          ['¿Tienes mascotas?', f.mascotas === 'si' ? 'Sí' : 'No'], ['¿Cuáles y cuántas mascotas?', f.mascotas === 'si' ? f.mascotas_detalle : ''],
        ] as [string, string][])
      : []),
    ...(reason === 'publicar'
      ? ([
          ['Tipo de inmueble', { casa: 'Casa', 'casa-condominio': 'Casa en condominio', townhouse: 'Townhouse' }[f.inmueble_tipo] ?? ''],
          ['¿Qué quieres hacer?', { renta: 'Rentarla', venta: 'Venderla', ambas: 'Aún no lo decido' }[f.inmueble_operacion] ?? ''],
          ['Colonia o residencial', f.inmueble_zona], ['Recámaras', f.inmueble_recamaras === '4' ? '4 o más' : f.inmueble_recamaras], ['Precio esperado', f.inmueble_precio],
        ] as [string, string][])
      : []),
    [messageRequired ? 'Mensaje' : 'Comentarios', f.mensaje],
  ];

  return (
    <>
      <div className="wrap">
        <nav className="breadcrumb" aria-label="Ruta de navegación">
          <ol><li><Link to="/">Inicio</Link></li><li><span aria-current="page">Contáctanos</span></li></ol>
        </nav>
        <div className="page-head">
          <span className="eyebrow">Tu próximo hogar empieza con un hola</span>
          <h1>Contáctanos</h1>
          <p className="lead">Cuéntanos qué necesitas: rentar, comprar o publicar tu casa. Si ya elegiste una, agenda tu visita desde su ficha en «¿Te imaginas viviendo aquí?». Te responderemos personalmente en un día hábil.</p>
        </div>
        <div className="booking__layout">
          <aside className="booking__aside" aria-label="Resumen y datos de contacto">
            {lookingFor && (
              <section className="summary" id="resumen" aria-labelledby="resumen-titulo" aria-live="polite">
                <span className="eyebrow">{buying ? 'Quieres comprar' : 'Quieres rentar'}</span>
                {house && <div className="photo"><img src={photoOf(house)} alt={`${house.name} en ${house.zona}, Cancún`} loading="lazy" /></div>}
                <h2 id="resumen-titulo">{house ? house.name : f.casa === 'sin-definir' ? 'Te recomendamos opciones' : 'Elige una casa'}</h2>
                <p className="summary__loc">{house ? `${house.zona}, Cancún` : f.casa === 'sin-definir' ? 'Te propondremos casas según lo que buscas.' : 'Aquí verás los datos de la casa que elijas.'}</p>
                {house && <p className="summary__price"><strong>{money(house.price)}</strong> {priceUnit(house)}</p>}
                <p className="summary__specs">{house && `${house.rec} recámaras · ${house.banos} baños · ${house.m2} m² · ${house.pets ? 'Acepta mascotas' : 'No acepta mascotas'}`}</p>
                <dl>
                  <div><dt>Operación</dt><dd>{buying ? 'Compra' : 'Renta'}</dd></div>
                  <div><dt>Te acompaña</dt><dd>{house?.asesor || 'Tu asesora o asesor de Zugar'}</dd></div>
                  <div><dt>Respuesta</dt><dd>Por WhatsApp o correo en menos de 24 horas</dd></div>
                </dl>
              </section>
            )}
            <section className="side-card" aria-labelledby="cerca-titulo">
              <h2 id="cerca-titulo">Estamos cerca de ti</h2>
              <ul className="side-card__list">
                <li><a href="tel:+529985550142"><Icon id="phone" />+52 998 555 0142</a></li>
                <li><a href="mailto:hola@zugar.mx"><Icon id="mail" />hola@zugar.mx</a></li>
                <li><span><Icon id="clock" />Lun–vie 9:00–18:00 · Sáb 10:00–14:00</span></li>
              </ul>
              <p className="side-card__note">No tenemos oficina física: te atendemos por teléfono, WhatsApp y directamente en cada casa.</p>
            </section>
          </aside>

          <section aria-labelledby="form-titulo">
            <h2 className="form-title" id="form-titulo">Nos encantará conocerte</h2>
            <form className="booking-form" noValidate onSubmit={onSubmit}>
              {done ? (
                <LeadDone
                  title={done.title} text={done.text} folio={done.folio} houses={houses} onReset={reset} email={f.correo.trim()} account={done.account}
                  wish={lookingFor ? { op: buying ? 'venta' : 'renta', min: toAmount(f.presupuesto_min), max: toAmount(f.presupuesto_max), rec: f.recamaras, pets: f.mascotas === 'si', slug: f.casa !== 'sin-definir' ? f.casa : undefined } : undefined}
                />
              ) : (
                <>
                  {showErrors && Object.keys(errors).length > 0 && (
                    <div className="alert alert-error is-visible" role="alert">
                      <Icon id="alert" />
                      <div><strong>Revisa los campos señalados</strong>Tu mensaje aún no se ha enviado. Corrige estos datos e inténtalo de nuevo; lo que escribiste se conserva.</div>
                    </div>
                  )}
                  <fieldset>
                    <legend>¿En qué te ayudamos?</legend>
                    <div className="choice-group choice-group--wrap">
                      {REASONS.map(([r, label]) => (
                        <label key={r} className="choice">
                          <input type="radio" name="motivo" value={r} checked={reason === r} onChange={() => changeReason(r)} />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend>{n('Tus datos')}</legend>
                    <div className="form-grid">
                      <Field id="b-nombre" label="Nombre completo *" error={err('nombre')}>
                        <input className="input" id="b-nombre" type="text" autoComplete="name" placeholder="Nombre y apellidos" value={f.nombre} onChange={(e) => set('nombre', e.target.value)} {...invalid('b-nombre', err('nombre'))} />
                      </Field>
                      <Field id="b-correo" label="Correo electrónico *" error={err('correo')}>
                        <input className="input" id="b-correo" type="email" autoComplete="email" placeholder="tu@correo.com" value={f.correo} onChange={(e) => set('correo', e.target.value)} {...invalid('b-correo', err('correo'))} />
                      </Field>
                      <Field id="b-telefono" label={<>Teléfono <Opt>(opcional)</Opt></>} error={err('telefono')} help={err('telefono') ? undefined : 'Para responderte por WhatsApp.'}>
                        <input className="input" id="b-telefono" type="tel" autoComplete="tel" placeholder="998 000 0000" value={f.telefono} onChange={(e) => set('telefono', e.target.value)} {...invalid('b-telefono', err('telefono'))} />
                      </Field>
                      {reason === 'rentar' && (
                        <>
                          <Field id="b-nacionalidad" label="Nacionalidad *" error={err('nacionalidad')}>
                            <input className="input" id="b-nacionalidad" type="text" autoComplete="country-name" placeholder="Mexicana" value={f.nacionalidad} onChange={(e) => set('nacionalidad', e.target.value)} {...invalid('b-nacionalidad', err('nacionalidad'))} />
                          </Field>
                          <Field id="b-ocupacion" label="¿En qué trabajas? *" error={err('ocupacion')} className="span-2">
                            <input className="input" id="b-ocupacion" type="text" autoComplete="organization-title" placeholder="Por ejemplo: diseño de interiores" value={f.ocupacion} onChange={(e) => set('ocupacion', e.target.value)} {...invalid('b-ocupacion', err('ocupacion'))} />
                          </Field>
                        </>
                      )}
                    </div>
                  </fieldset>

                  {lookingFor && (
                    <fieldset>
                      <legend>{n('La casa que buscas')}</legend>
                      <div className="form-grid">
                        <Field id="b-casa" label="Casa de interés *" error={err('casa')}>
                          {/* «Aún no lo sé» primero y sin autocompletar: el navegador no debe dejar una casa elegida por su cuenta */}
                          <select className="select" id="b-casa" name="casa-de-interes" autoComplete="off" value={f.casa} onChange={(e) => set('casa', e.target.value)} {...invalid('b-casa', err('casa'))}>
                            <option value="sin-definir">Aún no lo sé, quiero recomendaciones</option>
                            <optgroup label={buying ? 'En venta' : 'En renta'}>
                              {options.map((h) => <option key={h.slug} value={h.slug}>{h.name} · {h.zona}</option>)}
                            </optgroup>
                          </select>
                        </Field>
                        <BudgetRange idPrefix="b-pres" op={buying ? 'compra' : 'renta'} min={f.presupuesto_min} max={f.presupuesto_max} error={err('presupuesto_max')} onChange={setBudget} />
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
                                <input type="radio" id={`mascotas-${v}`} name="mascotas" value={v} checked={f.mascotas === v} onChange={() => set('mascotas', v)} />
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
                  )}

                  {reason === 'publicar' && (
                    <fieldset>
                      <legend>{n('Tu casa')}</legend>
                      <div className="form-grid">
                        <Field id="p-tipo" label="Tipo de inmueble *">
                          <select className="select" id="p-tipo" value={f.inmueble_tipo} onChange={(e) => set('inmueble_tipo', e.target.value)}>
                            <option value="casa">Casa</option><option value="casa-condominio">Casa en condominio</option><option value="townhouse">Townhouse</option>
                          </select>
                        </Field>
                        <Field id="p-operacion" label="¿Qué quieres hacer? *">
                          <select className="select" id="p-operacion" value={f.inmueble_operacion} onChange={(e) => set('inmueble_operacion', e.target.value)}>
                            <option value="renta">Rentarla</option><option value="venta">Venderla</option><option value="ambas">Aún no lo decido</option>
                          </select>
                        </Field>
                        <Field id="p-zona" label="Colonia o residencial *" error={err('inmueble_zona')}>
                          <input className="input" id="p-zona" type="text" placeholder="Por ejemplo: Residencial Cumbres" value={f.inmueble_zona} onChange={(e) => set('inmueble_zona', e.target.value)} {...invalid('p-zona', err('inmueble_zona'))} />
                        </Field>
                        <Field id="p-rec" label="Recámaras *">
                          <select className="select" id="p-rec" value={f.inmueble_recamaras} onChange={(e) => set('inmueble_recamaras', e.target.value)}>
                            <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4 o más</option>
                          </select>
                        </Field>
                        <Field id="p-precio" label={<>Precio esperado <Opt>(opcional)</Opt></>} className="span-2">
                          <input className="input" id="p-precio" type="text" inputMode="numeric" placeholder="Te ayudamos a definirlo si aún no lo sabes" value={f.inmueble_precio} onChange={(e) => set('inmueble_precio', e.target.value)} />
                        </Field>
                      </div>
                    </fieldset>
                  )}

                  <fieldset>
                    <legend>{n('Tu mensaje')}</legend>
                    <Field id="b-mensaje" label={messageRequired ? 'Mensaje *' : <>Comentarios <Opt>(opcional)</Opt></>} error={err('mensaje')}>
                      <textarea className="textarea" id="b-mensaje" placeholder="Cuéntanos qué buscas y cuándo te gustaría mudarte." value={f.mensaje} onChange={(e) => set('mensaje', e.target.value)} {...invalid('b-mensaje', err('mensaje'))} />
                    </Field>
                  </fieldset>

                  <div className="form-actions">
                    <button className="btn btn--lg" type="submit" disabled={sending} aria-busy={sending || undefined}>{sending ? 'Enviando…' : <>Enviar<Icon id="arrow" /></>}</button>
                    <p className="form-note">Al enviar aceptas nuestro <a href="#aviso-privacidad">Aviso de privacidad</a>. Usaremos tus datos únicamente para atender tu solicitud. * Campos obligatorios.</p>
                  </div>
                </>
              )}
            </form>
          </section>
        </div>
      </div>

      <section className="section section--surface section--tight" id="aviso-privacidad" aria-labelledby="privacidad-titulo" style={{ marginTop: 'var(--seccion)' }}>
        <div className="wrap privacy">
          <h2 id="privacidad-titulo">Aviso de privacidad</h2>
          <p>Zugar Inmobiliaria, con operaciones en Cancún, Quintana Roo, es responsable del tratamiento de los datos personales que nos compartes. Los usamos únicamente para responder tus solicitudes, coordinar visitas a las casas y darte seguimiento sobre las propiedades de tu interés.</p>
          <p>No vendemos ni compartimos tus datos con terceros, salvo con el propietario del inmueble cuando tú lo autorizas. Para ejercer tus derechos de acceso, rectificación, cancelación u oposición, escríbenos a <a href="mailto:privacidad@zugar.mx">privacidad@zugar.mx</a>.</p>
        </div>
      </section>

      <Dialog open={reviewing} onClose={() => setReviewing(false)} labelledBy="dlg-title">
        <h2 id="dlg-title">Revisa tu solicitud</h2>
        <p className="dlg-lead">Confirma que tus datos estén bien antes de enviarlos.</p>
        <dl className="review">
          {reviewRows.filter(([, v]) => v && v.trim()).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v.trim()}</dd></div>)}
        </dl>
        <div className="dlg-actions">
          <button className="btn btn--secondary" type="button" onClick={() => setReviewing(false)}>Corregir datos</button>
          <button className="btn" type="button" onClick={send} autoFocus>Enviar solicitud</button>
        </div>
      </Dialog>
    </>
  );
}
