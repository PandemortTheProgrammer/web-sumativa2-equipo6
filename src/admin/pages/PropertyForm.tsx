import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { coordenadasDeMaps } from '../servicio';
import { useOverlay } from '../components/Overlay';
import { brokerOptions, Crumbs, err, FieldError, Icon, Options, PageHead, Photo, StatusBadge, useErrors, useUrlParams, type ExtraError } from '../components/ui';
import { broker, cap, log, money, norm, numberValue, prop, rerender, upcoming, useStore, Z, type Property } from '../store';
import { PropertyDetail } from './Properties';

const MAX_PHOTOS = 20, MAX_MB = 10;
const TODAY = () => Z.TODAY;

type Draft = Omit<Property, 'id' | 'published' | 'updated' | 'updatedAt'> & { id?: string; published?: string; updated?: string; updatedAt?: number };
const EMPTY = (): Draft => ({
  name: '', type: 'Casa', zone: '', city: 'Cancún, Quintana Roo', address: '', street: '', desc: '', m2: '', terreno: '', age: '',
  rec: 3, banos: 2, est: 2, op: 'renta', price: 0, status: 'disponible', availableFrom: TODAY(), maintenance: 'Incluido en la renta',
  deposit: 0, visibility: 'publicada', broker: '', amenities: [], photos: [], furnished: 'Sin amueblar',
});

/** Alta y edición de una propiedad: #/propiedades/nueva y #/propiedades/:id/editar */
export function PropertyForm() {
  const { id } = useParams();
  const editing = !!id;
  const src = id ? prop(id) : undefined;
  if (editing && !src) return <PropertyDetail />; // muestra «Propiedad no encontrada»
  return <Form key={id || 'nueva'} src={src} />;
}

function Form({ src }: { src?: Property }) {
  const D = useStore();
  const navigate = useNavigate();
  const { toast } = useOverlay();
  const { errors, check, clear, set: setErrors } = useErrors();
  const editing = !!src;
  const [f, setF] = useState<Draft>(() => (src ? JSON.parse(JSON.stringify(src)) : EMPTY()));
  const [priceText, setPriceText] = useState(f.price ? money(f.price) : '');
  const [depositText, setDepositText] = useState(f.deposit ? money(f.deposit) : '');
  const [custom, setCustom] = useState(() => f.amenities.filter((a) => !Z.AMENITIES.includes(a)));
  const [dirty, setDirty] = useState(false);
  const [invalidBar, setInvalidBar] = useState(false);
  const [formError, setFormError] = useState(false);
  const [newAmen, setNewAmen] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [mapsMsg, setMapsMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [dropOver, setDropOver] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const focusAfter = useRef<string | null>(null);

  // ?seccion=amenidades o fotografias: se abre en esa sección
  const section = useRef<string | null>(null);
  useUrlParams((p) => (section.current = p.get('seccion')));
  useEffect(() => {
    const target = section.current && document.getElementById(section.current);
    if (target) setTimeout(() => { target.scrollIntoView({ block: 'start' }); target.querySelector<HTMLElement>('input, button')?.focus({ preventScroll: true }); }, 0);
  }, []);
  useEffect(() => {
    if (focusAfter.current) { (document.querySelector(focusAfter.current) as HTMLElement | null)?.focus(); focusAfter.current = null; }
  });

  const update = (changes: Partial<Draft>) => { setF((x) => ({ ...x, ...changes })); setDirty(true); };
  const complete = () =>
    [f.name, f.type, f.zone, f.city, f.address, f.desc, String(f.m2), String(f.terreno), f.availableFrom, f.broker].every((v) => String(v ?? '').trim() !== '') && f.price > 0;
  const ok = complete();
  const ready = ok && f.photos.length > 0 && !!f.broker;
  const b = f.broker ? broker(f.broker) : null;

  /* ---------- Fotografías ---------- */
  const addFiles = (files: FileList | File[]) => {
    const rejected: string[] = [];
    const photos = f.photos.slice();
    Array.from(files).forEach((file) => {
      if (!/^image\/(jpeg|png)$/.test(file.type)) return rejected.push(file.name + ' (formato no permitido)');
      if (file.size > MAX_MB * 1024 * 1024) return rejected.push(`${file.name} (pesa más de ${MAX_MB} MB)`);
      if (photos.length >= MAX_PHOTOS) return rejected.push(`${file.name} (límite de ${MAX_PHOTOS} fotos)`);
      const url = URL.createObjectURL(file);
      photos.push({ src: url, label: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') });
    });
    update({ photos });
    clear('p-files-btn');
    if (rejected.length) toast('No se agregaron: ' + rejected.join(', ') + '.');
  };
  const movePhoto = (from: number, to: number) => {
    const photos = f.photos.slice();
    const [item] = photos.splice(from, 1);
    photos.splice(to, 0, item);
    update({ photos });
  };

  /* ---------- Amenidades ---------- */
  const addAmenity = () => {
    const v = newAmen.trim().replace(/\s+/g, ' ');
    const exists = [...Z.AMENITIES, ...custom].some((a) => norm(a) === norm(v));
    const msg = !v ? 'Escribe el nombre de la amenidad.' : exists ? 'Esa amenidad ya está en la lista.' : '';
    if (msg) { setErrors((x) => ({ ...x, 'p-new-amen': msg })); document.getElementById('p-new-amen')?.focus(); return; }
    const name = cap(v);
    setCustom([...custom, name]);
    update({ amenities: [...f.amenities, name] });
    setNewAmen('');
    clear('p-new-amen');
    toast(`Se agregó «${name}» a esta propiedad.`);
    document.getElementById('p-new-amen')?.focus();
  };

  /* ---------- Ubicación: las coordenadas se leen del enlace de Google Maps con JavaScript ---------- */
  const locate = () => {
    const url = mapsUrl.trim();
    const fail = (text: string) => { setMapsMsg({ ok: false, text }); document.getElementById('p-maps')?.focus(); };
    if (!url) return fail('Pega el enlace de Google Maps de la casa.');
    setLocating(true);
    const r = coordenadasDeMaps(url);
    setLocating(false);
    if (!r) return fail('No encontramos coordenadas en ese enlace. Abre la casa en Google Maps en la computadora y copia el enlace completo de la barra de direcciones (trae «@latitud,longitud»), o escribe «21.1290, -86.8467».');
    update({ lat: r.lat, lng: r.lng });
    setMapsMsg({ ok: true, text: 'Ubicación guardada · ' + r.lat.toFixed(6) + ', ' + r.lng.toFixed(6) });
  };
  const located = f.lat != null && f.lng != null;
  const bbox = located ? [f.lng! - 0.004, f.lat! - 0.004, f.lng! + 0.004, f.lat! + 0.004].join(',') : '';

  /* ---------- Guardar ---------- */
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const extra: ExtraError[] = [];
    if (priceText.trim() && !f.price) extra.push({ id: 'p-price', msg: 'El precio debe ser mayor a cero.' });
    if (f.visibility === 'publicada' && !f.photos.length) extra.push({ id: 'p-files-btn', msg: 'Agrega al menos una fotografía para publicar la casa, o guárdala como borrador.' });
    if (f.visibility === 'publicada' && f.status === 'borrador') extra.push({ id: 'p-status', msg: 'Una casa en borrador no puede publicarse. Cambia el estado o la visibilidad.' });
    if (!check(formRef.current!, extra)) { setFormError(true); setInvalidBar(true); return; }
    setFormError(false);
    setInvalidBar(false);
    const data: Draft = {
      ...f, street: f.address.split(',')[0], maintenance: f.maintenance || 'No aplica', amenities: f.amenities.slice(), photos: f.photos.slice(),
      furnished: f.amenities.includes('Amueblada') ? 'Amueblada' : src && src.furnished !== 'Amueblada' ? src.furnished : 'Sin amueblar',
    };
    if (src) {
      const prevBroker = src.broker;
      Object.assign(src, data);
      if (src.visibility === 'publicada' && !src.published) src.published = TODAY();
      if (prevBroker !== src.broker) {
        upcoming((a) => a.property === src.id).forEach((a) => (a.broker = src.broker));
        log(`Lucía asignó ${src.name} a ${broker(src.broker).name}.`, src.id);
      }
      log(`Lucía actualizó la información de ${src.name}.`, src.id);
      toast('Se guardaron los cambios de ' + src.name + '.');
      rerender();
      navigate('/propiedades/' + src.id);
    } else {
      const nid = 'ZUG-' + String(D.nextNumbers.property++).padStart(3, '0');
      const p: Property = { ...(data as Property), id: nid, published: f.visibility === 'publicada' ? TODAY() : '', updated: 'Hoy', updatedAt: Date.now() };
      D.properties.push(p);
      log(`Lucía creó ${p.name} (${nid}) y la asignó a ${broker(p.broker).name}.`, nid);
      toast(p.name + ' se creó' + (p.visibility === 'publicada' ? ' y ya está publicada.' : ' como ' + p.visibility + '.'));
      rerender();
      navigate('/propiedades/' + nid);
    }
  };

  const title = editing ? 'Editar ' + src!.name : 'Una nueva casa en Zugar.';
  const num = (list: number[]) => list.map(String);
  const req = (id: string, label: string, el: React.ReactNode, cls = '', hint?: string) => (
    <div className={'field' + (cls ? ' ' + cls : '')}>
      <label className="field__label" htmlFor={id} id={id === 'p-price' ? 'price-label' : undefined}>{label}</label>
      {el}
      {hint && <p className="field__hint">{hint}</p>}
      <FieldError errors={errors} id={id} />
    </div>
  );
  const inp = (id: string, key: keyof Draft, extra: Record<string, unknown> = {}) => (
    <input className="input" id={id} value={String(f[key] ?? '')} onChange={(e) => { clear(id); update({ [key]: e.target.value } as Partial<Draft>); }} {...extra} {...err(errors, id)} />
  );
  const numInp = (id: string, key: 'm2' | 'terreno' | 'age', extra: Record<string, unknown> = {}) => (
    <input className="input" id={id} data-number inputMode="numeric" value={String(f[key] ?? '')} {...extra} {...err(errors, id)}
      onChange={(e) => { clear(id); update({ [key]: e.target.value === '' ? '' : numberValue(e.target.value) || e.target.value } as Partial<Draft>); }} />
  );

  return (
    <>
      <Crumbs items={editing ? [['Administración', '/resumen'], ['Propiedades', '/propiedades'], [src!.id, '/propiedades/' + src!.id], ['Editar']] : [['Administración', '/resumen'], ['Propiedades', '/propiedades'], ['Nueva propiedad']]} />
      <PageHead title={title} sub={editing ? `Actualiza la información, fotografías y amenidades de ${src!.name}.` : 'Alta de propiedad · Datos completos para su primera publicación.'} />
      {editing ? (
        <div className="notice notice--info"><Icon id="info" /><span>Estás editando {src!.id}. Los cambios se publicarán al guardar; las citas y el broker se conservan.</span></div>
      ) : (
        <div className="notice notice--warn"><Icon id="file-edit" /><span>Nueva propiedad · <span id="notice-name">{f.name || 'Sin nombre'}</span>. Revisa los datos antes de crear y publicar el registro.</span></div>
      )}
      {formError && (
        <div className="notice notice--error" id="form-errors" role="alert">
          <Icon id="alert" />
          <div><strong>Revisa {Object.keys(errors).length === 1 ? 'el campo marcado' : `los ${Object.keys(errors).length} campos marcados`}</strong>Tus datos se conservan; corrige lo señalado y vuelve a intentarlo.</div>
        </div>
      )}
      <form id="prop-form" ref={formRef} noValidate onSubmit={onSubmit}>
        <div className="form-layout">
          <div className="stack">
            <section className="card card--pad form-section" aria-labelledby="s1">
              <h2 id="s1">01 / Información inmobiliaria</h2>
              <div className="form-grid">
                {req('p-name', 'Nombre de la propiedad *', inp('p-name', 'name', { required: true, placeholder: 'Por ejemplo: Casa Ceiba' }))}
                {req('p-type', 'Tipo de inmueble *', <select className="select" id="p-type" required value={f.type} onChange={(e) => update({ type: e.target.value })}><Options list={Z.TYPES} /></select>)}
                {/* Zona y ciudad libres: la casa puede estar en cualquier parte del mundo (las zonas ya usadas salen como sugerencia) */}
                {req('p-zone', 'Zona o colonia *', <><input className="input" id="p-zone" required maxLength={80} list="p-zones" placeholder="Por ejemplo: Arbolada, Polanco, Brickell" value={f.zone} onChange={(e) => { clear('p-zone'); update({ zone: e.target.value }); }} {...err(errors, 'p-zone')} /><datalist id="p-zones">{Z.ZONES.map((z) => <option key={z} value={z} />)}</datalist></>)}
                {req('p-city', 'Ciudad, estado y país *', inp('p-city', 'city', { required: true, placeholder: 'Cancún, Quintana Roo, México' }))}
                {req('p-address', 'Dirección completa *', inp('p-address', 'address', { required: true, placeholder: 'Calle, número, residencial y código postal', autoComplete: 'off' }), 'span-all')}
                <div className="field span-all">
                  <label className="field__label" htmlFor="p-maps">Enlace de Google Maps</label>
                  <div className="locate-row">
                    <input className="input" id="p-maps" inputMode="url" autoComplete="off" placeholder="https://www.google.com/maps/@21.1290,-86.8467,17z" aria-describedby="p-maps-hint" value={mapsUrl}
                      aria-invalid={mapsMsg && !mapsMsg.ok ? true : undefined} onChange={(e) => setMapsUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); locate(); } }} />
                    <button className="btn btn--secondary" type="button" disabled={locating} onClick={locate}><Icon id="pin" />Ubicar</button>
                  </div>
                  <p className="field__hint" id="p-maps-hint" aria-live="polite">
                    {mapsMsg && mapsMsg.text !== 'Buscando la ubicación…' ? <><Icon id={mapsMsg.ok ? 'check' : 'alert'} className="icon--sm" />{mapsMsg.text}</>
                      : mapsMsg ? mapsMsg.text
                      : located ? <><Icon id="check" className="icon--sm" />Ubicación guardada · {f.lat!.toFixed(6)}, {f.lng!.toFixed(6)}</>
                      : 'Pega el enlace de Google Maps (el de la barra de direcciones, con «@latitud,longitud») o escribe las coordenadas. En el sitio solo se muestra la zona aproximada.'}
                  </p>
                  {located && (
                    <div className="locate-preview" id="p-maps-preview">
                      <iframe title={'Vista previa de la ubicación de ' + (f.name || 'la propiedad')} loading="lazy"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(f.lat + ',' + f.lng)}`} />
                    </div>
                  )}
                </div>
                {req('p-desc', 'Descripción pública *', <textarea className="textarea" id="p-desc" required placeholder="Cuenta cómo se vive en esta casa." value={f.desc} onChange={(e) => { clear('p-desc'); update({ desc: e.target.value }); }} {...err(errors, 'p-desc')} />, 'span-all', 'Aparece en la publicación del sitio.')}
              </div>
              <div className="form-grid form-grid--3" style={{ marginTop: '1rem' }}>
                {req('p-m2', 'Construcción (m²) *', numInp('p-m2', 'm2', { required: true }))}
                {req('p-terreno', 'Terreno (m²) *', numInp('p-terreno', 'terreno', { required: true }))}
                {req('p-age', 'Antigüedad (años)', numInp('p-age', 'age', { placeholder: '0 si es nueva' }))}
                {req('p-rec', 'Recámaras *', <select className="select" id="p-rec" required value={String(f.rec)} onChange={(e) => update({ rec: +e.target.value })}><Options list={num([1, 2, 3, 4, 5, 6])} /></select>)}
                {req('p-banos', 'Baños *', <select className="select" id="p-banos" required value={String(f.banos)} onChange={(e) => update({ banos: +e.target.value })}><Options list={num([1, 1.5, 2, 2.5, 3, 3.5, 4, 5])} /></select>)}
                {req('p-est', 'Estacionamientos', <select className="select" id="p-est" value={String(f.est)} onChange={(e) => update({ est: +e.target.value })}><Options list={num([0, 1, 2, 3, 4])} /></select>)}
              </div>
            </section>

            <section className="card card--pad form-section" aria-labelledby="s2">
              <h2 id="s2">02 / Operación y disponibilidad</h2>
              <div className="form-grid">
                {req('p-op', 'Operación *', <select className="select" id="p-op" required value={f.op} onChange={(e) => update({ op: e.target.value as Draft['op'] })}><Options list={[['renta', 'Renta'], ['venta', 'Venta']]} /></select>)}
                {req('p-price', f.op === 'renta' ? 'Precio mensual (MXN) *' : 'Precio de venta (MXN) *',
                  <input className="input" id="p-price" required data-number inputMode="numeric" placeholder="$0" value={priceText} {...err(errors, 'p-price')}
                    onChange={(e) => { clear('p-price'); setPriceText(e.target.value); update({ price: numberValue(e.target.value) }); }} />)}
                {req('p-status', 'Estado *', <select className="select" id="p-status" required value={f.status} {...err(errors, 'p-status')}
                  onChange={(e) => { clear('p-status'); update(e.target.value === 'borrador' ? { status: e.target.value, visibility: 'borrador' } : { status: e.target.value }); }}>
                  <Options list={Object.keys(Z.STATUS).map((k): [string, string] => [k, Z.STATUS[k].label])} /></select>)}
                {req('p-from', 'Disponible desde *', <input className="input" id="p-from" type="date" required value={f.availableFrom} onChange={(e) => { clear('p-from'); update({ availableFrom: e.target.value }); }} {...err(errors, 'p-from')} />)}
                {req('p-maint', 'Mantenimiento', inp('p-maint', 'maintenance'))}
                {req('p-deposit', 'Depósito (MXN)', <input className="input" id="p-deposit" data-number inputMode="numeric" placeholder="$0" value={depositText} {...err(errors, 'p-deposit')}
                  onChange={(e) => { clear('p-deposit'); setDepositText(e.target.value); update({ deposit: numberValue(e.target.value) }); }} />)}
              </div>
              <p className="form-note" id="op-note">{f.op === 'renta' ? 'Renta a largo plazo · Contrato mínimo de 12 meses.' : 'Venta · Acepta contado, crédito bancario e Infonavit.'}</p>
            </section>

            <section className="card card--pad form-section" id="fotografias" aria-labelledby="s3">
              <h2 id="s3">03 / Fotografías</h2>
              <p className="small muted" style={{ marginBottom: '1rem' }} id="photo-meta">
                {f.photos.length ? `${f.photos.length} fotografía${f.photos.length === 1 ? '' : 's'} · La primera imagen será la portada. Arrastra para ordenar.` : 'Aún no hay fotografías. La primera que agregues será la portada.'}
              </p>
              <div className="photo-tiles" id="photo-tiles">
                {f.photos.map((ph, i) => (
                  <figure key={ph.src + i} className={'photo-tile' + (dragIndex === i ? ' is-dragging' : '') + (overIndex === i ? ' is-over' : '')} draggable
                    onDragStart={(e) => { setDragIndex(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); }}
                    onDragOver={(e) => { if (dragIndex == null) return; e.preventDefault(); setOverIndex(i); }}
                    onDrop={(e) => { if (dragIndex == null) return; e.preventDefault(); movePhoto(dragIndex, i); setDragIndex(null); setOverIndex(null); }}
                    onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}>
                    <Photo src={ph.src} alt={ph.label} />
                    <figcaption>
                      <span>{i === 0 ? 'Portada · ' : ''}{ph.label}</span>
                      <span>
                        {i > 0 && (
                          <button className="icon-btn" type="button" aria-label={`Mover ${ph.label} una posición antes`} title="Mover antes"
                            onClick={() => { movePhoto(i, i - 1); focusAfter.current = i - 1 > 0 ? `[aria-label="Mover ${ph.label} una posición antes"]` : `[aria-label="Quitar fotografía ${ph.label}"]`; }}>
                            <Icon id="left" className="icon--sm" />
                          </button>
                        )}
                        <button className="icon-btn icon-btn--danger" type="button" aria-label={'Quitar fotografía ' + ph.label} title="Quitar"
                          onClick={() => { update({ photos: f.photos.filter((_, j) => j !== i) }); toast(`Se quitó la fotografía «${ph.label}».`); focusAfter.current = '#photo-tiles button, #p-files-btn'; }}>
                          <Icon id="trash" className="icon--sm" />
                        </button>
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <div className={'dropzone' + (dropOver ? ' is-over' : '')} id="dropzone"
                onDragOver={(e) => { if (dragIndex != null) return; e.preventDefault(); setDropOver(true); }}
                onDragLeave={() => setDropOver(false)}
                onDrop={(e) => { if (dragIndex != null) return; e.preventDefault(); setDropOver(false); addFiles(e.dataTransfer.files); }}>
                <div><strong><Icon id="upload" />Agregar fotografías</strong><p>JPG o PNG · Hasta {MAX_MB} MB por imagen · Máximo {MAX_PHOTOS} fotos. También puedes soltarlas aquí.</p></div>
                <div className="field">
                  <input ref={fileRef} type="file" id="p-files" accept="image/jpeg,image/png" multiple className="sr-only" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
                  <button className="btn btn--secondary" type="button" id="p-files-btn" onClick={() => fileRef.current?.click()} {...err(errors, 'p-files-btn')}>Seleccionar archivos</button>
                  <FieldError errors={errors} id="p-files-btn" />
                </div>
              </div>
            </section>

            <section className="card card--pad form-section" id="amenidades" aria-labelledby="s4">
              <h2 id="s4">04 / Amenidades y equipamiento</h2>
              <fieldset>
                <legend className="sr-only">Amenidades de esta propiedad</legend>
                <div className="amenity-grid" id="amenity-grid">
                  {[...Z.AMENITIES, ...custom].map((a) => {
                    const isCustom = !Z.AMENITIES.includes(a);
                    return (
                      <label key={a} className="amenity-option">
                        <input type="checkbox" name="amenity" value={a} checked={f.amenities.includes(a)} onChange={(e) => update({ amenities: e.target.checked ? [...f.amenities, a] : f.amenities.filter((x) => x !== a) })} />
                        <span>{a}</span>
                        {isCustom && (
                          <button className="icon-btn icon-btn--danger" type="button" aria-label={'Quitar la amenidad ' + a}
                            onClick={(e) => { e.preventDefault(); setCustom(custom.filter((x) => x !== a)); update({ amenities: f.amenities.filter((x) => x !== a) }); document.getElementById('p-new-amen')?.focus(); }}>
                            <Icon id="x" className="icon--sm" />
                          </button>
                        )}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <div className="amenity-add">
                <div className="field">
                  <label className="field__label" htmlFor="p-new-amen">Agregar otra amenidad</label>
                  <input className="input" id="p-new-amen" placeholder="Por ejemplo: Paneles solares" maxLength={40} value={newAmen} {...err(errors, 'p-new-amen')}
                    onChange={(e) => { setNewAmen(e.target.value); clear('p-new-amen'); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAmenity(); } }} />
                  <FieldError errors={errors} id="p-new-amen" />
                </div>
                <button className="btn btn--secondary" type="button" onClick={addAmenity}><Icon id="plus" />Agregar</button>
              </div>
              <p className="form-note">Las amenidades se administran al registrar o editar cada propiedad.</p>
            </section>

            <div className={'card savebar' + (invalidBar ? ' is-invalid' : '')} id="savebar">
              <div>
                <strong id="save-title">
                  {invalidBar ? 'Revisa los campos marcados' : editing ? (dirty ? (ok ? 'Cambios listos para guardar' : 'Completa los campos obligatorios') : 'Sin cambios por guardar') : ready ? 'Todo listo para crear la propiedad' : 'Completa los datos para crear la propiedad'}
                </strong>
                <p>* Campos obligatorios · Revisa la información antes de publicar.</p>
              </div>
              <div className="page-actions">
                <Link className="btn btn--secondary" to={editing ? '/propiedades/' + src!.id : '/propiedades'}>Cancelar</Link>
                <button className="btn" type="submit">{editing ? 'Guardar cambios' : 'Crear y publicar'}</button>
              </div>
            </div>
          </div>

          <aside className="form-aside">
            <section className="card card--pad summary" aria-labelledby="sum-title" aria-live="polite">
              <h2 className="card__title" id="sum-title" style={{ marginBottom: '1rem' }}>Resumen</h2>
              <div id="summary">
                <Photo src={f.photos[0]?.src ?? ''} alt={f.photos[0] ? 'Portada de ' + (f.name || 'la propiedad') : ''} />
                <p className="summary__name">{f.name || 'Nombre de la propiedad'}</p>
                <p className="small muted" style={{ marginTop: '.5rem' }}>{f.zone || 'Zona'}, {(f.city || 'Ciudad').split(',')[0]}</p>
                <p className="summary__price">{f.price ? money(f.price) + (f.op === 'renta' ? ' MXN / mes' : ' MXN') : 'Precio por definir'}</p>
                <p><StatusBadge s={f.status} /></p>
                <p className="small muted" style={{ marginTop: '.75rem' }}>{f.rec} recámara{f.rec == 1 ? '' : 's'} · {f.banos} baño{f.banos == 1 ? '' : 's'}{f.m2 ? ` · ${f.m2} m²` : ''}</p>
                {b && <p className="small muted" style={{ marginTop: '.25rem' }}>Broker: {b.name}</p>}
              </div>
            </section>
            <section className="card card--pad" aria-labelledby="ab-title">
              <h2 className="card__title" id="ab-title" style={{ marginBottom: '1rem' }}>Broker asignado</h2>
              <div className="field">
                <label className="field__label" htmlFor="p-broker">Responsable *</label>
                <select className="select" id="p-broker" required value={f.broker} onChange={(e) => { clear('p-broker'); update({ broker: e.target.value }); }} {...err(errors, 'p-broker')}>
                  <Options list={brokerOptions(D.brokers, f.broker)} placeholder="Elige un broker" />
                </select>
                <p className="field__hint">Recibirá las solicitudes y coordinará las visitas de esta casa.</p>
                <FieldError errors={errors} id="p-broker" />
              </div>
            </section>
            <section className="card card--pad" aria-labelledby="ap-title">
              <h2 className="card__title" id="ap-title" style={{ marginBottom: '1rem' }}>Publicación</h2>
              <div className="field">
                <label className="field__label" htmlFor="p-vis">Visibilidad *</label>
                <select className="select" id="p-vis" required value={f.visibility} onChange={(e) => update({ visibility: e.target.value as Draft['visibility'] })}>
                  <Options list={[['publicada', 'Publicada'], ['pausada', 'Pausada'], ['borrador', 'Borrador']]} />
                </select>
                <p className="field__hint" id="vis-hint">
                  {{ publicada: 'La casa aparecerá en el catálogo de Zugar al guardar.', pausada: 'La casa se guarda, pero no aparece en el catálogo.', borrador: 'Se guarda como borrador; nadie la verá hasta publicarla.' }[f.visibility]}
                </p>
              </div>
              <ul className="checklist" id="checklist">
                {([[ok, 'Información completa'], [f.photos.length > 0, f.photos.length ? `${f.photos.length} fotografía${f.photos.length === 1 ? '' : 's'} cargada${f.photos.length === 1 ? '' : 's'}` : 'Sin fotografías cargadas'], [!!f.broker, f.broker ? 'Broker asignado' : 'Falta asignar broker']] as [boolean, string][]).map(([done, text]) => (
                  <li key={text} className={done ? 'is-done' : ''}><Icon id={done ? 'check' : 'alert'} className="icon--sm" />{text}</li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </form>
    </>
  );
}
