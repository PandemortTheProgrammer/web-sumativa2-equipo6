import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { can, currentSession, roleLabel } from '../auth';
import { useOverlay } from '../components/Overlay';
import { Avatar, Badge, brokerOptions, Cover, Crumbs, err, FieldError, Icon, Options, PageHead, StatusBadge, useErrors, useUrlParams } from '../components/ui';
import { broker, brokerStats, log, norm, opLabel, plural, prop, rerender, upcoming, useStore, viewState, Z, type Broker, type StaffMember } from '../store';

/* Roles que decide el propietario: solo broker, solo administración o ambos */
const ROLE_CHOICES: [string, string, string][] = [
  ['broker', 'Solo broker', 'Atiende sus casas: citas, clientes, pagos y expediente de las casas a su cargo.'],
  ['admin', 'Solo administración', 'Ve todas las casas; corrige y anula pagos, elimina documentos. No recibe casas.'],
  ['both', 'Broker y administración', 'Atiende sus casas y además administra todo el inventario.'],
];
const choiceOf = (roles: string[]) => (roles.includes('admin') && roles.includes('broker') ? 'both' : roles.includes('admin') ? 'admin' : 'broker');
const rolesOf = (choice: string) => (choice === 'both' ? ['broker', 'admin'] : [choice]);

function RoleForm({ m, close }: { m: StaffMember; close: () => void }) {
  const { toast } = useOverlay();
  const [choice, setChoice] = useState(choiceOf(m.roles));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (choice === choiceOf(m.roles)) return close();
    setBusy(true);
    // Cambio local (sin servidor): se actualiza el rol en la lista del personal
    setTimeout(() => {
      if (m.properties > 0 && choice === 'admin') { setError('Reasigna sus casas a otro broker antes de quitarle el rol de broker.'); setBusy(false); return; }
      m.roles = m.roles.includes('owner') ? ['owner', ...rolesOf(choice)] : rolesOf(choice);
      rerender();
      close();
      toast(`${m.name} ahora es: ${ROLE_CHOICES.find((c) => c[0] === choice)![1].toLowerCase()}.`);
    }, 300);
  };
  return (
    <>
      <h2 id="dialog-title">Rol de {m.name}</h2>
      <p className="lead">{m.roles.includes('owner') ? 'Es propietario: conserva todos los permisos y la gestión del personal.' : 'Decide qué puede hacer en el panel.'}</p>
      <form noValidate onSubmit={save}>
        {error && <div className="notice notice--error" role="alert"><Icon id="alert" /><span>{error}</span></div>}
        <fieldset className="stack" style={{ border: 0, padding: 0 }}>
          <legend className="sr-only">Rol</legend>
          {ROLE_CHOICES.map(([v, label, help]) => (
            <label key={v} className="check" style={{ alignItems: 'flex-start' }}>
              <input type="radio" name="role" value={v} checked={choice === v} onChange={() => setChoice(v)} />
              <span><strong>{label}</strong><br /><span className="small muted">{help}</span></span>
            </label>
          ))}
        </fieldset>
        {m.properties > 0 && choice === 'admin' && <div className="callout" style={{ marginTop: '1rem' }}><strong>Tiene {m.properties} {plural(m.properties, 'casa asignada', 'casas asignadas')}</strong>Reasígnalas a otro broker antes de quitarle el rol de broker.</div>}
        <div className="dialog__actions">
          <button className="btn btn--secondary" type="button" onClick={close}>Cancelar</button>
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar rol'}</button>
        </div>
      </form>
    </>
  );
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

/** Alta o edición de un broker (diálogo) */
function BrokerForm({ b, close }: { b: Broker | null; close: () => void }) {
  const D = useStore();
  const { toast } = useOverlay();
  const { errors, check, clear } = useErrors();
  const x = b || { name: '', zones: '', role: '', email: '', phone: '' };
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!check(e.currentTarget)) return;
    const v = (id: string) => (document.getElementById(id) as HTMLInputElement).value.trim();
    const data = { name: v('bf-name'), zones: v('bf-zones'), role: v('bf-role'), email: v('bf-email'), phone: v('bf-phone') };
    if (b) {
      Object.assign(b, data, { initials: initials(data.name) });
      toast('Se actualizó el perfil de ' + b.name + '.');
    } else {
      const nb: Broker = { ...data, initials: initials(data.name), id: norm(data.name).replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36), active: true, photo: '' };
      D.brokers.push(nb);
      log('Lucía agregó a ' + nb.name + ' al equipo de brokers.');
      toast(nb.name + ' ya forma parte del equipo.');
    }
    close();
    rerender();
  };
  const field = (id: string, label: string, props: Record<string, unknown>, span = false) => (
    <div className={'field' + (span ? ' span-all' : '')}>
      <label className="field__label" htmlFor={id}>{label}</label>
      <input className="input" id={id} onInput={() => clear(id)} {...props} {...err(errors, id)} />
      <FieldError errors={errors} id={id} />
    </div>
  );
  return (
    <>
      <h2 id="dialog-title">{b ? 'Editar perfil' : 'Agregar broker'}</h2>
      <p className="lead">{b ? `Actualiza los datos de contacto y zonas de ${b.name}.` : 'Suma a una persona del equipo para asignarle casas y citas.'}</p>
      <form id="broker-form" noValidate onSubmit={onSubmit}>
        <div className="form-grid">
          {field('bf-name', 'Nombre completo *', { required: true, defaultValue: x.name }, true)}
          {field('bf-zones', 'Zonas que atiende *', { required: true, defaultValue: x.zones, placeholder: 'Arbolada · Aqua Residencial' }, true)}
          {field('bf-role', 'Especialidad', { defaultValue: x.role, placeholder: 'Rentas · Arbolada y Aqua' }, true)}
          {field('bf-email', 'Correo electrónico *', { type: 'email', required: true, defaultValue: x.email })}
          {field('bf-phone', 'Teléfono *', { type: 'tel', required: true, defaultValue: x.phone, placeholder: '+52 998 000 0000' })}
        </div>
        <div className="dialog__actions">
          <button className="btn btn--secondary" type="button" onClick={close}>Cancelar</button>
          <button className="btn" type="submit">{b ? 'Guardar perfil' : 'Agregar broker'}</button>
        </div>
      </form>
    </>
  );
}

/** Módulo 4 · Brokers */
export function Brokers() {
  const D = useStore();
  const S = viewState.brokers;
  const { toast, open, confirm } = useOverlay();
  const { errors, check } = useErrors();
  const assignRef = useRef<HTMLSelectElement>(null);
  const focusAssign = useRef(false);

  useUrlParams((p) => { const id = p.get('prop'); if (id && prop(id)) S.prop = id; });
  if (!S.prop || !prop(S.prop)) S.prop = D.properties[0]?.id ?? null;
  const current = S.prop ? prop(S.prop) : undefined;

  useEffect(() => {
    if (!focusAssign.current) return;
    focusAssign.current = false;
    document.getElementById('assign')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    assignRef.current?.focus({ preventScroll: true });
  });

  const brokerForm = (b: Broker | null) => open((close) => <BrokerForm b={b} close={close} />, { wide: true });
  const manageStaff = can('users.manage'); // solo el propietario da de alta, desactiva y asigna roles
  const me = currentSession()?.email.toLowerCase();
  const toggleActive = (b: Broker) => {
    if (!b.active) {
      b.active = true;
      log('Lucía reactivó a ' + b.name + '.');
      toast(b.name + ' está activo de nuevo.');
      return rerender();
    }
    const st = brokerStats(b.id);
    confirm({
      icon: 'user-key', title: `¿Desactivar a ${b.name}?`,
      lead: 'Ya no podrá recibir nuevas casas ni citas. Su historial se conserva y puedes reactivarlo cuando quieras.',
      callout: st.props || st.next ? (
        <div className="callout"><strong>Tiene trabajo asignado</strong>{st.props} {plural(st.props, 'propiedad', 'propiedades')} y {st.next} {plural(st.next, 'cita próxima', 'citas próximas')}. Seguirán a su nombre hasta que las reasignes en «Asignación por propiedad».</div>
      ) : null,
      cancel: 'Mantener activo', confirm: 'Sí, desactivar',
      onConfirm: () => {
        b.active = false;
        log('Lucía desactivó a ' + b.name + '.');
        toast(b.name + ' quedó inactivo.');
        rerender();
      },
    });
  };

  const q = norm(S.q);
  const list = D.properties.filter((p) => (!S.broker || p.broker === S.broker) && (!S.status || p.status === S.status) && (!q || norm(p.name + ' ' + p.id).includes(q)));
  const withBroker = D.properties.filter((p) => D.brokers.some((b) => b.id === p.broker)).length;
  const linked = current ? upcoming((a) => a.property === current.id) : [];
  const confirmed = linked.filter((a) => a.status === 'confirmada').length;

  const onAssign = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!current || !check(e.currentTarget)) return;
    const value = assignRef.current!.value;
    if (value === current.broker) return toast(broker(value).name + ' ya es responsable de ' + current.name + '.');
    const moved = upcoming((a) => a.property === current.id);
    moved.forEach((a) => (a.broker = value));
    current.broker = value;
    const nb = broker(value).name;
    log(`Lucía asignó ${current.name} a ${nb}${moved.length ? ` y se reasignaron ${moved.length} ${plural(moved.length, 'cita', 'citas')}.` : '.'}`, current.id);
    toast(current.name + ' ahora está a cargo de ' + nb + '.');
    rerender();
    assignRef.current?.focus();
  };

  return (
    <>
      <Crumbs items={[['Administración', '/resumen'], ['Brokers']]} />
      <PageHead title="Un equipo cerca de cada casa." sub="Administra los perfiles y asigna un responsable a cada propiedad."
        actions={manageStaff ? <button className="btn" type="button" onClick={() => brokerForm(null)}><Icon id="plus" />Agregar broker</button> : undefined} />
      <div className="broker-cards">
        {D.brokers.map((b) => {
          const st = brokerStats(b.id);
          const sel = current?.broker === b.id;
          return (
            <article key={b.id} className={'card broker-card' + (sel ? ' card--selected' : '') + (b.active ? '' : ' is-inactive')} aria-label={b.name + (sel && current ? ', responsable de ' + current.name : '')}>
              <div className="broker-card__top"><Avatar b={b} className="avatar--lg" /><div><strong>{b.name}</strong>{b.active ? <Badge label="Activo" tone="ok" /> : <Badge label="Inactivo" tone="gris" />}</div></div>
              <dl>
                <div><dt className="sr-only">Zonas</dt><dd>{b.zones}</dd></div>
                <div><dt className="sr-only">Correo</dt><dd><a href={'mailto:' + b.email} style={{ color: 'inherit' }}>{b.email}</a></dd></div>
                <div><dt className="sr-only">Teléfono</dt><dd><a href={'tel:' + b.phone.replace(/\s/g, '')} style={{ color: 'inherit' }}>{b.phone}</a></dd></div>
              </dl>
              <p className="broker-card__sum">{st.props} {plural(st.props, 'propiedad', 'propiedades')} · {st.next ? `${st.next} ${plural(st.next, 'próxima cita', 'próximas citas')}` : 'Sin citas próximas'}</p>
              {manageStaff && (
                <div className="broker-card__actions">
                  <button className="link" type="button" onClick={() => brokerForm(b)}>Editar perfil</button>
                  <button className="link link--muted" type="button" onClick={() => toggleActive(b)}>{b.active ? 'Desactivar' : 'Activar'}</button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {manageStaff && D.staff.length > 0 && (
        <section aria-labelledby="roles-title" style={{ marginBottom: '2rem' }}>
          <div className="section-head"><h2 id="roles-title">Equipo y roles</h2><span className="small muted">Solo el propietario decide quién es broker, administración o ambos</span></div>
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Roles del personal</caption>
              <thead><tr><th scope="col">Persona</th><th scope="col">Rol</th><th scope="col">Casas</th><th scope="col">Estado</th><th scope="col">Administrar</th></tr></thead>
              <tbody>
                {D.staff.map((m) => (
                  <tr key={m.id}>
                    <td><span className="strong">{m.name}</span><span className="sub">{m.email}</span></td>
                    <td>{roleLabel(m.roles)}{m.roles.includes('owner') && m.roles.includes('broker') ? ' · broker' : ''}</td>
                    <td>{m.properties}</td>
                    <td>{m.active ? <Badge label="Activo" tone="ok" /> : <Badge label="Inactivo" tone="gris" />}</td>
                    <td>{m.roles.includes('owner') && m.email.toLowerCase() === me
                      ? <span className="sub">Tu cuenta</span>
                      : <button className="link" type="button" aria-label={'Cambiar rol de ' + m.name} onClick={() => open((close) => <RoleForm m={m} close={close} />)}>Cambiar rol <Icon id="arrow" className="icon--sm" /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section aria-labelledby="as-title">
        <div className="section-head"><h2 id="as-title">Asignación por propiedad</h2><span className="small muted">{withBroker} de {D.properties.length} casas con responsable</span></div>
        <div className="filters filters--3" role="search" aria-label="Filtrar asignaciones">
          <div className="field"><label className="field__label" htmlFor="bk-q">Buscar casa</label><input className="input input-search" id="bk-q" type="search" placeholder="Nombre o clave" defaultValue={S.q} onChange={(e) => { S.q = e.target.value; rerender(); }} /></div>
          <div className="field"><label className="field__label" htmlFor="bk-broker">Broker asignado</label>
            <select className="select" id="bk-broker" value={S.broker} onChange={(e) => { S.broker = e.target.value; rerender(); }}><Options list={brokerOptions(D.brokers, S.broker)} placeholder="Todos los brokers" /></select></div>
          <div className="field"><label className="field__label" htmlFor="bk-status">Disponibilidad</label>
            <select className="select" id="bk-status" value={S.status} onChange={(e) => { S.status = e.target.value; rerender(); }}><Options list={Object.keys(Z.STATUS).map((k): [string, string] => [k, Z.STATUS[k].label])} placeholder="Todos los estados" /></select></div>
        </div>
        <div className="table-wrap" style={{ marginTop: '1.25rem' }}>
          <table className="table">
            <caption className="sr-only">Broker responsable de cada propiedad</caption>
            <thead><tr><th scope="col">Propiedad</th><th scope="col">Operación</th><th scope="col">Broker responsable</th><th scope="col">Estado</th><th scope="col">Administrar</th></tr></thead>
            <tbody id="bk-rows">
              {list.length ? list.map((p) => (
                <tr key={p.id} className={p.id === S.prop ? 'is-selected' : ''}>
                  <td><div className="thumb-cell"><Cover p={p} className="photo--thumb" alt="" /><div><Link className="strong" to={'/propiedades/' + p.id}>{p.name}</Link><span className="sub">{p.id} · {p.zone}</span></div></div></td>
                  <td>{opLabel(p)}</td>
                  <td className="strong">{broker(p.broker).name}</td>
                  <td><StatusBadge s={p.status} /></td>
                  <td><button className="link" type="button" aria-label={'Cambiar broker de ' + p.name} onClick={() => { S.prop = p.id; focusAssign.current = true; rerender(); }}>Cambiar broker <Icon id="arrow" className="icon--sm" /></button></td>
                </tr>
              )) : <tr><td colSpan={5} className="table-empty">Ninguna casa coincide con estos filtros.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {current && (
        <section className="card card--pad assign" id="assign" aria-labelledby="ch-title">
          <h2 className="card__title" id="ch-title" style={{ marginBottom: '1.25rem' }}>Cambiar responsable · {current.name}</h2>
          <form id="assign-form" noValidate onSubmit={onAssign} key={current.id}>
            <div className="assign__row">
              <div className="assign__current">
                <span>Responsable actual</span><strong>{broker(current.broker).name}</strong>
                <span>{linked.length ? `${linked.length} ${plural(linked.length, 'cita', 'citas')}${confirmed === linked.length ? ' ' + plural(linked.length, 'confirmada', 'confirmadas') : ''} ${plural(linked.length, 'vinculada', 'vinculadas')}` : 'Sin citas próximas'}</span>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="as-broker">Broker responsable *</label>
                <select ref={assignRef} className="select" id="as-broker" required defaultValue={current.broker} {...err(errors, 'as-broker')}><Options list={brokerOptions(D.brokers, current.broker)} /></select>
                <FieldError errors={errors} id="as-broker" />
              </div>
              <button className="btn" type="submit">Guardar asignación</button>
            </div>
            <p className="form-note">Al cambiar el broker, las próximas citas de esta casa se reasignarán al nuevo responsable. El historial se conserva.</p>
          </form>
        </section>
      )}
    </>
  );
}
