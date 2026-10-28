import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';
import { Sprite } from './Sprite';

/** Estructura común del sitio público: íconos, salto al contenido, encabezado, página y pie. */
export function SiteLayout() {
  const { pathname, hash } = useLocation();

  // Al cambiar de página se empieza arriba; con #ancla, se va a esa sección
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <>
      <Sprite />
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <SiteHeader light={pathname === '/'} />
      <main id="contenido">
        <Outlet />
      </main>
      <SiteFooter />
    </>
  );
}
