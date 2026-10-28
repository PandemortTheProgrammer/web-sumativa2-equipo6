import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Requests, toIso, type Lead, type LeadMessage, type ServiceError } from '../servicio';
import { currentSession } from '../auth';
import { useOverlay } from '../components/Overlay';
import { ApptBadge, Badge, Crumbs, err, FieldError, Icon, Options, PageHead, Tabs, useErrors, useUrlParams } from '../components/ui';
import { dateFull, dateShort, money, opLabel, plural, useStore, Z, type Property } from '../store';
import { TIMES } from './Appointments';
import { useApiData } from './Payments';

/* ==========================================================================
   P10 · Solicitudes del sitio (Contáctanos, visitas), de la app («Busco casa») o por teléfono.
   El asesor contesta, propone casas y agenda la cita desde aquí.
   Datos: servicio simulado (src/admin/servicio.ts). Las solicitudes que se envían desde el
   sitio público en este mismo navegador aparecen aquí como «Nuevas».
   ========================================================================== */
const REASON: Record<Lead['reason'], string> = { visita: 'Visita', rentar: 'Quiere rentar', comprar: 'Quiere comprar', publicar: 'Publicar su casa', otro: 'Otro motivo' };
const TONE: Record<Lead['status'], string> = { nuevo: 'warn', en_seguimiento: 'info', cerrado: 'gris' };
const TABS: [string, string][] = [['nuevo', 'Nuevas'], ['en_seguimiento', 'En seguimiento'], ['cerrado', 'Cerradas'], ['', 'Todas']];
/** Nombres legibles de los campos del formulario (payload) */
const FIELD: Record<string, string> = {
  operacion: 'Operación', presupuesto: 'Presupuesto', recamaras: 'Recámaras', banos: 'Baños', personas: 'Personas', mascotas: 'Mascotas',
  mascotas_detalle: 'Cuáles mascotas', nacionalidad: 'Nacionalidad', ocupacion: 'Ocupación', zona: 'Ubicación', ubicacion: 'Ubicación',
  inmueble_tipo: 'Tipo de inmueble', inmueble_operacion: 'Quiere', inmueble_zona: 'Colonia o residencial', inmueble_recamaras: 'Recámaras', inmueble_precio: 'Precio esperado',
  origen: 'Origen', presupuesto_min: 'Presupuesto desde', presupuesto_max: 'Presupuesto hasta', fecha_preferida: 'Fecha preferida', horario: 'Horario',
};
/** Campos con importes: los números se muestran como dinero */
const MONEY = new Set(['presupuesto_min', 'presupuesto_max', 'inmueble_precio']);
const shown = (k: string, v: unknown) => (MONEY.has(k) && typeof v === 'number' ? money(v) : VALUE[String(v)] ?? String(v));
/** Presupuesto en la lista: el rango numérico nuevo o el texto de los formularios anteriores */
function budgetOf(p: Lead['payload']) {
  const min = typeof p.presupuesto_min === 'number' ? p.presupuesto_min : null;
  const max = typeof p.presupuesto_max === 'number' ? p.presupuesto_max : null;
  if (min && max) return `${money(min)} – ${money(max)}`;
  if (max) return `hasta ${money(max)}`;
  if (min) return `desde ${money(min)}`;
  return p.presupuesto ? String(p.presupuesto) : '';
}
/** Valores del formulario escritos para personas */
const VALUE: Record<string, string> = {
  true: 'Sí', false: 'No', si: 'Sí', no: 'No', renta: 'Renta', compra: 'Compra', venta: 'Venta', ambas: 'Aún no lo decide',
  casa: 'Casa', 'casa-condominio': 'Casa en condominio', townhouse: 'Townhouse',
};
/** Grupos del formulario, en el orden en que la persona los llenó. Lo que no esté aquí sale en «Otros datos». */
const GROUPS: [string, string[]][] = [
  ['Qué busca', ['operacion', 'presupuesto_min', 'presupuesto_max', 'presupuesto', 'recamaras', 'banos', 'personas', 'mascotas', 'mascotas_detalle', 'zona', 'ubicacion']],
  ['Sobre la persona', ['nacionalidad', 'ocupacion']],
  ['Su casa para publicar', ['inmueble_tipo', 'inmueble_operacion', 'inmueble_zona', 'inmueble_recamaras', 'inmueble_precio']],
  ['Visita', ['fecha_preferida', 'horario']],
];
const ORIGIN: Record<string, string> = { app: 'App Homiz', panel: 'Registrada en el panel', sitio: 'Sitio web' };
const filled = (v: unknown) => v !== '' && v !== null && v !== undefined;

/** Datos del formulario que usan las secciones (una solicitud o el formulario ligado a una cita) */
type FormData = Pick<Lead, 'name' | 'email' | 'phone' | 'payload' | 'message' | 'preferredDate' | 'preferredTime' | 'createdAt'> & { property: { code: string; name: string } | null };

/** Todo lo que llenó en el formulario, por secciones (contacto, qué busca, la persona, visita, mensaje). */
export function FormSections({ l }: { l: FormData }) {
  const p = l.payload;
  // Con el rango numérico, el texto «presupuesto» repite lo mismo
  const skip = new Set(['origen', ...(filled(p.presupuesto_min) || filled(p.presupuesto_max) ? ['presupuesto'] : [])]);
  const known = new Set(GROUPS.flatMap(([, keys]) => keys));
  const visit: [string, string][] = [
    ...(l.property ? [['Casa', `${l.property.name} · ${l.property.code}`] as [string, string]] : []),
    ...(l.preferredDate ? [['Fecha preferida', dateFull(l.preferredDate)] as [string, string]] : []),
    ...(l.preferredTime ? [['Horario', `${l.preferredTime.slice(0, 5)} h`] as [string, string]] : []),
  ];
  const sections: [string, [string, string][]][] = [
    ['Contacto', [['Nombre', l.name], ['Correo', l.email], ['Teléfono', l.phone || '—'], ['Llegó por', ORIGIN[String(p.origen ?? 'sitio')] ?? String(p.origen)], ['Fecha', dateFull(l.createdAt.slice(0, 10))]]],
    ...GROUPS.map(([title, keys]): [string, [string, string][]] => [
      title,
      [...(title === 'Visita' ? visit : []), ...keys.filter((k) => filled(p[k]) && !skip.has(k)).map((k): [string, string] => [FIELD[k] ?? k, shown(k, p[k])])],
    ]),
    ['Otros datos', Object.entries(p).filter(([k, v]) => filled(v) && !known.has(k) && !skip.has(k)).map(([k, v]): [string, string] => [FIELD[k] ?? k.replace(/_/g, ' '), shown(k, v)])],
  ];
  return (
    <div className="form-sections">
      {sections.filter(([, rows]) => rows.length).map(([title, rows]) => (
        <div key={title}>
          <h3 className="label-xs">{title}</h3>
          <dl className="facts-list">
            {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
        </div>
      ))}
      <div>
        <h3 className="label-xs">Mensaje</h3>
        {l.message ? <p className="quote" style={{ marginTop: 0 }}>“{l.message}”</p> : <p className="muted small">No escribió mensaje.</p>}
      </div>
    </div>
  );
}

const failMsg = (e: unknown) => (e as ServiceError)?.mensaje || 'No se pudo guardar. Inténtalo de nuevo.';
const S = { tab: 'nuevo', selected: '' as string };

export const ReasonBadge = ({ l }: { l: Lead }) => <Badge label={l.statusLabel} tone={TONE[l.status]} />;
/** Eliminar solicitudes: solo administración (y propietario) */
const isAdminSession = () => (currentSession()?.roles ?? []).some((r) => r === 'admin' || r === 'owner');
const val = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value.trim();
/** Casas a las que se puede agendar visita: no borradores; primero las propuestas y la de la solicitud */
function visitable(D: { properties: Property[] }, l?: Lead) {
  const first = new Set([...(l?.proposals ?? []).map((p) => p.property.code), ...(l?.property ? [l.property.code] : [])]);
  return D.properties.filter((p) => p.status !== 'borrador')
    .sort((a, b) => Number(first.has(b.id)) - Number(first.has(a.id)) || a.name.localeCompare(b.name));
}

/** Cita vigente (por confirmar o confirmada) agendada desde la solicitud */
const activeAppt = (l: Lead) => (l.appointments ?? []).find((a) => a.status === 'por-confirmar' || a.status === 'confirmada');

/** Agendar la visita desde la solicitud (diálogo): la cita queda «por confirmar» y ligada a la solicitud. */
function ScheduleForm({ l, close, onDone }: { l: Lead; close: () => void; onDone: (msg: string) => void }) {
  const D = useStore();
  const { errors, check, clear } = useErrors();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const houses = visitable(D, l);
  // Cita vigente de la solicitud: se reprograma esa (no se crea otra)
  const active = activeAppt(l);
  const suggested = new Set([...(active ? [active.property.code] : []), ...(l.proposals ?? []).map((p) => p.property.code), ...(l.property ? [l.property.code] : [])]);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const extra = val('sc-date') && val('sc-date') < Z.TODAY ? [{ id: 'sc-date', msg: 'Elige una fecha a partir de hoy.' }] : [];
    if (!check(e.currentTarget, extra)) return;
    const p = D.properties.find((x) => x.id === val('sc-prop'))!;
    setBusy(true);
    Requests.schedule(l.id, { propertyId: p.id, scheduledAt: toIso(val('sc-date'), val('sc-time')), note: val('sc-note') || null })
      .then((r) => { close(); onDone(`Cita ${r.appointment.code} ${r.rescheduled ? 'cambiada' : 'agendada'} para ${l.name}: ${p.name}, ${dateShort(val('sc-date'))} ${val('sc-time')} h. Quedó por confirmar en Citas.`); },
        (er: ServiceError) => { setError(er?.mensaje || 'No se pudo agendar la cita.'); setBusy(false); });
  };
  return (
    <>
      <span className="dialog__icon dialog__icon--info"><Icon id="cal-clock" className="icon--lg" /></span>
      <h2 id="dialog-title">{active ? `Cambiar la cita de ${l.name}` : `Agendar cita para ${l.name}`}</h2>
      <p className="lead">{active
        ? `Ya tiene la cita ${active.code} (${active.property.name}). Elige el nuevo día y horario: se mueve esa misma cita y queda por confirmar. Si eliges otra casa, se agenda una cita aparte.`
        : 'Visita presencial de 45 minutos. Aparece en Citas como «por confirmar».'}</p>
      <form noValidate onSubmit={submit}>
        {error && <div className="notice notice--error" role="alert"><Icon id="alert" /><span>{error}</span></div>}
        <div className="form-grid">
          <div className="field span-all"><label className="field__label" htmlFor="sc-prop">Casa *</label>
            <select className="select" id="sc-prop" required defaultValue={houses.find((p) => suggested.has(p.id))?.id ?? ''} onChange={() => clear('sc-prop')} {...err(errors, 'sc-prop')}>
              <Options list={houses.map((p): [string, string] => [p.id, `${suggested.has(p.id) ? '★ ' : ''}${p.name} · ${p.zone} · ${opLabel(p)} ${money(p.price)}`])} placeholder="Elige la casa a visitar" />
            </select>
            <p className="field__hint">★ = la casa que pidió o las que le propusiste.</p><FieldError errors={errors} id="sc-prop" /></div>
          <div className="field"><label className="field__label" htmlFor="sc-date">Fecha *</label>
            <input className="input" id="sc-date" type="date" required min={Z.TODAY} defaultValue={l.preferredDate && l.preferredDate >= Z.TODAY ? l.preferredDate : ''} onInput={() => clear('sc-date')} {...err(errors, 'sc-date')} /><FieldError errors={errors} id="sc-date" /></div>
          <div className="field"><label className="field__label" htmlFor="sc-time">Horario *</label>
            <select className="select" id="sc-time" required defaultValue={l.preferredTime && TIMES.includes(l.preferredTime.slice(0, 5)) ? l.preferredTime.slice(0, 5) : ''} onChange={() => clear('sc-time')} {...err(errors, 'sc-time')}><Options list={TIMES} placeholder="Elige un horario" /></select><FieldError errors={errors} id="sc-time" /></div>
          <div className="field span-all"><label className="field__label" htmlFor="sc-note">Nota para la visita</label><textarea className="textarea" id="sc-note" defaultValue={l.message ?? ''} placeholder="Lo que le interesa ver" /></div>
        </div>
        <div className="dialog__actions">
          <button className="btn btn--secondary" type="button" onClick={close}>Cancelar</button>
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Guardando…' : active ? 'Cambiar fecha' : 'Agendar cita'}</button>
        </div>
      </form>
    </>
  );
}

/** Nueva solicitud (llamada, WhatsApp, oficina) o corregir una existente (diálogo). */
function LeadForm({ l, close, onDone }: { l?: Lead; close: () => void; onDone: (lead: Lead, msg: string) => void }) {
  const D = useStore();
  const { errors, check, clear } = useErrors();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState<Lead['reason']>(l?.reason ?? 'rentar');
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const extra = !l && reason === 'visita' && !val('lf-prop') ? [{ id: 'lf-prop', msg: 'Elige la casa que quiere visitar.' }] : [];
    if (!check(e.currentTarget, extra)) return;
    setBusy(true);
    const p = l ? Requests.update(l.id, { name: val('lf-name'), phone: val('lf-phone') || null, message: val('lf-msg') || null, reason })
      : Requests.create({ reason, name: val('lf-name'), email: val('lf-email'), phone: val('lf-phone') || null, message: val('lf-msg') || null, propertyCode: val('lf-prop') || null });
    p.then((lead) => { close(); onDone(lead, l ? `Solicitud ${lead.folio} actualizada.` : `Solicitud ${lead.folio} registrada.`); },
      (er: ServiceError) => { setError(er?.mensaje || 'No se pudo guardar.'); setBusy(false); });
  };
  return (
    <>
      <h2 id="dialog-title">{l ? `Editar solicitud ${l.folio}` : 'Nueva solicitud'}</h2>
      <p className="lead">{l ? 'Corrige los datos que llegaron mal escritos.' : 'Para quien llamó, escribió por WhatsApp o vino a la oficina.'}</p>
      <form noValidate onSubmit={submit}>
        {error && <div className="notice notice--error" role="alert"><Icon id="alert" /><span>{error}</span></div>}
        <div className="form-grid">
          <div className="field"><label className="field__label" htmlFor="lf-name">Nombre *</label>
            <input className="input" id="lf-name" required minLength={2} maxLength={120} defaultValue={l?.name} onInput={() => clear('lf-name')} {...err(errors, 'lf-name')} /><FieldError errors={errors} id="lf-name" /></div>
          <div className="field"><label className="field__label" htmlFor="lf-email">Correo *</label>
            <input className="input" id="lf-email" type="email" required={!l} disabled={!!l} defaultValue={l?.email} onInput={() => clear('lf-email')} {...err(errors, 'lf-email')} />
            {l && <p className="field__hint">El correo es el de su cuenta; no se cambia aquí.</p>}<FieldError errors={errors} id="lf-email" /></div>
          <div className="field"><label className="field__label" htmlFor="lf-phone">Teléfono</label><input className="input" id="lf-phone" type="tel" maxLength={30} defaultValue={l?.phone ?? ''} /></div>
          <div className="field"><label className="field__label" htmlFor="lf-reason">Motivo *</label>
            <select className="select" id="lf-reason" value={reason} onChange={(e) => setReason(e.target.value as Lead['reason'])}>
              <Options list={Object.entries(REASON).map(([k, v]): [string, string] => [k, v])} />
            </select></div>
          {!l && (
            <div className="field span-all"><label className="field__label" htmlFor="lf-prop">Casa de interés {reason === 'visita' ? '*' : <span className="muted">(opcional)</span>}</label>
              <select className="select" id="lf-prop" defaultValue="" onChange={() => clear('lf-prop')} {...err(errors, 'lf-prop')}>
                <Options list={visitable(D).map((p): [string, string] => [p.id, `${p.name} · ${p.zone}`])} placeholder="Ninguna en particular" />
              </select><FieldError errors={errors} id="lf-prop" /></div>
          )}
          <div className="field span-all"><label className="field__label" htmlFor="lf-msg">Qué busca o qué pidió</label><textarea className="textarea" id="lf-msg" maxLength={2000} defaultValue={l?.message ?? ''} /></div>
        </div>
        <div className="dialog__actions">
          <button className="btn btn--secondary" type="button" onClick={close}>Cancelar</button>
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Guardando…' : l ? 'Guardar cambios' : 'Registrar solicitud'}</button>
        </div>
      </form>
    </>
  );
}

/** Mensajes de seguimiento de la solicitud. */
function Chat({ leadId, onSent }: { leadId: string; onSent: () => void }) {
  const { toast } = useOverlay();
  const [list, setList] = useState<LeadMessage[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    const load = () => Requests.messages(leadId).then((m) => alive && setList(m), () => alive && setList((x) => x ?? []));
    load();
    const t = setInterval(load, 20_000);
    return () => { alive = false; clearInterval(t); };
  }, [leadId]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [list?.length]);
  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    Requests.send(leadId, text.trim()).then((m) => { setList(m); setText(''); toast('Mensaje enviado.'); onSent(); }, (er) => toast(failMsg(er))).finally(() => setBusy(false));
  };
  return (
    <>
      <div className="chat" aria-live="polite">
        {list === null ? <p className="muted small">Cargando mensajes…</p>
          : list.length ? list.map((m) => (
            <div key={m.id} className={'chat__msg' + (m.fromStaff ? ' chat__msg--staff' : '')}>
              <span className="chat__who">{m.sender} · {new Date(m.createdAt).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              <p>{m.body}</p>
            </div>
          )) : <p className="muted small">Aún no hay mensajes. Escríbele para darle seguimiento.</p>}
        <div ref={end} />
      </div>
      <form className="chat__form" onSubmit={send}>
        <label className="sr-only" htmlFor="rq-msg">Mensaje</label>
        <textarea className="textarea" id="rq-msg" rows={3} maxLength={2000} placeholder="Escribe al cliente para darle seguimiento." value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn btn--block" type="submit" disabled={busy || !text.trim()}>{busy ? 'Enviando…' : 'Enviar mensaje'}</button>
      </form>
    </>
  );
}

function Detail({ id, onChanged, onDeleted, onOpen }: { id: string; onChanged: () => void; onDeleted: () => void; onOpen: (id: string) => void }) {
  const D = useStore();
  const { toast, confirm, open } = useOverlay();
  const lead = useApiData(() => Requests.get(id), [id]);
  const [pick, setPick] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { setPick(''); setNote(''); titleRef.current?.focus(); }, [id]);

  if (lead.loading && !lead.data) return <p className="muted" role="status">Cargando solicitud…</p>;
  if (lead.error || !lead.data) return <div className="notice notice--error" role="alert"><Icon id="alert" /><span>{lead.error}</span></div>;
  const l = lead.data;
  const run = (p: Promise<unknown>, msg: string, after?: () => void) => {
    setBusy(true);
    p.then(() => { toast(msg); after?.(); lead.reload(); onChanged(); }, (e) => toast(failMsg(e))).finally(() => setBusy(false));
  };
  const wantsSale = l.reason === 'comprar' || l.payload.operacion === 'compra';
  // Casas que se pueden proponer: publicadas y disponibles (primero las de la operación que busca), sin las ya propuestas
  const taken = new Set((l.proposals || []).map((p) => p.property.code));
  const options = D.properties
    .filter((p) => p.visibility === 'publicada' && (p.status === 'disponible' || p.status === 'reservada') && !taken.has(p.id))
    .sort((a, b) => Number((b.op === 'venta') === wantsSale) - Number((a.op === 'venta') === wantsSale) || a.price - b.price);
  const appts = l.appointments ?? [];
  const schedule = () => open((close) => <ScheduleForm l={l} close={close} onDone={(m) => { toast(m); lead.reload(); onChanged(); }} />, { wide: true });
  const edit = () => open((close) => <LeadForm l={l} close={close} onDone={(_x, m) => { toast(m); lead.reload(); onChanged(); }} />, { wide: true });
  const remove = () => confirm({
    title: `¿Eliminar la solicitud ${l.folio}?`, lead: `Se borran la solicitud de ${l.name}, sus casas propuestas y la conversación. Las citas que se agendaron se conservan en Citas.`,
    check: null, confirm: 'Eliminar solicitud', cancel: 'Conservar',
    onConfirm: () => { setBusy(true); Requests.remove(l.id).then(() => { toast(`Solicitud ${l.folio} eliminada.`); onDeleted(); }, (e) => { toast(failMsg(e)); setBusy(false); }); },
  });
  const origin = l.payload.origen === 'app' ? ' · desde la app' : l.payload.origen === 'panel' ? ' · registrada en el panel' : ' · desde el sitio';

  return (
    <div className="grid-2 grid-2--wide-side">
      <div className="stack">
        <section className="card card--pad" aria-labelledby="rq-title">
          <div className="card__head">
            <h2 className="card__title" id="rq-title" tabIndex={-1} ref={titleRef}>{l.name} · {l.folio}</h2>
            <ReasonBadge l={l} />
          </div>
          <p className="small muted" style={{ marginBottom: '.75rem' }}>{REASON[l.reason]} · {dateFull(l.createdAt.slice(0, 10))}{origin}</p>
          <div className="choice-row" style={{ marginBottom: '1rem' }}>
            <button className="btn btn--sm" type="button" disabled={busy} onClick={schedule}><Icon id="cal-clock" />{activeAppt(l) ? 'Cambiar fecha de la cita' : 'Agendar cita'}</button>
            <button className="btn btn--sm btn--secondary" type="button" disabled={busy} onClick={edit}>Editar datos</button>
            {isAdminSession() && <button className="btn btn--sm btn--secondary link--danger" type="button" disabled={busy} onClick={remove}>Eliminar</button>}
          </div>
          {l.property && <p style={{ marginBottom: '.75rem' }}>Casa que le interesa: <Link to={'/propiedades/' + l.property.code}>{l.property.name}</Link></p>}
          <FormSections l={l} />
        </section>

        {(l.others ?? []).length > 0 && (
          <section className="card card--pad" aria-labelledby="rq-others">
            <h2 className="card__title" id="rq-others" style={{ marginBottom: '.75rem' }}>Otras solicitudes de esta persona · {l.others!.length}</h2>
            <ul className="proposals">
              {l.others!.map((o) => (
                <li key={o.id}>
                  <div><button className="link strong" type="button" style={{ color: 'var(--marino)' }} onClick={() => onOpen(o.id)}>{o.folio} · {REASON[o.reason]}</button>
                    <span className="sub">{dateFull(o.createdAt.slice(0, 10))}{o.property ? ` · ${o.property}` : ''}{[budgetOf(o.payload), o.payload.recamaras && `${o.payload.recamaras} rec.`, o.payload.zona].filter(Boolean).map((x) => ' · ' + x).join('')}{o.message ? ` · «${o.message.length > 80 ? o.message.slice(0, 80) + '…' : o.message}»` : ''}</span></div>
                  <Badge label={o.statusLabel} tone={TONE[o.status]} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card card--pad" aria-labelledby="rq-appts">
          <div className="card__head">
            <h2 className="card__title" id="rq-appts">Citas · {appts.length}</h2>
            <button className="btn btn--sm" type="button" disabled={busy} onClick={schedule}><Icon id="plus" />{activeAppt(l) ? 'Cambiar fecha' : 'Agendar cita'}</button>
          </div>
          {appts.length ? (
            <ul className="proposals">
              {appts.map((a) => (
                <li key={a.id}>
                  <div><Link className="strong" to={'/citas?cita=' + a.code}>{a.code} · {a.property.name}</Link>
                    <span className="sub">{new Date(a.scheduledAt).toLocaleString('es-MX', { timeZone: 'America/Cancun', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}{a.broker ? ` · ${a.broker}` : ''}</span></div>
                  <ApptBadge s={a.status} />
                </li>
              ))}
            </ul>
          ) : <p className="muted">Aún no tiene cita. Con «Agendar cita» eliges la casa, el día y la hora; aparece en Citas.</p>}
        </section>

        <section className="card card--pad" aria-labelledby="rq-props">
          <div className="card__head"><h2 className="card__title" id="rq-props">Casas propuestas · {(l.proposals || []).length}</h2></div>
          {(l.proposals || []).length ? (
            <ul className="proposals">
              {l.proposals!.map((p) => (
                <li key={p.id}>
                  <div><Link className="strong" to={'/propiedades/' + p.property.code}>{p.property.name}</Link>
                    <span className="sub">{p.property.zone} · {money(p.property.price)}{p.property.operation === 'renta' ? ' / mes' : ''} · {p.property.rec} rec.{p.note ? ` · «${p.note}»` : ''}</span></div>
                  <button className="link link--danger" type="button" disabled={busy}
                    onClick={() => confirm({ title: `¿Quitar ${p.property.name}?`, lead: 'El cliente dejará de verla en sus propuestas.', check: null, confirm: 'Quitar', cancel: 'Conservar', onConfirm: () => run(Requests.unpropose(l.id, p.id), `${p.property.name} se quitó de las propuestas.`) })}>Quitar</button>
                </li>
              ))}
            </ul>
          ) : <p className="muted">Aún no le propones casas. Elige una del inventario; si no hay, contéstale que se la conseguirás.</p>}
          <form className="proposal-form" onSubmit={(e) => { e.preventDefault(); if (!pick) return toast('Elige una casa para proponer.'); run(Requests.propose(l.id, pick, note), 'Casa propuesta.', () => { setPick(''); setNote(''); }); }}>
            <div className="field"><label className="field__label" htmlFor="rq-pick">Proponer una casa</label>
              <select className="select" id="rq-pick" value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">Elige una casa del inventario</option>
                {options.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.zone} · {opLabel(p)} {money(p.price)}</option>)}
              </select></div>
            <div className="field"><label className="field__label" htmlFor="rq-note">Nota para el cliente <span className="muted">(opcional)</span></label>
              <input className="input" id="rq-note" maxLength={300} placeholder="Por ejemplo: tiene jardín y acepta mascotas" value={note} onChange={(e) => setNote(e.target.value)} /></div>
            <button className="btn" type="submit" disabled={busy}><Icon id="plus" />Proponer</button>
          </form>
        </section>
      </div>

      <div className="stack">
        <section className="card card--pad" aria-labelledby="rq-contact">
          <h2 className="card__title" id="rq-contact" style={{ marginBottom: '.75rem' }}>Contacto</h2>
          <div className="contact-lines"><a href={'mailto:' + l.email}>{l.email}</a>{l.phone && <a href={'tel:' + l.phone.replace(/\s/g, '')}>{l.phone}</a>}</div>
        </section>
        <section className="card card--pad" aria-labelledby="rq-answer">
          <h2 className="card__title" id="rq-answer" style={{ marginBottom: '.75rem' }}>Conversación con el cliente</h2>
          {l.response && <p className="quote" style={{ marginTop: 0 }}>“{l.response}”<span className="sub">{l.respondedBy ?? ''}{l.respondedAt ? ' · ' + dateShort(l.respondedAt.slice(0, 10)) : ''}</span></p>}
          <Chat leadId={l.id} onSent={() => { lead.reload(); onChanged(); }} />
        </section>
        <section className="card card--pad" aria-labelledby="rq-status">
          <h2 className="card__title" id="rq-status" style={{ marginBottom: '.75rem' }}>Seguimiento</h2>
          <div className="choice-row">
            {(['nuevo', 'en_seguimiento', 'cerrado'] as const).map((s) => (
              <button key={s} className={'btn btn--sm' + (l.status === s ? '' : ' btn--secondary')} type="button" aria-pressed={l.status === s} disabled={busy || l.status === s}
                onClick={() => run(Requests.update(l.id, { status: s }), `Solicitud ${l.folio}: ${{ nuevo: 'nueva', en_seguimiento: 'en seguimiento', cerrado: 'cerrada' }[s]}.`)}>
                {{ nuevo: 'Nueva', en_seguimiento: 'En seguimiento', cerrado: 'Cerrada' }[s]}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/** Sección «Solicitudes» del menú */
export function RequestsPage() {
  const [tab, setTab] = useState(S.tab);
  const [selected, setSelected] = useState(S.selected);
  useUrlParams((p) => { const id = p.get('id'); if (id) { S.selected = id; setSelected(id); S.tab = ''; setTab(''); } });
  const list = useApiData(() => Requests.list((tab ? 'status=' + tab + '&' : '') + 'limit=100'), [tab]);
  // Las solicitudes nuevas del sitio aparecen solas: se vuelve a leer la lista cada 30 s
  useEffect(() => {
    const t = setInterval(() => list.reload(), 30_000);
    return () => clearInterval(t);
  }, [list.reload]);
  const counts = useApiData(() => Promise.all(TABS.map(([s]) => Requests.list((s ? 'status=' + s + '&' : '') + 'limit=1').then((r) => r.pagination.total))), [list.data]);
  const rows = list.data?.data ?? [];
  const choose = (id: string) => { S.selected = id; setSelected(id); setTimeout(() => document.getElementById('rq-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); };
  const { open, toast } = useOverlay();
  const create = () => open((close) => <LeadForm close={close} onDone={(lead, m) => { toast(m); S.tab = 'nuevo'; setTab('nuevo'); list.reload(); choose(lead.id); }} />, { wide: true });

  return (
    <>
      <Crumbs items={[['Administración', '/resumen'], ['Solicitudes']]} />
      <PageHead title="Cada solicitud, con respuesta." sub="Lo que piden en el sitio, en la app o por teléfono. Contesta, propón casas y agenda la cita."
        actions={<button className="btn" type="button" onClick={create}><Icon id="plus" />Nueva solicitud</button>} />
      <>
          <Tabs name="rq" label="Filtrar solicitudes" selected={tab} onSelect={(v) => { S.tab = v; setTab(v); }}
            items={TABS.map(([v, label], i) => [v, label + (counts.data ? ' · ' + counts.data[i] : '')])} />
          {list.error ? <div className="notice notice--error" role="alert"><Icon id="alert" /><span>{list.error}</span></div> : (
            <div className="table-wrap">
              <table className="table">
                <caption className="sr-only">Solicitudes</caption>
                <thead><tr><th scope="col">Persona / Folio</th><th scope="col">Motivo</th><th scope="col">Busca</th><th scope="col">Recibida</th><th scope="col">Estado</th><th scope="col">Seguimiento</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
                <tbody>
                  {list.loading && !list.data ? <tr><td colSpan={7} className="table-empty">Cargando…</td></tr>
                    : rows.length ? rows.map((l) => (
                      // Toda la fila abre la solicitud (además del nombre y del botón, para teclado)
                      <tr key={l.id} className={l.id === selected ? 'is-selected' : ''} data-row-select onClick={(e) => !(e.target as HTMLElement).closest('a,button') && choose(l.id)}>
                        <td><button className="link strong" type="button" style={{ color: 'var(--marino)' }} onClick={() => choose(l.id)}>{l.name}</button><span className="sub">{l.folio}{l.payload.origen === 'app' ? ' · app' : ''}</span></td>
                        <td>{REASON[l.reason]}</td>
                        <td className="small">{l.property ? l.property.name : [budgetOf(l.payload), l.payload.recamaras && `${l.payload.recamaras} rec.`, l.payload.zona || l.payload.inmueble_zona].filter(Boolean).join(' · ') || '—'}</td>
                        <td>{dateShort(l.createdAt.slice(0, 10))}</td>
                        <td><ReasonBadge l={l} /></td>
                        <td className="small">{[l.appointmentCount && `${l.appointmentCount} ${plural(l.appointmentCount, 'cita', 'citas')}`, l.proposalCount && `${l.proposalCount} ${plural(l.proposalCount, 'casa propuesta', 'casas propuestas')}`, !l.appointmentCount && !l.proposalCount && l.response && 'Respondida'].filter(Boolean).join(' · ') || '—'}</td>
                        <td><button className="btn btn--sm btn--secondary" type="button" onClick={() => choose(l.id)}>{l.id === selected ? 'Abierta' : 'Atender'}</button></td>
                      </tr>
                    )) : <tr><td colSpan={7} className="table-empty">No hay solicitudes {tab === 'nuevo' ? 'nuevas' : tab === 'en_seguimiento' ? 'en seguimiento' : tab === 'cerrado' ? 'cerradas' : ''}.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          <div id="rq-detail" style={{ marginTop: '1.5rem' }} aria-live="polite">
            {selected && <Detail id={selected} onChanged={() => list.reload()} onDeleted={() => { S.selected = ''; setSelected(''); list.reload(); }} onOpen={choose} />}
          </div>
      </>
    </>
  );
}
