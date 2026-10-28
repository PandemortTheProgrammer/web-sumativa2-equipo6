import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { createContract, Finance, Requests, type ServiceError } from '../servicio';
import { splitMessage } from './Payments';
import { FormSections } from './Requests';
import { can } from '../auth';
import { useOverlay } from '../components/Overlay';
import { ApptBadge, brokerOptions, Cover, Crumbs, err, FieldError, Icon, Metric, Options, PageHead, Tabs, useErrors, useUrlParams } from '../components/ui';
import {
  addMinutes, appt, broker, D as Data, dateLong, dateShort, dayShort, downloadCSV, isoDate, log, monthName, monthShort, norm, nowTime, parseDate, person,
  plural, prop, rerender, sortAppts, upcoming, useStore, viewState, Z, type Appointment,
} from '../store';

export const TIMES = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '16:00', '16:30', '17:00', '17:30', '18:00'];
const S = viewState.citas;

function weekDays() {
  const start = parseDate(Z.TODAY);
  start.setDate(start.getDate() + S.offset * 7);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
}
const rangeLabel = (days: Date[]) => {
  const [a, b] = [days[0], days[6]];
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${monthShort(b)}` : `${a.getDate()} ${monthShort(a)}–${b.getDate()} ${monthShort(b)}`;
};
const brokerClash = (brokerId: string, date: string, start: string, exceptId?: string) =>
  Data.appointments.some((a) => a.id !== exceptId && a.broker === brokerId && a.date === date && a.start === start && a.status !== 'cancelada');
function goToWeekOf(iso: string) {
  const diff = Math.floor((parseDate(iso).getTime() - parseDate(Z.TODAY).getTime()) / 86400000);
  S.offset = Math.floor(diff / 7);
}

/** Reprogramar una cita (diálogo) */
function Reschedule({ a, close }: { a: Appointment; close: () => void }) {
  const { toast } = useOverlay();
  const { errors, check, clear } = useErrors();
  const p = prop(a.property);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const date = (document.getElementById('rs-date') as HTMLInputElement).value;
    const time = (document.getElementById('rs-time') as HTMLSelectElement).value;
    const extra = [];
    if (date && date < Z.TODAY) extra.push({ id: 'rs-date', msg: 'Elige una fecha a partir de hoy.' });
    else if (date && brokerClash(a.broker, date, time, a.id)) extra.push({ id: 'rs-time', msg: broker(a.broker).name + ' ya tiene una cita a esa hora.' });
    if (!check(e.currentTarget, extra)) return;
    Object.assign(a, { date, start: time, end: addMinutes(time, 45), status: 'por-confirmar', confirmedBy: '' });
    const why = (document.getElementById('rs-why') as HTMLInputElement).value.trim();
    log(`Lucía reprogramó la visita de ${person(a.person).name} para el ${dateShort(a.date)}, ${a.start} h${why ? ' (' + why + ')' : ''}.`, a.property);
    toast(`Cita reprogramada: ${dateLong(a.date)}, ${a.start} h.`);
    S.selected = a.id; S.day = null;
    close();
    goToWeekOf(a.date);
    rerender();
  };
  return (
    <>
      <span className="dialog__icon dialog__icon--info"><Icon id="cal-clock" className="icon--lg" /></span>
      <h2 id="dialog-title">Reprogramar cita</h2>
      <p className="lead">{person(a.person).name} · {p?.name ?? ''}. La cita quedará por confirmar hasta que el cliente acepte el nuevo horario.</p>
      <form id="rs-form" noValidate onSubmit={onSubmit}>
        <div className="form-grid">
          <div className="field"><label className="field__label" htmlFor="rs-date">Nueva fecha *</label>
            <input className="input" id="rs-date" type="date" required min={Z.TODAY} defaultValue={a.date} onInput={() => clear('rs-date')} {...err(errors, 'rs-date')} /><FieldError errors={errors} id="rs-date" /></div>
          <div className="field"><label className="field__label" htmlFor="rs-time">Horario *</label>
            <select className="select" id="rs-time" required defaultValue={a.start} onChange={() => clear('rs-time')} {...err(errors, 'rs-time')}><Options list={TIMES} /></select><FieldError errors={errors} id="rs-time" /></div>
          <div className="field span-all"><label className="field__label" htmlFor="rs-why">Motivo del cambio</label><input className="input" id="rs-why" placeholder="Por ejemplo: el cliente pidió más temprano" /></div>
        </div>
        <div className="dialog__actions"><button className="btn btn--secondary" type="button" onClick={close}>Cancelar</button><button className="btn" type="submit">Guardar nuevo horario</button></div>
      </form>
    </>
  );
}

/** Nueva cita (diálogo) */
function NewAppointment({ personId, close, onDone }: { personId: string | null; close: () => void; onDone: () => void }) {
  const D = useStore();
  const { toast } = useOverlay();
  const { errors, check, clear } = useErrors();
  const per = personId ? D.people.find((x) => x.id === personId) : undefined;
  const prop0 = per?.property ?? '';
  const [propId, setPropId] = useState(prop0);
  const [brokerId, setBrokerId] = useState(prop(prop0)?.broker ?? '');
  const v = (id: string) => (document.getElementById(id) as HTMLInputElement).value;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const extra = [];
    if (v('nc-date') && v('nc-date') < Z.TODAY) extra.push({ id: 'nc-date', msg: 'Elige una fecha a partir de hoy.' });
    else if (v('nc-date') && v('nc-time') && brokerId && brokerClash(brokerId, v('nc-date'), v('nc-time'))) extra.push({ id: 'nc-time', msg: broker(brokerId).name + ' ya tiene una cita a esa hora.' });
    if (!check(e.currentTarget, extra)) return;
    const a: Appointment = {
      id: 'CIT-' + String(D.nextNumbers.appointment++).padStart(3, '0'), person: v('nc-person'), property: propId, broker: brokerId,
      date: v('nc-date'), start: v('nc-time'), end: addMinutes(v('nc-time'), 45), status: 'por-confirmar', kind: 'Presencial', note: v('nc-note').trim(),
    };
    D.appointments.push(a);
    log(`Lucía agendó una visita de ${person(a.person).name} a ${prop(a.property)!.name} para el ${dateShort(a.date)}, ${a.start} h.`, a.property);
    toast(`Cita ${a.id} agendada · ${dateLong(a.date)}, ${a.start} h.`);
    S.selected = a.id; S.day = null; S.tab = 'todas';
    close();
    goToWeekOf(a.date);
    onDone();
  };
  return (
    <>
      <h2 id="dialog-title">Nueva cita</h2>
      <p className="lead">Agenda una visita presencial de 45 minutos. Quedará por confirmar hasta que el cliente acepte.</p>
      <form id="nc-form" noValidate onSubmit={onSubmit}>
        <div className="form-grid">
          <div className="field"><label className="field__label" htmlFor="nc-person">Cliente *</label>
            <select className="select" id="nc-person" required defaultValue={personId || ''} {...err(errors, 'nc-person')}
              onChange={(e) => {
                clear('nc-person');
                const pr = D.people.find((x) => x.id === e.target.value);
                const pp = pr && prop(pr.property);
                if (pp && pp.status !== 'borrador') { setPropId(pp.id); setBrokerId(pp.broker); }
              }}>
              <Options list={D.people.map((p): [string, string] => [p.id, p.name])} placeholder="Elige a una persona" />
            </select><FieldError errors={errors} id="nc-person" /></div>
          <div className="field"><label className="field__label" htmlFor="nc-prop">Propiedad *</label>
            <select className="select" id="nc-prop" required value={propId} {...err(errors, 'nc-prop')}
              onChange={(e) => { clear('nc-prop'); setPropId(e.target.value); const pp = prop(e.target.value); if (pp) setBrokerId(pp.broker); }}>
              <Options list={D.properties.filter((p) => p.status !== 'borrador').map((p): [string, string] => [p.id, p.name + ' · ' + p.id])} placeholder="Elige una casa" />
            </select><FieldError errors={errors} id="nc-prop" /></div>
          <div className="field"><label className="field__label" htmlFor="nc-date">Fecha *</label>
            <input className="input" id="nc-date" type="date" required min={Z.TODAY} onInput={() => clear('nc-date')} {...err(errors, 'nc-date')} /><FieldError errors={errors} id="nc-date" /></div>
          <div className="field"><label className="field__label" htmlFor="nc-time">Horario *</label>
            <select className="select" id="nc-time" required defaultValue="" onChange={() => clear('nc-time')} {...err(errors, 'nc-time')}><Options list={TIMES} placeholder="Elige un horario" /></select><FieldError errors={errors} id="nc-time" /></div>
          <div className="field span-all"><label className="field__label" htmlFor="nc-broker">Broker responsable *</label>
            <select className="select" id="nc-broker" required value={brokerId} onChange={(e) => { clear('nc-broker'); setBrokerId(e.target.value); }} {...err(errors, 'nc-broker')}>
              <Options list={brokerOptions(D.brokers, brokerId)} placeholder="Elige un broker" />
            </select>
            <p className="field__hint">Por defecto, el responsable de la casa.</p><FieldError errors={errors} id="nc-broker" /></div>
          <div className="field span-all"><label className="field__label" htmlFor="nc-note">Nota del cliente</label><textarea className="textarea" id="nc-note" placeholder="Lo que le interesa ver en la visita" /></div>
        </div>
        <div className="dialog__actions"><button className="btn btn--secondary" type="button" onClick={close}>Cancelar</button><button className="btn" type="submit">Agendar cita</button></div>
      </form>
    </>
  );
}

/** Módulo 5 · Citas */
export function Appointments() {
  const D = useStore();
  const navigate = useNavigate();
  const { toast, open, confirm } = useOverlay();
  const panelTitle = useRef(false);
  const pendingNew = useRef<string | null>(null);
  // Solicitudes nuevas o en seguimiento: de ahí se agendan las citas
  const [openLeads, setOpenLeads] = useState<number | null>(null);
  useEffect(() => {
    if (!can('leads.manage')) return;
    Promise.all(['nuevo', 'en_seguimiento'].map((s) => Requests.list(`status=${s}&limit=1`).then((r) => r.pagination.total)))
      .then(([a, b]) => setOpenLeads(a + b), () => {});
  }, []);

  useUrlParams((p) => {
    const c = p.get('cita');
    if (c && appt(c)) { S.selected = c; S.day = null; S.tab = appt(c)!.status === 'cancelada' ? 'cancelada' : 'todas'; S.q = ''; S.broker = ''; goToWeekOf(appt(c)!.date); }
    if (p.get('nueva')) pendingNew.current = p.get('nueva');
  });

  const newAppointment = (personId: string | null) =>
    open((close) => <NewAppointment personId={personId} close={close} onDone={() => { navigate('/citas'); rerender(); }} />, { wide: true });

  useEffect(() => {
    if (pendingNew.current) { const id = pendingNew.current; pendingNew.current = null; newAppointment(id); }
    if (panelTitle.current) { panelTitle.current = false; document.getElementById('ap-title')?.focus({ preventScroll: true }); }
  });

  const days = weekDays();
  const inWeek = (a: Appointment) => a.date >= isoDate(days[0]) && a.date <= isoDate(days[6]);
  const week = D.appointments.filter(inWeek);
  const c = (s: string) => week.filter((a) => a.status === s).length;
  // Las canceladas salen de la agenda; quedan en la pestaña «Canceladas» como historial.
  const live = (a: Appointment) => a.status !== 'cancelada';
  const q = norm(S.q);
  const fits = (a: Appointment) => {
    const p = prop(a.property);
    return (S.tab === 'todas' ? live(a) : a.status === S.tab) && (!S.broker || a.broker === S.broker) && (!q || norm(person(a.person).name + ' ' + (p ? p.name : '')).includes(q));
  };
  const list = sortAppts(week.filter((a) => (!S.day || a.date === S.day) && fits(a)));
  // Carrusel del detalle: todas las citas con los filtros actuales, de cualquier semana
  const deck = sortAppts(D.appointments.filter(fits));
  const chosen = appt(S.selected);
  const sel = chosen && fits(chosen) ? chosen : list[0];
  const pend = upcoming((a) => a.status === 'por-confirmar')[0];
  const go = (a: Appointment) => { S.selected = a.id; S.day = null; goToWeekOf(a.date); rerender(); };

  const setStatus = (a: Appointment, status: string) => {
    const name = person(a.person).name, p = prop(a.property);
    if (status === 'cancelada' && S.tab !== 'cancelada') {
      // La cancelada desaparece de la lista: el detalle pasa a la siguiente cita
      const i = deck.indexOf(a), next = deck[i + 1] ?? deck[i - 1];
      S.selected = next ? next.id : null;
    }
    a.status = status;
    if (status === 'confirmada') a.confirmedBy = `Confirmada por Lucía · ${dateShort(Z.TODAY)}, ${nowTime()} h.`;
    const verb = ({ confirmada: 'confirmó', realizada: 'marcó como realizada', cancelada: 'canceló' } as Record<string, string>)[status];
    log(`Lucía ${verb} la visita de ${name} a ${p ? p.name : 'la propiedad'}.`, a.property);
    toast(({ confirmada: `Cita confirmada con ${name}.`, realizada: `La visita de ${name} quedó como realizada.`, cancelada: `Se canceló la visita de ${name}.` } as Record<string, string>)[status]);
    rerender();
  };
  const cancel = (a: Appointment) => {
    const p = prop(a.property);
    confirm({
      icon: 'cal-clock', title: `¿Cancelar la visita de ${person(a.person).name}?`,
      lead: `${p?.name ?? ''} · ${dateLong(a.date)}, ${a.start} h. Saldrá de la agenda y quedará en «Canceladas» como historial; avisa al cliente por teléfono o WhatsApp.`,
      cancel: 'Conservar cita', confirm: 'Sí, cancelar cita',
      onConfirm: () => setStatus(a, 'cancelada'),
    });
  };
  const reschedule = (a: Appointment) => open((close) => <Reschedule a={a} close={close} />);
  const exportCsv = () => {
    const rows: string[][] = [['Clave', 'Fecha', 'Inicio', 'Fin', 'Cliente', 'Correo', 'Teléfono', 'Propiedad', 'Broker', 'Estado', 'Nota']];
    sortAppts(D.appointments).forEach((x) => { const pe = person(x.person); rows.push([x.id, x.date, x.start, x.end, pe.name, pe.email, pe.phone, prop(x.property)?.name ?? '', broker(x.broker).name, Z.APPT_STATUS[x.status].label, x.note]); });
    downloadCSV('zugar-agenda-citas.csv', rows);
    toast('Se descargó zugar-agenda-citas.csv.');
  };

  return (
    <>
      <Crumbs items={[['Administración', '/resumen'], ['Citas']]} />
      <PageHead title="Cada visita, bien acompañada." sub="Coordina clientes, casas y brokers sin perder de vista el siguiente paso."
        actions={<>{openLeads !== null && <Link className="btn btn--secondary" to="/solicitudes"><Icon id="mail" />Solicitudes por agendar · {openLeads}</Link>}<button className="btn btn--secondary" type="button" onClick={exportCsv}><Icon id="download" />Exportar agenda</button><button className="btn" type="button" onClick={() => newAppointment(null)}><Icon id="plus" />Nueva cita</button></>} />
      <div className="metrics">
        <Metric label="Citas de la semana" value={week.length} note={`${days[0].getDate()}–${days[6].getDate()} de ${monthName(days[6]).toLowerCase()}`} />
        <Metric label="Confirmadas" value={c('confirmada')} note="Listas para la visita" />
        <Metric label="Por confirmar" value={c('por-confirmar')} note="Pendiente de contacto" />
        <Metric label="Realizadas / canceladas" value={`${c('realizada')} / ${c('cancelada')}`} note="Historial de la semana" />
      </div>
      <div className="grid-2 grid-2--wide-side">
        <div>
          <div className="week-head">
            <h2>{monthName(days[0])} {days[0].getFullYear()}</h2>
            <div className="week-nav">
              <button className="icon-btn" type="button" aria-label="Semana anterior" onClick={() => { S.offset -= 1; S.day = null; S.selected = null; rerender(); }}><Icon id="left" /></button>
              <span aria-live="polite">{rangeLabel(days)}</span>
              <button className="icon-btn" type="button" aria-label="Semana siguiente" onClick={() => { S.offset += 1; S.day = null; S.selected = null; rerender(); }}><Icon id="right" /></button>
            </div>
          </div>
          <div className="days" role="group" aria-label="Días de la semana">
            {days.map((d) => {
              const iso = isoDate(d), n = week.filter((a) => a.date === iso && live(a)).length;
              const pressed = S.day === iso || (!S.day && sel?.date === iso);
              return (
                <button key={iso} className={'day' + (iso === Z.TODAY ? ' is-today' : '')} type="button" id={'day-' + iso} aria-pressed={pressed}
                  aria-label={`${dateLong(iso)}, ${n} ${plural(n, 'cita', 'citas')}${iso === Z.TODAY ? ', hoy' : ''}`}
                  onClick={() => {
                    S.day = S.day === iso ? null : iso;
                    if (S.day) { const f = list.find((a) => a.date === iso) || sortAppts(week.filter((x) => x.date === iso && fits(x)))[0]; S.selected = f ? f.id : null; }
                    rerender();
                  }}>
                  <span>{dayShort(d)}</span><strong>{d.getDate()}</strong><small>{n} {plural(n, 'cita', 'citas')}</small>
                </button>
              );
            })}
          </div>
          <div id="ct-tabs">
            <Tabs name="ct" label="Filtrar por estado" selected={S.tab} onSelect={(v) => { S.tab = v; rerender(); }}
              items={[['todas', 'Todas · ' + week.filter(live).length], ['confirmada', 'Confirmadas · ' + c('confirmada')], ['por-confirmar', 'Por confirmar · ' + c('por-confirmar')], ['cancelada', 'Canceladas · ' + c('cancelada')]]} />
          </div>
          <div className="filters filters--2" role="search" aria-label="Filtrar citas">
            <div className="field"><label className="field__label" htmlFor="ct-q">Buscar cita</label><input className="input input-search" id="ct-q" type="search" placeholder="Cliente o propiedad" defaultValue={S.q} onChange={(e) => { S.q = e.target.value; rerender(); }} /></div>
            <div className="field"><label className="field__label" htmlFor="ct-broker">Broker</label>
              <select className="select" id="ct-broker" value={S.broker} onChange={(e) => { S.broker = e.target.value; rerender(); }}><Options list={brokerOptions(D.brokers, S.broker)} placeholder="Todos" /></select></div>
          </div>
          <p className="small muted" id="ct-dayline" style={{ marginBlock: '1rem .5rem' }}>
            {S.day && <>Mostrando las citas del {dateLong(S.day).toLowerCase()} · <button className="link" type="button" onClick={() => { S.day = null; rerender(); document.getElementById('ct-q')?.focus(); }}>Ver toda la semana</button></>}
          </p>
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Citas de la semana</caption>
              <thead><tr><th scope="col">Fecha / Hora</th><th scope="col">Cliente / Propiedad</th><th scope="col">Broker</th><th scope="col">Estado</th></tr></thead>
              <tbody id="ct-rows">
                {list.length ? list.map((a) => {
                  const p = prop(a.property);
                  return (
                    <tr key={a.id} className={a.id === sel?.id ? 'is-selected' : ''}>
                      <td><span className="strong">{dateShort(a.date)}</span><span className="sub">{a.start}–{a.end} h</span></td>
                      <td><button className="link strong" type="button" style={{ color: 'var(--marino)' }} aria-pressed={a.id === sel?.id} onClick={() => { S.selected = a.id; panelTitle.current = true; rerender(); }}>{person(a.person).name}</button>
                        <span className="sub">{p ? p.name : 'Propiedad eliminada'} · {a.kind}</span></td>
                      <td>{broker(a.broker).name}</td>
                      <td><ApptBadge s={a.status} /></td>
                    </tr>
                  );
                }) : <tr><td colSpan={4} className="table-empty">{week.length ? 'No hay citas con estos filtros.' : 'No hay citas registradas esta semana.'}</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="small muted" id="ct-meta" style={{ marginTop: '.75rem' }}>{list.length} {plural(list.length, 'cita', 'citas')} · Zona horaria de Cancún (UTC-5)</p>
          <div id="ct-pending" style={{ marginTop: '1.5rem' }}>
            <section className="card card--pad" aria-labelledby="sp-title">
              <h2 className="card__title" id="sp-title" style={{ marginBottom: '.75rem' }}>Seguimiento pendiente</h2>
              {pend ? (
                <>
                  <p>{person(pend.person).name} aún no confirma su visita a {prop(pend.property)?.name ?? 'la propiedad'} ({dateShort(pend.date)}, {pend.start} h).</p>
                  <div className="page-actions" style={{ marginTop: '1rem' }}>
                    <button className="btn" type="button" onClick={() => { S.selected = pend.id; setStatus(pend, 'confirmada'); }}>Confirmar cita</button>
                    <button className="btn btn--secondary" type="button" onClick={() => reschedule(pend)}>Reprogramar</button>
                  </div>
                </>
              ) : <p className="muted">Todas las visitas próximas están confirmadas.</p>}
            </section>
          </div>
        </div>
        <div id="ct-panel"><AppointmentPanel a={sel} deck={deck} onGo={go} onStatus={setStatus} onReschedule={reschedule} onCancel={cancel} onNew={newAppointment}
          onTenant={(x) => open((close) => <TenantForm a={x} close={close} onDone={(m) => { toast(m); rerender(); }} />, { wide: true })} /></div>
      </div>
    </>
  );
}


/** Contrato de renta desde una visita realizada: la persona queda como inquilina de la casa. */
function TenantForm({ a, close, onDone }: { a: Appointment; close: () => void; onDone: (msg: string) => void }) {
  const p = prop(a.property)!;
  const per = person(a.person);
  const { errors, check, clear } = useErrors();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const v = (id: string) => (document.getElementById(id) as HTMLInputElement).value.trim();
  const pdf = (id: string) => (document.getElementById(id) as HTMLInputElement).files?.[0];
  const year = (iso: string) => `${Number(iso.slice(0, 4)) + 1}${iso.slice(4)}`;
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const contractPdf = pdf('tf-contract'), notesPdf = pdf('tf-notes');
    const extra = [
      ...(v('tf-end') <= v('tf-start') ? [{ id: 'tf-end', msg: 'La fecha de fin debe ser posterior al inicio.' }] : []),
      ...(contractPdf && contractPdf.type !== 'application/pdf' ? [{ id: 'tf-contract', msg: 'El contrato debe ser un PDF.' }] : []),
      ...(notesPdf && notesPdf.type !== 'application/pdf' ? [{ id: 'tf-notes', msg: 'Los pagarés deben ser un PDF.' }] : []),
    ];
    if (!check(e.currentTarget, extra)) return;
    setBusy('Creando el contrato…');
    let contractId = '';
    try {
      contractId = (await createContract({
        propertyId: p.id, clientId: a.person, startDate: v('tf-start'), endDate: v('tf-end'),
        monthlyRent: Number(v('tf-rent').replace(/[$,\s]/g, '')), paymentDay: Number(v('tf-day')), deposit: v('tf-deposit') ? Number(v('tf-deposit').replace(/[$,\s]/g, '')) : null,
      })).id;
      setBusy('Subiendo el contrato firmado…');
      await Finance.attachContractPdf(contractId, p.id, contractPdf!);
      let notesMsg = ' Sube el PDF de los pagarés desde la pestaña Pagos de la casa.';
      if (notesPdf) {
        setBusy('Separando los pagarés por hoja…');
        notesMsg = ' ' + splitMessage(await Finance.splitNotesPdf(contractId, p.id, notesPdf));
      }
      close();
      onDone(`${per.name} ahora es inquilino de ${p.name}: se guardó el contrato firmado y la casa quedó rentada.${notesMsg}`);
    } catch (er) {
      const msg = (er as ServiceError)?.mensaje;
      // Si el contrato ya se creó, lo que falte se sube desde Propiedades › Pagos
      setError(contractId ? `El contrato se creó, pero no se pudo subir un archivo${msg ? ': ' + msg : ''}. Súbelo desde la pestaña Pagos de la casa.` : msg || 'No se pudo crear el contrato.');
      setBusy('');
    }
  };
  return (
    <>
      <h2 id="dialog-title">Rentar {p.name} a {per.name}</h2>
      <p className="lead">Sube el contrato firmado y, si ya los tienes, los pagarés firmados en un solo PDF (una hoja por pagaré: la hoja 1 queda en el pagaré 1, la 2 en el 2…). La persona pasa a inquilina y la casa queda como rentada.</p>
      <form noValidate onSubmit={submit}>
        {error && <div className="notice notice--error" role="alert"><Icon id="alert" /><span>{error}</span></div>}
        <div className="form-grid">
          <div className="field"><label className="field__label" htmlFor="tf-start">Inicio del contrato *</label><input className="input" id="tf-start" type="date" required defaultValue={Z.TODAY} onInput={() => clear('tf-start')} {...err(errors, 'tf-start')} /><FieldError errors={errors} id="tf-start" /></div>
          <div className="field"><label className="field__label" htmlFor="tf-end">Fin del contrato *</label><input className="input" id="tf-end" type="date" required defaultValue={year(Z.TODAY)} onInput={() => clear('tf-end')} {...err(errors, 'tf-end')} /><FieldError errors={errors} id="tf-end" /></div>
          <div className="field"><label className="field__label" htmlFor="tf-rent">Renta mensual (MXN) *</label><input className="input" id="tf-rent" required data-number="" inputMode="decimal" defaultValue={p.price} onInput={() => clear('tf-rent')} {...err(errors, 'tf-rent')} /><FieldError errors={errors} id="tf-rent" /></div>
          <div className="field"><label className="field__label" htmlFor="tf-day">Día de pago (1 a 28) *</label><input className="input" id="tf-day" required type="number" min={1} max={28} defaultValue={5} onInput={() => clear('tf-day')} {...err(errors, 'tf-day')} /><FieldError errors={errors} id="tf-day" /></div>
          <div className="field"><label className="field__label" htmlFor="tf-deposit">Depósito (MXN)</label><input className="input" id="tf-deposit" data-number="" inputMode="decimal" defaultValue={p.deposit || p.price} /></div>
          <div className="field span-all"><label className="field__label" htmlFor="tf-contract">Contrato firmado (PDF) *</label>
            <input className="input" id="tf-contract" type="file" accept="application/pdf" required onChange={() => clear('tf-contract')} {...err(errors, 'tf-contract')} /><FieldError errors={errors} id="tf-contract" /></div>
          <div className="field span-all"><label className="field__label" htmlFor="tf-notes">Pagarés firmados (un PDF con todas las hojas) <span className="muted">(opcional)</span></label>
            <input className="input" id="tf-notes" type="file" accept="application/pdf" onChange={() => clear('tf-notes')} {...err(errors, 'tf-notes')} />
            <p className="field__hint">Una hoja por pagaré, en orden: se separa sola y cada hoja queda en su pagaré. Si aún no están firmados, súbelos después desde Pagos.</p><FieldError errors={errors} id="tf-notes" /></div>
        </div>
        <div className="dialog__actions">
          <button className="btn btn--secondary" type="button" onClick={close} disabled={!!busy}>Cancelar</button>
          <button className="btn" type="submit" disabled={!!busy}>{busy || 'Crear contrato'}</button>
        </div>
      </form>
    </>
  );
}

/** Detalle de la cita como carrusel: flechas, teclado (← →) o deslizar recorren todas las citas filtradas. */
function AppointmentPanel({ a, deck, onGo, onStatus, onReschedule, onCancel, onNew, onTenant }: {
  a?: Appointment; deck: Appointment[]; onGo: (a: Appointment) => void;
  onStatus: (a: Appointment, s: string) => void; onReschedule: (a: Appointment) => void; onCancel: (a: Appointment) => void; onNew: (personId: string) => void; onTenant: (a: Appointment) => void;
}) {
  const touchX = useRef<number | null>(null);
  const first = deck.find((x) => x.date >= Z.TODAY) ?? deck[0];
  if (!a) return (
    <section className="card card--pad appt-panel">
      <p className="muted">{deck.length ? 'No hay citas esta semana con estos filtros.' : 'No hay citas con estos filtros.'}</p>
      {first && <button className="btn btn--secondary btn--block" type="button" style={{ marginTop: '1rem' }} onClick={() => onGo(first)}>Ver la próxima cita</button>}
    </section>
  );
  const i = deck.indexOf(a);
  const prev = i > 0 ? deck[i - 1] : undefined, next = i >= 0 ? deck[i + 1] : first;
  const step = (to?: Appointment) => { if (to) onGo(to); };
  const p = prop(a.property), per = person(a.person), b = broker(a.broker);
  const open = a.status === 'confirmada' || a.status === 'por-confirmar';
  return (
    <>
      <section className="card appt-panel" aria-labelledby="ap-title" aria-live="polite"
        onKeyDown={(e) => { if ((e.target as HTMLElement).closest('input,textarea,select')) return; if (e.key === 'ArrowLeft') step(prev); if (e.key === 'ArrowRight') step(next); }}
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => { if (touchX.current === null) return; const dx = e.changedTouches[0].clientX - touchX.current; touchX.current = null; if (Math.abs(dx) > 60) step(dx < 0 ? next : prev); }}>
        <div className="appt-carousel" role="group" aria-label="Recorrer citas">
          <button className="icon-btn" type="button" aria-label="Cita anterior" disabled={!prev} onClick={() => step(prev)}><Icon id="left" /></button>
          <span>{i >= 0 ? `Cita ${i + 1} de ${deck.length}` : `${deck.length} ${plural(deck.length, 'cita', 'citas')}`}</span>
          <button className="icon-btn" type="button" aria-label="Cita siguiente" disabled={!next || next === a} onClick={() => step(next)}><Icon id="right" /></button>
        </div>
        <div className="appt-panel__top"><ApptBadge s={a.status} /><span>{a.id}</span></div>
        <h2 id="ap-title" tabIndex={-1}>Una visita a {p ? p.name : 'una propiedad eliminada'}</h2>
        <p className="when">{dateLong(a.date)}</p>
        <p>{a.start}–{a.end} h · Visita {a.kind.toLowerCase()}</p>
        {p && (
          <>
            <Cover p={p} />
            <p className="strong" style={{ fontWeight: 600, color: 'var(--marino)' }}><Link to={'/propiedades/' + p.id} style={{ color: 'inherit' }}>{p.name} · {p.id}</Link></p>
            <p className="small muted" style={{ marginTop: '.5rem' }}>{p.street}, {p.zone}, Cancún</p>
          </>
        )}
        <hr />
        <span className="label-xs">Cliente</span>
        <p className="strong" style={{ fontWeight: 600, color: 'var(--marino)' }}>{per.name}</p>
        <p className="small muted"><a href={'mailto:' + per.email} style={{ color: 'inherit' }}>{per.email}</a> · {per.phone}</p>
        <span className="label-xs" style={{ marginTop: '1rem' }}>Broker responsable</span>
        <p className="strong" style={{ fontWeight: 600, color: 'var(--marino)' }}>{b.name}</p>
        <p className="small muted">{b.phone}</p>
        {a.note && <div className="note-box"><strong>Nota de {per.name.split(' ')[0]}</strong>{a.note}</div>}
        {a.lead && (
          <details className="appt-form" open>
            <summary>{a.lead.linked ? 'Formulario que llenó' : 'Su solicitud más reciente'} · <Link to={'/solicitudes?id=' + a.lead.id}>{a.lead.folio}</Link></summary>
            <FormSections l={a.lead} />
          </details>
        )}
        {a.status === 'realizada' && p && p.op === 'renta' && p.status !== 'rentada' && can('contracts.manage') && (
          <button className="btn btn--block" type="button" style={{ marginTop: '1rem' }} onClick={() => onTenant(a)}><Icon id="user-key" />Rentarle esta casa (inquilino)</button>
        )}
        <div className="appt-actions">
          {a.status === 'confirmada' && <button className="btn btn--block" type="button" onClick={() => onStatus(a, 'realizada')}>Marcar como realizada</button>}
          {a.status === 'por-confirmar' && <button className="btn btn--block" type="button" onClick={() => onStatus(a, 'confirmada')}>Confirmar cita</button>}
          {open ? (
            <>
              <button className="btn btn--secondary btn--block" type="button" onClick={() => onReschedule(a)}>Reprogramar cita</button>
              <button className="link link--danger" type="button" onClick={() => onCancel(a)}>Cancelar cita</button>
            </>
          ) : <button className="btn btn--secondary btn--block" type="button" onClick={() => onNew(a.person)}>Agendar otra visita</button>}
        </div>
      </section>
      <p className="small muted" style={{ marginTop: '.75rem' }}>
        {a.confirmedBy || (a.status === 'por-confirmar' ? 'Pendiente de confirmación del cliente.' : `Estado: ${Z.APPT_STATUS[a.status].label.toLowerCase()}.`)} Se conserva el historial de cada cambio.
      </p>
    </>
  );
}
