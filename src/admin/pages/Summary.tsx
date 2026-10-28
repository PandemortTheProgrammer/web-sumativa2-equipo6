import { Link, useNavigate } from 'react-router';
import { useOverlay } from '../components/Overlay';
import { ApptBadge, Cover, Crumbs, Icon, Metric, PageHead } from '../components/ui';
import { broker, dateShort, downloadCSV, opLabel, person, plural, priceLabel, prop, upcoming, useStore, Z } from '../store';

/** Módulo 1 · Resumen */
export function Summary() {
  const D = useStore();
  const navigate = useNavigate();
  const { toast } = useOverlay();
  const props = D.properties, appts = D.appointments;
  const count = <T,>(list: T[], fn: (x: T) => boolean) => list.filter(fn).length;
  const rent = count(props, (p) => p.op === 'renta');
  const st = (s: string) => count(props, (p) => p.status === s);
  const clients = count(D.people, (p) => p.type === 'cliente');
  const aStatus = (s: string) => count(appts, (a) => a.status === s);
  const next = upcoming().slice(0, 3);
  const drafts = props.filter((p) => p.status === 'borrador');
  const pending = upcoming((a) => a.status === 'por-confirmar');
  const featured = prop('ZUG-001') || props.find((p) => p.status === 'disponible') || props[0];
  const fb = featured ? broker(featured.broker) : null;
  const fNext = featured ? upcoming((a) => a.property === featured.id).length : 0;

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      ['Indicador', 'Valor', 'Detalle'],
      ['Propiedades en cartera', props.length, `${rent} en renta · ${props.length - rent} en venta`],
      ['Casas disponibles', st('disponible'), `${st('reservada')} reservadas · ${st('rentada')} rentadas · ${st('borrador')} borradores`],
      ['Clientes e inquilinos', D.people.length, `${clients} clientes · ${D.people.length - clients} inquilinos`],
      ['Citas esta semana', appts.length, `${aStatus('confirmada')} confirmadas · ${aStatus('por-confirmar')} por confirmar`],
      [], ['Fecha', 'Hora', 'Cliente', 'Propiedad', 'Broker', 'Estado'],
    ];
    upcoming().forEach((a) => rows.push([dateShort(a.date), a.start, person(a.person).name, prop(a.property)?.name ?? '', broker(a.broker).name, Z.APPT_STATUS[a.status].label]));
    downloadCSV('zugar-resumen-20-26-oct-2026.csv', rows);
    toast('Se descargó zugar-resumen-20-26-oct-2026.csv.');
  };

  return (
    <>
      <Crumbs items={[['Administración', '/resumen'], ['Resumen']]} />
      <PageHead title="Todo en su lugar." sub="Buen día, Lucía. Así se mueve Zugar esta semana."
        actions={<><button className="btn btn--secondary" type="button" onClick={exportCsv}>Exportar resumen</button><Link className="btn" to="/propiedades/nueva">Nueva propiedad</Link></>} />
      <div className="meta-row"><strong>20–26 de octubre de 2026</strong><span>Martes 20 de octubre · Actualizado a las 09:00 h</span></div>

      <div className="metrics">
        <Metric label="Propiedades en cartera" value={props.length} note={`${rent} en renta · ${props.length - rent} en venta`} />
        <Metric label="Casas disponibles" value={st('disponible')} note={`${st('reservada')} ${plural(st('reservada'), 'reservada', 'reservadas')} · ${st('rentada')} ${plural(st('rentada'), 'rentada', 'rentadas')} · ${st('borrador')} ${plural(st('borrador'), 'borrador', 'borradores')}`} />
        <Metric label="Clientes e inquilinos" value={D.people.length} note={`${clients} clientes · ${D.people.length - clients} inquilinos`} />
        <Metric label="Citas esta semana" value={appts.length} note={`${aStatus('confirmada')} confirmadas · ${aStatus('por-confirmar')} por confirmar`} />
      </div>

      <div className="grid-2">
        <div className="stack">
          <section className="card card--pad" aria-labelledby="prox-title">
            <div className="card__head"><h2 className="card__title" id="prox-title">Próximas visitas</h2><Link className="link" to="/citas">Ver agenda <Icon id="arrow" className="icon--sm" /></Link></div>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th scope="col">Fecha</th><th scope="col">Cliente / Propiedad</th><th scope="col">Broker</th></tr></thead>
                <tbody>
                  {next.length ? next.map((a) => {
                    const p = prop(a.property);
                    const to = '/citas?cita=' + a.id;
                    return (
                      <tr key={a.id} data-row-select onClick={(e) => !(e.target as HTMLElement).closest('a') && navigate(to)}>
                        <td><span className="strong">{dateShort(a.date)}</span><span className="sub">{a.start} h</span></td>
                        <td>
                          <Link className="strong" to={to}>{person(a.person).name}</Link>
                          <span className="sub">{p ? p.name + ' · ' + p.zone.replace('Residencial ', '').replace(' Residencial', '') : 'Propiedad eliminada'}</span>
                          <div style={{ marginTop: '.375rem' }}><ApptBadge s={a.status} /></div>
                        </td>
                        <td>{broker(a.broker).name}</td>
                      </tr>
                    );
                  }) : <tr><td colSpan={3} className="table-empty">No hay visitas próximas.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card card--pad" aria-labelledby="att-title">
            <h2 className="card__title" id="att-title" style={{ marginBottom: '.5rem' }}>Requieren tu atención</h2>
            {drafts.length || pending.length ? (
              <ul className="attention">
                {drafts.map((p) => (
                  <li key={p.id}><Icon id="file-edit" /><div><strong>{p.name} está en borrador</strong><p>{p.photos.length ? 'Revisa la información antes de publicar.' : 'Completa las fotografías antes de publicar.'}</p></div>
                    <Link className="link" to={`/propiedades/${p.id}/editar`}>Completar <Icon id="arrow" className="icon--sm" /></Link></li>
                ))}
                {pending.map((a) => (
                  <li key={a.id}><Icon id="cal-clock" /><div><strong>Una visita pendiente de confirmación</strong><p>{person(a.person).name} · {dateShort(a.date)}, {a.start} h</p></div>
                    <Link className="link" to={'/citas?cita=' + a.id}>Revisar <Icon id="arrow" className="icon--sm" /></Link></li>
                ))}
              </ul>
            ) : <p className="muted">Nada pendiente por ahora. Todo en su lugar.</p>}
          </section>
        </div>

        <div className="stack">
          {featured && fb && (
            <section className="feature" aria-label="Propiedad destacada">
              <p className="feature__eyebrow">En tu cartera · {featured.id}</p>
              <div className="feature__card">
                <div className="feature__media"><Cover p={featured} /><span className="badge badge--dorado">En {opLabel(featured).toLowerCase()}</span></div>
                <div className="feature__body">
                  <p className="feature__price">{priceLabel(featured)}</p>
                  <p className="feature__name">{featured.name}</p>
                  <p className="feature__loc">{featured.zone}, Cancún</p>
                  <ul className="specs">
                    <li><Icon id="bed" />{featured.rec}<span className="sr-only"> recámaras</span></li>
                    <li><Icon id="bath" />{featured.banos}<span className="sr-only"> baños</span></li>
                    <li><Icon id="area" />{featured.m2} m²</li>
                  </ul>
                </div>
              </div>
              <div className="feature__foot">
                <span>{fb.name} · {fNext} {plural(fNext, 'próxima visita', 'próximas visitas')}</span>
                <Link to={'/propiedades/' + featured.id}>Administrar propiedad <Icon id="arrow-ur" className="icon--sm" /></Link>
              </div>
            </section>
          )}
          <section className="card card--pad" aria-labelledby="act-title">
            <h2 className="card__title" id="act-title" style={{ marginBottom: '.25rem' }}>Actividad reciente</h2>
            <ul className="activity">{D.activity.slice(0, 4).map((e, i) => <li key={i}><time>{e.when}</time><p>{e.text}</p></li>)}</ul>
          </section>
        </div>
      </div>
    </>
  );
}
