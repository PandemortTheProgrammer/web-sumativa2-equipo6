import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { fichaOf, inPlace, photoOf, priceUnit, type House } from '../lib/catalog';
import { money } from '../lib/format';
import { Icon } from './Icon';

/** Lo que busca la persona (rentar o comprar): sirve para proponerle casas del inventario. */
export interface Wish {
  op: 'renta' | 'venta';
  min: number | null;
  max: number | null;
  rec: string;
  pets: boolean;
  zone?: string;
  /** Casa que ya eligió (no se vuelve a proponer) */
  slug?: string;
}

/**
 * Casas del inventario que encajan: misma operación, dentro del presupuesto (hasta +15 % del máximo),
 * recámaras, mascotas y, si la escribió, la zona. Las más cercanas al presupuesto primero.
 */
export function matchHouses(houses: House[], w: Wish, max = 3): House[] {
  const rec = Number(w.rec) || 0;
  const target = w.max ?? w.min ?? 0;
  const pick = (useZone: boolean) =>
    houses.filter((h) => h.op === w.op && h.slug !== w.slug && (!w.max || h.price <= w.max * 1.15) && (!w.min || h.price >= w.min * 0.85) &&
      h.rec >= rec && (!w.pets || h.pets) && (!useZone || !w.zone || inPlace(h, w.zone)));
  // Si en esa zona no hay ninguna, se proponen las que encajan en lo demás
  const list = pick(true).length ? pick(true) : pick(false);
  return list.sort((a, b) => Math.abs(a.price - target) - Math.abs(b.price - target)).slice(0, max);
}

/** Tarjeta compacta de una casa sugerida: foto, precio, datos y enlace a su ficha. */
function MatchCard({ h }: { h: House }) {
  return (
    <Link className="match-card" to={fichaOf(h)}>
      <span className="match-card__photo"><img src={photoOf(h)} alt="" loading="lazy" /></span>
      <span className="match-card__body">
        <span className="match-card__price"><strong>{money(h.price)}</strong> {priceUnit(h)}</span>
        <span className="match-card__name">{h.name}</span>
        <span className="match-card__meta">{h.zona} · {h.rec} rec. · {h.banos} baño{h.banos === 1 ? '' : 's'}{h.m2 ? ` · ${h.m2} m²` : ''}</span>
        <span className="match-card__meta">{h.pets ? 'Acepta mascotas' : 'Sin mascotas'}</span>
        <span className="match-card__cta">Ver la casa <Icon id="arrow" size="sm" /></span>
      </span>
    </Link>
  );
}

/**
 * Confirmación centrada después de enviar una solicitud: folio, qué sigue, casas que encajan
 * y, si no hay ninguna, «te la conseguimos».
 */
export function LeadDone({ title, text, folio, houses, wish, email, onReset }: {
  title: string; text: string; folio: string; houses: House[]; wish?: Wish; email: string; account: 'created' | 'existing' | null; onReset: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const matches = wish ? matchHouses(houses, wish) : [];
  return (
    <div className="lead-done">
      <div className="alert alert-success" role="status" tabIndex={-1} ref={ref}>
        <Icon id="check-c" />
        <div><strong>{title}</strong>{text} Tu folio es <b>{folio}</b>.</div>
      </div>

      <section className="lead-done__account" aria-labelledby="cuenta-titulo">
        <span className="lead-done__icon" aria-hidden="true"><Icon id="chat" /></span>
        <h3 id="cuenta-titulo">Tu asesor ya tiene tu solicitud</h3>
        <p>Te escribiremos a <b>{email}</b> en menos de un día hábil para proponerte casas y acordar una visita. Guarda tu folio por si nos llamas.</p>
        <Link className="btn btn--lg" to="/propiedades"><Icon id="home" />Ver casas disponibles</Link>
      </section>

      {wish && (matches.length ? (
        <section className="lead-done__matches" aria-labelledby="encajan-titulo">
          <h3 id="encajan-titulo">Mientras tanto, estas casas encajan con lo que buscas</h3>
          <div className="lead-done__cards">{matches.map((h) => <MatchCard key={h.slug} h={h} />)}</div>
        </section>
      ) : (
        <div className="alert alert-info lead-done__none">
          <Icon id="search" />
          <div><strong>Hoy no tenemos una casa así en nuestro inventario, pero te la conseguimos.</strong>Buscaremos entre propietarios y nuestra red una opción con lo que nos pediste y te la propondremos por correo.</div>
        </div>
      ))}

      <button className="link" type="button" onClick={onReset}>Enviar otra solicitud</button>
    </div>
  );
}
