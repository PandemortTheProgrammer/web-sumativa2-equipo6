import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { Link, useParams } from 'react-router';
import { useCatalog } from '../components/CatalogProvider';
import { googleEmbed, googleLink, hasCoords, ZoneMap } from '../components/HouseMap';
import { HouseVisitForm } from '../components/HouseVisitForm';
import { Icon } from '../components/Icon';
import { PropertyCard } from '../components/PropertyCard';
import { useToast } from '../components/Toasts';
import { fetchHouse, type DataError } from '../lib/datos';
import { IMG, photoOf, priceUnit, type House } from '../lib/catalog';
import { useFavorites } from '../lib/favorites';
import { money, toNumber } from '../lib/format';
import { usePageTitle } from '../lib/usePageTitle';

/* Ficha de una casa: /propiedad/:slug (datos ficticios de src/data/casas.ts con carga simulada). */
export function Detail() {
  const { slug = '' } = useParams();
  const { bySlug, houses, loading } = useCatalog();
  // 404 = la casa no existe o ya no está publicada
  const [state, setState] = useState<{ slug: string; house: House | null; status: 'loading' | 'ok' | 'missing' | 'offline' }>({ slug, house: null, status: 'loading' });

  useEffect(() => {
    let alive = true;
    setState({ slug, house: null, status: 'loading' });
    fetchHouse(slug).then(
      (h) => alive && setState({ slug, house: h, status: 'ok' }),
      (e: DataError) => alive && setState({ slug, house: null, status: e?.status === 404 ? 'missing' : 'offline' }),
    );
    return () => {
      alive = false;
    };
  }, [slug]);

  const status = state.slug === slug ? state.status : 'loading';
  const house = status === 'ok' ? state.house : status === 'offline' ? bySlug[slug] ?? null : null;
  if (!house) {
    return status === 'loading' || (status === 'offline' && loading) ? (
      <div className="wrap section"><p className="muted" role="status">Cargando la casa…</p></div>
    ) : (
      <section className="section">
        <div className="wrap">
          <span className="eyebrow">Propiedades</span>
          <h1 className="text-(length:--fs-2xl)">Esta casa ya no está disponible</h1>
          <p className="lead mt-3">Puede que ya se haya rentado o vendido. Te mostramos otras opciones en Cancún.</p>
          <p className="mt-6"><Link className="btn" to="/propiedades">Ver todas las casas</Link></p>
        </div>
      </section>
    );
  }
  return <HouseDetail house={house} similar={houses.filter((h) => h.op === house.op && h.slug !== house.slug).slice(0, 6)} />;
}

function HouseDetail({ house: c, similar }: { house: House; similar: House[] }) {
  const toast = useToast();
  const { isFavorite, toggle } = useFavorites();
  const [gallery, setGallery] = useState(false);
  const rent = c.op === 'renta';
  const op = rent ? 'renta' : 'venta';
  const place = `${c.zona}, Cancún`;
  const unit = priceUnit(c);
  const advisor = c.asesor || 'Tu asesora de Zugar';
  const photos = c.photos?.length ? c.photos : [{ src: photoOf(c), label: c.name }];
  const paragraphs = (c.description || `${c.name} es una casa en ${op} en ${place} con ${c.rec} recámaras y ${c.banos} baños${c.m2 ? `, en ${c.m2} m² de construcción` : ''}. ${c.pets ? 'Acepta mascotas.' : 'No acepta mascotas.'}`).split(/\n+/);
  const published = c.publishedAt ? new Date(String(c.publishedAt).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const age = c.age === 0 ? 'A estrenar' : c.age ? `${c.age} ${c.age === 1 ? 'año' : 'años'}` : '—';

  usePageTitle(
    `${c.name} en ${op}, ${place} · ${money(c.price)} | Zugar`,
    `${c.name} en ${op} en ${place}: ${c.rec} recámaras, ${c.banos} baños${c.m2 ? `, ${c.m2} m² de construcción` : ''}. ${money(c.price)} ${unit}.`,
  );

  const share = async (e: MouseEvent) => {
    const data = { title: document.title, text: `Mira esta casa en ${place}`, url: location.href.split('#')[0] };
    if (navigator.share) {
      e.preventDefault();
      navigator.share(data).catch(() => {});
    } else if (navigator.clipboard && window.isSecureContext) {
      e.preventDefault();
      await navigator.clipboard.writeText(data.url);
      toast('Copiamos el enlace de la casa. Ya puedes pegarlo donde quieras.');
    }
  };

  const facts: [string, string, string][] = [
    ['area', c.m2 ? `${c.m2} m²` : '—', 'Construcción'], ['tree', c.terreno ? `${c.terreno} m²` : '—', 'Terreno'],
    ['bed', String(c.rec), 'Recámaras'], ['bath', String(c.banos), 'Baños'], ['car', String(c.est), 'Estacionamientos'], ['sparkle', age, 'Antigüedad'],
  ];
  const sheet: [string, string][] = [
    ['Tipo de inmueble', c.tipoTexto || (c.tipo === 'casa-condominio' ? 'Casa en condominio' : c.tipo === 'townhouse' ? 'Townhouse' : 'Casa')],
    ['Operación', rent ? 'Renta' : 'Venta'],
    ['Amueblada', { si: 'Sí', semi: 'Semiamueblada', no: 'No' }[c.amueblada] || 'No'],
    ['Mascotas', c.pets ? 'Se aceptan' : 'No se aceptan'],
    ['Clave del anuncio', c.code || '—'],
  ];
  const slot = (i: number) => (photos[i] ? <img src={photos[i].src} alt={photos[i].label || c.name} loading="lazy" /> : null);

  return (
    <>
      <div className="wrap">
        <div className="detail-top" style={{ paddingTop: '1.5rem' }}>
          <nav className="breadcrumb" aria-label="Ruta de navegación">
            <ol>
              <li><Link to="/">Inicio</Link></li>
              <li><Link to={`/propiedades?operacion=${op}`}>{rent ? 'Renta' : 'Venta'}</Link></li>
              <li><Link to={`/propiedades?operacion=${op}&zona=${encodeURIComponent(c.zonaKey)}`}>{c.zona}</Link></li>
              <li><span aria-current="page">{c.code || c.name}</span></li>
            </ol>
          </nav>
          <div className="detail-actions">
            <label className="save-toggle">
              <input type="checkbox" aria-label={`Guardar ${c.name} en favoritos`} checked={isFavorite(c.name)} onChange={(e) => toggle(c.name, e.target.checked)} />
              <span className="btn btn--secondary"><Icon id="heart" /><span className="when-unsaved">Guardar</span><span className="when-saved">Guardada</span></span>
            </label>
            <a className="btn btn--secondary" href={`https://wa.me/?text=${encodeURIComponent(`Mira esta casa en ${place}: ${location.href.split('#')[0]}`)}`} target="_blank" rel="noopener" onClick={share}>
              <Icon id="share" />Compartir
            </a>
          </div>
        </div>
        <div className="detail-title">
          <div className="tags"><span className="badge badge--dark">{(c.tipoTexto || 'Casa') + ' en ' + op}</span></div>
          <h1>{c.name}, {place}</h1>
        </div>
        <div className="gallery">
          <div className="gallery__main">
            <div className="photo">{slot(0)}</div>
            <span className="gallery__count"><Icon id="images" size="sm" />1 / {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}</span>
          </div>
          <div className="gallery__side"><div className="photo">{slot(1)}</div></div>
          <div className="gallery__side"><div className="photo">{slot(2)}</div></div>
          <div className="gallery__wide">
            <div className="photo">{slot(3)}</div>
            <button className="btn btn--white gallery__all" type="button" onClick={() => setGallery(true)}>
              <Icon id="grid" />{photos.length === 1 ? 'Ver la foto' : `Ver las ${photos.length} fotos`}
            </button>
          </div>
        </div>

        <div className="detail-layout">
          <div className="detail-main">
            <section className="price-block" aria-label="Precio y ubicación">
              <span className="eyebrow">{rent ? 'Renta mensual' : 'Venta'} · Precio en pesos mexicanos</span>
              <p className="price-big">{money(c.price)} <small>{unit}</small></p>
              {c.maintenance && <p className="muted">Mantenimiento: {c.maintenance}</p>}
              <p className="address"><Icon id="pin" />{c.address || place + ', Quintana Roo'}</p>
              <ul className="facts">
                {facts.map(([icon, value, label]) => (
                  <li key={label} className="fact"><strong><Icon id={icon} />{value}</strong><span>{label}</span></li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="desc-titulo">
              <h2 id="desc-titulo">Tu próxima historia empieza aquí</h2>
              <div className="prose">{paragraphs.map((p, i) => <p key={i}>{p}</p>)}</div>
            </section>

            <section aria-labelledby="amen-titulo">
              <h2 id="amen-titulo">Todo para vivir mejor</h2>
              {!!c.amenities?.length && (
                <ul className="amenities">{c.amenities.map((a) => <li key={a}><Icon id="check-c" />{a}</li>)}</ul>
              )}
              <div className="datasheet">
                <h3>Datos generales</h3>
                <dl>{sheet.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
              </div>
            </section>

            <section aria-labelledby="zona-titulo">
              <h2 id="zona-titulo">Conoce la zona</h2>
              <p className="muted" style={{ marginTop: '-0.75rem', marginBottom: '1.25rem' }}>{place} · Una zona para conectar con todo.</p>
              <div className="map map--zone">
                {hasCoords(c) ? (
                  <ZoneMap house={c} label={`Mapa con la zona de ${place}`} />
                ) : (
                  <iframe src={googleEmbed(c.mapa + ', Quintana Roo', 14)} title={`Mapa de Google con la zona de ${place}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
                )}
              </div>
              <p className="map-note">
                <Icon id="info" size="sm" />Ubicación aproximada para proteger la privacidad del inmueble.{' '}
                <a href={googleLink(hasCoords(c) ? `${c.lat},${c.lng}` : c.mapa + ', Quintana Roo')} target="_blank" rel="noopener">Abrir en Google Maps</a>
              </p>
            </section>

            <section aria-labelledby="credito-titulo">
              {!rent && (
                <>
                  <h2 id="credito-titulo">Imagina tu crédito</h2>
                  <p className="muted" style={{ marginTop: '-0.75rem', marginBottom: '1.25rem' }}>Un primer estimado para planear tu compra.</p>
                  <CreditCalculator price={c.price} />
                </>
              )}
              <p className="published">{published ? `Publicado el ${published} · ` : ''}Clave {c.code || c.slug}</p>
            </section>
          </div>

          <aside className="agent-card" id="contactar" aria-labelledby="agente-titulo">
            <h2 id="agente-titulo">¿Te imaginas viviendo aquí?</h2>
            <p>Agenda una visita a esta casa. {advisor.split(' ')[0]} te confirmará el día y la hora.</p>
            <div className="agent">
              <div className="photo photo--portrait">
                {/^Mariana/.test(advisor) && <img src={IMG + 'asesora-mariana-solis.jpg'} alt={`Fotografía de ${advisor}, asesora inmobiliaria`} loading="lazy" />}
              </div>
              <div>
                <strong>{advisor}</strong>
                <span>Asesora · Zugar Inmobiliaria</span>
                <span className="verified"><Icon id="check-c" size="sm" />Asesora certificada</span>
              </div>
            </div>
            <HouseVisitForm key={c.slug} house={c} />
          </aside>
        </div>
      </div>

      {similar.length > 0 && <Similar houses={similar} op={op} />}
      {gallery && <Lightbox house={c} photos={photos} onClose={() => setGallery(false)} />}
    </>
  );
}

/** Calculadora de crédito (solo casas en venta) */
function CreditCalculator({ price }: { price: number }) {
  const [down, setDown] = useState(money(price * 0.2) + ' MXN');
  const [years, setYears] = useState('20');
  const [rate, setRate] = useState('10.5 %');
  const d = Math.min(toNumber(down), price);
  const n = (+years || 20) * 12;
  const r = (parseFloat(rate.replace(',', '.')) || 0) / 100 / 12;
  const amount = Math.max(price - d, 0);
  const payment = r ? (amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : amount / n;
  const pct = price ? Math.round((d / price) * 100) : 0;
  return (
    <form className="calc" onSubmit={(e) => e.preventDefault()}>
      <div className="form-grid">
        <div className="field span-2">
          <label className="field__label" htmlFor="cr-enganche">Enganche · {pct} % del precio</label>
          <input className="input" id="cr-enganche" type="text" inputMode="numeric" value={down} aria-describedby="cr-aviso"
            onChange={(e) => setDown(e.target.value)} onBlur={() => setDown(money(Math.min(toNumber(down), price)) + ' MXN')} />
          <p className="field__hint" id="cr-aviso">{pct < 10 ? 'La mayoría de los bancos pide al menos 10 % de enganche.' : ''}</p>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="cr-plazo">Plazo</label>
          <select className="select" id="cr-plazo" value={years} onChange={(e) => setYears(e.target.value)}>
            <option value="10">10 años</option><option value="15">15 años</option><option value="20">20 años</option>
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="cr-tasa">Tasa anual fija</label>
          <input className="input" id="cr-tasa" type="text" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)}
            onBlur={() => { const t = parseFloat(rate.replace(',', '.')); setRate((isNaN(t) ? 10.5 : t) + ' %'); }} />
        </div>
      </div>
      <dl><div className="calc__row"><dt>Monto a financiar</dt><dd>{money(amount)} MXN</dd></div></dl>
      <div className="calc__result">
        <p>Tu mensualidad estimada</p>
        <output htmlFor="cr-enganche cr-plazo cr-tasa" aria-live="polite">{money(payment)} MXN</output>
        <p>{n} pagos mensuales · capital e intereses</p>
      </div>
      <p className="calc__legal">Cálculo de referencia con tasa fija anual y amortización mensual. No incluye seguros, comisiones, impuestos ni gastos notariales. Sujeto a aprobación de la institución financiera.</p>
      <a className="btn btn--secondary" href="#contactar">Quiero asesoría de crédito</a>
    </form>
  );
}

/** «También te pueden gustar»: carrusel con botones anterior/siguiente */
function Similar({ houses, op }: { houses: House[]; op: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const update = () => {
    const el = ref.current;
    if (el) setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  };
  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [houses]);
  const move = (dir: number) => {
    const el = ref.current;
    const card = el?.querySelector<HTMLElement>('.card');
    el?.scrollBy({ left: dir * (card ? card.offsetWidth + 24 : el.clientWidth), behavior: 'smooth' });
  };
  return (
    <section className="section section--surface" aria-labelledby="similares-titulo">
      <div className="wrap">
        <div className="similar-head">
          <div>
            <h2 id="similares-titulo">También te pueden gustar</h2>
            <p>Más casas en {op} para tu vida en Cancún.</p>
          </div>
          <Link className="link-arrow" to={`/propiedades?operacion=${op}`}>Ver todas en {op}<Icon id="arrow" size="sm" /></Link>
          <div className="carousel-nav">
            <button className="btn-icon" type="button" aria-label="Ver casas anteriores" aria-controls="carrusel-similares" disabled={edges.start} onClick={() => move(-1)}><Icon id="left" /></button>
            <button className="btn-icon" type="button" aria-label="Ver más casas" aria-controls="carrusel-similares" disabled={edges.end} onClick={() => move(1)}><Icon id="right" /></button>
          </div>
        </div>
        <div className="carousel" id="carrusel-similares" ref={ref} tabIndex={0} aria-label="Casas similares, desliza para ver más" onScroll={update}>
          {houses.map((h) => <PropertyCard key={h.slug} house={h} />)}
        </div>
      </div>
    </section>
  );
}

/** Galería completa (pantalla completa sobre la ficha) */
function Lightbox({ house: c, photos, onClose }: { house: House; photos: { src: string; label: string }[]; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const scrollY = useMemo(() => window.scrollY, []);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      window.scrollTo(0, scrollY);
      previous?.focus({ preventScroll: true });
    };
  }, [onClose, scrollY]);
  return (
    <div className="lightbox is-open" id="galeria" role="dialog" aria-modal="true" aria-labelledby="galeria-titulo">
      <div className="wrap">
        <div className="lightbox__head">
          <div>
            <h2 id="galeria-titulo">{c.name}</h2>
            <p>Cancún · {money(c.price)} {priceUnit(c)} · {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}</p>
          </div>
          <button ref={closeRef} className="lightbox__close" type="button" aria-label="Cerrar galería" onClick={onClose}><Icon id="x" size="lg" /></button>
        </div>
        <div className="lightbox__grid">
          {photos.map((f, i) => (
            <figure key={i}>
              <div className="photo"><img src={f.src} alt={f.label || c.name} loading="lazy" /></div>
              <figcaption>{String(i + 1).padStart(2, '0')}{f.label ? ' · ' + f.label : ''}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
