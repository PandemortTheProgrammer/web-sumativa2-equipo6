import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useOverlay } from '../components/Overlay';
import { Badge, brokerOptions, Crumbs, err, FieldError, FollowBadge, Icon, Metric, Options, PageHead, Pager, Tabs, useErrors, useUrlParams } from '../components/ui';
import { broker, D as Data, dateShort, downloadCSV, log, norm, plural, prop, rerender, upcoming, useStore, viewState, Z, type Person } from '../store';

const typeLabel = (p: Person) => (p.type === 'cliente' ? 'Cliente' : p.label || 'Inquilino');
const nextFor = (p: Person) => upcoming((a) => a.person === p.id)[0];

/** Alta o edición de un expediente (diálogo) */
function PersonForm({ person, close }: { person: Person | null; close: () => void }) {
  const D = useStore();
  const { toast } = useOverlay();
  const { errors, check, clear } = useErrors();
  const p = person || { name: '', email: '', phone: '', type: 'cliente', property: '', broker: '', follow: 'Nuevo contacto', op: 'Renta', budget: '', needs: '', job: '' };
  const [brokerId, setBrokerId] = useState(p.broker);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!check(e.currentTarget)) return;
    const v = (id: string) => (document.getElementById(id) as HTMLInputElement).value.trim();
    const data = { name: v('pf-name'), email: v('pf-email'), phone: v('pf-phone'), type: v('pf-type') as Person['type'], follow: v('pf-follow'), property: v('pf-prop'), broker: v('pf-broker'), op: v('pf-op'), budget: v('pf-budget'), needs: v('pf-needs'), job: v('pf-job') };
    const S = viewState.people;
    if (person) {
      if (data.type !== person.type) delete person.label;
      Object.assign(person, data);
      log('Lucía actualizó el expediente de ' + person.name + '.');
      toast('Se guardó el expediente de ' + person.name + '.');
      S.selected = person.id;
    } else {
      const np: Person = { ...data, id: 'p' + D.nextNumbers.person++ };
      D.people.push(np);
      log(`Lucía agregó a ${np.name} como ${np.type === 'cliente' ? 'cliente' : 'inquilino'}.`);
      toast(np.name + ' se agregó al directorio.');
      S.selected = np.id;
    }
    close();
    rerender();
  };
  const input = (id: string, label: string, props: Record<string, unknown>, span = false) => (
    <div className={'field' + (span ? ' span-all' : '')}>
      <label className="field__label" htmlFor={id}>{label}</label>
      <input className="input" id={id} onInput={() => clear(id)} {...props} {...err(errors, id)} />
      <FieldError errors={errors} id={id} />
    </div>
  );
  const select = (id: string, label: string, children: React.ReactNode, props: Record<string, unknown>) => (
    <div className="field">
      <label className="field__label" htmlFor={id}>{label}</label>
      <select className="select" id={id} onChange={() => clear(id)} {...props} {...err(errors, id)}>{children}</select>
      <FieldError errors={errors} id={id} />
    </div>
  );
  return (
    <>
      <h2 id="dialog-title">{person ? 'Editar expediente' : 'Agregar persona'}</h2>
      <p className="lead">{person ? `Actualiza los datos de ${p.name}.` : 'Registra a un cliente o inquilino y asígnale una casa y un broker.'} Los campos con * son obligatorios.</p>
      <form id="person-form" noValidate onSubmit={onSubmit}>
        <div className="form-grid">
          {input('pf-name', 'Nombre completo *', { required: true, defaultValue: p.name, autoComplete: 'off' }, true)}
          {input('pf-email', 'Correo electrónico *', { type: 'email', required: true, defaultValue: p.email })}
          {input('pf-phone', 'Teléfono *', { type: 'tel', required: true, defaultValue: p.phone, placeholder: '998 000 0000' })}
          {select('pf-type', 'Tipo *', <Options list={[['cliente', 'Cliente'], ['inquilino', 'Inquilino o inquilina']]} />, { required: true, defaultValue: p.type })}
          {select('pf-follow', 'Seguimiento *', <Options list={Object.keys(Z.FOLLOW)} />, { required: true, defaultValue: p.follow })}
          {select('pf-prop', 'Propiedad de interés *', <Options list={D.properties.map((x): [string, string] => [x.id, x.name + ' · ' + x.id])} placeholder="Elige una casa" />, {
            required: true, defaultValue: p.property,
            // La casa elegida trae a su broker
            onChange: (e: React.ChangeEvent<HTMLSelectElement>) => { clear('pf-prop'); const pr = prop(e.target.value); if (pr) setBrokerId(pr.broker); },
          })}
          {select('pf-broker', 'Broker *', <Options list={brokerOptions(D.brokers, brokerId)} placeholder="Elige un broker" />, { required: true, value: brokerId, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => { clear('pf-broker'); setBrokerId(e.target.value); } })}
          {select('pf-op', 'Operación', <Options list={['Renta', 'Compra']} />, { defaultValue: p.op })}
          {input('pf-budget', 'Presupuesto', { defaultValue: p.budget, placeholder: '$30,000 MXN / mes' })}
          {input('pf-needs', 'Lo que busca', { defaultValue: p.needs, placeholder: '3 recámaras · 2 personas · 1 perro pequeño' }, true)}
          {input('pf-job', 'Ocupación y nacionalidad', { defaultValue: p.job, placeholder: 'Diseño de interiores · Nacionalidad mexicana' }, true)}
        </div>
        <div className="dialog__actions">
          <button className="btn btn--secondary" type="button" onClick={close}>Cancelar</button>
          <button className="btn" type="submit">{person ? 'Guardar expediente' : 'Agregar persona'}</button>
        </div>
      </form>
    </>
  );
}

/** Módulo 3 · Clientes e inquilinos */
export function People() {
  const D = useStore();
  const S = viewState.people;
  const { toast, open, confirm } = useOverlay();
  const detailRef = useRef<HTMLDivElement>(null);
  const focusDetail = useRef(false);
  useUrlParams((p) => { const id = p.get('persona'); if (id) S.selected = id; });

  useEffect(() => {
    if (!focusDetail.current) return;
    focusDetail.current = false;
    detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    detailRef.current?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  });

  const people = D.people;
  const clients = people.filter((p) => p.type === 'cliente').length;
  const tenants = people.filter((p) => p.type === 'inquilino');
  const byProp: Record<string, number> = {};
  tenants.forEach((p) => { if (p.follow === 'Contrato vigente') byProp[p.property] = (byProp[p.property] || 0) + 1; });
  const shared = Object.values(byProp).filter((n) => n > 1).length;
  const up = upcoming();
  const upConf = up.filter((a) => a.status === 'confirmada').length;

  const q = norm(S.q);
  const list = people.filter((p) =>
    (S.tab === 'todas' || p.type === S.tab) && (!S.follow || p.follow === S.follow) && (!S.broker || p.broker === S.broker) &&
    (!q || norm(p.name + ' ' + p.email + ' ' + p.phone).includes(q) || p.phone.replace(/\D/g, '').includes(S.q.replace(/\D/g, '') || '¬')));

  const personForm = (p: Person | null) => open((close) => <PersonForm person={p} close={close} />, { wide: true });
  const deletePerson = (p: Person) => {
    const linked = upcoming((a) => a.person === p.id);
    const pr = prop(p.property);
    confirm({
      title: `¿Eliminar a ${p.name}?`,
      lead: 'Su expediente dejará de aparecer en el directorio. Esta acción no se puede deshacer.',
      item: (
        <div className="dialog__item">
          <span className="avatar" aria-hidden="true">{p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
          <div><strong>{p.name}</strong><span>{typeLabel(p)} · {pr ? pr.name : 'Sin propiedad'}</span><span>{p.email}</span></div>
        </div>
      ),
      callout: linked.length ? (
        <div className="callout"><strong>Tiene {linked.length === 1 ? 'una visita próxima' : linked.length + ' visitas próximas'}</strong>{prop(linked[0].property)?.name ?? ''} · {dateShort(linked[0].date)}, {linked[0].start} h. Se {plural(linked.length, 'cancelará', 'cancelarán')} y {plural(linked.length, 'quedará', 'quedarán')} en el historial.</div>
      ) : null,
      check: linked.length ? 'Entiendo que se eliminará el expediente y se cancelarán sus visitas.' : null,
      cancel: 'Conservar expediente', confirm: 'Sí, eliminar',
      onConfirm: () => {
        linked.forEach((a) => (a.status = 'cancelada'));
        Data.people = Data.people.filter((x) => x.id !== p.id);
        if (S.selected === p.id) S.selected = Data.people[0]?.id ?? null;
        log('Lucía eliminó el expediente de ' + p.name + '.');
        toast('Se eliminó el expediente de ' + p.name + '.');
        rerender();
      },
    });
  };
  const exportCsv = () => {
    const rows: string[][] = [['Nombre', 'Correo', 'Teléfono', 'Tipo', 'Propiedad', 'Broker', 'Seguimiento', 'Presupuesto']];
    D.people.forEach((p) => rows.push([p.name, p.email, p.phone, typeLabel(p), prop(p.property)?.name ?? '', broker(p.broker).name, p.follow, p.budget]));
    downloadCSV('zugar-clientes-e-inquilinos.csv', rows);
    toast('Se descargó zugar-clientes-e-inquilinos.csv.');
  };

  const sel = people.find((x) => x.id === S.selected);
  const a = sel ? nextFor(sel) : undefined;
  const pr = sel ? (a ? prop(a.property) : prop(sel.property)) : undefined;

  return (
    <>
      <Crumbs items={[['Administración', '/resumen'], ['Clientes e inquilinos']]} />
      <PageHead title="Personas, no expedientes." sub="Contactos, intereses y contratos en un mismo lugar."
        actions={<><button className="btn btn--secondary" type="button" onClick={exportCsv}><Icon id="download" />Exportar</button><button className="btn" type="button" onClick={() => personForm(null)}><Icon id="plus" />Agregar persona</button></>} />
      <div className="metrics">
        <Metric label="Total de personas" value={people.length} note="Directorio actualizado" />
        <Metric label="Clientes" value={clients} note="Buscan comprar o rentar" />
        <Metric label="Inquilinos" value={tenants.length} note={shared ? `${shared} ${plural(shared, 'contrato compartido vigente', 'contratos compartidos vigentes')}` : 'Contratos individuales'} />
        <Metric label="Visitas próximas" value={up.length} note={`${upConf} ${plural(upConf, 'confirmada', 'confirmadas')} · ${up.length - upConf} ${plural(up.length - upConf, 'pendiente', 'pendientes')}`} />
      </div>
      <div id="pp-tabs">
        <Tabs name="pp" label="Filtrar por tipo" selected={S.tab} onSelect={(v) => { S.tab = v; rerender(); }}
          items={[['todas', 'Todas las personas · ' + people.length], ['cliente', 'Clientes · ' + clients], ['inquilino', 'Inquilinos · ' + tenants.length]]} />
      </div>
      <div className="filters filters--3" role="search" aria-label="Filtrar personas">
        <div className="field"><label className="field__label" htmlFor="pp-q">Buscar contacto</label><input className="input input-search" id="pp-q" type="search" placeholder="Nombre, correo o teléfono" defaultValue={S.q} onChange={(e) => { S.q = e.target.value; rerender(); }} /></div>
        <div className="field"><label className="field__label" htmlFor="pp-follow">Estado de seguimiento</label>
          <select className="select" id="pp-follow" value={S.follow} onChange={(e) => { S.follow = e.target.value; rerender(); }}><Options list={Object.keys(Z.FOLLOW)} placeholder="Todos" /></select></div>
        <div className="field"><label className="field__label" htmlFor="pp-broker">Broker</label>
          <select className="select" id="pp-broker" value={S.broker} onChange={(e) => { S.broker = e.target.value; rerender(); }}><Options list={brokerOptions(D.brokers, S.broker)} placeholder="Todos los brokers" /></select></div>
      </div>
      <div className="table-wrap" style={{ marginTop: '1.25rem' }}>
        <table className="table">
          <caption className="sr-only">Directorio de clientes e inquilinos</caption>
          <thead><tr><th scope="col">Persona / Contacto</th><th scope="col">Tipo</th><th scope="col">Propiedad</th><th scope="col">Broker</th><th scope="col">Seguimiento</th><th scope="col">Acciones</th></tr></thead>
          <tbody id="pp-rows">
            {list.length ? list.map((p) => {
              const ppr = prop(p.property);
              const view = () => { S.selected = p.id; focusDetail.current = true; rerender(); };
              return (
                <tr key={p.id} className={p.id === S.selected ? 'is-selected' : ''}>
                  <td><button className="link strong" type="button" style={{ color: 'var(--marino)' }} onClick={view}>{p.name}</button><span className="sub">{p.email} · {p.phone}</span></td>
                  <td><Badge label={typeLabel(p)} tone={p.type === 'cliente' ? 'info' : 'ok'} /></td>
                  <td>{ppr ? <Link to={'/propiedades/' + ppr.id}>{ppr.name}</Link> : <span className="muted">Propiedad eliminada</span>}</td>
                  <td>{broker(p.broker).name}</td>
                  <td><FollowBadge f={p.follow} /></td>
                  <td><div className="actions">
                    <button className="icon-btn" type="button" aria-label={'Ver expediente de ' + p.name} title="Ver" onClick={view}><Icon id="eye" /></button>
                    <button className="icon-btn" type="button" aria-label={'Editar expediente de ' + p.name} title="Editar" onClick={() => personForm(p)}><Icon id="pencil" /></button>
                    <button className="icon-btn icon-btn--danger" type="button" aria-label={'Eliminar a ' + p.name} title="Eliminar" onClick={() => deletePerson(p)}><Icon id="trash" /></button>
                  </div></td>
                </tr>
              );
            }) : <tr><td colSpan={6} className="table-empty">No encontramos personas con estos filtros.</td></tr>}
          </tbody>
        </table>
      </div>
      <div id="pp-pager"><Pager shown={list.length} total={list.length} noun="personas" /></div>

      <div id="pp-detail" ref={detailRef} style={{ marginTop: '1.5rem' }} aria-live="polite">
        {sel && (
          <div className="grid-2 grid-2--wide-side">
            <section className="card card--pad" aria-labelledby="pd-title">
              <div className="card__head"><h2 className="card__title" id="pd-title" tabIndex={-1}>{sel.name}</h2>
                <button className="link" type="button" onClick={() => personForm(sel)}>Editar expediente <Icon id="arrow" className="icon--sm" /></button></div>
              <div className="profile">
                <div>
                  <Badge label={typeLabel(sel) + ' · ' + sel.op} tone={sel.type === 'cliente' ? 'info' : 'ok'} />
                  <div className="profile__lines">
                    {sel.budget && <p>Presupuesto: {sel.budget}</p>}
                    {sel.needs && <p>{sel.needs}</p>}
                    {sel.job && <p className="muted small">{sel.job}</p>}
                  </div>
                </div>
                <div>
                  {a ? (
                    <>
                      <p className="strong" style={{ fontWeight: 600, color: 'var(--marino)' }}>{pr ? pr.name : ''} · {dateShort(a.date)}, {a.start} h</p>
                      <p className="small muted" style={{ marginTop: '.375rem' }}>{broker(a.broker).name} · Visita {a.kind.toLowerCase()} {Z.APPT_STATUS[a.status].label.toLowerCase()}</p>
                      {a.note && <p className="quote">“{a.note}”</p>}
                      <Link className="btn btn--secondary" to={'/citas?cita=' + a.id}>Ver cita</Link>
                    </>
                  ) : (
                    <>
                      <p className="strong" style={{ fontWeight: 600, color: 'var(--marino)' }}>{pr ? pr.name : 'Sin propiedad asignada'}</p>
                      <p className="small muted" style={{ marginBlock: '.375rem 1rem' }}>Sin visitas próximas.</p>
                      <Link className="btn btn--secondary" to={'/citas?nueva=' + sel.id}>Agendar visita</Link>
                    </>
                  )}
                </div>
              </div>
            </section>
            <section className="card card--pad" aria-label="Datos de contacto">
              <p className="field__label">Correo electrónico</p>
              <p className="input" style={{ marginTop: '.5rem', display: 'flex', alignItems: 'center' }}>{sel.email}</p>
              <p className="small muted" style={{ marginBlock: '.5rem 1rem' }}>Contacto preferido para seguimiento.</p>
              <p className="small">Teléfono · <a href={'tel:+52' + sel.phone.replace(/\D/g, '')}>{sel.phone}</a></p>
              <p style={{ marginTop: '1rem' }}><a className="link" href={'mailto:' + sel.email}>Enviar correo <Icon id="arrow-ur" className="icon--sm" /></a></p>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
