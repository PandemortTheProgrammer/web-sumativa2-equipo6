import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router';
import { currentSession, loggedOut, logout } from '../auth';
import { NotificationsBell } from './Notifications';
import { useOverlay } from './Overlay';
import { Icon } from './ui';
import { MENU } from '../../data/pantallas';

/** Carga simulada del prototipo: muestra el estado «Cargando…» antes de los datos */
const DEMO_LOAD_MS = 700;

/** Marco del panel: encabezado, menú lateral y la sección activa. Sin sesión, manda al acceso. */
export function Shell() {
  const session = currentSession();
  const { pathname, search } = useLocation();
  const { open, confirm } = useOverlay();
  const [ready, setReady] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  /** Menú lateral en celular y tableta (en escritorio siempre está visible) */
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const userBtn = useRef<HTMLButtonElement>(null);
  const section = pathname.split('/')[1] || 'resumen';

  // Carga simulada: los datos ficticios (src/data/demo.ts) aparecen tras una breve espera
  useEffect(() => {
    const t = setTimeout(() => setReady(true), DEMO_LOAD_MS);
    return () => clearTimeout(t);
  }, []);

  // Al cambiar de sección: se cierra el menú móvil, sube la página y el foco va al título
  const first = useRef(true);
  useEffect(() => {
    setMenuOpen(false);
    if (first.current) { first.current = false; return; }
    window.scrollTo(0, 0);
    document.querySelector<HTMLElement>('#view h1')?.focus({ preventScroll: true });
  }, [pathname]);
  useEffect(() => {
    const h1 = document.querySelector('#view h1');
    document.title = (h1 ? h1.textContent + ' · ' : '') + 'Panel administrativo | Zugar';
  });

  // Menú de usuario: se cierra con Escape o al hacer clic fuera
  useEffect(() => {
    const onClick = (e: MouseEvent) => !(e.target as HTMLElement).closest('.user') && setUserOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (userOpen) { setUserOpen(false); userBtn.current?.focus(); }
      if (menuOpen) { setMenuOpen(false); menuBtn.current?.focus(); }
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); };
  }, [userOpen, menuOpen]);

  // Entró con la contraseña temporal y no ha creado la suya: vuelve al acceso a crearla
  if (session?.mustChange) return <Navigate to="/login" replace />;
  if (!session) {
    if (loggedOut.value) return <Navigate to="/login?salida=1" replace />; // el acceso la apaga al abrir
    return <Navigate to={'/login' + (pathname !== '/' ? '?volver=' + encodeURIComponent(pathname + search) : '')} replace />;
  }

  const exp = new Date(session.exp);
  const askLogout = () =>
    confirm({
      icon: 'arrow-ur', safe: true,
      title: '¿Cerrar sesión?',
      lead: 'Los cambios que hiciste en este prototipo se pierden al recargar la página.',
      cancel: 'Seguir en el panel', confirm: 'Cerrar sesión',
      onConfirm: logout,
    });
  const help = () =>
    open((close) => (
      <>
        <span className="dialog__icon dialog__icon--info"><Icon id="info" className="icon--lg" /></span>
        <h2 id="dialog-title">¿Cómo usar el panel?</h2>
        <p className="lead">Todo lo que cambies aquí se refleja al momento en las demás secciones.</p>
        <ul className="activity">
          <li><strong>Propiedades.</strong> Da de alta casas, edita sus datos, fotos y amenidades, o pausa su publicación.</li>
          <li><strong>Clientes e inquilinos.</strong> Consulta el expediente de cada persona y su próxima visita.</li>
          <li><strong>Brokers.</strong> Asigna un responsable a cada casa; sus próximas citas se reasignan solas.</li>
          <li><strong>Citas.</strong> Confirma, reprograma o cancela visitas desde la agenda semanal.</li>
          <li><strong>Solicitudes.</strong> Lo que piden en el sitio público, en la app o por teléfono. Contesta, propón casas y agenda la cita.</li>
          <li><strong>Pagos y expediente.</strong> En cada casa, pestañas «Expediente» y «Pagos». Lo que puedes hacer depende de tu rol: el broker registra pagos y sube documentos de sus casas; administración además corrige o anula pagos y elimina documentos.</li>
        </ul>
        <p className="small muted" style={{ marginTop: '1rem' }}>Prototipo sin servidor: los datos son ficticios y se restablecen al recargar la página. Soporte: soporte@zugar.example</p>
        <div className="dialog__actions"><button className="btn" type="button" onClick={close}>Entendido</button></div>
      </>
    ));

  return (
    <>
      <a className="skip-link" href="#view">Saltar al contenido</a>
      <header className="topbar">
        {/* Botón «Menú»: solo en celular y tableta (lg:hidden). Abre el menú lateral como panel deslizable. */}
        <button ref={menuBtn} type="button" className="lg:hidden inline-flex items-center gap-2 min-h-10 px-3 rounded-lg border border-white/50 text-white font-semibold text-sm hover:bg-white/10"
          aria-expanded={menuOpen} aria-controls="menu-lateral" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setMenuOpen(!menuOpen)}>
          <svg className="icon" aria-hidden="true" viewBox="0 0 24 24"><path d={menuOpen ? 'M6 6l12 12M18 6 6 18' : 'M4 7h16M4 12h16M4 17h16'} /></svg>
          <span className="hidden sm:inline" aria-hidden="true">{menuOpen ? 'Cerrar' : 'Menú'}</span>
        </button>
        <Link className="brand" to="/resumen" aria-label="Zugar administración, ir al resumen">
          <img className="brand__logo" src="/assets/img/logo-zugar-blanco-1200.png" alt="Inmobiliaria Zugar" width="1200" height="492" />
          <span className="brand__tag">Administración · Cancún</span>
        </Link>
        <nav className="topnav" aria-label="Accesos generales">
          {/* En celular estos accesos pasan al menú lateral (hidden lg:inline-flex) */}
          <Link className="hidden xl:inline-flex" to="/resumen" aria-current="page">Panel administrativo</Link>
          <a className="hidden lg:inline-flex" href="/" target="_blank" rel="noopener">Ver sitio público <Icon id="arrow-ur" className="icon--sm" /></a>
          <a className="hidden lg:inline-flex" href="#" onClick={(e) => { e.preventDefault(); help(); }}>Ayuda</a>
          <NotificationsBell />
          <div className="user">
            <button ref={userBtn} className="user__btn" type="button" aria-expanded={userOpen} aria-controls="user-menu" id="user-btn" onClick={(e) => { e.stopPropagation(); setUserOpen(!userOpen); }}>
              <span className="md:hidden" aria-hidden="true">{session.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
              <span className="hidden md:inline">{session.name} · {session.role}</span>
              <span className="md:hidden sr-only">{session.name}, menú de usuario</span>
            </button>
            <div className="user__menu" id="user-menu" hidden={!userOpen}>
              <strong id="user-name">{session.name}</strong>
              <p id="user-meta">{session.role} · {session.email}</p>
              <hr />
              <p id="user-exp">Tu sesión vence a las {String(exp.getHours()).padStart(2, '0')}:{String(exp.getMinutes()).padStart(2, '0')} h.</p>
              <button className="btn btn--secondary btn--sm" type="button" onClick={askLogout}>Cerrar sesión</button>
            </div>
          </div>
        </nav>
      </header>
      <div className="shell">
        {menuOpen && <div className="sidebar-backdrop" aria-hidden="true" onClick={() => setMenuOpen(false)} />}
        <aside className={'sidebar' + (menuOpen ? ' is-open' : '')} id="menu-lateral">
          <p className="sidebar__label" id="menu-label">Gestión inmobiliaria</p>
          <nav aria-labelledby="menu-label">
            <ul>
              {MENU.map((m) => (
                <li key={m.id}><Link to={'/' + m.seccion} aria-current={section === m.seccion ? 'page' : undefined} data-pantalla={m.id}><Icon id={m.icono} />{m.texto}</Link></li>
              ))}
            </ul>
          </nav>
          {/* Accesos generales dentro del menú en celular y tableta */}
          <ul className="lg:hidden mt-4 pt-4 border-t border-borde grid gap-1 text-sm">
            <li><a className="flex items-center gap-2 min-h-11 px-3 rounded-lg text-texto hover:bg-fondo" href="/" target="_blank" rel="noopener">Ver sitio público <Icon id="arrow-ur" className="icon--sm" /></a></li>
            <li><button type="button" className="flex w-full items-center gap-2 min-h-11 px-3 rounded-lg text-texto hover:bg-fondo" onClick={() => { setMenuOpen(false); help(); }}>Ayuda</button></li>
          </ul>
          <div className="sidebar__foot">
            <p>Casas para vivir Cancún.</p>
            <p>Equipo local · Octubre 2026</p>
            <p><span className="badge badge--gris">Prototipo · datos ficticios</span></p>
          </div>
        </aside>
        <div className="main">
          <main className="view" id="view" tabIndex={-1}>
            {ready ? <Outlet /> : <LoadingView />}
          </main>
          <footer className="footer">
            <span>© 2026 Zugar · Administración</span>
            <span>Prototipo · Datos ilustrativos</span>
          </footer>
        </div>
      </div>
    </>
  );
}

/** Estado de carga: esqueleto gris con mensaje para lectores de pantalla */
function LoadingView() {
  return (
    <div role="status" aria-live="polite" className="grid gap-5">
      <span className="sr-only">Cargando datos de Zugar…</span>
      <div className="h-4 w-40 rounded bg-borde animate-pulse" />
      <div className="h-9 w-72 max-w-full rounded bg-borde animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl border border-borde bg-white animate-pulse" />)}
      </div>
      <div className="h-64 rounded-xl border border-borde bg-white animate-pulse" />
      <p className="text-sm text-texto-suave" aria-hidden="true">Cargando datos de Zugar…</p>
    </div>
  );
}
