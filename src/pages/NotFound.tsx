import { Link } from 'react-router';
import { usePageTitle } from '../lib/usePageTitle';

/** Dirección que no existe en el sitio */
export function NotFound() {
  usePageTitle('Página no encontrada | Zugar Inmobiliaria');
  return (
    <section className="section">
      <div className="wrap">
        <span className="eyebrow">Error 404</span>
        <h1 className="text-(length:--fs-2xl)">No encontramos esta página</h1>
        <p className="lead mt-3">Puede que el enlace haya cambiado. Desde aquí puedes seguir buscando tu próxima casa.</p>
        <p className="mt-6 flex flex-wrap gap-3">
          <Link className="btn" to="/propiedades">Ver casas</Link>
          <Link className="btn btn--secondary" to="/">Ir al inicio</Link>
        </p>
      </div>
    </section>
  );
}
