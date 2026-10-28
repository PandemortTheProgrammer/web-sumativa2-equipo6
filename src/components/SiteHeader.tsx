import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Icon } from './Icon';

const LINKS = [
  ['/propiedades', 'Propiedades'],
  ['/contacto', 'Contáctanos'],
  ['/como-trabajamos', 'Cómo trabajamos'],
] as const;

/** Encabezado del sitio. En la portada es claro (light); en las demás páginas, azul marino. */
export function SiteHeader({ light = false }: { light?: boolean }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onResize = () => window.innerWidth > 1080 && setOpen(false);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <header className={`site-header${light ? ' site-header--light' : ''}`}>
      <div className="wrap site-header__inner">
        {/* Logo a color en el encabezado claro; versión blanca sobre el azul marino */}
        <Link className="logo" to="/" aria-label="Zugar Inmobiliaria, ir al inicio">
          <img className="logo__img" src={light ? '/assets/img/logo-zugar-600.png' : '/assets/img/logo-zugar-blanco-1200.png'} alt="Inmobiliaria Zugar" width="600" height="246" />
        </Link>
        {/* El menú móvil usa la casilla oculta del diseño original (los estilos dependen de :checked) */}
        <input type="checkbox" id="menu-toggle" className="menu-toggle" aria-label="Abrir o cerrar el menú" checked={open} onChange={(e) => setOpen(e.target.checked)} />
        <label htmlFor="menu-toggle" className="menu-button" aria-hidden="true">
          <Icon id="menu" className="icon--open" />
          <Icon id="x" className="icon--close" />
        </label>
        <nav className="site-nav" aria-label="Principal">
          <ul className="site-nav__links">
            {LINKS.map(([to, label]) => (
              <li key={to}>
                <Link to={to} aria-current={pathname.startsWith(to === '/propiedades' ? '/propiedad' : to) ? 'page' : undefined}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
