import { useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '../components/Icon';
import { usePageTitle } from '../lib/usePageTitle';

/** Lo que se hace en la app Homiz (sección «La app Homiz») */
const APP_FEATURES: [string, string, string][] = [
  ['chat', 'Mis solicitudes y mensajes', 'Dinos qué buscas y platica con tu asesor: te contesta y te propone casas ahí mismo, no por correo.'],
  ['cal', 'Agenda tus visitas', 'Elige el día y la hora; te confirmamos la visita y te avisamos de cualquier cambio.'],
  ['wallet', 'Tus pagos y recibos', 'Consulta tus pagarés, lo que ya pagaste, los comprobantes y los recibos de luz y agua.'],
  ['doc', 'Tu expediente', 'Contrato, depósito, ficha de entrega y pagarés en PDF, siempre a la mano.'],
  ['shield', 'Mantenimiento', 'Reporta algo de la casa con fotos y sigue cada avance hasta que quede resuelto.'],
];

const STEPS: [string, string, string, string][] = [
  ['chat', 'Cuéntanos qué buscas', 'Escuchamos tus planes, presupuesto, zonas favoritas y fecha de mudanza. Sin prisas ni compromisos.', 'Una conversación para empezar.'],
  ['home', 'Te proponemos casas', 'Seleccionamos opciones que sí encajan contigo y te explicamos precios, condiciones y ventajas de cada zona.', 'Menos ruido, mejores opciones.'],
  ['cal', 'Visitas y reservas', 'Coordinamos las visitas contigo. Si encuentras tu casa, revisamos la disponibilidad y las condiciones de reserva.', 'Todo claro antes de decidir.'],
  ['key', 'Firma y llaves', 'Te acompañamos en la revisión del contrato, la firma y la entrega del inventario y las llaves de tu nuevo hogar.', 'Acompañamiento hasta el final.'],
];

const REQUIREMENTS: [string, string, string][] = [
  ['doc', 'Tu documentación', 'Identificación oficial vigente, comprobante de domicilio y comprobantes de ingresos de los últimos 3 meses.'],
  ['shield', 'Respaldo para tu contrato', 'Aval u obligado solidario, según la propiedad. Algunas casas solicitan póliza jurídica; revisamos las opciones contigo.'],
  ['wallet', 'Pagos iniciales claros', 'Generalmente, un mes de depósito y el primer mes de renta. Cualquier costo adicional se informa antes de reservar.'],
];

const FAQ: [string, string][] = [
  ['¿Las visitas tienen costo?', 'No. Conocer las casas y recibir nuestra asesoría no tiene costo para ti. Acordamos contigo el día y la hora para que visites sin presión.'],
  ['¿Puedo rentar si vengo de otra ciudad?', 'Sí. Podemos hacer recorridos por videollamada, revisar tus documentos en línea y tener todo listo para que firmes y recibas las llaves en cuanto llegues a Cancún.'],
  ['¿Se aceptan mascotas?', 'Depende de cada propietario. En cada casa indicamos si acepta mascotas y, cuando aplica, si se solicita un depósito adicional. Si tienes mascota, te mostramos solo opciones donde sea bienvenida.'],
  ['¿Qué incluye la renta mensual?', 'Normalmente incluye el uso de la casa y, en residenciales, la cuota de mantenimiento. Luz, agua, gas e internet suelen ir por tu cuenta. Antes de reservar te entregamos el desglose por escrito.'],
  ['¿Cómo funciona la reserva de una casa?', 'Con un pago de reserva apartamos la casa mientras se revisa tu expediente. Si el propietario aprueba, ese monto se aplica a tu primer pago; si no, te lo devolvemos según lo acordado por escrito.'],
];

export function HowWeWork() {
  usePageTitle('Cómo trabajamos | Zugar Inmobiliaria');
  const [open, setOpen] = useState(0); // una respuesta abierta a la vez

  return (
    <>
      <div className="wrap">
        <nav className="breadcrumb" aria-label="Ruta de navegación">
          <ol><li><Link to="/">Inicio</Link></li><li><span aria-current="page">Cómo trabajamos</span></li></ol>
        </nav>
        <section className="split-hero" aria-labelledby="ct-titulo">
          <div>
            <span className="eyebrow">Personas antes que propiedades</span>
            <h1 id="ct-titulo">Cómo trabajamos</h1>
            <p className="split-hero__sub">Una inmobiliaria pequeña, con atención directa.</p>
            <p className="lead">En Zugar no eres un expediente más. Somos un equipo local en Cancún: escuchamos, seleccionamos y te acompañamos para que rentes o compres con tranquilidad.</p>
            <Link className="btn btn--lg" to="/propiedades"><Icon id="home" />Ver casas disponibles</Link>
            <p className="split-hero__fine">La misma persona, desde el primer hola hasta la entrega de llaves.</p>
          </div>
          <figure>
            <div className="photo"><img src="/assets/img/como-trabajamos-terraza.jpg" alt="Fila de casas con fachadas blancas y turquesa bajo un cielo despejado" loading="lazy" /></div>
            <span className="photo-tag">Hecho para vivir Cancún</span>
          </figure>
        </section>
      </div>

      <section className="section section--surface" aria-labelledby="pasos-titulo">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">Así de simple</span>
              <h2 id="pasos-titulo">Cuatro pasos. Un nuevo hogar.</h2>
            </div>
          </div>
          <ol className="process">
            {STEPS.map(([icon, title, text, claim], i) => (
              <li key={title}>
                <div className="process__top">
                  <span className="process__icon"><Icon id={icon} size="lg" /></span>
                  <span className="process__num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="process__line" aria-hidden="true" />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
                <strong>{claim}</strong>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section" aria-labelledby="req-titulo">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">Sin sorpresas</span>
              <h2 id="req-titulo">Lo que necesitas para empezar</h2>
              <p>Te ayudamos a preparar tu expediente. Los requisitos finales dependen de cada propietario.</p>
            </div>
          </div>
          <div className="req-cards">
            {REQUIREMENTS.map(([icon, title, text]) => (
              <article key={title} className="req-card"><Icon id={icon} /><h3>{title}</h3><p>{text}</p></article>
            ))}
          </div>
        </div>
      </section>

      {/* La app Homiz: lo que la persona puede hacer en ella */}
      <section className="section section--surface" aria-labelledby="app-titulo">
        <div className="wrap app-feature">
          <div>
            <span className="eyebrow">Próximamente · App Homiz</span>
            <h2 id="app-titulo">Todo tu proceso, en tu celular.</h2>
            <p className="lead">Muy pronto podrás seguir todo tu proceso desde la app Homiz. Mientras tanto, tu asesor te acompaña por correo y teléfono.</p>
          </div>
          <ul className="app-feature__list">
            {APP_FEATURES.map(([icon, title, text]) => (
              <li key={title}><span className="app-feature__icon"><Icon id={icon} /></span><div><h3>{title}</h3><p>{text}</p></div></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="faq-titulo">
        <div className="wrap faq-layout">
          <div>
            <span className="eyebrow">Hablemos con claridad</span>
            <h2 id="faq-titulo">Antes de dar el siguiente paso</h2>
            <p className="lead">Resolvemos las dudas que más nos comparten quienes buscan casa en Cancún.</p>
          </div>
          <div className="faq">
            {FAQ.map(([q, a], i) => (
              <details key={q} open={open === i} onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) setOpen(i); else if (open === i) setOpen(-1); }}>
                <summary>{q}<Icon id="plus" /></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }} aria-label="Conocer una casa">
        <div className="wrap">
          <div className="cta-band">
            <div>
              <h2>Conozcamos tu próximo hogar.</h2>
              <p>Elige una casa y te acompañamos a conocerla, a tu ritmo.</p>
            </div>
            <div className="cta-band__actions">
              <Link className="btn btn--on-dark btn--lg" to="/contacto"><Icon id="mail" />Contáctanos</Link>
              <Link className="btn btn--gold btn--lg" to="/propiedades"><Icon id="home" />Elegir una casa</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
