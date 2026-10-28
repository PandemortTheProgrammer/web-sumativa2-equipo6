import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Finance, type Note, type NotesSummary, type ServiceError } from '../servicio';
import { can } from '../auth';
import { useOverlay } from '../components/Overlay';
import { Badge, Crumbs, err, FieldError, Icon, PageHead, Tabs, useErrors } from '../components/ui';
import { dateFull, dateShort, money, plural, useStore, Z } from '../store';

/* ==========================================================================
   Pagos: pagarés de cada contrato y su cobro en efectivo.
   Broker: registra pagos y edita pagarés pendientes de sus casas. Administración: además corrige y anula pagos.
   ========================================================================== */
const NOTE_STATUS: Record<Note['status'], { label: string; tone: string }> = {
  pending: { label: 'Pendiente', tone: 'warn' },
  overdue: { label: 'Vencido', tone: 'error' },
  paid: { label: 'Pagado', tone: 'ok' },
  cancelled: { label: 'Cancelado', tone: 'gris' },
};
export const NoteBadge = ({ s }: { s: Note['status'] }) => <Badge label={NOTE_STATUS[s].label} tone={NOTE_STATUS[s].tone} />;

/** Fecha y hora en Cancún: hoy con la hora actual; otro día a mediodía (no cambia de fecha). */
const paidAtIso = (date: string) => {
  if (date !== Z.TODAY) return `${date}T12:00:00-05:00`;
  return `${date}T${new Date().toTimeString().slice(0, 5)}:00-05:00`;
};
const day = (iso: string) => iso.slice(0, 10);
const failMsg = (e: unknown) => (e as ServiceError)?.mensaje || 'No se pudo guardar. Inténtalo de nuevo.';

/** Carga de datos del servicio con estado de carga, error y recarga */
export function useApiData<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  // silent: recarga en segundo plano sin mostrar «Cargando…»
  const reload = useCallback((silent?: boolean) => {
    if (silent !== true) setState((s) => ({ ...s, loading: true }));
    load().then((data) => setState({ data, loading: false }), (e) => setState((s) => (silent === true && s.data ? s : { error: failMsg(e), loading: false })));
  }, deps);
  useEffect(() => reload(), [reload]);
  return { ...state, reload };
}


/* ---------- Diálogos ---------- */
function DialogForm({ title, lead, children, submit, danger, onSubmit, close, error }: {
  title: string; lead: ReactNode; children: ReactNode; submit: string; danger?: boolean; error: string; close: () => void; onSubmit: (form: HTMLFormElement) => void;
}) {
  return (
    <>
      <h2 id="dialog-title">{title}</h2>
      <p className="lead">{lead}</p>
      <form noValidate onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); onSubmit(e.currentTarget); }}>
        {error && <div className="notice notice--error" role="alert"><Icon id="alert" /><span>{error}</span></div>}
        <div className="form-grid">{children}</div>
        <div className="dialog__actions">
          <button className="btn btn--secondary" type="button" onClick={close}>Cancelar</button>
          <button className={'btn' + (danger ? ' btn--danger' : '')} type="submit">{submit}</button>
        </div>
      </form>
    </>
  );
}

const value = (id: string) => (document.getElementById(id) as HTMLInputElement).value.trim();
const noteTitle = (n: Note) => `${n.label} · ${n.client ? n.client.name + ' · ' : ''}${n.property.name}`;

function RegisterPayment({ n, close, done }: { n: Note; close: () => void; done: (msg: string) => void }) {
  const { errors, check, clear } = useErrors();
  const [error, setError] = useState('');
  const submit = (form: HTMLFormElement) => {
    if (!check(form)) return;
    Finance.registerPayment(n, { paidAt: paidAtIso(value('rp-date')), notes: value('rp-notes') || undefined })
      .then((r) => { close(); done(`Pago registrado con folio ${r.payment?.receiptFolio ?? ''}: ${n.label} de ${n.client?.name ?? 'el cliente'}.`); }, (e) => setError(failMsg(e)));
  };
  return (
    <DialogForm title="Registrar pago" lead={<>{noteTitle(n)}<br />El pago en efectivo cubre el pagaré completo: <strong>{money(n.amount)} MXN</strong>. El folio del recibo se genera solo.</>} submit="Registrar pago" error={error} close={close} onSubmit={submit}>
      <div className="field"><label className="field__label" htmlFor="rp-date">Fecha del pago *</label><input className="input" id="rp-date" type="date" required max={Z.TODAY} defaultValue={Z.TODAY} onInput={() => clear('rp-date')} {...err(errors, 'rp-date')} /><FieldError errors={errors} id="rp-date" /></div>
      <div className="field span-all"><label className="field__label" htmlFor="rp-notes">Notas</label><textarea className="textarea" id="rp-notes" maxLength={500} placeholder="Opcional" /></div>
    </DialogForm>
  );
}

function EditNote({ n, close, done }: { n: Note; close: () => void; done: (msg: string) => void }) {
  const { errors, check, clear } = useErrors();
  const [error, setError] = useState('');
  const submit = (form: HTMLFormElement) => {
    if (!check(form)) return;
    const amount = Number(value('en-amount').replace(/[$,\s]/g, ''));
    const dueDate = value('en-date');
    const body = { ...(amount !== n.amount ? { amount } : {}), ...(dueDate !== n.dueDate ? { dueDate } : {}) };
    if (!Object.keys(body).length) return close();
    Finance.updateNote(n, body).then(() => { close(); done(`Se actualizó el ${n.label}.`); }, (e) => setError(failMsg(e)));
  };
  return (
    <DialogForm title="Editar pagaré" lead={<>{noteTitle(n)}<br />Solo se editan pagarés pendientes o vencidos.</>} submit="Guardar cambios" error={error} close={close} onSubmit={submit}>
      <div className="field"><label className="field__label" htmlFor="en-amount">Monto (MXN) *</label><input className="input" id="en-amount" required data-number="" inputMode="decimal" defaultValue={n.amount} onInput={() => clear('en-amount')} {...err(errors, 'en-amount')} /><FieldError errors={errors} id="en-amount" /></div>
      <div className="field"><label className="field__label" htmlFor="en-date">Fecha de vencimiento *</label><input className="input" id="en-date" type="date" required defaultValue={n.dueDate} onInput={() => clear('en-date')} {...err(errors, 'en-date')} /><FieldError errors={errors} id="en-date" /></div>
    </DialogForm>
  );
}

function CorrectPayment({ n, close, done }: { n: Note; close: () => void; done: (msg: string) => void }) {
  const p = n.payment!;
  const { errors, check, clear } = useErrors();
  const [error, setError] = useState('');
  const submit = (form: HTMLFormElement) => {
    if (!check(form)) return;
    const amount = Number(value('cp-amount').replace(/[$,\s]/g, ''));
    const date = value('cp-date');
    const folio = value('cp-folio');
    const notes = value('cp-notes');
    const body = {
      ...(amount !== p.amount ? { amount } : {}),
      ...(date !== day(p.paidAt) ? { paidAt: paidAtIso(date) } : {}),
      ...(folio !== p.receiptFolio ? { receiptFolio: folio } : {}),
      ...(notes && notes !== (p.notes ?? '') ? { notes } : {}),
    };
    if (!Object.keys(body).length) return close();
    Finance.correctPayment(n, body).then(() => { close(); done(`Se corrigió el pago del ${n.label}. El cambio queda en el historial.`); }, (e) => setError(failMsg(e)));
  };
  return (
    <DialogForm title="Corregir pago" lead={<>{noteTitle(n)}<br />Registrado por {p.registeredBy ?? 'el personal'}. La corrección queda en el historial.</>} submit="Guardar corrección" error={error} close={close} onSubmit={submit}>
      <div className="field"><label className="field__label" htmlFor="cp-amount">Monto (MXN) *</label><input className="input" id="cp-amount" required data-number="" inputMode="decimal" defaultValue={p.amount} onInput={() => clear('cp-amount')} {...err(errors, 'cp-amount')} /><FieldError errors={errors} id="cp-amount" /></div>
      <div className="field"><label className="field__label" htmlFor="cp-date">Fecha del pago *</label><input className="input" id="cp-date" type="date" required max={Z.TODAY} defaultValue={day(p.paidAt)} onInput={() => clear('cp-date')} {...err(errors, 'cp-date')} /><FieldError errors={errors} id="cp-date" /></div>
      <div className="field"><label className="field__label" htmlFor="cp-folio">Folio del recibo *</label><input className="input" id="cp-folio" required maxLength={40} defaultValue={p.receiptFolio} onInput={() => clear('cp-folio')} {...err(errors, 'cp-folio')} /><FieldError errors={errors} id="cp-folio" /></div>
      <div className="field span-all"><label className="field__label" htmlFor="cp-notes">Notas</label><textarea className="textarea" id="cp-notes" maxLength={500} defaultValue={p.notes ?? ''} /></div>
    </DialogForm>
  );
}

function VoidPayment({ n, close, done }: { n: Note; close: () => void; done: (msg: string) => void }) {
  const { errors, check, clear } = useErrors();
  const [error, setError] = useState('');
  const submit = (form: HTMLFormElement) => {
    const short = value('vp-reason').length < 5 ? [{ id: 'vp-reason', msg: 'Explica por qué se anula el pago (al menos 5 letras).' }] : [];
    if (!check(form, short)) return;
    Finance.voidPayment(n, value('vp-reason')).then(() => { close(); done(`Se anuló el pago del ${n.label}; el pagaré vuelve a estar por cobrar.`); }, (e) => setError(failMsg(e)));
  };
  return (
    <DialogForm title="¿Anular este pago?" danger lead={<>{noteTitle(n)} · folio {n.payment!.receiptFolio}<br />El pagaré vuelve a pendiente (o vencido) y el pago anulado queda en el historial.</>} submit="Sí, anular pago" error={error} close={close} onSubmit={submit}>
      <div className="field span-all"><label className="field__label" htmlFor="vp-reason">Motivo de la anulación *</label><textarea className="textarea" id="vp-reason" required maxLength={300} placeholder="Por ejemplo: se registró en el pagaré equivocado." onInput={() => clear('vp-reason')} {...err(errors, 'vp-reason')} /><FieldError errors={errors} id="vp-reason" /></div>
    </DialogForm>
  );
}

/** «Nuevo pagaré»: un cargo o mes adicional del contrato vigente. El monto es un número. */
function NewNote({ contractId, rent, close, done }: { contractId: string; rent: number; close: () => void; done: (msg: string) => void }) {
  const { errors, check, clear } = useErrors();
  const [error, setError] = useState('');
  const submit = (form: HTMLFormElement) => {
    if (!check(form)) return;
    const amount = Number(value('nn-amount').replace(/[$,\s]/g, ''));
    Finance.createNote(contractId, amount, value('nn-date')).then((n) => { close(); done(`Se agregó el ${n.label} por ${money(n.amount)}.`); }, (e) => setError(failMsg(e)));
  };
  return (
    <DialogForm title="Nuevo pagaré" lead="Agrega un pagaré al contrato vigente (por ejemplo, un mes más o un cargo acordado)." submit="Agregar pagaré" error={error} close={close} onSubmit={submit}>
      <div className="field"><label className="field__label" htmlFor="nn-amount">Monto (MXN) *</label><input className="input" id="nn-amount" required data-number="" inputMode="decimal" defaultValue={rent} onInput={() => clear('nn-amount')} {...err(errors, 'nn-amount')} /><FieldError errors={errors} id="nn-amount" /></div>
      <div className="field"><label className="field__label" htmlFor="nn-date">Fecha de vencimiento *</label><input className="input" id="nn-date" type="date" required min={Z.TODAY} onInput={() => clear('nn-date')} {...err(errors, 'nn-date')} /><FieldError errors={errors} id="nn-date" /></div>
    </DialogForm>
  );
}

function CancelNote({ n, close, done }: { n: Note; close: () => void; done: (msg: string) => void }) {
  const { errors, check, clear } = useErrors();
  const [error, setError] = useState('');
  const submit = (form: HTMLFormElement) => {
    const short = value('cn-reason').length < 5 ? [{ id: 'cn-reason', msg: 'Explica por qué se cancela (al menos 5 letras).' }] : [];
    if (!check(form, short)) return;
    Finance.cancelNote(n, value('cn-reason')).then(() => { close(); done(`Se canceló el ${n.label}; queda en el historial.`); }, (e) => setError(failMsg(e)));
  };
  return (
    <DialogForm title={`¿Cancelar el ${n.label}?`} danger lead={<>{noteTitle(n)} · {money(n.amount)}<br />Ya no se cobrará; queda en el historial.</>} submit="Sí, cancelar pagaré" error={error} close={close} onSubmit={submit}>
      <div className="field span-all"><label className="field__label" htmlFor="cn-reason">Motivo *</label><textarea className="textarea" id="cn-reason" required maxLength={300} placeholder="Por ejemplo: se acordó no cobrar este cargo." onInput={() => clear('cn-reason')} {...err(errors, 'cn-reason')} /><FieldError errors={errors} id="cn-reason" /></div>
    </DialogForm>
  );
}

/* ---------- Tabla de pagarés ---------- */
export function NotesTable({ notes, showProperty, onChanged, empty }: { notes: Note[]; showProperty?: boolean; onChanged: () => void; empty: string }) {
  const D = useStore();
  const { open, toast } = useOverlay();
  const codeOf = (id: string) => D.properties.find((p) => p.id === id)?.id ?? ''; // ZUG-### para enlazar a la ficha
  const done = (msg: string) => { toast(msg); onChanged(); };
  const dialog = (render: (close: () => void) => ReactNode) => open(render, { wide: true });
  /** Elegir el PDF firmado del pagaré y guardarlo en su pagaré */
  const uploadNotePdf = (n: Note) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.type !== 'application/pdf') return toast('El pagaré debe ser un archivo PDF.');
      if (file.size > 15 * 1024 * 1024) return toast('El PDF pesa más de 15 MB.');
      toast(`Subiendo el PDF del ${n.label}…`);
      Finance.uploadDocument(n.property.id, file, { type: 'promissory_note', name: `${n.label} firmado`, visibleToClient: true, promissoryNoteId: n.id })
        .then(() => done(`Se guardó el PDF del ${n.label}.`), (e) => toast(failMsg(e)));
    };
    input.click();
  };
  const actions = (n: Note) => {
    const list: ReactNode[] = [];
    const payable = n.status === 'pending' || n.status === 'overdue';
    if (payable && can('payments.register')) list.push(<button key="pay" className="btn btn--sm" type="button" onClick={() => dialog((c) => <RegisterPayment n={n} close={c} done={done} />)}>Registrar pago</button>);
    if (payable && can('contracts.manage')) {
      list.push(<button key="edit" className="icon-btn" type="button" title="Editar pagaré" aria-label={'Editar ' + n.label} onClick={() => dialog((c) => <EditNote n={n} close={c} done={done} />)}><Icon id="pencil" /></button>);
      list.push(<button key="cancel" className="icon-btn icon-btn--danger" type="button" title="Cancelar pagaré" aria-label={'Cancelar ' + n.label} onClick={() => dialog((c) => <CancelNote n={n} close={c} done={done} />)}><Icon id="trash" /></button>);
    }
    if (n.payment && can('payments.correct')) {
      list.push(<button key="fix" className="link" type="button" onClick={() => dialog((c) => <CorrectPayment n={n} close={c} done={done} />)}>Corregir</button>);
      list.push(<button key="void" className="link link--danger" type="button" onClick={() => dialog((c) => <VoidPayment n={n} close={c} done={done} />)}>Anular</button>);
    }
    if (n.documentId) list.push(<button key="pdf" className="link" type="button" onClick={() => Finance.openDocument(n.documentId!).catch((e) => toast(failMsg(e)))}>Ver pagaré</button>);
    if (can('documents.manage')) list.push(<button key="up" className="link" type="button" onClick={() => uploadNotePdf(n)}>{n.documentId ? 'Reemplazar PDF' : 'Subir PDF'}</button>);
    if (n.proofDocumentId) list.push(<button key="proof" className="link" type="button" onClick={() => Finance.openDocument(n.proofDocumentId!).catch((e) => toast(failMsg(e)))}>Comprobante</button>);
    return list.length ? <div className="actions" style={{ gap: '.75rem', alignItems: 'center' }}>{list}</div> : <span className="sub">—</span>;
  };
  return (
    <div className="table-wrap">
      <table className="table">
        <caption className="sr-only">Pagarés</caption>
        <thead><tr><th scope="col">Pagaré</th>{showProperty && <th scope="col">Casa / Cliente</th>}<th scope="col">Vence</th><th scope="col">Monto</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead>
        <tbody>
          {notes.length ? notes.map((n) => {
            const code = codeOf(n.property.id);
            return (
              <tr key={n.id}>
                <td><span className="strong">{n.label}</span>{n.payment && <span className="sub">Pagado el {dateShort(day(n.payment.paidAt))} · folio {n.payment.receiptFolio}</span>}</td>
                {showProperty && <td>{code ? <Link className="strong" to={`/propiedades/${code}?seccion=pagos`}>{n.property.name}</Link> : <span className="strong">{n.property.name}</span>}<span className="sub">{n.client?.name}</span></td>}
                <td>{dateFull(n.dueDate)}</td>
                <td className="strong">{money(n.amount)}</td>
                <td><NoteBadge s={n.status} /></td>
                <td>{actions(n)}</td>
              </tr>
            );
          }) : <tr><td colSpan={showProperty ? 6 : 5} className="table-empty">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

/** Tarjeta «Estado de pagos» del contrato */
function SummaryCard({ s }: { s: NotesSummary }) {
  return (
    <div className="metrics">
      <dl className="card metric"><dt>Pagados</dt><dd>{s.paid} de {s.total}</dd><p>{s.total ? Math.round((s.paid / s.total) * 100) : 0}% del contrato</p></dl>
      <dl className="card metric"><dt>Por cobrar</dt><dd>{money(s.remainingAmount)}</dd><p>{s.remaining} {plural(s.remaining, 'pagaré', 'pagarés')}</p></dl>
      <dl className="card metric"><dt>Próximo</dt><dd>{s.next ? dateShort(s.next.dueDate) : '—'}</dd><p>{s.next ? `Pagaré ${String(s.next.number).padStart(2, '0')} · ${money(s.next.amount)}` : 'Sin pagarés pendientes'}</p></dl>
    </div>
  );
}

/** Botón que elige un PDF y ejecuta [upload] (muestra «Subiendo…» mientras tanto) */
export function PdfButton({ label, upload }: { label: string; upload: (file: File) => Promise<string> }) {
  const { toast } = useOverlay();
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button className="btn btn--secondary" type="button" disabled={busy} onClick={() => input.current?.click()}><Icon id="upload" />{busy ? 'Subiendo…' : label}</button>
      <input ref={input} type="file" accept="application/pdf" hidden onChange={(e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) return;
        if (f.type !== 'application/pdf') return toast('Elige un archivo PDF.');
        setBusy(true);
        upload(f).then(toast, (er) => toast(failMsg(er))).finally(() => setBusy(false));
      }} />
    </>
  );
}

/** Mensaje tras separar el PDF de pagarés */
export const splitMessage = (r: { pages: number; notes: number; assigned: number }) =>
  r.pages === r.notes ? `Listo: las ${r.pages} hojas quedaron en sus ${r.notes} pagarés (hoja 1 → pagaré 1…).`
    : r.pages < r.notes ? `El PDF tenía ${r.pages} hojas y hay ${r.notes} pagarés: los primeros ${r.assigned} ya tienen su hoja; a los demás súbeles su PDF.`
      : `El PDF tenía ${r.pages} hojas y hay ${r.notes} pagarés: se usaron las primeras ${r.assigned} hojas.`;

/** Pestaña «Pagos» del detalle de una propiedad: pagarés del contrato vigente */
export function PropertyPayments({ propertyId }: { propertyId: string }) {
  const { open, toast } = useOverlay();
  const dossier = useApiData(() => Finance.dossier(propertyId), [propertyId]);
  const contract = dossier.data?.contract;
  const active = contract?.status === 'active' ? contract : null;
  const notes = useApiData(() => (active ? Finance.notes(`contractId=${active.id}&limit=100`) : Promise.resolve(null)), [active?.id]);
  if (dossier.loading && !dossier.data) return <p className="muted" role="status">Cargando pagos…</p>;
  if (dossier.error) return <div className="notice notice--error" role="alert"><Icon id="alert" /><span>{dossier.error}</span></div>;
  if (!active) return <section className="card card--pad"><p className="muted">Esta casa no tiene un contrato de renta vigente, así que no hay pagarés por cobrar.</p></section>;
  return (
    <div className="stack">
      <div className="notice notice--info"><Icon id="info" /><span>
        Contrato de {dossier.data!.tenant?.name ?? 'inquilino'} · {money(active.monthlyRent)} MXN al mes, del {dateFull(active.startDate)} al {dateFull(active.endDate)}.
        {' '}{can('payments.correct') ? 'Puedes registrar, corregir y anular pagos.' : can('payments.register') ? 'Puedes registrar pagos; corregir o anular un pago lo hace administración.' : 'Solo consulta.'}
      </span></div>
      {notes.data?.summary && <SummaryCard s={notes.data.summary} />}
      {can('contracts.manage') && (
        <div className="choice-row">
          <button className="btn btn--secondary" type="button" onClick={() => open((c) => <NewNote contractId={active.id} rent={Number(active.monthlyRent)} close={c} done={(m) => { toast(m); notes.reload(); }} />, { wide: true })}><Icon id="plus" />Nuevo pagaré</button>
          <PdfButton label="Subir contrato firmado (PDF)"
            upload={(f) => Finance.attachContractPdf(active.id, propertyId, f).then(() => { dossier.reload(); return 'Contrato firmado guardado en el expediente.'; })} />
          <PdfButton label="Subir pagarés (un PDF con todas las hojas)"
            upload={(f) => Finance.splitNotesPdf(active.id, propertyId, f).then((r) => { notes.reload(); return splitMessage(r); })} />
        </div>
      )}
      {notes.error ? <div className="notice notice--error" role="alert"><Icon id="alert" /><span>{notes.error}</span></div>
        : !notes.data ? <p className="muted" role="status">Cargando pagarés…</p>
        : <NotesTable notes={notes.data.data.filter((n) => n.status !== 'cancelled')} onChanged={notes.reload} empty="Este contrato no tiene pagarés." />}
    </div>
  );
}

/** Sección «Pagos» del menú: vencidos, por cobrar y pagados de todas las casas a cargo */
const TABS: [string, string, string][] = [['overdue', 'Vencidos', 'status=overdue'], ['pending', 'Por cobrar', 'status=pending'], ['paid', 'Pagados', 'status=paid']];
const S = { tab: 'overdue' };
export function PaymentsPage() {
  useStore();
  const [tab, setTab] = useState(S.tab);
  const query = TABS.find((t) => t[0] === tab)![2];
  const notes = useApiData(() => Finance.notes(query + '&limit=100'), [query]);
  const counts = useApiData(() => Promise.all(TABS.map((t) => Finance.notes(t[2] + '&limit=1').then((r) => r.pagination.total))), [notes.data]);
  const list = (notes.data?.data ?? []).slice();
  if (tab === 'paid') list.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  return (
    <>
      <Crumbs items={[['Administración', '/resumen'], ['Pagos']]} />
      <PageHead title="Cada pago, en orden." sub={can('payments.correct') ? 'Pagarés de todas las casas en renta. Registra, corrige o anula pagos en efectivo.' : 'Pagarés de las casas a tu cargo. Registra los pagos en efectivo con su folio.'} />
      <>
          <Tabs name="pay" label="Filtrar pagarés" selected={tab} onSelect={(v) => { S.tab = v; setTab(v); }}
            items={TABS.map(([v, label], i) => [v, label + (counts.data ? ' · ' + counts.data[i] : '')])} />
          {notes.error ? <div className="notice notice--error" role="alert"><Icon id="alert" /><span>{notes.error}</span></div>
            : notes.loading && !notes.data ? <p className="muted" role="status">Cargando pagarés…</p>
            : <NotesTable notes={list} showProperty onChanged={() => notes.reload()} empty={{ overdue: 'No hay pagarés vencidos. ¡Todo al corriente!', pending: 'No hay pagarés por cobrar.', paid: 'Aún no hay pagos registrados.' }[tab]!} />}
      </>
    </>
  );
}
