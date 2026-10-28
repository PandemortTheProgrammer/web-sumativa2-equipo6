import { AVISOS, CONTRATOS, DOCUMENTOS, MENSAJES, PAGOS_REGISTRADOS, SOLICITUDES } from '../data/demo';
import { leerSolicitudesDelSitio } from '../lib/datos';
import { currentSession } from './auth';
import { addMinutes, broker as brokerOf, D, dateShort, log, money, norm, nowTime, person, prop, rerender, Z, type Appointment, type Person } from './store';

/* ==========================================================================
   Servicio de datos SIMULADO del panel (sin servidor, sin API).
   Solicitudes, pagos, expediente y avisos viven en memoria y salen de src/data/demo.ts.
   Cada función devuelve una Promesa con una pequeña espera (setTimeout) para que la
   interfaz muestre su estado de carga, igual que lo hará cuando exista el backend.
   Al recargar la página todo vuelve a los datos de ejemplo.
   ========================================================================== */

/** Error que devuelven las funciones del servicio (se muestra en pantalla) */
export interface ServiceError { mensaje?: string; status?: number }

/** Avisos flotantes del panel (los registra Overlay) */
export const notify = { toast: (_msg: string) => {} };

/** Espera simulada: la respuesta llega en ~300 ms, como si viniera de un servidor */
const DEMORA_MS = 300;
const responder = <T>(valor: T, ms = DEMORA_MS) => new Promise<T>((ok) => setTimeout(() => ok(structuredClone(valor)), ms));
const fallar = (mensaje: string, ms = DEMORA_MS) => new Promise<never>((_, no) => setTimeout(() => no({ mensaje } satisfies ServiceError), ms));

/** Fecha y hora de Cancún en formato ISO (lo que guarda el prototipo) */
export const toIso = (date: string, time: string) => `${date}T${time}:00-05:00`;
const ahoraIso = () => toIso(Z.TODAY, nowTime());
const fechaDe = (iso: string) => iso.slice(0, 10);
const horaDe = (iso: string) => iso.slice(11, 16);
const quien = () => currentSession()?.name ?? 'Lucía Méndez';
let consecutivo = 1000;
const nuevoId = (prefijo: string) => `${prefijo}-${++consecutivo}`;

/* ---------- Acceso: recuperar y cambiar contraseña (simulado) ---------- */
export const forgotPassword = (_email: string) => responder(null);
export const changePassword = (_actual: string, _nueva: string) => responder({ message: 'Contraseña actualizada.' });
export const resetPassword = (_token: string, _nueva: string) => responder({ message: 'Listo: ya puedes entrar con tu nueva contraseña.' });

/* ==========================================================================
   Solicitudes
   ========================================================================== */
export interface Proposal {
  id: string; note: string | null; createdAt: string;
  property: { id: string; code: string; slug: string; name: string; zone: string; city: string | null; operation: 'renta' | 'venta'; price: number; rec: number; banos: number; photo: string | null };
}
export interface Lead {
  id: string; folio: string; reason: 'visita' | 'rentar' | 'comprar' | 'publicar' | 'otro'; name: string; email: string; phone: string | null;
  message: string | null; property: { id: string; code: string; name: string } | null; preferredDate: string | null; preferredTime: string | null;
  payload: Record<string, string | number | boolean>; status: 'nuevo' | 'en_seguimiento' | 'cerrado'; statusLabel: string;
  response: string | null; respondedAt: string | null; respondedBy: string | null; proposalCount: number; proposals?: Proposal[]; createdAt: string;
  clientId: string | null; appointmentCount: number; appointments?: LeadAppointment[];
  /** Otras solicitudes de la misma persona (mismo correo) */
  others?: { id: string; folio: string; reason: Lead['reason']; status: Lead['status']; statusLabel: string; property: string | null; payload: Lead['payload']; message: string | null; createdAt: string }[];
}
/** Cita agendada desde la solicitud */
export interface LeadAppointment { id: string; code: string; scheduledAt: string; status: string; property: { code: string; name: string }; broker: string | null }
export interface NewLead { reason: Lead['reason']; name: string; email: string; phone?: string | null; message?: string | null; propertyCode?: string | null; payload?: Record<string, string | number | boolean> }
export interface LeadMessage { id: string; body: string; fromStaff: boolean; mine: boolean; sender: string; createdAt: string }

/** Forma en la que se escriben las solicitudes en src/data/demo.ts */
export interface SolicitudSemilla {
  id: string; folio: string; reason: Lead['reason']; name: string; email: string; phone: string | null; message: string | null;
  /** Clave de la casa (ZUG-###) */
  property: string | null; preferredDate: string | null; preferredTime: string | null;
  payload: Lead['payload']; status: Lead['status']; createdAt: string;
  /** Casas propuestas: [clave, nota] */
  proposals?: [string, string][];
  /** Cita agendada desde esta solicitud */
  cita?: string;
}

const STATUS_LABEL: Record<Lead['status'], string> = { nuevo: 'Nueva', en_seguimiento: 'En seguimiento', cerrado: 'Cerrada' };

interface SolicitudGuardada {
  id: string; folio: string; reason: Lead['reason']; name: string; email: string; phone: string | null; message: string | null;
  property: string | null; preferredDate: string | null; preferredTime: string | null; payload: Lead['payload']; status: Lead['status']; createdAt: string;
  proposals: { id: string; code: string; note: string | null; createdAt: string }[];
  messages: LeadMessage[];
}

const solicitudes: SolicitudGuardada[] = SOLICITUDES.map((s) => ({
  ...s,
  proposals: (s.proposals ?? []).map(([code, note]) => ({ id: nuevoId('prop'), code, note, createdAt: s.createdAt })),
  messages: MENSAJES.filter(([id]) => id === s.id).map(([, who, body, createdAt]) => ({
    id: nuevoId('msg'), body, fromStaff: who === 'staff', mine: false, sender: who === 'staff' ? brokerDeLaCasa(s.property) : s.name, createdAt,
  })),
}));
function brokerDeLaCasa(code: string | null) {
  const p = code ? prop(code) : undefined;
  return p ? brokerOf(p.broker).name : 'Equipo Zugar';
}
let siguienteFolio = 104;

/** Datos del formulario que se muestran en la cita (Citas › «Formulario que llenó») */
function formularioDe(s: SolicitudGuardada, linked: boolean): NonNullable<Appointment['lead']> {
  const p = s.property ? prop(s.property) : undefined;
  return {
    id: s.id, folio: s.folio, reason: s.reason, name: s.name, email: s.email, phone: s.phone, payload: s.payload, message: s.message,
    property: p ? { code: p.id, name: p.name } : null, preferredDate: s.preferredDate, preferredTime: s.preferredTime, createdAt: s.createdAt, linked,
  };
}
// Las citas de ejemplo que salieron de una solicitud llevan su formulario
SOLICITUDES.forEach((s) => {
  const a = s.cita ? D.appointments.find((x) => x.id === s.cita) : undefined;
  const g = solicitudes.find((x) => x.id === s.id);
  if (a && g) a.lead = formularioDe(g, true);
});

/** Las solicitudes enviadas desde el sitio público (se guardan en el navegador con localStorage) */
function importarDelSitio() {
  for (const r of leerSolicitudesDelSitio()) {
    if (solicitudes.some((s) => s.folio === r.folio)) continue;
    const casa = r.propertyCode ? prop(r.propertyCode) : D.properties.find((p) => slugDe(p.name) === r.propertySlug);
    solicitudes.push({
      id: 'web-' + r.folio.toLowerCase(), folio: r.folio, reason: r.reason, name: r.name, email: r.email, phone: r.phone || null, message: r.message || null,
      property: casa?.id ?? null, preferredDate: r.preferredDate || null, preferredTime: r.preferredTime || null,
      payload: { ...r.payload, origen: 'sitio' } as Lead['payload'], status: 'nuevo', createdAt: r.createdAt, proposals: [], messages: [],
    });
  }
}
export const slugDe = (s: string) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const citasDe = (s: SolicitudGuardada) => D.appointments.filter((a) => a.lead?.id === s.id && a.lead.linked);

function aLead(s: SolicitudGuardada, completa: boolean): Lead {
  const p = s.property ? prop(s.property) : undefined;
  const citas = citasDe(s);
  const staff = s.messages.filter((m) => m.fromStaff);
  const lead: Lead = {
    id: s.id, folio: s.folio, reason: s.reason, name: s.name, email: s.email, phone: s.phone, message: s.message,
    property: p ? { id: p.id, code: p.id, name: p.name } : null, preferredDate: s.preferredDate, preferredTime: s.preferredTime,
    payload: s.payload, status: s.status, statusLabel: STATUS_LABEL[s.status],
    response: null, respondedAt: staff[0]?.createdAt ?? null, respondedBy: staff[0]?.sender ?? null,
    proposalCount: s.proposals.length, appointmentCount: citas.length, createdAt: s.createdAt,
    clientId: D.people.find((x) => norm(x.email) === norm(s.email))?.id ?? null,
  };
  if (!completa) return lead;
  lead.proposals = s.proposals.flatMap((x) => {
    const c = prop(x.code);
    return c ? [{ id: x.id, note: x.note, createdAt: x.createdAt, property: { id: c.id, code: c.id, slug: slugDe(c.name), name: c.name, zone: c.zone, city: c.city, operation: c.op, price: c.price, rec: c.rec, banos: c.banos, photo: c.photos[0]?.src ?? null } }] : [];
  });
  lead.appointments = citas.map((a) => ({ id: a.id, code: a.id, scheduledAt: toIso(a.date, a.start), status: a.status, property: { code: a.property, name: prop(a.property)?.name ?? '' }, broker: brokerOf(a.broker).name }));
  lead.others = solicitudes.filter((o) => o.id !== s.id && norm(o.email) === norm(s.email)).map((o) => ({
    id: o.id, folio: o.folio, reason: o.reason, status: o.status, statusLabel: STATUS_LABEL[o.status], property: o.property ? prop(o.property)?.name ?? null : null, payload: o.payload, message: o.message, createdAt: o.createdAt,
  }));
  return lead;
}

const buscar = (id: string) => solicitudes.find((s) => s.id === id);
const enSeguimiento = (s: SolicitudGuardada) => { if (s.status === 'nuevo') s.status = 'en_seguimiento'; };
const params = (query: string) => new URLSearchParams(query);

export const Requests = {
  list(query: string) {
    importarDelSitio();
    const q = params(query);
    const status = q.get('status');
    const todas = solicitudes.filter((s) => !status || s.status === status).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return responder({ data: todas.slice(0, Number(q.get('limit') || 100)).map((s) => aLead(s, false)), pagination: { total: todas.length } });
  },
  get(id: string) {
    importarDelSitio();
    const s = buscar(id);
    return s ? responder(aLead(s, true)) : fallar('Esa solicitud ya no existe.');
  },
  create(body: NewLead) {
    if (solicitudes.some((s) => s.status !== 'cerrado' && norm(s.email) === norm(body.email) && s.reason === body.reason && (s.property ?? null) === (body.propertyCode ?? null))) {
      return fallar('Esta persona ya tiene una solicitud abierta con el mismo motivo.');
    }
    const s: SolicitudGuardada = {
      id: nuevoId('sol'), folio: 'SOL-' + String(siguienteFolio++).padStart(4, '0'), reason: body.reason, name: body.name, email: body.email, phone: body.phone ?? null,
      message: body.message ?? null, property: body.propertyCode ?? null, preferredDate: null, preferredTime: null,
      payload: { ...(body.payload ?? {}), origen: 'panel' }, status: 'nuevo', createdAt: ahoraIso(), proposals: [], messages: [],
    };
    solicitudes.push(s);
    log(`${quien()} registró la solicitud ${s.folio} de ${s.name}.`);
    return responder(aLead(s, true));
  },
  update(id: string, body: { status?: Lead['status']; name?: string; phone?: string | null; message?: string | null; reason?: Lead['reason'] }) {
    const s = buscar(id);
    if (!s) return fallar('Esa solicitud ya no existe.');
    Object.assign(s, Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)));
    return responder(aLead(s, true));
  },
  remove(id: string) {
    const i = solicitudes.findIndex((s) => s.id === id);
    if (i < 0) return fallar('Esa solicitud ya no existe.');
    solicitudes.splice(i, 1);
    return responder(null);
  },
  /** Agenda la visita: crea la cita «por confirmar» ligada a la solicitud (y el expediente de la persona si faltaba) */
  schedule(id: string, body: { propertyId: string; scheduledAt: string; note?: string | null }) {
    const s = buscar(id);
    const casa = prop(body.propertyId);
    if (!s || !casa) return fallar('No se encontró la solicitud o la casa.');
    const date = fechaDe(body.scheduledAt), start = horaDe(body.scheduledAt);
    const vigente = citasDe(s).find((a) => a.property === casa.id && (a.status === 'por-confirmar' || a.status === 'confirmada'));
    const choque = D.appointments.some((a) => a !== vigente && a.broker === casa.broker && a.date === date && a.start === start && a.status !== 'cancelada');
    if (choque) return fallar(`${brokerOf(casa.broker).name} ya tiene una cita ese día a las ${start} h. Elige otro horario.`);
    // Expediente: si la persona aún no está en «Clientes e inquilinos», se agrega
    let per = D.people.find((x) => norm(x.email) === norm(s.email));
    if (!per) {
      per = { id: 'p' + D.nextNumbers.person++, name: s.name, email: s.email, phone: s.phone ?? '', type: 'cliente', property: casa.id, broker: casa.broker, follow: 'Por confirmar', op: casa.op === 'renta' ? 'Renta' : 'Compra', budget: '', needs: s.message ?? '', job: String(s.payload.ocupacion ?? '') } satisfies Person;
      D.people.push(per);
    }
    let cita: Appointment;
    if (vigente) {
      Object.assign(vigente, { date, start, end: addMinutes(start, 45), status: 'por-confirmar', confirmedBy: '' });
      cita = vigente;
    } else {
      cita = { id: 'CIT-' + String(D.nextNumbers.appointment++).padStart(3, '0'), person: per.id, property: casa.id, broker: casa.broker, date, start, end: addMinutes(start, 45), status: 'por-confirmar', kind: 'Presencial', note: body.note ?? '', lead: formularioDe(s, true) };
      D.appointments.push(cita);
    }
    enSeguimiento(s);
    log(`${quien()} ${vigente ? 'cambió' : 'agendó'} la visita de ${s.name} a ${casa.name} (${dateShort(date)}, ${start} h) desde la solicitud ${s.folio}.`, casa.id);
    rerender();
    return responder({ appointment: { id: cita.id, code: cita.id }, rescheduled: !!vigente, lead: aLead(s, true) });
  },
  propose(id: string, propertyId: string, note?: string) {
    const s = buscar(id);
    if (!s) return fallar('Esa solicitud ya no existe.');
    s.proposals.push({ id: nuevoId('prop'), code: propertyId, note: note || null, createdAt: ahoraIso() });
    enSeguimiento(s);
    return responder(aLead(s, true));
  },
  unpropose(id: string, proposalId: string) {
    const s = buscar(id);
    if (!s) return fallar('Esa solicitud ya no existe.');
    s.proposals = s.proposals.filter((x) => x.id !== proposalId);
    return responder(aLead(s, true));
  },
  messages: (id: string) => responder(buscar(id)?.messages ?? []),
  send(id: string, body: string) {
    const s = buscar(id);
    if (!s) return fallar('Esa solicitud ya no existe.');
    s.messages.push({ id: nuevoId('msg'), body, fromStaff: true, mine: true, sender: quien(), createdAt: new Date().toISOString() });
    enSeguimiento(s);
    return responder(s.messages);
  },
};

/* ==========================================================================
   Contratos, pagarés y expediente
   ========================================================================== */
export interface Note {
  id: string; number: number; label: string; amount: number; dueDate: string; status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paidAt: string | null; proofDocumentId: string | null; property: { id: string; name: string }; client?: { id: string; name: string };
  /** PDF del pagaré firmado */
  documentId: string | null;
  payment: { id: string; amount: number; paidAt: string; receiptFolio: string; notes: string | null; registeredBy?: string } | null;
}
export interface NotesSummary { total: number; paid: number; remaining: number; remainingAmount: number; next: { number: number; dueDate: string; amount: number } | null }
export interface DossierDoc { id: string; type: string; name: string; description: string | null; mime: string; size: number; visibleToClient: boolean; createdAt: string }
export interface Contract { id: string; startDate: string; endDate: string; monthlyRent: number; paymentDay: number; deposit: number | null; status: string }
export interface Dossier {
  property: { id: string; code: string; name: string };
  contract: Contract | null;
  tenant: { id: string; name: string; phone: string | null; email: string | null } | null;
  documents: DossierDoc[];
}
export interface ContratoSemilla { id: string; property: string; client: string; startDate: string; endDate: string; monthlyRent: number; paymentDay: number; deposit: number | null; status: string }

interface ContratoGuardado extends Contract { property: string; client: string }
interface PagareGuardado { id: string; contract: string; number: number; amount: number; dueDate: string; cancelled: boolean; documentId: string | null; payment: Note['payment']; anulados: NonNullable<Note['payment']>[] }
interface DocGuardado extends DossierDoc { property: string; url: string | null }

const contratos: ContratoGuardado[] = CONTRATOS.map((c) => ({ ...c }));
const documentos: DocGuardado[] = DOCUMENTOS.map(([property, type, name, description, visibleToClient, createdAt]) => ({
  id: nuevoId('doc'), property, type, name, description, visibleToClient, createdAt, mime: 'application/pdf', size: 240_000, url: null,
}));
const pagares: PagareGuardado[] = [];
let siguienteRecibo = 1;
const folioRecibo = () => 'REC-2026-' + String(siguienteRecibo++).padStart(4, '0');

/** Pagarés mensuales de un contrato: uno por mes, del inicio al fin, en el día de pago */
function generarPagares(c: ContratoGuardado) {
  const [y0, m0] = c.startDate.split('-').map(Number);
  const fin = c.endDate;
  for (let i = 0, n = 1; i < 60; i++) {
    const y = y0 + Math.floor((m0 - 1 + i) / 12), m = ((m0 - 1 + i) % 12) + 1;
    const due = `${y}-${String(m).padStart(2, '0')}-${String(c.paymentDay).padStart(2, '0')}`;
    if (due > fin) break;
    pagares.push({ id: nuevoId('pag'), contract: c.id, number: n++, amount: c.monthlyRent, dueDate: due, cancelled: false, documentId: null, payment: null, anulados: [] });
  }
}
contratos.forEach(generarPagares);
// Pagos de ejemplo del contrato de Casa Olivo
Object.entries(PAGOS_REGISTRADOS).forEach(([num, fecha]) => {
  const n = pagares.find((x) => x.contract === 'con-001' && x.number === Number(num));
  if (n) n.payment = { id: nuevoId('pay'), amount: n.amount, paidAt: fecha + 'T11:00:00-05:00', receiptFolio: folioRecibo(), notes: null, registeredBy: 'Valeria Cruz' };
});

const estadoDe = (n: PagareGuardado): Note['status'] => (n.cancelled ? 'cancelled' : n.payment ? 'paid' : n.dueDate < Z.TODAY ? 'overdue' : 'pending');
function aNota(n: PagareGuardado): Note {
  const c = contratos.find((x) => x.id === n.contract)!;
  const casa = prop(c.property), cli = person(c.client);
  return {
    id: n.id, number: n.number, label: 'Pagaré ' + String(n.number).padStart(2, '0'), amount: n.amount, dueDate: n.dueDate, status: estadoDe(n),
    paidAt: n.payment?.paidAt ?? null, proofDocumentId: null, property: { id: c.property, name: casa?.name ?? c.property }, client: { id: c.client, name: cli.name },
    documentId: n.documentId, payment: n.payment,
  };
}
function resumen(contrato: string): NotesSummary {
  const lista = pagares.filter((n) => n.contract === contrato && !n.cancelled);
  const pendientes = lista.filter((n) => !n.payment).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return {
    total: lista.length, paid: lista.length - pendientes.length, remaining: pendientes.length,
    remainingAmount: pendientes.reduce((t, n) => t + n.amount, 0),
    next: pendientes[0] ? { number: pendientes[0].number, dueDate: pendientes[0].dueDate, amount: pendientes[0].amount } : null,
  };
}
const pagare = (n: Note) => pagares.find((x) => x.id === n.id)!;
const contratoActivo = (code: string) => contratos.find((c) => c.property === code && c.status === 'active');

/** Abre un documento: el archivo que se subió (blob) o una página de ejemplo para los documentos ficticios */
function abrir(nombre: string, url: string | null) {
  if (!url) {
    const html = `<!doctype html><meta charset="utf-8"><title>${nombre}</title><body style="font:16px system-ui;padding:3rem;max-width:40rem;margin:auto;color:#1B2A44"><h1 style="color:#0B2A5B">${nombre}</h1><p>Documento de ejemplo del prototipo. En la versión con servidor aquí se abre el PDF real.</p></body>`;
    url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  }
  window.open(url, '_blank', 'noopener');
}
/** Cuántas hojas tiene un PDF (cuenta los objetos /Type /Page) */
async function hojasDelPdf(file: File) {
  const texto = await file.text();
  return (texto.match(/\/Type\s*\/Page(?!s)/g) || []).length || 1;
}
function guardarArchivo(property: string, file: File, data: { type: string; name: string; description?: string | null; visibleToClient: boolean }) {
  const doc: DocGuardado = { id: nuevoId('doc'), property, type: data.type, name: data.name, description: data.description ?? null, visibleToClient: data.visibleToClient, mime: file.type, size: file.size, createdAt: new Date().toISOString(), url: URL.createObjectURL(file) };
  documentos.push(doc);
  return doc;
}

/** Contrato de renta: la persona pasa a inquilina, se generan sus pagarés y la casa queda rentada. */
export function createContract(body: { propertyId: string; clientId: string; startDate: string; endDate: string; monthlyRent: number; paymentDay: number; deposit: number | null }) {
  const casa = prop(body.propertyId);
  if (!casa) return fallar('No se encontró la casa.');
  if (contratoActivo(casa.id)) return fallar(`${casa.name} ya tiene un contrato vigente.`);
  const c: ContratoGuardado = { id: nuevoId('con'), property: casa.id, client: body.clientId, startDate: body.startDate, endDate: body.endDate, monthlyRent: body.monthlyRent, paymentDay: body.paymentDay, deposit: body.deposit, status: 'active' };
  contratos.push(c);
  generarPagares(c);
  casa.status = 'rentada';
  const per = D.people.find((x) => x.id === body.clientId);
  if (per) Object.assign(per, { type: 'inquilino', follow: 'Contrato vigente', property: casa.id });
  log(`${quien()} rentó ${casa.name} a ${per?.name ?? 'la persona'}: contrato de ${money(body.monthlyRent)} al mes.`, casa.id);
  rerender();
  return responder({ id: c.id });
}

export const Finance = {
  dossier(propertyId: string) {
    const casa = prop(propertyId);
    if (!casa) return fallar('No se encontró la casa.');
    const c = contratoActivo(casa.id) ?? null;
    const t = c ? person(c.client) : null;
    return responder<Dossier>({
      property: { id: casa.id, code: casa.id, name: casa.name },
      contract: c && { id: c.id, startDate: c.startDate, endDate: c.endDate, monthlyRent: c.monthlyRent, paymentDay: c.paymentDay, deposit: c.deposit, status: c.status },
      tenant: c && t ? { id: c.client, name: t.name, phone: t.phone || null, email: t.email || null } : null,
      documents: documentos.filter((d) => d.property === casa.id).map(({ property: _p, url: _u, ...d }) => d),
    });
  },
  notes(query: string) {
    const q = params(query);
    const status = q.get('status'), contrato = q.get('contractId');
    const lista = pagares.filter((n) => (!contrato || n.contract === contrato) && (!status || estadoDe(n) === status)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return responder({ data: lista.slice(0, Number(q.get('limit') || 100)).map(aNota), pagination: { total: lista.length }, summary: contrato ? resumen(contrato) : null });
  },
  registerPayment(n: Note, body: { paidAt: string; notes?: string }) {
    const p = pagare(n);
    if (p.payment) return fallar('Ese pagaré ya está pagado.');
    p.payment = { id: nuevoId('pay'), amount: p.amount, paidAt: body.paidAt, receiptFolio: folioRecibo(), notes: body.notes ?? null, registeredBy: quien() };
    log(`${quien()} registró el pago del ${n.label} de ${n.property.name} (${money(p.amount)}).`, n.property.id);
    return responder(aNota(p));
  },
  updateNote(n: Note, body: { amount?: number; dueDate?: string }) {
    const p = pagare(n);
    if (p.payment) return fallar('Un pagaré pagado no se edita: corrige el pago.');
    Object.assign(p, body);
    return responder(aNota(p));
  },
  createNote(contractId: string, amount: number, dueDate: string) {
    const numero = Math.max(0, ...pagares.filter((x) => x.contract === contractId).map((x) => x.number)) + 1;
    const p: PagareGuardado = { id: nuevoId('pag'), contract: contractId, number: numero, amount, dueDate, cancelled: false, documentId: null, payment: null, anulados: [] };
    pagares.push(p);
    return responder(aNota(p));
  },
  cancelNote(n: Note, _reason: string) {
    const p = pagare(n);
    if (p.payment) return fallar('Un pagaré pagado no se cancela: primero anula el pago.');
    p.cancelled = true;
    return responder(aNota(p));
  },
  correctPayment(n: Note, body: { amount?: number; paidAt?: string; receiptFolio?: string; notes?: string }) {
    const p = pagare(n);
    if (!p.payment) return fallar('Ese pagaré no tiene pago.');
    Object.assign(p.payment, body);
    return responder(aNota(p));
  },
  voidPayment(n: Note, _reason: string) {
    const p = pagare(n);
    if (p.payment) p.anulados.push(p.payment);
    p.payment = null;
    return responder(aNota(p));
  },
  async openDocument(id: string) {
    const d = documentos.find((x) => x.id === id);
    if (!d) throw { mensaje: 'Ese documento ya no existe.' } satisfies ServiceError;
    abrir(d.name, d.url);
  },
  async uploadDocument(propertyId: string, file: File, data: { type: string; name: string; description?: string; visibleToClient: boolean; promissoryNoteId?: string }) {
    const doc = guardarArchivo(propertyId, file, data);
    if (data.promissoryNoteId) {
      const p = pagares.find((x) => x.id === data.promissoryNoteId);
      if (p) p.documentId = doc.id;
    }
    return responder<DossierDoc>(doc);
  },
  /** Contrato firmado (PDF) del contrato */
  async attachContractPdf(contractId: string, propertyId: string, file: File) {
    const doc = guardarArchivo(propertyId, file, { type: 'contract', name: 'Contrato de arrendamiento firmado', visibleToClient: true });
    return responder({ documentId: doc.id, contractId });
  },
  /** Un PDF con todos los pagarés: hoja N → pagaré N (cada pagaré queda ligado al PDF) */
  async splitNotesPdf(contractId: string, propertyId: string, file: File) {
    const pages = await hojasDelPdf(file);
    const lista = pagares.filter((x) => x.contract === contractId && !x.cancelled).sort((a, b) => a.number - b.number);
    const doc = guardarArchivo(propertyId, file, { type: 'promissory_note', name: 'Pagarés firmados', visibleToClient: true });
    const assigned = Math.min(pages, lista.length);
    lista.slice(0, assigned).forEach((p) => (p.documentId = doc.id));
    return responder({ pages, notes: lista.length, assigned });
  },
  updateDocument(id: string, body: { name?: string; description?: string | null; visibleToClient?: boolean }) {
    const d = documentos.find((x) => x.id === id);
    if (!d) return fallar('Ese documento ya no existe.');
    Object.assign(d, body);
    const { property: _p, url: _u, ...doc } = d;
    return responder<DossierDoc>(doc);
  },
  deleteDocument(id: string) {
    const i = documentos.findIndex((x) => x.id === id);
    if (i >= 0) documentos.splice(i, 1);
    return responder(null);
  },
};

/* ==========================================================================
   Avisos de la campana
   ========================================================================== */
export interface Notice { id: string; type: string; title: string; message: string; entity: string | null; entityId: string | null; read: boolean; sentAt: string }
const avisos: Notice[] = AVISOS.map(([type, title, message, entity, entityId, minutos, read]) => ({
  id: nuevoId('av'), type, title, message, entity, entityId, read, sentAt: new Date(Date.now() - minutos * 60_000).toISOString(),
}));
export const Notices = {
  list: () => responder({ data: avisos, unreadCount: avisos.filter((a) => !a.read).length }, 150),
  read(id: string) { const a = avisos.find((x) => x.id === id); if (a) a.read = true; return responder(null, 0); },
  readAll() { avisos.forEach((a) => (a.read = true)); return responder(null, 0); },
};

/* ==========================================================================
   Ubicación desde un enlace de Google Maps (con JavaScript, sin servidor)
   Lee las coordenadas que vienen dentro del enlace largo: …/@21.1290,-86.8467,17z
   o …!3d21.1290!4d-86.8467, ?q=21.1290,-86.8467 o ?ll=…
   ========================================================================== */
export function coordenadasDeMaps(url: string): { lat: number; lng: number } | null {
  const patrones = [/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/, /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/, /[?&](?:q|ll|query|center)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/, /^\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\s*$/];
  for (const re of patrones) {
    const m = decodeURIComponent(url).match(re);
    if (m) {
      const lat = Number(m[1]), lng = Number(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
}
