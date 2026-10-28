import { Link } from 'react-router';
import { Icon } from './Icon';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="site-footer__brand">
          <p className="footer-logo">
            <img src="/assets/img/logo-zugar-blanco-1200.png" alt="Inmobiliaria Zugar" width="1200" height="492" loading="lazy" />
          </p>
          <p className="site-footer__claim">Casas para vivir Cancún.</p>
        </div>
        <div className="site-footer__cols">
          <div className="site-footer__about">
            <p className="footer-title">Zugar Inmobiliaria</p>
            <p>Tu próximo hogar en Cancún, con alguien que te acompaña de principio a fin. Casas en renta y venta, con atención directa.</p>
            <ul className="social">
              <li>
                <a href="https://www.instagram.com/zugarinmobiliaria" target="_blank" rel="noopener" aria-label="Instagram de Zugar">
                  <Icon id="ig" />
                </a>
              </li>
              <li>
                <a href="https://www.facebook.com/zugarinmobiliaria" target="_blank" rel="noopener" aria-label="Facebook de Zugar">
                  <Icon id="fb" />
                </a>
              </li>
            </ul>
          </div>
          <nav aria-label="Enlaces del pie de página">
            <p className="footer-title">Encuentra tu lugar</p>
            <ul>
              <li><Link to="/propiedades?operacion=renta">Casas en renta</Link></li>
              <li><Link to="/propiedades?operacion=venta">Casas en venta</Link></li>
              <li><Link to="/como-trabajamos">Cómo trabajamos</Link></li>
              <li><Link to="/contacto">Contáctanos</Link></li>
            </ul>
          </nav>
          <div>
            <p className="footer-title">Cerca de ti</p>
            <ul>
              <li><a href="tel:+529985550142"><Icon id="phone" size="sm" />+52 998 555 0142</a></li>
              <li><a href="mailto:hola@zugar.mx"><Icon id="mail" size="sm" />hola@zugar.mx</a></li>
              <li><span><Icon id="clock" size="sm" />Lun–vie 9:00–18:00 · Sáb 10:00–14:00</span></li>
              <li><span><Icon id="pin" size="sm" />Cancún, Quintana Roo · Atención en línea y en cada casa</span></li>
            </ul>
          </div>
        </div>
        <div className="site-footer__bottom">
          <p>© 2026 Zugar Inmobiliaria. Todos los derechos reservados.</p>
          <ul>
            <li><Link to="/contacto#aviso-privacidad">Aviso de privacidad</Link></li>
            <li><Link to="/contacto#aviso-privacidad">Términos de uso</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
