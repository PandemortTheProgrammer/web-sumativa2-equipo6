import { useState, type ReactNode } from 'react';
import { Finance, type DossierDoc, type ServiceError } from '../servicio';
import { can } from '../auth';
import { useOverlay } from '../components/Overlay';
import { Badge, err, FieldError, Icon, Options, useErrors } from '../components/ui';
import { dateShort, money } from '../store';
import { useApiData } from './Payments';

/* ==========================================================================
   Expediente de una casa: contrato, depósito, ficha de entrega y documentos.
   Broker (documents.manage): sube, renombra y muestra u oculta documentos al cliente.
   Administración (documents.delete): además elimina documentos.
   ========================================================================== */
const DOC_TYPES: [string, string][] = [
  ['contract', 'Contrato'], ['deposit', 'Depósito en garantía'], ['delivery_sheet', 'Ficha de entrega'], ['rules', 'Reglamento'],
  ['annex', 'Anexo'], ['receipt', 'Recibo'], ['proof', 'Comprobante de pago'], ['photo', 'Fotografía'], ['other', 'Otro'],
];
// Los PDF de pagarés se suben desde la pestaña «Pagos» (cada uno ligado a su pagaré)
const typeLabel = (t: string) => DOC_TYPES.find(([v]) => v === t)?.[1] ?? t;
const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';
const MAX_MB = 15;
const failMsg = (e: unknown) => (e as ServiceError)?.mensaje || 'No se pudo guardar. Inténtalo de nuevo.';
const sizeLabel = (b: number) => (b >= 1024 * 1024 ? (b / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
const value = (id: string) => (document.getElementById(id) as HTMLInputElement).value.trim();

function DocForm({ doc, propertyId, close, done }: { doc: DossierDoc | null; propertyId: string; close: () => void; done: (msg: string) => void }) {
  const { errors, check, clear, set } = useErrors();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(doc ? doc.visibleToClient : true);
  const submit = async (form: HTMLFormElement) => {
    const file = doc ? null : (document.getElementById('df-file') as HTMLInputElement).files?.[0];
    const extra = [];
    if (!doc && !file) extra.push({ id: 'df-file', msg: 'Elige el archivo (PDF, JPG, PNG o WEBP).' });
    else if (file && !ACCEPT.split(',').includes(file.type)) extra.push({ id: 'df-file', msg: 'Ese tipo de archivo no se acepta. Usa PDF, JPG, PNG o WEBP.' });
    else if (file && file.size > MAX_MB * 1024 * 1024) extra.push({ id: 'df-file', msg: `El archivo pesa más de ${MAX_MB} MB.` });
    if (value('df-name').length < 2) extra.push({ id: 'df-name', msg: 'Escribe el nombre del documento.' });
    if (!check(form, extra)) return;
    setBusy(true);
    setError('');
    const data = { name: value('df-name'), description: value('df-desc') || undefined, visibleToClient: visible };
    try {
      if (doc) {
        await Finance.updateDocument(doc.id, { ...data, description: data.description ?? null });
        close();
        done(`Se actualizó «${data.name}».`);
      } else {
        await Finance.uploadDocument(propertyId, file!, { ...data, type: value('df-type') });
        close();
        done(`«${data.name}» se agregó al expediente${visible ? ' (visible para el cliente)' : ''}.`);
      }
    } catch (e) {
      setError(failMsg(e));
      setBusy(false);
    }
  };
  return (
    <>
      <h2 id="dialog-title">{doc ? 'Editar documento' : 'Subir documento'}</h2>
      <p className="lead">{doc ? `${typeLabel(doc.type)} · subido el ${dateShort(doc.createdAt.slice(0, 10))}` : `PDF o imagen de hasta ${MAX_MB} MB. En el prototipo el archivo se guarda en la memoria del navegador.`}</p>
      <form noValidate onSubmit={(e) => { e.preventDefault(); if (!busy) submit(e.currentTarget); }}>
        {error && <div className="notice notice--error" role="alert"><Icon id="alert" /><span>{error}</span></div>}
        <div className="form-grid">
          {!doc && (
            <>
              <div className="field span-all"><label className="field__label" htmlFor="df-file">Archivo *</label><input className="input" id="df-file" type="file" accept={ACCEPT}
                onChange={(e) => { clear('df-file'); const f = e.target.files?.[0]; const name = document.getElementById('df-name') as HTMLInputElement; if (f && !name.value) { name.value = f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '); set((x) => ({ ...x, 'df-name': '' })); } }} {...err(errors, 'df-file')} />
                <FieldError errors={errors} id="df-file" /></div>
              <div className="field"><label className="field__label" htmlFor="df-type">Tipo de documento *</label><select className="select" id="df-type" required defaultValue="annex"><Options list={DOC_TYPES} /></select></div>
            </>
          )}
          <div className={'field' + (doc ? ' span-all' : '')}><label className="field__label" htmlFor="df-name">Nombre *</label><input className="input" id="df-name" required maxLength={120} defaultValue={doc?.name ?? ''} placeholder="Anexo C · Mascotas" onInput={() => clear('df-name')} {...err(errors, 'df-name')} /><FieldError errors={errors} id="df-name" /></div>
          <div className="field span-all"><label className="field__label" htmlFor="df-desc">Descripción</label><input className="input" id="df-desc" maxLength={200} defaultValue={doc?.description ?? ''} placeholder="Opcional: aparece debajo del nombre" /></div>
          <label className="check span-all"><input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> Visible para el cliente (si no, solo lo ve el personal)</label>
        </div>
        <div className="dialog__actions">
          <button className="btn btn--secondary" type="button" onClick={close}>Cancelar</button>
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Guardando…' : doc ? 'Guardar cambios' : 'Subir documento'}</button>
        </div>
      </form>
    </>
  );
}

/** Pestaña «Expediente» del detalle de una propiedad (propertyId = clave ZUG-###) */
export function PropertyDossier({ propertyId }: { propertyId: string }) {
  const { open, toast, confirm } = useOverlay();
  const dossier = useApiData(() => Finance.dossier(propertyId), [propertyId]);
  if (dossier.loading && !dossier.data) return <p className="muted" role="status">Cargando expediente…</p>;
  if (dossier.error) return <div className="notice notice--error" role="alert"><Icon id="alert" /><span>{dossier.error}</span></div>;
  const d = dossier.data!;
  const manage = can('documents.manage');
  const remove = can('documents.delete');
  const done = (msg: string) => { toast(msg); dossier.reload(); };
  const form = (doc: DossierDoc | null) => open((close) => <DocForm doc={doc} propertyId={propertyId} close={close} done={done} />, { wide: true });
  const view = (doc: DossierDoc) => Finance.openDocument(doc.id).catch((e) => toast(failMsg(e)));
  const toggle = (doc: DossierDoc) =>
    Finance.updateDocument(doc.id, { visibleToClient: !doc.visibleToClient }).then(
      () => done(doc.visibleToClient ? `«${doc.name}» ya no es visible para el cliente.` : `«${doc.name}» ahora es visible para el cliente.`),
      (e) => toast(failMsg(e)),
    );
  const askDelete = (doc: DossierDoc) =>
    confirm({
      title: `¿Eliminar «${doc.name}»?`,
      lead: 'El archivo se borra del expediente y del almacenamiento. Quedará registrado en el historial quién lo eliminó. Esta acción no se puede deshacer.',
      check: 'Entiendo que el documento se eliminará definitivamente.',
      cancel: 'Conservar documento', confirm: 'Sí, eliminar',
      onConfirm: () => Finance.deleteDocument(doc.id).then(() => done(`Se eliminó «${doc.name}» del expediente.`), (e) => toast(failMsg(e))),
    });
  const rights: ReactNode = remove ? 'Puedes subir, editar, ocultar y eliminar documentos.' : manage ? 'Puedes subir, editar y ocultar documentos; eliminarlos lo hace administración.' : 'Solo consulta.';

  return (
    <div className="stack">
      <div className="grid-2">
        <section className="card card--pad" aria-labelledby="dz-contract">
          <h2 className="card__title" id="dz-contract" style={{ marginBottom: '.75rem' }}>Contrato</h2>
          {d.contract ? (
            <>
              <p style={{ marginBottom: '.5rem' }}><Badge label={d.contract.status === 'active' ? 'Vigente' : 'Finalizado'} tone={d.contract.status === 'active' ? 'ok' : 'gris'} /></p>
              <p className="small">Del {dateShort(d.contract.startDate)} {d.contract.startDate.slice(0, 4)} al {dateShort(d.contract.endDate)} {d.contract.endDate.slice(0, 4)}</p>
              <p className="small muted">{money(d.contract.monthlyRent)} MXN al mes · paga el día {d.contract.paymentDay}{d.contract.deposit ? ` · depósito ${money(d.contract.deposit)}` : ''}</p>
            </>
          ) : <p className="muted">Esta casa no tiene contrato registrado.</p>}
        </section>
        <section className="card card--pad" aria-labelledby="dz-tenant">
          <h2 className="card__title" id="dz-tenant" style={{ marginBottom: '.75rem' }}>Inquilino</h2>
          {d.tenant ? (
            <div className="contact-lines"><strong>{d.tenant.name}</strong>{d.tenant.email && <a href={'mailto:' + d.tenant.email}>{d.tenant.email}</a>}{d.tenant.phone && <a href={'tel:' + d.tenant.phone.replace(/\s/g, '')}>{d.tenant.phone}</a>}</div>
          ) : <p className="muted">Sin inquilino vinculado.</p>}
        </section>
      </div>
      <section aria-labelledby="dz-docs">
        <div className="section-head">
          <h2 id="dz-docs">Documentos · {d.documents.length}</h2>
          {manage && <button className="btn btn--sm" type="button" onClick={() => form(null)}><Icon id="upload" />Subir documento</button>}
        </div>
        <p className="small muted" style={{ marginBottom: '.75rem' }}>{rights}</p>
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">Documentos del expediente</caption>
            <thead><tr><th scope="col">Documento</th><th scope="col">Tipo</th><th scope="col">Cliente</th><th scope="col">Acciones</th></tr></thead>
            <tbody>
              {d.documents.length ? d.documents.map((doc) => (
                <tr key={doc.id}>
                  <td><button className="link strong" type="button" onClick={() => view(doc)}>{doc.name}</button><span className="sub">{doc.description ? doc.description + ' · ' : ''}{doc.mime === 'application/pdf' ? 'PDF' : 'Imagen'} · {sizeLabel(doc.size)} · {dateShort(doc.createdAt.slice(0, 10))}</span></td>
                  <td>{typeLabel(doc.type)}</td>
                  <td>{doc.visibleToClient ? <Badge label="Visible" tone="ok" /> : <Badge label="Solo personal" tone="gris" />}</td>
                  <td><div className="actions">
                    <button className="icon-btn" type="button" title="Ver" aria-label={'Ver ' + doc.name} onClick={() => view(doc)}><Icon id="eye" /></button>
                    {manage && <button className="link" type="button" aria-label={(doc.visibleToClient ? 'Ocultar al cliente ' : 'Mostrar al cliente ') + doc.name} onClick={() => toggle(doc)}>{doc.visibleToClient ? 'Ocultar' : 'Mostrar'}</button>}
                    {manage && <button className="icon-btn" type="button" title="Editar" aria-label={'Editar ' + doc.name} onClick={() => form(doc)}><Icon id="pencil" /></button>}
                    {remove && <button className="icon-btn icon-btn--danger" type="button" title="Eliminar" aria-label={'Eliminar ' + doc.name} onClick={() => askDelete(doc)}><Icon id="trash" /></button>}
                  </div></td>
                </tr>
              )) : <tr><td colSpan={4} className="table-empty">El expediente no tiene documentos.{manage ? ' Sube el contrato, el depósito o la ficha de entrega.' : ''}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
