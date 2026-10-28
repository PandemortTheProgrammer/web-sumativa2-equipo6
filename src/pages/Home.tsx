import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { toAmount } from '../components/BudgetRange';
import { useCatalog } from '../components/CatalogProvider';
import { MapPicker, type PickedPlace } from '../components/MapPicker';
import { Icon } from '../components/Icon';
import { PropertyCard } from '../components/PropertyCard';
import { VisitRequest } from '../components/VisitRequest';
import { usePageTitle } from '../lib/usePageTitle';

/* Las 6 casas destacadas de la portada (3 en renta y 3 en venta), con su texto alternativo original */
const FEATURED: [string, string][] = [
  ['casa-ceiba', 'Fachada de Casa Ceiba con jardín tropical al frente'],
  ['casa-del-patio', 'Terraza con pérgola de madera y jardín de Casa del Patio'],
  ['casa-olivo', 'Casa Olivo, de estilo colonial caribeño con balcón y plantas'],
  ['casa-de-la-luz', 'Casa de la Luz, residencia de dos niveles con grandes ventanales'],
  ['casa-nativa', 'Casa Nativa con alberca y fachada de madera y piedra'],
  ['casa-almendra', 'Casa Almendra con cochera y jardín frontal'],
];


type Tab = 'todas' | 'renta' | 'venta';

export function Home() {
  usePageTitle('Casas en renta y venta en Cancún | Zugar Inmobiliaria');
  const { bySlug } = useCatalog();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('todas');
  const [search, setSearch] = useState({ operacion: 'renta', min: '', max: '' });
  // Ubicación elegida en el mapa (cualquier parte del mundo) y radio de búsqueda
  const [place, setPlace] = useState<PickedPlace | null>(null);
  const [picking, setPicking] = useState(false);

  const featured = FEATURED.map(([slug, alt]) => ({ house: bySlug[slug], alt })).filter((x) => x.house);
  const visible = featured.filter((x) => tab === 'todas' || x.house.op === tab);
  const rentCount = featured.filter((x) => x.house.op === 'renta').length;

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = new URLSearchParams({ operacion: search.operacion });
    const min = toAmount(search.min), max = toAmount(search.max);
    if (min) q.set('precio_min', String(min));
    if (max) q.set('precio_max', String(max));
    if (place) {
      q.set('lat', place.lat.toFixed(5));
      q.set('lng', place.lng.toFixed(5));
      q.set('radio', String(place.radius));
      q.set('lugar', place.label);
    }
    navigate('/propiedades?' + q.toString());
  };
  const amounts = search.operacion === 'renta' ? [10000, 15000, 20000, 30000, 40000, 60000] : [2000000, 3000000, 4000000, 5000000, 7000000, 10000000];

  return (
    <>
      {/* Hero */}
      <section className="hero" aria-labelledby="hero-titulo">
        <div className="wrap hero__grid">
          <div>
            <div className="hero__card">
              <span className="eyebrow">Casas en Cancún · Renta y venta</span>
              <h1 id="hero-titulo">Tu próxima casa. Tu ritmo de vida.</h1>
              <p>Somos una inmobiliaria pequeña de Cancún. Te atendemos de forma directa, sin intermediarios ni prisas, para encontrar una casa que se sienta tuya, en renta o en venta.</p>
              <form className="hero-search" role="search" aria-label="Buscar casas" onSubmit={onSearch}>
                <div className="field">
                  <span className="field__label" id="h-zona-label">Ubicación</span>
                  <button className="input hero-search__place" id="h-zona" type="button" aria-labelledby="h-zona-label h-zona" onClick={() => setPicking(true)}>
                    <span>{place ? `${place.label.split(',')[0]} · ${place.radius} km` : 'En el mapa'}</span><Icon id="pin" />
                  </button>
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="h-operacion">Operación</label>
                  <select className="select" id="h-operacion" value={search.operacion} onChange={(e) => setSearch({ ...search, operacion: e.target.value, min: '', max: '' })}>
                    <option value="renta">Renta</option>
                    <option value="venta">Venta</option>
                  </select>
                </div>
                <div className="field">
                  <span className="field__label" id="h-pres-label">Presupuesto{search.operacion === 'renta' ? ' al mes' : ''}</span>
                  <div className="budget-range budget-range--compact" role="group" aria-labelledby="h-pres-label">
                    <input className="input" id="h-min" type="text" inputMode="numeric" list="h-montos" placeholder="Mín." aria-label="Presupuesto mínimo" value={search.min} onChange={(e) => setSearch({ ...search, min: e.target.value.replace(/\D/g, '') })} />
                    <input className="input" id="h-max" type="text" inputMode="numeric" list="h-montos" placeholder="Máx." aria-label="Presupuesto máximo" value={search.max} onChange={(e) => setSearch({ ...search, max: e.target.value.replace(/\D/g, '') })} />
                    <datalist id="h-montos">{amounts.map((n) => <option key={n} value={n}>{'$' + n.toLocaleString('en-US')}</option>)}</datalist>
                  </div>
                </div>
                <div className="hero-search__actions">
                  <button className="btn btn--gold btn--lg" type="submit"><Icon id="search" />Buscar propiedades</button>
                </div>
              </form>
              <MapPicker open={picking} initial={place} onClose={() => setPicking(false)} onPick={(p) => { setPlace(p); setPicking(false); }} />
            </div>
            <p className="hero__note"><Icon id="pin" />Con calma, con claridad y con alguien de aquí.</p>
          </div>
          <figure className="hero__figure">
            <div className="photo">
              <img src="/assets/img/hero-casa-cancun.jpg" alt="Casa moderna de dos niveles con grandes ventanales y alberca al atardecer" fetchPriority="high" />
            </div>
            <figcaption><span>Luz, sombra y espacio para vivir.</span><span>Cancún, Q. Roo</span></figcaption>
          </figure>
        </div>
      </section>

      {/* Franja de confianza */}
      <div className="trust">
        <div className="wrap trust__inner">
          <p className="trust__main"><Icon id="home" />Solo casas. Solo Cancún. Atención de persona a persona.</p>
          <p className="muted">Te respondemos en menos de un día hábil</p>
        </div>
      </div>

      {/* Propiedades */}
      <section className="section" id="propiedades" aria-labelledby="prop-titulo">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">01 / Propiedades</span>
              <h2 id="prop-titulo">Un lugar para lo que viene.</h2>
              <p>Casas para distintas formas de vivir en Cancún. Explora con calma; nosotros te acompañamos en el siguiente paso.</p>
            </div>
            <div>
              <nav className="tabs" aria-label="Filtrar por operación">
                {([['todas', 'Todas'], ['renta', 'En renta'], ['venta', 'En venta']] as [Tab, string][]).map(([t, label]) => (
                  <a key={t} className="tab" href={t === 'todas' ? '#propiedades' : `/propiedades?operacion=${t}`} aria-current={tab === t ? 'page' : undefined}
                    onClick={(e) => { e.preventDefault(); setTab(t); }}>
                    {label}
                  </a>
                ))}
              </nav>
              <p className="tabs-meta">
                {tab === 'todas'
                  ? `${featured.length} casas destacadas · ${rentCount} en renta y ${featured.length - rentCount} en venta`
                  : `${visible.length} casas destacadas ${tab === 'renta' ? 'en renta' : 'en venta'}`}
              </p>
            </div>
          </div>

          <div className="cards">
            {visible.map(({ house, alt }) => <PropertyCard key={house.slug} house={house} alt={alt} />)}
          </div>

          <div className="section-foot">
            <Link className="btn btn--secondary btn--lg" to={tab === 'todas' ? '/propiedades' : `/propiedades?operacion=${tab}`}>
              {tab === 'todas' ? 'Ver todas las casas' : `Ver todas las casas ${tab === 'renta' ? 'en renta' : 'en venta'}`}
              <Icon id="arrow" />
            </Link>
          </div>
        </div>
      </section>

      {/* Cómo trabajamos */}
      <section className="section section--surface" aria-labelledby="pasos-titulo">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">02 / Cómo trabajamos</span>
              <h2 id="pasos-titulo">Menos vueltas. Más cercanía.</h2>
              <p>Un proceso sencillo, de la primera plática a tu próxima casa.</p>
            </div>
            <Link className="link-arrow" to="/como-trabajamos">Conoce el proceso completo<Icon id="arrow" size="sm" /></Link>
          </div>
          <ol className="steps">
            <li className="step">
              <span className="step__num" aria-hidden="true">01</span>
              <h3>Platicamos de ti</h3>
              <p>Nos cuentas qué buscas, tu presupuesto y cómo te gustaría vivir. Escuchamos antes de proponerte una casa.</p>
            </li>
            <li className="step">
              <span className="step__num" aria-hidden="true">02</span>
              <h3>La conocemos juntos</h3>
              <p>Acordamos una visita y recorremos la casa contigo. Hablamos de la zona, los espacios y tus dudas, sin prisas.</p>
            </li>
            <li className="step">
              <span className="step__num" aria-hidden="true">03</span>
              <h3>Decides con claridad</h3>
              <p>Si la casa es para ti, revisamos requisitos y siguientes pasos de renta o compra. Tú decides; nosotros te orientamos.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* Contacto: solicitud de visita */}
      <section className="section" id="contacto" aria-labelledby="contacto-titulo">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">03 / Contáctanos</span>
              <h2 id="contacto-titulo">Una buena casa empieza con una buena plática.</h2>
              <p>Cuéntanos un poco de ti y de lo que necesitas. Con estos datos preparamos tu visita a la casa, sin prisas y con todo claro.</p>
            </div>
          </div>
          <VisitRequest />
        </div>
      </section>
    </>
  );
}
