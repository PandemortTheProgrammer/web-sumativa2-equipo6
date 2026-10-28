import { Link } from 'react-router';
import { fichaOf, photoOf, priceUnit, type House } from '../lib/catalog';
import { money } from '../lib/format';
import { useFavorites } from '../lib/favorites';
import { Icon } from './Icon';

/** Tarjeta de casa (inicio, listado y casas similares) */
export function PropertyCard({ house: c, alt }: { house: House; alt?: string }) {
  const { isFavorite, toggle } = useFavorites();
  return (
    <article className="card">
      <div className="card__media">
        <div className="photo">
          <img src={photoOf(c)} alt={alt || `${c.name} en ${c.zona}, Cancún`} loading="lazy" />
        </div>
        <span className="badge badge--light">{c.op === 'renta' ? 'En renta' : 'En venta'}</span>
        <label className="fav">
          <input type="checkbox" aria-label={`Guardar ${c.name} en favoritos`} checked={isFavorite(c.name)} onChange={(e) => toggle(c.name, e.target.checked)} />
          <Icon id="heart" />
        </label>
      </div>
      <div className="card__price">
        <strong>{money(c.price)}</strong>
        <span>{priceUnit(c)}</span>
      </div>
      <div className="card__body">
        <h3 className="card__title">
          <Link className="card__link" to={fichaOf(c)}>{c.name}</Link>
        </h3>
        <p className="card__loc">{c.zona}, Cancún</p>
        <ul className="card__specs">
          <li><Icon id="bed" />{c.rec} rec.</li>
          <li><Icon id="bath" />{c.banos} baño{c.banos === 1 ? '' : 's'}</li>
          <li><Icon id="area" />{c.m2} m²</li>
        </ul>
        <p className="card__pets"><Icon id="paw" />{c.pets ? 'Acepta mascotas' : 'No acepta mascotas'}</p>
        <div className="card__actions">
          <Link className="btn" to={fichaOf(c) + '#contactar'}>Contactar</Link>
          <Link className="btn btn--secondary" to={fichaOf(c)}>Ver casa</Link>
        </div>
      </div>
    </article>
  );
}
