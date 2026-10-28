import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useCatalog } from '../components/CatalogProvider';
import { googleEmbed, googleLink, hasCoords, MarkersMap } from '../components/HouseMap';
import { Icon } from '../components/Icon';
import { PropertyCard } from '../components/PropertyCard';
import { inPlace, placeLabel, shortPrice, type House } from '../lib/catalog';
import { toNumber } from '../lib/format';
import { usePageTitle } from '../lib/usePageTitle';

/* ==========================================================================
   Listado de propiedades: filtros en la dirección (?operacion=renta&recamaras=3…),
   orden, vista (cuadrícula, lista o mapa), páginas y mapa con la ubicación aproximada.
   ========================================================================== */
const PER_PAGE = 6;

type Option = [string, string];
const TYPES: Option[] = [['', 'Todos los tipos'], ['casa', 'Casa'], ['casa-condominio', 'Casa en condominio'], ['townhouse', 'Townhouse']];
// La ubicación («zona» en la dirección) se escribe libre: colonia, ciudad o país, de cualquier parte del mundo.
const PRICES: Record<'renta' | 'venta', Option[]> = {
  renta: [['20000', 'Hasta $20,000'], ['30000', 'Hasta $30,000'], ['40000', 'Hasta $40,000'], ['60000', 'Hasta $60,000']],
  venta: [['3500000', 'Hasta $3.5 millones'], ['4500000', 'Hasta $4.5 millones'], ['5500000', 'Hasta $5.5 millones'], ['7000000', 'Hasta $7 millones'], ['mas', 'Más de $5 millones']],
};
const BEDROOMS: Option[] = [['', 'Cualquiera'], ['1', '1 recámara'], ['2', '2 recámaras'], ['3', '3 recámaras'], ['4', '4 o más']];
const ATLEAST: Option[] = [['', 'Cualquiera'], ['1', '1 o más'], ['2', '2 o más'], ['3', '3 o más']];
const AREA: Option[] = [['', 'Cualquier m²'], ['120', 'Desde 120 m²'], ['180', 'Desde 180 m²'], ['250', 'Desde 250 m²']];
const PETS: Option[] = [['', 'Sin preferencia'], ['si', 'Acepta mascotas']];
const FURNISHED: Option[] = [['', 'Sin preferencia'], ['si', 'Amueblada'], ['semi', 'Semiamueblada'], ['no', 'Sin amueblar']];
const SORTS: Option[] = [['precio-asc', 'Precio: menor a mayor'], ['precio-desc', 'Precio: mayor a menor'], ['recientes', 'Más recientes']];

const FILTERS = ['tipo', 'zona', 'precio_max', 'recamaras', 'banos', 'estacionamientos', 'superficie', 'mascotas', 'amueblada'] as const;
type FilterKey = (typeof FILTERS)[number];
type Filters = Record<FilterKey, string>;

const optionsFor = (k: FilterKey, op: string): Option[] =>
  ({
    tipo: TYPES, zona: [], recamaras: BEDROOMS, banos: ATLEAST, estacionamientos: ATLEAST, superficie: AREA, mascotas: PETS, amueblada: FURNISHED,
    precio_max: [['', 'Cualquiera'] as Option, ...(op === 'renta' || op === 'venta' ? PRICES[op] : [...PRICES.renta, ...PRICES.venta])],
  })[k];

/** Distancia en km entre dos puntos (fórmula del semiverseno) */
function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** Punto elegido en el mapa de la portada: casas a menos de «radio» km (las que no tienen ubicación no entran). */
export type Near = { lat: number; lng: number; radius: number; label: string } | null;

function matches(c: House, op: string, q: Filters, near: Near, min: number) {
  const p = q.precio_max;
  // Con operación elegida, cualquier monto escrito vale; sin ella, los millones son de venta
  const priceOk = !p || (p === 'mas' ? c.op === 'venta' && c.price > 5e6 : (op ? true : (toNumber(p) >= 1e6) === (c.op === 'venta')) && c.price <= toNumber(p));
  return (
    (!op || c.op === op) &&
    (!q.tipo || (q.tipo === 'casa' ? /^casa/.test(c.tipo) : c.tipo === q.tipo)) &&
    inPlace(c, q.zona) &&
    (!near || (hasCoords(c) && km(near, c) <= near.radius)) &&
    (!min || c.price >= min) &&
    priceOk &&
    (!q.recamaras || (q.recamaras === '4' ? c.rec >= 4 : c.rec === +q.recamaras)) &&
    (!q.banos || c.banos >= +q.banos) &&
    (!q.estacionamientos || c.est >= +q.estacionamientos) &&
    (!q.superficie || c.m2 >= +q.superficie) &&
    (!q.mascotas || c.pets) &&
    (!q.amueblada || c.amueblada === q.amueblada)
  );
}

export function Listing() {
  const { houses, loading } = useCatalog();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [panelOpen, setPanelOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const op = params.get('operacion') === 'renta' || params.get('operacion') === 'venta' ? params.get('operacion')! : '';
  const sort = params.get('orden') || 'precio-asc';
  const view = params.get('vista') || 'cuadricula';
  // Valores de la dirección; los que no existen en las listas se ignoran
  const q = Object.fromEntries(
    FILTERS.map((k) => {
      const v = params.get(k) ?? (k === 'precio_max' ? params.get('presupuesto') ?? '' : '');
      if (k === 'zona') return [k, v.trim().slice(0, 80)]; // texto libre
      if (k === 'precio_max' && /^\d{3,10}$/.test(v)) return [k, v]; // monto escrito en la portada
      return [k, optionsFor(k, op).some(([o]) => o === v) ? v : ''];
    }),
  ) as Filters;
  const [draft, setDraft] = useState<Filters>(q);
  useEffect(() => setDraft(q), [params.toString()]); // al cambiar la dirección, el formulario muestra los filtros aplicados

  /** Dirección con cambios (null o '' quitan el parámetro) */
  const urlWith = (changes: Record<string, string | number | null>) => {
    const u = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v === null || v === '' ? u.delete(k) : u.set(k, String(v))));
    if (changes.precio_max === null) u.delete('presupuesto');
    const s = u.toString();
    return '/propiedades' + (s ? '?' + s : '');
  };

  // Lugar elegido en el mapa de la portada (?lat=&lng=&radio=&lugar=) y presupuesto mínimo (?precio_min=)
  const near: Near = useMemo(() => {
    const lat = Number(params.get('lat')), lng = Number(params.get('lng')), radius = Number(params.get('radio')) || 10;
    return params.get('lat') && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
      ? { lat, lng, radius: Math.min(Math.max(radius, 1), 200), label: (params.get('lugar') || 'el punto elegido').slice(0, 80) }
      : null;
  }, [params.toString()]);
  const minPrice = Number(params.get('precio_min')) || 0;
  const results = useMemo(
    () => houses.filter((c) => matches(c, op, q, near, minPrice)).sort((a, b) => (sort === 'precio-desc' ? b.price - a.price : sort === 'recientes' ? b.orden - a.orden : a.price - b.price)),
    [houses, op, sort, JSON.stringify(q), near, minPrice],
  );
  // Sugerencias para «Ubicación»: las zonas de las casas publicadas (se puede escribir cualquier otra)
  const places = useMemo(() => [...new Set(houses.map((h) => h.zona))].sort(), [houses]);
  const total = results.length;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(pages, Math.max(1, parseInt(params.get('pagina') || '1', 10) || 1));
  const from = (page - 1) * PER_PAGE;
  const pageItems = results.slice(from, from + PER_PAGE);

  const recTxt = q.recamaras ? (q.recamaras === '4' ? ' de 4 o más recámaras' : ` de ${q.recamaras} recámara${q.recamaras === '1' ? '' : 's'}`) : '';
  const opTxt = op === 'renta' ? ' en renta' : op === 'venta' ? ' en venta' : ' en renta y venta';
  const title = 'Casas' + recTxt + opTxt + (near ? ' cerca de ' + near.label.split(',')[0] : ' en ' + (q.zona ? placeLabel(q.zona) : 'Cancún'));
  usePageTitle(title + ' | Zugar Inmobiliaria');

  const chips: [string, Record<string, null>][] = [];
  if (op) chips.push([op === 'renta' ? 'En renta' : 'En venta', { operacion: null, precio_max: null }]);
  if (near) chips.push([`A ${near.radius} km de ${near.label.split(',')[0]}`, { lat: null, lng: null, radio: null, lugar: null }]);
  if (minPrice) chips.push([`Desde $${minPrice.toLocaleString('en-US')}`, { precio_min: null }]);
  FILTERS.forEach((k) => {
    if (!q[k]) return;
    const text = k === 'zona' ? 'Ubicación: ' + placeLabel(q.zona)
      : k === 'precio_max' && /^\d+$/.test(q.precio_max) && !optionsFor(k, op).some(([v]) => v === q.precio_max) ? `Hasta $${Number(q.precio_max).toLocaleString('en-US')}`
      : optionsFor(k, op).find(([v]) => v === q[k])![1];
    const prefix = ({ banos: 'Baños: ', estacionamientos: 'Estacionamientos: ' } as Record<string, string>)[k] ?? '';
    chips.push([prefix + text, { [k]: null }]);
  });
  chips.forEach(([, c]) => (c.pagina = null));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPanelOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => setSelected(null), [params.toString()]);

  const onFilter = (e: FormEvent) => {
    e.preventDefault();
    setPanelOpen(false);
    const u = new URLSearchParams();
    if (op) u.set('operacion', op);
    FILTERS.forEach((k) => draft[k] && u.set(k, draft[k]));
    // Se conservan el lugar del mapa y el presupuesto mínimo de la portada
    ['lat', 'lng', 'radio', 'lugar', 'precio_min'].forEach((k) => params.get(k) && u.set(k, params.get(k)!));
    if (sort !== 'precio-asc') u.set('orden', sort);
    if (view !== 'cuadricula') u.set('vista', view);
    setParams(u);
  };

  const zoneQuery = q.zona ? (pageItems[0] ? pageItems[0].mapa : placeLabel(q.zona)) : 'Cancún, Quintana Roo';
  const picked = pageItems.find((c) => c.slug === selected);
  const mapLink = picked ? googleLink(hasCoords(picked) ? `${picked.lat},${picked.lng}` : picked.mapa + ', Quintana Roo') : googleLink(zoneQuery);
  const useLeaflet = pageItems.some(hasCoords);

  const cell = (n: number, label: string, content: ReactNode, current = false) =>
    n < 1 || n > pages ? (
      <li key={label + n}><span className="is-disabled" aria-label={`${label} (no disponible)`}>{content}</span></li>
    ) : (
      <li key={label + n}><Link to={urlWith({ pagina: n === 1 ? null : n })} aria-current={current ? 'page' : undefined} aria-label={label || undefined}>{content}</Link></li>
    );

  return (
    <>
      <div className="wrap">
        <nav className="breadcrumb" aria-label="Ruta de navegación">
          <ol>
            <li><Link to="/">Inicio</Link></li>
            {op ? (
              <li><Link to={`/propiedades?operacion=${op}`} aria-current={recTxt ? undefined : 'page'}>{op === 'renta' ? 'Rentas' : 'Ventas'} en Cancún</Link></li>
            ) : (
              <li><span aria-current="page">Propiedades</span></li>
            )}
            {op && recTxt && <li><span aria-current="page">{recTxt.replace(/^ de /, '').replace(/^./, (m) => m.toUpperCase())}</span></li>}
          </ol>
        </nav>
        <div className="listing-head">
          <div>
            <span className="eyebrow">Un lugar para tu siguiente capítulo</span>
            <h1>{title}</h1>
            <p>
              {total} casa{total === 1 ? '' : 's'} disponible{total === 1 ? '' : 's'} · {op === 'renta' ? 'Rentas a largo plazo' : op === 'venta' ? 'Contado, crédito bancario o Infonavit' : 'Renta y venta'} · Precios en MXN
            </p>
          </div>
          <Link className="btn btn--secondary btn--lg" to="/contacto?motivo=alerta-busqueda"><Icon id="bookmark" />Guardar búsqueda</Link>
        </div>
      </div>

      {/* Filtros */}
      <section className="filters" aria-label="Filtros de búsqueda">
        <div className="wrap">
          <input type="checkbox" id="filtros-toggle" className="filters__toggle-input" aria-label="Mostrar filtros" checked={panelOpen} onChange={(e) => setPanelOpen(e.target.checked)} />
          <label htmlFor="filtros-toggle" className="btn btn--secondary btn--lg btn--block filters__open"><Icon id="sliders" />Filtros{chips.length ? ` (${chips.length})` : ''}</label>
          <div className="filters__panel">
            <div className="filters__panel-head">
              <h2>Filtros</h2>
              <label htmlFor="filtros-toggle" aria-label="Cerrar filtros"><Icon id="x" size="lg" /></label>
            </div>
            <form id="filtros" onSubmit={onFilter}>
              <div className="filters__grid">
                {FILTERS.map((k) => {
                  const labels: Record<FilterKey, string> = {
                    tipo: 'Tipo', zona: 'Ubicación', precio_max: op === 'renta' ? 'Precio mensual' : op === 'venta' ? 'Precio de venta' : 'Precio',
                    recamaras: 'Recámaras', banos: 'Baños', estacionamientos: 'Estacionamientos', superficie: 'Superficie', mascotas: 'Mascotas', amueblada: 'Amueblada',
                  };
                  const id = { tipo: 'f-tipo', zona: 'f-zona', precio_max: 'f-precio', recamaras: 'f-rec', banos: 'f-banos', estacionamientos: 'f-est', superficie: 'f-sup', mascotas: 'f-mascotas', amueblada: 'f-amueblada' }[k];
                  const opts = optionsFor(k, op);
                  if (k === 'zona') {
                    return (
                      <div key={k} className="field field--full">
                        <label className="field__label" htmlFor={id}>{labels[k]}</label>
                        <input className="input" id={id} type="search" list="ubicaciones" maxLength={80} placeholder="Colonia, ciudad o país" value={draft.zona} onChange={(e) => setDraft({ ...draft, zona: e.target.value })} />
                        <datalist id="ubicaciones">{places.map((z) => <option key={z} value={z} />)}</datalist>
                      </div>
                    );
                  }
                  return (
                    <div key={k} className={`field${k === 'tipo' ? ' field--full' : ''}`}>
                      <label className="field__label" htmlFor={id}>{labels[k]}</label>
                      <select className="select" id={id} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}>
                        {k === 'precio_max' && !op ? (
                          <>
                            <option value="">Cualquiera</option>
                            <optgroup label="Renta mensual">{PRICES.renta.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</optgroup>
                            <optgroup label="Venta">{PRICES.venta.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</optgroup>
                          </>
                        ) : (
                          opts.map(([v, t]) => <option key={v} value={v}>{t}</option>)
                        )}
                      </select>
                    </div>
                  );
                })}
                <div className="filters__submit">
                  <button className="btn btn--lg btn--block" type="submit"><Icon id="search" />Buscar casas</button>
                </div>
                <div className="filters__mobile-only">
                  <Link className="btn btn--secondary btn--lg btn--block" to="/propiedades" onClick={() => setPanelOpen(false)}>Limpiar filtros</Link>
                </div>
              </div>
            </form>
          </div>
          {chips.length > 0 && (
            <div className="active-filters" aria-label="Filtros activos">
              {chips.map(([text, change]) => (
                <Link key={text} className="chip" to={urlWith(change)} aria-label={`Quitar filtro: ${text}`}>{text}<Icon id="x" size="sm" /></Link>
              ))}
              <Link className="clear" to="/propiedades">Limpiar filtros</Link>
            </div>
          )}
        </div>
      </section>

      <div className="wrap">
        <div className="toolbar">
          <div className="toolbar__sort">
            <div className="field">
              <label className="field__label" htmlFor="orden">Ordenar por precio o recientes</label>
              <select className="select" id="orden" value={sort} onChange={(e) => navigate(urlWith({ orden: e.target.value === 'precio-asc' ? null : e.target.value, pagina: null }))}>
                {SORTS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            </div>
            <p className="toolbar__count">{total ? `Mostrando ${from + 1}–${from + pageItems.length} de ${total} casa${total === 1 ? '' : 's'}` : loading ? 'Cargando casas…' : 'Sin resultados'}</p>
          </div>
          <nav className="segmented" aria-label="Tipo de vista">
            {([['lista', 'list', 'Lista'], ['cuadricula', 'grid', 'Cuadrícula'], ['mapa', 'map', 'Mapa']] as const).map(([v, icon, label]) => (
              <Link key={v} to={urlWith({ vista: v === 'cuadricula' ? null : v })} aria-current={view === v ? 'true' : undefined}><Icon id={icon} size="sm" />{label}</Link>
            ))}
          </nav>
        </div>

        <div className={`listing-layout${view === 'mapa' ? ' is-map-view' : ''}`}>
          <section aria-labelledby="resultados-titulo">
            <h2 id="resultados-titulo" className="sr-only">Resultados</h2>
            <div className={`cards cards--2${view === 'lista' ? ' cards--list' : ''}`}>
              {pageItems.length ? (
                pageItems.map((c) => <PropertyCard key={c.slug} house={c} />)
              ) : (
                !loading && (
                  <div className="listing-empty">
                    <h3>No encontramos casas con esos filtros</h3>
                    <p>Prueba con otra zona o un presupuesto distinto. También podemos buscar por ti.</p>
                    <p className="listing-empty__actions">
                      <Link className="btn btn--secondary" to="/propiedades">Limpiar filtros</Link>
                      <Link className="btn" to="/contacto?motivo=alerta-busqueda">Avísenme cuando haya opciones</Link>
                    </p>
                  </div>
                )
              )}
            </div>
            {total > 0 && (
              <nav className="pagination" aria-label="Paginación de resultados">
                <ul>
                  {cell(page - 1, 'Página anterior', <Icon id="left" size="sm" />)}
                  {Array.from({ length: pages }, (_, i) => cell(i + 1, '', String(i + 1), i + 1 === page))}
                  {cell(page + 1, 'Página siguiente', <Icon id="right" size="sm" />)}
                </ul>
              </nav>
            )}
          </section>

          <aside className="listing-aside" aria-label="Mapa y ayuda">
            <div className="map map--listing">
              {useLeaflet ? (
                <MarkersMap houses={pageItems} selected={selected} label="Mapa de Cancún con la zona de las casas" />
              ) : (
                <iframe
                  src={picked ? googleEmbed(picked.mapa + ', Quintana Roo', 15) : googleEmbed(zoneQuery, q.zona ? 14 : 12)}
                  title={picked ? `Mapa de Google con la zona de ${picked.name}` : 'Mapa de Google de Cancún con la zona de las casas'}
                  loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen
                />
              )}
            </div>
            <div className="map-places">
              <p className="map-places__title">Ubicación aproximada de cada casa</p>
              <ul id="map-places">
                {pageItems.length ? (
                  pageItems.map((c) => (
                    <li key={c.slug}>
                      <button type="button" aria-pressed={selected === c.slug} onClick={() => setSelected(c.slug)}>
                        <Icon id="pin" /><span>{c.name} · {shortPrice(c)} · {c.zona.replace(/^Residencial /, '')}</span>
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="muted small">Sin casas para mostrar en el mapa.</li>
                )}
              </ul>
              <a className="link-arrow" id="map-open" href={mapLink} target="_blank" rel="noopener">Abrir en Google Maps<Icon id="arrow" size="sm" /></a>
            </div>
            <div className="zone-card">
              <span className="eyebrow">Conocemos Cancún</span>
              <h2>La zona también hace hogar.</h2>
              <p>Te ayudamos a elegir según tu rutina, tus tiempos de traslado, escuelas cercanas y lo que más importa para tu familia.</p>
              <Link className="btn btn--secondary" to="/contacto?motivo=asesoria-zona"><Icon id="arrow" />Ayúdame a elegir</Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
