/* ==========================================================================
   Sesión del panel (SIMULADA, sin servidor).
   Las cuentas de demostración están aquí; la sesión se guarda en sessionStorage
   (o en localStorage si se marca «Mantener la sesión iniciada»).
   Tras 5 intentos fallidos, el acceso se bloquea 30 segundos.
   ========================================================================== */
const KEY = 'zugar-admin-sesion';
const LOCK_KEY = 'zugar-admin-intentos';
const HOURS = 8;
const MAX_TRIES = 5;
const LOCK_SECONDS = 30;

export interface Session {
  email: string;
  name: string;
  role: string;
  exp: number;
  roles: string[];
  /** Entró con una contraseña temporal: antes de usar el panel crea la suya */
  mustChange?: boolean;
}

export type LoginResult = { ok: true; user: Session } | { ok: false; error: 'locked'; lockedFor: number } | { ok: false; error: 'invalid'; left: number } | { ok: false; error: 'noaccess' };

/** Cuentas de demostración: la administradora (todo) y una broker (permisos limitados) */
const USERS = [
  { email: 'lucia@zugar.example', password: 'Zugar2026!', name: 'Lucía Méndez', roles: ['owner', 'admin'] },
  { email: 'mariana@zugar.example', password: 'Zugar2026!', name: 'Mariana Solís', roles: ['broker'] },
];

const read = (s: Storage): Session | null => {
  try {
    return JSON.parse(s.getItem(KEY) || 'null');
  } catch {
    return null;
  }
};

export function currentSession(): Session | null {
  let s: Session | null = null;
  try {
    s = read(sessionStorage) || read(localStorage);
  } catch {
    return null;
  }
  if (!s || !s.exp || Date.now() > s.exp || !Array.isArray(s.roles)) {
    clearSession();
    return null;
  }
  return s;
}

export function clearSession() {
  try {
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
  } catch {
    /* almacenamiento bloqueado */
  }
}

/** Ya creó su contraseña: entra al panel */
export function passwordChanged() {
  for (const s of [sessionStorage, localStorage]) {
    const cur = read(s);
    if (!cur) continue;
    try {
      s.setItem(KEY, JSON.stringify({ ...cur, mustChange: false }));
    } catch {
      /* sin almacenamiento */
    }
  }
}

/* ---------- Roles y permisos ----------
   Cada persona del personal es broker, administración o ambos; el propietario decide quién es qué.
   El panel solo muestra las acciones que su rol permite. */
const BROKER = ['leads.manage', 'payments.register', 'documents.manage'];
const ADMIN = [...BROKER, 'contracts.manage', 'payments.correct', 'documents.delete'];
const OWNER = [...ADMIN, 'users.manage'];

export function roleLabel(roles: string[] = []) {
  if (roles.includes('owner')) return 'Propietario';
  if (roles.includes('admin') && roles.includes('broker')) return 'Broker y administración';
  return roles.includes('admin') ? 'Administración' : 'Broker';
}

/** ¿El rol de la sesión permite esta acción? */
export function can(permission: string) {
  const roles = currentSession()?.roles ?? [];
  const list = roles.includes('owner') ? OWNER : roles.includes('admin') ? ADMIN : BROKER;
  return list.includes(permission);
}

export function lockState() {
  let l: { tries?: number; until?: number } | null = null;
  try {
    l = JSON.parse(sessionStorage.getItem(LOCK_KEY) || 'null');
  } catch {
    /* nada */
  }
  const left = Math.ceil(((l?.until ?? 0) - Date.now()) / 1000);
  return { tries: l?.tries ?? 0, lockedFor: left > 0 ? left : 0 };
}

function start(session: Omit<Session, 'exp'>, remember: boolean): LoginResult {
  const s: Session = { ...session, exp: Date.now() + HOURS * 3600 * 1000 };
  try {
    sessionStorage.removeItem(LOCK_KEY);
    clearSession();
    (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(s));
  } catch {
    /* sin almacenamiento: la sesión dura lo que dure la página */
  }
  return { ok: true, user: s };
}

function failed(): LoginResult {
  const tries = lockState().tries + 1;
  const until = tries >= MAX_TRIES ? Date.now() + LOCK_SECONDS * 1000 : 0;
  try {
    sessionStorage.setItem(LOCK_KEY, JSON.stringify({ tries: until ? 0 : tries, until }));
  } catch {
    /* sin almacenamiento */
  }
  return until ? { ok: false, error: 'locked', lockedFor: LOCK_SECONDS } : { ok: false, error: 'invalid', left: MAX_TRIES - tries };
}

/** Revisa correo y contraseña contra las cuentas de demostración (con una espera simulada) */
export async function login(email: string, password: string, remember: boolean): Promise<LoginResult> {
  const lock = lockState();
  if (lock.lockedFor) return { ok: false, error: 'locked', lockedFor: lock.lockedFor };
  await new Promise((ok) => setTimeout(ok, 400));
  const u = USERS.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password);
  return u ? start({ email: u.email, name: u.name, roles: u.roles, role: roleLabel(u.roles) }, remember) : failed();
}

/** true justo después de cerrar sesión: el panel manda al acceso con «Cerraste sesión correctamente» */
export const loggedOut = { value: false };

export function logout() {
  loggedOut.value = true;
  clearSession();
  location.replace('#/login?salida=1');
}
