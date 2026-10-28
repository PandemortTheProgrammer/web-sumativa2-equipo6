import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { changePassword, forgotPassword, resetPassword, type ServiceError } from '../servicio';
import { clearSession, currentSession, lockState, loggedOut, login, passwordChanged } from '../auth';
import { Icon } from '../components/ui';

const emailError = (v: string) =>
  !v ? 'Escribe tu correo electrónico.' : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Escribe un correo válido, por ejemplo nombre@zugar.example.';

type Notice = { tone: 'info' | 'error'; icon: string; title?: string; text: string } | null;

/** Acceso al panel e «¿Olvidaste tu contraseña?» */
export function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const back = /^\/[\w/-]*(\?[\w=&-]*)?$/.test(params.get('volver') || '') ? params.get('volver')! : '/resumen';
  const resetToken = params.get('token') || '';
  // reset = enlace de correos anteriores; change = entró con la contraseña temporal y crea la suya
  const [view, setView] = useState<'login' | 'forgot' | 'reset' | 'change'>(resetToken ? 'reset' : currentSession()?.mustChange ? 'change' : 'login');
  // La contraseña temporal con la que entró (para no pedirla otra vez)
  const [tempPw, setTempPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [caps, setCaps] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(lockState().lockedFor);
  const noticeFor = (p: URLSearchParams): Notice =>
    p.get('salida') ? { tone: 'info', icon: 'check-c', text: 'Cerraste sesión correctamente. ¡Hasta pronto!' } : p.get('volver') ? { tone: 'info', icon: 'info', text: 'Inicia sesión para continuar en el panel.' } : null;
  const [info, setInfo] = useState<Notice>(noticeFor(params));
  useEffect(() => setInfo(noticeFor(params)), [params.toString()]); // al cerrar sesión llega ?salida=1 con el acceso ya abierto
  const [error, setError] = useState<Notice>(null);
  const [forgotEmail, setForgotEmail] = useState('');
  const pwRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loggedOut.value = false;
    document.body.classList.add('login-page');
    return () => document.body.classList.remove('login-page');
  }, []);
  const prevView = useRef(view);
  useEffect(() => {
    document.title = ({ forgot: 'Recuperar contraseña', reset: 'Nueva contraseña', change: 'Crea tu contraseña', login: 'Iniciar sesión' }[view]) + ' | Panel administrativo de Zugar';
    if (prevView.current === view) return; // solo al cambiar de vista, no al abrir la página
    prevView.current = view;
    (view === 'forgot' ? document.getElementById('forgot-title') : view === 'change' ? document.getElementById(tempPw ? 'new-password' : 'temp-password') : emailRef.current)?.focus();
  }, [view]);

  // Bloqueo temporal tras varios intentos: cuenta regresiva
  useEffect(() => {
    if (!locked) return;
    const t = setTimeout(() => setLocked(lockState().lockedFor), 1000);
    return () => clearTimeout(t);
  }, [locked]);

  if (currentSession() && view !== 'change') return <Navigate to={back} replace />;

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const errs: Record<string, string> = {};
    const em = emailError(email.trim());
    if (em) errs.email = em;
    const pw = password ? (password.length < 8 ? 'La contraseña tiene al menos 8 caracteres.' : '') : 'Escribe tu contraseña.';
    if (pw) errs.password = pw;
    setErrors(errs);
    if (errs.email) return emailRef.current?.focus();
    if (errs.password) return pwRef.current?.focus();

    setBusy(true);
    const r = await login(email, password, remember);
    setBusy(false);
    if (r.ok && r.user.mustChange) {
      // Entró con la contraseña temporal del correo: antes de seguir crea la suya
      setTempPw(password); setPassword(''); setNewPw(''); setNewPw2(''); setErrors({});
      return setView('change');
    }
    if (r.ok) return navigate(back, { replace: true });
    if (r.error === 'locked') return setLocked(r.lockedFor);
    if (r.error === 'noaccess') {
      setError({ tone: 'error', icon: 'alert', title: 'Esta cuenta no tiene acceso al panel', text: 'Las cuentas de clientes e inquilinos entran desde la app Homiz.' });
      setPassword('');
      return emailRef.current?.focus();
    }
    setError({
      tone: 'error', icon: 'alert', title: 'Correo o contraseña incorrectos',
      text: 'Revisa tus datos e inténtalo de nuevo.' + (r.left <= 2 ? ` Te queda${r.left === 1 ? '' : 'n'} ${r.left} intento${r.left === 1 ? '' : 's'} antes de un bloqueo temporal.` : ''),
    });
    setPassword('');
    pwRef.current?.focus();
  };

  const onForgot = (e: FormEvent) => {
    e.preventDefault();
    const em = emailError(forgotEmail.trim());
    setErrors(em ? { 'forgot-email': em } : {});
    if (em) return;
    forgotPassword(forgotEmail);
    // De vuelta al acceso con el correo ya escrito: entra con la contraseña temporal
    setEmail(forgotEmail.trim()); setPassword(''); setError(null);
    setInfo({ tone: 'info', icon: 'check-c', text: `Si ${forgotEmail.trim()} está registrado, te enviamos una contraseña temporal (revisa también el correo no deseado). Escríbela aquí: al entrar te pediremos crear la tuya.` });
    setView('login');
    setTimeout(() => pwRef.current?.focus(), 0);
  };

  /* Nueva contraseña: tras entrar con la temporal (change) o desde el enlace de correos anteriores (reset) */
  const onReset = async (e: FormEvent) => {
    e.preventDefault();
    const rules = !newPw ? 'Escribe tu nueva contraseña.' : newPw.length < 8 ? 'La contraseña debe tener al menos 8 caracteres.'
      : !/[A-ZÁÉÍÓÚÑ]/.test(newPw) ? 'La contraseña debe incluir al menos una mayúscula.' : !/[a-záéíóúñ]/.test(newPw) ? 'La contraseña debe incluir al menos una minúscula.'
      : !/\d/.test(newPw) ? 'La contraseña debe incluir al menos un número.' : '';
    const errs: Record<string, string> = {};
    if (view === 'change' && !tempPw) errs['temp-password'] = 'Escribe la contraseña temporal del correo.';
    if (rules) errs['new-password'] = rules;
    else if (newPw2 !== newPw) errs['new-password2'] = 'Las contraseñas no coinciden.';
    setErrors(errs);
    if (Object.keys(errs).length) return document.getElementById(Object.keys(errs)[0])?.focus();
    setBusy(true);
    try {
      if (view === 'change') {
        await changePassword(tempPw, newPw);
        passwordChanged();
        setTempPw(''); setNewPw(''); setNewPw2('');
        return navigate(back, { replace: true });
      }
      const r = await resetPassword(resetToken, newPw);
      setInfo({ tone: 'info', icon: 'check-c', text: r.message });
      setError(null);
      setNewPw(''); setNewPw2('');
      setView('login');
      navigate('/login', { replace: true });
    } catch (err) {
      const x = err as ServiceError;
      setError({ tone: 'error', icon: 'alert', title: 'No pudimos cambiar tu contraseña', text: x?.mensaje || (view === 'change' ? 'Inténtalo de nuevo.' : 'El enlace ya no es válido. Pide uno nuevo con «¿Olvidaste tu contraseña?».') });
    } finally {
      setBusy(false);
    }
  };

  const fieldErr = (id: string) =>
    errors[id] ? <p className="field__error" id={id + '-error'}><Icon id="alert" className="icon--sm" />{errors[id]}</p> : null;
  const inv = (id: string) => (errors[id] ? { 'aria-invalid': true as const, 'aria-describedby': id + '-error' } : {});
  const shown = locked ? { tone: 'error' as const, icon: 'lock', title: 'Demasiados intentos', text: `Por seguridad, espera ${locked} segundo${locked === 1 ? '' : 's'} antes de intentarlo de nuevo.` } : error;

  return (
    <div className="login">
      <aside className="login__side" aria-label="Zugar administración">
        <a className="brand login__brand" href="/" aria-label="Inmobiliaria Zugar, ir al sitio">
          <img className="brand__logo" src="/assets/img/logo-zugar-blanco-1200.png" alt="Inmobiliaria Zugar" width="1200" height="492" />
          <span className="brand__tag">Administración · Cancún</span>
        </a>
        <div className="login__quote">
          <p className="login__eyebrow">Panel administrativo</p>
          <p className="login__title">Todo en su lugar.</p>
          <p>Propiedades, personas, brokers y citas en un mismo espacio, para que cada visita llegue bien acompañada.</p>
        </div>
        <div className="photo login__photo"><img src="/assets/img/login-panel.jpg" alt="Torres residenciales al atardecer" loading="lazy" /></div>
        <p className="login__foot">Casas para vivir Cancún.</p>
      </aside>

      <main className="login__main" id="contenido">
        <div className="login__card">
          {view === 'reset' || view === 'change' ? (
            <section id="view-reset" aria-labelledby="reset-title">
              <h1 id="reset-title" tabIndex={-1}>{view === 'change' ? 'Crea tu contraseña' : 'Crea tu nueva contraseña'}</h1>
              <p className="login__lead">{view === 'change' ? 'Entraste con una contraseña temporal. Antes de continuar, crea la tuya: ' : ''}Usa al menos 8 caracteres, con una mayúscula, una minúscula y un número.</p>
              {error && <div className="notice notice--error" role="alert"><Icon id={error.icon} /><div><strong>{error.title}</strong>{error.text}</div></div>}
              <form id="reset-form" noValidate onSubmit={onReset}>
                {view === 'change' && !tempPw && (
                  // Volvió a abrir el panel sin haberla creado: se pide la temporal otra vez
                  <div className="field">
                    <label className="field__label" htmlFor="temp-password">Contraseña temporal del correo</label>
                    <input className="input" id="temp-password" type="password" autoComplete="current-password" onChange={(e) => setTempPw(e.target.value)} {...inv('temp-password')} />
                    {fieldErr('temp-password')}
                  </div>
                )}
                <div className="field">
                  <label className="field__label" htmlFor="new-password">Nueva contraseña</label>
                  <input className="input" id="new-password" type="password" autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} {...inv('new-password')} />
                  {fieldErr('new-password')}
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="new-password2">Confirma la contraseña</label>
                  <input className="input" id="new-password2" type="password" autoComplete="new-password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} {...inv('new-password2')} />
                  {fieldErr('new-password2')}
                </div>
                <button className="btn btn--block" type="submit" disabled={busy}><Icon id="lock" />{busy ? 'Guardando…' : view === 'change' ? 'Guardar y entrar al panel' : 'Guardar contraseña'}</button>
              </form>
              <button className="link link--muted login__back" type="button" style={{ marginTop: '1rem' }} onClick={() => { if (view === 'change') clearSession(); setTempPw(''); setErrors({}); setError(null); setView('login'); navigate('/login', { replace: true }); }}>
                <Icon id="left" className="icon--sm" />Volver a iniciar sesión
              </button>
            </section>
          ) : view === 'login' ? (
            <section id="view-login" aria-labelledby="login-title">
              <h1 id="login-title">Inicia sesión</h1>
              <p className="login__lead">Entra con tu correo de Zugar para administrar el inventario y la agenda.</p>
              {info && <div className="notice notice--info" id="login-info" role="status"><Icon id={info.icon} /><span>{info.text}</span></div>}
              {shown && (
                <div className="notice notice--error" id="login-error" role="alert">
                  <Icon id={shown.icon} />
                  <div><strong>{shown.title}</strong>{shown.text}</div>
                </div>
              )}
              <form id="login-form" noValidate onSubmit={onLogin}>
                <div className="field">
                  <label className="field__label" htmlFor="email">Correo electrónico</label>
                  <input ref={emailRef} className="input" id="email" name="email" type="email" autoComplete="username" placeholder="nombre@zugar.example" spellCheck={false}
                    value={email} onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, email: '' })); }} {...inv('email')} />
                  {fieldErr('email')}
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="password">Contraseña</label>
                  <div className="password">
                    <input ref={pwRef} className="input" id="password" name="password" type={showPw ? 'text' : 'password'} autoComplete="current-password"
                      value={password} onChange={(e) => { setPassword(e.target.value); setErrors((x) => ({ ...x, password: '' })); }}
                      onKeyDown={(e) => setCaps(e.getModifierState?.('CapsLock'))} onKeyUp={(e) => setCaps(e.getModifierState?.('CapsLock'))} {...inv('password')} />
                    <button className="icon-btn password__toggle" type="button" id="toggle-password" aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPw} aria-controls="password"
                      onClick={() => { setShowPw(!showPw); pwRef.current?.focus(); }}>
                      <Icon id={showPw ? 'eye-off' : 'eye'} />
                    </button>
                  </div>
                  {caps && <p className="field__hint" id="caps">Bloq Mayús está activado.</p>}
                  {fieldErr('password')}
                </div>
                <div className="login__row">
                  <label className="check"><input type="checkbox" id="remember" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Mantener la sesión iniciada</label>
                  <button className="link" type="button" onClick={() => { setForgotEmail(email); setErrors({}); setView('forgot'); }}>¿Olvidaste tu contraseña?</button>
                </div>
                <button className="btn btn--block" type="submit" id="login-submit" disabled={busy || !!locked}><Icon id="lock" />{busy ? 'Entrando…' : 'Entrar al panel'}</button>
              </form>
            </section>
          ) : (
            <section id="view-forgot" aria-labelledby="forgot-title">
              <button className="link link--muted login__back" type="button" onClick={() => { setErrors({}); setView('login'); }}><Icon id="left" className="icon--sm" />Volver a iniciar sesión</button>
              <h1 id="forgot-title" tabIndex={-1}>Recupera tu acceso</h1>
              <p className="login__lead">Escribe tu correo y te enviaremos una contraseña temporal. Entra con ella y te pediremos crear la tuya.</p>
              <form id="forgot-form" noValidate onSubmit={onForgot}>
                <div className="field">
                  <label className="field__label" htmlFor="forgot-email">Correo electrónico</label>
                  <input className="input" id="forgot-email" type="email" autoComplete="email" placeholder="nombre@zugar.example" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} {...inv('forgot-email')} />
                  {fieldErr('forgot-email')}
                </div>
                <button className="btn btn--block" type="submit">Enviarme una contraseña temporal</button>
              </form>
            </section>
          )}
          <p className="login__help">¿Problemas para entrar? Escribe a <a href="mailto:soporte@zugar.example">soporte@zugar.example</a></p>
        </div>
        <p className="login__public"><a href="/"><Icon id="left" className="icon--sm" />Volver al sitio público</a></p>
      </main>
    </div>
  );
}
