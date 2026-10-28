import { Link } from 'react-router';
import { useCatalog } from '../components/CatalogProvider';
import { LAST_CONTACT_KEY } from '../components/HouseVisitForm';
import { Icon } from '../components/Icon';
import { fichaOf, IMG, photoOf, priceUnit } from '../lib/catalog';
import { money } from '../lib/format';
import { usePageTitle } from '../lib/usePageTitle';

interface LastContact {
  nombre?: string;
  motivo?: string;
  folio?: string;
  fecha?: string;
  hora?: string;
  asesor?: string;
  slug?: string;
}

function lastContact(): LastContact {
  try {
    return JSON.parse(sessionStorage.getItem(LAST_CONTACT_KEY) || '{}');
  } catch {
    return {};
  }
}

/** Confirmación después de solicitar una visita desde la ficha de una casa. */
export function Thanks() {
  usePageTitle('¡Gracias! | Zugar Inmobiliaria');
  const { bySlug } = useCatalog();
  const last = lastContact();
  const house = bySlug[last.slug || 'casa-huayacan'];
  const advisor = last.asesor || house?.asesor || 'Mariana Solís';
  const first = advisor.split(' ')[0];
  const name = last.nombre?.split(' ')[0];

  const lead =
    name && last.motivo === 'visita' && last.fecha
      ? `Gracias, ${name}. Tu solicitud para visitar la casa el ${last.fecha.toLowerCase()}${last.hora ? ` a las ${last.hora} h` : ''} fue enviada a ${advisor}. Te escribirá para confirmarla.${last.folio ? ` Tu folio es ${last.folio}.` : ''}`
      : `${name ? `Gracias, ${name}. ` : ''}Tu mensaje fue enviado a ${advisor}. Te contactará al correo o teléfono que compartiste para ayudarte con esta casa.`;

  return (
    <div className="thanks">
      <div className="wrap">
        <div className="thanks__card">
          <span className="thanks__icon"><Icon id="check" /></span>
          <h1>¡Tu próximo hogar está más cerca!</h1>
          <p>{lead}</p>
          {house && (
            <div className="mini-home">
              <div className="photo"><img src={photoOf(house)} alt={`${house.name} en ${house.zona}, Cancún`} loading="lazy" /></div>
              <div>
                <strong>{house.name}</strong>
                <span>Cancún, Quintana Roo{house.code ? ` · Clave ${house.code}` : ''}</span>
                <p className="mini-price">{money(house.price)} {priceUnit(house)}</p>
              </div>
            </div>
          )}
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
          <div className="next-box">
            <strong>¿Qué sigue?</strong>
            <p>Ten a la mano tus horarios disponibles para coordinar una visita. Así suele ser el proceso:</p>
            <ol>
              <li>{first} te escribe en menos de un día hábil.</li>
              <li>Acuerdan día y hora para conocer la casa.</li>
              <li>Resuelven juntos dudas de precio, crédito y documentos.</li>
            </ol>
          </div>
          <div className="thanks__actions">
            <Link className="btn btn--lg" to={house ? fichaOf(house) : '/propiedades'}><Icon id="left" />Volver a la propiedad</Link>
            <Link className="btn btn--secondary btn--lg" to="/propiedades"><Icon id="home" />Ver más casas</Link>
          </div>
          <p className="thanks__foot">¿No recibiste respuesta? Llámanos al <a href="tel:+529985550142">+52 998 555 0142</a>.</p>
        </div>
      </div>
    </div>
  );
}
