import { useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useOverlay } from '../components/Overlay';
import { ApptBadge, Avatar, Badge, brokerOptions, Cover, Crumbs, Icon, Options, PageHead, Pager, Photo, StatusBadge, Tabs, useUrlParams } from '../components/ui';
import {
  broker, D as Data, dateFull, dateShort, downloadCSV, log, money, norm, opLabel, person, plural, priceLabel, prop, rerender, sortAppts, upcoming, useStore, viewState, Z, type Property,
} from '../store';
import { PropertyDossier } from './Dossier';
import { PropertyPayments } from './Payments';

const S = viewState.props;
const specsLine = (p: Property) => `${p.rec} rec. · ${p.banos} baño${p.banos == 1 ? '' : 's'} · ${p.m2} m²`;
const allAmenities = () => {
  const set = Z.AMENITIES.slice();
  Data.properties.forEach((p) => p.amenities.forEach((a) => !set.includes(a) && set.push(a)));
  return set;
};

/** Eliminar una propiedad (confirmación con las citas vinculadas) */
export function useDeleteProperty() {
  const { toast, confirm } = useOverlay();
  return (id: string, after?: () => void) => {
    const p = prop(id);
    if (!p) return;
    const linked = upcoming((a) => a.property === id);
    const b = broker(p.broker);
    const a = linked[0];
    confirm({
      title: `¿Eliminar ${p.name}?`,
      lead: 'La propiedad dejará de aparecer en el inventario y en el catálogo público. Esta acción no se puede deshacer.',
      item: <div className="dialog__item"><Cover p={p} alt="" /><div><strong>{p.name} · {p.id}</strong><span>{p.zone}, Cancún</span><span>{opLabel(p)} · {priceLabel(p)}</span></div></div>,
      callout: a ? (
        <div className="callout">
          <strong>{linked.length === 1 ? `Hay una cita ${a.status === 'confirmada' ? 'confirmada' : 'por confirmar'} vinculada` : `Hay ${linked.length} citas vinculadas`}</strong>
          {person(a.person).name} · {dateShort(a.date)}, {a.start} h{linked.length > 1 ? ` y ${linked.length - 1} más` : ''}. {plural(linked.length, 'La cita se cancelará', 'Las citas se cancelarán')} y {plural(linked.length, 'quedará', 'quedarán')} en el historial. El cliente y {b.name} no se eliminarán.
        </div>
      ) : null,
      check: linked.length ? `Entiendo que se eliminará la propiedad y se cancelará${linked.length === 1 ? ' su próxima cita.' : 'n sus próximas citas.'}` : 'Entiendo que se eliminará la propiedad del inventario.',
      cancel: 'Conservar propiedad', confirm: 'Sí, eliminar propiedad',
      onConfirm: () => {
        linked.forEach((x) => { x.status = 'cancelada'; x.note = (x.note ? x.note + ' ' : '') + 'Cancelada porque la propiedad se retiró del inventario.'; });
        Data.properties = Data.properties.filter((x) => x.id !== id);
        log(`Lucía eliminó ${p.name} (${p.id})${linked.length ? ' y se canceló ' + (linked.length === 1 ? 'su próxima cita.' : 'sus próximas citas.') : '.'}`);
        toast(p.name + ' se eliminó del inventario.');
        if (after) after();
        rerender();
      },
    });
  };
}

/** Módulo 2 · Propiedades: listado */
export function PropertiesList() {
  const D = useStore();
  const { toast } = useOverlay();
  const deleteProperty = useDeleteProperty();
  const counts = (s?: string) => D.properties.filter((p) => !s || p.status === s).length;
  const q = norm(S.q);
  const list = D.properties
    .filter((p) => (S.tab === 'todas' || p.status === S.tab) && (!S.op || p.op === S.op) && (!S.zone || p.zone === S.zone) && (!S.broker || p.broker === S.broker) &&
      (!q || norm(p.name + ' ' + p.id + ' ' + p.address + ' ' + p.zone).includes(q)) && S.amen.every((a) => p.amenities.includes(a)))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const exportCsv = () => {
    const rows: (string | number)[][] = [['Clave', 'Propiedad', 'Zona', 'Dirección', 'Operación', 'Precio (MXN)', 'Recámaras', 'Baños', 'm² construcción', 'Disponibilidad', 'Broker', 'Amenidades']];
    D.properties.forEach((p) => rows.push([p.id, p.name, p.zone, p.address, opLabel(p), p.price, p.rec, p.banos, p.m2, Z.STATUS[p.status]?.label ?? p.status, broker(p.broker).name, p.amenities.join('; ')]));
    downloadCSV('zugar-propiedades.csv', rows);
    toast('Se descargó zugar-propiedades.csv.');
  };
  const set = (k: 'op' | 'zone' | 'broker' | 'q', v: string) => { S[k] = v; rerender(); };

  return (
    <>
      <Crumbs items={[['Administración', '/resumen'], ['Propiedades']]} />
      <PageHead title="Cada casa, al día." sub="Administra tu inventario, disponibilidad y equipo asignado."
        actions={<><button className="btn btn--secondary" type="button" onClick={exportCsv}><Icon id="download" />Exportar</button><Link className="btn" to="/propiedades/nueva"><Icon id="plus" />Nueva propiedad</Link></>} />
      <div id="prop-tabs">
        <Tabs name="prop" label="Filtrar por disponibilidad" selected={S.tab} onSelect={(v) => { S.tab = v; rerender(); }}
          items={[['todas', 'Todas las propiedades · ' + counts()], ['disponible', 'Disponibles · ' + counts('disponible')], ['reservada', 'Reservadas · ' + counts('reservada')], ['rentada', 'Rentadas · ' + counts('rentada')], ['borrador', 'Borradores · ' + counts('borrador')]]} />
      </div>
      <div className="filters" role="search" aria-label="Filtrar propiedades">
        <div className="field"><label className="field__label" htmlFor="f-q">Buscar propiedad</label><input className="input input-search" id="f-q" type="search" placeholder="Nombre, clave o dirección" defaultValue={S.q} onChange={(e) => set('q', e.target.value)} /></div>
        <div className="field"><label className="field__label" htmlFor="f-op">Operación</label><select className="select" id="f-op" value={S.op} onChange={(e) => set('op', e.target.value)}><Options list={[['renta', 'Renta'], ['venta', 'Venta']]} placeholder="Todas" /></select></div>
        <div className="field"><label className="field__label" htmlFor="f-zone">Zona de Cancún</label><select className="select" id="f-zone" value={S.zone} onChange={(e) => set('zone', e.target.value)}><Options list={Z.ZONES} placeholder="Todas las zonas" /></select></div>
        <div className="field"><label className="field__label" htmlFor="f-broker">Broker asignado</label><select className="select" id="f-broker" value={S.broker} onChange={(e) => set('broker', e.target.value)}><Options list={brokerOptions(D.brokers, S.broker)} placeholder="Todos los brokers" /></select></div>
      </div>
      <div className="filters-meta">
        <span id="prop-meta" aria-live="polite">{list.length} {plural(list.length, 'propiedad', 'propiedades')} · Ordenadas por última actualización</span>
        <button className="btn btn--secondary" type="button" aria-expanded={S.more} aria-controls="more-filters" onClick={() => { S.more = !S.more; rerender(); }}>
          <Icon id="sliders" />Más filtros<span id="more-count">{S.amen.length ? ` (${S.amen.length})` : ''}</span>
        </button>
      </div>
      <fieldset className="card card--pad" id="more-filters" style={{ marginBottom: '1rem' }} hidden={!S.more}>
        <legend className="sr-only">Filtrar por amenidades</legend>
        <p className="field__label" style={{ marginBottom: '.75rem' }} aria-hidden="true">Amenidades</p>
        <div className="amenity-grid" style={{ maxWidth: 'none', gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
          {allAmenities().map((a) => (
            <label key={a} className="amenity-option">
              <input type="checkbox" checked={S.amen.includes(a)} onChange={(e) => { S.amen = e.target.checked ? [...S.amen, a] : S.amen.filter((x) => x !== a); rerender(); }} />
              <span>{a}</span>
            </label>
          ))}
        </div>
        <div style={{ marginTop: '1rem' }}><button className="link" type="button" onClick={() => { S.amen = []; rerender(); }}>Quitar filtros de amenidades</button></div>
      </fieldset>
      <div className="table-wrap">
        <table className="table">
          <caption className="sr-only">Inventario de propiedades</caption>
          <thead><tr><th scope="col">Propiedad</th><th scope="col">Operación / Precio</th><th scope="col">Disponibilidad</th><th scope="col">Broker</th><th scope="col">Acciones</th></tr></thead>
          <tbody id="prop-rows">
            {list.length ? list.map((p) => (
              <tr key={p.id}>
                <td><div className="thumb-cell"><Cover p={p} className="photo--thumb" alt="" /><div><Link className="strong" to={'/propiedades/' + p.id}>{p.name}</Link><span className="sub">{p.id} · {p.zone}</span><span className="sub">{specsLine(p)}</span></div></div></td>
                <td><span className="strong">{money(p.price)}</span><span className="sub">{opLabel(p)} · MXN{p.op === 'renta' ? ' / mes' : ''}</span></td>
                <td><StatusBadge s={p.status} /></td>
                <td>{broker(p.broker).name}</td>
                <td><div className="actions">
                  <Link className="icon-btn" to={'/propiedades/' + p.id} aria-label={'Ver ' + p.name} title="Ver"><Icon id="eye" /></Link>
                  <Link className="icon-btn" to={`/propiedades/${p.id}/editar`} aria-label={'Editar ' + p.name} title="Editar"><Icon id="pencil" /></Link>
                  <button className="icon-btn icon-btn--danger" type="button" aria-label={'Eliminar ' + p.name} title="Eliminar" onClick={() => deleteProperty(p.id)}><Icon id="trash" /></button>
                </div></td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="table-empty">No hay propiedades con estos filtros. <button className="link" type="button" onClick={() => { Object.assign(S, { tab: 'todas', q: '', op: '', zone: '', broker: '', amen: [] }); const qi = document.getElementById('f-q') as HTMLInputElement | null; if (qi) qi.value = ''; rerender(); }}>Limpiar filtros</button></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div id="prop-pager"><Pager shown={list.length} total={list.length} noun="propiedades" /></div>
    </>
  );
}

/** Detalle de una propiedad */
export function PropertyDetail() {
  const { id = '' } = useParams();
  const D = useStore();
  const navigate = useNavigate();
  const { toast } = useOverlay();
  const deleteProperty = useDeleteProperty();
  const visFocus = useRef<string | null>(null);
  useEffect(() => {
    if (visFocus.current) { document.querySelector<HTMLElement>(`[data-action="${visFocus.current}"]`)?.focus(); visFocus.current = null; }
  });
  // #/propiedades/ZUG-001?seccion=pagos abre directo esa pestaña (desde la sección Pagos)
  useUrlParams((q) => { const s = q.get('seccion'); if (s && ['expediente', 'pagos'].includes(s)) { S.detailId = id; S.detailTab = s; } });
  const p = prop(id);
  if (!p) {
    return (
      <>
        <Crumbs items={[['Administración', '/resumen'], ['Propiedades', '/propiedades'], [id]]} />
        <PageHead title="Propiedad no encontrada" sub="Es posible que se haya eliminado del inventario." actions={<Link className="btn" to="/propiedades">Volver al listado</Link>} />
      </>
    );
  }
  if (S.detailId !== p.id) { S.detailId = p.id; S.detailTab = 'general'; }
  const b = broker(p.broker);
  const appts = sortAppts(D.appointments.filter((a) => a.property === p.id));
  const next = upcoming((a) => a.property === p.id)[0];
  const hist = D.history[p.id] || [];
  const g = p.photos;
  const visText = {
    publicada: `Visible en el catálogo público desde el ${p.published ? dateFull(p.published).replace(' de 2026', '') : 'día de hoy'}.`,
    pausada: 'Oculta del catálogo público. Las citas y el historial se conservan.',
    borrador: 'Aún no se publica. Completa la información y las fotografías para mostrarla en el catálogo.',
  }[p.visibility];
  const toggleVisibility = (pause: boolean) => {
    p.visibility = pause ? 'pausada' : 'publicada';
    if (!pause && !p.published) p.published = Z.TODAY;
    log(`Lucía ${pause ? 'pausó' : 'reanudó'} la publicación de ${p.name}.`, p.id);
    toast(pause ? p.name + ' ya no aparece en el catálogo público.' : p.name + ' vuelve a estar visible en el catálogo.');
    visFocus.current = pause ? 'resume' : 'pause';
    rerender();
  };
  // La publicación en el sitio: la ficha de esta casa (sin servidor, el listado)
  const publicUrl = p.slug ? '/propiedad/' + p.slug : '/propiedades';

  const panels: Record<string, React.ReactNode> = {
    general: (
      <div className="grid-2">
        <div className="stack">
          <section className="card card--pad" aria-labelledby="g-title">
            <h2 className="card__title" id="g-title">Un espacio para lo que viene</h2>
            <p className="price-xl">{priceLabel(p)}</p>
            <p className="small muted">{p.op === 'renta' ? `Mantenimiento: ${p.maintenance.toLowerCase()} · Depósito: ${money(p.deposit)} MXN` : `Mantenimiento: ${p.maintenance}`}</p>
            <dl className="facts">
              {([[`${p.m2} m²`, 'Construcción'], [`${p.terreno} m²`, 'Terreno'], [p.rec, 'Recámaras'], [p.banos, 'Baños'], [p.est, 'Cochera']] as [string | number, string][]).map(([v, l]) => (
                <div key={l}><dt className="sr-only">{l}</dt><dd><strong>{v}</strong><span>{l}</span></dd></div>
              ))}
            </dl>
            <p>{p.desc}</p>
            <p className="small muted" style={{ marginTop: '1rem' }}>{p.furnished} · {p.age ? `${p.age} año${p.age == 1 ? '' : 's'} de antigüedad` : 'A estrenar'}{p.amenities.includes('Se aceptan mascotas') ? ' · Se aceptan mascotas' : ' · Sin mascotas'}</p>
          </section>
          <section className="card card--pad" aria-labelledby="am-title">
            <div className="card__head"><h2 className="card__title" id="am-title">Amenidades</h2><Link className="link" to={`/propiedades/${p.id}/editar?seccion=amenidades`}>Editar amenidades <Icon id="arrow" className="icon--sm" /></Link></div>
            {p.amenities.length ? <ul className="amenity-list">{p.amenities.map((a) => <li key={a}><Icon id="check" />{a}</li>)}</ul> : <p className="muted">Esta casa todavía no tiene amenidades registradas.</p>}
          </section>
          <section className="card card--pad" aria-labelledby="nc-title">
            <div className="card__head"><h2 className="card__title" id="nc-title">Próxima cita</h2><Link className="link" to={'/citas' + (next ? '?cita=' + next.id : '')}>Ver agenda <Icon id="arrow" className="icon--sm" /></Link></div>
            {next ? (
              <div className="next-appt">
                <p className="next-appt__date">{dateShort(next.date)}<small>{next.start}–{next.end} h</small></p>
                <div><strong className="strong" style={{ color: 'var(--marino)' }}>{person(next.person).name}</strong><p className="small muted">Visita {next.kind.toLowerCase()} · {broker(next.broker).name}</p><div style={{ marginTop: '.5rem' }}><ApptBadge s={next.status} /></div></div>
              </div>
            ) : <p className="muted">No hay visitas programadas para esta casa.</p>}
          </section>
        </div>
        <div className="stack">
          <section className="card card--pad" aria-labelledby="br-title">
            <h2 className="card__title" id="br-title" style={{ marginBottom: '1rem' }}>Broker asignado</h2>
            <div className="person-mini"><Avatar b={b} className="avatar--lg" /><div><strong>{b.name}</strong><span>{b.role || ''}</span></div></div>
            <div className="contact-lines"><a href={'mailto:' + b.email}>{b.email}</a><a href={'tel:' + b.phone.replace(/\s/g, '')}>{b.phone}</a></div>
            <Link className="btn btn--secondary btn--block" to={'/brokers?prop=' + p.id}>Cambiar broker</Link>
          </section>
          <section className="card card--pad" aria-labelledby="pub-title">
            <h2 className="card__title" id="pub-title" style={{ marginBottom: '1rem' }}>Publicación</h2>
            <p className="small muted">Disponibilidad</p>
            <p style={{ margin: '.5rem 0 .75rem' }}><StatusBadge s={p.status} />{p.visibility === 'pausada' && <> <Badge label="Pausada" tone="warn" /></>}</p>
            <p className="small" style={{ marginBottom: '1rem' }}>{visText}</p>
            {p.visibility === 'publicada' ? <button className="btn btn--secondary btn--block" type="button" data-action="pause" onClick={() => toggleVisibility(true)}>Pausar publicación</button>
              : p.visibility === 'pausada' ? <button className="btn btn--secondary btn--block" type="button" data-action="resume" onClick={() => toggleVisibility(false)}>Reanudar publicación</button>
              : <Link className="btn btn--secondary btn--block" to={`/propiedades/${p.id}/editar`}>Completar y publicar</Link>}
          </section>
          <section className="card card--pad card--danger" aria-labelledby="del-title">
            <h2 id="del-title" style={{ fontFamily: 'var(--font-sans)', fontSize: '.875rem', fontWeight: 600, color: 'var(--error-tx)' }}>Eliminar propiedad</h2>
            <p className="small muted" style={{ marginBlock: '.5rem .75rem' }}>Retira esta casa del inventario y del catálogo.</p>
            <button className="link link--danger" type="button" onClick={() => deleteProperty(p.id, () => navigate('/propiedades'))}>Eliminar {p.name} <Icon id="arrow" className="icon--sm" /></button>
          </section>
        </div>
      </div>
    ),
    fotos: (
      <section className="card card--pad" aria-label="Fotografías">
        {g.length ? (
          <div className="photos-grid">{g.map((ph, i) => <figure key={i}><Photo src={ph.src} alt={ph.label + ' de ' + p.name} className="photo--4x3" /><figcaption>{i === 0 ? 'Portada · ' : ''}{ph.label}</figcaption></figure>)}</div>
        ) : <p className="muted">Aún no hay fotografías.</p>}
        <p style={{ marginTop: '1.25rem' }}><Link className="link" to={`/propiedades/${p.id}/editar?seccion=fotografias`}>Administrar fotografías <Icon id="arrow" className="icon--sm" /></Link></p>
      </section>
    ),
    citas: (
      <div className="table-wrap">
        <table className="table">
          <caption className="sr-only">Citas de {p.name}</caption>
          <thead><tr><th scope="col">Fecha / Hora</th><th scope="col">Cliente</th><th scope="col">Broker</th><th scope="col">Estado</th></tr></thead>
          <tbody>
            {appts.length ? appts.map((a) => (
              <tr key={a.id}><td><span className="strong">{dateShort(a.date)}</span><span className="sub">{a.start}–{a.end} h</span></td>
                <td><Link className="strong" to={'/citas?cita=' + a.id}>{person(a.person).name}</Link><span className="sub">{a.id}</span></td>
                <td>{broker(a.broker).name}</td><td><ApptBadge s={a.status} /></td></tr>
            )) : <tr><td colSpan={4} className="table-empty">Sin citas registradas.</td></tr>}
          </tbody>
        </table>
      </div>
    ),
    expediente: <PropertyDossier propertyId={p.id} />,
    pagos: <PropertyPayments propertyId={p.id} />,
    historial: (
      <section className="card card--pad" aria-label="Historial">
        {hist.length ? <ul className="history">{hist.map((h, i) => <li key={i}><time>{h.when}</time><span>{h.text}</span></li>)}</ul> : <p className="muted">Sin movimientos registrados.</p>}
      </section>
    ),
  };

  return (
    <>
      <Crumbs items={[['Administración', '/resumen'], ['Propiedades', '/propiedades'], [p.id]]} />
      <PageHead title={p.name} sub={`${p.zone}, Cancún · ${p.street} · ${p.id}`}
        actions={<><a className="btn btn--secondary" href={publicUrl} target="_blank" rel="noopener">Ver publicación <Icon id="arrow-ur" className="icon--sm" /></a><Link className="btn" to={`/propiedades/${p.id}/editar`}>Editar propiedad</Link></>} />
      <div className="status-line">
        <span className="badge badge--marino">Casa en {opLabel(p).toLowerCase()}</span><StatusBadge s={p.status} />
        <span>{p.published ? `Publicada el ${dateShort(p.published)} 2026 · ` : 'Sin publicar · '}Actualizada {p.updated.charAt(0).toLowerCase() + p.updated.slice(1)}</span>
      </div>
      <div className="gallery">{[0, 1, 2].map((i) => <Photo key={i} src={g[i]?.src ?? ''} alt={g[i] ? g[i].label + ' de ' + p.name : ''} />)}</div>
      <Tabs name="det" label="Secciones de la propiedad" controls="det-panel" selected={S.detailTab} onSelect={(v) => { S.detailTab = v; rerender(); }}
        items={[['general', 'Información general'], ['fotos', 'Fotografías · ' + g.length], ['citas', 'Citas · ' + appts.length], ['expediente', 'Expediente'], ['pagos', 'Pagos'], ['historial', 'Historial']]} />
      <div id="det-panel" role="tabpanel" aria-labelledby={'tab-det-' + S.detailTab}>{panels[S.detailTab]}</div>
    </>
  );
}
